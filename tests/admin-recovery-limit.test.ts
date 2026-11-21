import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), enabled: true }));
vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdminClient: () => (mocks.enabled ? { rpc: mocks.rpc } : null),
}));
import {
  consumeRecoveryLimit,
  padRecoveryResponse,
} from "@/lib/supabase/recovery-limit";

const request = (ip?: string) =>
  new NextRequest("https://quickkit.live/api/admin/auth/recovery", {
    headers: ip ? { "x-real-ip": ip } : {},
  });
afterEach(() => {
  vi.resetAllMocks();
  vi.unstubAllEnvs();
  vi.useRealTimers();
  mocks.enabled = true;
});
describe("recovery abuse controls", () => {
  it("uses two deterministic, domain-separated hashed buckets and no raw identities", async () => {
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
  it("pads fast responses to a minimum baseline", async () => {
    vi.useFakeTimers();
    const start = performance.now();
    let done = false;
    const pending = padRecoveryResponse(start).then(() => {
      done = true;
    });
    await vi.advanceTimersByTimeAsync(1999);
    expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await pending;
    expect(done).toBe(true);
  });
});
