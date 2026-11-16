import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { indexingEnabled } from "@/lib/launch";
import { getServerErrorMonitoringStatus } from "@/lib/monitoring/error-store";
import { siteOrigin } from "@/lib/seo";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/database.types";
import {
  readVisitorStats,
  visitorAnalyticsBackend,
  type VisitorAnalyticsBackend,
} from "@/lib/visitor-analytics";

/**
 * Live checks behind the Admin "System health" panel.
 *
 * Every value here comes from a probe this server just ran (or ran within the
 * cache window below). Nothing is assumed: a probe that cannot run reports
 * "unavailable" rather than a pass.
 */

export type RlsHealth = {
  /** `unavailable` until the system-health migration is applied. */
  status: "verified" | "issues" | "unavailable";
  tables: number;
  /** Tables with row level security switched off. */
  unprotected: string[];
  /** Tables the signed-out browser role holds a table privilege on. */
  anon_readable: string[];
};

export type SmtpHealth = {
  /** Live read of the public Supabase Auth settings endpoint. */
  auth_reachable: boolean;
  email_sign_in: boolean | null;
  signup_disabled: boolean | null;
  /**
   * Day the owner last confirmed custom SMTP in the Supabase dashboard
   * (`AUTH_SMTP_VERIFIED_ON`). The app cannot read SMTP settings itself.
   */
  verified_on: string | null;
};

export type SitemapHealth = {
  status: "reachable" | "unreachable" | "invalid" | "not-configured";
  urls: number;
  robots: "allows" | "blocks" | "unreachable";
  /** True when robots.txt points crawlers at the sitemap. */
  robots_lists_sitemap: boolean;
  indexing_enabled: boolean;
  checked_at: string;
};

export type AnalyticsHealth = {
  backend: VisitorAnalyticsBackend | null;
  /** True when a real read of the counter just succeeded. */
  ready: boolean;
  visitors: number;
  online: number;
  since: string | null;
};

export type ErrorMonitoringHealth = {
  enabled: boolean;
  /** True when the error table answered the health query. */
  store_ready: boolean;
  configured: boolean;
  errors_24h: number;
  errors_7d: number;
  last_error_at: string | null;
};

export type SystemHealthReport = {
  checked_at: string;
  rls: RlsHealth;
  smtp: SmtpHealth;
  sitemap: SitemapHealth;
  analytics: AnalyticsHealth;
  error_monitoring: ErrorMonitoringHealth;
};

const PROBE_TIMEOUT_MS = 6000;
const CACHE_MS = 5 * 60 * 1000;

type Cached<T> = { at: number; value: T };
let sitemapCache: Cached<SitemapHealth> | undefined;
let authCache:
  | Cached<
      Pick<SmtpHealth, "auth_reachable" | "email_sign_in" | "signup_disabled">
    >
  | undefined;

/** Test hook: drop cached probe results. */
export function resetSystemHealthCache(): void {
  sitemapCache = undefined;
  authCache = undefined;
}

async function fetchText(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
  });
  if (!response.ok) return null;
  // A sitemap for a few hundred pages is well under this; stop reading there.
  return (await response.text()).slice(0, 2_000_000);
}

const count = (value: unknown) =>
  Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : 0;

const record = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

/** Fetches this site's own sitemap.xml and robots.txt the way a crawler would. */
export async function probeSitemap(fresh = false): Promise<SitemapHealth> {
  const now = Date.now();
  if (!fresh && sitemapCache && now - sitemapCache.at < CACHE_MS)
    return sitemapCache.value;

  const base = {
    urls: 0,
    robots: "unreachable" as SitemapHealth["robots"],
    robots_lists_sitemap: false,
    indexing_enabled: indexingEnabled,
    checked_at: new Date(now).toISOString(),
  };
  if (!siteOrigin) return { ...base, status: "not-configured" };

  const [sitemap, robots] = await Promise.all([
    fetchText(`${siteOrigin}/sitemap.xml`).catch(() => null),
    fetchText(`${siteOrigin}/robots.txt`).catch(() => null),
  ]);

  let robotsState: SitemapHealth["robots"] = "unreachable";
  let listsSitemap = false;
  if (robots !== null) {
    const lines = robots.split(/\r?\n/).map((line) => line.trim());
    // The first group that applies to every crawler decides the answer.
    let inWildcard = false;
    let blocksAll = false;
    for (const line of lines) {
      const [rawKey, ...rest] = line.split(":");
      const key = rawKey.toLowerCase();
      const value = rest.join(":").trim();
      if (key === "user-agent") inWildcard = value === "*";
      else if (key === "disallow" && inWildcard && value === "/")
        blocksAll = true;
      else if (key === "sitemap" && value === `${siteOrigin}/sitemap.xml`)
        listsSitemap = true;
    }
    robotsState = blocksAll ? "blocks" : "allows";
  }

  let status: SitemapHealth["status"] = "unreachable";
  let urls = 0;
  if (sitemap !== null) {
    const looksLikeSitemap = /<(?:urlset|sitemapindex)[\s>]/.test(sitemap);
    urls = (sitemap.match(/<loc>/g) ?? []).length;
    status = looksLikeSitemap && urls > 0 ? "reachable" : "invalid";
  }

  const value: SitemapHealth = {
    ...base,
    status,
    urls,
    robots: robotsState,
    robots_lists_sitemap: listsSitemap,
  };
  sitemapCache = { at: now, value };
  return value;
}

/**
 * Reads Supabase Auth's public settings (the same document the sign-in page
 * loads). It says whether email sign-in is on and signups are closed; it does
 * not expose SMTP settings, which only the Supabase dashboard can show.
 */
async function probeAuthSettings(fresh: boolean) {
  const now = Date.now();
  if (!fresh && authCache && now - authCache.at < CACHE_MS)
    return authCache.value;
  const config = getSupabasePublicConfig();
  let value: NonNullable<typeof authCache>["value"] = {
    auth_reachable: false,
    email_sign_in: null,
    signup_disabled: null,
  };
  if (config) {
    try {
      const body = await fetchText(`${config.url}/auth/v1/settings`, {
        headers: { apikey: config.publishableKey },
      });
      const settings = body === null ? null : record(JSON.parse(body));
      if (settings) {
        const external = record(settings.external);
        value = {
          auth_reachable: true,
          email_sign_in:
            typeof external?.email === "boolean" ? external.email : null,
          signup_disabled:
            typeof settings.disable_signup === "boolean"
              ? settings.disable_signup
              : null,
        };
      }
    } catch {
      /* Unreachable or malformed: reported as not reachable. */
    }
  }
  authCache = { at: now, value };
  return value;
}

/** A real calendar day in the past, or null. */
function smtpVerifiedOn(now: number): string | null {
  const raw = process.env.AUTH_SMTP_VERIFIED_ON?.trim();
  if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const time = Date.parse(`${raw}T00:00:00Z`);
  if (Number.isNaN(time) || time > now + 86_400_000) return null;
  return new Date(time).toISOString().slice(0, 10) === raw ? raw : null;
}

type DatabaseHealth = {
  rls: RlsHealth;
  errors: Pick<
    ErrorMonitoringHealth,
    "store_ready" | "errors_24h" | "errors_7d" | "last_error_at"
  >;
};

/** Asks Postgres which QUICKKIT tables have row level security on. */
async function readDatabaseHealth(
  db: SupabaseClient<Database> | null,
): Promise<DatabaseHealth> {
  const unavailable: DatabaseHealth = {
    rls: {
      status: "unavailable",
      tables: 0,
      unprotected: [],
      anon_readable: [],
    },
    errors: {
      store_ready: false,
      errors_24h: 0,
      errors_7d: 0,
      last_error_at: null,
    },
  };
  if (!db) return unavailable;
  try {
    const { data, error } = await db.rpc("quickkit_system_health");
    const report = error ? null : record(data);
    if (!report || !Array.isArray(report.tables)) return unavailable;
    const tables = report.tables
      .map(record)
      .filter(
        (table): table is Record<string, unknown> =>
          table !== null && typeof table.name === "string",
      );
    // No tables at all means the query looked in the wrong place, not a pass.
    if (tables.length === 0) return unavailable;
    const names = (keep: (table: Record<string, unknown>) => boolean) =>
      tables.filter(keep).map((table) => String(table.name).slice(0, 63));
    const unprotected = names((table) => table.rls !== true);
    const anonReadable = names((table) => table.anon_grants !== false);
    return {
      rls: {
        status:
          unprotected.length || anonReadable.length ? "issues" : "verified",
        tables: tables.length,
        unprotected,
        anon_readable: anonReadable,
      },
      errors: {
        store_ready: true,
        errors_24h: count(report.errors_24h),
        errors_7d: count(report.errors_7d),
        last_error_at:
          typeof report.last_error_at === "string"
            ? report.last_error_at
            : null,
      },
    };
  } catch {
    return unavailable;
  }
}

async function probeAnalytics(): Promise<AnalyticsHealth> {
  const backend = visitorAnalyticsBackend();
  const empty = { backend, ready: false, visitors: 0, online: 0, since: null };
  if (!backend) return empty;
  try {
    const stats = await readVisitorStats();
    return {
      backend,
      ready: true,
      visitors: stats.visitors,
      online: stats.online,
      since: stats.since,
    };
  } catch {
    return empty;
  }
}

/**
 * Runs every probe. `fresh` skips the five-minute cache on the two HTTP probes
 * (the site's own sitemap and Supabase Auth settings); the database checks are
 * always live.
 */
export async function getSystemHealth(
  db: SupabaseClient<Database> | null,
  options: { fresh?: boolean } = {},
): Promise<SystemHealthReport> {
  const fresh = options.fresh === true;
  const now = Date.now();
  const [database, sitemap, auth, analytics] = await Promise.all([
    readDatabaseHealth(db),
    probeSitemap(fresh),
    probeAuthSettings(fresh),
    probeAnalytics(),
  ]);
  const monitoring = getServerErrorMonitoringStatus();
  return {
    checked_at: new Date(now).toISOString(),
    rls: database.rls,
    smtp: { ...auth, verified_on: smtpVerifiedOn(now) },
    sitemap,
    analytics,
    error_monitoring: {
      enabled: monitoring.enabled,
      configured: monitoring.enabled && database.errors.store_ready,
      ...database.errors,
    },
  };
}

export type RecentErrorEvent = {
  id: string;
  created_at: string;
  scope: string;
  name: string;
  message: string;
};

/** The ten newest stored error events, or an empty list when unavailable. */
export async function readRecentErrors(
  db: SupabaseClient<Database> | null,
): Promise<RecentErrorEvent[]> {
  if (!db) return [];
  try {
    const { data, error } = await db
      .from("quickkit_error_events")
      .select("id, created_at, scope, name, message")
      .order("created_at", { ascending: false })
      .limit(10);
    return error ? [] : ((data ?? []) as RecentErrorEvent[]);
  } catch {
    return [];
  }
}
