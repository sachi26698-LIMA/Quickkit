import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { MetadataRoute } from "next";
import { siteOrigin } from "@/lib/seo";
import { indexingEnabled } from "@/lib/launch";
import {
  categoryMeta,
  metaBySlug,
  tools,
  toolsByCategory,
} from "@/lib/catalog";
import { legalPages } from "@/lib/legal";
import { BRANDS } from "@/lib/tools/batch-code/brands";

/**
 * Tools whose engine lives outside `lib/tools/<slug>`.
 *
 * The default mapping assumes one folder per route; a multi-mode tool keeps its
 * engine in a shared directory instead, and the sitemap's lastmod should still
 * follow that code.
 */
const EXTRA_ROUTE_SOURCES: Readonly<Record<string, readonly string[]>> = {
  "/tools/barcode-generator": [
    "lib/tools/barcode",
    "components/tools/barcode-studio",
  ],
  "/tools/gs1-intelligence": [
    "lib/tools/gs1",
    "components/tools/gs1-intelligence",
  ],
  "/tools/product-lookup": [
    "lib/tools/barcode-scanner/product-lookup.ts",
    "components/tools/product-lookup",
  ],
  "/tools/batch-studio": ["components/tools/batch-studio"],
  "/tools/barcode-developer": ["components/tools/barcode-developer"],
};

const CALCULATOR_SOURCE_FILES: Readonly<Record<string, readonly string[]>> = {
  "age-calculator": ["components/tools/phase9-dates.tsx"],
  "date-difference-calculator": ["components/tools/phase9-dates.tsx"],
  "emi-calculator": [
    "components/tools/phase9-loans.tsx",
    "components/tools/phase9-v2-variable-loan.tsx",
  ],
  "loan-calculator": [
    "components/tools/phase9-loans.tsx",
    "components/tools/phase9-v2-variable-loan.tsx",
  ],
  "unit-converter": ["components/tools/phase9-converters.tsx"],
  "temperature-converter": ["components/tools/phase9-converters.tsx"],
  "time-converter": [
    "components/tools/phase9-converters.tsx",
    "components/tools/phase9-v2-time.tsx",
    "components/tools/phase9-timezones.tsx",
    "components/tools/phase9-v2-calendar-time.tsx",
  ],
  "scientific-calculator": ["components/tools/phase9-scientific.tsx"],
  "bmi-calculator": [
    "components/tools/calculator.tsx",
    "components/tools/phase9-bmi-comparison.tsx",
  ],
  "gst-calculator": [
    "components/tools/calculator.tsx",
    "components/tools/phase9-v2-gst.tsx",
  ],
  "percentage-calculator": [
    "components/tools/calculator.tsx",
    "components/tools/phase9-v2-percentage.tsx",
  ],
  "discount-calculator": [
    "components/tools/calculator.tsx",
    "components/tools/phase9-v2-discount.tsx",
    "components/tools/phase9-v2-offers.tsx",
    "components/tools/phase9-profit.tsx",
  ],
};

function repoPath(repoRoot: string, ...segments: string[]): string {
  return join(/* turbopackIgnore: true */ repoRoot, ...segments);
}

function repoFileExists(fullPath: string): boolean {
  return existsSync(/* turbopackIgnore: true */ fullPath);
}

function readRepoText(fullPath: string): string {
  return readFileSync(/* turbopackIgnore: true */ fullPath, "utf8");
}

function readShallowCommits(repoRoot: string): Set<string> {
  try {
    const gitDir = execFileSync("git", ["rev-parse", "--git-dir"], {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    const shallowPath = repoPath(repoRoot, gitDir, "shallow");
    if (!repoFileExists(shallowPath)) return new Set();
    return new Set(
      readRepoText(shallowPath)
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean),
    );
  } catch {
    return new Set();
  }
}

function isIsoCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = Date.parse(`${value}T00:00:00.000Z`);
  return (
    Number.isFinite(parsed) &&
    new Date(parsed).toISOString().slice(0, 10) === value
  );
}

/**
 * Resolves the latest genuine Git commit date (`YYYY-MM-DD`) for route-owned
 * source files. This is deterministic from repository history: it never uses
 * the current date, build time, filesystem `mtime`, or a shared cutoff, and it
 * never backdates a route. Shallow-boundary commits are ignored; if no
 * verifiable source history remains, `<lastmod>` is omitted.
 */
export function gitLastModifiedForFiles(
  files: readonly string[],
  options?: {
    repoRoot?: string;
    shallowCommits?: ReadonlySet<string>;
  },
): string | undefined {
  const repoRoot = options?.repoRoot ?? process.cwd();
  const existing = [...new Set(files)].filter((rel) =>
    repoFileExists(repoPath(repoRoot, rel)),
  );
  if (existing.length === 0) return undefined;

  const shallow = options?.shallowCommits ?? readShallowCommits(repoRoot);
  try {
    const output = execFileSync(
      "git",
      ["log", "--no-merges", "--format=%H %cs", "--", ...existing],
      {
        cwd: repoRoot,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      },
    ).trim();
    if (!output) return undefined;

    let latestDate: string | undefined;
    for (const line of output.split(/\r?\n/)) {
      const [sha, isoDate] = line.trim().split(/\s+/);
      if (!sha || !isoDate || shallow.has(sha)) continue;
      if (!isIsoCalendarDate(isoDate)) continue;
      if (!latestDate || isoDate > latestDate) {
        latestDate = isoDate;
      }
    }
    return latestDate;
  } catch {
    return undefined;
  }
}

function resolveModuleTarget(repoRoot: string, relImport: string): string[] {
  const candidates = [relImport, `${relImport}.tsx`, `${relImport}.ts`];
  return candidates.filter((candidate) =>
    repoFileExists(repoPath(repoRoot, candidate)),
  );
}

/**
 * Maps a public route path to the specific source files that own its content
 * and interactive workspace (deliberately excluding global layout/chrome so a
 * header tweak does not claim every page's content changed).
 */
export function routeSourceFiles(
  path: string,
  repoRoot = process.cwd(),
): string[] {
  if (path === "/") return ["app/page.tsx", "components/hero-search.tsx"];
  if (path === "/tools") {
    return ["app/tools/page.tsx", "components/tool-explorer.tsx"];
  }
  if (path === "/help") return ["app/help/page.tsx"];
  if (path === "/sitemap") return ["app/sitemap/page.tsx"];

  // Brand detail pages live one level below a tool route but are generated
  // statically from the batch-code records, so they are mapped explicitly.
  if (path.startsWith("/tools/batch-code-checker/brand/")) {
    return [
      "app/tools/batch-code-checker/brand/[slug]/page.tsx",
      "lib/tools/batch-code",
    ];
  }

  if (path.startsWith("/tools/")) {
    const slug = path.slice("/tools/".length);
    const staticPage = `app/tools/${slug}/page.tsx`;
    const staticPageFull = repoPath(repoRoot, staticPage);
    if (repoFileExists(staticPageFull)) {
      const found = [staticPage];
      const source = readRepoText(staticPageFull);
      for (const match of source.matchAll(
        /from\s+"@\/((?:components|lib)\/tools\/[^"]+)"/g,
      )) {
        found.push(...resolveModuleTarget(repoRoot, match[1]));
      }
      const libDir = `lib/tools/${slug}`;
      if (repoFileExists(repoPath(repoRoot, libDir))) found.push(libDir);
      for (const extra of EXTRA_ROUTE_SOURCES[path] ?? [])
        if (repoFileExists(repoPath(repoRoot, extra))) found.push(extra);
      return [...new Set(found)];
    }

    const calcSpecific = CALCULATOR_SOURCE_FILES[slug];
    if (calcSpecific) {
      return ["lib/calculator-info.ts", ...calcSpecific];
    }
    return [];
  }

  if (path.startsWith("/category/")) {
    const slug = path.slice("/category/".length);
    const meta = metaBySlug(slug);
    const categoryTools = meta
      ? toolsByCategory(meta.name).flatMap((tool) =>
          routeSourceFiles(`/tools/${tool.slug}`, repoRoot),
        )
      : [];
    return ["lib/category-content.ts", ...categoryTools];
  }

  const topLevelPage = `app${path}/page.tsx`;
  if (repoFileExists(repoPath(repoRoot, topLevelPage))) {
    return [topLevelPage];
  }
  return [];
}

/**
 * Only routes that are finished, public and approved for indexing are listed.
 * The list is derived from the catalog and the legal registry rather than
 * hand-maintained, so a page cannot be published without appearing here, and a
 * page cannot appear here without existing.
 *
 * While `indexingEnabled` is false the sitemap is empty and `robots.txt`
 * disallows everything — a preview build must never leak draft pages.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  if (!indexingEnabled || !siteOrigin) return [];

  // `/saved` and `/qr` are deliberately absent: they carry `noindex` directives
  // and render per-browser or user-encoded state rather than indexable content.
  const staticRoutes = ["/", "/tools", "/help", "/sitemap", "/guides/barcode"];
  const legalRouteSet = new Set(
    legalPages.filter((page) => page.indexable).map((page) => page.href),
  );

  const paths = [
    ...new Set([
      ...staticRoutes,
      ...legalRouteSet,
      ...categoryMeta
        // A category with no published tools is an empty page; keep it out
        // until it actually ships.
        .filter((category) =>
          tools.some(
            (tool) =>
              tool.category === category.name ||
              ("categories" in tool &&
                Array.isArray(tool.categories) &&
                (tool.categories as readonly string[]).includes(category.name)),
          ),
        )
        .map((category) => `/category/${category.slug}`),
      ...tools.map((tool) => `/tools/${tool.slug}`),
      // One page per brand record: each states that brand's decoder status,
      // limitation and shelf-life source, so it is not a duplicate of another.
      ...BRANDS.map((brand) => `/tools/batch-code-checker/brand/${brand.slug}`),
    ]),
  ];

  const repoRoot = process.cwd();
  const shallowCommits = readShallowCommits(repoRoot);

  return paths.map((path) => {
    const lastModified = gitLastModifiedForFiles(
      routeSourceFiles(path, repoRoot),
      { repoRoot, shallowCommits },
    );
    return {
      url: siteOrigin + path,
      ...(lastModified ? { lastModified } : {}),
    };
  });
}
