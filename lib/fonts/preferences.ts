"use client";

import type { FontRecord } from "./types";

/**
 * Visitor-only preferences. Favourites and recently used families live in
 * localStorage (a handful of slugs, never font binaries). Usage beacons are
 * anonymous, aggregate counters used for the "Popular" sort.
 */

const FAVORITES_KEY = "biocraft.fonts.favorites.v1";
const RECENT_KEY = "biocraft.fonts.recent.v1";
const SELECTED_KEY = "biocraft.fonts.selected.v1";
const PREVIEW_KEY = "biocraft.fonts.preview.v1";
const MAX_RECENT = 12;

function readList(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) ?? "[]");
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === "string")
      : [];
  } catch {
    return [];
  }
}

function writeList(key: string, values: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(values.slice(0, 200)));
  } catch {
    // Private mode with storage disabled: favourites simply do not persist.
  }
  window.dispatchEvent(new CustomEvent("biocraft:fonts-change"));
}

export function readFavorites(): string[] {
  return readList(FAVORITES_KEY);
}

export function isFavorite(slug: string): boolean {
  return readFavorites().includes(slug);
}

export function toggleFavorite(slug: string): string[] {
  const current = readFavorites();
  const next = current.includes(slug)
    ? current.filter((value) => value !== slug)
    : [slug, ...current];
  writeList(FAVORITES_KEY, next);
  return next;
}

export function readRecent(): string[] {
  return readList(RECENT_KEY);
}

export function rememberFont(slug: string): void {
  const next = [slug, ...readRecent().filter((value) => value !== slug)].slice(
    0,
    MAX_RECENT,
  );
  writeList(RECENT_KEY, next);
}

export function readSelectedFont(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(SELECTED_KEY);
  } catch {
    return null;
  }
}

export function rememberSelectedFont(slug: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SELECTED_KEY, slug);
  } catch {
    // Ignore storage failures.
  }
  window.dispatchEvent(
    new CustomEvent("biocraft:font-selected", { detail: slug }),
  );
}

export function readPreviewText(fallback: string): string {
  if (typeof window === "undefined") return fallback;
  try {
    return window.localStorage.getItem(PREVIEW_KEY) || fallback;
  } catch {
    return fallback;
  }
}

export function rememberPreviewText(text: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PREVIEW_KEY, text);
  } catch {
    // Ignore storage failures.
  }
}

/** Fire-and-forget anonymous usage counter. Never blocks the UI. */
export function trackFontUse(slug: string, surface: string): void {
  if (typeof window === "undefined") return;
  try {
    const body = JSON.stringify({ slug, surface });
    if (navigator.sendBeacon) {
      navigator.sendBeacon(
        "/api/fonts/usage",
        new Blob([body], { type: "application/json" }),
      );
      return;
    }
    void fetch("/api/fonts/usage", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // Metrics are best-effort.
  }
}

export function mergeFontsById(
  base: FontRecord[],
  incoming: FontRecord[],
): FontRecord[] {
  const seen = new Set(base.map((font) => font.slug));
  return [...base, ...incoming.filter((font) => !seen.has(font.slug))];
}
