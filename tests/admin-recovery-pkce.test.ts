import { afterEach, describe, expect, it, vi } from "vitest";
const jar = vi.hoisted(() => ({
  values: new Map<string, string>(),
  writes: [] as { name: string; options: Record<string, unknown> }[],
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    getAll: () => Array.from(jar.values, ([name, value]) => ({ name, value })),
    set: (name: string, value: string, options: Record<string, unknown>) => {
      jar.values.set(name, value);
      jar.writes.push({ name, options });
    },
  }),
}));
import { createRecoveryClient } from "@/lib/supabase/recovery";

afterEach(() => {
  jar.values.clear();
  jar.writes.length = 0;
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
describe("real Supabase SSR PKCE adapter", () => {
  it("stores the recovery verifier and session in HttpOnly cookies and emits recovery after exchange", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "test-public-key");
    const fakeFetch = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes("/recover"))
        return new Response("{}", {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      if (url.includes("/token?grant_type=pkce"))
        return new Response(
          JSON.stringify({
            access_token: "test-access-token",
            refresh_token: "test-refresh-token",
            expires_in: 3600,
            token_type: "bearer",
            user: {
              id: "fixture-user",
              email: "owner@example.test",
              aud: "authenticated",
              role: "authenticated",
              app_metadata: {},
              user_metadata: {},
              created_at: "2026-01-01T00:00:00Z",
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      throw new Error(`Unexpected test request ${url}`);
    });
    vi.stubGlobal("fetch", fakeFetch);
    const requestClient = await createRecoveryClient();
    expect(requestClient).not.toBeNull();
    const sent = await requestClient!.auth.resetPasswordForEmail(
      "owner@example.test",
      { redirectTo: "https://www.quickkit.live/auth/recovery" },
    );
    expect(sent.error).toBeNull();
    expect(
      jar.writes.some(
        (w) => w.name.includes("code-verifier") && w.options.httpOnly === true,
      ),
    ).toBe(true);
    const callbackClient = await createRecoveryClient();
    let recovery = false;
    const {
      data: { subscription },
    } = callbackClient!.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") recovery = true;
    });
    const result =
      await callbackClient!.auth.exchangeCodeForSession("fixture-code");
    subscription.unsubscribe();
    expect(result.error).toBeNull();
    expect(recovery).toBe(true);
    expect(
      jar.writes
        .filter((w) => w.name.includes("quickkit-recovery-session"))
        .every((w) => w.options.httpOnly === true),
    ).toBe(true);
  });
});
