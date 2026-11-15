import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabasePublicConfig } from "./config";
import type { Database } from "./database.types";

export function getMasterAdminServiceClient(): SupabaseClient<Database> | null {
  const config = getSupabasePublicConfig();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!config || !serviceKey) return null;
  return createClient<Database>(config.url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    global: { headers: { "X-Client-Info": "quickkit-master-admin-server" } },
  });
}

export function isMasterAdminDatabaseConfigured(): boolean {
  return getMasterAdminServiceClient() !== null;
}
