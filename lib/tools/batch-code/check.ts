/**
 * The check itself.
 *
 * Order of operations is the argument this tool makes:
 *   1. validate the input honestly (no silent corrections),
 *   2. decode only what has evidence,
 *   3. keep printed, decoded, shelf-life and PAO dates in separate boxes,
 *   4. let the printed date win.
 */
import { gtinCheckOk } from "@/lib/tools/barcode/checksums";
import { brandBySlug } from "@/lib/tools/batch-code/brands";
import {
  BRAND_DECODERS,
  decodeBrandCode,
  type BrandDecoder,
} from "@/lib/tools/batch-code/brand-decoders";
import {
  addMonths,
  daysBetween,
  decodeCode,
  formatDate,
  isIsoDate,
  monthsBetween,
  todayIso,
} from "@/lib/tools/batch-code/decoders";
import { PAO_GUIDANCE } from "@/lib/tools/batch-code/shelf-life";
import type {
  BrandRecord,
  CheckInput,
  CheckOutcome,
  DateFact,
  PaoMonths,
} from "@/lib/tools/batch-code/types";

export const VERDICT_LABELS = {
  verified: "VERIFIED",
  estimated: "ESTIMATED",
  undecodable: "NOT DECODABLE",
} as const;

export const VERDICT_TONE = {
  verified: "verified",
  estimated: "estimated",
  undecodable: "undecodable",
} as const;

// Lot codes, GS1 element strings and GS1 Digital Link URIs are all accepted in
// this one field. Angle brackets and control characters are still rejected.
const CODE_PATTERN = /^[A-Za-z0-9 ()./+&#*_:=?%@-]+$/;
const MAX_CODE = 200;
const MAX_NAME = 80;
const PAO_VALUES = PAO_GUIDANCE.map((entry) => entry.months);

export function cleanText(value: string, max = MAX_NAME) {
  return value
    .replace(/[\u0000-\u001f\u007f<>]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

export function normalizeCode(value: string) {
  return value.replace(/\s+/g, " ").trim().toUpperCase();
}

function problem(code: string, message: string) {
  return { code, message };
}

export type CheckOptions = {
  /**
   * Brand decoder registry. Real callers use the default (empty until a
   * manufacturer document exists); tests inject fixtures to prove the path.
   */
  brandDecoders?: readonly BrandDecoder[];
};

export function checkBatchCode(
  input: CheckInput,
  options: CheckOptions = {},
): CheckOutcome {
  const problems: { code: string; message: string }[] = [];

  const brand: BrandRecord | undefined = brandBySlug(input.brandSlug);
  if (!brand)
    problems.push(
      problem(
        "brand",
        "Pick a brand from the list. An unknown brand cannot be checked, because there is no record to check it against.",
      ),
    );

  const code = normalizeCode(input.code ?? "");
  if (!code)
    problems.push(
      problem("code", "Enter the batch or lot code printed on the pack."),
    );
  else if (code.length < 2)
    problems.push(
      problem("code", "A batch code needs at least two characters."),
    );
  else if (code.length > MAX_CODE)
    problems.push(
      problem("code", `Batch codes are at most ${MAX_CODE} characters.`),
    );
  else if (!CODE_PATTERN.test(code))
    problems.push(
      problem(
        "code",
        "That code contains characters a printed lot number does not use. Letters, digits, spaces and ( ) . / + & # * - _ are accepted.",
      ),
    );

  const productName = cleanText(input.productName ?? "");
  const { printedManufacture, printedExpiry, purchase, opened, pao } =
    input.dates;
  const today =
    input.today && isIsoDate(input.today) ? input.today : todayIso();

  const dateFields: {
    key: keyof typeof input.dates;
    value: string;
    label: string;
  }[] = [
    {
      key: "printedManufacture",
      value: printedManufacture,
      label: "printed manufacture date",
    },
    {
      key: "printedExpiry",
      value: printedExpiry,
      label: "printed expiry date",
    },
    { key: "purchase", value: purchase, label: "purchase date" },
    { key: "opened", value: opened, label: "opened date" },
  ];
  for (const field of dateFields) {
    if (field.value && !isIsoDate(field.value))
      problems.push(
        problem(field.key, `The ${field.label} is not a real calendar date.`),
      );
  }

  if (pao !== null && pao !== undefined && !PAO_VALUES.includes(pao))
    problems.push(
      problem(
        "pao",
        "Choose a PAO value from the open-jar symbol (3–36 months).",
      ),
    );

  if (
    isIsoDate(printedManufacture) &&
    isIsoDate(printedExpiry) &&
    printedManufacture > printedExpiry
  )
    problems.push(
      problem(
        "printedExpiry",
        "The printed expiry date cannot be earlier than the manufacture date.",
      ),
    );

  if (isIsoDate(opened) && opened > today)
    problems.push(
      problem("opened", "The opened date cannot be in the future."),
    );
  if (isIsoDate(purchase) && purchase > today)
    problems.push(
      problem("purchase", "The purchase date cannot be in the future."),
    );

  if (problems.length || !brand) return { ok: false, problems };

  const decoded = decodeCode(brand, code);
  const brandDecoded = decodeBrandCode(
    brand.slug,
    code,
    options.brandDecoders ?? BRAND_DECODERS,
  );
  const todayLabel = formatDate(today);
  const warnings: string[] = [];
  const notes: string[] = [];

  /* ------------------------------ manufacture ----------------------------- */
  let manufacture: DateFact | null = null;
  if (isIsoDate(printedManufacture)) {
    manufacture = {
      date: printedManufacture,
      source: "printed",
      method: "Printed on the pack — read directly from the packaging",
      confidence: "verified",
      evidence: "Manufacturer-printed date",
    };
  } else if (brandDecoded) {
    manufacture = {
      date: brandDecoded.result.date,
      source: "brand-decoder",
      method: `Decoded by the ${brand.name} lot-code rule recorded for this brand (${brandDecoded.decoder.id} v${brandDecoded.decoder.version}): ${brandDecoded.result.explanation}`,
      confidence: "verified",
      evidence: `${brandDecoded.decoder.evidence.label} — ${brandDecoded.decoder.evidence.url} (read ${brandDecoded.decoder.evidence.verifiedOn})`,
    };
  } else if (decoded.manufacture) {
    const fromStandards = decoded.verdict.status === "verified";
    manufacture = {
      date: decoded.manufacture,
      source: fromStandards ? "gs1" : "pattern",
      method: fromStandards
        ? `Decoded from the GS1 element string as ${decoded.verdict.match ?? "a date field"}`
        : `Matched the date-shaped token "${decoded.verdict.match}" in the lot code`,
      confidence: fromStandards ? "verified" : "estimated",
      evidence: decoded.verdict.evidence,
    };
    if (!fromStandards)
      warnings.push(
        "The manufacture date is inferred from the digits in the code, not from the brand's own algorithm. Treat it as an inference.",
      );
  }

  /* ---------------------------- printed expiry ---------------------------- */
  let printedExpiryFact: DateFact | null = null;
  if (isIsoDate(printedExpiry)) {
    printedExpiryFact = {
      date: printedExpiry,
      source: "printed",
      method: "Printed on the pack — read directly from the packaging",
      confidence: "verified",
      evidence: "Manufacturer-printed date",
    };
  }

  /* ------------------------- standards date facts -------------------------- */
  const decodedDates = decoded.gs1?.dates ?? [];
  const gs1Expiry = decodedDates.find(
    (entry) => entry.ai === "17" || entry.ai === "7003",
  );
  const gs1BestBefore = decodedDates.find(
    (entry) => entry.ai === "15" || entry.ai === "16",
  );
  const governingGs1Date = gs1Expiry ?? gs1BestBefore;
  let decodedExpiry: DateFact | null = null;
  if (governingGs1Date) {
    decodedExpiry = {
      date: governingGs1Date.date,
      source: "gs1",
      method: `AI ${governingGs1Date.ai} — ${governingGs1Date.label}${governingGs1Date.time ? ` at ${governingGs1Date.time}` : ""}`,
      confidence: "verified",
      evidence: "GS1 General Specifications date application identifier",
    };
  }

  /* --------------------------- estimate + PAO ----------------------------- */
  const shelfMonths = brand.shelfLife.months;
  let estimatedExpiry: DateFact | null = null;
  if (manufacture && shelfMonths !== null) {
    const date = addMonths(manufacture.date, shelfMonths);
    if (date)
      estimatedExpiry = {
        date,
        source: "manufacture-plus-shelf-life",
        method: `Manufacture date + ${shelfMonths} months of category shelf-life guidance`,
        confidence: "estimated",
        evidence: brand.shelfLife.source,
      };
  }

  let paoExpiry: DateFact | null = null;
  if (isIsoDate(opened) && isinstancePao(pao)) {
    const date = addMonths(opened, pao);
    if (date)
      paoExpiry = {
        date,
        source: "opened-plus-pao",
        method: `Opened date + ${pao}M period-after-opening`,
        confidence: "verified",
        evidence:
          "Period after opening (open-jar symbol), EU Regulation 1223/2009 Annex VIII",
      };
  }

  /* ------------------------- governing expiry ----------------------------- */
  const effectiveExpiry =
    printedExpiryFact ?? decodedExpiry ?? estimatedExpiry ?? paoExpiry;

  /* ------------------------------- warnings ------------------------------- */
  if (decoded.verdict.status === "undecodable")
    warnings.push(
      `The code "${code}" cannot be decoded for ${brand.name}. It is treated as a lot number only, and no date is claimed from it.`,
    );

  if (
    printedExpiryFact &&
    decodedExpiry &&
    printedExpiryFact.date !== decodedExpiry.date
  )
    warnings.push(
      `The printed expiry date (${formatDate(printedExpiryFact.date)}) differs from the GS1 date in the code (${formatDate(decodedExpiry.date)}, AI ${governingGs1Date!.ai}). Both are shown; the printed date governs.`,
    );

  if (decodedDates.length && !governingGs1Date)
    warnings.push(
      "The GS1 carrier holds a production or packaging date but no expiration or best-before date, so the estimate below is the only forward-looking figure.",
    );

  if (decoded.candidates.length > 1)
    warnings.push(
      "More than one date-shaped reading exists in this code. The alternatives are listed below; the packaging decides which is real.",
    );

  // A GS1 carrier can define an expiry with no printed date, no estimate and no
  // PAO window. Without `decodedExpiry` here, a VERIFIED result contradicted
  // itself by also warning that no usable date had come out of the check.
  if (!printedExpiryFact && !estimatedExpiry && !paoExpiry && !decodedExpiry)
    warnings.push(
      "No usable date came out of this check. Nothing is estimated, because no date and no defensible shelf-life guidance were available.",
    );

  if (printedExpiryFact && printedExpiryFact.date < today)
    warnings.push(
      `The printed expiry date (${formatDate(printedExpiryFact.date)}) has already passed.`,
    );

  if (paoExpiry && paoExpiry.date < today)
    warnings.push(
      `The period after opening ended on ${formatDate(paoExpiry.date)}. It is not a guarantee that the product is unsafe — it is the point after which the manufacturer no longer stands behind it.`,
    );

  if (estimatedExpiry && estimatedExpiry.date < today)
    warnings.push(
      `The estimated expiry (${formatDate(estimatedExpiry.date)}) is in the past. This figure is guidance, not a manufacturer statement.`,
    );

  if (manufacture && manufacture.date > today)
    warnings.push(
      `The manufacture date (${formatDate(manufacture.date)}) is in the future — re-check the pack.`,
    );

  if (
    manufacture &&
    isIsoDate(printedManufacture) &&
    decoded.verdict.status === "estimated"
  )
    notes.push(
      "A date-shaped token exists in the code, but the printed manufacture date you entered takes precedence over it.",
    );

  if (decoded.gs1?.batch && decoded.gs1.batch.toUpperCase() !== code)
    notes.push(
      `The GS1 string carries batch (AI 10) "${decoded.gs1.batch}", which differs from the code you typed. Both are shown rather than reconciled silently.`,
    );

  if (isGtinLike(code))
    notes.push(
      "This code looks like a GTIN (the product barcode). A GTIN identifies a product, not a batch or a date — the checker did not treat it as one.",
    );

  if (decoded.gs1?.carrier === "digital-link")
    notes.push(
      "The code was read as a GS1 Digital Link URI. The link itself was not opened or fetched: only the identifiers in the URI were decoded.",
    );

  if (decoded.gs1?.packagingDate && decoded.gs1?.productionDate)
    notes.push(
      `The carrier distinguishes a packaging date (${formatDate(decoded.gs1.packagingDate)}) from a production date (${formatDate(decoded.gs1.productionDate)}).`,
    );

  if (brand.officialGuidance?.url)
    notes.push(
      `For a definitive answer, ${brand.name} customer care can read the lot number: ${brand.officialGuidance.url}`,
    );
  notes.push(brand.limitation);
  if (brand.shelfLife.months !== null) notes.push(brand.shelfLife.note);

  const ageMonths = manufacture ? monthsBetween(manufacture.date, today) : null;
  const remainingDays = effectiveExpiry
    ? daysBetween(today, effectiveExpiry.date)
    : null;

  return {
    ok: true,
    result: {
      brand,
      code,
      productName,
      categories: brand.categories,
      verdict: decoded.verdict,
      manufacture,
      printedExpiry: printedExpiryFact,
      estimatedExpiry,
      paoExpiry,
      effectiveExpiry,
      ageMonths,
      remainingDays,
      candidates: decoded.candidates,
      decodedDates,
      decodedExpiry,
      warnings,
      notes,
      checkedOn: todayLabel,
    },
  };
}

function isinstancePao(
  value: PaoMonths | null | undefined,
): value is PaoMonths {
  return typeof value === "number" && PAO_VALUES.includes(value);
}

/** 8/12/13/14-digit codes with a valid GTIN check digit are product barcodes. */
function isGtinLike(code: string) {
  const digits = code.replace(/\D/g, "");
  if (![8, 12, 13, 14].includes(digits.length)) return false;
  return digits.length === code.length && gtinCheckOk(digits);
}
