"use client";

import { useCallback, useRef, useState } from "react";
import type { ToolIconName } from "@/components/tool-icon";

export type SearchHit = {
  slug: string;
  name: string;
  category: string;
  icon: ToolIconName;
  color: string;
};
type Filter = (query: string, category: "All tools") => SearchHit[];

/**
 * Catalogue search, loaded on demand.
 *
 * `lib/catalog` carries every tool description and keyword, so importing it
 * from the search boxes put ~45 kB (gzipped) into the first load of every page
 * that has one. The chunk is fetched the moment a visitor focuses or types in a
 * search field instead — still instant on a warm cache, and never paid by
 * someone who only reads the page.
 *
 * Three states are exposed so a caller can show a truthful status row:
 *  - `filter` is null and `status` is "loading" — the chunk is in flight
 *  - `status` is "error" — the chunk failed; search cannot work until reload
 *  - `status` is "ready" — matching is synchronous from here on
 *
 * `status` was previously implied by `filter === null`, which meant a failed
 * download looked identical to a slow one: the UI said "Searching…" forever.
 * The rejection is now caught and reported instead of becoming an unhandled
 * promise.
 */
export function useToolSearch() {
  const [filter, setFilter] = useState<Filter | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">(
    "idle",
  );
  const requested = useRef(false);
  const load = useCallback(() => {
    if (requested.current) return;
    requested.current = true;
    setStatus("loading");
    void import("@/lib/catalog")
      .then((module) => {
        setFilter(() => module.filterTools as unknown as Filter);
        setStatus("ready");
      })
      .catch(() => {
        setStatus("error");
      });
  }, []);
  return { filter, status, load };
}
