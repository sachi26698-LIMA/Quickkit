import { describe, it, expect } from "vitest";
import { analyzeText, convertCase } from "../lib/tools/text";
import { inspectJson, locateJsonError, processJson } from "../lib/tools/json";
import {
  defaultPasswordOptions,
  passwordEntropy,
  passwordPoolSize,
  passwordStrength,
} from "../lib/tools/password";
import {
  MIN_CONTRAST,
  contrastRatio,
  effectiveContrast,
} from "../lib/tools/qr/colour";
import { clampDesign, defaultDesign } from "../lib/tools/qr/style";
import { analyzeScannability, safeFixDesign } from "../lib/tools/qr/safety";
import { utf8Length } from "../lib/tools/qr/capacity";
import {
  LOGO_SCALE_MAX,
  QR_SIZE_MAX,
  QR_SIZE_MIN,
} from "../lib/tools/qr/types";
import { fitWithin } from "../lib/tools/image";
import { formatBytes, formatDuration } from "../lib/tools/download";

describe("premium word insights", () => {
  it("computes speaking time, lines, unique words and averages", () => {
    const a = analyzeText("Cats chase mice. Cats nap.\nDogs chase cats!");
    expect(a.lines).toBe(2);
    expect(a.speakingSeconds).toBeGreaterThan(0);
    expect(a.uniqueWords).toBe(5); // cats chase mice nap dogs
    expect(a.longestWord).toBe("chase");
    expect(a.averageWordLength).toBeGreaterThan(3);
  });
  it("ranks frequent words, ignoring stop words", () => {
    const a = analyzeText("the quick quick brown fox and the quick dog");
    expect(a.topWords[0]).toMatchObject({ word: "quick", count: 3 });
    expect(a.topWords.some((w) => w.word === "the")).toBe(false);
    expect(a.topWords[0].percent).toBeCloseTo(33.3, 0);
  });
  it("handles empty text", () => {
    const a = analyzeText("");
    expect(a.topWords).toEqual([]);
    expect(a.longestWord).toBe("");
    expect(a.lines).toBe(0);
  });
});

describe("extended case modes", () => {
  it("builds developer identifiers", () => {
    expect(convertCase("hello brave world", "camelCase")).toBe(
      "helloBraveWorld",
    );
    expect(convertCase("hello brave world", "PascalCase")).toBe(
      "HelloBraveWorld",
    );
    expect(convertCase("HelloBraveWorld", "snake_case")).toBe(
      "hello_brave_world",
    );
    expect(convertCase("hello_brave world", "kebab-case")).toBe(
      "hello-brave-world",
    );
  });
  it("converts developer styles per line", () =>
    expect(convertCase("first line\nsecond line", "snake_case")).toBe(
      "first_line\nsecond_line",
    ));
  it("supports playful modes", () => {
    expect(convertCase("abcd", "aLtErNaTiNg")).toBe("aBcD");
    expect(convertCase("AbC d", "InVeRtEd")).toBe("aBc D");
  });
  it("handles empty input for every new mode", () => {
    for (const mode of [
      "camelCase",
      "PascalCase",
      "snake_case",
      "kebab-case",
      "aLtErNaTiNg",
      "InVeRtEd",
    ] as const)
      expect(convertCase("", mode)).toBe("");
  });
});

describe("premium JSON features", () => {
  it("honors indent choices", () => {
    expect(processJson('{"a":1}', "format", { indent: 4 })).toBe(
      '{\n    "a": 1\n}',
    );
    expect(processJson('{"a":1}', "format", { indent: "\t" })).toBe(
      '{\n\t"a": 1\n}',
    );
    expect(processJson('{"a":1}', "format")).toBe('{\n  "a": 1\n}');
  });
  it("sorts keys deeply on request", () =>
    expect(
      processJson('{"b":{"d":1,"c":2},"a":3}', "minify", { sortKeys: true }),
    ).toBe('{"a":3,"b":{"c":2,"d":1}}'));
  it("keeps key order by default", () =>
    expect(processJson('{"b":1,"a":2}', "minify")).toBe('{"b":1,"a":2}'));
  it("locates syntax errors with line and column", () => {
    const spot = locateJsonError('{\n  "a": 1,\n}');
    expect(spot).not.toBeNull();
    if (spot) {
      expect(spot.line).toBeGreaterThanOrEqual(2);
      expect(spot.column).toBeGreaterThanOrEqual(1);
      expect(spot.excerpt).toContain("^");
    }
    expect(locateJsonError('{"a":1}')).toBeNull();
  });
  it("inspects structure", () => {
    const info = inspectJson('{"a":{"b":[1,2]},"c":true}');
    expect(info.rootType).toBe("object");
    expect(info.keyCount).toBe(3);
    expect(info.maxDepth).toBeGreaterThanOrEqual(3);
    expect(info.inputBytes).toBeGreaterThan(10);
  });
});

describe("password strength", () => {
  it("computes pool size and entropy", () => {
    expect(passwordPoolSize(defaultPasswordOptions)).toBe(26 + 26 + 10 + 23);
    const bits = passwordEntropy(defaultPasswordOptions); // 20 chars, pool 85
    expect(bits).toBe(Math.round(20 * Math.log2(85)));
    expect(passwordStrength(bits).level).toBeGreaterThanOrEqual(3);
  });
  it("shrinks the pool when ambiguous characters are excluded", () => {
    const withAmb = passwordPoolSize(defaultPasswordOptions);
    const without = passwordPoolSize({
      ...defaultPasswordOptions,
      excludeAmbiguous: true,
    });
    expect(without).toBeLessThan(withAmb);
  });
  it("returns zero entropy with no sets selected", () => {
    const none = {
      ...defaultPasswordOptions,
      uppercase: false,
      lowercase: false,
      numbers: false,
      symbols: false,
    };
    expect(passwordEntropy(none)).toBe(0);
    expect(passwordStrength(0).level).toBe(0);
  });
  it("scales labels from fair to excellent", () => {
    expect(passwordStrength(30).level).toBe(1);
    expect(passwordStrength(60).level).toBe(2);
    expect(passwordStrength(90).level).toBe(3);
    expect(passwordStrength(140).level).toBe(4);
  });
});

describe("premium QR guards", () => {
  it("measures UTF-8 bytes", () => {
    expect(utf8Length("abc")).toBe(3);
    expect(utf8Length("😀")).toBe(4);
    expect(utf8Length("")).toBe(0);
  });
  it("computes WCAG contrast", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0);
    expect(contrastRatio("#ffffff", "#ffffff")).toBeCloseTo(1, 5);
    expect(contrastRatio("not-a-color", "#fff")).toBe(0);
  });
  it("keeps a valid design untouched and reports no adjustments", () => {
    const { design, adjustments } = clampDesign(defaultDesign());
    expect(adjustments).toEqual([]);
    expect(design).toEqual(defaultDesign());
  });
  it("clamps out-of-range size, margin and logo values", () => {
    const base = defaultDesign();
    const { design, adjustments } = clampDesign({
      ...base,
      size: 99999,
      margin: -3,
      dotScale: 2,
      cornerRadius: 9,
      logo: { ...base.logo, scale: 4, offsetX: 9 },
    });
    expect(design.size).toBe(QR_SIZE_MAX);
    expect(design.margin).toBe(0);
    expect(design.dotScale).toBeLessThanOrEqual(1);
    expect(design.cornerRadius).toBeLessThanOrEqual(0.5);
    expect(design.logo.scale).toBe(LOGO_SCALE_MAX);
    expect(Math.abs(design.logo.offsetX)).toBeLessThanOrEqual(0.34);
    const fields = adjustments.map((entry) => entry.field);
    for (const field of [
      "size",
      "margin",
      "dotScale",
      "cornerRadius",
      "logo.scale",
    ])
      expect(fields).toContain(field);
    expect(clampDesign({ ...base, size: 1 }).design.size).toBe(QR_SIZE_MIN);
  });
  it("treats an unknown style or colour as invalid input, not a crash", () => {
    const base = defaultDesign();
    const { design } = clampDesign({
      ...base,
      dotStyle: "sparkles" as never,
      eyeStyle: "star" as never,
      errorLevel: "Z" as never,
      fg: { kind: "solid", base: "purple", accent: "purple", angle: 0 },
    });
    expect(design.dotStyle).toBe(base.dotStyle);
    expect(design.eyeStyle).toBe(base.eyeStyle);
    expect(design.errorLevel).toBe(base.errorLevel);
    expect(design.fg.base).toMatch(/^#[0-9a-f]{6}$/i);
  });
  it("flags invisible styling and fixes it, and forces EC for a logo", () => {
    const base = defaultDesign();
    const washed = {
      ...base,
      fg: {
        kind: "solid" as const,
        base: "#eeeeee",
        accent: "#eeeeee",
        angle: 0,
      },
    };
    expect(effectiveContrast(washed.fg, washed.bg)).toBeLessThan(1.4);
    const report = analyzeScannability(washed, null, { hasLogo: false });
    expect(report.level).toBe("blocked");
    expect(
      report.findings.some((entry) => entry.field === "fg" && entry.fix),
    ).toBe(true);
    expect(
      effectiveContrast(
        safeFixDesign(washed, report).fg,
        safeFixDesign(washed, report).bg,
      ),
    ).toBeGreaterThanOrEqual(MIN_CONTRAST);
    const logoAtLevelL = clampDesign(
      { ...base, errorLevel: "L" },
      { hasLogo: true },
    );
    expect(logoAtLevelL.design.errorLevel).toBe("Q");
    const bigLogo = clampDesign(
      { ...base, errorLevel: "M", logo: { ...base.logo, scale: 0.25 } },
      { hasLogo: true },
    );
    expect(bigLogo.design.errorLevel).toBe("H");
    expect(
      bigLogo.adjustments.some((entry) => entry.field === "errorLevel"),
    ).toBe(true);
  });
});

describe("image fitWithin", () => {
  it("keeps original size by default", () =>
    expect(fitWithin(1600, 900)).toEqual({
      width: 1600,
      height: 900,
      resized: false,
    }));
  it("scales proportionally under a cap", () =>
    expect(fitWithin(1600, 900, 800)).toEqual({
      width: 800,
      height: 450,
      resized: true,
    }));
  it("never upscales", () =>
    expect(fitWithin(320, 200, 800).resized).toBe(false));
  it("handles portrait images", () =>
    expect(fitWithin(900, 1600, 800)).toEqual({
      width: 450,
      height: 800,
      resized: true,
    }));
});

describe("shared formatting helpers", () => {
  it("formats durations", () => {
    expect(formatDuration(45)).toBe("45s");
    expect(formatDuration(80)).toBe("1m 20s");
    expect(formatDuration(3600)).toBe("1h");
    expect(formatDuration(7380)).toBe("2h 3m");
  });
  it("formats bytes consistently with the image tool", () => {
    expect(formatBytes(100)).toBe("100 B");
    expect(formatBytes(1024)).toBe("1.0 KB");
    expect(formatBytes(1024 * 1024)).toBe("1.00 MB");
  });
});
