/**
 * Code 93: encoder correctness, extended-ASCII handling and an independent read.
 *
 * The pattern table comes from the published symbology and was cross-checked
 * against ZXing's Apache-2.0 reference implementation. These tests do not trust
 * our own reader: every symbol is rasterised through the same layout the browser
 * renders and then decoded by zxing-wasm (C++ ZXing), a separate implementation.
 */
import { describe, expect, it } from "vitest";
import {
  CODE93_ALPHABET,
  CODE93_ENCODINGS,
  code93Binary,
  code93Checksum,
  code93Extend,
} from "@/lib/tools/barcode/code93";
import { buildBarcode } from "@/lib/tools/barcode/encode";
import { buildLayout } from "@/lib/tools/barcode/layout";
import { rasterizeLayout } from "@/lib/tools/barcode/raster";
import { asImage, readImage } from "./helpers/zxing-reader";

function specFor(data: string) {
  const result = buildBarcode("code93", data, {});
  if (!result.ok)
    throw new Error(
      `Code 93 rejected "${data}": ${JSON.stringify(result.problems)}`,
    );
  return result.spec;
}

async function decode(data: string) {
  const spec = specFor(data);
  const layout = buildLayout({ spec, options: { moduleWidth: 3 } });
  const raster = rasterizeLayout(layout, { scale: 2 });
  return readImage(asImage(raster.rgba, raster.width, raster.height), [
    "Code93",
  ]);
}

describe("Code 93 tables", () => {
  it("keeps 48 nine-bit patterns, all distinct and nine modules wide", () => {
    expect(CODE93_ENCODINGS).toHaveLength(48);
    expect(new Set(CODE93_ENCODINGS).size).toBe(48);
    for (const pattern of CODE93_ENCODINGS) {
      expect(pattern.toString(2).length).toBeLessThanOrEqual(9);
      expect(pattern).toBeGreaterThan(0);
      expect(pattern).toBeLessThanOrEqual(0x1ff);
    }
    expect(CODE93_ALPHABET).toHaveLength(48);
    expect(CODE93_ALPHABET.at(-1)).toBe("*");
  });

  it("uses three bars and three spaces in every character", () => {
    for (const pattern of CODE93_ENCODINGS) {
      const bits = pattern.toString(2).padStart(9, "0");
      let runs = 0;
      for (let index = 0; index < bits.length; index += 1)
        if (index === 0 || bits[index] !== bits[index - 1]) runs += 1;
      expect(runs, bits).toBe(6);
      expect(bits.startsWith("1")).toBe(true);
      expect(bits.endsWith("0")).toBe(true);
    }
  });

  it("computes the two mod-47 check characters from the right", () => {
    const extended = code93Extend("CODE93");
    expect(extended).toBe("CODE93");
    const c = code93Checksum(extended, 20);
    const k = code93Checksum(`${extended}${CODE93_ALPHABET[c]}`, 15);
    expect(c).toBeGreaterThanOrEqual(0);
    expect(c).toBeLessThan(47);
    expect(k).toBeGreaterThanOrEqual(0);
    expect(k).toBeLessThan(47);
    // The weights cycle, so the result must differ when the data changes.
    expect(code93Checksum("CODE94", 20)).not.toBe(c);
  });
});

describe("Code 93 layout", () => {
  it("is nine modules per character plus four framing characters and a stop bar", () => {
    const { modules, extended } = code93Binary("ABC123");
    expect(extended).toBe("ABC123");
    expect(modules).toBe((extended.length + 4) * 9 + 1);
  });

  it("starts and ends with the asterisk pattern plus a termination bar", () => {
    const { binary } = code93Binary("A");
    const asterisk = CODE93_ENCODINGS[47].toString(2).padStart(9, "0");
    expect(binary.startsWith(asterisk)).toBe(true);
    expect(binary.endsWith(`${asterisk}1`)).toBe(true);
    expect(binary).toMatch(/^[01]+$/);
  });

  it("maps lowercase and punctuation through the shift characters", () => {
    expect(code93Extend("abc")).toBe("dAdBdC");
    expect(code93Extend(":")).toBe("cZ");
    expect(code93Extend("@")).toBe("bV");
    expect(code93Extend("~")).toBe("bS");
    expect(code93Extend("A1-./ $+%")).toBe("A1-./ $+%");
  });

  it("carries the original text in the human-readable line", () => {
    const spec = specFor("quickkit-93");
    expect(spec.display).toBe("quickkit-93");
    expect(spec.value).toBe("quickkit-93");
    expect(spec.segments[0].text).toBe("quickkit-93");
    expect(spec.notes.join(" ")).toContain("Check characters C and K");
  });
});

describe("Code 93 validation", () => {
  it("rejects empty input", () => {
    const result = buildBarcode("code93", "   ");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.problems[0].code).toBe("empty");
  });

  it("rejects characters outside printable ASCII", () => {
    for (const bad of ["café", "LOT-✓", "a\tb"]) {
      const result = buildBarcode("code93", bad);
      expect(result.ok, bad).toBe(false);
      if (!result.ok) expect(result.problems[0].code).toBe("charset");
    }
  });

  it("rejects data that grows past 80 characters after extension", () => {
    const result = buildBarcode("code93", "a".repeat(41));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.problems[0].code).toBe("length");
  });

  it("accepts exactly 40 lowercase characters (80 extended)", () => {
    expect(buildBarcode("code93", "a".repeat(40)).ok).toBe(true);
  });
});

describe("Code 93 decoded by an independent reader", () => {
  it("round-trips digits and uppercase", async () => {
    expect(await decode("CODE93-2026")).toContain("CODE93-2026");
  });

  it("round-trips lowercase through the shift characters", async () => {
    expect(await decode("quickkit")).toContain("quickkit");
  });

  it("round-trips punctuation and spaces", async () => {
    expect(await decode("A1 $/+%.-")).toContain("A1 $/+%.-");
  });

  it("round-trips a long payload", async () => {
    const value = "SHIP-2026-0042/PALLET-7";
    expect(await decode(value)).toContain(value);
  });
});
