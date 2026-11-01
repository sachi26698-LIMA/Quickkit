import { describe, expect, it } from "vitest";
import { filterTools, tools } from "../lib/catalog";
describe("catalog discovery", () => {
  it("shows every tool for an empty query", () =>
    expect(filterTools("", "All tools")).toHaveLength(7));
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
  it("lists the Image Resizer in the new Image Tools category", () => {
    const resizer = filterTools("instagram", "Image Tools");
    expect(resizer).toHaveLength(1);
    expect(resizer[0].slug).toBe("image-resizer");
    expect(resizer[0].name).toBe("Image Resizer");
  });
  it("finds social preset keywords", () =>
    expect(filterTools("thumbnail", "All tools")[0].slug).toBe(
      "image-resizer",
    ));
  it("handles unknown and long queries", () => {
    expect(filterTools("not here", "All tools")).toHaveLength(0);
    expect(filterTools("x".repeat(100000), "All tools")).toHaveLength(0);
  });
  it("uses unique stable slugs", () =>
    expect(new Set(tools.map((t) => t.slug)).size).toBe(tools.length));
});
