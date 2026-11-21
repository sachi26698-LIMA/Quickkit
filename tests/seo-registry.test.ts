/**
 * The SEO registry contract.
 *
 * These tests exist so that "we improved the metadata" cannot rot. They fail
 * when:
 *
 *   • a published tool ships without a researched record;
 *   • two records collide on title, description or primary keyword;
 *   • a title drifts past the SERP budget or repeats the brand;
 *   • a curated internal link points at a route that does not exist;
 *   • an empty category becomes indexable (the doorway-page failure);
 *   • the sitemap and the registry disagree about what is indexable;
 *   • the tool pages stop resolving their metadata through the registry.
 *
 * Nothing here renders a page or reads a database: the registry is data, so the
 * guarantees are cheap enough to run on every commit.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { tools, categoryMeta, toolCategoriesOf } from "../lib/catalog";
import { legalPages } from "../lib/legal";
import {
  allCategorySeoRecords,
  allToolSeoRecords,
  registeredIndexablePaths,
  resolveCategorySeo,
  resolveToolSeo,
} from "../lib/seo/resolve";
import {
  allPageSeoRecords,
  fillToolCount,
  registeredPagePaths,
  resolvePageSeo,
} from "../lib/seo/pages";
import {
  buildSeoReport,
  DESCRIPTION_MAX,
  DESCRIPTION_MIN,
  errorsOf,
  TITLE_MAX_RAW,
} from "../lib/seo/audit";

const ORIGIN = "https://www.quickkit.live";

beforeEach(() => {
  vi.stubEnv("SITE_URL", ORIGIN);
  vi.stubEnv("LAUNCH_APPROVED", "true");
  vi.stubEnv("VERCEL_ENV", "production");
  vi.resetModules();
});

describe("SEO registry — coverage", () => {
  it("has exactly one record for every published tool and no orphans", () => {
    const records = allToolSeoRecords();
    const slugs = records.map((record) => record.slug).sort();
    expect(slugs).toEqual(tools.map((tool) => tool.slug).sort());
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const record of records) {
      expect(record.path).toBe(`/tools/${record.slug}`);
    }
  });

  it("has exactly one record for every catalogue category", () => {
    const records = allCategorySeoRecords();
    expect(records.map((record) => record.slug).sort()).toEqual(
      categoryMeta.map((category) => category.slug).sort(),
    );
    for (const record of records) {
      expect(record.path).toBe(`/category/${record.slug}`);
    }
  });

  it("never marks a category with no published tools as indexable", () => {
    for (const record of allCategorySeoRecords()) {
      const category = categoryMeta.find((item) => item.slug === record.slug);
      const published = tools.filter((tool) =>
        toolCategoriesOf(tool).includes(category!.name),
      ).length;
      if (published === 0) {
        expect(record.indexable, `${record.slug} must not be indexable`).toBe(
          false,
        );
      } else {
        expect(record.indexable, `${record.slug} should be indexable`).toBe(
          true,
        );
      }
    }
  });
});

describe("SEO registry — metadata quality", () => {
  it("reports zero audit errors", () => {
    const report = buildSeoReport();
    expect(errorsOf(report)).toEqual([]);
  });

  it("keeps every title inside the SERP budget and out of the brand slot", () => {
    for (const record of allToolSeoRecords()) {
      expect(record.title.length, `${record.path} title`).toBeLessThanOrEqual(
        TITLE_MAX_RAW,
      );
      expect(record.title).not.toMatch(/quickkit/i);
      // The template appends " | QUICKKIT", so the rendered title is budgeted.
      expect(record.title.length + " | QUICKKIT".length).toBeLessThanOrEqual(
        60,
      );
    }
    for (const record of allCategorySeoRecords()) {
      expect(record.title.length, `${record.path} title`).toBeLessThanOrEqual(
        TITLE_MAX_RAW,
      );
      expect(record.title).not.toMatch(/quickkit/i);
    }
  });

  it("keeps every description inside the editorial 140–160 target", () => {
    for (const record of [...allToolSeoRecords(), ...allCategorySeoRecords()]) {
      expect(
        record.description.length,
        `${record.path} description`,
      ).toBeGreaterThanOrEqual(DESCRIPTION_MIN);
      expect(
        record.description.length,
        `${record.path} description`,
      ).toBeLessThanOrEqual(DESCRIPTION_MAX);
    }
  });

  it("gives every record alternative titles and a description variant", () => {
    for (const record of allToolSeoRecords()) {
      expect(record.alternativeTitles).toHaveLength(2);
      for (const variant of record.alternativeTitles) {
        expect(variant.trim().length, `${record.path} variant`).toBeGreaterThan(
          20,
        );
        expect(variant.length).toBeLessThanOrEqual(TITLE_MAX_RAW);
        expect(variant).not.toBe(record.title);
      }
      expect(record.alternativeDescription.length).toBeGreaterThan(120);
      expect(record.alternativeDescription).not.toBe(record.description);
    }
  });

  it("records a research reference, an intent and a keyword cluster for every tool", () => {
    for (const record of allToolSeoRecords()) {
      expect(record.researchId, `${record.path} researchId`).toBeTruthy();
      expect(record.primaryKeyword.trim()).not.toBe("");
      expect(
        record.secondaryKeywords.length,
        `${record.path} secondary keywords`,
      ).toBeGreaterThanOrEqual(3);
      expect([
        "transactional",
        "informational",
        "commercial",
        "navigational",
      ]).toContain(record.intent);
    }
  });

  it("never repeats a primary keyword across two tool records", () => {
    const seen = new Map<string, string>();
    for (const record of allToolSeoRecords()) {
      const key = record.primaryKeyword.toLowerCase();
      expect(
        seen.has(key),
        `${record.path} duplicates ${seen.get(key)} on "${key}"`,
      ).toBe(false);
      seen.set(key, record.path);
    }
  });

  it("covers more than one kind of search intent", () => {
    const report = buildSeoReport();
    expect(Object.keys(report.intentCounts).length).toBeGreaterThanOrEqual(2);
  });
});

describe("SEO registry — page-level records (hubs, guide and policies)", () => {
  it("covers the homepage, both index hubs, the guide and every indexable policy page", () => {
    const paths = allPageSeoRecords().map((record) => record.path);
    expect(new Set(paths).size).toBe(paths.length);
    for (const route of [
      "/",
      "/tools",
      "/help",
      "/guides/barcode",
      "/sitemap",
      "/contact",
    ]) {
      expect(paths, `${route} missing a page record`).toContain(route);
    }
    // Every indexable legal page is represented, and nothing else claims to be.
    for (const page of legalPages) {
      expect(paths, `${page.href} missing a page record`).toContain(page.href);
    }
    expect(
      paths
        .filter(
          (path) =>
            path !== "/" &&
            !path.startsWith("/tools") &&
            !path.startsWith("/category") &&
            !path.startsWith("/guides") &&
            path !== "/help" &&
            path !== "/sitemap",
        )
        .sort(),
    ).toEqual(legalPages.map((page) => page.href).sort());
  });

  it("keeps every page title inside the raw and rendered budget with no brand repeat", () => {
    for (const record of allPageSeoRecords()) {
      const title = fillToolCount(record.title, tools.length);
      expect(title.length, `${record.path} raw title`).toBeLessThanOrEqual(
        TITLE_MAX_RAW,
      );
      expect(
        title.length + " | QUICKKIT".length,
        `${record.path} rendered title`,
      ).toBeLessThanOrEqual(60);
      expect(record.title, `${record.path} repeats the brand`).not.toMatch(
        /quickkit/i,
      );
    }
  });

  it("keeps every page description inside the snippet budget", () => {
    for (const record of allPageSeoRecords()) {
      const description = fillToolCount(record.description, tools.length);
      expect(
        description.length,
        `${record.path} description`,
      ).toBeLessThanOrEqual(DESCRIPTION_MAX);
      expect(
        description.length,
        `${record.path} description`,
      ).toBeGreaterThanOrEqual(100);
      // A placeholder left in live copy would ship "{count}" to Google.
      expect(
        description,
        `${record.path} unresolved placeholder`,
      ).not.toContain("{count}");
    }
  });

  it("names the H1 each page actually renders, and links only to real routes", () => {
    const known = new Set<string>([
      ...allPageSeoRecords().map((record) => record.path),
      ...allToolSeoRecords().map((record) => record.path),
      ...allCategorySeoRecords().map((record) => record.path),
      ...legalPages.map((page) => page.href),
    ]);
    for (const record of allPageSeoRecords()) {
      expect(record.h1.trim(), `${record.path} h1`).not.toBe("");
      expect(record.researchId, `${record.path} researchId`).toBeTruthy();
      expect(
        record.secondaryKeywords.length,
        `${record.path} keywords`,
      ).toBeGreaterThanOrEqual(3);
      expect(
        record.internalLinks.length,
        `${record.path} links`,
      ).toBeGreaterThanOrEqual(3);
      expect(new Set(record.internalLinks).size).toBe(
        record.internalLinks.length,
      );
      for (const target of record.internalLinks) {
        expect(known.has(target), `${record.path} → ${target}`).toBe(true);
        expect(target).not.toBe(record.path);
      }
    }
  });

  it("fills the live tool count and refuses unknown routes", () => {
    const home = resolvePageSeo("/", { toolCount: 56 })!;
    expect(home.description).toContain("56 free online tools");
    expect(home.title).not.toContain("{count}");
    const toolsPage = resolvePageSeo("/tools", { toolCount: 56 })!;
    expect(toolsPage.title).toContain("56");
    expect(resolvePageSeo("/not-a-page")).toBeUndefined();
  });

  it("agrees with the sitemap about which hub and policy pages are listed", async () => {
    const { default: sitemap } = await import("../app/sitemap");
    const { absoluteUrl } = await import("../lib/seo");
    const urls = (await sitemap()).map((entry) => entry.url);
    for (const path of registeredPagePaths()) {
      // Built through the same helper the sitemap uses, so `/` is compared as
      // the bare origin rather than `ORIGIN + "/"`.
      expect(urls, `${path} missing from sitemap`).toContain(absoluteUrl(path));
    }
  });
});

describe("SEO registry — internal linking", () => {
  it("points only at routes that exist, and never at itself", () => {
    const known = new Set<string>([
      ...allToolSeoRecords().map((record) => record.path),
      ...allCategorySeoRecords().map((record) => record.path),
      ...legalPages.map((page) => page.href),
      "/",
      "/tools",
      "/help",
      "/sitemap",
      "/guides/barcode",
      "/security",
    ]);
    for (const record of [...allToolSeoRecords(), ...allCategorySeoRecords()]) {
      expect(
        record.internalLinks.length,
        `${record.path} internal links`,
      ).toBeGreaterThanOrEqual(3);
      for (const target of record.internalLinks) {
        expect(known.has(target), `${record.path} → ${target}`).toBe(true);
        expect(target, `${record.path} self-link`).not.toBe(record.path);
      }
      expect(new Set(record.internalLinks).size).toBe(
        record.internalLinks.length,
      );
    }
  });

  it("leaves no tool without at least one inbound curated link", () => {
    const inbound = new Map<string, number>(
      allToolSeoRecords().map((record) => [record.path, 0]),
    );
    for (const record of allToolSeoRecords()) {
      for (const target of record.internalLinks) {
        if (inbound.has(target)) {
          inbound.set(target, (inbound.get(target) ?? 0) + 1);
        }
      }
    }
    for (const [path, count] of inbound) {
      expect(count, `${path} inbound links`).toBeGreaterThanOrEqual(1);
    }
  });
});

describe("SEO registry — sitemap agreement", () => {
  it("ships exactly the indexable registry paths plus the trust and utility routes", async () => {
    const { default: sitemap } = await import("../app/sitemap");
    const entries = await sitemap();
    const urls = entries.map((entry) => entry.url);

    // Every registry path marked indexable is present, absolute and canonical.
    for (const path of registeredIndexablePaths()) {
      expect(urls, `${path} missing from sitemap`).toContain(ORIGIN + path);
    }
    for (const url of urls) {
      const parsed = new URL(url);
      expect(parsed.origin).toBe(ORIGIN);
      expect(parsed.search).toBe("");
    }

    // Nothing the registry vetoes can appear.
    const excluded = [
      ...allToolSeoRecords()
        .filter((record) => !record.indexable)
        .map((record) => record.path),
      ...allCategorySeoRecords()
        .filter((record) => !record.indexable)
        .map((record) => record.path),
    ];
    for (const path of excluded) {
      expect(urls, `${path} must not be in the sitemap`).not.toContain(
        ORIGIN + path,
      );
    }
    expect(urls).not.toContain(`${ORIGIN}/category/ai-tools`);
  });
});

describe("SEO registry — resolution", () => {
  it("resolves records by slug and refuses unknown slugs instead of guessing", () => {
    expect(resolveToolSeo("merge-pdf")?.title).toContain("Merge PDF");
    expect(resolveToolSeo("not-a-real-tool")).toBeUndefined();
    expect(resolveCategorySeo("pdf-tools")?.h1).toBe("PDF Tools");
    expect(resolveCategorySeo("not-a-category")).toBeUndefined();
  });

  it("keeps every tool page resolving metadata through the registry helper", () => {
    const dir = join(process.cwd(), "app/(public)/tools");
    const pages = readdirSync(dir).filter((entry) => {
      try {
        return readFileSync(join(dir, entry, "page.tsx"), "utf8").length > 0;
      } catch {
        return false;
      }
    });
    for (const entry of pages) {
      const source = readFileSync(join(dir, entry, "page.tsx"), "utf8");
      if (!source.includes("generateMetadata")) continue;
      expect(
        source.includes("resolvedToolMetadata("),
        `${entry} must resolve metadata through resolvedToolMetadata`,
      ).toBe(true);
      expect(
        source.includes("publicToolMetadata("),
        `${entry} must not bypass the registry`,
      ).toBe(false);
    }
  });

  it("marks a tool that is switched off for maintenance as noindex, follow", async () => {
    vi.doMock("../lib/supabase/public-catalog", () => ({
      publicToolMetadata: async () => ({
        title: "x",
        description: "y",
      }),
      getPublicCatalog: async () => ({
        tools: [
          { slug: "merge-pdf", maintenance: { reason: "x", since: null } },
        ],
        categories: [],
      }),
    }));
    const { resolvedToolMetadata } = await import("../lib/supabase/tool-seo");
    const metadata = await resolvedToolMetadata("merge-pdf", "t", "d");
    expect(metadata.robots).toEqual({ index: false, follow: true });
    vi.doUnmock("../lib/supabase/public-catalog");
  });
});
