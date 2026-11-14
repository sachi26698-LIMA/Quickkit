/**
 * Decoders and date arithmetic for the batch-code checker.
 *
 * There are exactly four decoders, and each states what it is:
 *
 *  - `gs1-element-string` reads the GS1 date Application Identifiers (11, 13,
 *    15, 16, 17, 7003, 8008) and AI 10 (batch) from a GS1 element string, as
 *    defined by the GS1 General Specifications. This is one of the two paths
 *    that can produce a *verified* decoded date.
 *  - `gs1-digital-link` reads the same identifiers out of a GS1 Digital Link
 *    URI (path form, query form, or both), with the same validation.
 *  - `explicit-date` finds a date-shaped token inside a lot code (e.g. `06/2027`,
 *    `20270612`, `251231`, `2026-317`). It is a pattern match, disclosed as
 *    one, and never described as a brand algorithm.
 *  - `none` means exactly that: no documented decoder exists for the brand, so
 *    the tool will not invent one.
 *
 * Nothing here guesses a manufacture date from an opaque code such as `28H300`.
 */
import { isKnownAi, parseGs1 } from "@/lib/tools/barcode/gs1";
import type {
  BrandRecord,
  DecoderVerdict,
  EvidenceRef,
} from "@/lib/tools/batch-code/types";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export const STANDARD_EVIDENCE: EvidenceRef = {
  label: "GS1 General Specifications — AI 11 / AI 17",
  url: "https://www.gs1.org/standards/barcodes/application-identifiers",
  kind: "standard",
};

export const PAO_REGULATION: EvidenceRef = {
  label: "EU Cosmetics Regulation 1223/2009, Annex VIII (PAO symbol)",
  url: "https://eur-lex.europa.eu/eli/reg/2009/1223/oj",
  kind: "regulation",
};

/* -------------------------------------------------------------------------- */
/* Calendar helpers                                                            */
/* -------------------------------------------------------------------------- */

export function isLeapYear(year: number) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInMonth(year: number, month: number) {
  if (month < 1 || month > 12) return 0;
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
}

const pad = (value: number, width = 2) => String(value).padStart(width, "0");

/** Strict `YYYY-MM-DD` validation — rejects 2026-02-30 and month 13. */
export function isIsoDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [, year, month, day] = match.map(Number);
  if (year < 1900 || year > 2200) return false;
  if (month < 1 || month > 12) return false;
  return day >= 1 && day <= daysInMonth(year, month);
}

export function makeDate(year: number, month: number, day: number) {
  if (year < 1900 || year > 2200) return null;
  if (month < 1 || month > 12) return null;
  const max = daysInMonth(year, month);
  // GS1 allows day 00 to mean "the last day of the month".
  const resolvedDay = day === 0 ? max : day;
  if (resolvedDay < 1 || resolvedDay > max) return null;
  return `${year}-${pad(month)}-${pad(resolvedDay)}`;
}

/** ISO 8601 ordinal date (year + day of the year) → ISO calendar date. */
export function ordinalToIso(year: number, dayOfYear: number) {
  if (year < 1900 || year > 2200) return null;
  const limit = isLeapYear(year) ? 366 : 365;
  if (dayOfYear < 1 || dayOfYear > limit) return null;
  const date = new Date(Date.UTC(year, 0, dayOfYear));
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

/** Two-digit year: 00–69 → 2000s, 70–99 → 1900s. Disclosed in the UI. */
export function expandYear(twoDigit: number) {
  return twoDigit >= 70 ? 1900 + twoDigit : 2000 + twoDigit;
}

export function addMonths(iso: string, months: number) {
  if (!isIsoDate(iso) || !Number.isFinite(months)) return null;
  const [year, month, day] = iso.split("-").map(Number);
  const total = year * 12 + (month - 1) + months;
  const nextYear = Math.floor(total / 12);
  const nextMonth = (total % 12) + 1;
  const clampedDay = Math.min(day, daysInMonth(nextYear, nextMonth));
  return `${nextYear}-${pad(nextMonth)}-${pad(clampedDay)}`;
}

export function formatDate(iso: string) {
  if (!isIsoDate(iso)) return iso;
  const [year, month, day] = iso.split("-").map(Number);
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

export function monthsBetween(fromIso: string, toIso: string) {
  if (!isIsoDate(fromIso) || !isIsoDate(toIso)) return null;
  const [fy, fm, fd] = fromIso.split("-").map(Number);
  const [ty, tm, td] = toIso.split("-").map(Number);
  let months = (ty - fy) * 12 + (tm - fm);
  if (td < fd) months -= 1;
  return months;
}

export function daysBetween(fromIso: string, toIso: string) {
  if (!isIsoDate(fromIso) || !isIsoDate(toIso)) return null;
  // UTC arithmetic: no DST, no local-midnight surprises.
  const from = Date.UTC(
    Number(fromIso.slice(0, 4)),
    Number(fromIso.slice(5, 7)) - 1,
    Number(fromIso.slice(8, 10)),
  );
  const to = Date.UTC(
    Number(toIso.slice(0, 4)),
    Number(toIso.slice(5, 7)) - 1,
    Number(toIso.slice(8, 10)),
  );
  return Math.round((to - from) / 86_400_000);
}

export function todayIso() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}-${pad(now.getUTCDate())}`;
}

export function relativeDays(days: number) {
  const absolute = Math.abs(days);
  if (absolute === 0) return "today";
  const years = Math.floor(absolute / 365);
  const months = Math.floor((absolute % 365) / 30);
  const parts: string[] = [];
  if (years) parts.push(`${years} year${years === 1 ? "" : "s"}`);
  if (months) parts.push(`${months} month${months === 1 ? "" : "s"}`);
  if (!parts.length) parts.push(`${absolute} day${absolute === 1 ? "" : "s"}`);
  return `${parts.join(" ")} ${days < 0 ? "ago" : "from now"}`;
}

/* -------------------------------------------------------------------------- */
/* Explicit-date pattern scan                                                  */
/* -------------------------------------------------------------------------- */

export type DateCandidate = {
  date: string;
  match: string;
  interpretation: string;
};

export type ScanOutcome = {
  candidates: DateCandidate[];
  ambiguous: boolean;
  detail: string;
};

/**
 * Find a date the user can *see* in the code. Every accepted form requires an
 * unambiguous calendar date: a run that cannot be a real day/month is rejected
 * rather than "helpfully" reinterpreted.
 */
export function scanExplicitDate(rawCode: string): ScanOutcome {
  const code = rawCode.trim().toUpperCase();
  if (!code)
    return { candidates: [], ambiguous: false, detail: "No code entered." };

  const candidates: DateCandidate[] = [];
  const seen = new Set<string>();
  const push = (date: string | null, match: string, interpretation: string) => {
    if (!date || seen.has(`${date}|${match}`)) return;
    seen.add(`${date}|${match}`);
    candidates.push({ date, match, interpretation });
  };

  // 0. ISO 8601 ordinal dates: YYYY-DDD (year + day of the year).
  for (const match of code.matchAll(/(?<!\d)(\d{4})-(\d{3})(?!\d)/g)) {
    const [whole, year, dayOfYear] = match;
    const day = Number(dayOfYear);
    const limit = isLeapYear(Number(year)) ? 366 : 365;
    if (day >= 1 && day <= limit) {
      const resolved = ordinalToIso(Number(year), day);
      if (resolved) push(resolved, whole, "ISO 8601 ordinal date (YYYY-DDD)");
    }
  }

  // 1. Separated forms: YYYY-MM-DD, DD/MM/YYYY, MM/YYYY, MM/YY.
  for (const match of code.matchAll(
    /(?<![\d./-])(\d{1,4})[/.-](\d{1,4})(?:[/.-](\d{1,4}))?(?![\d/.-])/g,
  )) {
    const [whole, first, second, third] = match;
    if (third === undefined) {
      // MM/YYYY (month precision — the day is unknown, so the 1st is used and
      // the label says so).
      if (first.length <= 2 && second.length === 4) {
        const asMonthYear = makeDate(Number(second), Number(first), 1);
        if (asMonthYear)
          push(asMonthYear, whole, `month ${first} / year ${second}`);
      } else if (first.length === 4 && second.length <= 2) {
        const asYearMonth = makeDate(Number(first), Number(second), 1);
        if (asYearMonth)
          push(asYearMonth, whole, `year ${first} / month ${second}`);
      } else if (first.length <= 2 && second.length <= 2) {
        const year = expandYear(Number(second));
        const asMonthYear = makeDate(year, Number(first), 1);
        if (asMonthYear)
          push(
            asMonthYear,
            whole,
            `month ${first} / year ${year} (two-digit year)`,
          );
      }
      continue;
    }
    if (first.length === 4 && third.length <= 2) {
      const asYmd = makeDate(Number(first), Number(second), Number(third));
      if (asYmd) push(asYmd, whole, "YYYY-MM-DD");
      continue;
    }
    if (third.length === 4 && first.length <= 2) {
      const day = Number(first);
      const asDmy = makeDate(Number(third), Number(second), day);
      if (asDmy) push(asDmy, whole, "DD/MM/YYYY");
      const asMdy = makeDate(Number(third), Number(first), day);
      if (asMdy && asMdy !== asDmy) push(asMdy, whole, "MM/DD/YYYY");
    }
  }

  // 2. Bare digit runs: YYYYMMDD / DDMMYYYY, then YYMMDD.
  for (const match of code.matchAll(/\d{6,8}/g)) {
    const run = match[0];
    if (run.length === 8) {
      const ymd = makeDate(
        Number(run.slice(0, 4)),
        Number(run.slice(4, 6)),
        Number(run.slice(6, 8)),
      );
      if (ymd) push(ymd, run, "YYYYMMDD");
      const dmy = makeDate(
        Number(run.slice(4, 8)),
        Number(run.slice(2, 4)),
        Number(run.slice(0, 2)),
      );
      if (dmy && dmy !== ymd) push(dmy, run, "DDMMYYYY");
      continue;
    }
    const yymmdd = makeDate(
      expandYear(Number(run.slice(0, 2))),
      Number(run.slice(2, 4)),
      Number(run.slice(4, 6)),
    );
    if (yymmdd) push(yymmdd, run, "YYMMDD");
    const ddmmyy = makeDate(
      expandYear(Number(run.slice(4, 6))),
      Number(run.slice(2, 4)),
      Number(run.slice(0, 2)),
    );
    if (ddmmyy && ddmmyy !== yymmdd) push(ddmmyy, run, "DDMMYY");
  }

  const dates = new Set(candidates.map((candidate) => candidate.date));
  const ambiguous = dates.size > 1;
  if (!candidates.length)
    return {
      candidates,
      ambiguous: false,
      detail:
        "No date-shaped part was found. That does not mean the code has no date — only that none is readable without the brand's own key.",
    };
  return {
    candidates,
    ambiguous,
    detail: ambiguous
      ? "The code contains more than one date-shaped reading. Both are listed; check the packaging to see which one the manufacturer printed."
      : "A date-shaped token was found in the code you entered. This is a pattern match, not a brand-verified decoder.",
  };
}

/* -------------------------------------------------------------------------- */
/* GS1 element string                                                          */
/* -------------------------------------------------------------------------- */

export type Gs1DateField = {
  /** Application Identifier that carried the date. */
  ai: string;
  label: string;
  /** ISO calendar date, already validated (a day of 00 becomes month end). */
  date: string;
  /** `HH:mm` for AI 7003 / 8008, otherwise null. */
  time: string | null;
};

export type Gs1Facts = {
  productionDate: string | null;
  expiryDate: string | null;
  bestBeforeDate: string | null;
  packagingDate: string | null;
  batch: string | null;
  gtin: string | null;
  fields: { ai: string; value: string }[];
  /** Every date the element string carried, in the order it appeared. */
  dates: Gs1DateField[];
  carrier: "element-string" | "digital-link";
};

/**
 * GS1 date application identifiers.
 *
 * Source: GS1 General Specifications, AI table (AI 11–17, 7003, 7006, 7007,
 * 8008). A date AI is only ever read as its defined format — a six-digit field
 * that is not a real calendar date is rejected, never "adjusted".
 */
export const GS1_DATE_AIS: Record<string, string> = {
  "11": "Production date",
  "12": "Due date",
  "13": "Packaging date",
  "15": "Best-before date",
  "16": "Sell-by date",
  "17": "Expiration date",
  "7003": "Expiration date and time",
  "7006": "First freeze date",
  "7007": "Harvest date",
  "8008": "Date and time of production",
};

function gs1Date(value: string) {
  if (!/^\d{6}$/.test(value)) return null;
  const year = expandYear(Number(value.slice(0, 2)));
  const month = Number(value.slice(2, 4));
  const day = Number(value.slice(4, 6));
  return makeDate(year, month, day);
}

const padTime = (hour: number, minute: number) =>
  hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59
    ? `${pad(hour)}:${pad(minute)}`
    : null;

/** Decode one date AI. Returns null when the value is not that AI's format. */
export function readGs1Date(
  ai: string,
  value: string,
): { date: string; time: string | null } | null {
  if (!/^\d+$/.test(value)) return null;
  if (ai === "7003" && value.length === 10) {
    const date = gs1Date(value.slice(0, 6));
    const time = padTime(Number(value.slice(6, 8)), Number(value.slice(8, 10)));
    return date && time ? { date, time } : null;
  }
  if (ai === "8008" && value.length === 12) {
    const date = makeDate(
      Number(value.slice(0, 4)),
      Number(value.slice(4, 6)),
      Number(value.slice(6, 8)),
    );
    const time = padTime(
      Number(value.slice(8, 10)),
      Number(value.slice(10, 12)),
    );
    return date && time ? { date, time } : null;
  }
  if (ai === "8008") return null;
  if (value.length !== 6) return null;
  const date = gs1Date(value);
  return date ? { date, time: null } : null;
}

function factsFromFields(
  fields: { ai: string; value: string }[],
  carrier: Gs1Facts["carrier"],
): Gs1Facts | null {
  const dates: Gs1DateField[] = [];
  for (const field of fields) {
    const label = GS1_DATE_AIS[field.ai];
    if (!label) continue;
    const parsed = readGs1Date(field.ai, field.value);
    if (!parsed) continue;
    dates.push({ ai: field.ai, label, date: parsed.date, time: parsed.time });
  }
  const dateFor = (...ais: string[]) =>
    dates.find((entry) => ais.includes(entry.ai))?.date ?? null;
  const field = (ai: string) =>
    fields.find((entry) => entry.ai === ai)?.value ?? null;
  const facts: Gs1Facts = {
    productionDate: dateFor("11", "8008"),
    expiryDate: dateFor("17", "7003"),
    bestBeforeDate: dateFor("15", "16"),
    packagingDate: dateFor("13"),
    batch: field("10"),
    gtin: field("01"),
    fields,
    dates,
    carrier,
  };
  // A string that carries none of the identifiers this tool understands tells
  // us nothing about a date, so it is not reported as a GS1 match.
  if (!dates.length && !facts.batch && !facts.gtin) return null;
  return facts;
}

/** Read every supported AI out of a GS1 element string (bracketed or raw). */
export function readGs1Facts(raw: string): Gs1Facts | null {
  const parsed = parseGs1(raw.trim());
  if (!parsed.ok) return null;
  return factsFromFields(
    parsed.fields.map((entry) => ({ ai: entry.ai, value: entry.value })),
    "element-string",
  );
}

const PRIMARY_KEY_AIS = ["01", "8006", "00"];

/**
 * Parse a GS1 Digital Link URI into the same facts.
 *
 * Source: GS1 Digital Link Standard, URI syntax 1.7.0 (ref.gs1.org). Accepted
 * shapes are the path form (`/01/<gtin>/17/251231`), the query form
 * (`/01/<gtin>?17=251231`) and a mix of the two. Values are validated with the
 * same AI table as a GS1 element string, so a bad length, a broken GTIN check
 * digit or an unknown AI is rejected rather than half-read.
 */
export function readDigitalLinkFacts(input: string): Gs1Facts | null {
  const raw = input.trim();
  if (!/^https?:\/\//i.test(raw)) return null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }

  const segments = url.pathname
    .split("/")
    .filter(Boolean)
    .map((segment) => {
      try {
        return decodeURIComponent(segment);
      } catch {
        return segment;
      }
    });
  if (!segments.length || !PRIMARY_KEY_AIS.includes(segments[0])) return null;

  const fields: { ai: string; value: string }[] = [];
  for (let index = 0; index + 1 < segments.length; index += 2) {
    const ai = segments[index];
    if (!isKnownAi(ai)) return null;
    fields.push({ ai, value: segments[index + 1] });
  }
  if (segments.length % 2 !== 0) return null;

  for (const [key, value] of url.searchParams) {
    // Digital Link reserves a few non-AI query keys; everything numeric is an AI.
    if (!/^\d{2,4}$/.test(key)) continue;
    if (!isKnownAi(key)) return null;
    fields.push({ ai: key, value });
  }

  const elementString = fields
    .map((entry) => `(${entry.ai})${entry.value}`)
    .join("");
  const parsed = parseGs1(elementString);
  if (!parsed.ok) return null;
  return factsFromFields(
    parsed.fields.map((entry) => ({ ai: entry.ai, value: entry.value })),
    "digital-link",
  );
}

/* -------------------------------------------------------------------------- */
/* Decoder registry + verdict                                                  */
/* -------------------------------------------------------------------------- */

export type DecoderDoc = {
  id: string;
  version: string;
  name: string;
  status: "standards" | "pattern" | "none";
  what: string;
  limitation: string;
  evidence: EvidenceRef;
  /** ISO date this decoder's sources were last checked by hand. */
  verifiedOn: string;
};

const CHECKED_ON = "2026-11-13";

export const DIGITAL_LINK_EVIDENCE: EvidenceRef = {
  label: "GS1 Digital Link Standard — URI syntax 1.7.0 (Aug 2026)",
  url: "https://ref.gs1.org/standards/digital-link/uri-syntax/",
  kind: "standard",
};

export const DECODERS: DecoderDoc[] = [
  {
    id: "gs1-element-string",
    version: "2.0.0",
    name: "GS1 element string (AI 11/13/15/16/17/7003/8008)",
    status: "standards",
    what: "Reads every date application identifier the GS1 General Specifications define for a product: production (11), packaging (13), best before (15), sell by (16), expiration (17), expiration date and time (7003) and date and time of production (8008). A day of 00 means the last day of the month; a field that is not a real date is rejected.",
    limitation:
      "Only works when the code really is a GS1 element string, which a printed lot number usually is not. A GTIN on its own carries no date.",
    evidence: STANDARD_EVIDENCE,
    verifiedOn: CHECKED_ON,
  },
  {
    id: "gs1-digital-link",
    version: "1.0.0",
    name: "GS1 Digital Link URI",
    status: "standards",
    what: "Parses a GS1 Digital Link URI — the /01/<gtin>/17/<date> path form, the ?17=<date> query form, or both — into the same application identifiers, so a QR code on a pack yields its batch and dates without a guess.",
    limitation:
      "The URI must be a real GS1 Digital Link (a primary key such as AI 01 first) and pass the same AI validation as an element string. A marketing URL that merely contains numbers is not accepted.",
    evidence: DIGITAL_LINK_EVIDENCE,
    verifiedOn: CHECKED_ON,
  },
  {
    id: "explicit-date",
    version: "1.1.0",
    name: "Explicit date inside the lot code",
    status: "pattern",
    what: "Recognises a date the manufacturer typed into the code itself — 06/2027, 2027-06-12, 20270612, 260612, 2026-317 (ISO ordinal) — and rejects impossible dates such as 2026-02-30.",
    limitation:
      "A pattern, not a brand algorithm. Two readings of the same digits are both shown when the code is ambiguous, and the packaging remains the authority.",
    evidence: {
      label: "ISO 8601 calendar notation (pattern basis)",
      url: "https://www.iso.org/iso-8601-date-and-time-format.html",
      kind: "standard",
    },
    verifiedOn: CHECKED_ON,
  },
  {
    id: "none",
    version: "0",
    name: "No documented decoder",
    status: "none",
    what: "Nothing is claimed. The tool explains why, shows the brand's own guidance where a public address exists, and asks for the printed date instead.",
    limitation:
      "Most cosmetics brands use internal lot numbers with no published date logic. Guessing one would produce a confident-looking wrong answer.",
    evidence: {
      label: "No public manufacturer documentation identified",
      url: null,
      kind: "none",
    },
    verifiedOn: CHECKED_ON,
  },
];

export function decoderDoc(id: string) {
  return (
    DECODERS.find((entry) => entry.id === id) ?? DECODERS[DECODERS.length - 1]
  );
}

export type DecodeOutcome = {
  verdict: DecoderVerdict;
  /** ISO date, when one was decoded with the stated confidence. */
  manufacture: string | null;
  expiry: string | null;
  candidates: DateCandidate[];
  gs1: Gs1Facts | null;
};

/** Run every decoder that can apply, and describe the strongest honest result. */
export function decodeCode(brand: BrandRecord, rawCode: string): DecodeOutcome {
  const code = rawCode.trim();

  // 1. Standards carriers: a Digital Link URI, then an element string.
  const gs1 = readDigitalLinkFacts(code) ?? readGs1Facts(code);
  if (gs1 && gs1.dates.length) {
    const parts = gs1.dates.map(
      (entry) => `${entry.label.toLowerCase()} (AI ${entry.ai})`,
    );
    if (gs1.batch) parts.push("batch (AI 10)");
    const fromLink = gs1.carrier === "digital-link";
    return {
      manufacture: gs1.productionDate,
      expiry: gs1.expiryDate,
      candidates: [],
      gs1,
      verdict: {
        id: fromLink ? "gs1-digital-link" : "gs1-element-string",
        version: fromLink ? "1.0.0" : "2.0.0",
        status: "verified",
        headline: fromLink
          ? "Decoded from a GS1 Digital Link URI"
          : "Decoded from a GS1 element string",
        detail: `${fromLink ? "This is a GS1 Digital Link URI" : "This is a GS1 element string"}, and it carries ${parts.join(", ")}. The dates come from the standard-defined fields, not from a guess.`,
        match: gs1.fields.map((field) => `(${field.ai})`).join(""),
        evidence: fromLink
          ? DIGITAL_LINK_EVIDENCE.label
          : STANDARD_EVIDENCE.label,
      },
    };
  }

  // 2. Pattern scan — never presented as the brand's algorithm.
  const scan = scanExplicitDate(code);
  if (scan.candidates.length) {
    const first = scan.candidates[0];
    return {
      manufacture: scan.ambiguous ? null : first.date,
      expiry: null,
      candidates: scan.candidates,
      gs1,
      verdict: {
        id: "explicit-date",
        version: "1.1.0",
        status: "estimated",
        headline: scan.ambiguous
          ? "A date is visible in the code, but it is ambiguous"
          : "A date is visible in the code",
        detail: scan.detail,
        match: scan.ambiguous ? null : first.match,
        evidence: "ISO 8601 calendar pattern — not a manufacturer decoder",
      },
    };
  }

  // 3. Nothing defensible.
  return {
    manufacture: null,
    expiry: null,
    candidates: [],
    gs1,
    verdict: {
      id: "none",
      version: brand.decoderVersion,
      status: "undecodable",
      headline: "No reliable decoder for this brand's lot code",
      detail: `${brand.name} does not publish a batch-code date format${brand.source.url ? "" : ", and no manufacturer document describes one"}. The code stays a lot number: useful to the brand, opaque to everyone else.`,
      match: null,
      evidence: brand.source.label,
    },
  };
}
