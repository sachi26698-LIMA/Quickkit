import { describe, expect, it } from "vitest";
import { filterTools, tools } from "../lib/catalog";
describe("catalog discovery", () => {
  it("shows every tool for an empty query", () =>
    expect(filterTools("", "All tools")).toHaveLength(6));
  it("ignores case and surrounding spaces", () =>
    expect(filterTools("  jSoN ", "All tools")[0].slug).toBe("json-formatter"));
  it("searches keywords", () =>
    expect(filterTools("crypto", "All tools")[0].slug).toBe(
      "password-generator",
    ));
  it("combines category and query", () =>
    expect(filterTools("json", "Text")).toHaveLength(0));
  it("filters text tools", () =>
    expect(filterTools("", "Text")).toHaveLength(2));
  it("handles unknown and long queries", () => {
    expect(filterTools("not here", "All tools")).toHaveLength(0);
    expect(filterTools("x".repeat(100000), "All tools")).toHaveLength(0);
  });
  it("uses unique stable slugs", () =>
    expect(new Set(tools.map((t) => t.slug)).size).toBe(tools.length));
});

describe("catalog metadata", () => {
  it("exposes a long-form summary and a real category for every tool", () => {
    for (const tool of tools) {
      expect(tool.summary.length).toBeGreaterThan(40);
      expect(tool.description.length).toBeGreaterThan(20);
      expect(["Text", "Developer", "Security", "Image & QR"]).toContain(
        tool.category,
      );
    }
  });
  it("resolves tools by slug and reports unknown slugs", async () => {
    const { getTool } = await import("../lib/catalog");
    expect(getTool("json-formatter")?.name).toBe("JSON Formatter");
    expect(getTool("pdf-merge")).toBeUndefined();
  });
  it("counts tools per category for the directory", async () => {
    const { categoryCount, toolCategories, toolsInCategory } =
      await import("../lib/catalog");
    expect(toolCategories).toHaveLength(4);
    expect(categoryCount("All tools")).toBe(tools.length);
    expect(
      toolCategories.reduce(
        (total, category) => total + categoryCount(category),
        0,
      ),
    ).toBe(tools.length);
    expect(toolsInCategory("Image & QR").map((tool) => tool.slug)).toEqual([
      "qr-generator",
      "image-compressor",
    ]);
  });
});
