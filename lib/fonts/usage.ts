import "server-only";

import { USAGE_FILE, readJsonFile, updateJsonFile } from "./store";

/**
 * Anonymous, aggregate font usage. Stored next to the admin overlays, never
 * tied to a visitor. On read-only deployments the counter still works for the
 * lifetime of the server instance, and the admin screen says so.
 */

export type UsageSnapshot = {
  updatedAt: string | null;
  fonts: Record<string, number>;
  surfaces: Record<string, number>;
  persisted: boolean;
};

const EMPTY: UsageSnapshot = {
  updatedAt: null,
  fonts: {},
  surfaces: {},
  persisted: true,
};

let memory: UsageSnapshot = { ...EMPTY, persisted: false };

export async function readUsage(): Promise<UsageSnapshot> {
  const stored = await readJsonFile<UsageSnapshot>(USAGE_FILE, EMPTY);
  if (!stored.updatedAt) {
    return { ...memory, persisted: memory.persisted };
  }
  return {
    updatedAt: stored.updatedAt,
    fonts: { ...stored.fonts, ...memory.fonts },
    surfaces: { ...stored.surfaces, ...memory.surfaces },
    persisted: true,
  };
}

export async function recordFontUsage(
  slug: string,
  surface: string,
): Promise<{ persisted: boolean }> {
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return { persisted: false };
  const safeSurface = /^[a-z0-9-]{1,40}$/.test(surface) ? surface : "unknown";
  memory = {
    ...memory,
    fonts: {
      ...memory.fonts,
      [slug]: (memory.fonts[slug] ?? 0) + 1,
    },
    surfaces: {
      ...memory.surfaces,
      [safeSurface]: (memory.surfaces[safeSurface] ?? 0) + 1,
    },
    updatedAt: new Date().toISOString(),
  };

  try {
    await updateJsonFile<UsageSnapshot>(USAGE_FILE, EMPTY, (current) => ({
      updatedAt: memory.updatedAt,
      fonts: {
        ...current.fonts,
        [slug]: (current.fonts[slug] ?? 0) + 1,
      },
      surfaces: {
        ...current.surfaces,
        [safeSurface]: (current.surfaces[safeSurface] ?? 0) + 1,
      },
      persisted: true,
    }));
    return { persisted: true };
  } catch {
    return { persisted: false };
  }
}
