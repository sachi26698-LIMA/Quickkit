import { NextResponse, type NextRequest } from "next/server";
import { scrubSensitiveText } from "@/lib/monitoring/error-reporter";
import {
  getServerErrorMonitoringStatus,
  storeErrorEvent,
} from "@/lib/monitoring/error-store";
import { hasSameOrigin } from "@/lib/supabase/request-origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "no-store" };
const MAX_BYTES = 2048;
/** Error screens that exist in the app. Anything else is filed as "app". */
const SCOPES = new Set(["admin", "global", "tools"]);
const PATH = /^\/[A-Za-z0-9/_-]{0,79}$/;
const NO_MESSAGE = "Message not collected for this screen.";

const empty = (status: number) => new NextResponse(null, { status, headers });

const text = (value: unknown, limit: number) =>
  typeof value === "string" ? scrubSensitiveText(value, limit) : "";

/**
 * Receives "an error screen was shown" reports from the site's own pages.
 *
 * Answers 204 whether or not anything was stored, so the response never
 * reveals whether monitoring is on. Stores nothing unless the owner enabled
 * it, and never stores the request's IP address, cookies or user agent.
 */
export async function POST(request: NextRequest) {
  if (
    !hasSameOrigin(request) ||
    request.headers.get("sec-fetch-site") === "cross-site"
  )
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers });
  if (Number(request.headers.get("content-length")) > MAX_BYTES)
    return empty(413);

  let body: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > MAX_BYTES) return empty(413);
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      return empty(400);
    body = parsed as Record<string, unknown>;
  } catch {
    return empty(400);
  }

  const name = text(body.name, 64);
  if (!name) return empty(400);
  if (!getServerErrorMonitoringStatus().configured) return empty(204);

  const scope =
    typeof body.scope === "string" && SCOPES.has(body.scope)
      ? body.scope
      : "app";
  const path =
    typeof body.path === "string" && PATH.test(body.path) ? body.path : "";
  await storeErrorEvent({
    // Fits the 64-character column: "client:tools " is 13, the path at most 51.
    scope: `client:${scope}${path ? ` ${path.slice(0, 51)}` : ""}`,
    name,
    // Tool pages promise that inputs are not uploaded; an error message can
    // quote input, so it is never kept for them even if a caller sends one.
    message: (scope === "tools" ? "" : text(body.message, 240)) || NO_MESSAGE,
    digest: text(body.digest, 64),
  });
  return empty(204);
}
