/**
 * Unambiguous format detection for a typed or pasted value.
 *
 * This is deliberately conservative: it only names a format when the data
 * itself settles the question (an exact length with a valid GS1 check digit, a
 * GS1 element string, a Digital Link URL). Everything else returns a ranked
 * shortlist with a reason, and the UI shows the list instead of pretending to
 * know.
 */
import { gtinCheckOk } from "./checksums";
import type { BarcodeFormatId } from "./types";

export type Detection = {
  format: BarcodeFormatId;
  confidence: "certain" | "likely";
  reason: string;
};

export type DetectionResult = {
  best: Detection | null;
  candidates: Detection[];
  note?: string;
};

const GS1_HRI = /^\((\d{2,4})\)/;
const DIGITS = /^\d+$/;

function gtinDetection(digits: string): Detection[] {
  const found: Detection[] = [];
  const valid = gtinCheckOk(digits);

  if (digits.length === 12 && valid)
    found.push({
      format: "upca",
      confidence: "certain",
      reason: "12 digits with a valid GS1 check digit is a UPC-A number.",
    });

  if (digits.length === 13 && valid)
    found.push({
      format: "ean13",
      confidence: "certain",
      reason: digits.startsWith("0")
        ? "13 digits with a valid check digit. A leading zero usually means the same number is printed as UPC-A in North America."
        : "13 digits with a valid GS1 check digit is an EAN-13 number.",
    });

  if (digits.length === 8 && valid)
    found.push({
      format: "ean8",
      confidence: "certain",
      reason: "8 digits with a valid check digit is an EAN-8 number.",
    });

  if (digits.length === 14 && valid)
    found.push({
      format: "itf14",
      confidence: "certain",
      reason:
        "14 digits with a valid check digit is a GTIN-14, printed as ITF-14 on cases.",
    });

  if ((digits.length === 6 || digits.length === 7) && !found.length)
    found.push({
      format: "upce",
      confidence: "likely",
      reason:
        "6 digits (or 7 with the number system) matches UPC-E — but only the symbol itself can confirm zero-suppression.",
    });

  return found;
}

export function detectBarcodeFormat(input: string): DetectionResult {
  const value = input.trim();
  if (!value)
    return { best: null, candidates: [], note: "Enter a value first." };

  if (/^https?:\/\//i.test(value))
    return {
      best: {
        format: "gs1-128",
        confidence: "likely",
        reason:
          "This looks like a URL. If its path is /01/<gtin>/… it is a GS1 Digital Link and belongs in a QR code, not in a linear barcode.",
      },
      candidates: [],
      note: "A URL is encoded as a QR code. GS1 Digital Link URLs are validated on the GS1 Intelligence page.",
    };

  if (GS1_HRI.test(value)) {
    return {
      best: {
        format: "gs1-128",
        confidence: "certain",
        reason:
          "Bracketed application identifiers are GS1 data. GS1-128 carries them in a linear Code 128.",
      },
      candidates: [
        {
          format: "gs1-128",
          confidence: "certain",
          reason: "Linear GS1-128 (Code 128 with FNC1).",
        },
      ],
      note: "The same data can also be printed as a GS1 QR Code.",
    };
  }

  if (DIGITS.test(value)) {
    const candidates = gtinDetection(value);
    if (candidates.length) return { best: candidates[0], candidates };

    if (value.length >= 6 && value.length <= 14) {
      return {
        best: {
          format: "code128",
          confidence: "likely",
          reason: `The digits do not carry a valid GS1 check digit for their length, so no retail or logistics format can be assumed. Code 128 holds them exactly.`,
        },
        candidates: [
          {
            format: "code128",
            confidence: "likely",
            reason: "Any digit string is valid Code 128.",
          },
          {
            format: "code39",
            confidence: "likely",
            reason: "Code 39 also accepts digits, with a wider symbol.",
          },
        ],
      };
    }
  }

  if (/^[\dA-Z\-. $/+%]+$/.test(value) && /[A-Z]/.test(value)) {
    return {
      best: {
        format: "code39",
        confidence: "likely",
        reason:
          "Uppercase letters and the Code 39 symbols only — Code 39 can carry this exactly.",
      },
      candidates: [
        {
          format: "code39",
          confidence: "likely",
          reason: "Uppercase alphanumerics with - . $ / + %.",
        },
        {
          format: "code93",
          confidence: "likely",
          reason: "Code 93 is denser and carries the same characters.",
        },
        {
          format: "code128",
          confidence: "likely",
          reason:
            "Code 128 is denser still, and every modern scanner reads it.",
        },
      ],
    };
  }

  if (/^[\x20-\x7e]+$/.test(value)) {
    return {
      best: {
        format: "code128",
        confidence: "likely",
        reason:
          "Printable ASCII is exactly Code 128's character set, so this data fits without substitution.",
      },
      candidates: [
        {
          format: "code128",
          confidence: "likely",
          reason: "Full printable ASCII.",
        },
        {
          format: "code93",
          confidence: "likely",
          reason: "Code 93 can carry printable ASCII through shift characters.",
        },
      ],
    };
  }

  return {
    best: null,
    candidates: [],
    note: "No linear symbology can carry this data. A QR Code can carry arbitrary Unicode text.",
  };
}
