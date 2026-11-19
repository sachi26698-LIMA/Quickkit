import { NextResponse, type NextRequest } from "next/server";
import {
  catalogue,
  FontCursorError,
  fontFacets,
  listFonts,
  getFont,
} from "@/lib/fonts/catalogue";
import type { FontSort } from "@/lib/fonts/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SORTS: FontSort[] = ["name", "name-desc", "recent", "popular", "weight"];

function parseSort(value: string | null): FontSort {
  return SORTS.includes(value as FontSort) ? (value as FontSort) : "name";
}

/**
 * Public, cursor-paginated font index.
 *
 * A page carries at most 48 records and only the metadata needed to render a
 * card and load its WOFF2 on demand. Font binaries are served as immutable
 * static assets from /fonts/hindi; they never travel through this route.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  try {
    const slugs = params.get("slugs");
    if (slugs) {
      const requested = slugs
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
        .slice(0, 48);
      const items = [];
      for (const slug of requested) {
        const font = await getFont(slug);
        if (font) items.push(font);
      }
      return NextResponse.json(
        { items, total: items.length, nextCursor: null, query: null },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    const page = await listFonts({
      q: params.get("q") ?? "",
      category: params.get("category") ?? "",
      tag: params.get("tag") ?? "",
      sort: parseSort(params.get("sort")),
      cursor: params.get("cursor"),
      limit: Number(params.get("limit")) || 12,
    });
    const includeFacets = params.get("facets") !== "0";
    return NextResponse.json(
      {
        ...page,
        facets: includeFacets ? await fontFacets() : undefined,
        catalogue: {
          generatedAt: catalogue.generatedAt,
          sampleText: catalogue.sampleText,
          stats: catalogue.stats,
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof FontCursorError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.reason,
          items: [],
          nextCursor: null,
        },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }
    return NextResponse.json(
      {
        error: "The font index could not be read.",
        items: [],
        nextCursor: null,
      },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
