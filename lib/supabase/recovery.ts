import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabasePublicConfig } from "./config";
import { isAllowedAdminEmail } from "./admin-auth";
import type { Database } from "./database.types";

export const RECOVERY_CALLBACK = "https://quickkit.live/auth/recovery";
export const RECOVERY_PROOF_COOKIE = "quickkit-recovery-proof";
export const RECOVERY_COOKIE_OPTIONS = {
  name: "quickkit-recovery-session",
  path: "/",
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 600,
};

/** Separate HttpOnly recovery storage: never shares the administrator session. */
export async function createRecoveryClient(): Promise<SupabaseClient<Database> | null> {
  const config = getSupabasePublicConfig();
  if (!config) return null;
  const store = await cookies();
  return createServerClient<Database>(config.url, config.publishableKey, {
    cookieOptions: RECOVERY_COOKIE_OPTIONS,
    cookies: {
      getAll: () => store.getAll(),
      setAll(values) {
        values.forEach(({ name, value, options }) =>
          store.set(name, value, {
            ...options,
            httpOnly: true,
            secure: RECOVERY_COOKIE_OPTIONS.secure,
            sameSite: "lax",
            path: "/",
          }),
        );
      },
    },
  });
}

export function recoveryProofConfigured(): boolean {
  const secret = process.env.SUPABASE_SUBMISSION_HMAC_SECRET;
  return Boolean(secret && Buffer.byteLength(secret) >= 32);
}

/** Proof requires a server-only key and is bound to this session and user. */
export function makeRecoveryProof(
  accessToken: string,
  userId: string,
  expires = Date.now() + 600_000,
): string {
  const secret = process.env.SUPABASE_SUBMISSION_HMAC_SECRET;
  if (!secret || Buffer.byteLength(secret) < 32)
    throw new Error("Recovery proof key unavailable");
  const body = String(expires);
  const mac = createHmac("sha256", secret)
    .update(`quickkit-recovery-v1:${userId}:${body}:${accessToken}`)
    .digest("hex");
  return `${body}.${mac}`;
}

export function validRecoveryProof(
  proof: string | undefined,
  accessToken: string,
  userId: string,
  now = Date.now(),
): boolean {
  if (!proof || !/^\d{13}\.[a-f0-9]{64}$/.test(proof)) return false;
  const [timestamp, signature] = proof.split(".");
  const expires = Number(timestamp);
  if (expires <= now || expires > now + 600_000) return false;
  const expected = makeRecoveryProof(accessToken, userId, expires).split(
    ".",
  )[1];
  return timingSafeEqual(
    Buffer.from(signature, "hex"),
    Buffer.from(expected, "hex"),
  );
}

export async function validRecoverySession(
  client: SupabaseClient<Database>,
): Promise<boolean> {
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData.user || !isAllowedAdminEmail(userData.user.email))
    return false;
  const { data, error } = await client.auth.getSession();
  if (
    error ||
    !data.session?.access_token ||
    data.session.user.id !== userData.user.id
  )
    return false;
  const store = await cookies();
  return validRecoveryProof(
    store.get(RECOVERY_PROOF_COOKIE)?.value,
    data.session.access_token,
    userData.user.id,
  );
}
