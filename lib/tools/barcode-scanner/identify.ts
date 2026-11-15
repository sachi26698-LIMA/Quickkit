/**
 * What did the scanner actually read?
 *
 * A decoded string is not automatically a product number. `0731946697725` is a
 * GTIN-13; `(01)09506000134352(10)LOT-42` is a GS1 element string that contains
 * one; `https://example.com/01/09506000134352` is a Digital Link that contains
 * one too; `INV-2026-0042` is none of those and must not be sent to a product
 * database as if it were.
 *
 * This module answers that question once, so the scanner, the lookup and the
 * result card cannot disagree about what a value is.
 */
import { gtinCheckDigit, gtinCheckOk } from "@/lib/tools/barcode/checksums";
import {
  parseDigitalLink,
  parseGs1Input,
  type ExplainedField,
} from "@/lib/tools/gs1/engine";

export type GtinFormat = "GTIN-8" | "GTIN-12" | "GTIN-13" | "GTIN-14";

export type GtinIdentity = {
  kind: "gtin";
  /** The digits exactly as decoded. */
  gtin: string;
  digits: 8 | 12 | 13 | 14;
  format: GtinFormat;
  checkDigitOk: boolean;
  checkDigitFound: number;
  checkDigitExpected: number | null;
  /** Zero-padded GTIN-14 for comparing across formats; null when invalid. */
  canonical14: string | null;
  /** What a product database should be asked about — null when unverifiable. */
  lookupGtin: string | null;
  /** One sentence a reader can check. */
  note: string;
};

export type Gs1Identity = {
  kind: "gs1";
  form: "element-string" | "digital-link";
  fields: ExplainedField[];
  hri: string;
  encoded: string;
  warnings: string[];
  /** AI (01) / (8006) GTIN when the carrier has one and it validates. */
  gtin: string | null;
  lookupGtin: string | null;
  link?: { url: string; origin: string; primary: string };
};

export type TextIdentity = {
  kind: "text";
  /** Why this value is not a product identifier. */
  reason: string;
  /** Only set when the value looks like a GTIN but fails its check digit. */
  failedGtin: {
    gtin: string;
    format: GtinFormat;
    checkDigitFound: number;
    checkDigitExpected: number | null;
  } | null;
  lookupGtin: null;
};

export type ScanIdentity = GtinIdentity | Gs1Identity | TextIdentity;

const GTIN_LENGTHS = [8, 12, 13, 14] as const;

function formatFor(length: number): GtinFormat | null {
  if (length === 8) return "GTIN-8";
  if (length === 12) return "GTIN-12";
  if (length === 13) return "GTIN-13";
  if (length === 14) return "GTIN-14";
  return null;
}

function gtinIdentity(digits: string): GtinIdentity {
  const length = digits.length as 8 | 12 | 13 | 14;
  const format = formatFor(length) as GtinFormat;
  const ok = gtinCheckOk(digits);
  const expected = gtinCheckDigit(digits.slice(0, -1));
  const found = Number(digits.slice(-1));
  return {
    kind: "gtin",
    gtin: digits,
    digits: length,
    format,
    checkDigitOk: ok,
    checkDigitFound: found,
    checkDigitExpected: expected,
    canonical14: ok
      ? length === 14
        ? digits
        : digits.padStart(14, "0")
      : null,
    lookupGtin: ok ? digits : null,
    note: ok
      ? `${format} with a correct check digit (${found}).`
      : `${format} whose check digit is wrong: the last digit is ${found}, but the preceding digits require ${expected ?? "a digit this value cannot produce"}. Nothing will be looked up for it.`,
  };
}

/** Digital Link, then GS1 element string, then a bare GTIN, then plain text. */
export function classifyScan(raw: string): ScanIdentity {
  const value = raw.trim();
  if (!value)
    return {
      kind: "text",
      reason: "Nothing was decoded.",
      failedGtin: null,
      lookupGtin: null,
    };

  const looksLikeUrl = /^https?:\/\//i.test(value);
  if (looksLikeUrl) {
    const parsed = parseDigitalLink(value);
    if (parsed.ok && parsed.kind === "digital-link") {
      const gtinField = parsed.fields.find((field) => field.ai === "01");
      const candidate = gtinField?.value ?? null;
      const valid = candidate ? gtinCheckOk(candidate) : false;
      return {
        kind: "gs1",
        form: "digital-link",
        fields: parsed.fields,
        hri: parsed.hri,
        encoded: parsed.encoded,
        warnings: parsed.warnings,
        gtin: valid ? candidate : null,
        lookupGtin: valid ? candidate : null,
        link: parsed.link,
      };
    }
    return {
      kind: "text",
      reason:
        "This is a URL, but not a GS1 Digital Link — it carries no GS1 Application Identifier path or query, so there is no product number to look up.",
      failedGtin: null,
      lookupGtin: null,
    };
  }

  // A person typing a number reads it in groups ("0731 9466 97725"); the
  // separators are formatting, not data, so they are removed before deciding.
  const compact = value.replace(/[\s-]/g, "");
  const digitsOnly = /^\d+$/.test(compact);
  const possibleGtinLength = GTIN_LENGTHS.includes(
    compact.length as (typeof GTIN_LENGTHS)[number],
  );

  // A bare run of digits is a GTIN candidate first: a 13-digit value beginning
  // "01" is far more likely an EAN-13 than AI (01) with three stray digits.
  if (digitsOnly && possibleGtinLength) {
    const identity = gtinIdentity(compact);
    if (identity.checkDigitOk) return identity;
    // Fall through: a longer string that merely starts with digits may still be
    // a GS1 element string with a bad GTIN, which is worth explaining as such.
    const parsed = parseGs1Input(value);
    if (
      parsed.ok &&
      parsed.kind === "element-string" &&
      parsed.fields.length > 1
    )
      return gs1Identity(parsed, "element-string");
    return {
      kind: "text",
      reason: `${identity.format} whose check digit does not validate, so it is not a usable product identifier.`,
      failedGtin: {
        gtin: identity.gtin,
        format: identity.format,
        checkDigitFound: identity.checkDigitFound,
        checkDigitExpected: identity.checkDigitExpected,
      },
      lookupGtin: null,
    };
  }

  if (!digitsOnly) {
    // HRI form, FNC1/group separators, or an element string that starts with a
    // fixed-length AI such as (01) or (8006).
    const looksGs1 =
      /\(\d{2,4}\)/.test(value) ||
      value.includes("\u001d") ||
      /^(01|8006|00)\d/.test(value);
    if (looksGs1) {
      const parsed = parseGs1Input(value);
      if (parsed.ok && parsed.kind !== "digital-link")
        return gs1Identity(parsed, "element-string");
      if (!parsed.ok)
        // The GS1 parser refuses for a specific reason (a failing check digit,
        // an unknown AI, a truncated field). Quoting it is more useful than
        // telling the reader their label is "plain text".
        return {
          kind: "text",
          reason: parsed.hint
            ? `${parsed.message} ${parsed.hint}`
            : parsed.message,
          failedGtin: null,
          lookupGtin: null,
        };
    }
  } else if (compact.length > 14) {
    const parsed = parseGs1Input(value);
    if (parsed.ok && parsed.kind === "element-string")
      return gs1Identity(parsed, "element-string");
  }

  return {
    kind: "text",
    reason: digitsOnly
      ? `A ${compact.length}-digit value, which is not one of the GTIN lengths (8, 12, 13 or 14). It is shown as decoded content, not treated as a product number.`
      : "Plain text or an internal reference. It is not a GTIN, a GS1 element string or a GS1 Digital Link, so there is no product to look up.",
    failedGtin: null,
    lookupGtin: null,
  };
}

function gs1Identity(
  parsed: Extract<ReturnType<typeof parseGs1Input>, { ok: true }>,
  form: "element-string" | "digital-link",
): Gs1Identity {
  const gtinField = parsed.fields.find(
    (field) => field.ai === "01" || field.ai === "8006",
  );
  const candidate = gtinField?.value ?? null;
  const valid = candidate ? gtinCheckOk(candidate) : false;
  return {
    kind: "gs1",
    form,
    fields: parsed.fields,
    hri: parsed.hri,
    encoded: parsed.encoded,
    warnings: parsed.warnings,
    gtin: valid ? candidate : null,
    lookupGtin: valid ? candidate : null,
    ...(parsed.link ? { link: parsed.link } : {}),
  };
}

/** The GTIN to look up, or null when there is nothing legitimate to ask about. */
export function lookupGtinFor(identity: ScanIdentity): string | null {
  return identity.lookupGtin;
}

/** Short label for a result badge. */
export function identityLabel(identity: ScanIdentity): string {
  if (identity.kind === "gtin") return identity.format;
  if (identity.kind === "gs1")
    return identity.form === "digital-link"
      ? "GS1 Digital Link"
      : "GS1 element string";
  return "Decoded text";
}

/** Symbologies that can legitimately carry a retail GTIN. */
const GTIN_CARRIERS = new Set([
  "ean13",
  "ean8",
  "upca",
  "upce",
  "itf14",
  "databar",
  "databarexpanded",
  "gs1-128",
  "qrcode",
  "datamatrix",
  "pdf417",
  "aztec",
]);

/** Does this symbology commonly carry a product number? */
export function carrierSuitsGtin(format: string | null | undefined): boolean {
  return Boolean(format && GTIN_CARRIERS.has(format));
}
