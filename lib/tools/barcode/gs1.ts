/**
 * GS1-128 application-identifier parsing and validation.
 *
 * GS1-128 is Code 128 with a leading FNC1 and GS (0x1D) separators, but the
 * part that actually protects users is the AI grammar: a wrong length or a
 * broken check digit in a shipping label is a real-world rejection at the
 * warehouse. So the studio parses the human-readable form, validates every
 * field against the AI table, and only then hands the element string to the
 * Code 128 encoder.
 */
import { gtinCheckOk } from "./checksums";

type AiDefinition = {
  /** Exact data length; omitted for variable-length fields. */
  fixed?: number;
  /** Maximum length for a variable-length field. */
  max?: number;
  /** Digits only (dates, weights, references). */
  numeric?: boolean;
  /** Extra check-digit rule. */
  check?: "gtin" | "sscc";
  title: string;
};

const AI_TABLE: Record<string, AiDefinition> = {
  "00": { fixed: 18, numeric: true, check: "sscc", title: "SSCC" },
  "01": { fixed: 14, numeric: true, check: "gtin", title: "GTIN" },
  "02": { fixed: 14, numeric: true, check: "gtin", title: "Contained GTIN" },
  "10": { max: 20, title: "Batch / lot" },
  "11": { fixed: 6, numeric: true, title: "Production date (YYMMDD)" },
  "12": { fixed: 6, numeric: true, title: "Due date (YYMMDD)" },
  "13": { fixed: 6, numeric: true, title: "Packaging date (YYMMDD)" },
  "15": { fixed: 6, numeric: true, title: "Best before (YYMMDD)" },
  "16": { fixed: 6, numeric: true, title: "Sell by (YYMMDD)" },
  "17": { fixed: 6, numeric: true, title: "Expiry (YYMMDD)" },
  "20": { fixed: 2, numeric: true, title: "Variant" },
  "21": { max: 20, title: "Serial number" },
  "22": { max: 20, title: "Consumer product variant" },
  "30": { max: 8, numeric: true, title: "Count of items" },
  "37": { max: 8, numeric: true, title: "Count of trade items" },
  "400": { max: 30, title: "Order number" },
  "401": { max: 30, title: "Global identification number for consignment" },
  "402": { fixed: 17, numeric: true, title: "GSIN" },
  "403": { max: 30, title: "Routing code" },
  "410": { fixed: 13, numeric: true, title: "Ship to GLN" },
  "411": { fixed: 13, numeric: true, title: "Bill to GLN" },
  "412": { fixed: 13, numeric: true, title: "Purchased from GLN" },
  "413": { fixed: 13, numeric: true, title: "Ship from GLN" },
  "414": { fixed: 13, numeric: true, title: "Location GLN" },
  "415": { fixed: 13, numeric: true, title: "Payee GLN" },
  "416": { fixed: 13, numeric: true, title: "Production GLN" },
  "417": { fixed: 13, numeric: true, title: "Party GLN" },
  "420": { max: 20, title: "Ship to postal code" },
  "421": { max: 15, title: "Ship to postal code with ISO country" },
  "422": { fixed: 3, numeric: true, title: "Country of origin" },
  "423": { max: 15, numeric: true, title: "Country of initial processing" },
  "424": { fixed: 3, numeric: true, title: "Country of processing" },
  "425": { fixed: 3, numeric: true, title: "Country of disassembly" },
  "426": { fixed: 3, numeric: true, title: "Country covering full process" },
  "7001": { fixed: 13, numeric: true, title: "NATO stock number" },
  "7002": { max: 30, title: "UN/ECE meat carcass classification" },
  "7003": { fixed: 10, numeric: true, title: "Expiration date and time" },
  "7004": { max: 4, numeric: true, title: "Active potency" },
  "7006": { fixed: 6, numeric: true, title: "First freeze date" },
  "7007": { fixed: 6, numeric: true, title: "Harvest date" },
  "7009": { max: 10, title: "Farming method" },
  "7010": { max: 2, title: "Crop year" },
  "7020": { max: 20, title: "Refurbishment lot ID" },
  "7021": { max: 20, title: "Functional status" },
  "7022": { max: 20, title: "Revision status" },
  "7023": { max: 20, title: "Global individual asset identifier" },
  "7040": { fixed: 4, title: "UIC extension" },
  "7240": { max: 20, title: "Protocol ID" },
  "8001": { fixed: 14, numeric: true, title: "Roll products" },
  "8002": { max: 20, title: "Cellular mobile telephone identifier" },
  "8003": { max: 30, title: "Global returnable asset identifier" },
  "8004": { max: 30, title: "Global individual asset identifier" },
  "8005": { fixed: 6, numeric: true, title: "Price per unit of measure" },
  "8006": { fixed: 18, numeric: true, title: "Identification of an individual trade item piece" },
  "8007": { max: 34, title: "International Bank Account Number" },
  "8008": { max: 12, title: "Date and time of production" },
  "8010": { max: 30, title: "Component / part identifier" },
  "8011": { max: 12, title: "Component / part identifier serial" },
  "8012": { max: 20, title: "Software version" },
  "8013": { max: 30, title: "Global model number" },
  "8017": { fixed: 18, numeric: true, title: "Global service relation number (provider)" },
  "8018": { fixed: 18, numeric: true, title: "Global service relation number (recipient)" },
  "8019": { max: 10, title: "Service relation instance number" },
  "8020": { max: 25, title: "Payment slip reference" },
  "90": { max: 30, title: "Information mutually agreed" },
};

// Ranges defined by GS1 with a trailing digit forming the AI.
const RANGES: { prefix: string; digits: string[]; def: AiDefinition }[] = [
  {
    prefix: "310",
    digits: "0123456789".split(""),
    def: { fixed: 6, numeric: true, title: "Net weight (kg)" },
  },
  {
    prefix: "311",
    digits: "0123456789".split(""),
    def: { fixed: 6, numeric: true, title: "Length (m)" },
  },
  {
    prefix: "312",
    digits: "0123456789".split(""),
    def: { fixed: 6, numeric: true, title: "Width (m)" },
  },
  {
    prefix: "313",
    digits: "0123456789".split(""),
    def: { fixed: 6, numeric: true, title: "Height (m)" },
  },
  {
    prefix: "314",
    digits: "0123456789".split(""),
    def: { fixed: 6, numeric: true, title: "Area (m²)" },
  },
  {
    prefix: "315",
    digits: "0123456789".split(""),
    def: { fixed: 6, numeric: true, title: "Net volume (l)" },
  },
  {
    prefix: "316",
    digits: "0123456789".split(""),
    def: { fixed: 6, numeric: true, title: "Net volume (m³)" },
  },
  {
    prefix: "320",
    digits: "0123456789".split(""),
    def: { fixed: 6, numeric: true, title: "Net weight (lb)" },
  },
  {
    prefix: "321",
    digits: "0123456789".split(""),
    def: { fixed: 6, numeric: true, title: "Length (in)" },
  },
  {
    prefix: "322",
    digits: "0123456789".split(""),
    def: { fixed: 6, numeric: true, title: "Length (ft)" },
  },
  {
    prefix: "323",
    digits: "0123456789".split(""),
    def: { fixed: 6, numeric: true, title: "Length (yd)" },
  },
  {
    prefix: "324",
    digits: "0123456789".split(""),
    def: { fixed: 6, numeric: true, title: "Width (in)" },
  },
  {
    prefix: "325",
    digits: "0123456789".split(""),
    def: { fixed: 6, numeric: true, title: "Width (ft)" },
  },
  {
    prefix: "326",
    digits: "0123456789".split(""),
    def: { fixed: 6, numeric: true, title: "Width (yd)" },
  },
  {
    prefix: "327",
    digits: "0123456789".split(""),
    def: { fixed: 6, numeric: true, title: "Height (in)" },
  },
  {
    prefix: "328",
    digits: "0123456789".split(""),
    def: { fixed: 6, numeric: true, title: "Height (ft)" },
  },
  {
    prefix: "329",
    digits: "0123456789".split(""),
    def: { fixed: 6, numeric: true, title: "Height (yd)" },
  },
  {
    prefix: "330",
    digits: "0123456789".split(""),
    def: { fixed: 6, numeric: true, title: "Gross weight (kg)" },
  },
  {
    prefix: "331",
    digits: "0123456789".split(""),
    def: { fixed: 6, numeric: true, title: "Length (m), logistic" },
  },
  {
    prefix: "332",
    digits: "0123456789".split(""),
    def: { fixed: 6, numeric: true, title: "Width (m), logistic" },
  },
  {
    prefix: "333",
    digits: "0123456789".split(""),
    def: { fixed: 6, numeric: true, title: "Height (m), logistic" },
  },
  {
    prefix: "334",
    digits: "0123456789".split(""),
    def: { fixed: 6, numeric: true, title: "Area (m²), logistic" },
  },
  {
    prefix: "335",
    digits: "0123456789".split(""),
    def: { fixed: 6, numeric: true, title: "Net volume (l), logistic" },
  },
  {
    prefix: "336",
    digits: "0123456789".split(""),
    def: { fixed: 6, numeric: true, title: "Net volume (m³), logistic" },
  },
  {
    prefix: "337",
    digits: "0123456789".split(""),
    def: { fixed: 6, numeric: true, title: "Net weight (kg per m²)" },
  },
  {
    prefix: "390",
    digits: "0123456789".split(""),
    def: { max: 15, title: "Amount payable (local currency)" },
  },
  {
    prefix: "391",
    digits: "0123456789".split(""),
    def: { max: 18, title: "Amount payable with ISO currency" },
  },
  {
    prefix: "392",
    digits: "0123456789".split(""),
    def: { max: 15, title: "Price (local currency)" },
  },
  {
    prefix: "393",
    digits: "0123456789".split(""),
    def: { max: 18, title: "Price with ISO currency" },
  },
  {
    prefix: "394",
    digits: "0123".split(""),
    def: { fixed: 4, numeric: true, title: "Percentage discount" },
  },
  {
    prefix: "395",
    digits: "0123456789".split(""),
    def: { fixed: 6, numeric: true, title: "Amount payable per unit (local currency)" },
  },
  {
    prefix: "703",
    digits: "0123456789".split(""),
    def: { max: 30, title: "Processor approval number" },
  },
  {
    prefix: "710",
    digits: "0123456789".split(""),
    def: { max: 20, title: "National Healthcare Reimbursement Number" },
  },
  {
    prefix: "711",
    digits: "0123456789".split(""),
    def: { max: 20, title: "National Healthcare Reimbursement Number (DE)" },
  },
  {
    prefix: "712",
    digits: "0123456789".split(""),
    def: { max: 20, title: "National Healthcare Reimbursement Number (ES)" },
  },
  {
    prefix: "713",
    digits: "0123456789".split(""),
    def: { max: 20, title: "National Healthcare Reimbursement Number (FR)" },
  },
  {
    prefix: "714",
    digits: "0123456789".split(""),
    def: { max: 20, title: "National Healthcare Reimbursement Number (IT)" },
  },
  {
    prefix: "715",
    digits: "0123456789".split(""),
    def: { max: 20, title: "National Healthcare Reimbursement Number (US)" },
  },
];

for (const range of RANGES)
  for (const digit of range.digits)
    AI_TABLE[`${range.prefix}${digit}`] = range.def;

// 91–99 are company-internal, 30 digits is the GS1 ceiling for them.
for (let digit = 1; digit <= 9; digit += 1)
  AI_TABLE[`9${digit}`] = { max: 30, title: "Company internal" };

export const GS1_EXAMPLE = "(01)09501101530003(17)251231(10)LOT-42";

export type Gs1Field = {
  ai: string;
  value: string;
  title: string;
  fixed: boolean;
};

export type Gs1Result =
  | {
      ok: true;
      fields: Gs1Field[];
      /** Parenthesised human-readable interpretation. */
      hri: string;
      /** Element string: AIs + data, GS (0x1D) between variable fields. */
      encoded: string;
    }
  | { ok: false; message: string; code: "gs1-ai" | "gs1-data" | "gs1-check" | "gs1-syntax" };

/** Look up an AI, longest match first (4 → 3 → 2 digits). */
export function findAi(prefix: string) {
  for (const length of [4, 3, 2]) {
    const ai = prefix.slice(0, length);
    const def = AI_TABLE[ai];
    if (def && ai.length === length) return { ai, def };
  }
  return null;
}

export function isKnownAi(ai: string) {
  return Boolean(AI_TABLE[ai]);
}

export function aiTitle(ai: string) {
  return AI_TABLE[ai]?.title ?? "";
}

function dateOk(value: string) {
  if (!/^\d{6}$/.test(value)) return false;
  const month = Number(value.slice(2, 4));
  const day = Number(value.slice(4, 6));
  return month >= 1 && month <= 12 && day >= 0 && day <= 31;
}

function validateField(ai: string, value: string, def: AiDefinition): string | null {
  const label = `AI (${ai}) ${def.title}`;
  if (!value) return `${label} needs data.`;
  if (value.includes("(") || value.includes(")"))
    return `${label} contains a bracket — remove it from the data.`;
  if (def.numeric && !/^\d+$/.test(value))
    return `${label} only accepts digits.`;
  if (def.fixed && value.length !== def.fixed)
    return `${label} needs exactly ${def.fixed} characters (this one has ${value.length}).`;
  if (def.max && value.length > def.max)
    return `${label} allows up to ${def.max} characters (this one has ${value.length}).`;
  if (["11", "12", "13", "15", "16", "17"].includes(ai) && !dateOk(value))
    return `${label} must be a real YYMMDD date.`;
  if (def.check === "gtin" && !gtinCheckOk(value))
    return `${label} fails the GS1 check digit — recompute the 14th digit or check the source.`;
  if (def.check === "sscc" && !gtinCheckOk(value))
    return `${label} fails the SSCC check digit — the 18th digit does not match the data.`;
  return null;
}

/**
 * Parse the human-readable form `(01)…(17)…` or a raw element string that uses
 * GS separators (or contains only fixed-length AIs).
 */
export function parseGs1(input: string): Gs1Result {
  const source = input.trim();
  if (!source) return { ok: false, code: "gs1-syntax", message: "Enter GS1 data first." };

  const fields: Gs1Field[] = [];
  const push = (ai: string, def: AiDefinition, value: string) => {
    fields.push({ ai, value, title: def.title, fixed: Boolean(def.fixed) });
  };

  if (source.includes("(")) {
    const pattern = /\((\d{2,4})\)/g;
    const matches = [...source.matchAll(pattern)];
    if (!matches.length)
      return {
        ok: false,
        code: "gs1-syntax",
        message: "No application identifier found. Write each AI in brackets, e.g. (01)09501101530003.",
      };
    for (let index = 0; index < matches.length; index += 1) {
      const match = matches[index];
      const ai = match[1];
      const def = AI_TABLE[ai];
      if (!def)
        return {
          ok: false,
          code: "gs1-ai",
          message: `(${ai}) is not an application identifier this studio recognises. Check the GS1 General Specifications for the right AI.`,
        };
      const start = (match.index ?? 0) + match[0].length;
      const end = index + 1 < matches.length ? matches[index + 1].index ?? source.length : source.length;
      const value = source.slice(start, end).trim();
      const problem = validateField(ai, value, def);
      if (problem) return { ok: false, code: def.check ? "gs1-check" : "gs1-data", message: problem };
      push(ai, def, value);
    }
  } else {
    const clean = source.replace(/\s+/g, "");
    if (!/^[\d\u001d]+$/.test(clean))
      return {
        ok: false,
        code: "gs1-syntax",
        message: "Raw GS1 data must be digits (with GS separators between variable-length fields) — or use the bracketed (01)… form.",
      };
    let rest = clean;
    while (rest) {
      if (rest.startsWith("\u001d")) {
        rest = rest.slice(1);
        continue;
      }
      const found = findAi(rest);
      if (!found)
        return {
          ok: false,
          code: "gs1-ai",
          message: `"${rest.slice(0, 4)}…" does not start with a known application identifier. Use the bracketed form so the AI boundaries are explicit.`,
        };
      rest = rest.slice(found.ai.length);
      const def = found.def;
      let value: string;
      if (def.fixed) {
        value = rest.slice(0, def.fixed);
        rest = rest.slice(def.fixed);
      } else {
        const separator = rest.indexOf("\u001d");
        if (separator >= 0) {
          value = rest.slice(0, separator);
          rest = rest.slice(separator + 1);
        } else {
          value = rest;
          rest = "";
        }
      }
      const problem = validateField(found.ai, value, def);
      if (problem) return { ok: false, code: def.check ? "gs1-check" : "gs1-data", message: problem };
      push(found.ai, def, value);
    }
    if (!fields.length)
      return { ok: false, code: "gs1-syntax", message: "No application identifier found in that data." };
  }

  const encoded = fields
    .map((field, index) => {
      const isLast = index === fields.length - 1;
      const fixed = Boolean(AI_TABLE[field.ai]?.fixed);
      return `${field.ai}${field.value}${!fixed && !isLast ? "\u001d" : ""}`;
    })
    .join("");
  const hri = fields.map((field) => `(${field.ai})${field.value}`).join("");
  return { ok: true, fields, hri, encoded };
}
