import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAdminEmailAllowlist } from "@/lib/supabase/admin-auth";
import {
  apiError,
  assertSameOrigin,
  noStoreJson,
  parseJsonObject,
} from "@/lib/supabase/admin-api";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  if (!assertSameOrigin(request))
    return apiError(403, "This sign-in request was not accepted.");
  const allowlist = getAdminEmailAllowlist();
  if (!allowlist.size)
    return apiError(503, "Administrator email allowlist is not configured.");
  const body = await parseJsonObject(request);
  if (
    !body ||
    Object.keys(body).some((k) => !["email", "password"].includes(k)) ||
    typeof body.email !== "string" ||
    typeof body.password !== "string" ||
    body.password.length < 1 ||
    body.password.length > 1024
  )
    return apiError(400, "Enter a valid administrator email and password.");
  const email = body.email.trim().toLowerCase();
  if (!allowlist.has(email))
    return apiError(401, "Administrator sign-in failed.");
  const supabase = await createSupabaseServerClient();
  if (!supabase)
    return apiError(503, "Supabase authentication is unavailable.");
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: body.password,
  });
  if (error || !data.user)
    return apiError(401, "Administrator sign-in failed.");
  if (
    !data.user.email ||
    !allowlist.has(data.user.email.trim().toLowerCase())
  ) {
    await supabase.auth.signOut({ scope: "local" });
    return apiError(403, "Administrator access is not permitted.");
  }
  return noStoreJson({ ok: true });
}
