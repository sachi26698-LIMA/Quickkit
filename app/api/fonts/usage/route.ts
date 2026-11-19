import { NextResponse, type NextRequest } from "next/server";
import { getFontUnfiltered } from "@/lib/fonts/catalogue";
import { readUsage, recordFontUsage } from "@/lib/fonts/usage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BODY_LIMIT = 512;

/** Anonymous usage beacon: a slug and the surface it was used on. */
export async function POST(request: NextRequest) {
  const raw = await request.text();
  if (raw.length > BODY_LIMIT) {
    return NextResponse.json(
      { ok: false, error: "Payload too large." },
      { status: 413 },
    );
  }
  let body: { slug?: unknown; surface?: unknown };
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON." },
      { status: 400 },
    );
  }
  if (typeof body.slug !== "string" || !getFontUnfiltered(body.slug)) {
    return NextResponse.json(
      { ok: false, error: "Unknown font." },
      { status: 404 },
    );
  }
  const surface = typeof body.surface === "string" ? body.surface : "unknown";
  const result = await recordFontUsage(body.slug, surface);
  return NextResponse.json(
    { ok: true, persisted: result.persisted },
    { status: 202, headers: { "Cache-Control": "no-store" } },
  );
}

export async function GET() {
  const usage = await readUsage();
  return NextResponse.json(
    { ...usage },
    { headers: { "Cache-Control": "no-store" } },
  );
}
