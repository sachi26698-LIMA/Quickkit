"use client";
import { useMemo, useSyncExternalStore } from "react";

export const FAVORITES_KEY = "quickkit:saved-tools";
const EVENT = "quickkit:saved-tools-changed";

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
    return Array.isArray(value)
      ? value.filter((v): v is string => typeof v === "string")
      : [];
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
