import "server-only";

import { getSupabasePublicConfig } from "./config";
import { createSupabaseServerClient } from "./server";

export type AdminIdentity = {
  id: string;
  email: string;
  lastSignInAt: string | null;
};

export type AdminAuthResult =
  | { status: "authorized"; admin: AdminIdentity }
  | {
      status:
        | "unauthenticated"
        | "forbidden"
        | "allowlist_not_configured"
        | "supabase_not_configured"
        | "unavailable";
    };

export function getAdminEmailAllowlist(): ReadonlySet<string> {
  return new Set(
    (process.env.QUICKKIT_ADMIN_EMAILS ?? "")
      .split(/[;,]/)
      .map((email) => email.trim().toLowerCase())
      .filter((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)),
  );
}

export async function verifyAdminSession(): Promise<AdminAuthResult> {
  const allowlist = getAdminEmailAllowlist();
  if (allowlist.size === 0) return { status: "allowlist_not_configured" };
  if (!getSupabasePublicConfig()) return { status: "supabase_not_configured" };

  try {
    const supabase = await createSupabaseServerClient();
    if (!supabase) return { status: "supabase_not_configured" };
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return { status: "unauthenticated" };
    const email = data.user.email?.trim().toLowerCase();
    if (!email || !allowlist.has(email)) return { status: "forbidden" };
    return {
      status: "authorized",
      admin: {
        id: data.user.id,
        email,
        lastSignInAt: data.user.last_sign_in_at ?? null,
      },
    };
  } catch {
    return { status: "unavailable" };
  }
}

export function isAllowedAdminEmail(email: string | undefined): boolean {
  return !!email && getAdminEmailAllowlist().has(email.trim().toLowerCase());
}

export type AdminSetupReadiness = {
  allowlistConfigured: boolean;
  supabaseUrlConfigured: boolean;
  supabaseKeyConfigured: boolean;
  serviceRoleConfigured: boolean;
  submissionHmacConfigured: boolean;
  ready: boolean;
};

/**
 * Returns strictly boolean readiness flags for Admin environment setup.
 * Never returns secret values, URLs, or allowlisted email addresses.
 */
export function getAdminSetupReadiness(): AdminSetupReadiness {
  const allowlistConfigured = getAdminEmailAllowlist().size > 0;
  const supabaseUrlConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim(),
  );
  const supabaseKeyConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim(),
  );
  const serviceRoleConfigured = Boolean(
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
  );
  const submissionHmacConfigured = Boolean(
    process.env.SUPABASE_SUBMISSION_HMAC_SECRET?.trim(),
  );
  return {
    allowlistConfigured,
    supabaseUrlConfigured,
    supabaseKeyConfigured,
    serviceRoleConfigured,
    submissionHmacConfigured,
    ready:
      allowlistConfigured &&
      supabaseUrlConfigured &&
      supabaseKeyConfigured &&
      serviceRoleConfigured,
  };
}
