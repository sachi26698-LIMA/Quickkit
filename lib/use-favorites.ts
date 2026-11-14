"use client";
import { useMemo, useSyncExternalStore } from "react";
import { legacySecurityFavorites } from "@/lib/tools/security/consolidation";

export const FAVORITES_KEY = "quickkit:saved-tools";
const EVENT = "quickkit:saved-tools-changed";

/**
 * Slugs that were renamed when the combined converter was split into separate
 * tools. Applied on read so a card saved before the split still resolves, and
 * written back so storage converges on the current slug.
 */
export const SLUG_MIGRATIONS: Record<string, string> = {
  "image-converter": "image-to-image",
  ...legacySecurityFavorites,
};

function readRaw(): string {
  try {
    return window.localStorage.getItem(FAVORITES_KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function parse(raw: string): string[] {
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    const migrated = value
      .filter((v): v is string => typeof v === "string")
      .map((slug) => SLUG_MIGRATIONS[slug] ?? slug);
    // De-duplicate: a user may have saved both the old and the new slug.
    return [...new Set(migrated)];
  } catch {
    return [];
  }
}

/** Saved-tool slugs, persisted in localStorage and synced across the UI. */
export function useFavorites(): {
  saved: string[];
  isSaved: (slug: string) => boolean;
  toggle: (slug: string) => void;
} {
  const raw = useSyncExternalStore(subscribe, readRaw, () => "[]");
  const saved = useMemo(() => parse(raw), [raw]);
  return {
    saved,
    isSaved: (slug) => saved.includes(slug),
    toggle: (slug) => {
      const next = saved.includes(slug)
        ? saved.filter((s) => s !== slug)
        : [...saved, slug];
      try {
        window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
      } catch {
        // Storage full/blocked — saving is best-effort only.
      }
      window.dispatchEvent(new Event(EVENT));
    },
  };
}
