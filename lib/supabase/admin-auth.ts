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
