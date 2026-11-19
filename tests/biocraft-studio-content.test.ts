import { describe, expect, it } from "vitest";
import {
  BIO_LIBRARY,
  BIO_PREFIXES,
  CAPTIONS,
  QUOTES,
  SHAYARI,
  STYLISH_LATIN,
  VIBES,
  generateBios,
  generateShayari,
  generateUsernames,
  stylishVariants,
} from "../lib/fonts/studio-content";

const DEVANAGARI = /[\u0900-\u097F]/;

describe("BioCraft studio content", () => {
  it("ships real Hindi copy for every vibe", () => {
    for (const item of BIO_LIBRARY) {
      expect(DEVANAGARI.test(item.text), item.text).toBe(true);
      expect(VIBES).toContain(item.vibe);
    }
    for (const item of SHAYARI) {
      expect(DEVANAGARI.test(item.lines[0])).toBe(true);
      expect(DEVANAGARI.test(item.lines[1])).toBe(true);
    }
    for (const quote of QUOTES) {
      expect(DEVANAGARI.test(quote.text)).toBe(true);
    }
    for (const caption of CAPTIONS) {
      expect(DEVANAGARI.test(caption.text)).toBe(true);
      expect(caption.tags.every((tag) => tag.startsWith("#"))).toBe(true);
    }
  });

  it("generates bios around the supplied name and honours the emoji toggle", () => {
    const plain = generateBios("Attitude", "सचिन", false);
    expect(plain.length).toBeGreaterThan(0);
    expect(plain.every((bio) => bio.includes("सचिन"))).toBe(true);
    expect(plain.some((bio) => /[\u{1F300}-\u{1FAFF}]/u.test(bio))).toBe(false);

    const decorated = generateBios("Love", "सचिन", true);
    expect(decorated.every((bio) => bio.includes("सचिन"))).toBe(true);
    expect(
      decorated.every((bio) =>
        BIO_PREFIXES.some((prefix) => bio.startsWith(prefix)),
      ),
    ).toBe(true);
    expect(generateBios("Love", "सचिन", true)).toEqual(decorated);

    const fallback = generateBios("Minimal", "   ", false);
    expect(fallback.every((bio) => bio.includes("आपका नाम"))).toBe(true);
  });

  it("generates two-line shayari per mood with fresh pairings", () => {
    for (const mood of VIBES) {
      const lines = generateShayari(mood, 1);
      expect(lines.length).toBeGreaterThan(2);
      for (const line of lines) {
        expect(line.split("\n")).toHaveLength(2);
        expect(DEVANAGARI.test(line)).toBe(true);
      }
    }
    expect(generateShayari("Love", 1)).not.toEqual(generateShayari("Love", 2));
  });

  it("creates valid, unique usernames within Instagram's limits", () => {
    const handles = generateUsernames("Sachin Kumar");
    expect(handles.length).toBeGreaterThan(8);
    expect(new Set(handles).size).toBe(handles.length);
    for (const handle of handles) {
      expect(handle).toMatch(/^[a-z0-9._]{4,30}$/);
      expect(handle.startsWith(".")).toBe(false);
      expect(handle.endsWith(".")).toBe(false);
    }
    expect(generateUsernames("!!!")).toContain("biocraft.hindi");
  });

  it("maps Latin text to Unicode styles without touching Hindi", () => {
    const variants = stylishVariants("Bio 2026 हिंदी");
    expect(variants).toHaveLength(STYLISH_LATIN.length);
    for (const variant of variants) {
      expect(variant.value).toContain("हिंदी");
      expect(variant.value).not.toBe("Bio 2026 हिंदी");
      expect([...variant.value].length).toBe([..."Bio 2026 हिंदी"].length);
    }
  });
});
