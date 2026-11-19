import "server-only";

import { createHash } from "node:crypto";
import fontkit from "@cantoo/fontkit";
import type { FontImportIssue, FontInspectionReport } from "./types";

/**
 * Server-side pre-flight inspection for fonts uploaded by an administrator.
 *
 * This is deliberately a *pre-check*: it reads the real cmap, parses GSUB /
 * GPOS, and shapes Hindi text with fontkit. Publication still requires the
 * full HarfBuzz gate (`scripts/fonts/verify_fonts.py`) so the public catalogue
 * never contains a family that only passed a lighter test.
 */

const CONSONANTS = [
  ...Array.from({ length: 0x093a - 0x0915 }, (_, index) => 0x0915 + index),
  ...Array.from({ length: 0x0934 - 0x0931 + 1 }, (_, index) => 0x0931 + index),
].filter((code) => ![0x0929, 0x0931, 0x0934].includes(code));

const VOWELS = [
  0x0905, 0x0906, 0x0907, 0x0908, 0x0909, 0x090a, 0x090b, 0x090c, 0x090f,
  0x0910, 0x0913, 0x0914,
];
const MATRAS = [
  0x093e, 0x093f, 0x0940, 0x0941, 0x0942, 0x0943, 0x0947, 0x0948, 0x0949,
  0x094b, 0x094c, 0x094d,
];
const SIGNS = [0x0901, 0x0902, 0x0903, 0x093c];
const NUMERALS = Array.from({ length: 10 }, (_, index) => 0x0966 + index);
const LATIN = [
  ..."ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
].map((char) => char.codePointAt(0) ?? 0);

const CONJUNCTS = [
  "क्ष",
  "त्र",
  "ज्ञ",
  "श्र",
  "क्र",
  "प्र",
  "स्त्र",
  "द्ध",
  "ण्ड",
];
const MATRA_TESTS = ["कि", "की", "कु", "कू", "के", "कै", "को", "कौ"];
const NUKTA_TESTS = ["क़", "ज़", "ड़", "ढ़", "फ़"];

function percent(present: number, total: number): number {
  return total ? Math.round((present / total) * 1000) / 10 : 0;
}

function slugify(family: string): string {
  return (
    family
      .normalize("NFKD")
      .replace(/[^\x00-\x7F]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 64) || "imported-font"
  );
}

type ParsedFont = {
  familyName?: string;
  subfamilyName?: string;
  version?: string;
  unitsPerEm: number;
  numGlyphs: number;
  characterSet?: number[];
  variationAxes?: Record<string, { min: number; max: number; default: number }>;
  layout: (text: string) => { glyphs: { id: number }[] };
  getName?: (key: string) => string | null;
  license?: string;
  [key: string]: unknown;
};

export function inspectFontBuffer(
  buffer: Buffer,
  fileName: string,
): FontInspectionReport {
  const digest = createHash("sha256").update(buffer).digest("hex");
  const issues: FontImportIssue[] = [];

  let font: ParsedFont;
  try {
    font = fontkit.create(buffer) as unknown as ParsedFont;
    if (!font || typeof font.layout !== "function") {
      throw new Error("Not a single font");
    }
  } catch {
    return {
      family: fileName,
      subfamily: null,
      version: null,
      unitsPerEm: 0,
      glyphCount: 0,
      cmapEntries: 0,
      licenses: null,
      hasGsub: false,
      hasGpos: false,
      variableAxes: {},
      checks: {
        devanagariCoverage: 0,
        conjunctsSingleGlyph: 0,
        conjunctsTested: CONJUNCTS.length,
        matrasRendered: 0,
        nuktaRendered: 0,
        numeralsRendered: 0,
        latinRendered: false,
        mixedRendered: false,
      },
      issues: [
        {
          code: "decode_failed",
          severity: "error",
          message:
            "The file could not be decoded as a font. WOFF2, WOFF, TTF and OTF are supported.",
        },
      ],
      status: "fail",
      sha256: digest,
      bytes: buffer.byteLength,
      suggestedTheme: {
        slug: "imported-font",
        family: fileName,
        category: "Sans Serif",
        tags: [],
      },
    };
  }

  const characterSet: number[] = font.characterSet ?? [];
  const cmap = new Set(characterSet);
  const family = font.familyName || fileName.replace(/\.[^.]+$/, "");
  const subfamily = font.subfamilyName || null;
  const version = font.version || null;

  const required = {
    consonants: CONSONANTS,
    vowels: VOWELS,
    matras: MATRAS,
    signs: SIGNS,
    numerals: NUMERALS,
  };
  let present = 0;
  let total = 0;
  const missing: string[] = [];
  for (const [group, codepoints] of Object.entries(required)) {
    for (const code of codepoints) {
      total += 1;
      if (cmap.has(code)) present += 1;
      else if (missing.length < 12)
        missing.push(`U+${code.toString(16).toUpperCase()} (${group})`);
    }
  }

  if (percent(present, total) < 98) {
    issues.push({
      code: "devanagari_coverage",
      severity: "error",
      message: `Devanagari coverage is ${percent(present, total)}%; missing ${missing.join(", ")}`,
    });
  }

  const layout = (text: string) => {
    try {
      const run = font.layout(text);
      return {
        glyphCount: run.glyphs.length,
        notdef: run.glyphs.filter((glyph) => glyph.id === 0).length,
      };
    } catch {
      return { glyphCount: 0, notdef: 1 };
    }
  };

  let conjunctsSingleGlyph = 0;
  for (const conjunct of CONJUNCTS) {
    const result = layout(conjunct);
    if (result.notdef === 0 && result.glyphCount === 1)
      conjunctsSingleGlyph += 1;
    else if (result.notdef > 0) {
      issues.push({
        code: "conjunct_notdef",
        severity: "error",
        message: `Conjunct ${conjunct} shaped with a .notdef glyph.`,
      });
    }
  }
  if (conjunctsSingleGlyph < 4) {
    issues.push({
      code: "conjunct_quality",
      severity: "warning",
      message: `Only ${conjunctsSingleGlyph} of ${CONJUNCTS.length} conjuncts form a single glyph.`,
    });
  }

  let matrasRendered = 0;
  for (const matra of MATRA_TESTS) {
    if (layout(matra).notdef === 0) matrasRendered += 1;
  }
  if (matrasRendered < MATRA_TESTS.length) {
    issues.push({
      code: "matra_shaping",
      severity: "error",
      message: `${MATRA_TESTS.length - matrasRendered} matra test(s) produced .notdef.`,
    });
  }

  let nuktaRendered = 0;
  for (const nukta of NUKTA_TESTS) {
    if (layout(nukta).notdef === 0) nuktaRendered += 1;
  }
  if (nuktaRendered === 0 && cmap.has(0x093c)) {
    issues.push({
      code: "nukta_shaping",
      severity: "warning",
      message: "Nukta letters did not shape cleanly.",
    });
  }

  const numeralsRendered = NUMERALS.filter((code) => cmap.has(code)).length;
  if (numeralsRendered < 10) {
    issues.push({
      code: "numerals",
      severity: "error",
      message: `Only ${numeralsRendered}/10 Devanagari numerals are present.`,
    });
  }

  const latinPresent = LATIN.filter((code) => cmap.has(code)).length;
  if (latinPresent < 52) {
    issues.push({
      code: "latin",
      severity: "warning",
      message: `Only ${latinPresent} of 62 basic Latin letters/digits are present; mixed Hindi/English lines need a Latin companion subset.`,
    });
  }

  const sample = layout("नमस्ते भारत ज़िंदगी खूबसूरत है।");
  const sampleOk = sample.notdef === 0 && sample.glyphCount > 0;
  if (!sampleOk) {
    issues.push({
      code: "sample_shaping",
      severity: "error",
      message: "The required Hindi sample line did not shape cleanly.",
    });
  }

  if (!font["GSUB"]) {
    issues.push({
      code: "gsub_missing",
      severity: "warning",
      message: "No GSUB table: contextual conjunct shaping will be limited.",
    });
  }
  if (!font["GPOS"]) {
    issues.push({
      code: "gpos_missing",
      severity: "warning",
      message: "No GPOS table: mark positioning may be weak.",
    });
  }

  const variationAxes = font.variationAxes ?? {};

  const hasError = issues.some((issue) => issue.severity === "error");
  const hasWarning = issues.some((issue) => issue.severity === "warning");

  return {
    family,
    subfamily,
    version,
    unitsPerEm: font.unitsPerEm,
    glyphCount: font.numGlyphs,
    cmapEntries: characterSet.length,
    licenses:
      (typeof font.license === "string" ? font.license : null) ??
      (typeof font.getName === "function"
        ? font.getName("licenseDescription")
        : null) ??
      (typeof font.getName === "function" ? font.getName("copyright") : null),
    hasGsub: Boolean(font["GSUB"]),
    hasGpos: Boolean(font["GPOS"]),
    variableAxes: variationAxes,
    checks: {
      devanagariCoverage: percent(present, total),
      conjunctsSingleGlyph,
      conjunctsTested: CONJUNCTS.length,
      matrasRendered,
      nuktaRendered,
      numeralsRendered,
      latinRendered: latinPresent >= 52,
      mixedRendered: sampleOk,
    },
    issues,
    status: hasError ? "fail" : hasWarning ? "warn" : "pass",
    sha256: digest,
    bytes: buffer.byteLength,
    suggestedTheme: {
      slug: slugify(family),
      family,
      category: variationAxes.wght ? "Sans Serif" : "Sans Serif",
      tags: [
        ...(variationAxes.wght ? ["Variable"] : []),
        ...(!hasError ? ["Verified"] : []),
      ],
    },
  };
}
