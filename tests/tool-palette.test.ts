import { describe, expect, it } from "vitest";
import { tools } from "../lib/catalog";
import { toolPalette } from "../lib/tool-palette";

/**
 * The laptop colour cycle keeps its own copy of each tool's slug, name and
 * category so the homepage does not have to download the whole catalogue for a
 * gradient. That copy has to stay identical — same order, same labels.
 */
describe("laptop finish palette source", () => {
  it("is the catalogue's slug, name and category, in order", () => {
    expect(toolPalette).toEqual(
      tools.map(({ slug, name, category }) => ({ slug, name, category })),
    );
  });

  it("has no duplicate slugs", () => {
    const slugs = toolPalette.map((tool) => tool.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});
