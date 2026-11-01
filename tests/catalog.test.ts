import { describe, expect, it } from "vitest";
import { filterTools, tools } from "../lib/catalog";
describe("catalog discovery", () => {
  it("shows every tool for an empty query", () =>
    expect(filterTools("", "All tools")).toHaveLength(8));
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
  it("finds the PDF merger by intent and category", () => {
    expect(filterTools("join pages", "PDF Tools")).toEqual([
      expect.objectContaining({ slug: "merge-pdf" }),
    ]);
    expect(filterTools("pdf", "Text")).toHaveLength(0);
  });
  it("finds the PDF splitter by extraction intent and category", () => {
    expect(filterTools("extract separate", "PDF Tools")).toEqual([
      expect.objectContaining({ slug: "split-pdf" }),
    ]);
    expect(filterTools("", "PDF Tools").map((tool) => tool.slug)).toEqual([
      "merge-pdf",
      "split-pdf",
    ]);
  });
  it("handles unknown and long queries", () => {
    expect(filterTools("not here", "All tools")).toHaveLength(0);
    expect(filterTools("x".repeat(100000), "All tools")).toHaveLength(0);
  });
  it("uses unique stable slugs", () =>
    expect(new Set(tools.map((t) => t.slug)).size).toBe(tools.length));
});
