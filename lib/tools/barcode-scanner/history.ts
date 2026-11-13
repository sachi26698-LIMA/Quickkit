/**
 * Local scan history for the stand-alone barcode scanner.
 *
 * History is browser-local, opt-out, and never uploaded. Records are validated
 * on load: a corrupted or hand-edited entry is dropped rather than rendered.
 */
export const SCANNER_HISTORY_KEY = "qk:barcode-scanner-history:v1";
export const MAX_SCANNER_HISTORY = 100;

export type ScanSource = "camera" | "image" | "pasted";

export type ScanRecord = {
  id: string;
  value: string;
  format: string;
  label: string;
  source: ScanSource;
  /** ISO timestamp of the most recent time this value was seen. */
  at: string;
  /** How many times the same value has been scanned. */
  count: number;
};

/** Control characters out, length capped, nothing else rewritten. */
export function cleanScanValue(value: string, max = 512) {
  return value
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .slice(0, max);
}

function isRecord(entry: unknown): entry is ScanRecord {
  if (!entry || typeof entry !== "object") return false;
  const record = entry as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.value === "string" &&
    typeof record.format === "string" &&
    typeof record.label === "string" &&
    (record.source === "camera" ||
      record.source === "image" ||
      record.source === "pasted") &&
    typeof record.at === "string" &&
    Number.isFinite(record.count)
  );
}

export function loadScanHistory(
  storage: Pick<Storage, "getItem"> | null,
): ScanRecord[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(SCANNER_HISTORY_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isRecord).slice(0, MAX_SCANNER_HISTORY);
  } catch {
    return [];
  }
}

export function saveScanHistory(
  storage: Pick<Storage, "setItem"> | null,
  records: ScanRecord[],
) {
  if (!storage) return;
  try {
    storage.setItem(
      SCANNER_HISTORY_KEY,
      JSON.stringify(records.slice(0, MAX_SCANNER_HISTORY)),
    );
  } catch {
    /* quota or a private-mode denial: history is a nicety, not a requirement */
  }
}

/**
 * Merge a scan into history. The same value in the same format is not stored
 * twice: its timestamp moves to now and its counter increments.
 */
export function addScanRecord(
  records: ScanRecord[],
  scan: {
    value: string;
    format: string;
    label: string;
    source: ScanSource;
    at?: string;
    id?: string;
  },
): ScanRecord[] {
  const value = cleanScanValue(scan.value.trim());
  if (!value) return records;
  const at = scan.at ?? new Date().toISOString();
  const existing = records.find(
    (record) => record.value === value && record.format === scan.format,
  );
  if (existing)
    return [
      { ...existing, at, count: existing.count + 1, source: scan.source },
      ...records.filter((record) => record !== existing),
    ].slice(0, MAX_SCANNER_HISTORY);
  return [
    {
      id: scan.id ?? `${scan.format}-${Date.now()}-${records.length}`,
      value,
      format: scan.format,
      label: scan.label,
      source: scan.source,
      at,
      count: 1,
    },
    ...records,
  ].slice(0, MAX_SCANNER_HISTORY);
}

export function removeScanRecord(records: ScanRecord[], id: string) {
  return records.filter((record) => record.id !== id);
}

export function clearScanHistory(storage: Pick<Storage, "removeItem"> | null) {
  if (!storage) return;
  try {
    storage.removeItem(SCANNER_HISTORY_KEY);
  } catch {
    /* ignore */
  }
}
