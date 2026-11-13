/**
 * Format-specific normalisation and validation.
 *
 * Two rules shape this file:
 *   1. Never silently produce a barcode from invalid input — every rejection
 *      carries an example the user can paste.
 *   2. Where a check digit is missing, compute it and say so, rather than
 *      refusing a perfectly good 12-digit EAN payload.
 */
import {
  code39CheckChar,
  gtinCheckDigit,
  gtinCheckOk,
  msiMod10,
  msiMod11,
  upceToUpca,
} from "./checksums";
import { parseGs1, type Gs1Field } from "./gs1";
import type {
  BarcodeEncodeOptions,
  BarcodeFormatId,
  BarcodeNumberSystem,
  BarcodeProblem,
} from "./types";

export type NormalizedBarcode = {
  /** Canonical data handed to the encoder. */
  value: string;
  /** What the human-readable line prints. */
  display: string;
  notes: string[];
  warnings: string[];
  /** Present only for GS1-128. */
  gs1?: { hri: string; encoded: string; fields: Gs1Field[] };
};

export type NormalizeResult =
  | { ok: true; normalized: NormalizedBarcode }
  | { ok: false; problems: BarcodeProblem[] };

export const CODE39_CHARSET = /^[0-9A-Z\-. $/+%]+$/;
const CODE39_HINT = "ABC-1234";

function fail(
  code: BarcodeProblem["code"],
  message: string,
  example?: string,
): NormalizeResult {
  return { ok: false, problems: [{ code, message, example }] };
}

function digitsOnly(
  value: string,
  label: string,
  example: string,
): NormalizeResult | null {
  if (!/^\d+$/.test(value))
    return fail(
      "charset",
      `${label} only accepts digits — remove letters, spaces and punctuation.`,
      example,
    );
  return null;
}

/**
 * GTIN-style format: N digits of data (check digit computed) or N+1 digits
 * including a check digit (verified).
 */
function fixedNumeric(options: {
  raw: string;
  label: string;
  dataLength: number;
  example: string;
}): NormalizeResult {
  const { raw, label, dataLength, example } = options;
  const value = raw.replace(/\s+/g, "");
  if (!value)
    return fail("empty", `Enter ${dataLength} digits for ${label}.`, example);
  const invalid = digitsOnly(value, label, example);
  if (invalid) return invalid;
  if (value.length === dataLength) {
    const check = gtinCheckDigit(value);
    if (check === null)
      return fail(
        "checksum",
        `${label} check digit could not be computed.`,
        example,
      );
    return {
      ok: true,
      normalized: {
        value: `${value}${check}`,
        display: `${value}${check}`,
        notes: [`Check digit ${check} was calculated for you.`],
        warnings: [],
      },
    };
  }
  if (value.length === dataLength + 1) {
    if (!gtinCheckOk(value))
      return fail(
        "checksum",
        `${label} check digit is wrong: the last digit of ${value} should be ${gtinCheckDigit(value.slice(0, -1))}. Fix it or drop the check digit and QUICKKIT will calculate it.`,
        example,
      );
    return {
      ok: true,
      normalized: {
        value,
        display: value,
        notes: ["Check digit verified."],
        warnings: [],
      },
    };
  }
  return fail(
    "length",
    `${label} needs ${dataLength} digits (the check digit is added) or ${dataLength + 1} digits including the check digit — you entered ${value.length}.`,
    example,
  );
}

function numberSystemOf(options: BarcodeEncodeOptions): BarcodeNumberSystem {
  return options.numberSystem === 1 ? 1 : 0;
}

function normalizeEan13(raw: string): NormalizeResult {
  return fixedNumeric({
    raw,
    label: "EAN-13",
    dataLength: 12,
    example: "590123412345",
  });
}

function normalizeEan8(raw: string): NormalizeResult {
  return fixedNumeric({
    raw,
    label: "EAN-8",
    dataLength: 7,
    example: "9638507",
  });
}

function normalizeUpca(raw: string): NormalizeResult {
  return fixedNumeric({
    raw,
    label: "UPC-A",
    dataLength: 11,
    example: "03600029145",
  });
}

function normalizeItf14(raw: string): NormalizeResult {
  return fixedNumeric({
    raw,
    label: "ITF-14",
    dataLength: 13,
    example: "1234567890123",
  });
}

function normalizeUpce(
  raw: string,
  options: BarcodeEncodeOptions,
): NormalizeResult {
  const value = raw.replace(/\s+/g, "");
  const example = "01234565";
  if (!value)
    return fail("empty", "Enter the 6 digits of a UPC-E code.", example);
  const invalid = digitsOnly(value, "UPC-E", example);
  if (invalid) return invalid;

  let numberSystem: BarcodeNumberSystem = numberSystemOf(options);
  let middle: string;
  let check: string | null = null;

  if (value.length === 6) {
    middle = value;
  } else if (value.length === 7) {
    if (value[0] !== "0" && value[0] !== "1")
      return fail(
        "charset",
        "A 7-digit UPC-E starts with the number system (0 or 1). Drop that digit and the studio will use the number system you selected.",
        example,
      );
    numberSystem = value[0] === "1" ? 1 : 0;
    middle = value.slice(1);
  } else if (value.length === 8) {
    if (value[0] !== "0" && value[0] !== "1")
      return fail(
        "charset",
        "The first of the 8 digits must be the number system (0 or 1).",
        example,
      );
    numberSystem = value[0] === "1" ? 1 : 0;
    middle = value.slice(1, 7);
    check = value[7];
  } else {
    return fail(
      "length",
      "UPC-E takes 6 data digits, 7 digits (number system + 6) or 8 digits including the check digit.",
      example,
    );
  }

  const upca = upceToUpca(middle, numberSystem);
  if (!upca)
    return fail(
      "checksum",
      "UPC-E data could not be expanded to UPC-A.",
      example,
    );
  const computed = upca.slice(-1);
  if (check !== null && check !== computed)
    return fail(
      "checksum",
      `UPC-E check digit is ${check} but ${middle} expands to UPC-A ${upca}, which needs ${computed}.`,
      example,
    );
  const full = `${numberSystem}${middle}${computed}`;
  return {
    ok: true,
    normalized: {
      value: full,
      display: full,
      notes: [
        `Expands to UPC-A ${upca}.`,
        check === null
          ? `Check digit ${computed} was calculated for you.`
          : "Check digit verified.",
      ],
      warnings: [],
    },
  };
}

function normalizeCode128(raw: string): NormalizeResult {
  const value = raw;
  if (!value.trim())
    return fail("empty", "Enter the data to encode.", "QUICKKIT-2026");
  // Code 128 set B spans printable ASCII; set A adds control characters that no
  // keyboard can type and no label should carry. Anything outside is rejected.
  const bad = [...value].find((char) => {
    const code = char.codePointAt(0) ?? 0;
    return code < 32 || code > 126;
  });
  if (bad)
    return fail(
      "charset",
      `Code 128 here accepts printable ASCII only. "${bad}" (U+${(bad.codePointAt(0) ?? 0).toString(16).toUpperCase().padStart(4, "0")}) cannot be encoded — replace it with a plain character.`,
      "QUICKKIT-2026",
    );
  if (value.length > 80)
    return fail(
      "length",
      `Code 128 data is capped at 80 characters in this studio (${value.length} entered).`,
      "QUICKKIT-2026",
    );
  return {
    ok: true,
    normalized: { value, display: value, notes: [], warnings: [] },
  };
}

function normalizeCode39(
  raw: string,
  options: BarcodeEncodeOptions,
): NormalizeResult {
  const trimmed = raw;
  if (!trimmed.trim())
    return fail("empty", "Enter the data to encode.", CODE39_HINT);
  const upper = trimmed.toUpperCase();
  const lower = trimmed !== upper;
  if (!CODE39_CHARSET.test(upper))
    return fail(
      "charset",
      "Code 39 accepts 0-9, A-Z, space and - . $ / + % only. Lowercase letters are converted to uppercase.",
      CODE39_HINT,
    );
  if (upper.length > 48)
    return fail(
      "length",
      `Code 39 is capped at 48 characters here (${upper.length} entered).`,
      CODE39_HINT,
    );
  let value = upper;
  const notes: string[] = [];
  if (lower)
    notes.push(
      "Lowercase letters were converted to uppercase — Code 39 has no lowercase set.",
    );
  if (options.checksum === "mod43") {
    const check = code39CheckChar(value);
    if (!check)
      return fail(
        "checksum",
        "The mod-43 check character could not be computed for that data.",
        CODE39_HINT,
      );
    value += check;
    notes.push(`Mod-43 check character "${check}" was appended.`);
  }
  return {
    ok: true,
    normalized: { value, display: value, notes, warnings: [] },
  };
}

function normalizeCodabar(
  raw: string,
  options: BarcodeEncodeOptions,
): NormalizeResult {
  const start = options.codabarStart ?? "A";
  const upper = raw.toUpperCase().trim();
  if (!upper)
    return fail(
      "empty",
      "Enter digits (and optionally - $ : / . +) for Codabar.",
      "1234567890",
    );
  const stripped = upper.replace(/^[A-D]/, "").replace(/[A-D]$/, "");
  if (!stripped)
    return fail(
      "empty",
      "Codabar needs at least one data character between the start and stop symbols.",
      "1234567890",
    );
  if (!/^[0-9\-$:/.+]+$/.test(stripped))
    return fail(
      "charset",
      "Codabar data accepts 0-9 and the symbols - $ : / . + — the start/stop letters A–D are added for you.",
      "1234567890",
    );
  if (stripped.length > 40)
    return fail(
      "length",
      `Codabar is capped at 40 data characters here (${stripped.length} entered).`,
      "1234567890",
    );
  return {
    ok: true,
    normalized: {
      value: `${start}${stripped}${start}`,
      display: stripped,
      notes: [`Start and stop character "${start}" was added.`],
      warnings: [],
    },
  };
}

function normalizeMsi(
  raw: string,
  options: BarcodeEncodeOptions,
): NormalizeResult {
  const value = raw.replace(/\s+/g, "");
  if (!value) return fail("empty", "Enter digits for MSI.", "1234567890");
  const invalid = digitsOnly(value, "MSI", "1234567890");
  if (invalid) return invalid;
  if (value.length > 24)
    return fail(
      "length",
      `MSI is capped at 24 digits here (${value.length} entered).`,
      "1234567890",
    );
  const checksum = options.checksum ?? "none";
  if (checksum === "mod10" || checksum === "mod11") {
    const check = checksum === "mod10" ? msiMod10(value) : msiMod11(value);
    if (check === null)
      return fail(
        "checksum",
        checksum === "mod10"
          ? "The MSI mod-10 check digit could not be computed."
          : "MSI mod-11 needs a check value below 10; this payload computes 10, which cannot be encoded. Change a digit or use mod-10.",
        "1234567890",
      );
    return {
      ok: true,
      normalized: {
        value: `${value}${check}`,
        display: `${value}${check}`,
        notes: [
          `MSI ${checksum === "mod10" ? "mod-10" : "mod-11"} check digit ${check} was appended.`,
        ],
        warnings: [],
      },
    };
  }
  return {
    ok: true,
    normalized: { value, display: value, notes: [], warnings: [] },
  };
}

function normalizePharmacode(raw: string): NormalizeResult {
  const value = raw.trim();
  if (!value)
    return fail("empty", "Enter a number between 3 and 131070.", "1234");
  if (!/^\d+$/.test(value))
    return fail("charset", "Pharmacode is numeric only.", "1234");
  const number = Number(value);
  if (!Number.isFinite(number) || number < 3 || number > 131070)
    return fail(
      "range",
      "Pharmacode covers 3 to 131070. Below 3 there is nothing to encode; above it, a scanner cannot resolve the bars.",
      "1234",
    );
  return {
    ok: true,
    normalized: {
      value: String(number),
      display: String(number),
      notes: [`Encoded as ${Math.round(Math.log2(number + 1))} bars.`],
      warnings: [],
    },
  };
}

function normalizeGs1(raw: string): NormalizeResult {
  // An empty field should ask for data, not explain the GS1 syntax.
  if (!raw.trim())
    return fail(
      "empty",
      "Enter the GS1 element string to encode.",
      "(01)09501101530003(17)251231(10)LOT-42",
    );
  const parsed = parseGs1(raw);
  if (!parsed.ok)
    return fail(
      parsed.code,
      parsed.message,
      "(01)09501101530003(17)251231(10)LOT-42",
    );
  return {
    ok: true,
    normalized: {
      value: parsed.hri,
      display: parsed.hri,
      notes: [
        `${parsed.fields.length} application identifier${parsed.fields.length === 1 ? "" : "s"} validated: ${parsed.fields.map((field) => `(${field.ai})`).join(" ")}.`,
        parsed.encoded.includes("\u001d")
          ? "GS separators were inserted after every variable-length field."
          : "No GS separator was needed: every field has a fixed length or is last.",
      ],
      warnings: [],
      gs1: { hri: parsed.hri, encoded: parsed.encoded, fields: parsed.fields },
    },
  };
}

/** Format the encoder accepts, after normalisation. */
export function normalizeBarcode(
  format: BarcodeFormatId,
  raw: string,
  options: BarcodeEncodeOptions = {},
): NormalizeResult {
  switch (format) {
    case "code128":
      return normalizeCode128(raw);
    case "code39":
      return normalizeCode39(raw, options);
    case "ean13":
      return normalizeEan13(raw);
    case "ean8":
      return normalizeEan8(raw);
    case "upca":
      return normalizeUpca(raw);
    case "upce":
      return normalizeUpce(raw, options);
    case "itf14":
      return normalizeItf14(raw);
    case "codabar":
      return normalizeCodabar(raw, options);
    case "msi":
      return normalizeMsi(raw, options);
    case "pharmacode":
      return normalizePharmacode(raw);
    case "gs1-128":
      return normalizeGs1(raw);
    default:
      return fail("unsupported", "That barcode format is not available.");
  }
}
