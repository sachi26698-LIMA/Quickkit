import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  createServer: vi.fn(),
  exchange: vi.fn(),
  getUser: vi.fn(),
  signOut: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: mocks.createServer,
}));
import { GET } from "@/app/auth/callback/route";
afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

function client() {
  return {
    auth: {
      exchangeCodeForSession: mocks.exchange,
      getUser: mocks.getUser,
      signOut: mocks.signOut,
    },
  };
}

describe("administrator auth callback", () => {
  it("redirects to admin login when Supabase is not configured", async () => {
    mocks.createServer.mockResolvedValueOnce(null);
    const response = await GET(
      new NextRequest(
        "https://quickkit.example/auth/callback?code=one-time-code",
      ),
    );
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/admin/login");
  });

  it("allows an allowlisted admin and refuses an external redirect", async () => {
    vi.stubEnv("QUICKKIT_ADMIN_EMAILS", "admin@example.com");
    mocks.exchange.mockResolvedValueOnce({ error: null });
    mocks.getUser.mockResolvedValueOnce({
      data: { user: { email: "admin@example.com" } },
      error: null,
    });
    mocks.createServer.mockResolvedValueOnce(client());
    const response = await GET(
      new NextRequest(
        "https://quickkit.example/auth/callback?code=one-time-code&next=%2F%2Fevil.example",
      ),
    );
    expect(mocks.exchange).toHaveBeenCalledWith("one-time-code");
    expect(response.headers.get("location")).toBe(
      "https://quickkit.example/admin",
    );
  });

  it("signs out a non-allowlisted account and sends it to admin login", async () => {
    vi.stubEnv("QUICKKIT_ADMIN_EMAILS", "admin@example.com");
    mocks.getUser.mockResolvedValueOnce({
      data: { user: { email: "visitor@example.com" } },
      error: null,
    });
    mocks.createServer.mockResolvedValueOnce(client());
    const response = await GET(
      new NextRequest("https://quickkit.example/auth/callback"),
    );
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(response.headers.get("location")).toContain(
      "/admin/login?reason=forbidden",
    );
  });

  it("rejects invalid exchange codes", async () => {
    mocks.exchange.mockResolvedValueOnce({ error: new Error("expired") });
    mocks.createServer.mockResolvedValueOnce(client());
    const response = await GET(
      new NextRequest("https://quickkit.example/auth/callback?code=expired"),
    );
    expect(response.headers.get("location")).toContain(
      "/admin/login?reason=invalid-link",
    );
  });
});
