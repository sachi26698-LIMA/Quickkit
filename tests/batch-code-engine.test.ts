import { describe, expect, it } from "vitest";
import {
  addMonths,
  daysBetween,
  decodeCode,
  formatDate,
  isIsoDate,
  isLeapYear,
  monthsBetween,
  readGs1Facts,
  relativeDays,
  scanExplicitDate,
} from "@/lib/tools/batch-code/decoders";
import {
  BRANDS,
  brandBySlug,
  brandCoverage,
} from "@/lib/tools/batch-code/brands";
import {
  checkBatchCode,
  cleanText,
  normalizeCode,
} from "@/lib/tools/batch-code/check";
import {
  brandsByLetter,
  findBrandByName,
  searchBrands,
} from "@/lib/tools/batch-code/search";
import {
  CATEGORY_SHELF_LIFE,
  PAO_GUIDANCE,
  PAO_SOURCE,
} from "@/lib/tools/batch-code/shelf-life";
import type { CheckInput, ProductCategory } from "@/lib/tools/batch-code/types";

const baseInput = (overrides: Partial<CheckInput> = {}): CheckInput => ({
  brandSlug: "nivea",
  code: "28H300",
  productName: "Soft cream",
  dates: {
    printedManufacture: "",
    printedExpiry: "",
    purchase: "",
    opened: "",
    pao: null,
  },
  today: "2026-06-15",
  ...overrides,
});

const dates = (overrides: Partial<CheckInput["dates"]> = {}) => ({
  printedManufacture: "",
  printedExpiry: "",
  purchase: "",
  opened: "",
  pao: null,
  ...overrides,
});

describe("calendar arithmetic", () => {
  it("knows leap years including the century rule", () => {
    expect(isLeapYear(2024)).toBe(true);
    expect(isLeapYear(2026)).toBe(false);
    expect(isLeapYear(1900)).toBe(false);
    expect(isLeapYear(2000)).toBe(true);
  });

  it("rejects dates that do not exist", () => {
    expect(isIsoDate("2026-02-30")).toBe(false);
    expect(isIsoDate("2026-13-01")).toBe(false);
    expect(isIsoDate("2024-02-29")).toBe(true);
    expect(isIsoDate("2026-2-1")).toBe(false);
  });

  it("adds months by calendar, clamping the day", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2024-01-31", 1)).toBe("2024-02-29");
    expect(addMonths("2026-12-15", 1)).toBe("2027-01-15");
    expect(addMonths("2026-03-31", -1)).toBe("2026-02-28");
    expect(addMonths("2026-06-15", 36)).toBe("2029-06-15");
    expect(addMonths("nonsense", 3)).toBeNull();
  });

  it("counts months and days from fixed points", () => {
    expect(monthsBetween("2024-01-15", "2026-06-15")).toBe(29);
    expect(monthsBetween("2024-01-20", "2026-06-15")).toBe(28);
    expect(daysBetween("2026-06-15", "2026-06-16")).toBe(1);
    expect(daysBetween("2026-06-15", "2026-06-15")).toBe(0);
    expect(daysBetween("2026-06-15", "2025-06-15")).toBe(-365);
  });

  it("formats and describes dates", () => {
    expect(formatDate("2027-01-05")).toBe("5 Jan 2027");
    expect(relativeDays(0)).toBe("today");
    expect(relativeDays(1)).toBe("1 day from now");
    expect(relativeDays(-40)).toMatch(/ago$/);
  });
});

describe("explicit date pattern scan", () => {
  it("reads the common printed forms", () => {
    expect(scanExplicitDate("06/2027").candidates[0].date).toBe("2027-06-01");
    expect(scanExplicitDate("EXP 2027-06-12").candidates[0].date).toBe(
      "2027-06-12",
    );
    expect(scanExplicitDate("20270612").candidates[0].date).toBe("2027-06-12");
    expect(scanExplicitDate("260612").candidates[0].date).toBe("2026-06-12");
    expect(scanExplicitDate("12/06/2027").candidates[0].date).toBe(
      "2027-06-12",
    );
  });

  it("returns nothing for codes with no readable date", () => {
    expect(scanExplicitDate("28H300").candidates).toHaveLength(0);
    expect(scanExplicitDate("40156-2201").candidates).toHaveLength(0);
    expect(scanExplicitDate("13/13/2020").candidates).toHaveLength(0);
    expect(scanExplicitDate("").detail).toMatch(/no code/i);
  });

  it("shows both readings when the digits are ambiguous", () => {
    const scan = scanExplicitDate("240506");
    expect(scan.ambiguous).toBe(true);
    expect(scan.candidates.map((candidate) => candidate.date).sort()).toEqual([
      "2006-05-24",
      "2024-05-06",
    ]);
    expect(scan.detail).toMatch(/more than one/i);
  });

  it("never treats an impossible calendar reading as a date", () => {
    expect(scanExplicitDate("2026-02-30").candidates).toHaveLength(0);
  });
});

describe("GS1 element strings", () => {
  it("reads expiry, batch and GTIN", () => {
    const facts = readGs1Facts("(01)09501101530003(17)251231(10)LOT-42");
    expect(facts?.expiryDate).toBe("2025-12-31");
    expect(facts?.batch).toBe("LOT-42");
    expect(facts?.gtin).toBe("09501101530003");
  });

  it("reads a production date and accepts the day-00 rule", () => {
    expect(readGs1Facts("(11)250101")?.productionDate).toBe("2025-01-01");
    // GS1: a day of 00 means the last day of that month.
    expect(readGs1Facts("(17)260200")?.expiryDate).toBe("2026-02-28");
    expect(readGs1Facts("(17)240200")?.expiryDate).toBe("2024-02-29");
  });

  it("rejects strings that are not GS1 element strings", () => {
    expect(readGs1Facts("28H300")).toBeNull();
    expect(readGs1Facts("(99)1234")).toBeNull();
  });
});

describe("decoder verdicts", () => {
  const nivea = brandBySlug("nivea")!;

  it("verifies a GS1 element string", () => {
    const outcome = decodeCode(nivea, "(01)09501101530003(17)251231(10)LOT-42");
    expect(outcome.verdict.status).toBe("verified");
    expect(outcome.verdict.id).toBe("gs1-element-string");
    expect(outcome.expiry).toBe("2025-12-31");
  });

  it("estimates from an explicit date but says it is a pattern", () => {
    const outcome = decodeCode(nivea, "EXP 06/2027");
    expect(outcome.verdict.status).toBe("estimated");
    expect(outcome.manufacture).toBe("2027-06-01");
    expect(outcome.verdict.detail).toMatch(/pattern match/i);
  });

  it("refuses to decode an opaque lot number", () => {
    const outcome = decodeCode(nivea, "28H300");
    expect(outcome.verdict.status).toBe("undecodable");
    expect(outcome.verdict.id).toBe("none");
    expect(outcome.manufacture).toBeNull();
    expect(outcome.verdict.detail).toMatch(/lot number/i);
  });
});

describe("brand records", () => {
  it("are unique and complete", () => {
    const slugs = new Set(BRANDS.map((brand) => brand.slug));
    expect(slugs.size).toBe(BRANDS.length);
    for (const brand of BRANDS) {
      expect(brand.name.length).toBeGreaterThan(1);
      expect(brand.limitation.length).toBeGreaterThan(20);
      expect(brand.dateLogic.length).toBeGreaterThan(20);
      expect(brand.categories.length).toBeGreaterThan(0);
    }
  });

  it("claim no decoder without a source", () => {
    for (const brand of BRANDS) {
      if (brand.decoderId !== "none")
        expect(brand.source.kind).not.toBe("none");
      else expect(brand.decoderStatus).toBe("none");
      expect(brand.lastVerified).toBeNull();
    }
    expect(brandCoverage().verified).toBe(0);
  });

  it("compute coverage from the records", () => {
    const coverage = brandCoverage();
    expect(coverage.total).toBe(BRANDS.length);
    expect(coverage.none).toBe(BRANDS.length);
    expect(coverage.categories).toBeGreaterThan(3);
  });

  it("give every category a shelf-life entry with a stated source", () => {
    const categories = Object.keys(CATEGORY_SHELF_LIFE) as ProductCategory[];
    expect(categories).toHaveLength(8);
    for (const category of categories) {
      const entry = CATEGORY_SHELF_LIFE[category];
      expect(entry.source.length).toBeGreaterThan(5);
      if (entry.months !== null) expect(entry.months).toBeGreaterThan(0);
    }
    expect(CATEGORY_SHELF_LIFE.other.months).toBeNull();
  });

  it("describes PAO values with a legal source", () => {
    expect(PAO_GUIDANCE.map((entry) => entry.months)).toEqual([
      3, 6, 9, 12, 18, 24, 36,
    ]);
    expect(PAO_SOURCE).toMatch(/1223\/2009/);
  });
});

describe("brand search", () => {
  it("matches accents, apostrophes and aliases", () => {
    expect(searchBrands("loreal")[0].slug).toBe("loreal-paris");
    expect(searchBrands("l'oreal")[0].slug).toBe("loreal-paris");
    expect(searchBrands("lancome")[0].slug).toBe("lancome");
    expect(searchBrands("ysl")[0].slug).toBe("ysl-beauty");
    expect(findBrandByName("nivea")?.slug).toBe("nivea");
  });

  it("matches multi-word fragments and filters by category", () => {
    expect(
      searchBrands("la roche").some((brand) => brand.slug === "la-roche-posay"),
    ).toBe(true);
    const fragrance = searchBrands("", { category: "fragrance", limit: 50 });
    expect(fragrance.length).toBeGreaterThan(5);
    expect(
      fragrance.every((brand) => brand.categories.includes("fragrance")),
    ).toBe(true);
  });

  it("returns nothing for a brand it does not hold", () => {
    expect(searchBrands("zzzznotabrand")).toHaveLength(0);
  });

  it("can list every brand A–Z exactly once", () => {
    const grouped = brandsByLetter();
    const total = grouped.reduce((sum, group) => sum + group.brands.length, 0);
    expect(total).toBe(BRANDS.length);
    expect(grouped[0].letter).toBe("A");
  });
});

describe("input hygiene", () => {
  it("normalises codes and strips markup from names", () => {
    expect(normalizeCode("  ab 12  ")).toBe("AB 12");
    expect(cleanText("<script>alert(1)</script>Cream")).toBe(
      "script alert(1) /script Cream",
    );
    expect(cleanText("x".repeat(200)).length).toBe(80);
  });
});

describe("checkBatchCode", () => {
  it("rejects an unknown brand instead of guessing", () => {
    const outcome = checkBatchCode(baseInput({ brandSlug: "not-a-brand" }));
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) expect(outcome.problems[0].code).toBe("brand");
  });

  it("rejects a missing or impossible code", () => {
    for (const code of ["", " ", "A", "<b>123</b>"]) {
      const outcome = checkBatchCode(baseInput({ code }));
      expect(outcome.ok).toBe(false);
    }
  });

  it("rejects impossible dates and inverted ranges", () => {
    const bad = checkBatchCode(
      baseInput({ dates: dates({ printedExpiry: "2026-02-30" }) }),
    );
    expect(bad.ok).toBe(false);

    const inverted = checkBatchCode(
      baseInput({
        dates: dates({
          printedManufacture: "2026-05-01",
          printedExpiry: "2026-04-01",
        }),
      }),
    );
    expect(inverted.ok).toBe(false);

    const future = checkBatchCode(
      baseInput({ dates: dates({ opened: "2027-01-01" }) }),
    );
    expect(future.ok).toBe(false);

    const badPao = checkBatchCode(
      baseInput({ dates: { ...dates(), pao: 7 as unknown as 12 } }),
    );
    expect(badPao.ok).toBe(false);
  });

  it("returns NOT DECODABLE with no invented dates", () => {
    const outcome = checkBatchCode(baseInput());
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.verdict.status).toBe("undecodable");
    expect(outcome.result.manufacture).toBeNull();
    expect(outcome.result.estimatedExpiry).toBeNull();
    expect(outcome.result.effectiveExpiry).toBeNull();
    expect(outcome.result.remainingDays).toBeNull();
    expect(outcome.result.warnings.join(" ")).toMatch(/cannot be decoded/i);
  });

  it("computes a disclosed estimate from a printed manufacture date", () => {
    const outcome = checkBatchCode(
      baseInput({
        brandSlug: "cerave",
        dates: dates({ printedManufacture: "2024-01-15" }),
      }),
    );
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    const { result } = outcome;
    expect(result.manufacture?.confidence).toBe("verified");
    expect(result.estimatedExpiry?.date).toBe("2027-01-15");
    expect(result.estimatedExpiry?.confidence).toBe("estimated");
    expect(result.estimatedExpiry?.method).toMatch(/36 months/);
    expect(result.ageMonths).toBe(29);
    expect(result.remainingDays).toBe(daysBetween("2026-06-15", "2027-01-15"));
    expect(result.verdict.status).toBe("undecodable");
  });

  it("keeps PAO as its own calculation", () => {
    const outcome = checkBatchCode(
      baseInput({
        dates: dates({ opened: "2026-01-10", pao: 12 }),
      }),
    );
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.paoExpiry?.date).toBe("2027-01-10");
    expect(outcome.result.paoExpiry?.source).toBe("opened-plus-pao");
    expect(outcome.result.estimatedExpiry).toBeNull();
    expect(outcome.result.effectiveExpiry?.source).toBe("opened-plus-pao");
  });

  it("lets the printed expiry outrank every estimate", () => {
    const outcome = checkBatchCode(
      baseInput({
        dates: dates({
          printedManufacture: "2024-01-15",
          printedExpiry: "2026-01-01",
          opened: "2025-06-01",
          pao: 6,
        }),
      }),
    );
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    const { result } = outcome;
    expect(result.printedExpiry?.date).toBe("2026-01-01");
    expect(result.effectiveExpiry?.source).toBe("printed");
    expect(result.estimatedExpiry?.date).toBe("2027-01-15");
    expect(result.paoExpiry?.date).toBe("2025-12-01");
    expect(result.warnings.join(" ")).toMatch(/already passed/i);
    expect(result.warnings.join(" ")).toMatch(/period after opening ended/i);
  });

  it("decodes a GS1 string without a brand decoder", () => {
    const outcome = checkBatchCode(
      baseInput({
        brandSlug: "nivea",
        code: "(01)09501101530003(17)251231(10)LOT-42",
      }),
    );
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.verdict.status).toBe("verified");
    expect(outcome.result.printedExpiry).toBeNull();
    expect(outcome.result.manufacture).toBeNull();
    expect(outcome.result.notes.join(" ")).toMatch(
      /differs from the code you typed/i,
    );
  });

  it("warns that a GTIN is not a batch code", () => {
    const outcome = checkBatchCode(baseInput({ code: "4006381333931" }));
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.notes.join(" ")).toMatch(/GTIN/);
  });

  it("flags ambiguous pattern dates instead of choosing one", () => {
    const outcome = checkBatchCode(baseInput({ code: "240506" }));
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.verdict.status).toBe("estimated");
    expect(outcome.result.manufacture).toBeNull();
    expect(outcome.result.warnings.join(" ")).toMatch(
      /more than one date-shaped reading/i,
    );
  });

  it("records the printed manufacture date as verified", () => {
    const outcome = checkBatchCode(
      baseInput({
        dates: dates({
          printedManufacture: "2025-03-01",
          printedExpiry: "2028-03-01",
        }),
      }),
    );
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.manufacture?.source).toBe("printed");
    expect(outcome.result.manufacture?.confidence).toBe("verified");
    expect(outcome.result.effectiveExpiry?.date).toBe("2028-03-01");
  });

  it("is deterministic for a given today", () => {
    const first = checkBatchCode(baseInput());
    const second = checkBatchCode(baseInput());
    expect(first).toEqual(second);
    if (first.ok) expect(first.result.checkedOn).toBe("15 Jun 2026");
  });
});
