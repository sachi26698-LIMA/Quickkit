import { afterEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

const mocks = vi.hoisted(() => ({ proof: "", rpc: vi.fn() }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => ({ value: mocks.proof }) }),
}));
vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdminClient: () => ({ rpc: mocks.rpc }),
}));
import {
  consumeRecoverySession,
  makeRecoveryProof,
} from "@/lib/supabase/recovery";
const client = {
  auth: {
    getUser: async () => ({
      data: { user: { id: "user", email: "owner@example.test" } },
      error: null,
    }),
    getSession: async () => ({
      data: {
        session: { access_token: "fixture-token", user: { id: "user" } },
      },
      error: null,
    }),
  },
} as unknown as SupabaseClient<Database>;
afterEach(() => {
  vi.resetAllMocks();
  vi.unstubAllEnvs();
  mocks.proof = "";
});
describe("recovery proof consumption", () => {
  it("rejects a replay and simultaneous calls if the atomic store permits only one", async () => {
    vi.stubEnv("SUPABASE_SUBMISSION_HMAC_SECRET", "x".repeat(40));
    vi.stubEnv("QUICKKIT_ADMIN_EMAILS", "owner@example.test");
    mocks.proof = makeRecoveryProof("fixture-token", "user");
    const seen = new Set<string>();
    mocks.rpc.mockImplementation(async (_name, args) => {
      const first = !seen.has(args.p_proof_hash);
      seen.add(args.p_proof_hash);
      return { data: first, error: null };
    });
    const outcomes = await Promise.all([
      consumeRecoverySession(client),
      consumeRecoverySession(client),
    ]);
    expect(outcomes.sort()).toEqual(["consumed", "invalid"]);
    expect(await consumeRecoverySession(client)).toBe("invalid");
    expect(JSON.stringify(mocks.rpc.mock.calls)).not.toContain("fixture-token");
    expect(JSON.stringify(mocks.rpc.mock.calls)).not.toContain(mocks.proof);
  });
  it("rejects expired proof before touching the store and fails closed on store errors", async () => {
    vi.stubEnv("SUPABASE_SUBMISSION_HMAC_SECRET", "x".repeat(40));
    vi.stubEnv("QUICKKIT_ADMIN_EMAILS", "owner@example.test");
    mocks.proof = makeRecoveryProof("fixture-token", "user", Date.now() - 1000);
    expect(await consumeRecoverySession(client)).toBe("invalid");
    expect(mocks.rpc).not.toHaveBeenCalled();
    mocks.proof = makeRecoveryProof("fixture-token", "user");
    mocks.rpc.mockResolvedValue({
      data: null,
      error: new Error("unavailable"),
    });
    expect(await consumeRecoverySession(client)).toBe("unavailable");
  });
});
