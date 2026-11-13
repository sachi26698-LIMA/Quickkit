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
it("emits genuine Git dates without a wall-clock or operator cutoff", async () => {
  vi.stubEnv("SITE_URL", "https://test.example");
  vi.stubEnv("LAUNCH_APPROVED", "true");
  vi.stubEnv("VERCEL_ENV", "production");
  // A stale audit ceiling must not suppress a genuine source modification.
  vi.stubEnv("SITEMAP_LASTMOD_NOT_AFTER", "2026-11-10");
  vi.resetModules();
  const { default: sitemap } = await import("../app/sitemap");
  const routes = sitemap();
  const { BRANDS } = await import("../lib/tools/batch-code/brands");
  // Every published tool, plus one page per brand record in the checker.
  expect(routes).toHaveLength(68 + BRANDS.length);
  expect(routes.every((route) => route.lastModified !== undefined)).toBe(true);
  expect(
    routes.every((route) => {
      const date =
        route.lastModified instanceof Date
          ? route.lastModified.toISOString().slice(0, 10)
          : route.lastModified;
      return typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date);
    }),
  ).toBe(true);
});

it("emits all real sitemap routes only after explicit production approval", async () => {
  vi.stubEnv("SITE_URL", "https://test.example");
  vi.stubEnv("LAUNCH_APPROVED", "true");
  vi.stubEnv("VERCEL_ENV", "production");
  vi.resetModules();
  const { default: robots } = await import("../app/robots");
  const {
    default: sitemap,
    gitLastModifiedForFiles,
    routeSourceFiles,
  } = await import("../app/sitemap");
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
    expect(rule.disallow).toEqual(["/api/"]);
    // /saved and /qr must stay crawlable so Googlebot can read their noindex directives.
    expect(rule.disallow).not.toContain("/saved");
    expect(rule.disallow).not.toContain("/qr");
  }
  // An ads.txt is only honoured while its path is allowed.
  expect(JSON.stringify(rules)).not.toContain('"disallow":["/"');
  expect(robots().sitemap).toBe("https://test.example/sitemap.xml");

  const routes = sitemap();
  // 4 static + the published legal/information pages + 7 non-empty categories
  // + every published tool. Derived so a new page cannot skip the sitemap unnoticed.
  const { legalPages } = await import("../lib/legal");
  const { tools } = await import("../lib/catalog");
  const { BRANDS } = await import("../lib/tools/batch-code/brands");
  expect(routes).toHaveLength(
    4 + legalPages.length + 7 + tools.length + BRANDS.length,
  );
  for (const entry of routes) {
    const path = entry.url.replace("https://test.example", "");
    const sourceFiles = routeSourceFiles(path);
    expect(sourceFiles.length, `mapped files for ${path}`).toBeGreaterThan(0);
    const sitemapDate =
      entry.lastModified instanceof Date
        ? entry.lastModified.toISOString().slice(0, 10)
        : entry.lastModified;
    expect(sitemapDate, `Git-derived date for ${path}`).toBe(
      gitLastModifiedForFiles(sourceFiles),
    );
    if (sitemapDate !== undefined) {
      expect(sitemapDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  }
  expect(routes.every((entry) => entry.lastModified !== undefined)).toBe(true);
  // Missing route history remains omitted; no build/current date is substituted.
  expect(
    gitLastModifiedForFiles(["nonexistent/route-file.tsx"]),
  ).toBeUndefined();
  expect(gitLastModifiedForFiles(["app/page.tsx"])).toMatch(
    /^\d{4}-\d{2}-\d{2}$/,
  );
  const { execFileSync } = await import("node:child_process");
  const disclaimerCommits = execFileSync(
    "git",
    ["log", "--no-merges", "--format=%H", "--", "app/disclaimer/page.tsx"],
    { encoding: "utf8" },
  )
    .trim()
    .split(/\r?\n/)
    .filter(Boolean);
  expect(
    gitLastModifiedForFiles(["app/disclaimer/page.tsx"], {
      shallowCommits: new Set(disclaimerCommits),
    }),
  ).toBeUndefined();
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
