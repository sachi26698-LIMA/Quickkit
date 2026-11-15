/**
 * Manufacturer-specific decoders — the mechanism, and an honest empty registry.
 *
 * The rule this file exists to enforce: a brand decoder is only allowed to ship
 * when four things are true.
 *
 *   1. The manufacturer (not a reseller, not a blog) documents the format.
 *   2. The evidence URL is https and is recorded with the date it was read.
 *   3. The decoder carries reproducible vectors: code in, date out.
 *   4. Running those vectors through the decoder is part of the test suite, so a
 *      refactor cannot quietly change what the decoder claims.
 *
 * As of 2026-11-13, no cosmetics manufacturer documentation describing a lot
 * code's date logic was found — see `docs/BATCH_CODE_RESEARCH_PHASE20.md` for the
 * searches and the pages that were read. `BRAND_DECODERS` is therefore empty,
 * and every brand record says NOT DECODABLE. That is the correct state, not an
 * unfinished one: inventing a decoder would produce confident, wrong dates.
 *
 * Adding one: implement `decode`, add at least two vectors, fill `evidence`,
 * then run `validateBrandDecoder` (the test suite runs it over the registry) and
 * flip the brand record's `decoderId` to `DECODER_ID_PREFIX + brandSlug`.
 */
import { isIsoDate } from "./decoders";

/** Prefix used in `BrandRecord.decoderId` for a manufacturer-specific decoder. */
export const DECODER_ID_PREFIX = "brand:";

export type BrandDecodeResult = {
  /** ISO date. A month-precision code resolves to the first of the month. */
  date: string;
  precision: "day" | "month";
  /** The characters the decoder actually read, for display. */
  match: string;
  /** One sentence a reader can check against the pack. */
  explanation: string;
};

export type BrandDecoderEvidence = {
  label: string;
  /** Must be https: a decoder is never justified by a bare hostname. */
  url: string;
  /** ISO date the source was read. */
  verifiedOn: string;
};

export type BrandDecoderVector = {
  code: string;
  expected: string;
  precision: "day" | "month";
};

export type BrandDecoder = {
  /** Stable id, conventionally `brand:<slug>` plus a version suffix if needed. */
  id: string;
  brandSlug: string;
  version: string;
  description: string;
  evidence: BrandDecoderEvidence;
  decode: (code: string) => BrandDecodeResult | null;
  vectors: BrandDecoderVector[];
};

/**
 * The registry. Empty by design — see the module comment. Tests run
 * `validateBrandDecoder` over every entry, and there is a second test that
 * asserts no brand record claims a brand decoder that is not registered here.
 */
export const BRAND_DECODERS: readonly BrandDecoder[] = [];

/** Every problem with a decoder, or an empty array when it is shippable. */
export function validateBrandDecoder(decoder: BrandDecoder): string[] {
  const problems: string[] = [];
  if (!decoder.id.trim()) problems.push("id is empty");
  if (!decoder.brandSlug.trim()) problems.push("brandSlug is empty");
  if (!decoder.version.trim()) problems.push("version is empty");
  if (!decoder.description.trim()) problems.push("description is empty");

  if (!decoder.evidence.label.trim()) problems.push("evidence.label is empty");
  if (!/^https:\/\/\S+$/.test(decoder.evidence.url))
    problems.push("evidence.url must be an https URL");
  if (!isIsoDate(decoder.evidence.verifiedOn))
    problems.push("evidence.verifiedOn must be an ISO date");

  if (decoder.vectors.length < 2)
    problems.push("at least two reproducible vectors are required");

  for (const vector of decoder.vectors) {
    const result = decoder.decode(vector.code);
    if (!result) {
      problems.push(`vector ${vector.code} does not decode`);
      continue;
    }
    if (result.date !== vector.expected)
      problems.push(
        `vector ${vector.code} decodes to ${result.date}, expected ${vector.expected}`,
      );
    if (result.precision !== vector.precision)
      problems.push(
        `vector ${vector.code} precision is ${result.precision}, expected ${vector.precision}`,
      );
    if (!isIsoDate(result.date))
      problems.push(`vector ${vector.code} produced a non-ISO date`);
    if (!result.match.trim())
      problems.push(`vector ${vector.code} has an empty match`);
  }

  return problems;
}

export function brandDecoderFor(
  brandSlug: string,
  registry: readonly BrandDecoder[] = BRAND_DECODERS,
): BrandDecoder | null {
  return registry.find((entry) => entry.brandSlug === brandSlug) ?? null;
}

/**
 * Decode a code with a brand decoder, when one is registered for that brand.
 *
 * The registry is a parameter with a default so the integration can be tested
 * with a fixture decoder, without shipping one.
 */
export function decodeBrandCode(
  brandSlug: string,
  code: string,
  registry: readonly BrandDecoder[] = BRAND_DECODERS,
): { decoder: BrandDecoder; result: BrandDecodeResult } | null {
  const decoder = brandDecoderFor(brandSlug, registry);
  if (!decoder) return null;
  const result = decoder.decode(code);
  if (!result) return null;
  return { decoder, result };
}
