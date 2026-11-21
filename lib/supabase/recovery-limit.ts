import "server-only";

import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import type { NextRequest } from "next/server";
import { getSupabaseAdminClient } from "./admin";

/**
 * Use the existing atomic, shared four-per-15-minute submission limiter with
 * domain-separated buckets. Both IP and email are checked for every address,
 * whether or not it is an administrator. Never store raw addresses.
 * The x-real-ip trust boundary must be verified on the deployed Vercel ingress.
 */
export async function consumeRecoveryLimit(
  request: NextRequest,
  email: string,
): Promise<"allowed" | "limited" | "unavailable"> {
  const secret = process.env.SUPABASE_SUBMISSION_HMAC_SECRET;
  const client = getSupabaseAdminClient();
  const ip = request.headers.get("x-real-ip")?.trim();
  if (!secret || Buffer.byteLength(secret) < 32 || !client || !ip || !isIP(ip))
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

/** Baseline padding reduces, but cannot eliminate, provider-latency leakage. */
export async function padRecoveryResponse(start: number): Promise<void> {
  const remaining = 2000 - (performance.now() - start);
  if (remaining > 0)
    await new Promise((resolve) => setTimeout(resolve, remaining));
}
