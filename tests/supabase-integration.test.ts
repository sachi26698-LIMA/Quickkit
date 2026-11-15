import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
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

import { POST as postContact } from "@/app/api/contact/route";
import { POST as postFeedback } from "@/app/api/feedback/route";
import {
  getSupabaseCspOrigin,
  getSupabasePublicConfig,
} from "@/lib/supabase/config";

const migration = readFileSync(
  new URL(
    "../supabase/migrations/202611100001_quickkit_account_data.sql",
    import.meta.url,
  ),
  "utf8",
);
const migrationSql = migration.replace(/--.*$/gm, "").replace(/\s+/g, " ");
const favorites = readFileSync(
  new URL("../lib/use-favorites.ts", import.meta.url),
  "utf8",
);
const adminClient = readFileSync(
  new URL("../lib/supabase/admin.ts", import.meta.url),
  "utf8",
);

function post(
  path: string,
  body: unknown,
  origin: string | null = "http://localhost:3000",
  extraHeaders: Record<string, string> = {},
) {
  return new NextRequest(`http://localhost:3000${path}`, {
    method: "POST",
    headers: {
      ...(origin ? { origin } : {}),
      "content-type": "application/json",
      "x-real-ip": "203.0.113.4",
      "x-forwarded-for": "198.51.100.9, 203.0.113.5",
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  });
}

function configureSupabaseForTest() {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://quickkit-test.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "server-only-test-key");
  vi.stubEnv("SUPABASE_SUBMISSION_HMAC_SECRET", "h".repeat(32));
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
  mocks.insert.mockResolvedValue({ error: null });
  mocks.rpc.mockResolvedValue({ data: true, error: null });
});

describe("Supabase configuration boundaries", () => {
  it("does not create a public client config when URL or public key is missing", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
    expect(getSupabasePublicConfig()).toBeNull();
  });

  it("rejects non-HTTPS remote endpoints and permits only an exact Supabase CSP origin", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://attacker.example");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "not-a-secret");
    expect(getSupabasePublicConfig()).toBeNull();
    expect(getSupabaseCspOrigin()).toBeNull();

    vi.stubEnv(
      "NEXT_PUBLIC_SUPABASE_URL",
      "https://quickkit-test.supabase.co/",
    );
    expect(getSupabaseCspOrigin()).toBe("https://quickkit-test.supabase.co");
  });
});

describe("private public-form routes", () => {
  it("rejects cross-origin submissions before touching the database", async () => {
    configureSupabaseForTest();
    const response = await postContact(
      post(
        "/api/contact",
        {
          name: "A Person",
          email: "person@example.com",
          subject: "Question",
          message: "A sufficiently long question.",
          consent: true,
        },
        "https://attacker.example",
      ),
    );
    expect(response.status).toBe(403);
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("accepts same-origin form requests when a reverse proxy forwards the public host", async () => {
    configureSupabaseForTest();
    const response = await postContact(
      post(
        "/api/contact",
        {
          name: "A Person",
          email: "person@example.com",
          subject: "Question",
          message: "A sufficiently long question.",
          consent: false,
        },
        "https://quickkit.example",
        {
          host: "internal-service:3000",
          "x-forwarded-host": "quickkit.example",
          "x-forwarded-proto": "https",
        },
      ),
    );
    // 400 confirms the origin passed and validation rejected missing consent;
    // it must not reach either the limiter RPC or submission insert.
    expect(response.status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("rejects missing Origin and unexpected payload fields before any database call", async () => {
    configureSupabaseForTest();
    const body = {
      name: "A Person",
      email: "person@example.com",
      subject: "Question",
      message: "A sufficiently long question.",
      consent: true,
    };
    const missingOrigin = await postContact(post("/api/contact", body, null));
    expect(missingOrigin.status).toBe(403);

    const extraField = await postContact(
      post("/api/contact", { ...body, user_id: "attacker-controlled" }),
    );
    expect(extraField.status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("validates, normalizes and inserts a consented contact message only after rate limiting", async () => {
    configureSupabaseForTest();
    const response = await postContact(
      post("/api/contact", {
        name: "  Ada Lovelace  ",
        email: "ADA@EXAMPLE.COM",
        subject: "  Support  ",
        message: "  Please help with this issue.  ",
        consent: true,
      }),
    );
    expect(response.status).toBe(201);
    expect(mocks.rpc).toHaveBeenCalledWith(
      "quickkit_consume_submission_limit",
      expect.objectContaining({
        p_scope: "contact",
        p_bucket_hash: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
    );
    expect(mocks.from).toHaveBeenCalledWith("quickkit_contact_submissions");
    expect(mocks.insert).toHaveBeenCalledWith({
      name: "Ada Lovelace",
      email: "ada@example.com",
      subject: "Support",
      message: "Please help with this issue.",
    });
    expect(await response.json()).toEqual({ ok: true });
  });

  it("does not report success or write contact data without explicit consent", async () => {
    configureSupabaseForTest();
    const response = await postContact(
      post("/api/contact", {
        name: "Ada",
        email: "ada@example.com",
        subject: "Help",
        message: "Please help with this request.",
        consent: false,
      }),
    );
    expect(response.status).toBe(400);
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("stores feedback only when the explicit opt-in flag is true", async () => {
    configureSupabaseForTest();
    const response = await postFeedback(
      post("/api/feedback", {
        name: "Asha",
        message: "Please add keyboard shortcuts.",
        consent: true,
      }),
    );
    expect(response.status).toBe(201);
    expect(mocks.rpc).toHaveBeenCalledWith(
      "quickkit_consume_submission_limit",
      expect.objectContaining({ p_scope: "feedback" }),
    );
    expect(mocks.from).toHaveBeenCalledWith("quickkit_feedback_submissions");
    expect(mocks.insert).toHaveBeenCalledWith({
      name: "Asha",
      message: "Please add keyboard shortcuts.",
    });
  });

  it("returns an explicit unavailable response when rate-limit configuration is missing", async () => {
    vi.stubEnv("SUPABASE_SUBMISSION_HMAC_SECRET", "");
    const response = await postFeedback(
      post("/api/feedback", { message: "A useful note.", consent: true }),
    );
    expect(response.status).toBe(503);
    expect((await response.json()).ok).toBe(false);
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("returns 429 on a database rate-limit rejection without writing a message", async () => {
    configureSupabaseForTest();
    mocks.rpc.mockResolvedValueOnce({ data: false, error: null });
    const response = await postFeedback(
      post("/api/feedback", { message: "A useful note.", consent: true }),
    );
    expect(response.status).toBe(429);
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("fails closed on RPC errors and ignores spoofed forwarded addresses when x-real-ip is present", async () => {
    configureSupabaseForTest();
    mocks.rpc.mockResolvedValueOnce({
      data: null,
      error: new Error("offline"),
    });
    const failed = await postFeedback(
      post("/api/feedback", { message: "A useful note.", consent: true }),
    );
    expect(failed.status).toBe(503);
    expect(mocks.from).not.toHaveBeenCalled();

    mocks.rpc.mockResolvedValue({ data: true, error: null });
    const first = await postFeedback(
      post(
        "/api/feedback",
        { message: "A useful note.", consent: true },
        undefined,
        {
          "x-forwarded-for": "203.0.113.1",
        },
      ),
    );
    const second = await postFeedback(
      post(
        "/api/feedback",
        { message: "Another useful note.", consent: true },
        undefined,
        {
          "x-forwarded-for": "198.51.100.77, 203.0.113.99",
        },
      ),
    );
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(mocks.rpc.mock.calls[1][1].p_bucket_hash).toBe(
      mocks.rpc.mock.calls[2][1].p_bucket_hash,
    );
  });
});

describe("database least-privilege migration", () => {
  const tables = [
    "quickkit_profiles",
    "quickkit_favorites",
    "quickkit_contact_submissions",
    "quickkit_feedback_submissions",
    "quickkit_submission_limits",
  ];

  it("enables RLS on all five tables", () => {
    for (const table of tables) {
      expect(migrationSql).toMatch(
        new RegExp(
          `alter table public\\.${table} enable row level security`,
          "i",
        ),
      );
    }
  });

  it("fails on unexpected existing objects instead of skipping or replacing them", () => {
    expect(migrationSql).not.toMatch(/\bif\s+not\s+exists\b/i);
    expect(migrationSql).not.toMatch(/\bdrop\s+(?:policy|trigger)\b/i);
    expect(migrationSql).not.toMatch(/\bcreate\s+or\s+replace\b/i);
  });

  it("applies owner-only profile and favorite policies with no ownership UPDATE grants", () => {
    for (const policy of [
      '"Users read own QUICKKIT profile"',
      '"Users create own QUICKKIT profile"',
      '"Users update own QUICKKIT profile"',
      '"Users read own QUICKKIT favorites"',
      '"Users add own QUICKKIT favorites"',
      '"Users remove own QUICKKIT favorites"',
    ]) {
      expect(migrationSql).toContain(`create policy ${policy}`);
    }
    expect(migrationSql).toMatch(/using \(\(select auth\.uid\(\)\) = id\)/i);
    expect(migrationSql).toMatch(
      /with check \(\(select auth\.uid\(\)\) = id\)/i,
    );
    expect(migrationSql).toMatch(
      /using \(\(select auth\.uid\(\)\) = user_id\)/i,
    );
    expect(migrationSql).toMatch(
      /with check \(\(select auth\.uid\(\)\) = user_id\)/i,
    );
    expect(migrationSql).toMatch(
      /grant update \(display_name\) on public\.quickkit_profiles to authenticated/i,
    );
    expect(migrationSql).not.toMatch(
      /grant update(?:\s*\([^)]*\))?\s+on public\.quickkit_favorites/i,
    );
    expect(favorites).toMatch(/localStorage/);
    expect(favorites).not.toMatch(/supabase|signIn|signUp/i);
  });

  it("revokes client access to private tables and limits the server-role grants", () => {
    for (const table of tables) {
      expect(migrationSql).toMatch(
        new RegExp(
          `revoke all on table public\\.${table} from public, anon, authenticated, service_role`,
          "i",
        ),
      );
    }
    expect(migrationSql).toMatch(
      /grant insert \(name, email, subject, message\)\s+on public\.quickkit_contact_submissions to service_role/i,
    );
    expect(migrationSql).toMatch(
      /grant insert \(name, message\)\s+on public\.quickkit_feedback_submissions to service_role/i,
    );
    expect(migrationSql).not.toMatch(/grant[^;]+quickkit_submission_limits/i);
    expect(migrationSql).not.toMatch(
      /create policy[^;]+on public\.quickkit_(?:contact_submissions|feedback_submissions|submission_limits)/i,
    );
    expect(adminClient).toMatch(/^import "server-only";/);
  });

  it("locks SECURITY DEFINER RPCs to the server role and pins their search path", () => {
    expect(migrationSql).toMatch(
      /create function public\.quickkit_consume_submission_limit[\s\S]*?security definer\s+set search_path = pg_catalog/i,
    );
    expect(migrationSql).toMatch(
      /revoke all on function public\.quickkit_consume_submission_limit\(text, text\)\s+from public, anon, authenticated, service_role/i,
    );
    expect(migrationSql).toMatch(
      /grant execute on function public\.quickkit_consume_submission_limit\(text, text\)\s+to service_role/i,
    );
    expect(migrationSql).toMatch(/p_scope not in \('contact', 'feedback'\)/i);
    expect(migrationSql).toMatch(/p_bucket_hash !~ '\^\[a-f0-9\]\{64\}\$'/i);
  });
});
