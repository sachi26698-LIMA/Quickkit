import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
const client = vi.fn<() => { rpc: typeof rpc } | null>(() => ({ rpc }));
vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdminClient: () => client(),
}));

const sha = (value: string) => createHash("sha256").update(value).digest("hex");
const VISITOR = "0b0e8f0a-6f0c-4a51-9c58-2f8f0a3d7b11";
const SESSION = "3f2b1c9d-8e7a-4b6c-a5d4-1e2f3a4b5c6d";

async function load() {
  vi.resetModules();
  return import("../lib/visitor-analytics");
}

beforeEach(() => {
  rpc.mockReset();
  client.mockReset().mockImplementation(() => ({ rpc }));
  vi.stubEnv("ANALYTICS_DATABASE_URL", "");
  vi.stubEnv("ANALYTICS_DATABASE_TOKEN", "");
  vi.stubEnv("VERCEL", "1");
});
afterEach(() => vi.unstubAllEnvs());

describe("visitor counter stored in Supabase", () => {
  it("uses Supabase when no libSQL database is configured, and nothing when neither exists", async () => {
    const analytics = await load();
    expect(analytics.visitorAnalyticsBackend()).toBe("supabase");
    client.mockReturnValue(null);
    expect(analytics.visitorAnalyticsBackend()).toBeNull();
    await expect(analytics.readVisitorStats()).rejects.toThrow();
    await expect(analytics.recordVisit(VISITOR, SESSION, 0)).rejects.toThrow();
  });

  it("ignores a file: database on Vercel but honours a real libSQL URL", async () => {
    vi.stubEnv("ANALYTICS_DATABASE_URL", "file:/tmp/stats.db");
    expect((await load()).visitorAnalyticsBackend()).toBe("supabase");
    vi.stubEnv("ANALYTICS_DATABASE_URL", "libsql://stats.example.turso.io");
    expect((await load()).visitorAnalyticsBackend()).toBe("libsql");
  });

  it("sends only hashed identifiers and the reported time", async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    const analytics = await load();
    await analytics.recordVisit(VISITOR, SESSION, 20000);
    expect(rpc).toHaveBeenCalledWith("quickkit_record_visit", {
      p_visitor: sha(VISITOR),
      p_session: sha(SESSION),
      p_active_ms: 20000,
    });
    expect(JSON.stringify(rpc.mock.calls)).not.toContain(VISITOR);
    expect(JSON.stringify(rpc.mock.calls)).not.toContain(SESSION);
  });

  it("surfaces a database refusal as a failure without leaking its text", async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { message: "session identity mismatch at 10.0.0.4" },
    });
    const analytics = await load();
    await expect(analytics.recordVisit(VISITOR, SESSION, 5)).rejects.toThrow(
      "Visitor statistics are unavailable",
    );
  });

  it("reads totals, averages visible time per visit and caches for a few seconds", async () => {
    rpc.mockResolvedValue({
      data: {
        online: 3,
        visitors: 120,
        visits: 200,
        active_ms: 5_000_000,
        since: "2026-11-16T06:00:00+00:00",
      },
      error: null,
    });
    const analytics = await load();
    const now = 1_800_000_000_000;
    expect(await analytics.readVisitorStats(now)).toEqual({
      online: 3,
      visitors: 120,
      averageSeconds: 25,
      since: "2026-11-16T06:00:00+00:00",
    });
    await analytics.readVisitorStats(now + 4000);
    expect(rpc).toHaveBeenCalledTimes(1);
    await analytics.readVisitorStats(now + 6000);
    expect(rpc).toHaveBeenCalledTimes(2);
  });

  it("rejects a missing or malformed totals row instead of showing zeros", async () => {
    const analytics = await load();
    for (const result of [
      { data: null, error: null },
      { data: null, error: { message: "function does not exist" } },
      { data: [1, 2], error: null },
      { data: { online: 1, visitors: 2 }, error: null },
    ]) {
      rpc.mockResolvedValueOnce(result);
      await expect(
        analytics.readVisitorStats(Date.now() + Math.random() * 1e9 + 1e7),
      ).rejects.toThrow("Visitor statistics are unavailable");
    }
    rpc.mockResolvedValueOnce({
      data: {
        online: -4,
        visitors: "abc",
        visits: 0,
        active_ms: 99,
        since: "2026-11-16T06:00:00+00:00",
      },
      error: null,
    });
    expect(await analytics.readVisitorStats(5e12)).toMatchObject({
      online: 0,
      visitors: 0,
      averageSeconds: 0,
    });
  });
});

describe("visitor flood guard migration", () => {
  const sql = readFileSync(
    "supabase/migrations/202611160004_quickkit_visitor_flood_guard.sql",
    "utf8",
  );

  it("is transactional and removes nothing", () => {
    expect(sql).toMatch(/^begin;$/m);
    expect(sql.trimEnd().endsWith("commit;")).toBe(true);
    expect(sql).not.toMatch(
      /\b(drop|truncate|delete\s+from\s+public\.quickkit_visitor_(ids|totals))\b/i,
    );
  });

  it("limits new visits per minute before it stores anything for them", () => {
    const limit = sql.indexOf(">= c_new_visits_per_minute");
    const insertSession = sql.indexOf(
      "insert into public.quickkit_visitor_sessions",
    );
    const insertVisitor = sql.indexOf(
      "insert into public.quickkit_visitor_ids",
    );
    expect(sql).toMatch(/c_new_visits_per_minute constant integer := 120;/);
    expect(sql).toContain("created_at >= now() - interval '1 minute'");
    expect(limit).toBeGreaterThan(0);
    expect(insertSession).toBeGreaterThan(limit);
    expect(insertVisitor).toBeGreaterThan(insertSession);
  });

  it("keeps the function private to the server", () => {
    expect(sql).toMatch(/security definer\s+set search_path = pg_catalog/);
    expect(sql).toMatch(
      /revoke all on function public\.quickkit_record_visit\(text, text, bigint\)\s+from public, anon, authenticated;/,
    );
    expect(sql).toMatch(
      /grant execute on function public\.quickkit_record_visit\(text, text, bigint\)\s+to service_role;/,
    );
    expect(sql).not.toMatch(/grant[^;]*\b(anon|authenticated)\b/i);
  });
});
