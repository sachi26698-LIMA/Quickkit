/**
 * Local persistence: design presets and recent-generation history.
 *
 * Both live in `window.localStorage` on this device only — there is no server
 * side of this tool. Secrets typed into the form (a Wi-Fi password) are never
 * written, and "designs only" mode keeps content out of storage completely.
 */
import { sensitiveKeysFor } from "./payload";
import type { QrContentTypeId, QrDesign } from "./types";
import { clampDesign, presetDesign, readFill } from "./style";
import { defaultDesign } from "./style";

export const PRESET_STORAGE_KEY = "qk:qr-presets:v1";
export const HISTORY_STORAGE_KEY = "qk:qr-history:v1";
export const HISTORY_MODE_KEY = "qk:qr-history-mode:v1";
export const MAX_PRESETS = 24;
export const MAX_HISTORY = 20;

export type QrHistoryMode = "full" | "designs";

export type QrPreset = {
  id: string;
  name: string;
  createdAt: number;
  design: QrDesign;
};

export type QrHistoryEntry = {
  id: string;
  createdAt: number;
  typeId: QrContentTypeId;
  label: string;
  bytes: number;
  version: number;
  mode: QrHistoryMode;
  design: QrDesign;
  /** Field values needed to re-generate. Never contains sensitive fields. */
  values: Record<string, string | boolean>;
};

const storage = {
  get(key: string): unknown {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  set(key: string, value: unknown) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false; // private mode / quota — the tool still works, just forgets
    }
  },
  remove(key: string) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  },
};

export const newId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/** Strip anything that should not be remembered, then clamp the design. */
export function sanitizeValues(
  typeId: QrContentTypeId,
  values: Record<string, string | boolean>,
) {
  const blocked = new Set(sensitiveKeysFor(typeId));
  const next: Record<string, string | boolean> = {};
  for (const [key, value] of Object.entries(values))
    if (!blocked.has(key)) next[key] = value;
  return next;
}

function readDesign(input: unknown): QrDesign {
  if (!input || typeof input !== "object") return defaultDesign();
  const raw = input as Record<string, unknown>;
  const { design } = clampDesign(
    {
      ...raw,
      fg: readFill(raw.fg, defaultDesign().fg),
      bg: readFill(raw.bg, defaultDesign().bg),
    } as Partial<QrDesign>,
    { hasLogo: false },
  );
  // A stored logo bitmap is deliberately not part of a preset or a history row.
  return presetDesign({
    ...design,
    logo: { ...defaultDesign().logo, ...design.logo },
  });
}

export function loadPresets(): QrPreset[] {
  const stored = storage.get(PRESET_STORAGE_KEY);
  if (!Array.isArray(stored)) return [];
  return stored
    .filter(
      (item): item is Record<string, unknown> =>
        Boolean(item) && typeof item === "object",
    )
    .slice(0, MAX_PRESETS)
    .map((item) => ({
      id: String(item.id ?? newId()),
      name: String(item.name ?? "Untitled preset").slice(0, 40),
      createdAt: Number(item.createdAt ?? Date.now()),
      design: readDesign(item.design),
    }));
}

export function savePreset(
  name: string,
  design: QrDesign,
  existing: QrPreset[],
) {
  const preset: QrPreset = {
    id: newId(),
    name: name.trim().slice(0, 40) || "Untitled preset",
    createdAt: Date.now(),
    design: presetDesign(design),
  };
  const next = [preset, ...existing].slice(0, MAX_PRESETS);
  storage.set(PRESET_STORAGE_KEY, next);
  return next;
}

export function deletePreset(id: string, existing: QrPreset[]) {
  const next = existing.filter((preset) => preset.id !== id);
  storage.set(PRESET_STORAGE_KEY, next);
  return next;
}

export function loadHistoryMode(): QrHistoryMode {
  const value = (() => {
    try {
      return window.localStorage.getItem(HISTORY_MODE_KEY);
    } catch {
      return null;
    }
  })();
  return value === "designs" ? "designs" : "full";
}

export function saveHistoryMode(mode: QrHistoryMode) {
  try {
    window.localStorage.setItem(HISTORY_MODE_KEY, mode);
  } catch {
    /* ignore */
  }
}

export function loadHistory(): QrHistoryEntry[] {
  const stored = storage.get(HISTORY_STORAGE_KEY);
  if (!Array.isArray(stored)) return [];
  return stored
    .filter(
      (item): item is Record<string, unknown> =>
        Boolean(item) && typeof item === "object",
    )
    .slice(0, MAX_HISTORY)
    .map((item) => ({
      id: String(item.id ?? newId()),
      createdAt: Number(item.createdAt ?? Date.now()),
      typeId: item.typeId as QrContentTypeId,
      label: String(item.label ?? "").slice(0, 80),
      bytes: Number(item.bytes ?? 0),
      version: Number(item.version ?? 0),
      mode: item.mode === "designs" ? "designs" : "full",
      design: readDesign(item.design),
      values:
        item.mode === "designs" ||
        !item.values ||
        typeof item.values !== "object"
          ? {}
          : sanitizeValues(
              item.typeId as QrContentTypeId,
              item.values as Record<string, string | boolean>,
            ),
    }));
}

export function recordHistory(
  entry: Omit<QrHistoryEntry, "id" | "createdAt" | "mode">,
  mode: QrHistoryMode,
  existing: QrHistoryEntry[],
) {
  const next: QrHistoryEntry[] = [
    {
      ...entry,
      id: newId(),
      createdAt: Date.now(),
      mode,
      values:
        mode === "designs" ? {} : sanitizeValues(entry.typeId, entry.values),
      design: presetDesign(entry.design),
    },
    // Replace an identical recent entry rather than stacking duplicates.
    ...existing.filter(
      (item) => !(item.typeId === entry.typeId && item.label === entry.label),
    ),
  ].slice(0, MAX_HISTORY);
  storage.set(HISTORY_STORAGE_KEY, next);
  return next;
}

export function removeHistory(id: string, existing: QrHistoryEntry[]) {
  const next = existing.filter((item) => item.id !== id);
  storage.set(HISTORY_STORAGE_KEY, next);
  return next;
}

export function clearHistory() {
  storage.remove(HISTORY_STORAGE_KEY);
  return [] as QrHistoryEntry[];
}

/** Everything storage held for this tool, for the "delete my data" control. */
export function purgeAllLocalData() {
  clearHistory();
  storage.remove(PRESET_STORAGE_KEY);
  storage.remove(HISTORY_MODE_KEY);
}

export function formatWhen(timestamp: number) {
  const diff = Date.now() - timestamp;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)} min ago`;
  if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)} h ago`;
  return new Date(timestamp).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}
