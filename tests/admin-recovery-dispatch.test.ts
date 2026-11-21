import { afterEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({
  tasks: [] as Array<() => Promise<void>>,
  jar: new Map<string, string>(),
}));
vi.mock("next/server", async (original) => ({
  ...(await original<typeof import("next/server")>()),
  after: (fn: () => Promise<void>) => state.tasks.push(fn),
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    getAll: () => Array.from(state.jar, ([name, value]) => ({ name, value })),
    set: (name: string, value: string) => state.jar.set(name, value),
  }),
}));
import { createRecoveryClient } from "@/lib/supabase/recovery";

afterEach(() => {
  state.tasks.length = 0;
  state.jar.clear();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
describe("deferred recovery dispatch", () => {
  it("creates PKCE state for both cases and dispatches only eligible email after response", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "test-public-key");
    const network = vi.fn(
      async () =>
        new Response("{}", {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    vi.stubGlobal("fetch", network);
    const eligible = await createRecoveryClient(true);
    const first = await eligible!.auth.resetPasswordForEmail(
      "owner@example.test",
      { redirectTo: "https://quickkit.live/auth/recovery" },
    );
    expect(first.error).toBeNull();
    expect(
      [...state.jar.keys()].some((key) => key.includes("code-verifier")),
    ).toBe(true);
    state.jar.clear();
    const ineligible = await createRecoveryClient(false);
    const second = await ineligible!.auth.resetPasswordForEmail(
      "other@example.test",
      { redirectTo: "https://quickkit.live/auth/recovery" },
    );
    expect(second.error).toBeNull();
    expect(
      [...state.jar.keys()].some((key) => key.includes("code-verifier")),
    ).toBe(true);
    expect(network).not.toHaveBeenCalled();
    expect(state.tasks).toHaveLength(2);
    await Promise.all(state.tasks.map((task) => task()));
    expect(network).toHaveBeenCalledTimes(1);
  });
});
