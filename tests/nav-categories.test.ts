import { describe, expect, it } from "vitest";
import { categoryMeta, toolsByCategory } from "../lib/catalog";
import { navCategories } from "../lib/nav-categories";

/**
 * The header keeps its own copy of the category menu so the browser bundle does
 * not need the whole tool catalogue. These assertions are what makes that copy
 * safe: same order, same names, same slugs, same tints, same icons, and an
 * `empty` flag that still matches the catalogue.
 */
describe("header category menu", () => {
  it("mirrors categoryMeta field for field", () => {
    expect(navCategories.map((item) => item.name)).toEqual(
      categoryMeta.map((item) => item.name),
    );
    expect(navCategories.map((item) => item.slug)).toEqual(
      categoryMeta.map((item) => item.slug),
    );
    expect(navCategories.map((item) => item.tint)).toEqual(
      categoryMeta.map((item) => item.tint),
    );
    expect(navCategories.map((item) => item.icon)).toEqual(
      categoryMeta.map((item) => item.icon),
    );
  });

  it("marks a category empty exactly when it has no published tool", () => {
    for (const item of navCategories) {
      expect(item.empty, item.name).toBe(
        toolsByCategory(item.name).length === 0,
      );
    }
  });
});
