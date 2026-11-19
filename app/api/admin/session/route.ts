import { NextRequest, NextResponse } from "next/server";
import { SUPABASE_COOKIE_OPTIONS } from "@/lib/supabase/config";
import { verifyAdminSession } from "@/lib/supabase/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Minimal same-origin session probe for the static tool maintenance dialog.
 * It deliberately returns no identity, error detail, or configuration state.
 */
export async function GET(request: NextRequest) {
  const hasSessionCookie = request.cookies
    .getAll()
    .some((cookie) => cookie.name.startsWith(SUPABASE_COOKIE_OPTIONS.name));
  let authorized = false;
  if (hasSessionCookie) {
    try {
      authorized = (await verifyAdminSession()).status === "authorized";
    } catch {
      // Malformed or expired sessions and auth-provider failures all fail closed.
    }
  }
  return NextResponse.json(
    { authorized },
    {
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
        Vary: "Cookie",
      },
    },
  );
}
