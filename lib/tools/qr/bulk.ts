/**
 * Bulk generation: CSV intake, column mapping and per-row payload building.
 *
 * The parser is deliberately small and strict — a QR payload is plain text, so
 * nothing here needs a spreadsheet engine, and nothing that came out of a
 * spreadsheet is ever executed.
 */
import {
  contentTypeDef,
  isKnownContentType,
  type QrField,
  type QrValues,
} from "./payload";
import { fitQr, utf8Length } from "./capacity";
import { QrUserError, type QrContentTypeId } from "./types";

export const BULK_LIMITS = {
  /** Ceiling a user can raise the batch size to. */
  maxRows: 500,
  defaultRows: 200,
  maxFileBytes: 3 * 1024 * 1024,
  maxColumns: 30,
  maxCellChars: 1500,
};

export type CsvTable = {
  headers: string[];
  rows: string[][];
  delimiter: string;
  /** Rows dropped for being empty or over-wide, with reasons. */
  notes: string[];
  truncated: boolean;
};

export function detectDelimiter(sample: string) {
  const counts: Record<string, number> = { ",": 0, ";": 0, "\t": 0, "|": 0 };
  const lines = sample.split(/\r?\n/).slice(0, 10);
  for (const line of lines)
    for (const key of Object.keys(counts)) {
      let inQuotes = false;
      for (let index = 0; index < line.length; index += 1) {
        const char = line[index];
        if (char === '"') inQuotes = !inQuotes;
        else if (char === key && !inQuotes) counts[key] += 1;
      }
    }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][1] > 0
    ? (Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0] as string)
    : ",";
}

/** RFC 4180-style parser: quotes, doubled quotes, newlines inside quotes. */
export function parseCsv(text: string, options: { maxRows?: number } = {}) {
  const source = text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const delimiter = detectDelimiter(source.slice(0, 4000));
  const maxRows = options.maxRows ?? BULK_LIMITS.maxRows;
  const records: string[][] = [];
  let field = "";
  let record: string[] = [];
  let inQuotes = false;
  const notes: string[] = [];
  let truncated = false;

  const pushRecord = () => {
    record.push(field);
    field = "";
    if (record.length === 1 && record[0].trim() === "") return; // blank line
    if (record.length > BULK_LIMITS.maxColumns) {
      notes.push(
        `Row ${records.length + 1}: ${record.length} columns, only the first ${BULK_LIMITS.maxColumns} are used.`,
      );
      record = record.slice(0, BULK_LIMITS.maxColumns);
    }
    // `maxRows` counts data rows; records[0] is the header.
    if (records.length >= maxRows + 1) {
      truncated = true;
      return;
    }
    records.push(
      record.map((cell) =>
        cell.length > BULK_LIMITS.maxCellChars
          ? `${cell.slice(0, BULK_LIMITS.maxCellChars)}…`
          : cell,
      ),
    );
  };

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (inQuotes) {
      if (char === '"') {
        if (source[index + 1] === '"') {
          field += '"';
          index += 1;
        } else inQuotes = false;
      } else field += char;
      continue;
    }
    if (char === '"') {
      if (field.trim() === "") {
        inQuotes = true;
        continue;
      }
      field += char; // a quote mid-field is literal
      continue;
    }
    if (char === delimiter) {
      record.push(field);
      field = "";
      continue;
    }
    if (char === "\n") {
      pushRecord();
      record = [];
      continue;
    }
    field += char;
  }
  if (field !== "" || record.length) pushRecord();

  const headerRow = records.shift() ?? [];
  const headers = headerRow.map(
    (cell, index) => cell.trim() || `Column ${index + 1}`,
  );
  const table: CsvTable = {
    headers,
    rows: records,
    delimiter,
    notes,
    truncated,
  };
  return table;
}

/** Always rejects rather than throwing synchronously, so `await` is uniform. */
export async function parseCsvFile(
  file: File,
  options: { maxRows?: number } = {},
) {
  if (file.size > BULK_LIMITS.maxFileBytes)
    throw new QrUserError(
      `That CSV is ${(file.size / 1024 / 1024).toFixed(1)} MB — keep it under ${(BULK_LIMITS.maxFileBytes / 1024 / 1024).toFixed(0)} MB.`,
    );
  const text = await file.text();
  const table = parseCsv(text, options);
  // Blank lines are ignored, so the real test is whether anything survived.
  if (!table.rows.length)
    throw new QrUserError(
      "A CSV needs a header row and at least one row of data.",
    );
  return table;
}

export type ColumnMapping = Record<string, number>;

const SYNONYMS: Record<string, string[]> = {
  url: ["url", "link", "website", "page", "href", "destination"],
  text: ["text", "content", "message", "note", "body", "description"],
  to: ["to", "email", "recipient", "address", "mail"],
  cc: ["cc", "copy"],
  subject: ["subject", "title"],
  body: ["body", "message"],
  phone: ["phone", "mobile", "number", "tel", "whatsapp", "msisdn"],
  message: ["message", "text", "body", "prefill"],
  ssid: ["ssid", "wifi", "network", "wlan", "name"],
  password: ["password", "pass", "key", "secret", "psk"],
  encryption: ["encryption", "security", "auth", "type"],
  hidden: ["hidden", "hide"],
  identity: ["identity", "username", "user", "login"],
  firstName: ["first", "firstname", "given", "fname", "name"],
  lastName: ["last", "lastname", "family", "surname", "lname"],
  org: ["org", "company", "organisation", "organization"],
  title: ["title", "position", "role", "designation"],
  mobile: ["mobile", "cell", "phone", "tel"],
  workPhone: ["work", "workphone", "office", "phone2"],
  email: ["email", "mail", "emailaddress"],
  website: ["website", "web", "site", "url"],
  street: ["street", "address", "addr1", "line1"],
  city: ["city", "town", "locality"],
  region: ["region", "state", "province"],
  postal: ["postal", "zip", "postcode", "pincode"],
  country: ["country", "nation"],
  latitude: ["lat", "latitude", "y"],
  longitude: ["lng", "lon", "long", "longitude", "x"],
  label: ["label", "name", "title", "place"],
  format: ["format", "style", "mode"],
  zoom: ["zoom", "z"],
  startDate: ["start", "startdate", "from", "start time", "dtstart"],
  endDate: ["end", "enddate", "to", "until", "dtend"],
  date: ["date", "day", "alldate"],
  endDateAllDay: ["enddate", "lastday", "end date"],
  location: ["location", "venue", "place", "where"],
  description: ["description", "details", "summary"],
  timezone: ["timezone", "tz", "time"],
  platform: ["platform", "network", "social", "site"],
  username: ["username", "handle", "profile", "page", "account"],
  store: ["store", "platform", "market"],
  appId: ["appid", "appleid", "id", "itunesid"],
  packageName: ["package", "packagename", "appid", "androidid"],
};

function normaliseHeader(header: string) {
  return header.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Best-guess mapping of CSV columns onto the fields of a content type. */
export function guessMapping(
  headers: string[],
  fields: QrField[],
): ColumnMapping {
  const mapping: ColumnMapping = {};
  const used = new Set<number>();
  for (const field of fields) {
    const synonyms = SYNONYMS[field.key] ?? [field.key];
    let best = -1;
    for (let index = 0; index < headers.length; index += 1) {
      if (used.has(index)) continue;
      const header = normaliseHeader(headers[index]);
      if (!header) continue;
      if (synonyms.some((word) => header === normaliseHeader(word))) {
        best = index;
        break;
      }
      if (
        best === -1 &&
        synonyms.some((word) => header.includes(normaliseHeader(word)))
      )
        best = index;
    }
    if (best === -1 && headers.length === fields.length)
      best = fields.indexOf(field);
    if (best >= 0) {
      mapping[field.key] = best;
      used.add(best);
    } else mapping[field.key] = -1;
  }
  return mapping;
}

export type RowOutcome = {
  ok: boolean;
  payload?: string;
  label?: string;
  error?: string;
  field?: string;
};

function coerce(field: QrField, raw: string | undefined): string | boolean {
  const text = (raw ?? "").trim();
  if (field.type === "checkbox")
    return /^(1|true|yes|y|t|x|hidden|on)$/i.test(text);
  if (field.type === "datetime-local") {
    const iso = text.replace(" ", "T");
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return `${iso}T00:00`;
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(iso)) return iso;
    if (/^\d{4}-\d{2}-\d{2}[T ]\d{1,2}:\d{2}([:]\d{2})?$/.test(iso)) {
      const [date, time] = iso.split(/[T ]/);
      const [h, m] = time.split(":");
      return `${date}T${h.padStart(2, "0")}:${m.padStart(2, "0")}`;
    }
    return text;
  }
  return text;
}

export function valuesFromRow(
  fields: QrField[],
  mapping: ColumnMapping,
  cells: string[],
  fallback: QrValues = {},
): QrValues {
  const values: QrValues = {};
  for (const field of fields) {
    const index = mapping[field.key];
    if (index >= 0) {
      values[field.key] = coerce(field, cells[index]);
      continue;
    }
    // Unmapped: fall back to whatever is typed in the Content tab, then to the
    // field default. That lets a whole batch share e.g. one Wi-Fi password.
    const shared = fallback[field.key];
    values[field.key] =
      shared !== undefined && shared !== ""
        ? coerce(field, String(shared))
        : (field.defaultValue ?? (field.type === "checkbox" ? false : ""));
  }
  return values;
}

/** One CSV row → validated payload, or the precise reason it failed. */
export function buildRowPayload(
  typeId: QrContentTypeId,
  mapping: ColumnMapping,
  cells: string[],
  level: "L" | "M" | "Q" | "H",
  fallback: QrValues = {},
): RowOutcome {
  const def = contentTypeDef(typeId);
  const values = valuesFromRow(def.fields, mapping, cells, fallback);
  let payload: string;
  try {
    payload = def.build(values);
  } catch (error) {
    if (error instanceof QrUserError)
      return { ok: false, error: error.message, field: error.field };
    return { ok: false, error: "This row could not be built." };
  }
  const hasMappedValue = Object.entries(mapping).some(
    ([key, index]) =>
      index >= 0 &&
      String(cells[index] ?? "").trim() !== "" &&
      values[key] !== false,
  );
  if (!hasMappedValue)
    return {
      ok: false,
      error:
        "Every mapped cell in this row is empty, and nothing is shared from the Content tab.",
    };
  const fit = fitQr(utf8Length(payload), level);
  if (!fit.ok)
    return {
      ok: false,
      error:
        fit.reason === "too-long"
          ? `Payload is ${utf8Length(payload).toLocaleString()} bytes — over the tool's limit.`
          : "Payload is too large for one QR code.",
    };
  const labelSource =
    cells[mapping.label] || cells[mapping.name] || cells[0] || def.label;
  return {
    ok: true,
    payload,
    label: String(labelSource).trim().slice(0, 60) || `Row ${def.label}`,
  };
}

/**
 * Resolve a row's content type. When a "type" column is mapped and the cell
 * holds a known content-type id, that row uses it; otherwise the batch default
 * applies. Unknown / empty cells never throw — they fall back to the default.
 */
export function resolveRowType(
  typeColumn: number,
  cells: string[],
  fallbackType: QrContentTypeId,
): QrContentTypeId {
  if (typeColumn < 0) return fallbackType;
  const raw = (cells[typeColumn] ?? "").trim().toLowerCase();
  return isKnownContentType(raw) ? (raw as QrContentTypeId) : fallbackType;
}

/**
 * Mapping for a row's effective type. The batch mapping is reused when the row
 * shares the batch type; otherwise the columns are re-guessed for that type so
 * a mixed-type CSV still maps each row's fields sensibly. The type column itself
 * is excluded from the guess — a header like "type" is also a synonym for some
 * fields (e.g. Wi-Fi encryption) and must not be mapped onto one.
 */
export function mappingForRow(
  rowType: QrContentTypeId,
  batchType: QrContentTypeId,
  batchMapping: ColumnMapping,
  headers: string[],
  excludeColumn = -1,
): ColumnMapping {
  if (rowType === batchType) return batchMapping;
  const effective =
    excludeColumn >= 0
      ? headers.map((header, index) => (index === excludeColumn ? "" : header))
      : headers;
  return guessMapping(effective, contentTypeDef(rowType).fields);
}

/** Headers with the per-row type column blanked, for guessing field mappings. */
export function headersWithoutTypeColumn(
  headers: string[],
  typeColumn: number,
): string[] {
  return typeColumn >= 0
    ? headers.map((header, index) => (index === typeColumn ? "" : header))
    : headers;
}

/** Row numbers that produced the same payload as an earlier row. */
export function findDuplicates(payloads: (string | null)[]) {
  const seen = new Map<string, number>();
  const duplicates: number[] = [];
  payloads.forEach((payload, index) => {
    if (!payload) return;
    const first = seen.get(payload);
    if (first === undefined) seen.set(payload, index);
    else duplicates.push(index);
  });
  return duplicates;
}

export const BULK_TEMPLATE = `name,url,label
QUICKKIT Home,https://quickkit.tools,home
Pricing page,https://quickkit.tools/pricing,pricing
Support,https://quickkit.tools/help,help`;
