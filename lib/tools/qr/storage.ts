/**
 * Local persistence: design presets and recent-generation history.
 *
 * Both live in `window.localStorage` on this device only — there is no server
 * side of this tool. Secrets typed into the form (a Wi-Fi password) are never
 * written, and "designs only" mode keeps content out of storage completely.
 */
import { isKnownContentType, sensitiveKeysFor } from "./payload";
import type { QrContentTypeId, QrDesign } from "./types";
import { clampDesign, presetDesign, readFill } from "./style";
import { defaultDesign } from "./style";
import type { QrTemplate, QrTemplateCategory } from "./templates";
import { TEMPLATE_CATEGORIES } from "./templates";

export const PRESET_STORAGE_KEY = "qk:qr-presets:v1";
export const HISTORY_STORAGE_KEY = "qk:qr-history:v1";
export const HISTORY_MODE_KEY = "qk:qr-history-mode:v1";
export const CUSTOM_TEMPLATE_STORAGE_KEY = "qk:qr-custom-templates:v1";
export const MAX_PRESETS = 24;
export const MAX_HISTORY = 20;
export const MAX_CUSTOM_TEMPLATES = 24;

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

/** Validate one stored/imported preset object into a safe QrPreset. */
export function readPreset(item: Record<string, unknown>): QrPreset {
  return {
    id: String(item.id ?? newId()),
    name: String(item.name ?? "Untitled preset").slice(0, 40),
    createdAt: Number(item.createdAt ?? Date.now()),
    design: readDesign(item.design),
  };
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
    .map(readPreset);
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

/** Rename a preset in place (order and ids preserved). */
export function renamePreset(id: string, name: string, existing: QrPreset[]) {
  const clean = name.trim().slice(0, 40);
  const next = existing.map((preset) =>
    preset.id === id ? { ...preset, name: clean || preset.name } : preset,
  );
  storage.set(PRESET_STORAGE_KEY, next);
  return next;
}

/** Duplicate a preset into a new editable copy at the front of the list. */
export function duplicatePreset(id: string, existing: QrPreset[]) {
  const source = existing.find((preset) => preset.id === id);
  if (!source) return existing;
  const copy: QrPreset = {
    id: newId(),
    name: `${source.name} copy`.slice(0, 40),
    createdAt: Date.now(),
    design: presetDesign(source.design),
  };
  const next = [copy, ...existing].slice(0, MAX_PRESETS);
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

/**
 * Validate one stored/imported history object into a safe QrHistoryEntry.
 * `requireValidType` (used by import) rejects a row whose type is unknown;
 * loading existing storage is lenient — a legacy row with a missing/unknown
 * type is kept (defaulted to "url") with its design clamped, so saved history
 * is never silently dropped.
 */
export function readHistoryEntry(
  item: Record<string, unknown>,
  options: { requireValidType?: boolean } = {},
): QrHistoryEntry | null {
  const validType =
    typeof item.typeId === "string" && isKnownContentType(item.typeId);
  if (!validType && options.requireValidType) return null;
  const typeId: QrContentTypeId = validType
    ? (item.typeId as QrContentTypeId)
    : "url";
  return {
    id: String(item.id ?? newId()),
    createdAt: Number(item.createdAt ?? Date.now()),
    typeId,
    label: String(item.label ?? "").slice(0, 80),
    bytes: Number(item.bytes ?? 0),
    version: Number(item.version ?? 0),
    mode: item.mode === "designs" ? "designs" : "full",
    design: readDesign(item.design),
    values:
      item.mode === "designs" || !item.values || typeof item.values !== "object"
        ? {}
        : sanitizeValues(
            typeId,
            item.values as Record<string, string | boolean>,
          ),
  };
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
    .map((item) => readHistoryEntry(item))
    .filter((entry): entry is QrHistoryEntry => entry !== null);
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

/** Rename a history entry's label in place. */
export function renameHistory(
  id: string,
  label: string,
  existing: QrHistoryEntry[],
) {
  const clean = label.trim().slice(0, 80);
  const next = existing.map((item) =>
    item.id === id ? { ...item, label: clean || item.label } : item,
  );
  storage.set(HISTORY_STORAGE_KEY, next);
  return next;
}

/** Duplicate a history entry into a fresh row (new id + timestamp). */
export function duplicateHistory(id: string, existing: QrHistoryEntry[]) {
  const source = existing.find((item) => item.id === id);
  if (!source) return existing;
  const copy: QrHistoryEntry = {
    ...source,
    id: newId(),
    createdAt: Date.now(),
    label: `${source.label} copy`.slice(0, 80),
    design: presetDesign(source.design),
    values: sanitizeValues(source.typeId, source.values),
  };
  const next = [copy, ...existing].slice(0, MAX_HISTORY);
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

/* ----------------------------------------- config export / import (Phase H) */

export const CONFIG_EXPORT_APP = "quickkit-qr-studio";
export const CONFIG_EXPORT_VERSION = 1;

/** Serialize presets + history to a portable JSON file (secrets stripped). */
export function exportConfig(
  presets: QrPreset[],
  history: QrHistoryEntry[],
): string {
  return JSON.stringify(
    {
      app: CONFIG_EXPORT_APP,
      version: CONFIG_EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      presets: presets.map((preset) => ({
        ...preset,
        design: presetDesign(preset.design),
      })),
      history: history.map((entry) => ({
        ...entry,
        design: presetDesign(entry.design),
        values:
          entry.mode === "designs"
            ? {}
            : sanitizeValues(entry.typeId, entry.values),
      })),
    },
    null,
    2,
  );
}

export type ConfigImportResult = {
  ok: boolean;
  presets: QrPreset[];
  history: QrHistoryEntry[];
  addedPresets: number;
  addedHistory: number;
  skipped: number;
  message: string;
};

/**
 * Merge a config file into the existing presets + history. Existing data is
 * NEVER cleared or overwritten: items already present (by id) are skipped, the
 * rest are validated and added up to the storage caps. Invalid items are
 * skipped and counted, not fatal. Returns the merged lists for the caller to
 * put into state.
 */
export function importConfig(
  json: string,
  existingPresets: QrPreset[],
  existingHistory: QrHistoryEntry[],
): ConfigImportResult {
  const fail = (message: string): ConfigImportResult => ({
    ok: false,
    presets: existingPresets,
    history: existingHistory,
    addedPresets: 0,
    addedHistory: 0,
    skipped: 0,
    message,
  });
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return fail("That file is not valid JSON.");
  }
  if (!parsed || typeof parsed !== "object")
    return fail("That file is not a QUICKKIT QR config.");
  const root = parsed as Record<string, unknown>;
  if (root.app !== CONFIG_EXPORT_APP)
    return fail("That file was not exported by the QUICKKIT QR Studio.");
  if (Number(root.version) > CONFIG_EXPORT_VERSION)
    return fail("That config was made by a newer version of the tool.");

  const presets = [...existingPresets];
  const history = [...existingHistory];
  const presetIds = new Set(presets.map((preset) => preset.id));
  const historyIds = new Set(history.map((entry) => entry.id));
  let addedPresets = 0;
  let addedHistory = 0;
  let skipped = 0;

  const rawPresets = Array.isArray(root.presets) ? root.presets : [];
  for (const item of rawPresets) {
    if (!item || typeof item !== "object") {
      skipped += 1;
      continue;
    }
    const preset = readPreset(item as Record<string, unknown>);
    if (presetIds.has(preset.id) || presets.length >= MAX_PRESETS) {
      skipped += 1;
      continue;
    }
    presetIds.add(preset.id);
    presets.unshift(preset);
    addedPresets += 1;
  }

  const rawHistory = Array.isArray(root.history) ? root.history : [];
  for (const item of rawHistory) {
    if (!item || typeof item !== "object") {
      skipped += 1;
      continue;
    }
    const entry = readHistoryEntry(item as Record<string, unknown>, {
      requireValidType: true,
    });
    if (!entry || historyIds.has(entry.id) || history.length >= MAX_HISTORY) {
      skipped += 1;
      continue;
    }
    historyIds.add(entry.id);
    history.unshift(entry);
    addedHistory += 1;
  }

  const cappedPresets = presets.slice(0, MAX_PRESETS);
  const cappedHistory = history.slice(0, MAX_HISTORY);
  storage.set(PRESET_STORAGE_KEY, cappedPresets);
  storage.set(HISTORY_STORAGE_KEY, cappedHistory);
  return {
    ok: true,
    presets: cappedPresets,
    history: cappedHistory,
    addedPresets,
    addedHistory,
    skipped,
    message: `Imported ${addedPresets} preset${addedPresets === 1 ? "" : "s"} and ${addedHistory} history item${addedHistory === 1 ? "" : "s"}${skipped ? `; ${skipped} skipped (already present, invalid or over the limit)` : ""}. Your existing data was kept.`,
  };
}

/* ---------------------------------------------------- custom templates (V3) */

const isCategory = (value: unknown): value is QrTemplateCategory =>
  TEMPLATE_CATEGORIES.some((category) => category.id === value);

/** Load user-saved templates. Existing presets/history are never touched. */
export function loadCustomTemplates(): QrTemplate[] {
  const stored = storage.get(CUSTOM_TEMPLATE_STORAGE_KEY);
  if (!Array.isArray(stored)) return [];
  return stored
    .filter(
      (item): item is Record<string, unknown> =>
        Boolean(item) && typeof item === "object",
    )
    .slice(0, MAX_CUSTOM_TEMPLATES)
    .map((item) => ({
      id: String(item.id ?? newId()),
      name: String(item.name ?? "Untitled template").slice(0, 40),
      blurb: String(item.blurb ?? "Saved in this browser").slice(0, 80),
      category: isCategory(item.category) ? item.category : "personal",
      design: readDesign(item.design),
      label:
        typeof item.label === "string" ? item.label.slice(0, 60) : undefined,
      layout: typeof item.layout === "string" ? item.layout : undefined,
      printMm:
        typeof item.printMm === "number" && Number.isFinite(item.printMm)
          ? item.printMm
          : undefined,
      custom: true,
    }));
}

function persistCustomTemplates(templates: QrTemplate[]) {
  storage.set(
    CUSTOM_TEMPLATE_STORAGE_KEY,
    templates.slice(0, MAX_CUSTOM_TEMPLATES),
  );
  return templates.slice(0, MAX_CUSTOM_TEMPLATES);
}

/** Save the current design as a reusable custom template. */
export function saveCustomTemplate(
  input: {
    name: string;
    category: QrTemplateCategory;
    design: QrDesign;
    label?: string;
  },
  existing: QrTemplate[],
): QrTemplate[] {
  const template: QrTemplate = {
    id: `custom-${newId()}`,
    name: input.name.trim().slice(0, 40) || "Untitled template",
    blurb: "Saved in this browser",
    category: input.category,
    design: presetDesign(input.design),
    label: input.label?.trim().slice(0, 60) || undefined,
    custom: true,
  };
  return persistCustomTemplates([template, ...existing]);
}

/** Duplicate any template (built-in or custom) into an editable custom copy. */
export function duplicateCustomTemplate(
  source: QrTemplate,
  existing: QrTemplate[],
): QrTemplate[] {
  const copy: QrTemplate = {
    ...source,
    id: `custom-${newId()}`,
    name: `${source.name} copy`.slice(0, 40),
    blurb: source.custom ? source.blurb : "Copy of a built-in template",
    design: presetDesign({ ...defaultDesign(), ...source.design }),
    custom: true,
  };
  return persistCustomTemplates([copy, ...existing]);
}

export function deleteCustomTemplate(
  id: string,
  existing: QrTemplate[],
): QrTemplate[] {
  return persistCustomTemplates(
    existing.filter((template) => template.id !== id),
  );
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
