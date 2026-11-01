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
  contrastRatio,
  defaultQrOptions,
  qrByteLength,
  validateQrOptions,
} from "../lib/tools/qr";
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
    expect(qrByteLength("abc")).toBe(3);
    expect(qrByteLength("😀")).toBe(4);
    expect(qrByteLength("")).toBe(0);
  });
  it("computes WCAG contrast", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0);
    expect(contrastRatio("#ffffff", "#ffffff")).toBeCloseTo(1, 5);
    expect(contrastRatio("not-a-color", "#fff")).toBe(0);
  });
  it("accepts defaults, rejects low contrast and invalid color", () => {
    expect(() => validateQrOptions(defaultQrOptions)).not.toThrow();
    expect(() =>
      validateQrOptions({ ...defaultQrOptions, foreground: "#eeeeee" }),
    ).toThrow("contrast");
    expect(() =>
      validateQrOptions({ ...defaultQrOptions, foreground: "purple" }),
    ).toThrow();
    expect(() => validateQrOptions({ ...defaultQrOptions, size: 999 })).toThrow(
      "size",
    );
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
