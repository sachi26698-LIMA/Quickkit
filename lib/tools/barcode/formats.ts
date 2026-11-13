/**
 * The format catalogue: one record per symbology, used by the picker, the
 * reference table and the empty-state examples. Every claim here is checked
 * against `lib/tools/barcode/validate.ts` and `encode.ts` by the test suite.
 */
import type { BarcodeFormatId } from "./types";

export type BarcodeFormatGroup = "Retail" | "Logistics" | "Industrial" | "GS1";

export type BarcodeFormatMeta = {
  id: BarcodeFormatId;
  name: string;
  group: BarcodeFormatGroup;
  blurb: string;
  /** A value that passes validation — also the "Try this" chip. */
  example: string;
  placeholder: string;
  /** Human-readable rules shown under the input. */
  rules: string[];
  /** Minimum quiet zone mandated by the symbology, in modules. */
  quietZone: number;
  /** True when the scanner can read this format back. */
  scannable: boolean;
  /** Typical real-world use, used in the reference table. */
  usedFor: string;
};

export const BARCODE_FORMATS: BarcodeFormatMeta[] = [
  {
    id: "code128",
    name: "Code 128",
    group: "Industrial",
    blurb:
      "Dense full-ASCII code for internal labels: all 128 characters, compact width.",
    example: "QUICKKIT-2026",
    placeholder: "e.g. ORD-2481-A",
    rules: [
      "Printable ASCII (32–126), up to 80 characters",
      "Automatically switches to Code Set C for 6+ digit runs",
      "No check digit to enter — Code 128 computes one internally",
    ],
    quietZone: 10,
    scannable: true,
    usedFor: "Order labels, asset tags, shipping references",
  },
  {
    id: "code39",
    name: "Code 39",
    group: "Industrial",
    blurb:
      "The oldest widely supported alphanumeric code. Long, but every scanner reads it.",
    example: "ABC-1234",
    placeholder: "e.g. INV-0042",
    rules: [
      "0-9, A-Z, space and - . $ / + %",
      "Lowercase is converted to uppercase",
      "Optional mod-43 check character",
    ],
    quietZone: 10,
    scannable: true,
    usedFor: "Inventory, automotive, defence and library labels",
  },
  {
    id: "ean13",
    name: "EAN-13",
    group: "Retail",
    blurb:
      "The retail barcode on almost every product sold outside North America.",
    example: "590123412345",
    placeholder: "12 digits, e.g. 590123412345",
    rules: [
      "12 digits — the 13th (check digit) is calculated",
      "13 digits are accepted and the check digit is verified",
      "Minimum 11-module left quiet zone, 7 on the right",
    ],
    quietZone: 11,
    scannable: true,
    usedFor: "Retail products, GTIN-13",
  },
  {
    id: "ean8",
    name: "EAN-8",
    group: "Retail",
    blurb: "The short EAN for small packages where a 13-digit code cannot fit.",
    example: "9638507",
    placeholder: "7 digits, e.g. 9638507",
    rules: ["7 digits — the 8th is calculated", "8 digits are verified"],
    quietZone: 9,
    scannable: true,
    usedFor: "Small retail packs, sweets, cosmetics",
  },
  {
    id: "upca",
    name: "UPC-A",
    group: "Retail",
    blurb: "The North American retail standard, 12 digits including the check digit.",
    example: "03600029145",
    placeholder: "11 digits, e.g. 03600029145",
    rules: [
      "11 digits — the 12th is calculated",
      "12 digits are verified against the GS1 mod-10 check",
      "Guard bars extend into the digit line",
    ],
    quietZone: 9,
    scannable: true,
    usedFor: "North American retail checkout",
  },
  {
    id: "upce",
    name: "UPC-E",
    group: "Retail",
    blurb:
      "A zero-suppressed UPC for tiny packs. The studio shows the UPC-A it expands to.",
    example: "01234565",
    placeholder: "6 digits, e.g. 01234565",
    rules: [
      "6 digits, or 7 with the number system, or 8 with the check digit",
      "Number system 0 or 1",
      "Check digit is computed from the expanded UPC-A",
    ],
    quietZone: 9,
    scannable: true,
    usedFor: "Small North American retail packs",
  },
  {
    id: "itf14",
    name: "ITF-14",
    group: "Logistics",
    blurb:
      "Interleaved 2 of 5 for corrugated cases. Read at distance, not at checkout.",
    example: "1234567890123",
    placeholder: "13 digits, e.g. 1234567890123",
    rules: [
      "13 digits — the 14th (GTIN check) is calculated",
      "14 digits are verified",
      "Must have an even digit count, which ITF-14 always does",
    ],
    quietZone: 10,
    scannable: true,
    usedFor: "Shipping cases, GTIN-14, pallet labels",
  },
  {
    id: "codabar",
    name: "Codabar",
    group: "Industrial",
    blurb:
      "Numeric-plus-punctuation code still common in blood banks and libraries.",
    example: "1234567890",
    placeholder: "e.g. 40156-2201",
    rules: [
      "0-9 and - $ : / . +",
      "Start/stop character A–D is added for you",
      "An existing A–D wrapper is accepted and preserved",
    ],
    quietZone: 10,
    scannable: true,
    usedFor: "Labs, libraries, photo labs, FedEx airbills",
  },
  {
    id: "msi",
    name: "MSI",
    group: "Industrial",
    blurb:
      "Supermarket shelf-edge code. Digits only, with optional mod-10 or mod-11 check.",
    example: "1234567890",
    placeholder: "e.g. 938471",
    rules: [
      "Digits only, up to 24",
      "Optional mod-10 or mod-11 check digit",
      "Generation only — ZXing has no MSI reader, so the scanner cannot read it back",
    ],
    quietZone: 12,
    scannable: false,
    usedFor: "Shelf labels, warehouse storage bins",
  },
  {
    id: "pharmacode",
    name: "Pharmacode",
    group: "Industrial",
    blurb:
      "Laetus two-width code for pharmaceutical packaging verification. Numbers only.",
    example: "1234",
    placeholder: "3 to 131070",
    rules: [
      "Whole number from 3 to 131070",
      "Narrow bars = 1 module, wide bars = 3 modules",
      "Generation only — no open-source Pharmacode reader is available here",
    ],
    quietZone: 6,
    scannable: false,
    usedFor: "Pharmaceutical folding cartons",
  },
  {
    id: "gs1-128",
    name: "GS1-128",
    group: "GS1",
    blurb:
      "Code 128 with validated application identifiers — the label your trading partner actually expects.",
    example: "(01)09501101530003(17)251231(10)LOT-42",
    placeholder: "(01)09501101530003(17)251231(10)LOT-42",
    rules: [
      "Write each AI in brackets: (01), (17), (10), (3103)…",
      "Fixed-length AIs are checked exactly; variable ones are GS-separated automatically",
      "GTIN (01/02) and SSCC (00) check digits are verified — never recalculated silently",
    ],
    quietZone: 10,
    scannable: true,
    usedFor: "Shipping labels, GTIN + expiry + batch, ASN labels",
  },
];

export const FORMAT_GROUPS: BarcodeFormatGroup[] = ["Retail", "Logistics", "Industrial", "GS1"];

export function formatMeta(id: BarcodeFormatId): BarcodeFormatMeta {
  return BARCODE_FORMATS.find((entry) => entry.id === id) ?? BARCODE_FORMATS[0];
}

/** Sample data used by "Try" chips and by the bulk template. */
export const FORMAT_SAMPLES: Record<BarcodeFormatId, string> = Object.fromEntries(
  BARCODE_FORMATS.map((entry) => [entry.id, entry.example]),
) as Record<BarcodeFormatId, string>;

/** Formats the scanner can read, in picker order. */
export const SCANNABLE_FORMATS = BARCODE_FORMATS.filter((entry) => entry.scannable);
