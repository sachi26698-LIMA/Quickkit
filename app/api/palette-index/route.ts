import { NextResponse } from "next/server";
import { getPaletteIndex } from "@/lib/palette-index";

export const runtime = "nodejs";
// The catalogue itself is revalidated at the page level; serve this from the
// same five-minute window the public pages use, then let it be cached again.
export const revalidate = 300;

/**
 * The command palette's search index.
 *
 * The palette is mounted in the public layout, so a catalogue prop would be
 * serialised into every page's HTML whether or not a visitor ever opens it.
 * Measured on the production build, that put 54.6 kB of tool records into a
 * 164 kB `/privacy` document. The palette now requests this on first open.
 *
 * The response is public data with no visitor input, so it carries a short
 * public cache and a stale-while-revalidate window rather than `no-store`: the
 * index is identical for every visitor, and a shared cache is the point.
 */
export async function GET() {
  try {
    const { tools, categories } = await getPaletteIndex();
    return NextResponse.json(
      { tools, categories },
      {
        headers: {
          "Cache-Control":
            "public, max-age=300, s-maxage=300, stale-while-revalidate=86400",
        },
      },
    );
  } catch {
    return NextResponse.json(
      { tools: [], categories: [] },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
