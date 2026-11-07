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
  expect(robots().rules).toEqual({
    userAgent: "*",
    allow: "/ads.txt",
    disallow: "/",
  });
  expect(sitemap()).toEqual([]);
});
it("emits all real sitemap routes only after explicit production approval", async () => {
  vi.stubEnv("SITE_URL", "https://test.example");
  vi.stubEnv("LAUNCH_APPROVED", "true");
  vi.stubEnv("VERCEL_ENV", "production");
  vi.resetModules();
  const { default: robots } = await import("../app/robots");
  const { default: sitemap } = await import("../app/sitemap");
  expect(robots().rules).toEqual({ userAgent: "*", allow: "/" });
  const routes = sitemap();
  // 5 static + the published legal/information pages + 7 non-empty categories
  // + every published tool. Derived so a new page cannot skip the sitemap unnoticed.
  const { legalPages } = await import("../lib/legal");
  const { tools } = await import("../lib/catalog");
  expect(routes).toHaveLength(5 + legalPages.length + 7 + tools.length);
  expect(routes.every((r) => r.url.startsWith("https://test.example/"))).toBe(
    true,
  );
});
