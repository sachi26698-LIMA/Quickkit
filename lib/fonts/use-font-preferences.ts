"use client";

import { useMemo, useSyncExternalStore } from "react";
import { readFavorites, readPreviewText, readRecent } from "./preferences";

const EVENT = "biocraft:fonts-change";
const SELECTED_EVENT = "biocraft:font-selected";

function subscribe(listener: () => void) {
  window.addEventListener(EVENT, listener);
  window.addEventListener(SELECTED_EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(EVENT, listener);
    window.removeEventListener(SELECTED_EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}

/** Favourite slugs, hydrated from localStorage without a setState effect. */
export function useFavoriteSlugs(): string[] {
  const raw = useSyncExternalStore(
    subscribe,
    () => readFavorites().join(","),
    () => "",
  );
  return useMemo(() => (raw ? raw.split(",") : []), [raw]);
}

export function useRecentSlugs(): string[] {
  const raw = useSyncExternalStore(
    subscribe,
    () => readRecent().join(","),
    () => "",
  );
  return useMemo(() => (raw ? raw.split(",") : []), [raw]);
}

/** The visitor's saved preview text, or "" when they never set one. */
export function useStoredPreviewText(sampleText: string): string {
  const raw = useSyncExternalStore(
    subscribe,
    () => readPreviewText(""),
    () => "",
  );
  return raw || sampleText;
}
