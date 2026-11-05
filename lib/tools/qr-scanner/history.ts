/**
 * Local scan history.
 *
 * Storage rules, in order of precedence:
 *
 *  1. Nothing leaves this device. The history lives in `localStorage` and is
 *     never sent anywhere, because there is nothing to send it to.
 *  2. Payloads that carry a secret (a Wi-Fi password, an embedded credential)
 *     are *not* stored unless the user turns on "store sensitive payloads".
 *     The entry keeps its type, timestamp and a redacted summary instead, so
 *     the log stays useful without becoming a password file.
 *  3. No image data is ever stored — only the file name and byte size.
 *  4. The list is capped, and deleting it is a single explicit action.
 */
import type { ContentTypeId } from "./content";
import { contentTypeLabel } from "./content";

export const HISTORY_KEY = "qk:qr-scanner-history:v1";
export const MAX_HISTORY = 200;

export type HistoryRecord = {
  id: string;
  /** Epoch milliseconds. */
  at: number;
  type: ContentTypeId;
  typeLabel: string;
  /** Decoded payload, or null when it was withheld as sensitive. */
  payload: string | null;
  /** Human summary; safe to show even when `payload` is withheld. */
  summary: string;
  /** True when a payload was withheld from storage. */
  redacted: boolean;
  sourceName: string;
  /** "decoded" or "no code found". */
  status: "decoded" | "failed";
  /** Number of symbols found in that scan. */
  count: number;
};

/**
 * The part of a withheld payload that is safe to keep.
 *
 * Redaction must remove the secret, not the only thing that makes the entry
 * recognisable: "Wi-Fi credentials — content withheld (sensitive) · SecretNet"
 * is useful and leaks nothing, whereas twenty identical "withheld" rows are
 * not. Only the specific secret field is dropped, and only for the formats
 * whose grammar we actually parse. For anything else, nothing is kept.
 */
function publicHint(payload: string, type: ContentTypeId): string {
  if (!payload) return "";
  switch (type) {
    case "wifi": {
      const body = payload.replace(/^WIFI:/i, "");
      const ssid = /(?:^|;)S:((?:\\.|[^;\\])*)/i.exec(body);
      return ssid ? ` · ${ssid[1].replace(/\\(.)/g, "$1")}` : "";
    }
    case "vcard":
    case "mecard": {
      const body = payload.replace(/^MECARD:/i, ";");
      const raw =
        /(?:^|\n)FN:(.+)$/im.exec(body)?.at(1) ??
        /(?:^|;)N:([^;]*)/i.exec(body)?.at(1);
      const name = (raw ?? "").trim();
      if (!name) return "";
      // MECARD writes "Last,First"; show it the way a person says it.
      const parts = name
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean);
      const display = parts.length === 2 ? `${parts[1]} ${parts[0]}` : name;
      return ` · ${display.slice(0, 60)}`;
    }
    default:
      // No parsed, guaranteed-secret-free field exists for this type, so the
      // summary stays generic rather than guessing which substring was secret.
      return "";
  }
}

const newId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export function prepareRecord(input: {
  type: ContentTypeId;
  payload: string;
  summary: string;
  sensitive: boolean;
  sourceName: string;
  status: "decoded" | "failed";
  count: number;
  storeSensitive: boolean;
  at?: number;
}): HistoryRecord {
  const withhold = input.sensitive && !input.storeSensitive;
  const typeLabel = contentTypeLabel(input.type);
  return {
    id: newId(),
    at: input.at ?? Date.now(),
    type: input.type,
    typeLabel,
    payload: withhold ? null : input.payload,
    // A withheld record still gets a summary that a person can recognise and
    // search for, without the secret itself: the non-secret fields of the
    // payload (the network name, the contact name, the address) are safe to
    // keep, and a list of entries that all say "withheld" would be useless.
    summary: withhold
      ? `${typeLabel} — content withheld (sensitive)${publicHint(input.payload, input.type)}`
      : input.summary,
    redacted: withhold,
    sourceName: input.sourceName,
    status: input.status,
    count: input.count,
  };
}

/** Validate a record read back from storage; drop anything malformed. */
function coerceRecord(value: unknown): HistoryRecord | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.id !== "string" || typeof raw.at !== "number") return null;
  if (!Number.isFinite(raw.at)) return null;
  const status = raw.status === "decoded" ? "decoded" : "failed";
  const type = (
    typeof raw.type === "string" ? raw.type : "unknown"
  ) as ContentTypeId;
  return {
    id: raw.id,
    at: raw.at,
    type,
    typeLabel:
      typeof raw.typeLabel === "string"
        ? raw.typeLabel
        : contentTypeLabel(type),
    payload: typeof raw.payload === "string" ? raw.payload : null,
    summary: typeof raw.summary === "string" ? raw.summary : "",
    redacted: Boolean(raw.redacted),
    sourceName: typeof raw.sourceName === "string" ? raw.sourceName : "",
    status,
    count: Number.isFinite(Number(raw.count))
      ? Math.max(0, Number(raw.count))
      : 0,
  };
}

export function loadHistory(
  storage: Pick<Storage, "getItem"> | null,
): HistoryRecord[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(coerceRecord)
      .filter((record): record is HistoryRecord => Boolean(record))
      .slice(0, MAX_HISTORY);
  } catch {
    return [];
  }
}

export function saveHistory(
  storage: Pick<Storage, "setItem"> | null,
  records: HistoryRecord[],
): boolean {
  if (!storage) return false;
  try {
    storage.setItem(HISTORY_KEY, JSON.stringify(records.slice(0, MAX_HISTORY)));
    return true;
  } catch {
    return false;
  }
}

export function clearHistory(storage: Pick<Storage, "removeItem"> | null) {
  if (!storage) return;
  try {
    storage.removeItem(HISTORY_KEY);
  } catch {
    /* nothing to undo */
  }
}

export type HistoryFilter = {
  query?: string;
  type?: ContentTypeId | "all";
  /** Inclusive start of the range, epoch ms. */
  from?: number;
  /** Exclusive end of the range, epoch ms. */
  to?: number;
};

/**
 * Filter and sort history. The query matches the summary, the payload (when it
 * was stored), the type label and the source file name — the same fields the
 * user can see, so search never matches invisible data.
 */
export function filterHistory(
  records: HistoryRecord[],
  filter: HistoryFilter,
  sort: "newest" | "oldest" = "newest",
): HistoryRecord[] {
  const query = (filter.query ?? "").trim().toLocaleLowerCase();
  return [...records]
    .filter((record) => {
      if (filter.type && filter.type !== "all" && record.type !== filter.type)
        return false;
      if (typeof filter.from === "number" && record.at < filter.from)
        return false;
      if (typeof filter.to === "number" && record.at >= filter.to) return false;
      if (!query) return true;
      return [
        record.summary,
        record.payload ?? "",
        record.typeLabel,
        record.sourceName,
      ]
        .join(" ")
        .toLocaleLowerCase()
        .includes(query);
    })
    .sort((a, b) => (sort === "newest" ? b.at - a.at : a.at - b.at));
}

/** Types actually present in a history list, for the filter dropdown. */
export function historyTypes(records: HistoryRecord[]): ContentTypeId[] {
  return [...new Set(records.map((record) => record.type))];
}
