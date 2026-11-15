/**
 * What the scanner decides a decoded value is.
 *
 * The user's own example is the first case: scanning `0731946697725` must be
 * recognised as a GTIN-13 with a valid check digit, and therefore as something a
 * product database can be asked about. A Code 128 internal reference must never
 * be treated as a product number.
 */
import { describe, expect, it } from "vitest";
import {
  carrierSuitsGtin,
  classifyScan,
  identityLabel,
  lookupGtinFor,
} from "@/lib/tools/barcode-scanner/identify";

describe("GTIN classification", () => {
  it("recognises the reported scan as a GTIN-13", () => {
    const identity = classifyScan("0731946697725");
    expect(identity.kind).toBe("gtin");
    if (identity.kind !== "gtin") return;
    expect(identity.format).toBe("GTIN-13");
    expect(identity.digits).toBe(13);
    expect(identity.checkDigitOk).toBe(true);
    expect(identity.checkDigitFound).toBe(5);
    expect(identity.canonical14).toBe("00731946697725");
    expect(identity.lookupGtin).toBe("0731946697725");
    expect(identity.note).toMatch(/correct check digit/);
    expect(identityLabel(identity)).toBe("GTIN-13");
  });

  it("handles every GTIN length", () => {
    const cases: [string, string, number][] = [
      ["96385074", "GTIN-8", 8],
      ["036000291452", "GTIN-12", 12],
      ["4006381333931", "GTIN-13", 13],
      ["09501101530003", "GTIN-14", 14],
    ];
    for (const [value, format, digits] of cases) {
      const identity = classifyScan(value);
      expect(identity.kind, value).toBe("gtin");
      if (identity.kind !== "gtin") continue;
      expect(identity.format, value).toBe(format);
      expect(identity.digits, value).toBe(digits);
      expect(identity.checkDigitOk, value).toBe(true);
      expect(identity.lookupGtin, value).toBe(value);
    }
  });

  it("pads a GTIN-12 to GTIN-14 without changing the number", () => {
    const identity = classifyScan("036000291452");
    expect(identity.kind).toBe("gtin");
    if (identity.kind !== "gtin") return;
    expect(identity.canonical14).toBe("00036000291452");
  });

  it("refuses a GTIN whose check digit is wrong, and says which digit it needs", () => {
    const identity = classifyScan("04005808147709");
    expect(identity.kind).toBe("text");
    if (identity.kind !== "text") return;
    expect(identity.failedGtin).toEqual({
      gtin: "04005808147709",
      format: "GTIN-14",
      checkDigitFound: 9,
      checkDigitExpected: 0,
    });
    expect(identity.lookupGtin).toBeNull();
    expect(identity.reason).toMatch(/check digit/);
  });

  it("accepts a GTIN typed with spaces or hyphens", () => {
    for (const raw of ["0731 9466 97725", "0731-9466-97725"]) {
      const identity = classifyScan(raw);
      expect(identity.kind, raw).toBe("gtin");
      if (identity.kind !== "gtin") continue;
      expect(identity.gtin).toBe("0731946697725");
      expect(identity.checkDigitOk).toBe(true);
    }
  });

  it("does not treat a 15-digit number as a GTIN", () => {
    const identity = classifyScan("123456789012345");
    expect(identity.kind).toBe("text");
    if (identity.kind !== "text") return;
    expect(identity.reason).toMatch(/GTIN lengths/);
    expect(lookupGtinFor(identity)).toBeNull();
  });
});

describe("GS1 carriers", () => {
  it("parses an element string and exposes its GTIN", () => {
    const identity = classifyScan("(01)09506000134352(17)270930(10)LOT-9");
    expect(identity.kind).toBe("gs1");
    if (identity.kind !== "gs1") return;
    expect(identity.form).toBe("element-string");
    expect(identity.gtin).toBe("09506000134352");
    expect(identity.lookupGtin).toBe("09506000134352");
    const ais = identity.fields.map((field) => field.ai);
    expect(ais).toContain("01");
    expect(ais).toContain("17");
    expect(ais).toContain("10");
    expect(identityLabel(identity)).toBe("GS1 element string");
  });

  it("parses a Digital Link and exposes its GTIN", () => {
    const identity = classifyScan(
      "https://example.com/01/09506000134352/10/LOT-42?17=251231",
    );
    expect(identity.kind).toBe("gs1");
    if (identity.kind !== "gs1") return;
    expect(identity.form).toBe("digital-link");
    expect(identity.lookupGtin).toBe("09506000134352");
    expect(identityLabel(identity)).toBe("GS1 Digital Link");
  });

  it("quotes the GS1 parser when a carrier's GTIN fails its check digit", () => {
    const identity = classifyScan("(01)04005808147709(17)270930");
    expect(identity.kind).toBe("text");
    if (identity.kind !== "text") return;
    expect(identity.reason).toMatch(/check digit/i);
    expect(identity.lookupGtin).toBeNull();
  });
});

describe("ordinary decoded content", () => {
  it("shows a Code 128 reference as text, not a product number", () => {
    const identity = classifyScan("INV-2026-0042");
    expect(identity.kind).toBe("text");
    if (identity.kind !== "text") return;
    expect(identity.reason).toMatch(/not a GTIN|Plain text/i);
    expect(identity.lookupGtin).toBeNull();
    expect(identityLabel(identity)).toBe("Decoded text");
  });

  it("explains a URL that is not a GS1 Digital Link", () => {
    const identity = classifyScan("https://example.com/catalogue?page=2");
    expect(identity.kind).toBe("text");
    if (identity.kind !== "text") return;
    expect(identity.reason).toMatch(/not a GS1 Digital Link/i);
  });

  it("handles empty input", () => {
    const identity = classifyScan("   ");
    expect(identity.kind).toBe("text");
    if (identity.kind !== "text") return;
    expect(identity.reason).toMatch(/Nothing was decoded/i);
  });
});

describe("carriers", () => {
  it("knows which symbologies can carry a retail GTIN", () => {
    expect(carrierSuitsGtin("ean13")).toBe(true);
    expect(carrierSuitsGtin("upca")).toBe(true);
    expect(carrierSuitsGtin("qrcode")).toBe(true);
    expect(carrierSuitsGtin("code128")).toBe(false);
    expect(carrierSuitsGtin(null)).toBe(false);
  });
});
