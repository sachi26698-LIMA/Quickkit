import { describe, expect, it, vi } from "vitest";

/**
 * Per-route CSP rules may only *add* origins to `connect-src`.
 *
 * A route-specific rule is a string rewrite of a security header, which is
 * exactly the kind of code where a small edit silently removes an allowance and
 * only shows up as a blocked request in a user's browser. These tests pin the
 * invariant: whatever the base policy allows, every route policy still allows,
 * plus that route's own host and nothing else.
 */

type HeaderEntry = { key: string; value: string };
type Rule = { source: string; headers: HeaderEntry[] };

async function productionRules(): Promise<Rule[]> {
  vi.stubEnv("NODE_ENV", "production");
  // A configured Supabase project is the normal production state; the policy
  // must be correct in that state, not just in a bare checkout.
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://csp-test.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
  vi.resetModules();
  try {
    const { default: config } = await import("../next.config");
    return ((await config.headers?.()) ?? []) as Rule[];
  } finally {
    vi.unstubAllEnvs();
  }
}

const cspOf = (rules: Rule[], source: string) =>
  rules
    .filter((rule) => rule.source === source)
    .flatMap((rule) => rule.headers)
    .find((header) => header.key === "Content-Security-Policy")?.value ?? "";

const sourcesOf = (policy: string, directive: string) =>
  (new RegExp(`${directive}([^;]*)`).exec(policy)?.[1] ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

/** Every route that carries its own CSP rule, with the host it may add. */
const ROUTE_HOSTS: [source: string, hosts: string[]][] = [
  ["/tools/dns-email-security", ["https://cloudflare-dns.com"]],
  ["/tools/dns-lookup", ["https://cloudflare-dns.com"]],
  ["/tools/dnssec-status-checker", ["https://cloudflare-dns.com"]],
  [
    "/tools/url-network-privacy",
    ["https://api.ipify.org", "https://api64.ipify.org"],
  ],
  [
    "/tools/public-ip-information",
    ["https://api.ipify.org", "https://api64.ipify.org"],
  ],
];

describe("per-route connect-src policy", () => {
  it("keeps every base origin on every route that overrides connect-src", async () => {
    const rules = await productionRules();
    const base = sourcesOf(cspOf(rules, "/:path*"), "connect-src");
    expect(base).toContain("'self'");

    for (const [source] of ROUTE_HOSTS) {
      const route = cspOf(rules, source);
      expect(route, `${source} has a CSP rule`).not.toBe("");
      const routeSources = sourcesOf(route, "connect-src");
      // The regression: a route override must never shrink the base policy.
      for (const origin of base) {
        expect(routeSources, `${source} keeps ${origin}`).toContain(origin);
      }
    }
  });

  it("adds exactly the documented host for each route, and nothing wider", async () => {
    const rules = await productionRules();
    const base = sourcesOf(cspOf(rules, "/:path*"), "connect-src");

    for (const [source, hosts] of ROUTE_HOSTS) {
      const routeSources = sourcesOf(cspOf(rules, source), "connect-src");
      const added = routeSources.filter((origin) => !base.includes(origin));
      expect(added, `${source} added sources`).toEqual(hosts);
      // No wildcard and no scheme-wide source may ever appear.
      for (const origin of routeSources) {
        expect(origin).not.toBe("*");
        expect(origin).not.toMatch(/^https?:$/);
      }
    }
  });

  it("leaves every other directive untouched on a route override", async () => {
    const rules = await productionRules();
    const base = cspOf(rules, "/:path*");
    const baseDirectives = base
      .split(";")
      .map((part) => part.trim())
      .filter((part) => part && !part.startsWith("connect-src"));

    for (const [source] of ROUTE_HOSTS) {
      const routeDirectives = cspOf(rules, source)
        .split(";")
        .map((part) => part.trim())
        .filter((part) => part && !part.startsWith("connect-src"));
      expect(routeDirectives, source).toEqual(baseDirectives);
    }
  });

  it("still refuses framing, objects and base rewriting on the DNS routes", async () => {
    const rules = await productionRules();
    for (const [source] of ROUTE_HOSTS) {
      const route = cspOf(rules, source);
      expect(route).toContain("frame-ancestors 'none'");
      expect(route).toContain("object-src 'none'");
      expect(route).toContain("base-uri 'self'");
      expect(route).toContain("form-action 'self'");
      // `'wasm-unsafe-eval'` is a distinct keyword and is expected; only raw
      // `'unsafe-eval'` must never appear.
      expect(route).not.toMatch(/script-src[^;]*'unsafe-eval'/);
    }
  });

  it("emits at most one CSP header per route, so policies never intersect", async () => {
    const rules = await productionRules();
    const routes = ["/:path*", ...ROUTE_HOSTS.map(([source]) => source)];
    for (const source of routes) {
      const matching = rules
        .filter((rule) => rule.source === source)
        .flatMap((rule) => rule.headers)
        .filter((header) =>
          /^Content-Security-Policy(-Report-Only)?$/.test(header.key),
        );
      expect(matching.length, `${source} CSP headers`).toBeLessThanOrEqual(1);
    }
  });
});
