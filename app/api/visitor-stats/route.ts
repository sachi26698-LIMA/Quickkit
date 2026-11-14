import { NextRequest, NextResponse } from "next/server";
import { readVisitorStats, recordVisit } from "@/lib/visitor-analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
const unavailable = () =>
  NextResponse.json({ available: false }, { status: 503, headers });
export async function GET() {
  try {
    return NextResponse.json(
      { available: true, ...(await readVisitorStats()) },
      { headers },
    );
  } catch {
    return unavailable();
  }
}
export async function POST(request: NextRequest) {
  // No cross-site tracking requests, oversized payloads, or caller-supplied totals.
  const origin = request.headers.get("origin");
  const host =
    request.headers.get("x-forwarded-host") || request.headers.get("host");
  let originHost = "";
  try {
    originHost = origin ? new URL(origin).host : "";
  } catch {
    /* Invalid Origin is rejected below. */
  }
  if (
    !originHost ||
    originHost !== host ||
    request.headers.get("sec-fetch-site") === "cross-site"
  )
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers });
  if (Number(request.headers.get("content-length")) > 512)
    return new NextResponse(null, { status: 413, headers });
  let body;
  try {
    const reader = request.body?.getReader();
    if (!reader) return new NextResponse(null, { status: 400, headers });
    const chunks: Uint8Array[] = [];
    let length = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        length += value.byteLength;
        if (length > 512) {
          await reader.cancel();
          return new NextResponse(null, { status: 413, headers });
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    body = JSON.parse(text);
  } catch {
    return new NextResponse(null, { status: 400, headers });
  }
  const uuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (
    !body ||
    typeof body.visitorId !== "string" ||
    typeof body.sessionId !== "string" ||
    !uuid.test(body.visitorId) ||
    !uuid.test(body.sessionId) ||
    !Number.isSafeInteger(body.activeMs) ||
    body.activeMs < 0 ||
    body.activeMs > 86400000
  )
    return new NextResponse(null, { status: 400, headers });
  try {
    await recordVisit(body.visitorId, body.sessionId, body.activeMs);
    return new NextResponse(null, { status: 204, headers });
  } catch {
    return unavailable();
  }
}
