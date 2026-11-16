import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => {
  const insert = vi.fn().mockResolvedValue({ error: null });
  const from = vi.fn(() => ({ insert }));
  const rpc = vi.fn().mockResolvedValue({ data: true, error: null });
  return { insert, from, rpc };
});

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdminClient: () => ({ from: mocks.from, rpc: mocks.rpc }),
}));

import { POST } from "@/app/api/tool-feedback/route";

function post(body: unknown, origin: string | null = "http://localhost:3000") {
  return new NextRequest("http://localhost:3000/api/tool-feedback", {
    method: "POST",
    headers: {
      ...(origin ? { origin } : {}),
      "content-type": "application/json",
      "x-real-ip": "203.0.113.4",
    },
    body: JSON.stringify(body),
  });
}

function configure() {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://quickkit-test.supabase.co");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "server-only-test-key");
  vi.stubEnv("SUPABASE_SUBMISSION_HMAC_SECRET", "h".repeat(32));
}

const valid = {
  tool: "merge-pdf",
  rating: 4,
  tags: ["Easy to use", "Great result"],
  comment: "  Worked first time.  ",
  consent: true,
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
  mocks.insert.mockResolvedValue({ error: null });
  mocks.rpc.mockResolvedValue({ data: true, error: null });
});

describe("POST /api/tool-feedback", () => {
  it("stores a consented rating after its own rate limit, with only the visitor's fields", async () => {
    configure();
    const response = await POST(post(valid));
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ ok: true });
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    expect(mocks.rpc).toHaveBeenCalledWith(
      "quickkit_consume_tool_feedback_limit",
      { p_bucket_hash: expect.stringMatching(/^[a-f0-9]{64}$/) },
    );
    expect(mocks.from).toHaveBeenCalledWith("quickkit_tool_feedback");
    expect(mocks.insert).toHaveBeenCalledWith({
      tool_slug: "merge-pdf",
      rating: 4,
      tags: ["Easy to use", "Great result"],
      comment: "Worked first time.",
    });
  });

  it("accepts a rating with no options or comment and removes duplicate options", async () => {
    configure();
    expect(
      (await POST(post({ tool: "merge-pdf", rating: 1, consent: true })))
        .status,
    ).toBe(201);
    expect(mocks.insert).toHaveBeenLastCalledWith({
      tool_slug: "merge-pdf",
      rating: 1,
      tags: [],
      comment: "",
    });
    expect(
      (await POST(post({ ...valid, tags: ["Speed", "Speed"], comment: "   " })))
        .status,
    ).toBe(201);
    expect(mocks.insert).toHaveBeenLastCalledWith({
      tool_slug: "merge-pdf",
      rating: 4,
      tags: ["Speed"],
      comment: "",
    });
  });

  it("rejects invalid ratings, unknown tools and options, and missing consent before any database call", async () => {
    configure();
    for (const body of [
      { ...valid, consent: false },
      { tool: "merge-pdf", rating: 4 },
      { ...valid, tool: "not-a-real-tool" },
      { ...valid, tool: "../admin" },
      { ...valid, rating: 0 },
      { ...valid, rating: 6 },
      { ...valid, rating: 4.5 },
      { ...valid, rating: "5" },
      { ...valid, tags: ["<script>"] },
      { ...valid, tags: "Easy to use" },
      { ...valid, tags: ["Speed", "Speed", "Speed", "Speed", "Speed"] },
      { ...valid, comment: "x".repeat(601) },
      { ...valid, comment: 12 },
      { ...valid, email: "someone@example.test" },
    ]) {
      const response = await POST(post(body));
      expect(response.status, JSON.stringify(body).slice(0, 80)).toBe(400);
      expect((await response.json()).ok).toBe(false);
    }
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("refuses cross-origin and origin-less requests", async () => {
    configure();
    expect((await POST(post(valid, "https://evil.example"))).status).toBe(403);
    expect((await POST(post(valid, null))).status).toBe(403);
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("returns 429 when the limiter refuses and never writes the rating", async () => {
    configure();
    mocks.rpc.mockResolvedValueOnce({ data: false, error: null });
    const response = await POST(post(valid));
    expect(response.status).toBe(429);
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("fails closed with 503 when configuration, the limiter or the insert is unavailable", async () => {
    vi.stubEnv("SUPABASE_SUBMISSION_HMAC_SECRET", "");
    expect((await POST(post(valid))).status).toBe(503);
    expect(mocks.insert).not.toHaveBeenCalled();

    configure();
    mocks.rpc.mockResolvedValueOnce({ data: null, error: new Error("down") });
    expect((await POST(post(valid))).status).toBe(503);
    expect(mocks.insert).not.toHaveBeenCalled();

    mocks.insert.mockResolvedValueOnce({ error: new Error("missing table") });
    const response = await POST(post(valid));
    expect(response.status).toBe(503);
    expect((await response.json()).ok).toBe(false);
  });
});

describe("tool ratings migration least privilege", () => {
  const raw = readFileSync(
    new URL(
      "../supabase/migrations/202611160001_quickkit_tool_feedback.sql",
      import.meta.url,
    ),
    "utf8",
  );
  const sql = raw.replace(/--.*$/gm, "").replace(/\s+/g, " ");

  it("is one additive transaction that changes no existing object", () => {
    expect(raw).toMatch(/^\s*--[^\n]*\n(?:--[^\n]*\n)*\s*begin;/i);
    expect(raw).toMatch(/commit;\s*$/i);
    expect(sql).not.toMatch(/\bdrop\b/i);
    expect(sql).not.toMatch(/\btruncate\b/i);
    expect(sql).not.toMatch(
      /\balter\s+table\s+(?!public\.quickkit_tool_feedback)/i,
    );
    expect(sql).not.toMatch(/\bcreate\s+or\s+replace\b/i);
    expect(sql).not.toMatch(/\bif\s+not\s+exists\b/i);
    const created = [...sql.matchAll(/create table (\S+)/gi)].map((m) => m[1]);
    expect(created).toEqual([
      "public.quickkit_tool_feedback",
      "public.quickkit_tool_feedback_limits",
    ]);
  });

  it("constrains every stored value the public handler can supply", () => {
    expect(sql).toContain("check (rating between 1 and 5)");
    expect(sql).toContain("check (cardinality(tags) <= 4)");
    expect(sql).toContain("check (char_length(comment) <= 600)");
    expect(sql).toContain("check (tool_slug ~ '^[a-z0-9][a-z0-9-]{0,79}$')");
    expect(sql).toContain(
      "check (status in ('new', 'in_progress', 'resolved'))",
    );
  });

  it("enables RLS, denies browser roles and revokes default grants on both tables", () => {
    for (const table of [
      "quickkit_tool_feedback",
      "quickkit_tool_feedback_limits",
    ]) {
      expect(sql).toContain(
        `alter table public.${table} enable row level security`,
      );
      expect(sql).toMatch(
        new RegExp(
          `on public\\.${table} for all to anon, authenticated using \\(false\\) with check \\(false\\)`,
        ),
      );
    }
    expect(sql).toContain(
      "revoke all on table public.quickkit_tool_feedback, public.quickkit_tool_feedback_limits from public, anon, authenticated, service_role",
    );
  });

  it("gives the server role only column-limited writes and no access to the limiter table", () => {
    const grants = [...sql.matchAll(/grant [^;]+;/gi)].map((m) => m[0]);
    expect(grants).toEqual([
      "grant insert (tool_slug, rating, tags, comment) on public.quickkit_tool_feedback to service_role;",
      "grant select, update (status, internal_notes), delete on public.quickkit_tool_feedback to service_role;",
      "grant execute on function public.quickkit_consume_tool_feedback_limit(text) to service_role;",
    ]);
    expect(grants.every((grant) => grant.endsWith("to service_role;"))).toBe(
      true,
    );
  });

  it("locks the SECURITY DEFINER limiter to the server role with a pinned search path", () => {
    expect(sql).toMatch(
      /create function public\.quickkit_consume_tool_feedback_limit\( p_bucket_hash text \) returns boolean language plpgsql security definer set search_path = pg_catalog/,
    );
    expect(sql).toContain(
      "revoke all on function public.quickkit_consume_tool_feedback_limit(text) from public, anon, authenticated, service_role",
    );
    expect(sql).toContain("p_bucket_hash !~ '^[a-f0-9]{64}$'");
    expect(sql).toContain("v_limit constant integer := 30");
    expect(sql).toContain("interval '1 hour'");
  });
});
