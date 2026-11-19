import "server-only";

import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Local-first JSON store for the BioCraft font admin.
 *
 * Public font content stays in the committed catalogue. Only administrative
 * overlays (approval state, edited metadata, staged imports, usage counters)
 * live in this writable directory. Supabase is intentionally not involved.
 *
 * Serverless platforms mount the bundle read-only; writes then fail with a
 * clear `FontStoreReadOnlyError`, and the admin UI explains that the change
 * was validated but must be committed through the pipeline instead of
 * pretending it was saved.
 */

const ROOT = process.cwd();
export const FONT_DATA_DIR = path.join(ROOT, "data", "fonts");
export const OVERRIDES_FILE = path.join(FONT_DATA_DIR, "overrides.json");
export const USAGE_FILE = path.join(FONT_DATA_DIR, "usage.json");
export const IMPORT_QUEUE_FILE = path.join(FONT_DATA_DIR, "import-queue.json");

export class FontStoreReadOnlyError extends Error {
  constructor(cause?: unknown) {
    super("This deployment cannot persist font admin changes.");
    this.name = "FontStoreReadOnlyError";
    this.cause = cause;
  }
}

type CacheEntry = { mtimeMs: number; value: unknown };

const cache = new Map<string, CacheEntry>();

export async function readJsonFile<T>(file: string, fallback: T): Promise<T> {
  try {
    const info = await stat(file);
    const cached = cache.get(file);
    if (cached && cached.mtimeMs === info.mtimeMs) {
      return cached.value as T;
    }
    const raw = await readFile(file, "utf8");
    const value = JSON.parse(raw) as T;
    cache.set(file, { mtimeMs: info.mtimeMs, value });
    return value;
  } catch {
    return fallback;
  }
}

export async function writeJsonFile<T>(file: string, value: T): Promise<void> {
  try {
    await mkdir(path.dirname(file), { recursive: true });
    const temporary = `${file}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
    await rename(temporary, file);
    cache.delete(file);
  } catch (error) {
    throw new FontStoreReadOnlyError(error);
  }
}

export async function updateJsonFile<T>(
  file: string,
  fallback: T,
  update: (current: T) => T,
): Promise<T> {
  const current = await readJsonFile<T>(file, fallback);
  const next = update(current);
  await writeJsonFile(file, next);
  return next;
}
