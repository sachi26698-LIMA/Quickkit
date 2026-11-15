"use client";
import { useMemo, useSyncExternalStore } from "react";
import { legacySecurityFavorites } from "@/lib/tools/security/consolidation";

export const FAVORITES_KEY = "quickkit:saved-tools";
export const FAVORITES_EVENT = "quickkit:saved-tools-changed";

/** Slug kept in local storage for migration from an earlier catalog route. */
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
  window.addEventListener(FAVORITES_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(FAVORITES_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function parseFavoriteSlugs(raw: string): string[] {
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    const migrated = value
      .filter((entry): entry is string => typeof entry === "string")
      .map((slug) => SLUG_MIGRATIONS[slug] ?? slug);
    return [...new Set(migrated)];
  } catch {
    return [];
  }
}

/** Saved tools are deliberately account-free and remain in this browser. */
export function useFavorites(): {
  saved: string[];
  isSaved: (slug: string) => boolean;
  toggle: (slug: string) => void;
} {
  const raw = useSyncExternalStore(subscribe, readRaw, () => "[]");
  const saved = useMemo(() => parseFavoriteSlugs(raw), [raw]);
  return {
    saved,
    isSaved: (slug) => saved.includes(slug),
    toggle: (slug) => {
      const next = saved.includes(slug)
        ? saved.filter((item) => item !== slug)
        : [...saved, slug];
      try {
        window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
      } catch {
        /* Storage is best-effort. */
      }
      window.dispatchEvent(
        new CustomEvent(FAVORITES_EVENT, {
          detail: { slug, action: saved.includes(slug) ? "remove" : "add" },
        }),
      );
    },
  };
}
