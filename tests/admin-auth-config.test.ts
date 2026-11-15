import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  publicConfig: vi.fn(),
  serverClient: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/config", () => ({
  getSupabasePublicConfig: mocks.publicConfig,
}));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: mocks.serverClient,
}));

import {
  getAdminEmailAllowlist,
  verifyAdminSession,
} from "@/lib/supabase/admin-auth";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("Admin auth configuration diagnosis", () => {
  it("identifies a missing owner allowlist before touching Supabase", async () => {
    vi.stubEnv("QUICKKIT_ADMIN_EMAILS", "");
    expect(await verifyAdminSession()).toEqual({
      status: "allowlist_not_configured",
    });
    expect(mocks.publicConfig).not.toHaveBeenCalled();
    expect(mocks.serverClient).not.toHaveBeenCalled();
  });

  it("identifies missing public Supabase connection settings separately", async () => {
    vi.stubEnv("QUICKKIT_ADMIN_EMAILS", "owner@example.test");
    mocks.publicConfig.mockReturnValue(null);
    expect(await verifyAdminSession()).toEqual({
      status: "supabase_not_configured",
    });
    expect(mocks.serverClient).not.toHaveBeenCalled();
  });

  it("normalizes the owner allowlist without accepting malformed addresses", () => {
    vi.stubEnv(
      "QUICKKIT_ADMIN_EMAILS",
      " OWNER@EXAMPLE.TEST ; not-an-email,second@example.test ",
    );
    expect([...getAdminEmailAllowlist()]).toEqual([
      "owner@example.test",
      "second@example.test",
    ]);
  });
});
