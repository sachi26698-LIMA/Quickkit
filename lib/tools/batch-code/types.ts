/**
 * Batch/lot code checker — data model.
 *
 * The only defensible position for a tool like this is to separate three
 * different kinds of "a date" and never let them blur together:
 *
 *   1. a date printed on the packaging (a fact the user can read);
 *   2. a date encoded in a standards-defined carrier (GS1 AI 11/17);
 *   3. a date pattern that merely *looks* like a date inside an internal lot
 *      number (a guess, disclosed as one).
 *
 * Everything else — a brand's proprietary lot format — is `none` until a
 * manufacturer document supports a documented algorithm, and the UI says so.
 */

export type ProductCategory =
  | "skincare"
  | "haircare"
  | "makeup"
  | "fragrance"
  | "bodycare"
  | "personal-care"
  | "sun-care"
  | "other";

export type DecoderId = "none" | "gs1-element-string" | "explicit-date";

/**
 * `standards` — defined by a published standard (GS1 General Specifications).
 * `pattern`   — a date-shaped token; useful, disclosed, not a brand algorithm.
 * `none`      — no documented decoder exists for this brand's lot format.
 */
export type DecoderConfidence = "standards" | "pattern" | "none";

export type EvidenceKind = "standard" | "regulation" | "brand-site" | "none";

export type EvidenceRef = {
  label: string;
  /** Public reference; `null` when no published source exists. */
  url: string | null;
  kind: EvidenceKind;
};

export type ShelfLife = {
  /** Months of unopened shelf life, or null when no guidance can be justified. */
  months: number | null;
  note: string;
  source: string;
  confidence: "guidance" | "none";
};

export type BrandRecord = {
  slug: string;
  name: string;
  aliases: string[];
  parentGroup: string;
  categories: ProductCategory[];
  /**
   * Decoder the *brand's own* lot format uses. Nearly every cosmetics brand
   * keeps this proprietary and unpublished, so this is `none` almost
   * everywhere — that is the honest data, not a missing implementation.
   */
  decoderId: DecoderId;
  decoderVersion: string;
  decoderStatus: DecoderConfidence;
  /** What the lot code looks like, as far as public guidance allows. */
  pattern: string;
  /** How a date would be extracted, or why none can be. */
  dateLogic: string;
  /** Which source would confirm a decoder, and whether it exists publicly. */
  source: EvidenceRef;
  limitation: string;
  shelfLife: ShelfLife;
  /** Brand website used for "ask the brand" guidance, when known. */
  officialGuidance: EvidenceRef | null;
  /** ISO date of the last manual review of this record; null = never reviewed. */
  lastVerified: string | null;
};

export type PaoMonths = 3 | 6 | 9 | 12 | 18 | 24 | 36;

export type DateInputs = {
  /** `YYYY-MM-DD` as printed, or "". */
  printedManufacture: string;
  printedExpiry: string;
  purchase: string;
  opened: string;
  pao: PaoMonths | null;
};

export type DateSource =
  | "printed"
  | "gs1"
  | "pattern"
  | "manufacture-plus-shelf-life"
  | "opened-plus-pao";

export type DateFact = {
  /** `YYYY-MM-DD`. */
  date: string;
  source: DateSource;
  /** Human sentence naming the calculation, shown next to the date. */
  method: string;
  confidence: "verified" | "estimated";
  /** Which evidence supports it. */
  evidence: string;
};

export type DecoderVerdict = {
  id: DecoderId;
  version: string;
  status: "verified" | "estimated" | "undecodable";
  headline: string;
  detail: string;
  /** The literal substring the decoder matched, when there is one. */
  match: string | null;
  evidence: string;
};

export type CheckResult = {
  brand: BrandRecord;
  code: string;
  productName: string;
  categories: ProductCategory[];
  verdict: DecoderVerdict;
  manufacture: DateFact | null;
  printedExpiry: DateFact | null;
  estimatedExpiry: DateFact | null;
  paoExpiry: DateFact | null;
  /** The date that governs the "expires" question: printed beats estimated. */
  effectiveExpiry: DateFact | null;
  ageMonths: number | null;
  remainingDays: number | null;
  /** Every date-shaped reading found in the code, when the pattern matched one. */
  candidates: { date: string; match: string; interpretation: string }[];
  warnings: string[];
  notes: string[];
  checkedOn: string;
};

export type CheckInput = {
  brandSlug: string;
  code: string;
  productName?: string;
  dates: DateInputs;
  /** `YYYY-MM-DD` "today" for deterministic calculations and tests. */
  today?: string;
};

export type CheckOutcome =
  | { ok: true; result: CheckResult }
  | { ok: false; problems: { code: string; message: string }[] };
