import { describe, expect, it, vi } from "vitest";

/**
 * The header policy is a security boundary in production and a debugging
 * obstacle in development, so `next.config.ts` switches only the *enforcement*
 * mode — never the content of the policy. These tests pin that down, and in
 * particular forbid the lazy fix (adding 'unsafe-eval' so React's development
 * build stops throwing): hydration must be unblocked by serving the policy in
 * report-only mode during `next dev`, while `next start` keeps enforcing it.
 */
type HeaderEntry = { key: string; value: string };

async function headersFor(nodeEnv: string): Promise<HeaderEntry[]> {
  // `process.env.NODE_ENV` is typed read-only (Next augments it), so the value
  // is swapped through Vitest's env stubbing and restored afterwards.
  vi.stubEnv("NODE_ENV", nodeEnv);
  vi.resetModules();
  try {
    const { default: config } = await import("../next.config");
    const rules = (await config.headers?.()) ?? [];
    return rules.flatMap((rule) => rule.headers as HeaderEntry[]);
  } finally {
    vi.unstubAllEnvs();
  }
}

const cspOf = (headers: HeaderEntry[], key: string) =>
  headers.find((header) => header.key === key)?.value ?? "";

describe("next.config header policy", () => {
  it("enforces the policy on a production server", async () => {
    const headers = await headersFor("production");
    expect(headers.map((h) => h.key)).toContain("Content-Security-Policy");
    expect(headers.map((h) => h.key)).not.toContain(
      "Content-Security-Policy-Report-Only",
    );
  });

  it("delivers the same policy without blocking it during development", async () => {
    const headers = await headersFor("development");
    expect(headers.map((h) => h.key)).toContain(
      "Content-Security-Policy-Report-Only",
    );
    expect(headers.map((h) => h.key)).not.toContain("Content-Security-Policy");
    // The dev policy must stay identical, so violations are still visible.
    expect(cspOf(headers, "Content-Security-Policy-Report-Only")).toContain(
      "object-src 'none'",
    );
  });

  it("never allows raw eval, in either mode", async () => {
    for (const mode of ["production", "development"] as const) {
      const value = cspOf(
        await headersFor(mode),
        mode === "production"
          ? "Content-Security-Policy"
          : "Content-Security-Policy-Report-Only",
      );
      const scriptSrc = /script-src([^;]*)/.exec(value)?.[1] ?? "";
      expect(scriptSrc).toContain("'wasm-unsafe-eval'");
      expect(scriptSrc.replace("'wasm-unsafe-eval'", "")).not.toContain(
        "unsafe-eval",
      );
      expect(value).toContain("worker-src 'self' blob:");
    }
  });

  it("allows exactly the AdSense hosts, and nothing wider", async () => {
    // AdSense needs more than its loader: the loader spawns scripts, ad iframes,
    // creatives and beacons on a fixed set of Google hosts. Anything a review
    // would question — `*`, a scheme-wide `https:`, `data:` scripts — must stay
    // out, so the list is pinned host by host.
    const expected = {
      "script-src": [
        "https://pagead2.googlesyndication.com",
        "https://tpc.googlesyndication.com",
        "https://googleads.g.doubleclick.net",
        "https://www.googletagservices.com",
        "https://adservice.google.com",
        "https://partner.googleadservices.com",
        "https://fundingchoicesmessages.google.com",
      ],
      "frame-src": [
        "https://googleads.g.doubleclick.net",
        "https://tpc.googlesyndication.com",
        "https://www.google.com",
        "https://ep2.adtrafficquality.google",
        "https://fundingchoicesmessages.google.com",
      ],
      "img-src": [
        "https://pagead2.googlesyndication.com",
        "https://tpc.googlesyndication.com",
        "https://googleads.g.doubleclick.net",
        "https://www.google.com",
        "https://www.gstatic.com",
      ],
      "connect-src": [
        "https://pagead2.googlesyndication.com",
        "https://googleads.g.doubleclick.net",
        "https://tpc.googlesyndication.com",
        "https://www.google.com",
        "https://ep1.adtrafficquality.google",
        "https://ep2.adtrafficquality.google",
        "https://fundingchoicesmessages.google.com",
        "https://csi.gstatic.com",
      ],
    } as const;

    for (const mode of ["production", "development"] as const) {
      const value = cspOf(
        await headersFor(mode),
        mode === "production"
          ? "Content-Security-Policy"
          : "Content-Security-Policy-Report-Only",
      );
      for (const [directive, hosts] of Object.entries(expected)) {
        const sources = (
          new RegExp(`${directive}([^;]*)`).exec(value)?.[1] ?? ""
        )
          .trim()
          .split(/\s+/)
          .filter((source) => source.startsWith("https://"));
        expect(sources).toEqual(hosts);
      }
      // Framing *this* site, injecting objects and rewriting <base> stay closed,
      // and no wildcard sneaks into any directive.
      expect(value).toContain("frame-ancestors 'none'");
      expect(value).toContain("object-src 'none'");
      expect(value).toContain("base-uri 'self'");
      expect(value).toContain("form-action 'self'");
      expect(value).not.toMatch(/(^|[\s;])[*]([\s;]|$)/);
      expect(value).not.toMatch(/\shttps:(\s|;|$)/);
    }
  });

  it("keeps the rest of the hardening in both modes", async () => {
    for (const mode of ["production", "development"] as const) {
      const keys = (await headersFor(mode)).map((h) => h.key);
      expect(keys).toEqual(
        expect.arrayContaining([
          "Strict-Transport-Security",
          "X-Content-Type-Options",
          "Referrer-Policy",
          "Permissions-Policy",
          "X-Robots-Tag",
        ]),
      );
    }
  });

  it("allows the camera on the QR scanner page only", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.resetModules();
    try {
      const { default: config } = await import("../next.config");
      const rules = (await config.headers?.()) ?? [];
      const permissionRule = (source: string) =>
        rules
          .filter((rule) => rule.source === source)
          .flatMap((rule) => rule.headers as HeaderEntry[])
          .find((header) => header.key === "Permissions-Policy")?.value ?? "";

      // The scanner needs a camera for its live mode, and a scoped rule is the
      // only way to say yes to one page without saying yes to the whole site.
      expect(permissionRule("/tools/qr-code-scanner")).toContain(
        "camera=(self)",
      );
      // Everything else keeps the camera off: no other tool asks for it.
      expect(permissionRule("/:path*")).toContain("camera=()");
      expect(permissionRule("/:path*")).not.toContain("camera=(self)");
      // Microphone and location stay off everywhere, scanner included.
      for (const source of ["/:path*", "/tools/qr-code-scanner"])
        expect(permissionRule(source)).toContain(
          "microphone=(), geolocation=()",
        );
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("only widens the dev-origin guard while developing", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.resetModules();
    try {
      const { default: config } = await import("../next.config");
      expect(config.allowedDevOrigins).toBeUndefined();
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
