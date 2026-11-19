import "server-only";

import { NextResponse, type NextRequest } from "next/server";
import { verifyAdminSession } from "@/lib/supabase/admin-auth";
import { hasSameOrigin } from "@/lib/supabase/request-origin";

/**
 * Font administration uses the existing admin session (Supabase Auth) — no
 * second auth system and no public content in Supabase. Mutations also require
 * a same-origin request, matching the rest of the control centre.
 */
export async function authorizeFontAdmin(
  request: NextRequest,
): Promise<
  { ok: true; email: string } | { ok: false; response: NextResponse }
> {
  if (!hasSameOrigin(request)) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: "This request could not be verified." },
        { status: 403, headers: { "Cache-Control": "no-store" } },
      ),
    };
  }
  const session = await verifyAdminSession();
  if (session.status === "authorized") {
    return { ok: true, email: session.admin.email };
  }
  const status =
    session.status === "unauthenticated"
      ? 401
      : session.status === "forbidden"
        ? 403
        : 503;
  return {
    ok: false,
    response: NextResponse.json(
      {
        ok: false,
        error:
          status === 401
            ? "Sign in as an administrator."
            : status === 403
              ? "Administrator access is not permitted."
              : "Administrator authentication is not configured or unavailable.",
      },
      { status, headers: { "Cache-Control": "no-store" } },
    ),
  };
}
