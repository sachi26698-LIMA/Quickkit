/**
 * GS1 Intelligence: parsing, explanation, dates and Digital Link building.
 *
 * Values come from the GS1 General Specifications examples and from the Digital
 * Link Standard's own examples; every rejection is asserted by its stable code,
 * so a change in wording cannot hide a change in behaviour.
 */
import { describe, expect, it } from "vitest";
import {
  buildDigitalLink,
  explainAi,
  interpretGs1Date,
  parseDigitalLink,
  parseGs1Input,
  toGtin14,
  toGs1Date,
} from "@/lib/tools/gs1/engine";

describe("application identifier explanations", () => {
  it("explains the identifiers this tool advertises", () => {
    for (const ai of ["01", "10", "11", "13", "15", "17", "21"]) {
      const explained = explainAi(ai);
      expect(explained.ai).toBe(ai);
      expect(explained.explanation.length).toBeGreaterThan(40);
      expect(explained.title.length).toBeGreaterThan(2);
    }
  });

  it("never invents a meaning for an AI outside the table", () => {
    const explained = explainAi("0500");
    expect(explained.explanation).toContain("not in the table");
    expect(explained.explanation).toContain("not guessed");
  });

  it("separates GTIN, batch and serial semantics", () => {
    expect(explainAi("01").explanation).toContain(
      "never identifies an individual pack",
    );
    expect(explainAi("10").explanation).toContain("not a date");
    expect(explainAi("21").explanation).toContain("batch is not a serial");
  });
});

describe("GS1 date interpretation", () => {
  it("reads a plain YYMMDD date", () => {
    expect(interpretGs1Date("251231")).toEqual({
      iso: "2025-12-31",
      human: "31 Dec 2025",
      note: undefined,
    });
  });

  it("treats day 00 as the last day of the month", () => {
    const february = interpretGs1Date("260200");
    expect(february?.iso).toBe("2026-02-28");
    expect(february?.note).toContain("last day of the month");
    expect(interpretGs1Date("240200")?.iso).toBe("2024-02-29");
  });

  it("rejects impossible dates instead of clamping them", () => {
    expect(interpretGs1Date("260230")).toBeNull();
    expect(interpretGs1Date("251332")).toBeNull();
    expect(interpretGs1Date("250001")).toBeNull();
    expect(interpretGs1Date("25123")).toBeNull();
  });

  it("converts ISO input to YYMMDD and rejects impossible ISO dates", () => {
    expect(toGs1Date("2026-11-13")).toBe("261113");
    expect(toGs1Date("261113")).toBe("261113");
    expect(toGs1Date("2026-02-30")).toBeNull();
    expect(toGs1Date("13/11/2026")).toBeNull();
  });
});

describe("GS1 input parsing", () => {
  it("parses the bracketed human-readable form", () => {
    const parsed = parseGs1Input("(01)09506000134352(17)251231(10)LOT-42");
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.kind).toBe("hri");
    expect(parsed.fields.map((field) => field.ai)).toEqual(["01", "17", "10"]);
    expect(parsed.fields[1].date?.iso).toBe("2025-12-31");
    expect(parsed.fields[2].kind).toBe("batch");
    expect(parsed.hri).toBe("(01)09506000134352(17)251231(10)LOT-42");
  });

  it("parses a raw element string and keeps the GS separators", () => {
    const parsed = parseGs1Input("010950600013435210LOT-42\u001d17251231");
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.kind).toBe("element-string");
    expect(parsed.fields.map((field) => field.ai)).toEqual(["01", "10", "17"]);
    expect(parsed.encoded).toContain("\u001d");
  });

  it("rejects a broken GTIN check digit with the check code", () => {
    const parsed = parseGs1Input("(01)09506000134353(17)251231");
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.code).toBe("gs1-check");
  });

  it("rejects an unknown application identifier", () => {
    const parsed = parseGs1Input("(99X)1234");
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.code).toBe("gs1-syntax");
  });

  it("warns when the string does not start with a primary identifier", () => {
    const parsed = parseGs1Input("(10)LOT-42(21)SER-1");
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.warnings.join(" ")).toContain("primary identifier");
  });

  it("warns about a repeated AI", () => {
    const parsed = parseGs1Input("(01)09506000134352(10)A(10)B");
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.warnings.join(" ")).toContain("more than once");
  });
});

describe("GS1 Digital Link parsing", () => {
  it("parses the path form", () => {
    const parsed = parseDigitalLink(
      "https://example.com/01/09506000134352/10/LOT-42",
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.kind).toBe("digital-link");
    expect(parsed.link?.primary).toBe("01");
    expect(parsed.fields.map((field) => field.ai)).toEqual(["01", "10"]);
  });

  it("parses path and query form together", () => {
    const parsed = parseDigitalLink(
      "https://example.com/01/09506000134352/10/LOT-42?17=251231",
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.fields.map((field) => field.ai)).toEqual(["01", "10", "17"]);
    expect(parsed.fields[2].date?.iso).toBe("2025-12-31");
  });

  it("decodes percent-encoded values", () => {
    const parsed = parseDigitalLink(
      "https://example.com/01/09506000134352/10/LOT%2042",
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.fields[1].value).toBe("LOT 42");
  });

  it("refuses a link without a primary key", () => {
    const parsed = parseDigitalLink("https://example.com/10/LOT-42");
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.code).toBe("gs1-ai");
  });

  it("refuses an odd number of path segments", () => {
    const parsed = parseDigitalLink("https://example.com/01");
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.code).toBe("gs1-syntax");
  });

  it("refuses a non-URL", () => {
    const parsed = parseDigitalLink("not a url");
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.code).toBe("gs1-syntax");
  });

  it("validates the GTIN inside a link", () => {
    const parsed = parseDigitalLink("https://example.com/01/09506000134353");
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.code).toBe("gs1-check");
  });
});

describe("GTIN normalisation", () => {
  it("pads a GTIN-13 to GTIN-14 with a valid check digit", () => {
    expect(toGtin14("5901234123457")).toBe("05901234123457");
  });

  it("keeps a correct GTIN-14 as-is", () => {
    expect(toGtin14("09506000134352")).toBe("09506000134352");
  });

  it("rejects a GTIN with a wrong check digit", () => {
    expect(toGtin14("09506000134353")).toBeNull();
    expect(toGtin14("12345")).toBeNull();
  });
});

describe("Digital Link builder", () => {
  it("builds the canonical path and query form", () => {
    const built = buildDigitalLink({
      gtin: "09506000134352",
      batch: "LOT-42",
      expiry: "2025-12-31",
    });
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.url).toBe(
      "https://example.com/01/09506000134352/10/LOT-42?17=251231",
    );
    expect(built.hri).toBe("(01)09506000134352(10)LOT-42(17)251231");
    expect(built.fields).toHaveLength(3);
  });

  it("orders dates by AI regardless of input order", () => {
    const built = buildDigitalLink({
      gtin: "09506000134352",
      expiry: "2026-01-31",
      productionDate: "2025-01-31",
    });
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.url).toContain("?11=250131&17=260131");
  });

  it("percent-encodes batch characters", () => {
    const built = buildDigitalLink({
      gtin: "09506000134352",
      batch: "LOT 42/A",
    });
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.url).toContain("LOT%2042%2FA");
  });

  it("round-trips through the parser", () => {
    const built = buildDigitalLink({
      gtin: "5901234123457",
      batch: "B-9",
      serial: "SN-1",
      expiry: "2027-06-30",
    });
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    const parsed = parseDigitalLink(built.url);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.hri).toBe("(01)05901234123457(10)B-9(21)SN-1(17)270630");
  });

  it("refuses a missing primary identifier", () => {
    const built = buildDigitalLink({ batch: "LOT-42" });
    expect(built.ok).toBe(false);
    if (!built.ok) expect(built.code).toBe("gs1-ai");
  });

  it("refuses a bad check digit", () => {
    const built = buildDigitalLink({ gtin: "09506000134353" });
    expect(built.ok).toBe(false);
    if (!built.ok) expect(built.code).toBe("gs1-check");
  });

  it("refuses an impossible date", () => {
    const built = buildDigitalLink({
      gtin: "09506000134352",
      expiry: "2026-02-30",
    });
    expect(built.ok).toBe(false);
    if (!built.ok) expect(built.code).toBe("gs1-data");
  });

  it("refuses a batch or serial above 20 characters", () => {
    const built = buildDigitalLink({
      gtin: "09506000134352",
      batch: "X".repeat(21),
    });
    expect(built.ok).toBe(false);
    if (!built.ok) expect(built.code).toBe("gs1-data");
  });

  it("builds an SSCC link for a logistics unit", () => {
    const built = buildDigitalLink({ sscc: "123456789012345675" });
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.url).toBe("https://example.com/00/123456789012345675");
  });

  it("honours a custom origin without doubling slashes", () => {
    const built = buildDigitalLink(
      { gtin: "09506000134352" },
      { origin: "https://quickkit.online/" },
    );
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.url).toBe("https://quickkit.online/01/09506000134352");
  });
});
