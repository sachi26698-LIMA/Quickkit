import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import catalogue from "../lib/fonts/data/catalogue.json";
import licenses from "../lib/fonts/data/licenses.json";
import verification from "../lib/fonts/data/verification.json";

const ROOT = process.cwd();
const verificationFamilies = verification.families as Record<
  string,
  {
    status: string;
    samples?: Record<string, { ok: boolean }>;
    fullSample?: { notdefCount: number };
    conjuncts?: { text: string; ok: boolean }[];
    nukta?: { text: string; ok: boolean }[];
  }
>;
const fonts = catalogue.fonts;

function sha256(buffer: Buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

describe("BioCraft Hindi catalogue integrity", () => {
  it("publishes only families with a recorded verification pass", () => {
    expect(fonts.length).toBeGreaterThan(50);
    expect(catalogue.stats.verified).toBe(fonts.length);
    expect(catalogue.stats.discovered).toBe(
      catalogue.stats.verified + catalogue.stats.rejected,
    );
    for (const font of fonts) {
      expect(font.verification.status, font.family).toBe("verified");
      expect(
        font.verification.devanagariCoverage,
        font.family,
      ).toBeGreaterThanOrEqual(99);
      expect(font.verification.matrasPassed, font.family).toBe(
        font.verification.matrasTotal,
      );
      expect(font.verification.preBaseMatraReordered, font.family).toBe(true);
      expect(font.verification.conjunctTotal, font.family).toBeGreaterThan(0);
      expect(
        font.verification.conjunctSingleGlyph,
        font.family,
      ).toBeGreaterThanOrEqual(0);
      expect(
        font.verification.conjuncts.every((test) => test.ok),
        font.family,
      ).toBe(true);
      expect(
        font.verification.conjunctSingleGlyph /
          Math.max(1, font.verification.conjunctTotal),
      ).toBeGreaterThanOrEqual(0);
    }
  });

  it("keeps at least one real single-glyph conjunct per family except where the design uses half forms", () => {
    const single = fonts.filter(
      (font) => font.verification.conjunctSingleGlyph > 0,
    ).length;
    expect(single).toBeGreaterThan(fonts.length * 0.9);
  });

  it("withholds the family that genuinely failed the numeral check", () => {
    const rejected = catalogue.rejected.find(
      (item) => item.slug === "bakbak-one",
    );
    expect(rejected).toBeTruthy();
    expect(rejected?.reason).toMatch(/numerals?/i);
    expect(fonts.some((font) => font.slug === "bakbak-one")).toBe(false);
  });

  it("ships every declared WOFF2 with a matching byte count and SHA-256", () => {
    let checked = 0;
    for (const font of fonts) {
      const files = [...font.files.devanagari, ...font.files.latin];
      expect(files.length, font.family).toBeGreaterThan(0);
      expect(font.files.devanagari.length, font.family).toBeGreaterThan(0);
      expect(font.files.latin.length, font.family).toBeGreaterThan(0);
      for (const file of files) {
        const absolute = path.join(
          ROOT,
          "public",
          file.path.replace(/^\//, ""),
        );
        expect(existsSync(absolute), file.path).toBe(true);
        expect(statSync(absolute).size, file.path).toBe(file.bytes);
        expect(sha256(readFileSync(absolute)), file.path).toBe(file.sha256);
        checked += 1;
      }
      const [min, max] = font.weightRange;
      expect(min).toBeLessThanOrEqual(max);
      expect(font.weights.length).toBeGreaterThan(0);
    }
    expect(checked).toBe(catalogue.stats.files);
  });

  it("keeps primary and Latin files pointing at real subsets", () => {
    for (const font of fonts) {
      expect(font.primaryFile.subset).toBe("devanagari");
      expect(font.latinFile?.subset).toBe("latin");
      if (font.variable) {
        expect(font.variable.wght.min).toBeLessThan(font.variable.wght.max);
        expect(font.files.devanagari.some((file) => file.weight === null)).toBe(
          true,
        );
      } else {
        expect(font.files.devanagari.some((file) => file.weight === 400)).toBe(
          true,
        );
      }
    }
  });

  it("records licence, author, version and source for every family", () => {
    expect(licenses.licenses.length).toBe(fonts.length);
    for (const font of fonts) {
      expect(font.license.type).toMatch(/OFL/);
      expect(font.license.attribution.length).toBeGreaterThan(4);
      expect(font.license.url).toMatch(/^https?:\/\//);
      expect(font.license.downloadAllowed).toBe(true);
      expect(font.license.licenseFile).toBeTruthy();
      expect(font.source.version).toMatch(/^v?\d/);
      expect(font.source.repository).toMatch(/^https:\/\/github\.com\//);
      const licencePath = path.join(
        ROOT,
        "public",
        (font.license.licenseFile ?? "").replace(/^\//, ""),
      );
      expect(existsSync(licencePath), licencePath).toBe(true);
      expect(readFileSync(licencePath, "utf8")).toMatch(
        /SIL OPEN FONT LICENSE/i,
      );
    }
  });

  it("reports shaping evidence from HarfBuzz, not font names", () => {
    expect(verification.verifier.engine).toMatch(/harfbuzz/i);
    expect(verification.verifier.sampleText).toContain("नमस्ते भारत");
    expect(verification.verifier.sampleText).toContain("ज़िंदगी");
    expect(verification.verifier.sampleText).toContain("कर्मण्येवाधिकारस्ते");
    for (const font of fonts) {
      const report = verificationFamilies[font.slug];
      expect(report?.status, font.slug).toBe("verified");
      expect(report?.samples?.sample.ok, font.slug).toBe(true);
      expect(report?.fullSample?.notdefCount, font.slug).toBe(0);
      expect(
        report?.conjuncts?.every((test) => test.ok),
        font.slug,
      ).toBe(true);
      expect(
        report?.nukta?.every((test) => test.ok),
        font.slug,
      ).toBe(true);
    }
  });

  it("does not duplicate a family name or file hash", () => {
    const names = fonts.map((font) => font.family.toLowerCase());
    expect(new Set(names).size).toBe(names.length);
    const hashes = fonts.map((font) => font.filesSha256);
    expect(new Set(hashes).size).toBe(hashes.length);
  });

  it("keeps the catalogue scale-ready and the asset budget honest", () => {
    expect(catalogue.stats.files).toBeGreaterThan(300);
    expect(catalogue.stats.woff2Bytes).toBeLessThan(40 * 1024 * 1024);
    expect(catalogue.categories.length).toBeGreaterThanOrEqual(4);
    expect(catalogue.tags.length).toBeGreaterThan(10);
    expect(catalogue.tags.every((tag) => tag.count > 0)).toBe(true);
  });
});
