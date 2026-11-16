import { readFileSync } from "node:fs";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
const client = vi.fn<() => { rpc: typeof rpc } | null>(() => ({ rpc }));
vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdminClient: () => client(),
}));

import { POST } from "../app/api/error-report/route";
import { onRequestError } from "../instrumentation";
import { storeErrorEvent } from "../lib/monitoring/error-store";

const ORIGIN = "https://quickkit.example";

function report(
  body: unknown,
  headers: Record<string, string> = { origin: ORIGIN },
) {
  return POST(
    new NextRequest(`${ORIGIN}/api/error-report`, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

beforeEach(() => {
  rpc.mockReset().mockResolvedValue({ data: true, error: null });
  client.mockReset().mockImplementation(() => ({ rpc }));
  vi.stubEnv("ERROR_MONITORING_ENABLED", "true");
  vi.stubEnv("ERROR_MONITORING_DSN", "");
  vi.stubEnv("NEXT_PUBLIC_ERROR_MONITORING_ENABLED", "");
  vi.stubEnv("NEXT_PUBLIC_ERROR_MONITORING_DSN", "");
  vi.stubEnv("NEXT_RUNTIME", "nodejs");
});
afterEach(() => vi.unstubAllEnvs());

describe("first-party error store", () => {
  it("stores nothing at all while monitoring is switched off", async () => {
    vi.stubEnv("ERROR_MONITORING_ENABLED", "");
    expect(
      await storeErrorEvent({ scope: "admin", name: "Error", message: "x" }),
    ).toBe(false);
    const response = await report({ name: "TypeError", message: "boom" });
    expect(response.status).toBe(204);
    await onRequestError(new Error("server boom"), {}, { routePath: "/x" });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("scrubs every field again before it reaches the database", async () => {
    await storeErrorEvent({
      scope: "admin",
      name: "AuthError",
      message:
        "Failed for owner@example.com with Bearer abc.def-123 at https://x.test/cb?token=secret123&ok=1\nstack line",
      digest: "1234567890",
    });
    expect(rpc).toHaveBeenCalledTimes(1);
    const [name, args] = rpc.mock.calls[0];
    expect(name).toBe("quickkit_record_error");
    expect(args.p_scope).toBe("admin");
    expect(args.p_digest).toBe("1234567890");
    expect(args.p_message).toContain("[redacted-email]");
    expect(args.p_message).toContain("Bearer [redacted]");
    expect(args.p_message).toContain("token=[redacted]");
    expect(args.p_message).not.toContain("owner@example.com");
    expect(args.p_message).not.toContain("secret123");
    expect(args.p_message).not.toContain("\n");
    expect(args.p_message.length).toBeLessThanOrEqual(240);
  });

  it("reports failure instead of throwing when the database refuses or is missing", async () => {
    rpc.mockResolvedValueOnce({ data: false, error: null });
    expect(await storeErrorEvent({ scope: "a", name: "b", message: "c" })).toBe(
      false,
    );
    rpc.mockResolvedValueOnce({ data: null, error: { message: "denied" } });
    expect(await storeErrorEvent({ scope: "a", name: "b", message: "c" })).toBe(
      false,
    );
    rpc.mockRejectedValueOnce(new Error("network"));
    expect(await storeErrorEvent({ scope: "a", name: "b", message: "c" })).toBe(
      false,
    );
    client.mockReturnValueOnce(null);
    expect(await storeErrorEvent({ scope: "a", name: "b", message: "c" })).toBe(
      false,
    );
  });
});

describe("POST /api/error-report", () => {
  it("stores a same-origin report with a fixed scope and the page path", async () => {
    const response = await report({
      scope: "admin",
      name: "TypeError",
      message: "Cannot read properties of undefined",
      digest: "987654",
      path: "/admin/tools",
    });
    expect(response.status).toBe(204);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(rpc).toHaveBeenCalledWith("quickkit_record_error", {
      p_scope: "client:admin /admin/tools",
      p_name: "TypeError",
      p_message: "Cannot read properties of undefined",
      p_digest: "987654",
    });
  });

  it("never keeps a message from a tool page, even when one is sent", async () => {
    await report({
      scope: "tools",
      name: "SyntaxError",
      message: 'Unexpected token in "my private notes"',
      path: "/tools/json-formatter",
    });
    const args = rpc.mock.calls[0][1];
    expect(args.p_scope).toBe("client:tools /tools/json-formatter");
    expect(args.p_message).toBe("Message not collected for this screen.");
    expect(JSON.stringify(args)).not.toContain("private notes");
  });

  it("files unknown scopes as app and drops paths with a query or odd characters", async () => {
    await report({
      scope: "server:page /secret",
      name: "Error",
      message: "m",
      path: "/tools/x?token=abc",
    });
    await report({
      scope: "global",
      name: "Error",
      path: "/" + "a".repeat(90),
    });
    expect(rpc.mock.calls[0][1].p_scope).toBe("client:app");
    expect(rpc.mock.calls[1][1].p_scope).toBe("client:global");
    for (const [, args] of rpc.mock.calls)
      expect(args.p_scope.length).toBeLessThanOrEqual(64);
    const long = await report({
      scope: "tools",
      name: "Error",
      path: "/tools/" + "a".repeat(70),
    });
    expect(long.status).toBe(204);
    expect(rpc.mock.calls[2][1].p_scope.length).toBeLessThanOrEqual(64);
  });

  it("refuses cross-site, missing-origin, oversized and malformed requests", async () => {
    expect((await report({ name: "E" }, {})).status).toBe(403);
    expect(
      (await report({ name: "E" }, { origin: "https://evil.example" })).status,
    ).toBe(403);
    expect(
      (
        await report(
          { name: "E" },
          { origin: ORIGIN, "sec-fetch-site": "cross-site" },
        )
      ).status,
    ).toBe(403);
    expect(
      (await report({ name: "E", message: "x".repeat(4000) })).status,
    ).toBe(413);
    expect((await report("{not json")).status).toBe(400);
    expect((await report([{ name: "E" }])).status).toBe(400);
    expect((await report({ message: "no name" })).status).toBe(400);
    expect((await report({ name: 42 })).status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("answers 204 even when the database write fails", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: "down" } });
    expect((await report({ name: "E", message: "m" })).status).toBe(204);
  });
});

describe("server request errors", () => {
  it("stores the route pattern, never the visited URL or headers", async () => {
    await onRequestError(
      Object.assign(new Error("Database timed out for a@b.co"), {
        digest: "d-1",
      }),
      {
        path: "/tools/qr?secret=1",
        method: "GET",
        headers: { cookie: "sb-access-token=abc" },
      },
      { routePath: "/tools/[slug]", routeType: "render" },
    );
    const args = rpc.mock.calls[0][1];
    expect(args.p_scope).toBe("server:render /tools/[slug]");
    expect(args.p_name).toBe("Error");
    expect(args.p_message).toBe("Database timed out for [redacted-email]");
    expect(args.p_digest).toBe("d-1");
    expect(JSON.stringify(args)).not.toContain("secret=1");
    expect(JSON.stringify(args)).not.toContain("sb-access-token");
  });

  it("does nothing outside the Node.js runtime and never throws", async () => {
    vi.stubEnv("NEXT_RUNTIME", "edge");
    await onRequestError(new Error("x"), {}, { routePath: "/" });
    expect(rpc).not.toHaveBeenCalled();
    vi.stubEnv("NEXT_RUNTIME", "nodejs");
    rpc.mockRejectedValueOnce(new Error("network"));
    await expect(
      onRequestError(null, null, undefined as never),
    ).resolves.toBeUndefined();
  });
});

describe("system health migration", () => {
  const sql = readFileSync(
    "supabase/migrations/202611160003_quickkit_system_health.sql",
    "utf8",
  );
  const tables = [
    "quickkit_visitor_totals",
    "quickkit_visitor_ids",
    "quickkit_visitor_sessions",
    "quickkit_error_events",
  ];
  const functions = [
    "quickkit_record_visit",
    "quickkit_visitor_stats",
    "quickkit_record_error",
    "quickkit_system_health",
  ];

  it("is additive and transactional", () => {
    expect(sql).toMatch(/^begin;$/m);
    expect(sql.trimEnd().endsWith("commit;")).toBe(true);
    expect(sql).not.toMatch(/\b(drop|truncate|alter\s+table\s+\S+\s+drop)\b/i);
    expect(sql).not.toMatch(/create\s+or\s+replace/i);
  });

  it("locks every new table to the server and every function to service_role", () => {
    for (const table of tables) {
      expect(sql).toContain(
        `alter table public.${table} enable row level security;`,
      );
      expect(sql).toMatch(
        new RegExp(
          `on public\\.${table} for all to anon, authenticated\\s+using \\(false\\) with check \\(false\\);`,
        ),
      );
    }
    const grants = sql.match(/\bgrant\b[^;]+;/gi) ?? [];
    expect(grants.length).toBe(2);
    for (const grant of grants) {
      expect(grant).toMatch(/to service_role;$/);
      expect(grant).not.toMatch(/\b(anon|authenticated|public)\b(?!\.)/i);
    }
    // No direct insert or update on the error table: the capped function is
    // the only writer.
    expect(sql).toContain(
      "grant select, delete on table public.quickkit_error_events to service_role;",
    );
    for (const name of functions) {
      const body = sql.slice(sql.indexOf(`create function public.${name}(`));
      const header = body.slice(0, body.indexOf("as $$"));
      expect(header).toContain("security definer");
      expect(header).toContain("set search_path = pg_catalog");
    }
    expect(sql).toMatch(
      /revoke all on function[\s\S]+?from public, anon, authenticated;/,
    );
  });
});
