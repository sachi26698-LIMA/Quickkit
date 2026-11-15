import { readFile } from "node:fs/promises";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  verifyAdminSession: vi.fn(),
  getMasterAdminServiceClient: vi.fn(),
  getOverviewSnapshot: vi.fn(),
  readToolCatalog: vi.fn(),
  readCategoryCatalog: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin-auth", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/supabase/admin-auth")>();
  return {
    ...actual,
    verifyAdminSession: mocks.verifyAdminSession,
  };
});
vi.mock("@/lib/supabase/master-admin", () => ({
  getMasterAdminServiceClient: mocks.getMasterAdminServiceClient,
}));
vi.mock("@/lib/supabase/admin-data", () => ({
  getOverviewSnapshot: mocks.getOverviewSnapshot,
  readToolCatalog: mocks.readToolCatalog,
  readCategoryCatalog: mocks.readCategoryCatalog,
}));

import { DELETE, GET, PATCH, POST } from "@/app/api/admin/[resource]/route";
import { validateOwnerTestEmailRequest } from "@/lib/email-test-guard";
import {
  captureHandledError,
  getErrorMonitoringStatus,
  registerErrorReporterAdapter,
  sanitizeErrorForMonitoring,
} from "@/lib/monitoring/error-reporter";
import { getAdminSetupReadiness } from "@/lib/supabase/admin-auth";

const ALL_ADMIN_RESOURCES = [
  "overview",
  "tools",
  "categories",
  "submissions",
  "feedback",
  "settings",
  "activity",
  "seo",
  "security",
  "profile",
] as const;

function makeRequest(
  resource: string,
  method: "GET" | "POST" | "PATCH" | "DELETE" = "GET",
  body?: Record<string, unknown>,
) {
  return new NextRequest(`https://quickkit.example/api/admin/${resource}`, {
    method,
    headers:
      method === "GET"
        ? undefined
        : {
            origin: "https://quickkit.example",
            "content-type": "application/json",
          },
    body: body ? JSON.stringify(body) : undefined,
  });
}

function makeMockDb() {
  const result = { data: [], error: null, count: 0 };
  const chain = {
    select: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    then: (resolve: (val: typeof result) => void) => resolve(result),
  };
  return {
    from: vi.fn(() => chain),
  };
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
  registerErrorReporterAdapter(null);
});

describe("Release readiness: Admin anonymous denial, fail-closed 503, and owner access", () => {
  it("denies anonymous requests with 401 across every Admin resource before constructing service_role", async () => {
    mocks.verifyAdminSession.mockResolvedValue({ status: "unauthenticated" });
    mocks.getMasterAdminServiceClient.mockReturnValue(makeMockDb());

    for (const resource of ALL_ADMIN_RESOURCES) {
      const response = await GET(makeRequest(resource), {
        params: Promise.resolve({ resource }),
      });
      expect(response.status, `GET /api/admin/${resource}`).toBe(401);
      expect(response.headers.get("cache-control")).toBe("no-store");
    }

    for (const [fn, method] of [
      [POST, "POST"],
      [PATCH, "PATCH"],
      [DELETE, "DELETE"],
    ] as const) {
      const response = await fn(makeRequest("tools", method, { slug: "a" }), {
        params: Promise.resolve({ resource: "tools" }),
      });
      expect(response.status, `${method} /api/admin/tools`).toBe(401);
      expect(response.headers.get("cache-control")).toBe("no-store");
    }

    expect(mocks.getMasterAdminServiceClient).not.toHaveBeenCalled();
  });

  it("denies signed-in non-owner users with 403 across every Admin resource before constructing service_role", async () => {
    mocks.verifyAdminSession.mockResolvedValue({ status: "forbidden" });
    mocks.getMasterAdminServiceClient.mockReturnValue(makeMockDb());

    for (const resource of ALL_ADMIN_RESOURCES) {
      const response = await GET(makeRequest(resource), {
        params: Promise.resolve({ resource }),
      });
      expect(response.status, `GET /api/admin/${resource}`).toBe(403);
      expect(response.headers.get("cache-control")).toBe("no-store");
    }

    expect(mocks.getMasterAdminServiceClient).not.toHaveBeenCalled();
  });

  it("fails closed with 503 and no-store whenever Admin configuration is incomplete", async () => {
    for (const status of [
      "allowlist_not_configured",
      "supabase_not_configured",
      "unavailable",
    ] as const) {
      mocks.verifyAdminSession.mockResolvedValue({ status });
      const response = await GET(makeRequest("overview"), {
        params: Promise.resolve({ resource: "overview" }),
      });
      expect(response.status, `503 for ${status}`).toBe(503);
      expect(response.headers.get("cache-control")).toBe("no-store");
    }

    // Even for an authorized owner, missing SUPABASE_SERVICE_ROLE_KEY fails closed with 503
    mocks.verifyAdminSession.mockResolvedValue({
      status: "authorized",
      admin: {
        id: "owner-1",
        email: "owner@example.test",
        lastSignInAt: null,
      },
    });
    mocks.getMasterAdminServiceClient.mockReturnValue(null);
    const missingKeyResponse = await GET(makeRequest("profile"), {
      params: Promise.resolve({ resource: "profile" }),
    });
    expect(missingKeyResponse.status).toBe(503);
    expect(missingKeyResponse.headers.get("cache-control")).toBe("no-store");
  });

  it("grants allowlisted owner access with Cache-Control: no-store across Admin read resources", async () => {
    vi.stubEnv("QUICKKIT_ADMIN_EMAILS", "owner@example.test");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "sb_secret_test");

    mocks.verifyAdminSession.mockResolvedValue({
      status: "authorized",
      admin: {
        id: "owner-1",
        email: "owner@example.test",
        lastSignInAt: "2026-11-15T10:00:00.000Z",
      },
    });
    mocks.getMasterAdminServiceClient.mockReturnValue(makeMockDb());
    mocks.getOverviewSnapshot.mockResolvedValue({
      connected: true,
      total_tools: 1,
      active_tools: 1,
      published_tools: 1,
      unpublished_tools: 0,
      featured_tools: 0,
      total_categories: 1,
      published_categories: 1,
      contact_count: 0,
      feedback_count: 0,
      new_contact_count: 0,
      new_feedback_count: 0,
      category_distribution: [],
      activity: [],
    });
    mocks.readToolCatalog.mockResolvedValue({ configured: true, tools: [] });
    mocks.readCategoryCatalog.mockResolvedValue({
      configured: true,
      categories: [],
    });

    for (const resource of ALL_ADMIN_RESOURCES) {
      const response = await GET(makeRequest(resource), {
        params: Promise.resolve({ resource }),
      });
      expect(response.status, `owner GET /api/admin/${resource}`).toBe(200);
      expect(response.headers.get("cache-control")).toBe("no-store");
    }

    // Security endpoint must never return raw secret values
    const secResponse = await GET(makeRequest("security"), {
      params: Promise.resolve({ resource: "security" }),
    });
    const secText = await secResponse.text();
    expect(secText).not.toContain("sb_secret_test");
    expect(secText).not.toContain("sb_publishable_test");
    expect(secText).toContain('"error_monitoring_status":"Not configured"');
  });

  it("reports strictly boolean setup readiness without leaking environment values", () => {
    vi.stubEnv("QUICKKIT_ADMIN_EMAILS", "owner@example.test");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    vi.stubEnv("SUPABASE_SUBMISSION_HMAC_SECRET", "");

    const readiness = getAdminSetupReadiness();
    expect(readiness).toEqual({
      allowlistConfigured: true,
      supabaseUrlConfigured: false,
      supabaseKeyConfigured: false,
      serviceRoleConfigured: false,
      submissionHmacConfigured: false,
      ready: false,
    });
    expect(JSON.stringify(readiness)).not.toContain("owner@example.test");
  });
});

describe("Release readiness: Supabase migration RLS & least-privilege verification", () => {
  it("enforces RLS and least-privilege grants across both account and master admin migrations", async () => {
    const accountSql = await readFile(
      "supabase/migrations/202611100001_quickkit_account_data.sql",
      "utf8",
    );
    const adminSql = await readFile(
      "supabase/migrations/202611100002_quickkit_master_admin.sql",
      "utf8",
    );

    const allNineTables = [
      "quickkit_profiles",
      "quickkit_favorites",
      "quickkit_contact_submissions",
      "quickkit_feedback_submissions",
      "quickkit_submission_limits",
      "quickkit_admin_tool_overrides",
      "quickkit_admin_category_overrides",
      "quickkit_admin_site_settings",
      "quickkit_admin_activity",
    ];
    const combined = `${accountSql}\n${adminSql}`;
    for (const table of allNineTables) {
      expect(combined).toContain(
        `alter table public.${table} enable row level security;`,
      );
    }

    // Security definer functions lock search_path = pg_catalog
    expect(accountSql).toMatch(
      /create function public\.quickkit_consume_submission_limit[\s\S]*security definer\s+set search_path = pg_catalog/i,
    );
    expect(accountSql).toMatch(
      /create function public\.quickkit_create_profile_for_new_user[\s\S]*security definer\s+set search_path = pg_catalog/i,
    );
    // Zero anon grants in either migration (strip SQL line comments before scanning)
    const strippedSql = combined.replace(/--[^\n]*/g, "");
    expect(strippedSql).not.toMatch(/\bgrant\b[^;]*\bto\s+[^;]*\banon\b/i);
  });
});

describe("Release readiness: Sitemap non-fabrication of lastmod", () => {
  it("omits lastModified when git history is unavailable rather than fabricating a date", async () => {
    const { gitLastModifiedForFiles } = await import("../app/sitemap");
    expect(
      gitLastModifiedForFiles(["app/(public)/nonexistent-file-for-test.tsx"]),
    ).toBeUndefined();
    expect(
      gitLastModifiedForFiles(["app/(public)/page.tsx"], {
        repoRoot: "/tmp",
      }),
    ).toBeUndefined();
  });
});

describe("Release readiness: Owner-triggered test email safeguard", () => {
  const allowlist = new Set(["owner@example.test"]);

  it("blocks test email unless explicitly approved by an allowlisted owner with matching recipient confirmation", () => {
    expect(
      validateOwnerTestEmailRequest({
        actorEmail: "owner@example.test",
        allowlist,
        recipient: "owner@example.test",
        confirmedRecipient: "owner@example.test",
        explicitOwnerApproval: false,
      }),
    ).toMatchObject({ ok: false, code: "approval_required" });

    expect(
      validateOwnerTestEmailRequest({
        actorEmail: "owner@example.test",
        allowlist,
        recipient: "owner@example.test",
        confirmedRecipient: "other@example.test",
        explicitOwnerApproval: true,
      }),
    ).toMatchObject({ ok: false, code: "confirmation_mismatch" });

    expect(
      validateOwnerTestEmailRequest({
        actorEmail: "owner@example.test",
        allowlist,
        recipient: "thirdparty@example.test",
        confirmedRecipient: "thirdparty@example.test",
        explicitOwnerApproval: true,
      }),
    ).toMatchObject({ ok: false, code: "recipient_not_allowlisted" });

    expect(
      validateOwnerTestEmailRequest({
        actorEmail: "intruder@example.test",
        allowlist,
        recipient: "owner@example.test",
        confirmedRecipient: "owner@example.test",
        explicitOwnerApproval: true,
      }),
    ).toMatchObject({ ok: false, code: "actor_not_allowlisted" });

    expect(
      validateOwnerTestEmailRequest({
        actorEmail: "owner@example.test",
        allowlist,
        recipient: "owner@example.test\r\nBcc: victim@example.test",
        confirmedRecipient: "owner@example.test\r\nBcc: victim@example.test",
        explicitOwnerApproval: true,
      }),
    ).toMatchObject({ ok: false, code: "invalid_recipient" });

    expect(
      validateOwnerTestEmailRequest({
        actorEmail: "OWNER@EXAMPLE.TEST",
        allowlist,
        recipient: " owner@example.test ",
        confirmedRecipient: "OWNER@EXAMPLE.TEST",
        explicitOwnerApproval: true,
      }),
    ).toEqual({
      ok: true,
      actorEmail: "owner@example.test",
      recipient: "owner@example.test",
    });
  });
});

describe("Release readiness: Opt-in privacy-preserving error monitoring", () => {
  it("defaults to Not configured and performs a strict no-op when unconfigured", () => {
    vi.stubEnv("ERROR_MONITORING_ENABLED", "");
    vi.stubEnv("ERROR_MONITORING_DSN", "");
    vi.stubEnv("NEXT_PUBLIC_ERROR_MONITORING_ENABLED", "");
    vi.stubEnv("NEXT_PUBLIC_ERROR_MONITORING_DSN", "");

    const status = getErrorMonitoringStatus();
    expect(status).toEqual({
      configured: false,
      enabled: false,
      dsnPresent: false,
      statusLabel: "Not configured",
    });

    const adapter = vi.fn();
    registerErrorReporterAdapter(adapter);
    expect(captureHandledError(new Error("boom"), "admin")).toBeNull();
    expect(adapter).not.toHaveBeenCalled();
  });

  it("scrubs secrets, emails, tokens, and query strings before forwarding when explicitly enabled", () => {
    vi.stubEnv("ERROR_MONITORING_ENABLED", "true");
    vi.stubEnv(
      "ERROR_MONITORING_DSN",
      "https://publickey@o123.ingest.sentry.io/456",
    );

    const status = getErrorMonitoringStatus();
    expect(status.configured).toBe(true);
    expect(JSON.stringify(status)).not.toContain("publickey");

    const sanitized = sanitizeErrorForMonitoring(
      new Error(
        "Auth failed for owner@example.test with Bearer abc123.xyz and sb_secret_topsecret999 at https://user:pass@host.test/x?token=mysecret",
      ),
      "admin",
    );
    expect(sanitized.message).not.toContain("owner@example.test");
    expect(sanitized.message).not.toContain("abc123.xyz");
    expect(sanitized.message).not.toContain("sb_secret_topsecret999");
    expect(sanitized.message).not.toContain("user:pass");
    expect(sanitized.message).not.toContain("mysecret");

    const received: unknown[] = [];
    registerErrorReporterAdapter((event) => received.push(event));
    const result = captureHandledError(
      new Error("Safe boundary failure"),
      "admin",
    );
    expect(result).not.toBeNull();
    expect(received).toHaveLength(1);
  });
});
