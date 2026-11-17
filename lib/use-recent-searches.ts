"use client";
import { useMemo, useSyncExternalStore } from "react";

/**
 * Recent search queries for the tool search boxes. Privacy-conscious by
 * design: the list lives in this browser's `localStorage` only, never leaves
 * the device, and can be cleared from the panel itself. No server ever sees
 * what a visitor typed.
 */
export const RECENT_SEARCHES_KEY = "quickkit:recent-searches";
export const RECENT_SEARCHES_EVENT = "quickkit:recent-searches-changed";
export const RECENT_SEARCHES_MAX = 5;

function readRaw(): string {
  try {
    return window.localStorage.getItem(RECENT_SEARCHES_KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(RECENT_SEARCHES_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(RECENT_SEARCHES_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function parseRecentSearches(raw: string): string[] {
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return [
      ...new Set(
        value
          .filter((entry): entry is string => typeof entry === "string")
          .map((entry) => entry.trim())
          .filter(Boolean),
      ),
    ].slice(0, RECENT_SEARCHES_MAX);
  } catch {
    return [];
  }
}

/** Remember a submitted query (most recent first, capped). */
export function rememberSearch(query: string) {
  const trimmed = query.trim();
  if (!trimmed) return;
  try {
    const current = parseRecentSearches(readRaw());
    const next = [
      trimmed,
      ...current.filter(
        (entry) => entry.toLocaleLowerCase() !== trimmed.toLocaleLowerCase(),
      ),
    ].slice(0, RECENT_SEARCHES_MAX);
    window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(RECENT_SEARCHES_EVENT));
  } catch {
    /* Storage is best-effort; a blocked store must not break searching. */
  }
}

/** Forget every remembered query from this browser. */
export function clearRecentSearches() {
  try {
    window.localStorage.removeItem(RECENT_SEARCHES_KEY);
    window.dispatchEvent(new CustomEvent(RECENT_SEARCHES_EVENT));
  } catch {
    /* Storage is best-effort. */
  }
}

/** Read-only view of this browser's recent queries. */
export function useRecentSearches(): string[] {
  const raw = useSyncExternalStore(subscribe, readRaw, () => "[]");
  return useMemo(() => parseRecentSearches(raw), [raw]);
}
