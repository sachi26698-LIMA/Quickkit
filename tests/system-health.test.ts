import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const SITE = "https://quickkit.example";
const SUPABASE = "https://project.supabase.co";

const HEALTHY_TABLES = [
  {
    name: "quickkit_admin_activity",
    rls: true,
    policies: 1,
    anon_grants: false,
  },
  { name: "quickkit_favorites", rls: true, policies: 3, anon_grants: false },
];

type Routes = Record<string, { status?: number; body: string } | Error>;

function stubFetch(routes: Routes) {
  const mock = vi.fn(async (input: string | URL | Request) => {
    const url = String(input);
    const route = routes[url];
    if (!route) return new Response("missing", { status: 404 });
    if (route instanceof Error) throw route;
    return new Response(route.body, { status: route.status ?? 200 });
  });
  vi.stubGlobal("fetch", mock);
  return mock;
}

const sitemapXml = (count: number) =>
  `<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${Array.from(
    { length: count },
    (_, index) => `<url><loc>${SITE}/p${index}</loc></url>`,
  ).join("")}</urlset>`;

const OPEN_ROBOTS = `User-Agent: *\nAllow: /\nDisallow: /api/\n\nUser-Agent: Googlebot\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`;
const CLOSED_ROBOTS = "User-Agent: *\nAllow: /ads.txt\nDisallow: /\n";

function database(report: unknown, error: unknown = null) {
  return {
    rpc: vi.fn(async (name: string) => {
      if (name === "quickkit_system_health") return { data: report, error };
      if (name === "quickkit_visitor_stats")
        return {
          data: {
            online: 2,
            visitors: 41,
            visits: 50,
            active_ms: 600000,
            since: "2026-11-16T00:00:00+00:00",
          },
          error: null,
        };
      return { data: null, error: { message: "unknown function" } };
    }),
  };
}

async function load(env: Record<string, string> = {}) {
  vi.resetModules();
  vi.stubEnv("SITE_URL", SITE);
  vi.stubEnv("LAUNCH_APPROVED", "true");
  vi.stubEnv("VERCEL_ENV", "");
  vi.stubEnv("VERCEL", "");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", SUPABASE);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-test-value");
  vi.stubEnv("ANALYTICS_DATABASE_URL", "");
  vi.stubEnv("ANALYTICS_DATABASE_TOKEN", "");
  vi.stubEnv("ERROR_MONITORING_ENABLED", "");
  vi.stubEnv("ERROR_MONITORING_DSN", "");
  vi.stubEnv("AUTH_SMTP_VERIFIED_ON", "");
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
  const db = database({
    tables: HEALTHY_TABLES,
    errors_24h: 0,
    errors_7d: 3,
    last_error_at: "2026-11-14T10:00:00+00:00",
  });
  // The visitor counter builds its own server client; hand it the same fake.
  vi.doMock("@/lib/supabase/admin", () => ({
    getSupabaseAdminClient: () => db,
  }));
  const health = await import("../lib/system-health");
  const labels = await import("../lib/system-health-labels");
  return { ...health, ...labels, db };
}

const healthyRoutes = (): Routes => ({
  [`${SITE}/sitemap.xml`]: { body: sitemapXml(120) },
  [`${SITE}/robots.txt`]: { body: OPEN_ROBOTS },
  [`${SUPABASE}/auth/v1/settings`]: {
    body: JSON.stringify({
      external: { email: true, google: false },
      disable_signup: true,
    }),
  },
});

beforeEach(() => {
  vi.useRealTimers();
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.doUnmock("@/lib/supabase/admin");
});

describe("system health probes", () => {
  it("reports every row as confirmed only from what the probes returned", async () => {
    const fetchMock = stubFetch(healthyRoutes());
    const { getSystemHealth, describeSystemHealth, db } = await load({
      ERROR_MONITORING_ENABLED: "true",
      AUTH_SMTP_VERIFIED_ON: "2026-11-16",
    });
    const report = await getSystemHealth(db as never, { fresh: true });

    expect(report.rls).toEqual({
      status: "verified",
      tables: 2,
      unprotected: [],
      anon_readable: [],
    });
    expect(report.sitemap).toMatchObject({
      status: "reachable",
      urls: 120,
      robots: "allows",
      robots_lists_sitemap: true,
      indexing_enabled: true,
    });
    expect(report.smtp).toEqual({
      auth_reachable: true,
      email_sign_in: true,
      signup_disabled: true,
      verified_on: "2026-11-16",
    });
    expect(report.analytics).toEqual({
      backend: "supabase",
      ready: true,
      visitors: 41,
      online: 2,
      since: "2026-11-16T00:00:00+00:00",
    });
    expect(report.error_monitoring).toMatchObject({
      enabled: true,
      store_ready: true,
      configured: true,
      errors_24h: 0,
      errors_7d: 3,
    });

    const labels = describeSystemHealth(report);
    expect(labels.rls).toMatchObject({
      value: "Verified · 2 tables",
      tone: "good",
    });
    expect(labels.smtp).toMatchObject({
      value: "Confirmed · 2026-11-16",
      tone: "good",
    });
    expect(labels.sitemap).toMatchObject({
      value: "Reachable · 120 URLs",
      tone: "good",
    });
    expect(labels.analytics).toMatchObject({
      value: "Connected · 41 visitors",
      tone: "good",
    });
    expect(labels.errorMonitoring).toMatchObject({
      value: "Connected · no errors in 24h",
      tone: "good",
    });

    // The settings probe sends only the publishable key, never the server key.
    const authCall = fetchMock.mock.calls.find(([url]) =>
      String(url).endsWith("/auth/v1/settings"),
    );
    expect(JSON.stringify(authCall)).toContain("sb_publishable_test");
    expect(JSON.stringify(fetchMock.mock.calls)).not.toContain(
      "service-role-test-value",
    );
    expect(JSON.stringify(report)).not.toContain("service-role-test-value");
  });

  it("flags a table with row level security off or signed-out access", async () => {
    stubFetch(healthyRoutes());
    const { getSystemHealth, describeSystemHealth } = await load();
    const db = database({
      tables: [
        ...HEALTHY_TABLES,
        { name: "quickkit_open", rls: false, policies: 0, anon_grants: false },
        { name: "quickkit_public", rls: true, policies: 1, anon_grants: true },
      ],
      errors_24h: 0,
      errors_7d: 0,
      last_error_at: null,
    });
    const report = await getSystemHealth(db as never);
    expect(report.rls).toEqual({
      status: "issues",
      tables: 4,
      unprotected: ["quickkit_open"],
      anon_readable: ["quickkit_public"],
    });
    const label = describeSystemHealth(report).rls;
    expect(label.tone).toBe("error");
    expect(label.value).toBe("Needs attention");
    expect(label.detail).toContain("quickkit_open");
    expect(label.detail).toContain("quickkit_public");
  });

  it("never reports a pass when the database report is missing, empty or malformed", async () => {
    stubFetch(healthyRoutes());
    const { getSystemHealth, describeSystemHealth } = await load({
      ERROR_MONITORING_ENABLED: "true",
    });
    for (const db of [
      database(null, { message: "function does not exist" }),
      database({ tables: [] }),
      database({ tables: "all good" }),
      database("verified"),
      { rpc: undefined },
      null,
    ]) {
      const report = await getSystemHealth(db as never);
      expect(report.rls.status).toBe("unavailable");
      expect(report.error_monitoring.configured).toBe(false);
      const labels = describeSystemHealth(report);
      expect(labels.rls).toMatchObject({
        value: "Check unavailable",
        tone: "warn",
      });
      expect(labels.errorMonitoring).toMatchObject({
        value: "Store not ready",
        tone: "warn",
      });
    }
    // A table entry without a recognisable rls flag counts as unprotected.
    const odd = await getSystemHealth(
      database({ tables: [{ name: "quickkit_x" }] }) as never,
    );
    expect(odd.rls).toMatchObject({
      status: "issues",
      unprotected: ["quickkit_x"],
      anon_readable: ["quickkit_x"],
    });
  });

  it("reports sitemap problems as problems", async () => {
    const cases: [Routes, string, string, string][] = [
      [{}, "unreachable", "Unreachable", "error"],
      [
        {
          [`${SITE}/sitemap.xml`]: new Error("network down"),
          [`${SITE}/robots.txt`]: { body: OPEN_ROBOTS },
        },
        "unreachable",
        "Unreachable",
        "error",
      ],
      [
        {
          [`${SITE}/sitemap.xml`]: { body: "<html>Sign in</html>" },
          [`${SITE}/robots.txt`]: { body: OPEN_ROBOTS },
        },
        "invalid",
        "Sitemap invalid",
        "error",
      ],
      [
        {
          [`${SITE}/sitemap.xml`]: { body: sitemapXml(0) },
          [`${SITE}/robots.txt`]: { body: OPEN_ROBOTS },
        },
        "invalid",
        "Sitemap invalid",
        "error",
      ],
      [
        {
          [`${SITE}/sitemap.xml`]: { body: sitemapXml(3) },
          [`${SITE}/robots.txt`]: { body: CLOSED_ROBOTS },
        },
        "reachable",
        "Reachable · crawling blocked",
        "warn",
      ],
      [
        {
          [`${SITE}/sitemap.xml`]: { body: sitemapXml(1) },
          [`${SITE}/robots.txt`]: { status: 500, body: "" },
        },
        "reachable",
        "robots.txt unreachable",
        "warn",
      ],
    ];
    for (const [routes, status, value, tone] of cases) {
      stubFetch(routes);
      const { probeSitemap, describeSystemHealth, getSystemHealth, db } =
        await load();
      expect((await probeSitemap(true)).status).toBe(status);
      const label = describeSystemHealth(
        await getSystemHealth(db as never, { fresh: true }),
      ).sitemap;
      expect(label).toMatchObject({ value, tone });
    }
  });

  it("says the origin is not set without making a request", async () => {
    const fetchMock = stubFetch({});
    const { probeSitemap } = await load({ SITE_URL: "" });
    expect(await probeSitemap(true)).toMatchObject({
      status: "not-configured",
      urls: 0,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("caches the two HTTP probes for periodic refreshes and skips the cache on a full check", async () => {
    const fetchMock = stubFetch(healthyRoutes());
    const { getSystemHealth, db } = await load();
    await getSystemHealth(db as never);
    await getSystemHealth(db as never);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    await getSystemHealth(db as never, { fresh: true });
    expect(fetchMock).toHaveBeenCalledTimes(6);
    // The database checks are never cached.
    expect(
      db.rpc.mock.calls.filter(([name]) => name === "quickkit_system_health"),
    ).toHaveLength(3);
  });

  it("keeps SMTP unverified without a valid confirmation day, and amber when Auth does not answer", async () => {
    for (const value of ["", "yes", "2026-13-40", "2026-02-30", "2999-01-01"]) {
      stubFetch(healthyRoutes());
      const { getSystemHealth, describeSystemHealth, db } = await load({
        AUTH_SMTP_VERIFIED_ON: value,
      });
      const report = await getSystemHealth(db as never, { fresh: true });
      expect(report.smtp.verified_on).toBeNull();
      expect(describeSystemHealth(report).smtp).toMatchObject({
        value: "External · unverified",
        tone: "neutral",
      });
    }

    stubFetch({
      ...healthyRoutes(),
      [`${SUPABASE}/auth/v1/settings`]: { status: 401, body: "{}" },
    });
    const down = await load({ AUTH_SMTP_VERIFIED_ON: "2026-11-16" });
    const report = await down.getSystemHealth(down.db as never, {
      fresh: true,
    });
    expect(report.smtp).toMatchObject({
      auth_reachable: false,
      verified_on: "2026-11-16",
    });
    expect(down.describeSystemHealth(report).smtp).toMatchObject({
      value: "Auth settings unreachable",
      tone: "warn",
    });

    stubFetch({
      ...healthyRoutes(),
      [`${SUPABASE}/auth/v1/settings`]: {
        body: JSON.stringify({ external: { email: false } }),
      },
    });
    const off = await load({ AUTH_SMTP_VERIFIED_ON: "2026-11-16" });
    expect(
      off.describeSystemHealth(
        await off.getSystemHealth(off.db as never, { fresh: true }),
      ).smtp,
    ).toMatchObject({ value: "Email sign-in is off", tone: "warn" });
  });

  it("reports the counter and error store honestly when they are off or failing", async () => {
    stubFetch(healthyRoutes());
    const { getSystemHealth, describeSystemHealth, db } = await load();
    const off = describeSystemHealth(await getSystemHealth(db as never));
    expect(off.errorMonitoring).toMatchObject({
      value: "Off · ready to enable",
      tone: "neutral",
    });

    const withErrors = await getSystemHealth(
      database({
        tables: HEALTHY_TABLES,
        errors_24h: 4,
        errors_7d: 9,
        last_error_at: "2026-11-16T05:00:00+00:00",
      }) as never,
    );
    vi.stubEnv("ERROR_MONITORING_ENABLED", "true");
    const enabled = await getSystemHealth(
      database({
        tables: HEALTHY_TABLES,
        errors_24h: 4,
        errors_7d: 9,
        last_error_at: "2026-11-16T05:00:00+00:00",
      }) as never,
    );
    expect(withErrors.error_monitoring.configured).toBe(false);
    expect(describeSystemHealth(enabled).errorMonitoring).toMatchObject({
      value: "4 errors in 24h",
      tone: "warn",
    });

    db.rpc.mockImplementation(async () => ({
      data: null,
      error: { message: "function does not exist" },
    }));
    // Past the counter's few-second read cache.
    vi.useFakeTimers({ now: Date.now() + 60_000, toFake: ["Date"] });
    const failing = await getSystemHealth(db as never);
    vi.useRealTimers();
    expect(failing.analytics).toMatchObject({
      backend: "supabase",
      ready: false,
    });
    expect(describeSystemHealth(failing).analytics).toMatchObject({
      value: "Database not ready",
      tone: "warn",
    });
  });

  it("falls back to 'not checked' wording when no report is available", async () => {
    const { describeSystemHealth } = await load();
    const labels = describeSystemHealth(undefined, {
      sitemapOriginConfigured: true,
    });
    expect(labels.rls).toMatchObject({
      value: "Verification required",
      tone: "warn",
    });
    expect(labels.smtp.tone).toBe("neutral");
    expect(labels.sitemap).toMatchObject({
      value: "Owner verification required",
      tone: "warn",
    });
    expect(labels.analytics.value).toBe("Not configured");
    expect(labels.errorMonitoring.value).toBe("Not configured");
    expect(Object.values(labels).some((label) => label.tone === "good")).toBe(
      false,
    );
  });
});
