"use client";
import { useMemo, useSyncExternalStore } from "react";

/**
 * Recently used tools — this browser only. The list is written when a tool
 * page is opened (see `RecentToolTracker`) and read by the homepage row, so a
 * returning visitor can continue where they left off without an account or
 * any server-side history. Nothing is transmitted.
 */
export const RECENT_TOOLS_KEY = "quickkit:recent-tools";
export const RECENT_TOOLS_EVENT = "quickkit:recent-tools-changed";
export const RECENT_TOOLS_MAX = 6;

function readRaw(): string {
  try {
    return window.localStorage.getItem(RECENT_TOOLS_KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(RECENT_TOOLS_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(RECENT_TOOLS_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function parseRecentToolSlugs(raw: string): string[] {
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
    ].slice(0, RECENT_TOOLS_MAX);
  } catch {
    return [];
  }
}

/** Record that a tool page was opened (most recent first, capped). */
export function recordToolVisit(slug: string) {
  if (!slug) return;
  try {
    const current = parseRecentToolSlugs(readRaw());
    const next = [slug, ...current.filter((entry) => entry !== slug)].slice(
      0,
      RECENT_TOOLS_MAX,
    );
    window.localStorage.setItem(RECENT_TOOLS_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(RECENT_TOOLS_EVENT));
  } catch {
    /* Storage is best-effort. */
  }
}

/** Read-only view of this browser's recent tools, newest first. */
export function useRecentTools(): string[] {
  const raw = useSyncExternalStore(subscribe, readRaw, () => "[]");
  return useMemo(() => parseRecentToolSlugs(raw), [raw]);
}
