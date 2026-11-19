import { describe, expect, it } from "vitest";
import {
  FontCursorError,
  catalogue,
  clampWeight,
  decodeCursor,
  detectDuplicates,
  encodeCursor,
  fontFacets,
  fontFileForWeight,
  getFont,
  listFonts,
  readLicenses,
} from "../lib/fonts/catalogue";

describe("BioCraft font index", () => {
  it("paginates with a cursor and never repeats a family", async () => {
    const first = await listFonts({ limit: 5 });
    expect(first.items).toHaveLength(5);
    expect(first.total).toBe(catalogue.fonts.length);
    expect(first.nextCursor).toBeTruthy();

    const seen = new Set(first.items.map((font) => font.slug));
    let cursor = first.nextCursor;
    let pages = 1;
    while (cursor && pages < 40) {
      const page = await listFonts({ limit: 7, cursor });
      expect(page.items.length).toBeGreaterThan(0);
      for (const font of page.items) {
        expect(seen.has(font.slug), `duplicate ${font.slug}`).toBe(false);
        seen.add(font.slug);
      }
      cursor = page.nextCursor;
      pages += 1;
    }
    expect(seen.size).toBe(catalogue.fonts.length);
  });

  it("rejects a cursor issued for a different query", async () => {
    const page = await listFonts({ limit: 3, q: "" });
    expect(page.nextCursor).toBeTruthy();
    await expect(
      listFonts({ limit: 3, q: "serif", cursor: page.nextCursor }),
    ).rejects.toBeInstanceOf(FontCursorError);
    expect(decodeCursor("not-a-cursor", "x")).toEqual({ error: "invalid" });
    const key = "abc";
    expect(decodeCursor(encodeCursor(9, key), key)).toEqual({ offset: 9 });
    expect(decodeCursor(encodeCursor(9, key), "other")).toEqual({
      error: "stale",
    });
  });

  it("searches in Hindi and English and filters by category and tag", async () => {
    const poster = await listFonts({ q: "पोस्टर", limit: 48 });
    expect(poster.total).toBeGreaterThan(5);
    expect(
      poster.items.every((font) => font.styleTags.includes("Poster")),
    ).toBe(true);

    const book = await listFonts({ q: "किताब", limit: 48 });
    expect(book.items.some((font) => font.styleTags.includes("Book"))).toBe(
      true,
    );

    const handwriting = await listFonts({ category: "Handwriting", limit: 48 });
    expect(handwriting.items.length).toBeGreaterThan(0);
    expect(
      handwriting.items.every((font) => font.category === "Handwriting"),
    ).toBe(true);

    const variable = await listFonts({ tag: "Variable", limit: 48 });
    expect(variable.total).toBe(catalogue.stats.variableFamilies);
    expect(variable.items.every((font) => Boolean(font.variable))).toBe(true);

    const none = await listFonts({ q: "definitely-not-a-font-name" });
    expect(none.total).toBe(0);
    expect(none.items).toEqual([]);
    expect(none.nextCursor).toBeNull();
  });

  it("sorts by name, recency and weight deterministically", async () => {
    const name = await listFonts({ sort: "name", limit: 48 });
    const sorted = [...name.items].sort((a, b) =>
      a.family.localeCompare(b.family),
    );
    expect(name.items.map((font) => font.slug)).toEqual(
      sorted.map((font) => font.slug),
    );

    const recent = await listFonts({ sort: "recent", limit: 10 });
    expect(
      recent.items.every((font) => /^\d{4}-\d{2}-\d{2}/.test(font.updatedAt)),
    ).toBe(true);

    const weight = await listFonts({ sort: "weight", limit: 10 });
    const ranges = weight.items.map((font) => font.weightRange[0]);
    expect(ranges).toEqual([...ranges].sort((a, b) => a - b));
  });

  it("returns facets that add up to the visible library", async () => {
    const facets = await fontFacets();
    expect(facets.total).toBe(catalogue.fonts.length);
    const categorySum = facets.categories.reduce(
      (total, facet) => total + facet.count,
      0,
    );
    expect(categorySum).toBe(facets.total);
    expect(facets.tags.some((facet) => facet.name === "Handwriting")).toBe(
      true,
    );
  });

  it("loads a family and its licence metadata by slug", async () => {
    const font = await getFont("tiro-devanagari-hindi");
    expect(font?.family).toBe("Tiro Devanagari Hindi");
    expect(font?.license.type).toBe("OFL-1.1");
    expect(await getFont("does-not-exist")).toBeNull();
    const { licenses } = readLicenses();
    expect(
      licenses.find((entry) => entry.slug === "tiro-devanagari-hindi")?.source,
    ).toMatch(/google\/fonts/);
  });

  it("picks the nearest static weight and clamps variable ranges", () => {
    const hind = catalogue.fonts.find((font) => font.slug === "hind")!;
    expect(fontFileForWeight(hind, 400).devanagari.weight).toBe(400);
    expect(fontFileForWeight(hind, 460).devanagari.weight).toBe(500);
    expect(fontFileForWeight(hind, 900).devanagari.weight).toBe(700);
    expect(clampWeight(hind, 950)).toBe(700);
    expect(clampWeight(hind, 20)).toBe(300);

    const akshar = catalogue.fonts.find((font) => font.slug === "akshar")!;
    expect(fontFileForWeight(akshar, 650).devanagari.weight).toBeNull();
  });

  it("finds no duplicate families or identical font binaries", () => {
    expect(detectDuplicates()).toEqual([]);
  });
});
