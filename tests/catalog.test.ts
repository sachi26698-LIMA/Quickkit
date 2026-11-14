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
  it("ignores case and surrounding spaces", () => {
    // The formatter wins the name-ranked search, with the distinct validator next.
    expect(filterTools("  jSoN ", "All tools")[0].slug).toBe("json-formatter");
    expect(
      tools.filter((tool) => /json/iu.test(tool.name)).map((tool) => tool.slug),
    ).toEqual(["json-formatter", "json-validator"]);
  });
  it("searches keywords", () =>
    expect(filterTools("crypto", "All tools")[0].slug).toBe(
      "password-generator",
    ));
  it("combines category and query", () =>
    expect(filterTools("json-formatter", "Text & Writing")).toHaveLength(0));
  it("filters text tools", () =>
    expect(filterTools("", "Text & Writing")).toHaveLength(3));
  it("finds the PDF merger by intent and category", () => {
    expect(filterTools("join pages", "PDF Tools")).toEqual([
      expect.objectContaining({ slug: "merge-pdf" }),
    ]);
    expect(filterTools("join", "Text & Writing")).toHaveLength(0);
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
      "word-to-pdf",
      "pdf-to-word",
      "pdf-lock-unlock",
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
  it("finds the OCR tool by intent in Text & Writing", () => {
    expect(filterTools("ocr", "Text & Writing").map((t) => t.slug)).toEqual([
      "image-to-text",
    ]);
    expect(
      filterTools("text from image", "All tools").map((t) => t.slug),
    ).toContain("image-to-text");
    expect(
      filterTools("handwritten", "All tools").map((t) => t.slug),
    ).toContain("image-to-text");
    // It is filed in Text & Writing only — never dual-listed as an image tool.
    expect(toolsByCategory("Text & Writing").map((t) => t.slug)).toContain(
      "image-to-text",
    );
    expect(toolsByCategory("Image Tools").map((t) => t.slug)).not.toContain(
      "image-to-text",
    );
  });
  it("groups tools by category, with future categories empty", () => {
    expect(toolsByCategory("Text & Writing")).toHaveLength(3);
    expect(toolsByCategory("Image Tools")).toHaveLength(4);
    expect(toolsByCategory("PDF Tools")).toHaveLength(9);
    // QR & Barcode holds the QR generator and scanner, the barcode studio,
    // the stand-alone barcode scanner, the batch code checker and the four
    // phase-19 workspaces (GS1 intelligence, product lookup, batch studio and
    // developer tools).
    expect(toolsByCategory("QR & Barcode").map((t) => t.slug)).toEqual([
      "qr-generator",
      "qr-code-scanner",
      "barcode-generator",
      "batch-code-checker",
      "barcode-scanner",
      "gs1-intelligence",
      "product-lookup",
      "batch-studio",
      "barcode-developer",
    ]);
    expect(toolsByCategory("Calculators")).toHaveLength(12);
    expect(toolsByCategory("AI Tools")).toHaveLength(0);
  });
  it("publishes eleven unique Developer Tools with searchable routes", () => {
    const developerTools = toolsByCategory("Developer Tools");
    expect(developerTools).toHaveLength(11);
    expect(developerTools.map((tool) => tool.slug)).toEqual([
      "json-formatter",
      "json-validator",
      "html-formatter",
      "css-minifier",
      "javascript-minifier",
      "base64-encoder-decoder",
      "url-encoder-decoder",
      "uuid-generator",
      "regex-tester",
      "hash-generator",
      "xml-formatter",
    ]);
    for (const query of [
      "json validator",
      "CSS",
      "Base64",
      "regex",
      "SHA-512",
      "XML formatter",
    ]) {
      expect(
        filterTools(query, "Developer Tools").length,
        query,
      ).toBeGreaterThan(0);
    }
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
  it("suggests 3–6 workflow-relevant related tools without unrelated filler", () => {
    const converter = tools.find((t) => t.slug === "image-to-image")!;
    const related = relatedTools(converter).map((t) => t.slug);
    expect(related.length).toBeGreaterThanOrEqual(3);
    expect(related.length).toBeLessThanOrEqual(6);
    expect(related).not.toContain("image-to-image");
    expect(related.slice(0, 3)).toEqual([
      "image-compressor",
      "image-resizer",
      "image-cropper",
    ]);

    // Explicit workflow-domain sets: every related-tool edge must stay within
    // the source tool's category or a genuine cross-category workflow domain.
    const domainAllowlist: Record<string, readonly string[]> = {
      "PDF Tools": [
        "PDF Tools",
        "Image Tools",
        "Text & Writing",
        "Security & Privacy",
      ],
      "Image Tools": ["Image Tools", "PDF Tools", "Text & Writing"],
      "Text & Writing": [
        "Text & Writing",
        "PDF Tools",
        "Image Tools",
        "Developer Tools",
      ],
      "QR & Barcode": [
        "QR & Barcode",
        "Developer Tools",
        "Security & Privacy",
        "Image Tools",
        "PDF Tools",
      ],
      "Security & Privacy": [
        "Security & Privacy",
        "Developer Tools",
        "PDF Tools",
        "QR & Barcode",
      ],
      "Developer Tools": [
        "Developer Tools",
        "Security & Privacy",
        "QR & Barcode",
        "Text & Writing",
      ],
      Calculators: ["Calculators"],
    };

    const inbound = new Map<string, number>(tools.map((t) => [t.slug, 0]));
    for (const tool of tools) {
      const list = relatedTools(tool);
      expect(
        list.length,
        `${tool.slug} has at least 3 relevant tools`,
      ).toBeGreaterThanOrEqual(3);
      expect(
        list.length,
        `${tool.slug} has at most 6 relevant tools`,
      ).toBeLessThanOrEqual(6);
      const slugs = list.map((item) => item.slug);
      expect(new Set(slugs).size, `${tool.slug} unique related`).toBe(
        list.length,
      );
      expect(slugs).not.toContain(tool.slug);

      const allowedCats = domainAllowlist[tool.category] ?? [tool.category];
      for (const item of list) {
        expect(
          allowedCats,
          `${tool.slug} (${tool.category}) -> ${item.slug} (${item.category})`,
        ).toContain(item.category);
        inbound.set(item.slug, (inbound.get(item.slug) ?? 0) + 1);
      }
    }

    // Every tool remains reachable via at least one genuine inbound related
    // link (without forcing unrelated tools to link to single-tool sub-clusters
    // such as bmi-calculator just to satisfy an artificial threshold).
    for (const tool of tools) {
      expect(
        inbound.get(tool.slug) ?? 0,
        `${tool.slug} inbound related-tool links`,
      ).toBeGreaterThanOrEqual(1);
    }

    // Regression checks for all 8 narrow-cluster tools audited in Phase 2:
    // never pad with unrelated cross-sub-cluster tools.
    const bySlug = (slug: string) =>
      relatedTools(tools.find((t) => t.slug === slug)!).map((t) => t.slug);

    expect(bySlug("temperature-converter")).toEqual([
      "unit-converter",
      "time-converter",
      "scientific-calculator",
    ]);
    expect(bySlug("unit-converter")).not.toContain("bmi-calculator");
    expect(bySlug("unit-converter")).not.toContain("discount-calculator");
    expect(bySlug("bmi-calculator")).toEqual([
      "age-calculator",
      "unit-converter",
      "percentage-calculator",
    ]);
    expect(bySlug("percentage-calculator")).not.toContain("bmi-calculator");
    expect(bySlug("scientific-calculator")).not.toContain("bmi-calculator");
    expect(bySlug("scientific-calculator")).not.toContain("emi-calculator");
    expect(bySlug("word-counter")).not.toContain("html-formatter");
    expect(bySlug("case-converter")).not.toContain("json-formatter");
    expect(bySlug("uuid-generator")).not.toContain("javascript-minifier");
  });
  it("gives every tool at least one real category", () => {
    for (const tool of tools) {
      const cats = toolCategoriesOf(tool);
      expect(cats.length).toBeGreaterThan(0);
      for (const cat of cats) expect(toolCategories).toContain(cat);
    }
  });
});
