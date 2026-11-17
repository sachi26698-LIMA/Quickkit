import { execFileSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
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
  expect(await sitemap()).toEqual([]);
});
it("uses verified Git dates in full and shallow history without inventing dates", async () => {
  const workspace = mkdtempSync(join(tmpdir(), "quickkit-sitemap-history-"));
  const fullRoot = join(workspace, "full");
  const depthTwoRoot = join(workspace, "depth-two");
  const depthOneRoot = join(workspace, "depth-one");
  mkdirSync(fullRoot);
  const source = join(fullRoot, "app", "(public)", "page.tsx");
  mkdirSync(join(fullRoot, "app", "(public)"), { recursive: true });

  const git = (cwd: string, args: string[], env?: Record<string, string>) =>
    execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();

  try {
    git(fullRoot, ["init", "--quiet", "--initial-branch=main"]);
    git(fullRoot, ["config", "user.name", "Sitemap test"]);
    git(fullRoot, ["config", "user.email", "sitemap-test@example.invalid"]);

    const commitSource = (content: string, date: string) => {
      writeFileSync(source, content);
      git(fullRoot, ["add", "app/(public)/page.tsx"]);
      git(fullRoot, ["commit", "--quiet", "-m", "Update route source"], {
        GIT_AUTHOR_DATE: `${date}T12:00:00Z`,
        GIT_COMMITTER_DATE: `${date}T12:00:00Z`,
      });
    };
    commitSource(
      "export default function Home() { return null; }\n",
      "2024-01-02",
    );
    commitSource(
      "export default function Home() { return <main />; }\n",
      "2024-03-04",
    );

    const { gitLastModifiedForFiles } = await import("../app/sitemap");
    // Checkout/extraction times are not content history. Even a future-dated
    // filesystem mtime must not replace the source commit's recorded date.
    const futureMtime = new Date("2031-07-08T12:00:00.000Z");
    utimesSync(source, futureMtime, futureMtime);
    expect(
      gitLastModifiedForFiles(["app/(public)/page.tsx"], {
        repoRoot: fullRoot,
      }),
    ).toBe("2024-03-04");

    const localUrl = pathToFileURL(fullRoot).href;
    git(workspace, ["clone", "--quiet", "--depth=2", localUrl, depthTwoRoot]);
    git(workspace, ["clone", "--quiet", "--depth=1", localUrl, depthOneRoot]);
    expect(
      gitLastModifiedForFiles(["app/(public)/page.tsx"], {
        repoRoot: depthTwoRoot,
      }),
    ).toBe("2024-03-04");
    expect(
      gitLastModifiedForFiles(["app/(public)/page.tsx"], {
        repoRoot: depthOneRoot,
      }),
    ).toBeUndefined();

    // A later source commit stays later than an audit reference. The sitemap
    // must not silently clamp or backdate history to a wall-clock cap.
    commitSource(
      "export default function Home() { return <article />; }\n",
      "2026-11-15",
    );
    vi.stubEnv("SITEMAP_LASTMOD_NOT_AFTER", "2026-11-10");
    expect(
      gitLastModifiedForFiles(["app/(public)/page.tsx"], {
        repoRoot: fullRoot,
      }),
    ).toBe("2026-11-15");
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
});

it("emits genuine Git dates without a wall-clock or operator cutoff", async () => {
  vi.stubEnv("SITE_URL", "https://test.example");
  vi.stubEnv("LAUNCH_APPROVED", "true");
  vi.stubEnv("VERCEL_ENV", "production");
  // A stale audit ceiling must not suppress a genuine source modification.
  vi.stubEnv("SITEMAP_LASTMOD_NOT_AFTER", "2026-11-10");
  vi.resetModules();
  const { default: sitemap } = await import("../app/sitemap");
  const routes = await sitemap();
  const { INDEXABLE_BRANDS } = await import("../lib/tools/batch-code/brands");
  const { tools } = await import("../lib/catalog");
  const { legalPages } = await import("../lib/legal");
  expect(routes).toHaveLength(
    5 + legalPages.length + 7 + tools.length + INDEXABLE_BRANDS.length,
  );
  expect(
    routes.every((route) => {
      if (route.lastModified === undefined) return true;
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

  const routes = await sitemap();
  // 4 static + the published legal/information pages + 7 non-empty categories
  // + every published tool. Derived so a new page cannot skip the sitemap unnoticed.
  const { legalPages } = await import("../lib/legal");
  const { tools } = await import("../lib/catalog");
  const { INDEXABLE_BRANDS } = await import("../lib/tools/batch-code/brands");
  expect(routes).toHaveLength(
    5 + legalPages.length + 7 + tools.length + INDEXABLE_BRANDS.length,
  );
  for (const entry of routes) {
    // The homepage is listed as the bare origin, so the stripped path is empty
    // there; normalise it to "/" before comparing with `pathname`, which is
    // always "/" for the root.
    const path = entry.url.replace("https://test.example", "") || "/";
    const canonical = new URL(entry.url);
    expect(canonical.origin, `canonical origin for ${path}`).toBe(
      "https://test.example",
    );
    expect(canonical.pathname, `canonical path for ${path}`).toBe(path);
    expect(canonical.search, `canonical query for ${path}`).toBe("");
    expect(canonical.hash, `canonical fragment for ${path}`).toBe("");
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
  // A shallow checkout may omit dates whose only source commit is its boundary.
  // The fixture above verifies that full and shallow history are handled exactly.
  expect(
    gitLastModifiedForFiles(["nonexistent/route-file.tsx"]),
  ).toBeUndefined();

  // Every tool route must agree with the tool's actual indexability and canonical.
  const { getPublicCatalog } = await import("@/lib/supabase/public-catalog");
  const publicCatalog = await getPublicCatalog();
  const sitemapPaths = new Set(
    routes.map((route) => new URL(route.url).pathname),
  );
  for (const tool of publicCatalog.tools) {
    const selfCanonical =
      !tool.canonicalPath || tool.canonicalPath === `/tools/${tool.slug}`;
    expect(sitemapPaths.has(`/tools/${tool.slug}`), tool.slug).toBe(
      tool.isIndexable && selfCanonical,
    );
  }
  for (const category of publicCatalog.categories) {
    const hasIndexableCanonicalTool = publicCatalog.tools.some(
      (tool) =>
        tool.isIndexable &&
        (!tool.canonicalPath || tool.canonicalPath === `/tools/${tool.slug}`) &&
        (tool.category === category.name ||
          ("categories" in tool &&
            Array.isArray(tool.categories) &&
            (tool.categories as readonly string[]).includes(category.name))),
    );
    expect(sitemapPaths.has(`/category/${category.slug}`), category.slug).toBe(
      hasIndexableCanonicalTool,
    );
  }
  const disclaimerCommits = execFileSync(
    "git",
    [
      "log",
      "--no-merges",
      "--format=%H",
      "--",
      "app/(public)/disclaimer/page.tsx",
      "app/disclaimer/page.tsx",
    ],
    { encoding: "utf8" },
  )
    .trim()
    .split(/\r?\n/)
    .filter(Boolean);
  expect(
    gitLastModifiedForFiles(["app/(public)/disclaimer/page.tsx"], {
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
  // Every URL on the production origin. The homepage is the bare origin (the
  // spelling Next.js fixes for the canonical), every other route has a path.
  expect(
    routes.every(
      (r) =>
        r.url === "https://test.example" ||
        r.url.startsWith("https://test.example/"),
    ),
  ).toBe(true);
}, 15000);
