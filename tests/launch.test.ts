import { afterEach, it, expect, vi } from "vitest";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});
it.each([
  ["", "", "", false],
  ["https://test.example", "", "", false],
  ["", "true", "production", false],
  ["https://test.example", "false", "production", false],
  ["https://test.example", "true", "preview", false],
  ["https://test.example", "true", "development", false],
  ["https://test.example", "true", "production", true],
  ["https://test.example", "true", "", true],
])(
  "indexing gate: origin=%s approval=%s environment=%s",
  async (origin, approval, environment, expected) => {
    vi.stubEnv("SITE_URL", origin);
    vi.stubEnv("LAUNCH_APPROVED", approval);
    vi.stubEnv("VERCEL_ENV", environment);
    vi.resetModules();
    const { indexingEnabled } = await import("../lib/launch");
    expect(indexingEnabled).toBe(expected);
  },
);

it("keeps sitemap and robots blocked even with an origin but no approval", async () => {
  vi.stubEnv("SITE_URL", "https://test.example");
  vi.stubEnv("LAUNCH_APPROVED", "false");
  vi.stubEnv("VERCEL_ENV", "production");
  vi.resetModules();
  const { default: robots } = await import("../app/robots");
  const { default: sitemap } = await import("../app/sitemap");
  // ads.txt stays crawlable even while the rest of the site is not indexable.
  expect(robots().rules).toEqual([
    { userAgent: "*", allow: "/ads.txt", disallow: "/" },
  ]);
  expect(sitemap()).toEqual([]);
});
it("emits all real sitemap routes only after explicit production approval", async () => {
  vi.stubEnv("SITE_URL", "https://test.example");
  vi.stubEnv("LAUNCH_APPROVED", "true");
  vi.stubEnv("VERCEL_ENV", "production");
  vi.resetModules();
  const { default: robots } = await import("../app/robots");
  const { default: sitemap } = await import("../app/sitemap");
  // Public pages stay crawlable — including for Search and AdSense reviewers —
  // while the POST-only API and the browser-local /saved page stay out.
  const rules = robots().rules as {
    userAgent: string;
    allow: string;
    disallow: string[];
  }[];
  expect(rules.map((rule) => rule.userAgent)).toEqual([
    "*",
    "Googlebot",
    "Mediapartners-Google",
  ]);
  for (const rule of rules) {
    expect(rule.allow).toBe("/");
    expect(rule.disallow).toEqual(["/api/", "/saved", "/qr"]);
  }
  // An ads.txt is only honoured while its path is allowed.
  expect(JSON.stringify(rules)).not.toContain('"disallow":["/"');
  expect(robots().sitemap).toBe("https://test.example/sitemap.xml");

  const routes = sitemap();
  // 4 static + the published legal/information pages + 7 non-empty categories
  // + every published tool. Derived so a new page cannot skip the sitemap unnoticed.
  const { legalPages } = await import("../lib/legal");
  const { tools } = await import("../lib/catalog");
  expect(routes).toHaveLength(4 + legalPages.length + 7 + tools.length);
  // Nothing private or personal is ever listed.
  expect(routes.map((route) => route.url)).not.toContain(
    "https://test.example/saved",
  );
  expect(routes.map((route) => route.url)).not.toContain(
    "https://test.example/qr",
  );
  expect(routes.map((route) => route.url)).not.toContain(
    "https://test.example/category/ai-tools",
  );
  expect(routes.every((r) => r.url.startsWith("https://test.example/"))).toBe(
    true,
  );
});
