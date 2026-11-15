/**
 * The brand-decoder mechanism.
 *
 * Two things are being protected here. First, the registry is empty and must
 * stay honest: no manufacturer document describing a lot code's date logic has
 * been found, so no decoder ships. Second, when one is added it must carry
 * evidence and reproducible vectors — the validator and the integration test
 * below prove that a decoder cannot be added without both.
 *
 * The fixture decoder is synthetic and exists only in this file. It is never
 * registered, so no page can use it.
 */
import { describe, expect, it } from "vitest";
import {
  BRAND_DECODERS,
  brandDecoderFor,
  decodeBrandCode,
  validateBrandDecoder,
  type BrandDecoder,
} from "@/lib/tools/batch-code/brand-decoders";
import { BRANDS } from "@/lib/tools/batch-code/brands";
import { checkBatchCode } from "@/lib/tools/batch-code/check";

/** Synthetic rule: ZX + YY + MM, e.g. ZX2601 → January 2026. */
const FIXTURE: BrandDecoder = {
  id: "brand:fixture-brand",
  brandSlug: "fixture-brand",
  version: "1.0.0",
  description: "Synthetic fixture used only by the test suite.",
  evidence: {
    label: "Fixture documentation (test only)",
    url: "https://example.com/fixture-lot-code",
    verifiedOn: "2026-11-13",
  },
  decode(code) {
    const match = /^ZX(\d{2})(\d{2})$/.exec(code.trim().toUpperCase());
    if (!match) return null;
    const year = 2000 + Number(match[1]);
    const month = Number(match[2]);
    if (month < 1 || month > 12) return null;
    return {
      date: `${year}-${String(month).padStart(2, "0")}-01`,
      precision: "month",
      match: match[0],
      explanation: `ZX rule: ${match[1]} is the year and ${match[2]} the month.`,
    };
  },
  vectors: [
    { code: "ZX2601", expected: "2026-01-01", precision: "month" },
    { code: "zx2412", expected: "2024-12-01", precision: "month" },
  ],
};

describe("the shipped registry", () => {
  it("is empty, because no manufacturer document justifies an entry", () => {
    expect(BRAND_DECODERS).toHaveLength(0);
  });

  it("validates every registered decoder", () => {
    for (const decoder of BRAND_DECODERS) {
      expect(validateBrandDecoder(decoder)).toEqual([]);
    }
  });

  it("is consistent with the brand records", () => {
    for (const brand of BRANDS) {
      if (brand.decoderId.startsWith("brand:")) {
        // A record may only claim a brand decoder that is registered.
        expect(
          BRAND_DECODERS.some((entry) => entry.brandSlug === brand.slug),
          `${brand.slug} claims ${brand.decoderId}`,
        ).toBe(true);
      } else {
        expect(brand.decoderId).toBe("none");
        expect(brand.dateLogic.length).toBeGreaterThan(20);
        expect(brand.limitation.length).toBeGreaterThan(20);
      }
    }
  });
});

describe("validation", () => {
  it("accepts a decoder with evidence and reproducible vectors", () => {
    expect(validateBrandDecoder(FIXTURE)).toEqual([]);
  });

  it("requires https evidence and a read date", () => {
    const problems = validateBrandDecoder({
      ...FIXTURE,
      evidence: {
        label: "Fixture",
        url: "http://example.com/fixture",
        verifiedOn: "not-a-date",
      },
    });
    expect(problems.join(" ")).toMatch(/https/);
    expect(problems.join(" ")).toMatch(/ISO date/);
  });

  it("requires at least two vectors", () => {
    const problems = validateBrandDecoder({
      ...FIXTURE,
      vectors: [FIXTURE.vectors[0]],
    });
    expect(problems.join(" ")).toMatch(/two reproducible vectors/);
  });

  it("fails a vector the decoder does not reproduce", () => {
    const problems = validateBrandDecoder({
      ...FIXTURE,
      vectors: [
        { code: "ZX2601", expected: "2026-02-01", precision: "month" },
        { code: "ZX2412", expected: "2024-12-01", precision: "month" },
      ],
    });
    expect(problems.join(" ")).toMatch(/expected 2026-02-01/);
  });

  it("fails a vector the decoder cannot read at all", () => {
    const problems = validateBrandDecoder({
      ...FIXTURE,
      vectors: [
        { code: "NOPE", expected: "2026-01-01", precision: "month" },
        { code: "ZX2412", expected: "2024-12-01", precision: "month" },
      ],
    });
    expect(problems.join(" ")).toMatch(/does not decode/);
  });
});

describe("decoding", () => {
  it("returns nothing for a brand with no decoder", () => {
    expect(decodeBrandCode("nivea", "ZX2601")).toBeNull();
    expect(brandDecoderFor("nivea")).toBeNull();
  });

  it("returns nothing when the fixture rule does not match", () => {
    expect(decodeBrandCode("fixture-brand", "AB1234", [FIXTURE])).toBeNull();
    expect(decodeBrandCode("fixture-brand", "ZX2699", [FIXTURE])).toBeNull();
  });

  it("decodes with an injected registry", () => {
    const decoded = decodeBrandCode("fixture-brand", "zx2412", [FIXTURE]);
    expect(decoded?.result.date).toBe("2024-12-01");
    expect(decoded?.decoder.id).toBe("brand:fixture-brand");
  });
});

describe("check integration", () => {
  const base = {
    brandSlug: "nivea",
    code: "ZX2601",
    productName: "",
    dates: {
      printedManufacture: "",
      printedExpiry: "",
      purchase: "",
      opened: "",
      pao: null,
    },
    today: "2026-11-13",
  } as const;

  it("stays NOT DECODABLE without a registered decoder", () => {
    const outcome = checkBatchCode(base);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.verdict.status).toBe("undecodable");
    expect(outcome.result.manufacture).toBeNull();
  });

  it("produces a verified manufacture date from a brand decoder", () => {
    const outcome = checkBatchCode(
      { ...base, brandSlug: "nivea" },
      {
        brandDecoders: [
          { ...FIXTURE, brandSlug: "nivea", id: "brand:nivea-fixture" },
        ],
      },
    );
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.manufacture?.date).toBe("2026-01-01");
    expect(outcome.result.manufacture?.source).toBe("brand-decoder");
    expect(outcome.result.manufacture?.confidence).toBe("verified");
    expect(outcome.result.manufacture?.evidence).toContain(
      "https://example.com/fixture-lot-code",
    );
  });

  it("still lets a printed date win over the decoder", () => {
    const outcome = checkBatchCode(
      {
        ...base,
        brandSlug: "nivea",
        dates: { ...base.dates, printedManufacture: "2025-05-05" },
      },
      {
        brandDecoders: [
          { ...FIXTURE, brandSlug: "nivea", id: "brand:nivea-fixture" },
        ],
      },
    );
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.manufacture?.source).toBe("printed");
  });
});
