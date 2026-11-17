import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { categoryMeta, toolCategoriesOf, tools } from "../lib/catalog";
import {
  localToolCount,
  nonLocalToolCount,
  nonLocalToolSlugs,
  publishedCategoryCount,
  toolCountByCategory,
  totalTools,
} from "../lib/catalog-counts";

/**
 * The catalogue numbers are the one thing a public page, the sitemap and the
 * Admin Control Center must never disagree about. This suite pins them to the
 * shipped catalogue so a literal can't creep back into copy.
 */
describe("single authoritative catalogue counts", () => {
  it("counts each catalogue tool exactly once", () => {
    expect(totalTools).toBe(tools.length);
    expect(new Set(tools.map((tool) => tool.slug)).size).toBe(totalTools);
  });

  it("counts a tool in every category it is published under", () => {
    const expected = Object.fromEntries(
      categoryMeta.map((meta) => [
        meta.name,
        tools.filter((tool) => toolCategoriesOf(tool).includes(meta.name))
          .length,
      ]),
    );
    expect({ ...toolCountByCategory }).toEqual(expected);
    // Multi-category tools make the per-category sum exceed the tool total.
    const sum = Object.values(toolCountByCategory).reduce((a, b) => a + b, 0);
    expect(sum).toBeGreaterThanOrEqual(totalTools);
  });

  it("matches the categories the public site actually ships", () => {
    // AI Tools is a roadmap entry with no routes; it must never inflate a count.
    expect(publishedCategoryCount).toBe(7);
    expect(toolCountByCategory["AI Tools"]).toBe(0);
    for (const meta of categoryMeta) {
      if (meta.name === "AI Tools") continue;
      expect(toolCountByCategory[meta.name]).toBeGreaterThan(0);
    }
  });

  it("keeps Security & Privacy honest about its nine tools", () => {
    // The defect report said the public page showed 1 while Admin said 9.
    expect(toolCountByCategory["Security & Privacy"]).toBe(9);
    expect(toolCountByCategory["QR & Barcode"]).toBe(9);
  });

  it("derives local vs non-local from documented per-tool metadata", () => {
    expect(nonLocalToolCount).toBe(nonLocalToolSlugs.length);
    expect(localToolCount + nonLocalToolCount).toBe(totalTools);
    // Only tools that genuinely talk to a server or a third party are exempt.
    expect([...nonLocalToolSlugs].sort()).toEqual(
      [
        "barcode-scanner",
        "dns-email-security",
        "product-lookup",
        "url-network-privacy",
        "word-to-pdf",
      ].sort(),
    );
  });

  it("documents every non-local tool and leaves no tool unaccounted for", () => {
    for (const slug of nonLocalToolSlugs) {
      expect(
        tools.some((tool) => tool.slug === slug),
        `${slug} is documented as non-local but is not in the catalogue`,
      ).toBe(true);
    }
  });

  it("never re-introduces a hand-typed total in public copy", () => {
    // Guards the original defect: /tools said 43, the homepage said 49.
    const files = [
      "app/(public)/page.tsx",
      "app/(public)/tools/page.tsx",
      "app/(public)/about/page.tsx",
      "app/(public)/privacy/page.tsx",
      "app/(public)/file-handling/page.tsx",
    ];
    const pattern =
      /\b(4[0-9]|5[0-9]|6[0-9])\s+(?:free\s+|online\s+|browser\s+|published\s+)?tools\b/iu;
    for (const file of files) {
      const source = readFileSync(join(process.cwd(), file), "utf8");
      expect(source, `${file} hard-codes a tool total`).not.toMatch(pattern);
    }
  });
});
