import "server-only";

import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import type { NextRequest } from "next/server";
import { getSupabaseAdminClient } from "./admin";

/**
 * Use the existing atomic, shared four-per-15-minute submission limiter with
 * domain-separated buckets. Both IP and email are checked for every address,
 * whether or not it is an administrator. Never store raw addresses.
 * Only Vercel's platform header is accepted in deployed environments. Local
 * development shares one bucket rather than trusting client-supplied headers.
 */
export async function consumeRecoveryLimit(
  request: NextRequest,
  email: string,
): Promise<"allowed" | "limited" | "unavailable"> {
  const secret = process.env.SUPABASE_SUBMISSION_HMAC_SECRET;
  const client = getSupabaseAdminClient();
  const local =
    process.env.NODE_ENV === "development" &&
    (!process.env.VERCEL_ENV || process.env.VERCEL_ENV === "development");
  const platform =
    !local &&
    process.env.VERCEL === "1" &&
    ["production", "preview"].includes(process.env.VERCEL_ENV ?? "");
  const ip = platform
    ? request.headers.get("x-vercel-forwarded-for")?.trim()
    : local
      ? "local-development"
      : null;
  if (
    !secret ||
    Buffer.byteLength(secret) < 32 ||
    !client ||
    !ip ||
    (platform && !isIP(ip))
  )
    return "unavailable";
  const bucket = (type: string, value: string) =>
    createHmac("sha256", secret)
      .update(`quickkit-recovery-limit-v1:${type}:${value}`)
      .digest("hex");
  try {
    // Consume the ingress bucket first, so a blocked source cannot create an
    // unbounded number of email buckets in the database.
    for (const hash of [bucket("ip", ip), bucket("email", email)]) {
      const result = await client.rpc("quickkit_consume_submission_limit", {
        p_scope: "contact",
        p_bucket_hash: hash,
      });
      if (result.error || typeof result.data !== "boolean")
        return "unavailable";
      if (!result.data) return "limited";
    }
    return "allowed";
  } catch {
    return "unavailable";
  }
}
