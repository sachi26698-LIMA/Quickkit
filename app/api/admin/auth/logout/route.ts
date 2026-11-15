import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  apiError,
  assertSameOrigin,
  noStoreJson,
} from "@/lib/supabase/admin-api";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  if (!assertSameOrigin(request))
    return apiError(403, "This sign-out request was not accepted.");
  const supabase = await createSupabaseServerClient();
  if (!supabase) return noStoreJson({ ok: true });
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error)
    return apiError(
      503,
      "The session could not be invalidated. Retry sign out.",
    );
  return noStoreJson({ ok: true });
}
