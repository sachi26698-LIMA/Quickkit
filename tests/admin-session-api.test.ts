import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ verify: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin-auth", () => ({
  verifyAdminSession: mocks.verify,
}));

import { GET } from "@/app/api/admin/session/route";

function request(cookie?: string) {
  return new NextRequest("https://quickkit.example/api/admin/session", {
    headers: cookie ? { cookie } : undefined,
  });
}

afterEach(() => vi.clearAllMocks());

describe("GET /api/admin/session", () => {
  it("returns only an authorized boolean and disables caching for an administrator", async () => {
    mocks.verify.mockResolvedValue({
      status: "authorized",
      admin: {
        id: "11111111-1111-4111-8111-111111111111",
        email: "private@example.test",
        lastSignInAt: null,
      },
    });

    const response = await GET(request("quickkit-auth-token.0=session"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ authorized: true });
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("vary")).toBe("Cookie");
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("does not contact the auth provider when there is no session cookie", async () => {
    const response = await GET(request());
    expect(await response.json()).toEqual({ authorized: false });
    expect(mocks.verify).not.toHaveBeenCalled();
  });

  it.each([
    ["forged cookie", "forged-token", "unauthenticated"],
    ["expired session", "expired-token", "unauthenticated"],
    ["non-admin user", "valid-user-token", "forbidden"],
  ])("fails closed for %s", async (_label, token, status) => {
    mocks.verify.mockResolvedValue({ status });
    const response = await GET(request(`quickkit-auth-token.0=${token}`));
    expect(await response.json()).toEqual({ authorized: false });
    expect(mocks.verify).toHaveBeenCalledOnce();
  });

  it("returns unauthorized if session verification throws", async () => {
    mocks.verify.mockRejectedValue(new Error("malformed session"));
    const response = await GET(request("quickkit-auth-token.0=malformed"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ authorized: false });
  });

  it.each([
    "unauthenticated",
    "forbidden",
    "allowlist_not_configured",
    "supabase_not_configured",
    "unavailable",
  ])("does not reveal auth details for %s sessions", async (status) => {
    mocks.verify.mockResolvedValue({ status });
    const response = await GET(request("quickkit-auth-token.0=session"));
    expect(await response.json()).toEqual({ authorized: false });
  });
});
