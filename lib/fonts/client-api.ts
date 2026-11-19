"use client";

import type { FontFacet, FontListPage, FontRecord, FontSort } from "./types";

export type FontListResponse = FontListPage & {
  facets?: { categories: FontFacet[]; tags: FontFacet[]; total: number };
  catalogue?: {
    generatedAt: string;
    sampleText: string;
    stats: {
      discovered: number;
      verified: number;
      rejected: number;
      families: number;
      files: number;
      variableFamilies: number;
    };
  };
};

export type FontListParams = {
  q?: string;
  category?: string;
  tag?: string;
  sort?: FontSort;
  cursor?: string | null;
  limit?: number;
};

export async function fetchFontPage(
  params: FontListParams,
  signal?: AbortSignal,
): Promise<FontListResponse> {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.category) search.set("category", params.category);
  if (params.tag) search.set("tag", params.tag);
  if (params.sort) search.set("sort", params.sort);
  if (params.cursor) search.set("cursor", params.cursor);
  if (params.limit) search.set("limit", String(params.limit));
  const response = await fetch(`/api/fonts?${search.toString()}`, {
    signal,
    headers: { accept: "application/json" },
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(body?.error ?? "The font index could not be read.");
  }
  return (await response.json()) as FontListResponse;
}

export async function fetchFontsBySlug(
  slugs: string[],
  signal?: AbortSignal,
): Promise<FontRecord[]> {
  if (!slugs.length) return [];
  const response = await fetch(
    `/api/fonts?slugs=${encodeURIComponent(slugs.join(","))}`,
    { signal, headers: { accept: "application/json" } },
  );
  if (!response.ok) return [];
  const body = (await response.json()) as { items: FontRecord[] };
  return body.items ?? [];
}
