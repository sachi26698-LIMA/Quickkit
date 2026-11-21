import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  getUser: vi.fn(),
  exchange: vi.fn(),
  reset: vi.fn(),
  update: vi.fn(),
  signOut: vi.fn(),
  valid: vi.fn(),
  limit: vi.fn(),
  pad: vi.fn(),
  listener: null as null | ((event: string) => void),
  store: { delete: vi.fn() },
}));
vi.mock("next/headers", () => ({ cookies: async () => mocks.store }));
vi.mock("@/lib/supabase/recovery-limit", () => ({
  consumeRecoveryLimit: mocks.limit,
  padRecoveryResponse: mocks.pad,
}));
vi.mock("@/lib/supabase/recovery", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/supabase/recovery")>()),
  createRecoveryClient: mocks.create,
  validRecoverySession: mocks.valid,
}));
import { GET as callback } from "@/app/auth/recovery/route";
import { GET, POST } from "@/app/api/admin/auth/recovery/route";
import {
  makeRecoveryProof,
  validRecoveryProof,
  recoveryOrigin,
} from "@/lib/supabase/recovery";
import { GET as adminCallback } from "@/app/auth/callback/route";

const client = () => ({
  auth: {
    resetPasswordForEmail: mocks.reset,
    exchangeCodeForSession: mocks.exchange,
    getUser: mocks.getUser,
    updateUser: mocks.update,
    signOut: mocks.signOut,
    onAuthStateChange: (fn: (event: string) => void) => {
      mocks.listener = fn;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    },
  },
});
const post = (body: object, origin = "https://quickkit.live") =>
  new NextRequest("https://quickkit.live/api/admin/auth/recovery", {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
beforeEach(() => {
  vi.stubEnv("VERCEL_ENV", "production");
  mocks.limit.mockResolvedValue("allowed");
  mocks.pad.mockResolvedValue(undefined);
});
afterEach(() => {
  vi.resetAllMocks();
  vi.unstubAllEnvs();
  mocks.listener = null;
});
describe("server-side recovery", () => {
  it("uses only explicit environment origins and fails closed for unsafe configuration", () => {
    vi.stubEnv(
      "QUICKKIT_RECOVERY_PREVIEW_ORIGIN",
      "https://preview.example.test",
    );
    expect(recoveryOrigin()).toBe("https://quickkit.live");
    vi.stubEnv("VERCEL_ENV", "preview");
    expect(recoveryOrigin()).toBe("https://preview.example.test");
    for (const value of [
      "http://preview.example.test",
      "https://quickkit.live",
      "https://*.example.test",
      "https://preview.example.test/path",
      "https://user:pass@preview.example.test",
      "https://localhost:3001",
      "",
    ]) {
      vi.stubEnv("QUICKKIT_RECOVERY_PREVIEW_ORIGIN", value);
      expect(recoveryOrigin(), value).toBeNull();
    }
    vi.stubEnv("VERCEL_ENV", "development");
    vi.stubEnv("QUICKKIT_RECOVERY_LOCAL_ORIGIN", "http://localhost:3001");
    expect(recoveryOrigin()).toBe("http://localhost:3001");
    vi.stubEnv("QUICKKIT_RECOVERY_LOCAL_ORIGIN", "https://evil.example.test");
    expect(recoveryOrigin()).toBeNull();
  });
  it("rejects mismatched request hosts without exchanging a recovery code", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv(
      "QUICKKIT_RECOVERY_PREVIEW_ORIGIN",
      "https://preview.example.test",
    );
    const response = await callback(
      new NextRequest("https://evil.example.test/auth/recovery?code=fixture"),
    );
    expect(response.status).toBe(403);
    expect(mocks.exchange).not.toHaveBeenCalled();
  });
  it("uses the configured preview callback and returns to its own origin", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv(
      "QUICKKIT_RECOVERY_PREVIEW_ORIGIN",
      "https://preview.example.test",
    );
    vi.stubEnv("SUPABASE_SUBMISSION_HMAC_SECRET", "a".repeat(40));
    vi.stubEnv("QUICKKIT_ADMIN_EMAILS", "owner@example.test");
    mocks.create.mockResolvedValue(client());
    mocks.reset.mockResolvedValue({ error: null });
    const response = await POST(
      new NextRequest("https://preview.example.test/api/admin/auth/recovery", {
        method: "POST",
        headers: {
          origin: "https://preview.example.test",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          action: "request",
          email: "owner@example.test",
        }),
      }),
    );
    expect(response.status).toBe(200);
    expect(mocks.reset).toHaveBeenCalledWith("owner@example.test", {
      redirectTo: "https://preview.example.test/auth/recovery",
    });
    const failure = await callback(
      new NextRequest("https://preview.example.test/auth/recovery"),
    );
    expect(failure.headers.get("location")).toBe(
      "https://preview.example.test/reset-password?error=invalid",
    );
  });
  it("binds short-lived proof to user and session with server-only key", () => {
    vi.stubEnv("SUPABASE_SUBMISSION_HMAC_SECRET", "a".repeat(40));
    const now = 1800000000000;
    const proof = makeRecoveryProof("token", "user", now + 1000);
    expect(validRecoveryProof(proof, "token", "user", now)).toBe(true);
    expect(validRecoveryProof(proof, "other", "user", now)).toBe(false);
    expect(validRecoveryProof(proof, "token", "other", now)).toBe(false);
    expect(validRecoveryProof(proof, "token", "user", now + 1000)).toBe(false);
    expect(validRecoveryProof("invalid", "token", "user", now)).toBe(false);
  });
  it("sends a PKCE request to the exact recovery callback", async () => {
    vi.stubEnv("SUPABASE_SUBMISSION_HMAC_SECRET", "a".repeat(40));
    vi.stubEnv("QUICKKIT_ADMIN_EMAILS", "owner@example.test");
    mocks.create.mockResolvedValue(client());
    mocks.reset.mockResolvedValue({ error: null });
    expect(
      (await POST(post({ action: "request", email: "owner@example.test" })))
        .status,
    ).toBe(200);
    expect(mocks.reset).toHaveBeenCalledWith("owner@example.test", {
      redirectTo: "https://quickkit.live/auth/recovery",
    });
    expect(
      (await POST(post({ action: "request", email: "other@example.test" })))
        .status,
    ).toBe(200);
    expect(mocks.reset).toHaveBeenCalledTimes(1);
    expect(
      (
        await POST(
          post(
            { action: "request", email: "owner@example.test" },
            "https://evil.test",
          ),
        )
      ).status,
    ).toBe(403);
  });
  it("applies the same limiter and padding to allowed and other addresses", async () => {
    vi.stubEnv("SUPABASE_SUBMISSION_HMAC_SECRET", "a".repeat(40));
    vi.stubEnv("QUICKKIT_ADMIN_EMAILS", "owner@example.test");
    mocks.create.mockResolvedValue(client());
    mocks.reset.mockResolvedValue({ error: null });
    const allowed = await POST(
      post({ action: "request", email: "owner@example.test" }),
    );
    const other = await POST(
      post({ action: "request", email: "other@example.test" }),
    );
    expect(allowed.status).toBe(other.status);
    expect(await allowed.json()).toEqual(await other.json());
    expect(mocks.limit).toHaveBeenCalledTimes(2);
    expect(mocks.pad).toHaveBeenCalledTimes(2);
    mocks.limit
      .mockResolvedValueOnce("limited")
      .mockResolvedValueOnce("unavailable");
    expect(
      (await POST(post({ action: "request", email: "other@example.test" })))
        .status,
    ).toBe(429);
    expect(
      (await POST(post({ action: "request", email: "owner@example.test" })))
        .status,
    ).toBe(503);
    expect(mocks.reset).toHaveBeenCalledTimes(1);
  });
  it("does not disclose allowlist membership through provider errors", async () => {
    vi.stubEnv("SUPABASE_SUBMISSION_HMAC_SECRET", "a".repeat(40));
    vi.stubEnv("QUICKKIT_ADMIN_EMAILS", "owner@example.test");
    mocks.create.mockResolvedValue(client());
    mocks.reset.mockResolvedValueOnce({ error: new Error("unavailable") });
    const allowed = await POST(
      post({ action: "request", email: "owner@example.test" }),
    );
    const other = await POST(
      post({ action: "request", email: "other@example.test" }),
    );
    expect(allowed.status).toBe(other.status);
    expect(await allowed.json()).toEqual(await other.json());
    mocks.reset.mockRejectedValueOnce(new Error("network"));
    expect(
      (await POST(post({ action: "request", email: "owner@example.test" })))
        .status,
    ).toBe(200);
    mocks.create.mockResolvedValueOnce(null);
    expect(
      (await POST(post({ action: "request", email: "owner@example.test" })))
        .status,
    ).toBe(200);
  });
  it("exchanges a recovery code and sets an HttpOnly proof", async () => {
    vi.stubEnv("SUPABASE_SUBMISSION_HMAC_SECRET", "a".repeat(40));
    vi.stubEnv("QUICKKIT_ADMIN_EMAILS", "owner@example.test");
    mocks.create.mockResolvedValue(client());
    mocks.exchange.mockImplementation(async () => {
      mocks.listener?.("PASSWORD_RECOVERY");
      return {
        data: { session: { access_token: "token", user: { id: "123" } } },
        error: null,
      };
    });
    mocks.getUser.mockResolvedValue({
      data: { user: { id: "123", email: "owner@example.test" } },
      error: null,
    });
    const response = await callback(
      new NextRequest("https://quickkit.live/auth/recovery?code=fixture"),
    );
    expect(response.headers.get("location")).toBe(
      "https://quickkit.live/reset-password",
    );
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(response.headers.get("set-cookie")).not.toContain("token");
  });
  it.each(["missing", "invalid", "expired", "reused"])(
    "fails safely for %s links",
    async (kind) => {
      mocks.create.mockResolvedValue(client());
      mocks.exchange.mockResolvedValue({
        data: { session: null },
        error: new Error("invalid"),
      });
      const response = await callback(
        new NextRequest(
          `https://quickkit.live/auth/recovery${kind === "missing" ? "" : "?code=fixture"}`,
        ),
      );
      expect(response.headers.get("location")).toBe(
        "https://quickkit.live/reset-password?error=invalid",
      );
      expect(response.headers.get("set-cookie")).toContain(
        "quickkit-recovery-proof=",
      );
      expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
    },
  );
  it("rejects a non-recovery sign-in code", async () => {
    mocks.create.mockResolvedValue(client());
    mocks.exchange.mockImplementation(async () => {
      mocks.listener?.("SIGNED_IN");
      return {
        data: { session: { access_token: "token", user: { id: "123" } } },
        error: null,
      };
    });
    expect(
      (
        await callback(
          new NextRequest("https://quickkit.live/auth/recovery?code=fixture"),
        )
      ).headers.get("location"),
    ).toContain("error=invalid");
  });
  it("rejects invalid sessions and updates only with valid proof", async () => {
    mocks.create.mockResolvedValue(client());
    mocks.valid.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    mocks.update.mockResolvedValue({ error: null });
    mocks.signOut.mockResolvedValue({ error: null });
    expect(
      (
        await POST(
          post({
            action: "update",
            password: "ExamplePassword123",
            confirm: "different",
          }),
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await POST(
          post({
            action: "update",
            password: "ExamplePassword123",
            confirm: "ExamplePassword123",
          }),
        )
      ).status,
    ).toBe(401);
    expect(
      (
        await POST(
          post({
            action: "update",
            password: "ExamplePassword123",
            confirm: "ExamplePassword123",
          }),
        )
      ).status,
    ).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith({
      password: "ExamplePassword123",
    });
    expect(mocks.store.delete).toHaveBeenCalled();
  });
  it("reports missing recovery session", async () => {
    mocks.create.mockResolvedValue(null);
    expect(await (await GET()).json()).toEqual({ valid: false });
  });
  it("keeps the existing admin callback distinct", () => {
    expect(typeof adminCallback).toBe("function");
  });
});
