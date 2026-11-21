import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  getUser: vi.fn(),
  exchange: vi.fn(),
  reset: vi.fn(),
  update: vi.fn(),
  signOut: vi.fn(),
  valid: vi.fn(),
  listener: null as null | ((event: string) => void),
  store: { delete: vi.fn() },
}));
vi.mock("next/headers", () => ({ cookies: async () => mocks.store }));
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
  RECOVERY_CALLBACK,
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
afterEach(() => {
  vi.resetAllMocks();
  vi.unstubAllEnvs();
  mocks.listener = null;
});
describe("server-side recovery", () => {
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
      redirectTo: RECOVERY_CALLBACK,
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
