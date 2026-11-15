import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  verify: vi.fn(),
  masterClient: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin-auth", () => ({
  verifyAdminSession: mocks.verify,
}));
vi.mock("@/lib/supabase/master-admin", () => ({
  getMasterAdminServiceClient: mocks.masterClient,
}));

import { GET } from "@/app/api/admin/[resource]/route";
import { assertSameOrigin, parseJsonObject } from "@/lib/supabase/admin-api";

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

function request(path = "profile") {
  return new NextRequest(`https://quickkit.example/api/admin/${path}`);
}

describe("admin API access boundary", () => {
  it("validates the browser origin against the forwarded host, not the internal function host", () => {
    const request = new NextRequest("http://0.0.0.0:3000/api/admin/profile", {
      headers: {
        origin: "https://preview.quickkit.example",
        host: "internal-service:3000",
        "x-forwarded-host": "preview.quickkit.example",
        "x-forwarded-proto": "https",
      },
    });
    expect(assertSameOrigin(request)).toBe(true);
  });
  it("rejects unauthenticated requests before constructing the privileged client", async () => {
    mocks.verify.mockResolvedValueOnce({ status: "unauthenticated" });
    const response = await GET(request(), {
      params: Promise.resolve({ resource: "profile" }),
    });
    expect(response.status).toBe(401);
    expect(mocks.masterClient).not.toHaveBeenCalled();
    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  it("identifies a missing allowlist without constructing a privileged client", async () => {
    mocks.verify.mockResolvedValueOnce({ status: "allowlist_not_configured" });
    const response = await GET(request(), {
      params: Promise.resolve({ resource: "profile" }),
    });
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: "Administrator email allowlist is not configured.",
    });
    expect(mocks.masterClient).not.toHaveBeenCalled();
  });

  it("identifies a missing Supabase auth config separately", async () => {
    mocks.verify.mockResolvedValueOnce({ status: "supabase_not_configured" });
    const response = await GET(request(), {
      params: Promise.resolve({ resource: "profile" }),
    });
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: "Supabase authentication is not configured.",
    });
    expect(mocks.masterClient).not.toHaveBeenCalled();
  });

  it("rejects a signed-in identity that is not allowlisted", async () => {
    mocks.verify.mockResolvedValueOnce({ status: "forbidden" });
    const response = await GET(request(), {
      params: Promise.resolve({ resource: "profile" }),
    });
    expect(response.status).toBe(403);
    expect(mocks.masterClient).not.toHaveBeenCalled();
  });

  it("fails closed when a valid administrator has no configured service client", async () => {
    mocks.verify.mockResolvedValueOnce({
      status: "authorized",
      admin: {
        id: "admin-uuid",
        email: "admin@example.com",
        lastSignInAt: null,
      },
    });
    mocks.masterClient.mockReturnValueOnce(null);
    const response = await GET(request(), {
      params: Promise.resolve({ resource: "profile" }),
    });
    expect(response.status).toBe(503);
  });

  it("reports whether the submission HMAC is configured without exposing its value", async () => {
    vi.stubEnv("SUPABASE_SUBMISSION_HMAC_SECRET", "server-only-test-secret");
    mocks.verify.mockResolvedValueOnce({
      status: "authorized",
      admin: {
        id: "admin-uuid",
        email: "admin@example.com",
        lastSignInAt: null,
      },
    });
    const select = vi.fn().mockResolvedValue({ error: null });
    mocks.masterClient.mockReturnValueOnce({
      from: vi.fn(() => ({ select })),
    });
    const response = await GET(request("security"), {
      params: Promise.resolve({ resource: "security" }),
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.submission_hmac_configured).toBe(true);
    expect(JSON.stringify(body)).not.toContain("server-only-test-secret");
  });

  it("returns only the verified admin profile and never exposes server configuration", async () => {
    mocks.verify.mockResolvedValueOnce({
      status: "authorized",
      admin: {
        id: "admin-uuid",
        email: "admin@example.com",
        lastSignInAt: "2026-11-10T12:00:00.000Z",
      },
    });
    mocks.masterClient.mockReturnValueOnce({ from: vi.fn() });
    const response = await GET(request(), {
      params: Promise.resolve({ resource: "profile" }),
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    const body = await response.json();
    expect(body.data).toEqual({
      email: "admin@example.com",
      id: "admin-uuid",
      last_sign_in_at: "2026-11-10T12:00:00.000Z",
    });
    expect(JSON.stringify(body)).not.toMatch(/service.role|secret|password/i);
  });
});

describe("bounded administrator JSON parsing", () => {
  it("accepts a small JSON object and rejects arrays, invalid JSON, and oversized streams", async () => {
    const headers = { "content-type": "application/json" };
    const makeRequest = (body: string) =>
      new Request("https://quickkit.example/api/admin/profile", {
        method: "POST",
        headers,
        body,
      });
    expect(
      await parseJsonObject(makeRequest(JSON.stringify({ ok: true }))),
    ).toEqual({ ok: true });
    expect(await parseJsonObject(makeRequest("[]"))).toBeNull();
    expect(await parseJsonObject(makeRequest("{"))).toBeNull();
    expect(
      await parseJsonObject(
        makeRequest(JSON.stringify({ value: "x".repeat(40_000) })),
      ),
    ).toBeNull();
  });
});
