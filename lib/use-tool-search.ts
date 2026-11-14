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
 */
export function useToolSearch() {
  const [filter, setFilter] = useState<Filter | null>(null);
  const requested = useRef(false);
  const load = useCallback(() => {
    if (requested.current) return;
    requested.current = true;
    void import("@/lib/catalog").then((module) => {
      setFilter(() => module.filterTools as unknown as Filter);
    });
  }, []);
  return { filter, load };
}
