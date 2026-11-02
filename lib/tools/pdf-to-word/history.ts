import type { ConversionMode } from "./types";

/**
 * Recent-conversion history, stored ONLY in this browser (IndexedDB).
 * Only converted DOCX files are kept — original PDFs are never stored.
 * Retention is user-configured: "session" (default) stores nothing at
 * all; "24h" / "7d" persist results locally so they can be re-downloaded
 * after a reload. Nothing here ever leaves the device.
 */

export type HistoryRetention = "session" | "24h" | "7d";

export const HISTORY_RETENTION_KEY = "qk:p2w-retention";
export const MAX_HISTORY_ITEMS = 20;
/** Results larger than this are listed as not kept (IndexedDB prudence). */
export const MAX_HISTORY_BLOB_BYTES = 10 * 1024 * 1024;

export interface HistoryItem {
  id: string;
  sourceName: string;
  resultName: string;
  mode: ConversionMode;
  /** DOCX size in bytes. */
  size: number;
  createdAt: number;
  /** One-line quality summary, e.g. "2 pages · 1 table · 1 image". */
  summary: string;
  blob: Blob;
}

const DB_NAME = "quickkit-pdf-to-word";
const DB_VERSION = 1;
const STORE = "results";
const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/**
 * What actually lands in IndexedDB. The DOCX is stored as an ArrayBuffer,
 * not a Blob: WebKit/Safari has long-standing bugs storing Blob/File
 * objects in IndexedDB ("Error preparing Blob/File data…"), while
 * ArrayBuffer structured-clones reliably everywhere. The public
 * HistoryItem still exposes a Blob, re-wrapped on load.
 */
interface StoredHistoryItem extends Omit<HistoryItem, "blob"> {
  data: ArrayBuffer;
  /** Pre-fix records only; read for backward compatibility, never written. */
  blob?: Blob;
}

function toHistoryItem(stored: StoredHistoryItem): HistoryItem | null {
  const { data, blob, ...rest } = stored;
  if (data instanceof ArrayBuffer)
    return { ...rest, blob: new Blob([data], { type: DOCX_MIME }) };
  if (blob instanceof Blob) return { ...rest, blob };
  return null;
}

const RETENTION_MS: Record<Exclude<HistoryRetention, "session">, number> = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
};

export function loadRetentionPreference(): HistoryRetention {
  try {
    const value = window.localStorage.getItem(HISTORY_RETENTION_KEY);
    return value === "24h" || value === "7d" ? value : "session";
  } catch {
    return "session";
  }
}

export function saveRetentionPreference(retention: HistoryRetention): void {
  try {
    window.localStorage.setItem(HISTORY_RETENTION_KEY, retention);
  } catch {
    // Private mode etc. — preference simply does not stick.
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

/**
 * Load stored items newest-first, deleting anything past the retention
 * window (and anything beyond the item cap).
 */
export async function loadHistory(
  retention: HistoryRetention,
): Promise<HistoryItem[]> {
  if (retention === "session" || typeof window === "undefined") return [];
  let stored: StoredHistoryItem[];
  try {
    stored = await tx(
      "readonly",
      (store) => store.getAll() as IDBRequest<StoredHistoryItem[]>,
    );
  } catch {
    return [];
  }
  const items = stored
    .map(toHistoryItem)
    .filter((item): item is HistoryItem => item !== null);
  const cutoff = Date.now() - RETENTION_MS[retention];
  const fresh = items
    .filter((item) => item.createdAt >= cutoff)
    .sort((a, b) => b.createdAt - a.createdAt);
  const keep = fresh.slice(0, MAX_HISTORY_ITEMS);
  const doomed = items.filter((item) => !keep.some((k) => k.id === item.id));
  for (const item of doomed) {
    void tx("readwrite", (store) => store.delete(item.id)).catch(
      () => undefined,
    );
  }
  return keep;
}

/** Persist one result. Returns the stored item, or null when skipped. */
export async function addHistoryItem(
  retention: HistoryRetention,
  item: Omit<HistoryItem, "id" | "createdAt" | "size">,
): Promise<HistoryItem | null> {
  if (retention === "session") return null;
  if (item.blob.size > MAX_HISTORY_BLOB_BYTES) return null;
  const created: HistoryItem = {
    ...item,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
    size: item.blob.size,
  };
  try {
    const { blob, ...rest } = created;
    void blob;
    const record: StoredHistoryItem = {
      ...rest,
      data: await item.blob.arrayBuffer(),
    };
    await tx("readwrite", (store) => store.put(record));
    return created;
  } catch {
    return null;
  }
}

export async function removeHistoryItem(id: string): Promise<void> {
  await tx("readwrite", (store) => store.delete(id)).catch(() => undefined);
}

export async function clearHistory(): Promise<void> {
  await tx("readwrite", (store) => store.clear()).catch(() => undefined);
}
