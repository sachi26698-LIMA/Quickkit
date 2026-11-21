import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), enabled: true }));
vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdminClient: () => (mocks.enabled ? { rpc: mocks.rpc } : null),
}));
import { consumeRecoveryLimit } from "@/lib/supabase/recovery-limit";

const request = (ip?: string) =>
  new NextRequest("https://www.quickkit.live/api/admin/auth/recovery", {
    headers: ip ? { "x-vercel-forwarded-for": ip } : {},
  });
beforeEach(() => {
  vi.stubEnv("VERCEL_ENV", "production");
});
afterEach(() => {
  vi.resetAllMocks();
  vi.unstubAllEnvs();
  vi.useRealTimers();
  mocks.enabled = true;
});
describe("recovery abuse controls", () => {
  it("uses two deterministic, domain-separated hashed buckets and no raw identities", async () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("SUPABASE_SUBMISSION_HMAC_SECRET", "x".repeat(40));
    mocks.rpc.mockResolvedValue({ data: true, error: null });
    expect(
      await consumeRecoveryLimit(request("192.0.2.1"), "owner@example.test"),
    ).toBe("allowed");
    const first = mocks.rpc.mock.calls.map((call) => call[1].p_bucket_hash);
    expect(first).toHaveLength(2);
    expect(first[0]).not.toBe(first[1]);
    expect(first.every((hash) => /^[a-f0-9]{64}$/.test(hash))).toBe(true);
    expect(JSON.stringify(mocks.rpc.mock.calls)).not.toContain(
      "owner@example.test",
    );
    expect(JSON.stringify(mocks.rpc.mock.calls)).not.toContain("192.0.2.1");
    await consumeRecoveryLimit(request("192.0.2.1"), "owner@example.test");
    expect(
      mocks.rpc.mock.calls.map((call) => call[1].p_bucket_hash).slice(2),
    ).toEqual(first);
  });
  it("fails closed for unavailable storage, missing IP and an exhausted bucket", async () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("SUPABASE_SUBMISSION_HMAC_SECRET", "x".repeat(40));
    expect(await consumeRecoveryLimit(request(), "x@example.test")).toBe(
      "unavailable",
    );
    expect(mocks.rpc).not.toHaveBeenCalled();
    mocks.rpc
      .mockResolvedValueOnce({ data: true, error: null })
      .mockResolvedValueOnce({ data: false, error: null });
    expect(
      await consumeRecoveryLimit(request("192.0.2.1"), "x@example.test"),
    ).toBe("limited");
    mocks.rpc.mockResolvedValue({
      data: null,
      error: new Error("unavailable"),
    });
    expect(
      await consumeRecoveryLimit(request("192.0.2.1"), "x@example.test"),
    ).toBe("unavailable");
  });
  it("uses a shared development bucket rather than client-supplied headers", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("VERCEL_ENV", "development");
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("SUPABASE_SUBMISSION_HMAC_SECRET", "x".repeat(40));
    mocks.rpc.mockResolvedValue({ data: true, error: null });
    await consumeRecoveryLimit(request("192.0.2.1"), "x@example.test");
    await consumeRecoveryLimit(request("192.0.2.2"), "x@example.test");
    expect(mocks.rpc.mock.calls[0][1].p_bucket_hash).toBe(
      mocks.rpc.mock.calls[2][1].p_bucket_hash,
    );
  });
  it("ignores spoofed forwarding headers and fails closed without Vercel ingress", async () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("SUPABASE_SUBMISSION_HMAC_SECRET", "x".repeat(40));
    mocks.rpc.mockResolvedValue({ data: true, error: null });
    const spoofed = new NextRequest(
      "https://www.quickkit.live/api/admin/auth/recovery",
      {
        headers: {
          "x-vercel-forwarded-for": "192.0.2.1",
          "x-forwarded-for": "203.0.113.12",
          "x-real-ip": "203.0.113.13",
        },
      },
    );
    await consumeRecoveryLimit(spoofed, "x@example.test");
    const first = mocks.rpc.mock.calls[0][1].p_bucket_hash;
    await consumeRecoveryLimit(request("192.0.2.1"), "x@example.test");
    expect(mocks.rpc.mock.calls[2][1].p_bucket_hash).toBe(first);
    const missing = new NextRequest(
      "https://www.quickkit.live/api/admin/auth/recovery",
      {
        headers: {
          "x-real-ip": "203.0.113.13",
          "x-forwarded-for": "203.0.113.12",
        },
      },
    );
    expect(await consumeRecoveryLimit(missing, "x@example.test")).toBe(
      "unavailable",
    );
    vi.stubEnv("VERCEL", "");
    vi.stubEnv("NODE_ENV", "production");
    expect(await consumeRecoveryLimit(spoofed, "x@example.test")).toBe(
      "unavailable",
    );
  });
});
