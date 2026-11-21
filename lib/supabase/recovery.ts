import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabasePublicConfig } from "./config";
import { getSupabaseAdminClient } from "./admin";
import { recoveryDispatchFetch } from "./recovery-dispatch";
import { isAllowedAdminEmail } from "./admin-auth";
import type { Database } from "./database.types";

/**
 * One server-configured origin per non-production environment is an explicit
 * allowlist, not a value taken from request headers or a redirect parameter.
 * Preview must be separately approved and allowlisted by the auth provider.
 */
export function recoveryOrigin(): string | null {
  const environment = process.env.VERCEL_ENV;
  // The one production origin, spelled explicitly. This is a security boundary
  // (the verifier cookie must land on the exact callback host), so it is pinned
  // here rather than read from a request or a redirect parameter, and
  // `tests/published-origin.test.ts` pins it to the same canonical origin the
  // rest of the site publishes (`https://www.quickkit.live`).
  if (environment === "production") return "https://www.quickkit.live";
  if (environment && environment !== "preview" && environment !== "development")
    return null;
  if (!environment && process.env.NODE_ENV === "production") return null;

  const isPreview = environment === "preview";
  const configured = isPreview
    ? process.env.QUICKKIT_RECOVERY_PREVIEW_ORIGIN
    : process.env.QUICKKIT_RECOVERY_LOCAL_ORIGIN;
  if (!configured) return null;
  try {
    const url = new URL(configured);
    if (
      configured !== url.origin ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    )
      return null;
    if (isPreview) {
      if (
        url.protocol !== "https:" ||
        url.hostname === "localhost" ||
        url.hostname === "127.0.0.1" ||
        url.hostname === "[::1]" ||
        // Neither production spelling may be borrowed as a preview origin: the
        // www host is the canonical one, and the apex still answers (it
        // 301-redirects to www), so both are production identities.
        url.origin === "https://www.quickkit.live" ||
        url.origin === "https://quickkit.live" ||
        url.hostname.includes("*")
      )
        return null;
    } else if (
      !["http:", "https:"].includes(url.protocol) ||
      !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
    ) {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

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
export async function createRecoveryClient(
  dispatchEligible?: boolean,
): Promise<SupabaseClient<Database> | null> {
  const config = getSupabasePublicConfig();
  if (!config) return null;
  const store = await cookies();
  return createServerClient<Database>(config.url, config.publishableKey, {
    ...(dispatchEligible === undefined
      ? {}
      : { global: { fetch: recoveryDispatchFetch(dispatchEligible) } }),
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

async function verifiedRecoveryProof(
  client: SupabaseClient<Database>,
): Promise<string | null> {
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData.user || !isAllowedAdminEmail(userData.user.email))
    return null;
  const { data, error } = await client.auth.getSession();
  if (
    error ||
    !data.session?.access_token ||
    data.session.user.id !== userData.user.id
  )
    return null;
  const store = await cookies();
  const proof = store.get(RECOVERY_PROOF_COOKIE)?.value;
  return validRecoveryProof(proof, data.session.access_token, userData.user.id)
    ? proof!
    : null;
}

export async function validRecoverySession(
  client: SupabaseClient<Database>,
): Promise<boolean> {
  return Boolean(await verifiedRecoveryProof(client));
}

/** Consume before updating the password. Failed updates require a fresh link. */
export async function consumeRecoverySession(
  client: SupabaseClient<Database>,
): Promise<"consumed" | "invalid" | "unavailable"> {
  const proof = await verifiedRecoveryProof(client);
  if (!proof) return "invalid";
  const secret = process.env.SUPABASE_SUBMISSION_HMAC_SECRET;
  const admin = getSupabaseAdminClient();
  if (!secret || Buffer.byteLength(secret) < 32 || !admin) return "unavailable";
  const hash = createHmac("sha256", secret)
    .update(`quickkit-recovery-consume-v1:${proof}`)
    .digest("hex");
  try {
    const { data, error } = await admin.rpc("quickkit_consume_recovery_proof", {
      p_proof_hash: hash,
      p_expires_at: new Date(Number(proof.split(".")[0])).toISOString(),
    });
    if (error || typeof data !== "boolean") return "unavailable";
    return data ? "consumed" : "invalid";
  } catch {
    return "unavailable";
  }
}
