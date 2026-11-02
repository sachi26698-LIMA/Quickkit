import { describe, expect, it } from "vitest";
import {
  categoryMeta,
  filterTools,
  metaBySlug,
  toolCategories,
  tools,
  toolsByCategory,
} from "../lib/catalog";
describe("catalog discovery", () => {
  it("shows every tool for an empty query", () =>
    expect(filterTools("", "All tools")).toHaveLength(tools.length));
  it("ignores case and surrounding spaces", () =>
    expect(filterTools("  jSoN ", "All tools")[0].slug).toBe("json-formatter"));
  it("searches keywords", () =>
    expect(filterTools("crypto", "All tools")[0].slug).toBe(
      "password-generator",
    ));
  it("combines category and query", () =>
    expect(filterTools("json", "Text & Writing")).toHaveLength(0));
  it("filters text tools", () =>
    expect(filterTools("", "Text & Writing")).toHaveLength(2));
  it("finds the PDF merger by intent and category", () => {
    expect(filterTools("join pages", "PDF Tools")).toEqual([
      expect.objectContaining({ slug: "merge-pdf" }),
    ]);
    expect(filterTools("pdf", "Text & Writing")).toHaveLength(0);
  });
  it("handles unknown and long queries", () => {
    expect(filterTools("not here", "All tools")).toHaveLength(0);
    expect(filterTools("x".repeat(100000), "All tools")).toHaveLength(0);
  });
  it("finds the image tools by intent", () => {
    expect(filterTools("circle", "Image Tools")).toEqual([
      expect.objectContaining({ slug: "image-cropper" }),
    ]);
    expect(filterTools("percentage", "Image Tools")).toEqual([
      expect.objectContaining({ slug: "image-resizer" }),
    ]);
    expect(filterTools("kb target", "All tools")[0].slug).toBe(
      "image-compressor",
    );
    expect(filterTools("pdf to image", "Image Tools")).toEqual([
      expect.objectContaining({ slug: "image-converter" }),
    ]);
  });
  it("uses unique stable slugs", () =>
    expect(new Set(tools.map((t) => t.slug)).size).toBe(tools.length));
  it("defines eight categories with unique slugs", () => {
    expect(toolCategories).toHaveLength(8);
    expect(categoryMeta).toHaveLength(8);
    expect(new Set(categoryMeta.map((c) => c.slug)).size).toBe(8);
    for (const name of toolCategories) {
      expect(categoryMeta.find((c) => c.name === name)).toBeDefined();
    }
  });
  it("resolves category metadata by slug", () => {
    expect(metaBySlug("pdf-tools")?.name).toBe("PDF Tools");
    expect(metaBySlug("qr-barcode")?.name).toBe("QR & Barcode");
    expect(metaBySlug("nope")).toBeUndefined();
  });
  it("groups tools by category, with future categories empty", () => {
    expect(toolsByCategory("Text & Writing")).toHaveLength(2);
    expect(toolsByCategory("Image Tools")).toHaveLength(4);
    expect(toolsByCategory("QR & Barcode")).toHaveLength(1);
    expect(toolsByCategory("Calculators")).toHaveLength(12);
    expect(toolsByCategory("AI Tools")).toHaveLength(0);
  });
});
