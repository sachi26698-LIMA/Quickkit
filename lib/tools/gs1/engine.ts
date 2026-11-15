/**
 * GS1 Intelligence engine.
 *
 * The studio already validates GS1-128 element strings (`lib/tools/barcode/gs1.ts`).
 * This module is the wider, read-only layer on top of it: it explains each
 * application identifier in plain language, interprets GS1 dates, parses GS1
 * Digital Link URIs, and builds Digital Link URLs that a real scanner will
 * accept.
 *
 * References used (all primary):
 *   - GS1 General Specifications, release 25.0 — AI table, date rules, FNC1.
 *   - GS1 Digital Link Standard: URI Syntax 1.7.0 — path/query form and order.
 *
 * Two hard rules shape the code:
 *   1. A GTIN check digit makes a number *well-formed*, not *licensed*: the
 *      prefix belongs to a GS1 member company, and QUICKKIT never claims either.
 *   2. A date inside a GS1 AI is exact; a date guessed from a lot number is not.
 *      Only the former is VERIFIED.
 */
import { findAi, parseGs1, type Gs1Field } from "@/lib/tools/barcode/gs1";
import { gtinCheckDigit, gtinCheckOk } from "@/lib/tools/barcode/checksums";

export type AiExplanation = {
  ai: string;
  title: string;
  explanation: string;
  /** What the field identifies, in one word. */
  kind: "identifier" | "date" | "batch" | "serial" | "measure" | "reference";
};

const EXPLANATIONS: Record<string, Omit<AiExplanation, "ai" | "title">> = {
  "00": {
    kind: "identifier",
    explanation:
      "SSCC — the serialised number of a logistics unit (a pallet or a case). It identifies one physical shipment, not a product type.",
  },
  "01": {
    kind: "identifier",
    explanation:
      "GTIN — the product number: the same number for every pack of that product, regardless of batch. It never identifies an individual pack.",
  },
  "02": {
    kind: "identifier",
    explanation:
      "Contained GTIN — the product number of the items inside a case, used with AI (37).",
  },
  "10": {
    kind: "batch",
    explanation:
      "Batch or lot — the manufacturer's grouping of units made together. It is not a date, and its format is not standardised.",
  },
  "11": {
    kind: "date",
    explanation:
      "Production date — when the unit was made, as YYMMDD. Day 00 means the last day of that month.",
  },
  "12": {
    kind: "date",
    explanation: "Due date — YYMMDD, used for payment or return deadlines.",
  },
  "13": {
    kind: "date",
    explanation: "Packaging date — YYMMDD, when the item was packed.",
  },
  "15": {
    kind: "date",
    explanation:
      "Best before date — YYMMDD. Quality guidance: the product is not automatically unsafe afterwards.",
  },
  "16": {
    kind: "date",
    explanation:
      "Sell by date — YYMMDD, a retailer instruction, not a safety limit.",
  },
  "17": {
    kind: "date",
    explanation:
      "Expiration date — YYMMDD. This is the safety limit printed on the label; the batch code itself does not carry it.",
  },
  "20": {
    kind: "reference",
    explanation: "Variant — a two-digit internal variation of the product.",
  },
  "21": {
    kind: "serial",
    explanation:
      "Serial number — up to 20 characters identifying this individual unit. A serial is not a batch, and a batch is not a serial.",
  },
  "22": {
    kind: "reference",
    explanation:
      "Consumer product variant — a market-specific version of the GTIN.",
  },
  "30": { kind: "measure", explanation: "Count of items inside the package." },
  "37": {
    kind: "measure",
    explanation: "Count of trade items contained in a logistics unit.",
  },
  "400": { kind: "reference", explanation: "Order number from the buyer." },
  "410": {
    kind: "identifier",
    explanation: "Ship-to GLN — the location the goods are going to.",
  },
  "414": {
    kind: "identifier",
    explanation: "Location GLN — a physical location, such as a warehouse bay.",
  },
  "8003": {
    kind: "identifier",
    explanation:
      "GRAI — a returnable asset identifier: a crate, a keg or a pallet that is reused.",
  },
  "8006": {
    kind: "identifier",
    explanation:
      "ITIP — identifies one piece inside a trade item, with a piece number and total count.",
  },
  "8008": {
    kind: "date",
    explanation:
      "Date and time of production, with seconds and an optional time zone.",
  },
  "8017": {
    kind: "identifier",
    explanation:
      "GSRN provider — a service relation, such as a loyalty or utility account.",
  },
  "8018": {
    kind: "identifier",
    explanation:
      "GSRN recipient — the party on the other side of that service relation.",
  },
  "7003": {
    kind: "date",
    explanation:
      "Expiration date and time — YYMMDDhhmm, used on perishable goods.",
  },
};

export function explainAi(ai: string): AiExplanation {
  const known = EXPLANATIONS[ai];
  const found = findAi(ai);
  const title = known
    ? (found?.def.title ?? ai)
    : (found?.def.title ?? "Unknown AI");
  return {
    ai,
    title: known ? title : title,
    explanation:
      known?.explanation ??
      (found
        ? `${title} — a GS1-defined field. Its length and character set are validated; its business meaning depends on the trading-partner agreement.`
        : "This application identifier is not in the table this studio validates. It is not guessed."),
    kind: known?.kind ?? "reference",
  };
}

const DATE_AIS = new Set(["11", "12", "13", "15", "16", "17", "7006", "7007"]);

/** GS1 dates are YYMMDD with a 2000–2099 window; day 00 = last day of month. */
export function interpretGs1Date(value: string) {
  if (!/^\d{6}$/.test(value)) return null;
  const year = 2000 + Number(value.slice(0, 2));
  const month = Number(value.slice(2, 4));
  const day = Number(value.slice(4, 6));
  if (month < 1 || month > 12) return null;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const effectiveDay = day === 0 ? lastDay : day;
  if (effectiveDay < 1 || effectiveDay > lastDay) return null;
  const iso = `${year}-${String(month).padStart(2, "0")}-${String(effectiveDay).padStart(2, "0")}`;
  const formatted = new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  return {
    iso,
    human: formatted,
    note:
      day === 0
        ? `Day 00 means the last day of the month, so the date resolves to ${lastDay} ${new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-GB", { month: "long", timeZone: "UTC" })} ${year}.`
        : undefined,
  };
}

export type ExplainedField = {
  ai: string;
  value: string;
  title: string;
  explanation: string;
  kind: AiExplanation["kind"];
  hri: string;
  /** Present for date AIs that resolve to a real calendar date. */
  date?: { iso: string; human: string; note?: string };
};

export type ParsedGs1 =
  | {
      ok: true;
      kind: "hri" | "element-string" | "digital-link";
      fields: ExplainedField[];
      hri: string;
      encoded: string;
      warnings: string[];
      /** Digital Link details, when the input was a URI. */
      link?: { url: string; origin: string; primary: string };
    }
  | { ok: false; code: string; message: string; hint?: string };

function decorate(fields: Gs1Field[]): ExplainedField[] {
  return fields.map((field) => {
    const explanation = explainAi(field.ai);
    const date = DATE_AIS.has(field.ai)
      ? (interpretGs1Date(field.value) ?? undefined)
      : undefined;
    return {
      ai: field.ai,
      value: field.value,
      title: field.title,
      explanation: explanation.explanation,
      kind: explanation.kind,
      hri: `(${field.ai})${field.value}`,
      ...(date ? { date } : {}),
    };
  });
}

function validateOrder(fields: Gs1Field[]) {
  const warnings: string[] = [];
  const seen = new Set<string>();
  for (const field of fields) {
    if (seen.has(field.ai))
      warnings.push(
        `AI (${field.ai}) appears more than once. GS1 element strings carry one value per AI.`,
      );
    seen.add(field.ai);
  }
  const first = fields[0]?.ai;
  if (first && first !== "01" && first !== "8006" && first !== "00")
    warnings.push(
      `The element string starts with (${first}). GS1 element strings normally start with a primary identifier — AI (01), (8006) or (00) — so a scanner can identify the item before reading anything else.`,
    );
  return warnings;
}

/** GS1 Digital Link: path form, query form, or both. */
export function parseDigitalLink(input: string): ParsedGs1 {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return {
      ok: false,
      code: "gs1-syntax",
      message:
        "That is not an absolute URL, so it cannot be a GS1 Digital Link.",
      hint: "https://example.com/01/09506000134352（10）LOT-42",
    };
  }

  const segments = url.pathname.split("/").filter(Boolean);
  if (segments.length === 0)
    return {
      ok: false,
      code: "gs1-syntax",
      message:
        "A Digital Link needs at least one AI/value pair in the path, e.g. /01/09506000134352.",
    };
  if (segments.length % 2 !== 0)
    return {
      ok: false,
      code: "gs1-syntax",
      message:
        "Every path segment must be an AI/value pair. The path has an odd number of segments, so an AI or a value is missing.",
    };

  const pairs: [string, string][] = [];
  for (let index = 0; index < segments.length; index += 2) {
    const ai = decodeURIComponent(segments[index]);
    if (!/^\d{2,4}$/.test(ai))
      return {
        ok: false,
        code: "gs1-ai",
        message: `"${ai}" is not a numeric application identifier.`,
      };
    pairs.push([ai, decodeURIComponent(segments[index + 1])]);
  }

  // Query parameters are AIs as well; only numeric keys are GS1 data.
  url.searchParams.forEach((value, key) => {
    if (/^\d{2,4}$/.test(key)) pairs.push([key, value]);
  });

  const primary = pairs[0]?.[0];
  if (primary !== "01" && primary !== "8006" && primary !== "00")
    return {
      ok: false,
      code: "gs1-ai",
      message:
        "A GS1 Digital Link must start with a primary key: AI (01) GTIN, (8006) ITIP or (00) SSCC.",
      hint: "https://example.com/01/09506000134352",
    };

  const hri = pairs.map(([ai, value]) => `(${ai})${value}`).join("");
  const parsed = parseGs1(hri);
  if (!parsed.ok)
    return { ok: false, code: parsed.code, message: parsed.message };

  const fields = decorate(parsed.fields);
  return {
    ok: true,
    kind: "digital-link",
    fields,
    hri: parsed.hri,
    encoded: parsed.encoded,
    warnings: validateOrder(parsed.fields),
    link: {
      url: url.toString(),
      origin: url.origin,
      primary: primary as string,
    },
  };
}

/**
 * Parse any of the three forms a user can paste: bracketed HRI, a raw element
 * string with GS separators, or a Digital Link URL.
 */
export function parseGs1Input(input: string): ParsedGs1 {
  const source = input.trim();
  if (!source)
    return {
      ok: false,
      code: "gs1-syntax",
      message: "Enter GS1 data, a bracketed AI string or a Digital Link URL.",
    };

  if (/^https?:\/\//i.test(source)) return parseDigitalLink(source);

  const parsed = parseGs1(source);
  if (!parsed.ok)
    return {
      ok: false,
      code: parsed.code,
      message: parsed.message,
      hint: "(01)09506000134352(17)251231(10)LOT-42",
    };

  const hasBrackets = source.includes("(");
  return {
    ok: true,
    kind: hasBrackets ? "hri" : "element-string",
    fields: decorate(parsed.fields),
    hri: parsed.hri,
    encoded: parsed.encoded,
    warnings: validateOrder(parsed.fields),
  };
}

/* -------------------------------------------------------------------------- */
/* Digital Link builder                                                       */
/* -------------------------------------------------------------------------- */

export type DigitalLinkInput = {
  /** GTIN in 8, 12, 13 or 14 digits; padded to GTIN-14. */
  gtin?: string;
  /** ITIP (8006) 18 digits, when the link identifies a piece instead of a GTIN. */
  itip?: string;
  /** SSCC (00) 18 digits, for a logistics unit. */
  sscc?: string;
  batch?: string;
  serial?: string;
  /** YYMMDD or YYYY-MM-DD. */
  productionDate?: string;
  packagingDate?: string;
  bestBefore?: string;
  expiry?: string;
};

export type DigitalLinkResult =
  | {
      ok: true;
      url: string;
      hri: string;
      fields: ExplainedField[];
      notes: string[];
    }
  | { ok: false; code: string; message: string };

/** Normalise a GTIN of any retail length to GTIN-14 with a valid check digit. */
export function toGtin14(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (![8, 12, 13, 14].includes(digits.length)) return null;
  if (digits.length === 14) return gtinCheckOk(digits) ? digits : null;
  const padded = digits.padStart(14, "0");
  const check = gtinCheckDigit(padded.slice(0, 13));
  if (check === null) return null;
  // A shorter GTIN carries its own check digit, which must survive padding.
  const candidate = `${padded.slice(0, 13)}${check}`;
  return gtinCheckOk(candidate) ? candidate : null;
}

/** Accept YYMMDD or an ISO date and return GS1 YYMMDD. */
export function toGs1Date(raw: string): string | null {
  const value = raw.trim();
  if (/^\d{6}$/.test(value)) {
    const interpreted = interpretGs1Date(value);
    return interpreted ? value : null;
  }
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [, year, month, day] = match;
  const interpreted = interpretGs1Date(`${year.slice(2)}${month}${day}`);
  return interpreted ? `${year.slice(2)}${month}${day}` : null;
}

const DATE_FIELDS: {
  key: keyof DigitalLinkInput;
  ai: string;
  label: string;
}[] = [
  { key: "productionDate", ai: "11", label: "production date" },
  { key: "packagingDate", ai: "13", label: "packaging date" },
  { key: "bestBefore", ai: "15", label: "best-before date" },
  { key: "expiry", ai: "17", label: "expiry date" },
];

/**
 * Build a Digital Link in canonical form: primary key and its identifying
 * attributes in the path, dates in the query, AIs in ascending order.
 */
export function buildDigitalLink(
  input: DigitalLinkInput,
  options: { origin?: string } = {},
): DigitalLinkResult {
  const origin = (options.origin ?? "https://example.com").replace(/\/+$/, "");

  const primary: { ai: string; value: string } | null = input.gtin
    ? (() => {
        const gtin14 = toGtin14(input.gtin as string);
        return gtin14 ? { ai: "01", value: gtin14 } : null;
      })()
    : input.itip
      ? /^\d{18}$/.test(input.itip) && gtinCheckOk(input.itip)
        ? { ai: "8006", value: input.itip }
        : null
      : input.sscc
        ? /^\d{18}$/.test(input.sscc) && gtinCheckOk(input.sscc)
          ? { ai: "00", value: input.sscc }
          : null
        : null;

  if (!primary)
    return {
      ok: false,
      code: input.gtin || input.itip || input.sscc ? "gs1-check" : "gs1-ai",
      message:
        input.gtin || input.itip || input.sscc
          ? "That identifier fails its GS1 check digit, so no Digital Link was built. Recompute the check digit or check the source."
          : "A Digital Link needs a primary identifier: a GTIN, an ITIP (8006) or an SSCC (00).",
    };

  if (input.itip && input.gtin)
    return {
      ok: false,
      code: "gs1-ai",
      message: "Use either a GTIN or an ITIP as the primary key, not both.",
    };

  const notes: string[] = [
    "Canonical order: the primary key first, then its identifiers (batch, serial) in the path, then dates in the query string.",
  ];

  const path: string[] = [primary.ai, primary.value];

  const batch = (input.batch ?? "").trim();
  const serial = (input.serial ?? "").trim();
  if (batch) {
    if (batch.length > 20)
      return {
        ok: false,
        code: "gs1-data",
        message: "AI (10) allows at most 20 characters.",
      };
    path.push("10", batch);
  }
  if (serial) {
    if (serial.length > 20)
      return {
        ok: false,
        code: "gs1-data",
        message: "AI (21) allows at most 20 characters.",
      };
    path.push("21", serial);
  }

  const query: [string, string][] = [];
  for (const field of DATE_FIELDS) {
    const raw = input[field.key];
    if (typeof raw !== "string" || !raw.trim()) continue;
    const gs1Date = toGs1Date(raw);
    if (!gs1Date)
      return {
        ok: false,
        code: "gs1-data",
        message: `The ${field.label} is not a real date. Use YYYY-MM-DD or YYMMDD.`,
      };
    query.push([field.ai, gs1Date]);
  }
  query.sort((a, b) => a[0].localeCompare(b[0]));

  const url = `${origin}/${path
    .map((part) => encodeURIComponent(part))
    .join("/")}${
    query.length
      ? `?${query
          .map(([ai, value]) => `${ai}=${encodeURIComponent(value)}`)
          .join("&")}`
      : ""
  }`;

  const hri = [
    `(${primary.ai})${primary.value}`,
    ...(batch ? [`(10)${batch}`] : []),
    ...(serial ? [`(21)${serial}`] : []),
    ...query.map(([ai, value]) => `(${ai})${value}`),
  ].join("");

  const parsed = parseGs1(hri);
  if (!parsed.ok)
    return { ok: false, code: parsed.code, message: parsed.message };

  return {
    ok: true,
    url,
    hri,
    fields: decorate(parsed.fields),
    notes,
  };
}
