import { describe, expect, it } from "vitest";
import {
  categoryMeta,
  filterTools,
  metaBySlug,
  relatedTools,
  toolCategories,
  toolCategoriesOf,
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
  it("finds the PDF splitter by extraction intent and category", () => {
    expect(filterTools("extract separate", "PDF Tools")).toEqual([
      expect.objectContaining({ slug: "split-pdf" }),
    ]);
    expect(filterTools("", "PDF Tools").map((tool) => tool.slug)).toEqual([
      "images-to-pdf",
      "pdf-to-image",
      "pdf-studio",
      "merge-pdf",
      "split-pdf",
      "compress-pdf",
      "pdf-to-word",
    ]);
  });
  it("finds the PDF compressor by size-reduction intent", () => {
    expect(filterTools("shrink target", "PDF Tools")).toEqual([
      expect.objectContaining({ slug: "compress-pdf" }),
    ]);
    expect(filterTools("compress", "Text & Writing")).toHaveLength(0);
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
    // The combined converter is gone; PDF-to-image search belongs to PDF Tools.
    expect(filterTools("pdf to image", "Image Tools")).toEqual([]);
    expect(filterTools("pdf to image", "PDF Tools").map((t) => t.slug)).toEqual(
      expect.arrayContaining(["pdf-to-image"]),
    );
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
    expect(toolsByCategory("PDF Tools")).toHaveLength(7);
    // QR & Barcode holds the generator and, since phase 14, the scanner.
    expect(toolsByCategory("QR & Barcode").map((t) => t.slug)).toEqual([
      "qr-generator",
      "qr-code-scanner",
    ]);
    expect(toolsByCategory("Calculators")).toHaveLength(12);
    expect(toolsByCategory("AI Tools")).toHaveLength(0);
  });
  it("keeps each split tool in exactly one category, with no dual listings", () => {
    // The combined converter used to be listed in both Image Tools and PDF
    // Tools. After the split every tool belongs to exactly one category.
    expect(tools.filter((t) => toolCategoriesOf(t).length > 1)).toEqual([]);

    for (const slug of [
      "image-to-image",
      "images-to-pdf",
      "pdf-to-image",
      "pdf-studio",
    ]) {
      const record = tools.filter((t) => t.slug === slug);
      expect(record, `${slug} present once`).toHaveLength(1);
      expect(
        toolCategoriesOf(record[0]),
        `${slug} single category`,
      ).toHaveLength(1);
    }

    // Widened to string on purpose: the slug is no longer in the catalogue's
    // literal union, so a direct comparison would not type-check.
    const slugs: string[] = tools.map((t) => t.slug);
    expect(slugs).not.toContain("image-converter");
    expect(toolsByCategory("Image Tools").map((t) => t.slug)).toContain(
      "image-to-image",
    );
    for (const slug of ["images-to-pdf", "pdf-to-image", "pdf-studio"]) {
      expect(toolsByCategory("PDF Tools").map((t) => t.slug)).toContain(slug);
    }
  });
  it("suggests related tools from the same category", () => {
    const converter = tools.find((t) => t.slug === "image-to-image")!;
    const related = relatedTools(converter).map((t) => t.slug);
    expect(related).toHaveLength(3);
    expect(related).not.toContain("image-to-image");
    expect(related).toEqual([
      "image-compressor",
      "image-resizer",
      "image-cropper",
    ]);
    for (const slug of related) {
      expect(
        toolsByCategory("Image Tools").some((t) => t.slug === slug),
        `${slug} is an Image Tools neighbour`,
      ).toBe(true);
    }
  });
  it("gives every tool at least one real category", () => {
    for (const tool of tools) {
      const cats = toolCategoriesOf(tool);
      expect(cats.length).toBeGreaterThan(0);
      for (const cat of cats) expect(toolCategories).toContain(cat);
    }
  });
});
