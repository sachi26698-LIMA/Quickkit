import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabasePublicConfig } from "./config";
import type { Database } from "./database.types";

/** Server-only elevated client for validated public-submission inserts and the execute-only limiter RPC. Never use it for user profile/favorites, reads, or client code. */
export function getSupabaseAdminClient(): SupabaseClient<Database> | null {
  const config = getSupabasePublicConfig();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!config || !serviceKey) return null;
  return createClient<Database>(config.url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    global: { headers: { "X-Client-Info": "quickkit-server-submissions" } },
  });
}
