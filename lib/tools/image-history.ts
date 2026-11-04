/**
 * Recent-conversion history for the Image to Image Converter, stored ONLY in
 * this browser. Converted outputs are kept so they can be re-downloaded after
 * a reload; the original uploads are never stored. Retention is
 * user-configured and "session" (the default) persists nothing at all.
 * Nothing here ever leaves the device.
 *
 * The storage shape mirrors lib/tools/pdf-to-word/history.ts deliberately:
 * results go into IndexedDB as an ArrayBuffer rather than a Blob, because
 * WebKit/Safari has long-standing bugs storing Blob/File objects there
 * ("Error preparing Blob/File data…") while ArrayBuffer structured-clones
 * reliably everywhere. The public ConvertHistoryItem still exposes a Blob.
 */

export type ImageHistoryRetention = "session" | "24h" | "7d";

export const IMAGE_HISTORY_RETENTION_KEY = "qk:i2i-retention";
export const MAX_IMAGE_HISTORY_ITEMS = 20;
/** Results larger than this are listed as not kept (IndexedDB prudence). */
export const MAX_IMAGE_HISTORY_BLOB_BYTES = 10 * 1024 * 1024;

export interface ConvertHistoryItem {
  id: string;
  sourceName: string;
  resultName: string;
  /** Output MIME, so the Blob can be re-wrapped correctly on load. */
  mime: string;
  /** Output size in bytes. */
  size: number;
  createdAt: number;
  /** One-line outcome summary, e.g. "1600 × 1200 · WEBP · 74% quality". */
  summary: string;
  /** Set when the engine had to warn about quality loss to hit the target. */
  warning?: string;
  blob: Blob;
}

const DB_NAME = "quickkit-image-to-image";
const DB_VERSION = 1;
const STORE = "results";

interface StoredConvertHistoryItem extends Omit<ConvertHistoryItem, "blob"> {
  data: ArrayBuffer;
}

function toHistoryItem(
  stored: StoredConvertHistoryItem,
): ConvertHistoryItem | null {
  if (!(stored.data instanceof ArrayBuffer)) return null;
  const { data, ...rest } = stored;
  return { ...rest, blob: new Blob([data], { type: stored.mime }) };
}

const RETENTION_MS: Record<
  Exclude<ImageHistoryRetention, "session">,
  number
> = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
};

export function loadImageHistoryRetention(): ImageHistoryRetention {
  try {
    const value = window.localStorage.getItem(IMAGE_HISTORY_RETENTION_KEY);
    return value === "24h" || value === "7d" ? value : "session";
  } catch {
    return "session";
  }
}

export function saveImageHistoryRetention(
  retention: ImageHistoryRetention,
): void {
  try {
    window.localStorage.setItem(IMAGE_HISTORY_RETENTION_KEY, retention);
  } catch {
    // Private mode etc. — the preference simply does not stick.
  }
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("idb open"));
  });
}

function tx<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE, mode);
        const request = run(transaction.objectStore(STORE));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () =>
          reject(request.error ?? new Error("idb request"));
        transaction.oncomplete = () => db.close();
        transaction.onerror = () =>
          reject(transaction.error ?? new Error("idb transaction"));
      }),
  );
}

/** True when IndexedDB is usable at all in this environment. */
function idbAvailable(): boolean {
  return typeof window !== "undefined" && "indexedDB" in window;
}

/**
 * Load stored items newest-first, deleting anything past the retention window
 * (and anything beyond the item cap).
 */
export async function loadImageHistory(
  retention: ImageHistoryRetention,
): Promise<ConvertHistoryItem[]> {
  if (retention === "session" || !idbAvailable()) return [];
  let stored: StoredConvertHistoryItem[];
  try {
    stored = await tx(
      "readonly",
      (store) => store.getAll() as IDBRequest<StoredConvertHistoryItem[]>,
    );
  } catch {
    return [];
  }
  const items = stored
    .map(toHistoryItem)
    .filter((item): item is ConvertHistoryItem => item !== null);
  const cutoff = Date.now() - RETENTION_MS[retention];
  const fresh = items
    .filter((item) => item.createdAt >= cutoff)
    .sort((a, b) => b.createdAt - a.createdAt);
  const keep = fresh.slice(0, MAX_IMAGE_HISTORY_ITEMS);
  const doomed = items.filter((item) => !keep.some((k) => k.id === item.id));
  for (const item of doomed) {
    void tx("readwrite", (store) => store.delete(item.id)).catch(
      () => undefined,
    );
  }
  return keep;
}

/**
 * Persist one result. Returns the stored item, or null when it was skipped —
 * which happens for session retention, oversized results, or storage failure.
 * A null return is never an error for the conversion itself.
 */
/**
 * The rules deciding whether a result may be stored, as a pure predicate so
 * they can be tested without IndexedDB. Returns a reason string when the
 * result must be skipped, or null when it may be stored.
 */
export function skipReason(
  retention: ImageHistoryRetention,
  blobSize: number,
  cap: number = MAX_IMAGE_HISTORY_BLOB_BYTES,
): "session" | "too-large" | null {
  if (retention === "session") return "session";
  if (blobSize > cap) return "too-large";
  return null;
}

export async function addImageHistoryItem(
  retention: ImageHistoryRetention,
  item: Omit<ConvertHistoryItem, "id" | "createdAt" | "size">,
): Promise<ConvertHistoryItem | null> {
  if (skipReason(retention, item.blob.size)) return null;
  if (!idbAvailable()) return null;
  const created: ConvertHistoryItem = {
    ...item,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
    size: item.blob.size,
  };
  try {
    const record: StoredConvertHistoryItem = {
      ...created,
      data: await item.blob.arrayBuffer(),
    };
    delete (record as Partial<ConvertHistoryItem>).blob;
    await tx("readwrite", (store) => store.put(record));
    return created;
  } catch {
    return null;
  }
}

export async function removeImageHistoryItem(id: string): Promise<void> {
  if (!idbAvailable()) return;
  await tx("readwrite", (store) => store.delete(id)).catch(() => undefined);
}

export async function clearImageHistory(): Promise<void> {
  if (!idbAvailable()) return;
  await tx("readwrite", (store) => store.clear()).catch(() => undefined);
}

/** Build the one-line outcome summary shown on a history row. */
export function imageHistorySummary(input: {
  /** Absent when the encoder did not report dimensions. */
  width?: number;
  height?: number;
  formatLabel: string;
  /** Only set for lossy encodes, where a quality number means something. */
  quality?: number;
  lossless?: boolean;
}): string {
  // Matches convert-shared/types.ts formatDimensions(): no invented numbers.
  const parts = [
    input.width && input.height
      ? `${input.width.toLocaleString("en-US")} × ${input.height.toLocaleString(
          "en-US",
        )}`
      : "—",
    input.formatLabel,
  ];
  if (input.lossless) parts.push("lossless");
  else if (typeof input.quality === "number")
    parts.push(`${Math.round(input.quality)}% quality`);
  return parts.join(" · ");
}
