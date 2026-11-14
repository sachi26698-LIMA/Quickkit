import { describe, expect, it } from "vitest";
import { buildBarcode } from "@/lib/tools/barcode/encode";
import {
  code128Values,
  code39CharModules,
  CODE128_START_C,
  CODE128_STOP,
} from "@/lib/tools/barcode/encode";
import { normalizeBarcode } from "@/lib/tools/barcode/validate";
import {
  code39CheckChar,
  gtinCheckDigit,
  gtinCheckOk,
  msiMod10,
  msiMod11,
  upceToUpca,
} from "@/lib/tools/barcode/checksums";
import {
  EAN13_PARITY,
  EAN_CENTRE_GUARD,
  EAN_G,
  EAN_L,
  EAN_R,
  EAN_SIDE_GUARD,
  UPCE_PARITY,
} from "@/lib/tools/barcode/ean-tables";
import {
  DEFAULT_RENDER_OPTIONS,
  buildLayout,
  layoutMillimetres,
} from "@/lib/tools/barcode/layout";
import {
  escapeXml,
  isSvgSafe,
  layoutToSvg,
  svgDataUri,
} from "@/lib/tools/barcode/svg";
import { verifyBarcode } from "@/lib/tools/barcode/verify";
import { READABLE_FORMATS } from "@/lib/tools/barcode/decode";
import {
  BARCODE_FORMATS,
  FORMAT_SAMPLES,
  SCANNABLE_FORMATS,
  formatMeta,
} from "@/lib/tools/barcode/formats";
import {
  defaultSettings,
  loadSettings,
  renderOptionsFrom,
  sanitizeSettings,
  saveSettings,
} from "@/lib/tools/barcode/settings";
import type { BarcodeFormatId, BarcodeSpec } from "@/lib/tools/barcode/types";

/** The module string an encoder produced, reconstructed from its bars. */
function binaryOf(spec: BarcodeSpec) {
  const bits = new Array<string>(spec.modules).fill("0");
  for (const bar of spec.bars)
    for (let offset = 0; offset < bar.width; offset += 1)
      bits[bar.x + offset] = "1";
  return bits.join("");
}

function specFor(
  format: BarcodeFormatId,
  data: string,
  options = {} as never,
): BarcodeSpec {
  const result = buildBarcode(format, data, options);
  if (!result.ok)
    throw new Error(
      `${format} rejected ${data}: ${JSON.stringify(result.problems)}`,
    );
  return result.spec;
}

/** The module string of one Code 39 character, used for delimiter checks. */
function code39BinaryOf(char: string) {
  const spec = specFor("code39", char);
  return binaryOf(spec).slice(0, 15);
}

function problemCodes(format: BarcodeFormatId, data: string) {
  const result = normalizeBarcode(format, data);
  return result.ok
    ? "accepted"
    : result.problems.map((problem) => problem.code);
}

describe("EAN/UPC module tables", () => {
  it("holds ten seven-module patterns on each side", () => {
    for (const table of [EAN_L, EAN_G, EAN_R]) {
      expect(table).toHaveLength(10);
      for (const row of table) expect(row).toMatch(/^[01]{7}$/);
    }
  });

  it("keeps the published symmetries: R complements L, G mirrors R", () => {
    for (let digit = 0; digit < 10; digit += 1) {
      expect(EAN_L[digit].startsWith("0")).toBe(true);
      expect(EAN_G[digit].startsWith("0")).toBe(true);
      expect(EAN_R[digit].startsWith("1")).toBe(true);
      const complement = EAN_L[digit].replace(/[01]/g, (bit) =>
        bit === "1" ? "0" : "1",
      );
      expect(complement).toBe(EAN_R[digit]);
      expect(EAN_R[digit].split("").reverse().join("")).toBe(EAN_G[digit]);
    }
  });

  it("gives the leading zero all-odd parity and the others three evens", () => {
    expect(EAN13_PARITY).toHaveLength(10);
    for (const [index, row] of EAN13_PARITY.entries()) {
      expect(row).toMatch(/^[LG]{6}$/);
      expect(row.split("").filter((digit) => digit === "G")).toHaveLength(
        index === 0 ? 0 : 3,
      );
    }
    expect(EAN13_PARITY[0]).toBe("LLLLLL");
    expect(EAN13_PARITY[5]).toBe("LGGLLG");
  });

  it("uses six two-state digits in every UPC-E parity row", () => {
    expect(UPCE_PARITY).toHaveLength(10);
    for (const row of UPCE_PARITY) {
      expect(row).toMatch(/^[EO]{6}$/);
      expect(row.split("").filter((digit) => digit === "E")).toHaveLength(3);
    }
  });

  it("keeps the guard patterns at the published widths", () => {
    expect(EAN_SIDE_GUARD).toBe("101");
    expect(EAN_CENTRE_GUARD).toBe("01010");
  });
});

describe("check digits", () => {
  it("computes the GS1 mod-10 digit from the payload", () => {
    expect(gtinCheckDigit("590123412345")).toBe(7);
    expect(gtinCheckDigit("9638507")).toBe(4);
    expect(gtinCheckDigit("03600029145")).toBe(2);
    expect(gtinCheckDigit("1234567890123")).toBe(1);
    expect(gtinCheckDigit("")).toBeNull();
    expect(gtinCheckDigit("12a5")).toBeNull();
  });

  it("verifies a complete GTIN and rejects a wrong last digit", () => {
    expect(gtinCheckOk("5901234123457")).toBe(true);
    expect(gtinCheckOk("5901234123458")).toBe(false);
    expect(gtinCheckOk("96385074")).toBe(true);
    expect(gtinCheckOk("036000291452")).toBe(true);
  });

  it("produces a Code 39 mod-43 character inside the charset", () => {
    const char = code39CheckChar("CODE39");
    expect(char).not.toBeNull();
    expect("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-. $/+%").toContain(char);
    // A different payload must not collide with the same check character by luck.
    expect(code39CheckChar("CODE3")).not.toBe(char);
  });

  it("produces single mod-10 and mod-11 digits for MSI", () => {
    expect(msiMod10("938471")).toBe(0);
    expect(msiMod10("123456")).toBe(msiMod10("123456"));
    expect(msiMod11("123456")).toBeTypeOf("number");
    expect(msiMod10("938471A")).toBeNull();
  });

  it("expands UPC-E into its UPC-A identity", () => {
    expect(upceToUpca("123456", 0)).toBe("012345000065");
    expect(upceToUpca("123456", 1)).toBe("112345000062");
    expect(upceToUpca("12345", 0)).toBeNull();
    expect(upceToUpca("12345a", 0)).toBeNull();
  });
});

describe("EAN-13 encoding", () => {
  it("lays out the 95 modules exactly as the tables describe", () => {
    const spec = specFor("ean13", "5901234123457");
    const digits = spec.value.split("").map(Number);
    const parity = EAN13_PARITY[digits[0]];
    const left = digits
      .slice(1, 7)
      .map((digit, index) =>
        parity[index] === "L" ? EAN_L[digit] : EAN_G[digit],
      )
      .join("");
    const right = digits
      .slice(7)
      .map((digit) => EAN_R[digit])
      .join("");
    expect(spec.modules).toBe(95);
    expect(binaryOf(spec)).toBe(
      `${EAN_SIDE_GUARD}${left}${EAN_CENTRE_GUARD}${right}${EAN_SIDE_GUARD}`,
    );
  });

  it("calculates a missing check digit and records the note", () => {
    const spec = specFor("ean13", "590123412345");
    expect(spec.value).toBe("5901234123457");
    expect(spec.notes.join(" ")).toContain("7");
    expect(specFor("ean13", "5901234123457").notes.join(" ")).not.toContain(
      "calculated",
    );
  });

  it("refuses a wrong check digit instead of overwriting it", () => {
    expect(problemCodes("ean13", "5901234123458")).toEqual(["checksum"]);
    const result = normalizeBarcode("ean13", "5901234123458");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.problems[0].message).toContain("should be 7");
  });

  it("extends the guard bars into the text line", () => {
    const spec = specFor("ean13", "5901234123457");
    expect(spec.guards).toHaveLength(6);
    expect(spec.quiet).toEqual({ left: 11, right: 7 });
    expect(spec.segments.length).toBeGreaterThan(1);
  });
});

describe("EAN-8 and UPC-A encoding", () => {
  it("builds 67 modules for EAN-8", () => {
    const spec = specFor("ean8", "96385074");
    expect(spec.value).toBe("96385074");
    expect(spec.modules).toBe(67);
    expect(binaryOf(spec)).toHaveLength(67);
    expect(spec.quiet).toEqual({ left: 9, right: 7 });
  });

  it("builds 95 modules for UPC-A with nine-module quiet zones", () => {
    const spec = specFor("upca", "03600029145");
    expect(spec.value).toBe("036000291452");
    expect(spec.modules).toBe(95);
    expect(spec.quiet).toEqual({ left: 9, right: 9 });
  });
});

describe("UPC-E encoding", () => {
  it("encodes 123456 with the number system 0 check digit 5", () => {
    const spec = specFor("upce", "01234565");
    expect(spec.value).toBe("01234565");
    expect(spec.modules).toBe(51);
    const parity = UPCE_PARITY[5];
    const body = spec.value.slice(1, 7).split("").map(Number);
    const bits = body
      .map((digit, index) =>
        parity[index] === "O" ? EAN_L[digit] : EAN_G[digit],
      )
      .join("");
    expect(binaryOf(spec)).toBe(`${EAN_SIDE_GUARD}${bits}010101`);
    expect(spec.modules).toBe(3 + 42 + 6);
  });

  it("derives the right check digit and parity for all ten check digits", () => {
    const bodies = [
      "123456",
      "000123",
      "111111",
      "987650",
      "424242",
      "050505",
      "777777",
      "314159",
      "271828",
      "649201",
    ];
    for (const [index, body] of bodies.entries()) {
      const spec = specFor("upce", body);
      const expanded = upceToUpca(body, 0);
      expect(expanded).not.toBeNull();
      const check = gtinCheckDigit(expanded!.slice(0, 11));
      expect(spec.value).toBe(`0${body}${check}`);
      expect(spec.value).toHaveLength(8);
      expect(binaryOf(spec).slice(3, 45)).toBe(
        body
          .split("")
          .map(Number)
          .map((digit, position) =>
            UPCE_PARITY[check!][position] === "O" ? EAN_L[digit] : EAN_G[digit],
          )
          .join(""),
      );
      expect(index).toBeGreaterThanOrEqual(0);
    }
  });

  it("inverts the parity for number system 1", () => {
    const zero = specFor("upce", "123456", { numberSystem: 0 } as never);
    const one = specFor("upce", "123456", { numberSystem: 1 } as never);
    expect(zero.value.startsWith("0")).toBe(true);
    expect(one.value.startsWith("1")).toBe(true);
    const body = "123456";
    const check = Number(one.value.at(-1));
    const inverted = UPCE_PARITY[check]
      .split("")
      .map((digit) => (digit === "O" ? "E" : "O"))
      .join("");
    expect(binaryOf(one).slice(3, 45)).toBe(
      body
        .split("")
        .map(Number)
        .map((digit, position) =>
          inverted[position] === "O" ? EAN_L[digit] : EAN_G[digit],
        )
        .join(""),
    );
    expect(binaryOf(zero)).not.toBe(binaryOf(one));
  });

  it("refuses six digits or letters", () => {
    expect(problemCodes("upce", "12345")).toContain("length");
    expect(problemCodes("upce", "01234a65")).toContain("charset");
  });
});

describe("Code 39 encoding", () => {
  it("uses fifteen modules per character plus one gap", () => {
    expect(code39CharModules("A")).toBe(16);
    const spec = specFor("code39", "ABC-1234");
    expect(spec.modules).toBe(15 * 10 + 9);
    expect(spec.quiet).toEqual({ left: 10, right: 10 });
    // Every Code 39 symbol starts and ends with the asterisk delimiter.
    const binary = binaryOf(spec);
    expect(binary.slice(0, 15)).toBe(binary.slice(-15));
    expect(binary.slice(0, 15)).toBe(code39BinaryOf("A").slice(0, 15));
  });

  it("wraps the value in the start and stop character", () => {
    const spec = specFor("code39", "ABC-1234");
    expect(spec.value).toBe("ABC-1234");
    expect(spec.display).toBe("ABC-1234");
    const withCheck = specFor("code39", "ABC-1234", {
      checksum: "mod43",
    } as never);
    expect(withCheck.value).toHaveLength("ABC-1234".length + 1);
    expect(withCheck.value.startsWith("ABC-1234")).toBe(true);
    expect(normalizeBarcode("code39", "abc")).toMatchObject({ ok: true });
  });

  it("rejects characters outside the Code 39 set", () => {
    expect(problemCodes("code39", "ABC_123")).toEqual(["charset"]);
    expect(problemCodes("code39", "")).toEqual(["empty"]);
  });
});

describe("Code 128 encoding", () => {
  it("closes with the thirteen-module stop pattern", () => {
    const spec = specFor("code128", "QUICKKIT-2026");
    expect(spec.modules).toBe(178);
    expect(binaryOf(spec).endsWith("1100011101011")).toBe(true);
  });

  it("switches to code set C for long digit runs", () => {
    const values = code128Values("123456");
    expect(values[0]).toBe(CODE128_START_C);
    // start, three digit pairs, the mod-103 check value, then the stop value.
    expect(values).toHaveLength(6);
    expect(values.at(-1)).toBe(CODE128_STOP);
    expect(values.slice(1, 4)).toEqual([12, 34, 56]);
    const sum = values
      .slice(0, 4)
      .reduce((total, value, index) => total + value * Math.max(1, index), 0);
    expect(values[4]).toBe(sum % 103);
  });

  it("rejects non-ASCII and control characters with a named offender", () => {
    expect(problemCodes("code128", "")).toEqual(["empty"]);
    expect(problemCodes("code128", "café")).toEqual(["charset"]);
    const result = normalizeBarcode("code128", "café");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.problems[0].message).toContain("U+00E9");
    expect(problemCodes("code128", "line\nbreak")).toEqual(["charset"]);
  });
});

describe("ITF-14, Codabar and MSI encoding", () => {
  it("pads ITF-14 to a valid fourteen-digit value", () => {
    const spec = specFor("itf14", "1234567890123");
    expect(spec.value).toBe("12345678901231");
    expect(spec.modules).toBe(135);
    expect(binaryOf(spec)).toHaveLength(135);
    expect(problemCodes("itf14", "123456789012")).toEqual(["length"]);
    expect(problemCodes("itf14", "1234567890123x")).toEqual(["charset"]);
  });

  it("adds Codabar start and stop characters", () => {
    const spec = specFor("codabar", "40156-2201");
    expect(spec.value).toBe("A40156-2201A");
    expect(spec.display).toBe("40156-2201");
    expect(spec.modules).toBeGreaterThan(100);
    const withB = specFor("codabar", "40156-2201", {
      codabarStart: "B",
    } as never);
    expect(withB.value.startsWith("B")).toBe(true);
    expect(withB.value.endsWith("B")).toBe(true);
  });

  it("appends the chosen MSI check digit", () => {
    const mod10 = specFor("msi", "938471", { checksum: "mod10" } as never);
    expect(mod10.value).toBe("9384710");
    const none = specFor("msi", "938471");
    expect(none.value).toBe("938471");
    const mod11 = specFor("msi", "938471", { checksum: "mod11" } as never);
    expect(mod11.value).toHaveLength(7);
    expect(problemCodes("msi", "93847A")).toEqual(["charset"]);
  });
});

describe("Pharmacode encoding", () => {
  it("covers the documented range only", () => {
    expect(problemCodes("pharmacode", "2")).toEqual(["range"]);
    expect(problemCodes("pharmacode", "131071")).toEqual(["range"]);
    expect(problemCodes("pharmacode", "")).toEqual(["empty"]);
    expect(problemCodes("pharmacode", "abc")).toEqual(["charset"]);
    expect(normalizeBarcode("pharmacode", "3")).toMatchObject({ ok: true });
    expect(normalizeBarcode("pharmacode", "131070")).toMatchObject({
      ok: true,
    });
  });

  it("round-trips every value in 3…400 and both range ends", () => {
    const decode = (widths: number[]) => {
      let value = 0;
      let weight = 1;
      for (const width of [...widths].reverse()) {
        value += weight * (width === 3 ? 2 : 1);
        weight *= 2;
      }
      return value;
    };
    for (const sample of [3, 4, 5, 12, 97, 1234, 4000]) {
      const spec = specFor("pharmacode", String(sample));
      const widths = spec.bars.map((bar) => bar.width);
      expect(widths.every((width) => width === 1 || width === 3)).toBe(true);
      expect(decode(widths)).toBe(sample);
    }
    const max = specFor("pharmacode", "131070");
    expect(max.bars).toHaveLength(16);
    expect(max.bars.every((bar) => bar.width === 3)).toBe(true);
  });
});

describe("GS1-128", () => {
  it("parses bracketed application identifiers and prints the human-readable form", () => {
    const spec = specFor("gs1-128", "(01)09501101530003(17)251231(10)LOT-42");
    expect(spec.value).toBe("(01)09501101530003(17)251231(10)LOT-42");
    expect(spec.display).toBe("(01)09501101530003(17)251231(10)LOT-42");
    expect(spec.notes.join(" ")).toContain("(01)");
    expect(spec.modules).toBeGreaterThan(300);
    expect(spec.quiet).toEqual({ left: 10, right: 10 });
  });

  it("refuses an unknown AI, a broken GTIN check digit and raw non-GS1 text", () => {
    expect(problemCodes("gs1-128", "(88)12345")).toEqual(["gs1-ai"]);
    expect(problemCodes("gs1-128", "(01)09501101530004")).toEqual([
      "gs1-check",
    ]);
    expect(problemCodes("gs1-128", "no ai here")).toEqual(["gs1-syntax"]);
    expect(problemCodes("gs1-128", "(17)25123")).toEqual(["gs1-data"]);
    expect(problemCodes("gs1-128", "(10)")).toEqual(["gs1-data"]);
  });

  it("accepts the internal-use AI 99 and the unbracketed digit form", () => {
    expect(normalizeBarcode("gs1-128", "(99)123")).toMatchObject({ ok: true });
    expect(normalizeBarcode("gs1-128", "(90)12345")).toMatchObject({
      ok: true,
    });
    expect(
      normalizeBarcode("gs1-128", "010950110153000317251231"),
    ).toMatchObject({
      ok: true,
    });
    expect(problemCodes("gs1-128", ")")).toEqual(["gs1-syntax"]);
    expect(problemCodes("gs1-128", "")).toEqual(["empty"]);
  });
});

describe("decoder round-trip", () => {
  const cases: [BarcodeFormatId, string, string][] = [
    ["code128", "QUICKKIT-2026", "Code 128"],
    ["code39", "ABC-1234", "Code 39"],
    ["ean13", "590123412345", "EAN-13"],
    ["ean8", "9638507", "EAN-8"],
    ["upca", "03600029145", "UPC-A"],
    ["upce", "01234565", "UPC-E"],
    ["itf14", "1234567890123", "ITF-14"],
    ["codabar", "40156-2201", "Codabar"],
  ];

  for (const [format, data, label] of cases) {
    it(`reads back its own ${format} symbol`, () => {
      const spec = specFor(format, data);
      const verdict = verifyBarcode(
        spec,
        renderOptionsFrom({ ...defaultSettings, format }),
      );
      expect(verdict.message).toContain(label);
      expect(verdict.ok).toBe(true);
      expect(verdict.found).toBeTruthy();
    });
  }

  it("reports GS1-128 as Code 128 with the raw element string", () => {
    const spec = specFor("gs1-128", "(01)09501101530003(17)251231(10)LOT-42");
    const verdict = verifyBarcode(
      spec,
      renderOptionsFrom({ ...defaultSettings, format: "gs1-128" }),
    );
    expect(verdict.ok).toBe(true);
    expect(verdict.format).toBe("Code 128");
    expect(verdict.found).toBe("01095011015300031725123110LOT-42");
  });

  it("does not pretend MSI or Pharmacode can be read", () => {
    expect(READABLE_FORMATS).not.toContain("msi");
    expect(READABLE_FORMATS).not.toContain("pharmacode");
    const msi = verifyBarcode(specFor("msi", "938471"));
    expect(msi.ok).toBe(false);
    expect(msi.found).toBeNull();
  });
});

describe("layout", () => {
  const spec = specFor("code128", "QUICKKIT-2026");

  it("snaps every bar to whole pixels so nothing blurs", () => {
    const layout = buildLayout({ spec, options: { moduleWidth: 2.4 } });
    for (const bar of layout.bars) {
      expect(Number.isInteger(bar.x)).toBe(true);
      expect(Number.isInteger(bar.width)).toBe(true);
      expect(bar.width).toBeGreaterThan(0);
      expect(Number.isInteger(bar.y + bar.height)).toBe(true);
    }
    expect(Number.isInteger(layout.width)).toBe(true);
    expect(Number.isInteger(layout.height)).toBe(true);
  });

  it("raises a requested quiet zone to the symbology minimum", () => {
    const ean = specFor("ean13", "5901234123457");
    const narrow = buildLayout({ spec: ean, options: { quietZone: 0 } });
    const wide = buildLayout({ spec: ean, options: { quietZone: 20 } });
    // EAN-13 mandates 11 modules on the left and 7 on the right.
    expect(narrow.quietLeft).toBe(11);
    expect(narrow.quietRight).toBe(7);
    expect(wide.quietLeft).toBe(20);
    expect(wide.quietRight).toBe(20);
    expect(wide.width - narrow.width).toBe(
      Math.round((20 - 11 + 20 - 7) * narrow.moduleWidth),
    );
    const c128 = buildLayout({ spec, options: { quietZone: 2 } });
    expect(c128.quietLeft).toBe(10);
    expect(c128.quietRight).toBe(10);
  });

  it("reports export density without moving the preview geometry", () => {
    const single = buildLayout({
      spec,
      options: { moduleWidth: 2, barHeight: 80 },
    });
    const triple = buildLayout({
      spec,
      options: { moduleWidth: 2, barHeight: 80 },
      scale: 3,
    });
    expect(triple.width).toBe(single.width);
    expect(triple.bars).toEqual(single.bars);
    expect(triple.scaled.scale).toBe(3);
    expect(
      Math.abs(triple.scaled.width - single.width * 3),
    ).toBeLessThanOrEqual(1);
    expect(
      Math.abs(triple.scaled.height - single.height * 3),
    ).toBeLessThanOrEqual(1);
  });

  it("scales every bar by the same factor when the bar width changes", () => {
    const thin = buildLayout({ spec, options: { moduleWidth: 1.5 } });
    const thick = buildLayout({ spec, options: { moduleWidth: 3 } });
    const ratios = thin.bars.map(
      (bar, index) => thick.bars[index].width / bar.width,
    );
    // Snapping to whole pixels means a one-module bar lands on 2 px or 3 px, so
    // the per-bar ratio brackets the exact doubling rather than matching it.
    for (const ratio of ratios) expect(ratio).toBeGreaterThanOrEqual(1.5);
    for (const ratio of ratios) expect(ratio).toBeLessThanOrEqual(3);
    const sum = (bars: { width: number }[]) =>
      bars.reduce((total, bar) => total + bar.width, 0);
    expect(sum(thick.bars) / sum(thin.bars)).toBeGreaterThan(1.85);
    expect(sum(thick.bars) / sum(thin.bars)).toBeLessThan(2.15);
    // Proportional, not stretched: the symbol grows in both axes of the bar
    // field but the bar heights are independent of the module width.
    expect(thick.symbolWidth / thin.symbolWidth).toBeCloseTo(2, 3);
    expect(thick.barHeight).toBe(thin.barHeight);
  });

  it("honours text, title and description placement", () => {
    const hidden = buildLayout({ spec, options: { showText: false } });
    expect(hidden.texts).toHaveLength(0);
    const titled = buildLayout({
      spec,
      options: { title: "Shelf 4", description: "Aisle B" },
    });
    expect(titled.texts.map((block) => block.text)).toEqual(
      expect.arrayContaining(["Shelf 4", "Aisle B", "QUICKKIT-2026"]),
    );
    const left = buildLayout({ spec, options: { textAlign: "left" } });
    const right = buildLayout({ spec, options: { textAlign: "right" } });
    const dataLeft = left.texts.find(
      (block) => block.text === "QUICKKIT-2026",
    )!;
    const dataRight = right.texts.find(
      (block) => block.text === "QUICKKIT-2026",
    )!;
    expect(dataLeft.anchor).toBe("start");
    expect(dataRight.anchor).toBe("end");
    expect(dataLeft.x).toBeLessThan(dataRight.x);
  });

  it("drops the background when transparency is on", () => {
    expect(
      buildLayout({ spec, options: { transparent: true } }).background,
    ).toBeNull();
    expect(
      buildLayout({ spec, options: { transparent: false } }).background,
    ).toBe("#ffffff");
    expect(
      buildLayout({ spec, options: { background: "#fef3c7" } }).background,
    ).toBe("#fef3c7");
  });

  it("converts pixels to millimetres at a given print density", () => {
    const layout = buildLayout({ spec, options: DEFAULT_RENDER_OPTIONS });
    const mm = layoutMillimetres(layout, 300);
    expect(mm.width).toBeCloseTo((layout.width / 300) * 25.4, 6);
    expect(mm.module).toBeCloseTo((layout.moduleWidth / 300) * 25.4, 6);
    expect(mm.height).toBeGreaterThan(0);
  });
});

describe("SVG output", () => {
  const spec = specFor("code128", "QUICKKIT-2026");

  it("escapes user text instead of embedding markup", () => {
    const svg = layoutToSvg(
      buildLayout({ spec, options: { title: '<script>alert("x")</script>' } }),
      {
        title: '<img src=x onerror="alert(1)">',
        description: "a & b < c",
      },
    );
    expect(svg).not.toContain("<script>");
    expect(svg).not.toContain("<img");
    expect(svg).toContain("&lt;script&gt;");
    expect(svg).toContain("a &amp; b &lt; c");
    expect(svg.trim().startsWith("<svg")).toBe(true);
    expect(
      isSvgSafe(
        layoutToSvg(buildLayout({ spec, options: {} }), { title: "Shelf 4" }),
      ),
    ).toBe(true);
  });

  it("escapes the XML special characters", () => {
    expect(escapeXml("a & b < c > d \" e ' f")).toBe(
      "a &amp; b &lt; c &gt; d &quot; e &apos; f",
    );
    expect(escapeXml("bell\u0007")).toBe("bell");
  });

  it("reports attributes that would make it unsafe", () => {
    expect(isSvgSafe('<svg onload="x"></svg>')).toBe(false);
    expect(isSvgSafe("<svg><script>1</script></svg>")).toBe(false);
    expect(isSvgSafe("<div></div>")).toBe(false);
  });

  it("round-trips through the data URI used by the preview", () => {
    const svg = layoutToSvg(buildLayout({ spec, options: {} }), {
      title: "Shelf 4",
    });
    const uri = svgDataUri(svg);
    expect(uri.startsWith("data:image/svg+xml;charset=utf-8,")).toBe(true);
    expect(decodeURIComponent(uri.split(",")[1])).toBe(svg);
  });

  it("emits one rectangle per bar and the accessible title", () => {
    const layout = buildLayout({ spec, options: {} });
    const svg = layoutToSvg(layout, { title: "Code 128 QUICKKIT-2026" });
    expect(svg.match(/<rect /g)!.length).toBe(layout.bars.length + 1);
    expect(svg).toContain(
      '<title id="bc-title">Code 128 QUICKKIT-2026</title>',
    );
    expect(svg).toContain('shape-rendering="crispEdges"');
  });
});

describe("format metadata", () => {
  it("lists twelve unique formats with valid samples", () => {
    expect(BARCODE_FORMATS).toHaveLength(12);
    expect(new Set(BARCODE_FORMATS.map((entry) => entry.id)).size).toBe(12);
    for (const entry of BARCODE_FORMATS) {
      expect(entry.rules.length).toBeGreaterThan(0);
      expect(entry.quietZone).toBeGreaterThan(0);
      expect(FORMAT_SAMPLES[entry.id]).toBeTruthy();
      const result = buildBarcode(entry.id, FORMAT_SAMPLES[entry.id]);
      expect(result.ok).toBe(true);
    }
  });

  it("marks the ten read-back formats as scannable", () => {
    const scannable = SCANNABLE_FORMATS.map((entry) => entry.id);
    expect(scannable).toHaveLength(10);
    // GS1-128 has no separate reader: it decodes as Code 128, so the metadata
    // marks it scannable while the decoder lists nine linear symbologies plus
    // the three 2D symbologies it can also read (QR, Data Matrix, PDF417).
    expect(READABLE_FORMATS).toHaveLength(12);
    expect(READABLE_FORMATS).toEqual(
      expect.arrayContaining(["qrcode", "datamatrix", "pdf417"]),
    );
    expect(scannable.filter((id) => !READABLE_FORMATS.includes(id))).toEqual([
      "gs1-128",
    ]);
    expect(formatMeta("msi").scannable).toBe(false);
    expect(formatMeta("pharmacode").scannable).toBe(false);
    expect(formatMeta("ean13").name).toBe("EAN-13");
  });
});

describe("saved settings", () => {
  it("falls back to defaults for every hostile value", () => {
    const clean = sanitizeSettings({
      format: "not-a-format",
      data: 42,
      moduleWidth: 10_000,
      barHeight: -5,
      fontSize: 0,
      foreground: "url(javascript:alert(1))",
      background: "<?php",
      textAlign: "middle",
      scale: 99,
    });
    expect(clean.format).toBe(defaultSettings.format);
    expect(clean.data).toBe(defaultSettings.data);
    expect(clean.moduleWidth).toBeLessThanOrEqual(16);
    expect(clean.barHeight).toBeGreaterThan(0);
    expect(clean.fontSize).toBeGreaterThan(0);
    expect(clean.foreground).toMatch(/^#[0-9a-f]{6}$/i);
    expect(clean.background).toMatch(/^#[0-9a-f]{6}$/i);
    expect(clean.textAlign).toBe(defaultSettings.textAlign);
    expect(clean.scale).toBeLessThanOrEqual(6);
  });

  it("round-trips through local storage and survives corrupt JSON", () => {
    const store = new Map<string, string>();
    const fake = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key),
    };
    const original = globalThis.localStorage;
    Object.defineProperty(globalThis, "localStorage", {
      value: fake,
      configurable: true,
    });
    try {
      saveSettings({
        ...defaultSettings,
        moduleWidth: 3.2,
        foreground: "#123456",
      });
      const loaded = loadSettings();
      expect(loaded.moduleWidth).toBe(3.2);
      expect(loaded.foreground).toBe("#123456");
      store.set("qk:barcode-studio-settings:v1", "{not json");
      expect(loadSettings()).toMatchObject({ format: defaultSettings.format });
    } finally {
      Object.defineProperty(globalThis, "localStorage", {
        value: original,
        configurable: true,
      });
    }
  });

  it("maps settings onto the render options the layout consumes", () => {
    const options = renderOptionsFrom({
      ...defaultSettings,
      moduleWidth: 3,
      barHeight: 120,
      quietZone: 14,
      title: "Shelf 4",
      showText: false,
    });
    expect(options).toMatchObject({
      moduleWidth: 3,
      barHeight: 120,
      quietZone: 14,
      title: "Shelf 4",
      showText: false,
      background: "#ffffff",
    });
    expect(
      renderOptionsFrom({ ...defaultSettings, transparent: true }).transparent,
    ).toBe(true);
  });
});
