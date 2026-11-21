import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import {
  apiError,
  assertSameOrigin,
  noStoreJson,
  parseJsonObject,
} from "@/lib/supabase/admin-api";
import { getAdminEmailAllowlist } from "@/lib/supabase/admin-auth";
import { getRequestOrigin } from "@/lib/supabase/request-origin";
import {
  consumeRecoveryLimit,
  padRecoveryResponse,
} from "@/lib/supabase/recovery-limit";
import {
  createRecoveryClient,
  RECOVERY_PROOF_COOKIE,
  recoveryOrigin,
  recoveryProofConfigured,
  validRecoverySession,
} from "@/lib/supabase/recovery";

export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const client = await createRecoveryClient();
    return noStoreJson({
      valid: Boolean(client && (await validRecoverySession(client))),
    });
  } catch {
    return noStoreJson({ valid: false });
  }
}
export async function POST(request: NextRequest) {
  if (!assertSameOrigin(request)) return apiError(403, "Request not accepted.");
  const body = await parseJsonObject(request);
  if (!body || typeof body.action !== "string")
    return apiError(400, "Invalid request.");
  if (body.action === "request") {
    if (
      typeof body.email !== "string" ||
      body.email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim()) ||
      Object.keys(body).some((k) => !["action", "email"].includes(k))
    )
      return apiError(400, "Enter a valid email address.");
    const allowlist = getAdminEmailAllowlist();
    const origin = recoveryOrigin();
    if (!allowlist.size || !recoveryProofConfigured() || !origin)
      return apiError(503, "Recovery is temporarily unavailable.");
    // The verifier cookie must be stored on the exact callback host.
    if (getRequestOrigin(request) !== origin)
      return apiError(403, "Request not accepted.");
    const email = body.email.trim().toLowerCase();
    const start = performance.now();
    const limit = await consumeRecoveryLimit(request, email);
    if (limit !== "allowed") {
      await padRecoveryResponse(start);
      return limit === "limited"
        ? apiError(429, "Too many recovery requests. Try again later.")
        : apiError(503, "Recovery is temporarily unavailable.");
    }
    try {
      if (allowlist.has(email)) {
        const client = await createRecoveryClient();
        if (client) {
          await client.auth.resetPasswordForEmail(email, {
            redirectTo: `${origin}/auth/recovery`,
          });
        }
      }
    } catch {
      // Do not reveal allowlist membership through provider failures.
    }
    await padRecoveryResponse(start);
    return noStoreJson({ ok: true });
  }
  if (body.action === "update") {
    if (
      typeof body.password !== "string" ||
      typeof body.confirm !== "string" ||
      Object.keys(body).some(
        (k) => !["action", "password", "confirm"].includes(k),
      )
    )
      return apiError(400, "Invalid request.");
    if (body.password !== body.confirm)
      return apiError(400, "Passwords do not match.");
    if (
      body.password.length < 12 ||
      body.password.length > 1024 ||
      !/[a-z]/.test(body.password) ||
      !/[A-Z]/.test(body.password) ||
      !/[0-9]/.test(body.password)
    )
      return apiError(
        400,
        "Use at least 12 characters, including uppercase, lowercase and a number.",
      );
    try {
      const client = await createRecoveryClient();
      if (!client || !(await validRecoverySession(client)))
        return apiError(
          401,
          "Recovery session is invalid or expired. Request a new link.",
        );
      const { error } = await client.auth.updateUser({
        password: body.password,
      });
      if (error)
        return apiError(
          400,
          "Password update failed. Check the password policy or request a new link.",
        );
      try {
        (await cookies()).delete(RECOVERY_PROOF_COOKIE);
        await client.auth.signOut({ scope: "local" });
      } catch {
        /* Password has already changed; do not report failure. */
      }
      return noStoreJson({ ok: true });
    } catch {
      return apiError(
        503,
        "Recovery is temporarily unavailable. Try again later.",
      );
    }
  }
  return apiError(400, "Invalid request.");
}
