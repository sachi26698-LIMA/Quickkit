export type SupabasePublicConfig = {
  url: string;
  publishableKey: string;
};

export const SUPABASE_COOKIE_OPTIONS = {
  name: "quickkit-auth-token",
  path: "/",
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24 * 30,
};

/** Public credentials are intentionally safe to ship to the browser; RLS is the security boundary. */
export function getSupabasePublicConfig(): SupabasePublicConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !publishableKey) return null;

  try {
    const parsed = new URL(url);
    const local =
      parsed.protocol === "http:" &&
      ["localhost", "127.0.0.1"].includes(parsed.hostname);
    if (parsed.protocol !== "https:" && !local) return null;
    if (parsed.username || parsed.password || parsed.search || parsed.hash)
      return null;
    return { url: parsed.origin, publishableKey };
  } catch {
    return null;
  }
}

export function getSupabaseCspOrigin(): string | null {
  const config = getSupabasePublicConfig();
  if (!config) return null;
  const parsed = new URL(config.url);
  if (
    parsed.protocol === "https:" &&
    (parsed.hostname.endsWith(".supabase.co") ||
      parsed.hostname.endsWith(".supabase.in"))
  ) {
    return parsed.origin;
  }
  if (
    process.env.NODE_ENV !== "production" &&
    parsed.protocol === "http:" &&
    ["localhost", "127.0.0.1"].includes(parsed.hostname)
  ) {
    return parsed.origin;
  }
  return null;
}
