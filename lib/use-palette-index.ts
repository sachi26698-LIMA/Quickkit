"use client";

import { useEffect, useState } from "react";
import type { CategoryMeta } from "@/lib/catalog";
import type { PaletteTool } from "@/lib/palette-index";

export type PaletteData = { tools: PaletteTool[]; categories: CategoryMeta[] };

/** One fetch per tab, shared by every mount of the palette. */
let pending: Promise<PaletteData> | null = null;

function loadPaletteIndex(): Promise<PaletteData> {
  if (!pending) {
    pending = fetch("/api/palette-index", {
      credentials: "omit",
      cache: "force-cache",
    })
      .then((response) => {
        if (!response.ok) throw new Error("Search index unavailable.");
        return response.json() as Promise<PaletteData>;
      })
      .catch((error: unknown) => {
        // Allow a later attempt (a transient failure should not poison the tab).
        pending = null;
        throw error;
      });
  }
  return pending;
}

/**
 * Fetches the tool search index when the palette is first opened.
 *
 * The palette lives in the public layout, so anything passed to it as a prop is
 * serialised into the HTML of every page. Passing the catalogue cost 54.6 kB of
 * document on pages that never open the palette. `enabled` is the palette's
 * open state, so the request is made on intent and not on load.
 */
export function usePaletteIndex(enabled: boolean) {
  const [data, setData] = useState<PaletteData | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!enabled || data) return;
    let cancelled = false;
    loadPaletteIndex().then(
      (value) => {
        if (!cancelled) setData(value);
      },
      () => {
        if (!cancelled) setFailed(true);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [enabled, data]);

  return { data, failed, loading: enabled && !data && !failed };
}
