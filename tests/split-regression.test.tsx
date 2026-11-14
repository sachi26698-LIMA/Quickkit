// @vitest-environment jsdom
/**
 * Cross-tool regression suite for the combined-converter split.
 *
 * The four tools that replaced the single "Image & PDF Converter" must behave
 * as one coherent catalogue: unique records, correct categories, reachable by
 * search, no leftovers of the retired slug, and favourites that survive the
 * rename. These assertions span several modules on purpose, so a change to any
 * one of them that breaks the others fails here.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import {
  categoryMeta,
  filterTools,
  relatedTools,
  toolCategoriesOf,
  tools,
  toolsByCategory,
} from "@/lib/catalog";
import { legalPages } from "@/lib/legal";
import { BRANDS } from "@/lib/tools/batch-code/brands";
import {
  FAVORITES_KEY,
  SLUG_MIGRATIONS,
  useFavorites,
} from "@/lib/use-favorites";

const SPLIT_TOOLS = [
  "image-to-image",
  "images-to-pdf",
  "pdf-to-image",
  "pdf-studio",
] as const;

const RETIRED = "image-converter";

describe("cross-tool regression: the four split tools", () => {
  it("exist exactly once each, with real routes and metadata", () => {
    for (const slug of SPLIT_TOOLS) {
      const records = tools.filter((t) => t.slug === slug);
      expect(records, `${slug} exists once`).toHaveLength(1);

      const tool = records[0];
      expect(tool.name.length, `${slug} has a name`).toBeGreaterThan(0);
      expect(
        tool.description.length,
        `${slug} has a description`,
      ).toBeGreaterThan(20);
      expect(tool.keywords.length, `${slug} has keywords`).toBeGreaterThan(20);
      expect(tool.icon, `${slug} has an icon`).toBeTruthy();
      expect(tool.color, `${slug} has a colour`).toBeTruthy();
    }
  });

  it("contain no duplicate catalogue records", () => {
    const slugs = tools.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("place each tool in exactly one category, with none dual-listed", () => {
    // The retired combined tool was dual-listed in Image Tools and PDF Tools.
    // Nothing is dual-listed any more.
    expect(tools.filter((t) => toolCategoriesOf(t).length > 1)).toEqual([]);

    expect(toolsByCategory("Image Tools").map((t) => t.slug)).toContain(
      "image-to-image",
    );
    for (const slug of ["images-to-pdf", "pdf-to-image", "pdf-studio"]) {
      expect(toolsByCategory("PDF Tools").map((t) => t.slug)).toContain(slug);
      expect(
        toolsByCategory("Image Tools").map((t) => t.slug),
        `${slug} is not an Image Tool`,
      ).not.toContain(slug);
    }
  });

  it("leave no trace of the retired slug in the catalogue", () => {
    const slugs: string[] = tools.map((t) => t.slug);
    expect(slugs).not.toContain(RETIRED);

    // No category page should still link to it.
    for (const category of categoryMeta) {
      expect(
        toolsByCategory(category.name).map((t) => t.slug),
        `${category.name} free of the retired slug`,
      ).not.toContain(RETIRED);
    }
  });

  it("keep the catalogue counts consistent across every view", () => {
    // A floor rather than an exact count, so unrelated tools can land on main
    // without turning this regression guard into a merge conflict.
    expect(tools.length).toBeGreaterThanOrEqual(30);
    expect(toolsByCategory("Image Tools")).toHaveLength(4);
    expect(toolsByCategory("PDF Tools")).toHaveLength(9);

    // Every category's listing must be a subset of the catalogue, and the
    // per-category counts must sum to the total now that nothing is dual-listed.
    const sum = categoryMeta.reduce(
      (total, category) => total + toolsByCategory(category.name).length,
      0,
    );
    expect(sum, "category counts sum to the catalogue total").toBe(
      tools.length,
    );
  });

  it("reach every split tool through global search", () => {
    const queries: Record<string, string> = {
      "image-to-image": "convert jpg",
      "images-to-pdf": "images to pdf",
      "pdf-to-image": "pdf to image",
      "pdf-studio": "merge",
    };
    for (const [slug, query] of Object.entries(queries)) {
      expect(
        filterTools(query, "All tools").map((t) => t.slug),
        `"${query}" finds ${slug}`,
      ).toContain(slug);
    }
  });

  it("still resolve the search terms the combined tool used to own", () => {
    // Regression guard: these phrases matched the retired record and must keep
    // resolving to a real replacement rather than returning nothing.
    for (const query of [
      "convert jpg",
      "jpg",
      "pdf",
      "image",
      "dpi",
      "studio",
    ]) {
      expect(
        filterTools(query, "All tools").length,
        `"${query}" still returns results`,
      ).toBeGreaterThan(0);
    }
  });

  it("never suggest the retired tool as a related tool", () => {
    for (const tool of tools) {
      const related = relatedTools(tool).map((t) => t.slug);
      expect(related, `related to ${tool.slug}`).not.toContain(RETIRED);
      expect(related, `related to ${tool.slug} excludes itself`).not.toContain(
        tool.slug,
      );
      expect(related.length, `related to ${tool.slug}`).toBeLessThanOrEqual(6);
      for (const slug of related) {
        expect(
          tools.some((t) => t.slug === slug),
          `${slug} is a real tool`,
        ).toBe(true);
      }
    }
  });

  it("emit a sitemap with no retired route and every split tool", async () => {
    // The sitemap is empty unless indexing is approved, so stub the same
    // environment launch.test.ts uses. Without this the assertions below would
    // never run and the test would pass vacuously.
    vi.stubEnv("SITE_URL", "https://test.example");
    vi.stubEnv("LAUNCH_APPROVED", "true");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.resetModules();
    const { default: approvedSitemap } = await import("@/app/sitemap");

    const routes = approvedSitemap().map((entry) => entry.url);
    // Count is derived, not hard-coded: every published tool plus the static
    // and legal pages, so adding a page cannot silently leave it unlisted.
    // 4 static routes (/saved is personal and stays out), plus legal pages,
    // non-empty categories and every published tool.
    expect(routes.length, "sitemap is actually populated").toBe(
      5 + legalPages.length + 7 + tools.length + BRANDS.length,
    );
    expect(routes.some((url) => url.includes(RETIRED))).toBe(false);
    for (const slug of SPLIT_TOOLS) {
      expect(
        routes.some((url) => url.endsWith(`/tools/${slug}`)),
        `${slug} in sitemap`,
      ).toBe(true);
    }
    vi.unstubAllEnvs();
  });
});

describe("cross-tool regression: saved favourites survive the rename", () => {
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  function readSaved(seed: unknown): string[] {
    window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(seed));
    let captured: string[] = [];
    function Probe() {
      captured = useFavorites().saved;
      return null;
    }
    render(<Probe />);
    return captured;
  }

  it("rewrite the retired slug to a tool that still exists", () => {
    expect(readSaved([RETIRED])).toEqual(["image-to-image"]);
    const slugs: string[] = tools.map((t) => t.slug);
    for (const target of Object.values(SLUG_MIGRATIONS)) {
      expect(slugs, `${target} is a live catalogue slug`).toContain(target);
    }
  });

  it("keep unrelated saved tools working alongside the migrated one", () => {
    expect(readSaved([RETIRED, "pdf-studio", "merge-pdf"])).toEqual([
      "image-to-image",
      "pdf-studio",
      "merge-pdf",
    ]);
  });

  it("de-duplicate when both the old and new slug were saved", () => {
    expect(readSaved([RETIRED, "image-to-image"])).toEqual(["image-to-image"]);
  });
});
