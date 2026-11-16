import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  getErrorMonitoringStatus,
  scrubSensitiveText,
  type ErrorMonitoringStatus,
} from "./error-reporter";

/** True when this server can reach the site's own database with its server key. */
export function errorStoreAvailable(): boolean {
  return getSupabaseAdminClient() !== null;
}

/** Server-side view of the opt-in switch, including the first-party store. */
export function getServerErrorMonitoringStatus(): ErrorMonitoringStatus {
  return getErrorMonitoringStatus({ firstParty: errorStoreAvailable() });
}

export type StoredErrorInput = {
  scope: string;
  name: string;
  message: string;
  digest?: string;
};

/**
 * Stores one scrubbed error event in the site's own Supabase project.
 *
 * Does nothing unless the owner switched error monitoring on. Every field is
 * scrubbed again here, whatever the caller already did, and the database
 * refuses anything over its length limits. Never throws.
 */
export async function storeErrorEvent(
  input: StoredErrorInput,
): Promise<boolean> {
  try {
    if (!getErrorMonitoringStatus({ firstParty: true }).enabled) return false;
    const db = getSupabaseAdminClient();
    if (!db) return false;
    const { data, error } = await db.rpc("quickkit_record_error", {
      p_scope: scrubSensitiveText(input.scope, 64) || "app",
      p_name: scrubSensitiveText(input.name, 64) || "ApplicationError",
      p_message:
        scrubSensitiveText(input.message, 240) ||
        "An unexpected application error occurred.",
      p_digest: input.digest ? scrubSensitiveText(input.digest, 64) : "",
    });
    return !error && data === true;
  } catch {
    return false;
  }
}
