// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { AdminLiveProvider } from "@/components/admin/admin-live-context";
import { AdminOverviewLive } from "@/components/admin/admin-overview-live";
import { AdminIdentityContext } from "@/components/admin/admin-shell";
import SecurityOverview from "@/components/admin/security-overview";
import {
  reportClientError,
  resetClientErrorReports,
} from "@/lib/monitoring/client-report";
import type { SystemHealthReport } from "@/lib/system-health";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
  resetClientErrorReports();
});

function systemReport(
  overrides: Partial<SystemHealthReport> = {},
): SystemHealthReport {
  return {
    checked_at: "2026-11-16T06:00:00.000Z",
    rls: { status: "verified", tables: 15, unprotected: [], anon_readable: [] },
    smtp: {
      auth_reachable: true,
      email_sign_in: true,
      signup_disabled: true,
      verified_on: "2026-11-16",
    },
    sitemap: {
      status: "reachable",
      urls: 142,
      robots: "allows",
      robots_lists_sitemap: true,
      indexing_enabled: true,
      checked_at: "2026-11-16T06:00:00.000Z",
    },
    analytics: {
      backend: "supabase",
      ready: true,
      visitors: 7,
      online: 1,
      since: "2026-11-16T05:00:00+00:00",
    },
    error_monitoring: {
      enabled: true,
      store_ready: true,
      configured: true,
      errors_24h: 0,
      errors_7d: 0,
      last_error_at: null,
    },
    ...overrides,
  };
}

function snapshot(system?: SystemHealthReport) {
  return {
    connected: true as const,
    total_tools: 56,
    active_tools: 56,
    published_tools: 56,
    unpublished_tools: 0,
    total_categories: 8,
    published_categories: 8,
    contact_count: 3,
    feedback_count: 2,
    category_distribution: [
      { slug: "pdf-tools", name: "PDF Tools", count: 12 },
    ],
    activity: [],
    health: {
      checked_at: "2026-11-16T06:00:00.000Z",
      supabase_connected: true,
      auth_verified: true,
      allowlist_configured: true,
      analytics_url_present: false,
      analytics_token_present: false,
      sitemap_origin_configured: true,
      indexing_enabled: true,
      rls_verified_by_app: Boolean(system),
      smtp_verified_by_app: Boolean(system),
      error_monitoring_configured: Boolean(system),
      ...(system ? { system } : {}),
    },
  };
}

function healthRow(label: string) {
  const panel = screen
    .getByRole("heading", { name: "System health" })
    .closest("section") as HTMLElement;
  const row = within(panel).getByText(label).closest("li") as HTMLElement;
  return {
    value: row.querySelector("strong") as HTMLElement,
    dot: row.querySelector("i") as HTMLElement,
    detail: row.querySelector("small") as HTMLElement,
  };
}

function renderOverview(system?: SystemHealthReport) {
  return render(
    <AdminIdentityContext.Provider value="owner@example.test">
      <AdminOverviewLive initialSnapshot={snapshot(system)} />
    </AdminIdentityContext.Provider>,
  );
}

describe("System health panel", () => {
  it("shows each service as connected when the server's probes confirmed it", () => {
    renderOverview(systemReport());
    const expected: [string, string][] = [
      ["RLS verification", "Verified · 15 tables"],
      ["SMTP configuration", "Confirmed · 2026-11-16"],
      ["Sitemap verification", "Reachable · 142 URLs"],
      ["Analytics integration", "Connected · 7 visitors"],
      ["Error monitoring", "Connected · no errors in 24h"],
    ];
    for (const [label, value] of expected) {
      const row = healthRow(label);
      expect(row.value.textContent).toBe(value);
      expect(row.value.className).toContain("good");
      expect(row.dot.className).toContain("good");
    }
  });

  it("does not turn a row green without a report from the server", () => {
    renderOverview();
    for (const label of [
      "RLS verification",
      "SMTP configuration",
      "Sitemap verification",
      "Analytics integration",
      "Error monitoring",
    ])
      expect(healthRow(label).value.className).not.toContain("good");
    expect(healthRow("RLS verification").value.textContent).toBe(
      "Verification required",
    );
  });

  it("shows problems in red or amber with the affected table named", () => {
    renderOverview(
      systemReport({
        rls: {
          status: "issues",
          tables: 15,
          unprotected: ["quickkit_new_table"],
          anon_readable: [],
        },
        sitemap: {
          status: "unreachable",
          urls: 0,
          robots: "unreachable",
          robots_lists_sitemap: false,
          indexing_enabled: true,
          checked_at: "2026-11-16T06:00:00.000Z",
        },
        error_monitoring: {
          enabled: true,
          store_ready: true,
          configured: true,
          errors_24h: 3,
          errors_7d: 5,
          last_error_at: "2026-11-16T05:30:00+00:00",
        },
      }),
    );
    const rls = healthRow("RLS verification");
    expect(rls.value.textContent).toBe("Needs attention");
    expect(rls.value.className).toContain("error");
    expect(rls.detail.textContent).toContain("quickkit_new_table");
    expect(healthRow("Sitemap verification").value.className).toContain(
      "error",
    );
    const errors = healthRow("Error monitoring");
    expect(errors.value.textContent).toBe("3 errors in 24h");
    expect(errors.value.className).toContain("warn");
  });

  it("replaces the rows with the fresh report from Run full check", async () => {
    const fresh = systemReport({
      checked_at: "2026-11-16T06:10:00.000Z",
      sitemap: {
        status: "reachable",
        urls: 150,
        robots: "allows",
        robots_lists_sitemap: true,
        indexing_enabled: true,
        checked_at: "2026-11-16T06:10:00.000Z",
      },
    });
    const stale = systemReport({
      sitemap: {
        status: "unreachable",
        urls: 0,
        robots: "unreachable",
        robots_lists_sitemap: false,
        indexing_enabled: true,
        checked_at: "2026-11-16T06:00:00.000Z",
      },
    });
    const fetchMock = vi.fn(async (url: string) => ({
      ok: true,
      status: 200,
      json: async () =>
        url === "/api/admin/security"
          ? { data: { system: fresh } }
          : { data: snapshot(stale) },
    }));
    vi.stubGlobal("fetch", fetchMock);
    renderOverview(stale);
    expect(healthRow("Sitemap verification").value.textContent).toBe(
      "Unreachable",
    );
    fireEvent.click(screen.getByRole("button", { name: "Run full check" }));
    await waitFor(() =>
      expect(healthRow("Sitemap verification").value.textContent).toBe(
        "Reachable · 150 URLs",
      ),
    );
    expect(
      fetchMock.mock.calls.some(([url]) => url === "/api/admin/security"),
    ).toBe(true);
  });
});

describe("Security page service checks", () => {
  it("shows probe results and the recent error list", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          data: {
            email: "owner@example.test",
            allowlist_configured: true,
            supabase_configured: true,
            service_role_configured: true,
            database_status: "Connected",
            submission_hmac_configured: true,
            rls_status: "Verified · 15 tables protected",
            signup_disabled: true,
            checked_at: "2026-11-16T06:00:00.000Z",
            system: systemReport({
              error_monitoring: {
                enabled: true,
                store_ready: true,
                configured: true,
                errors_24h: 1,
                errors_7d: 1,
                last_error_at: "2026-11-16T05:30:00+00:00",
              },
            }),
            recent_errors: [
              {
                id: "e1",
                created_at: "2026-11-16T05:30:00+00:00",
                scope: "client:admin /admin/tools",
                name: "TypeError",
                message: "Cannot read properties of undefined",
              },
            ],
          },
        }),
      }),
    );
    render(
      <AdminLiveProvider>
        <SecurityOverview />
      </AdminLiveProvider>,
    );
    expect(await screen.findByText("Verified · 15 tables")).toBeTruthy();
    expect(screen.getByText("Confirmed · 2026-11-16")).toBeTruthy();
    expect(screen.getByText("Reachable · 142 URLs")).toBeTruthy();
    expect(screen.getByText("Connected · 7 visitors")).toBeTruthy();
    expect(screen.getByText("1 error in 24h")).toBeTruthy();
    const errors = screen
      .getByRole("heading", { name: "Recent application errors" })
      .closest("section") as HTMLElement;
    expect(within(errors).getByText("TypeError")).toBeTruthy();
    expect(
      within(errors).getByText("Cannot read properties of undefined"),
    ).toBeTruthy();
    expect(
      within(errors).getByText(/client:admin \/admin\/tools/),
    ).toBeTruthy();
  });
});

describe("reportClientError", () => {
  function captured() {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 204 });
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  }

  it("sends a scrubbed summary once per error, without the stack", () => {
    const fetchMock = captured();
    const error = Object.assign(
      new Error("Failed for owner@example.com?token=abc123"),
      { digest: "55" },
    );
    reportClientError(error, "admin");
    reportClientError(error, "admin");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/error-report");
    expect(init.method).toBe("POST");
    expect(init.keepalive).toBe(true);
    const body = JSON.parse(init.body);
    expect(Object.keys(body).sort()).toEqual([
      "digest",
      "message",
      "name",
      "path",
      "scope",
    ]);
    expect(body.scope).toBe("admin");
    expect(body.name).toBe("Error");
    expect(body.digest).toBe("55");
    expect(body.message).not.toContain("owner@example.com");
    expect(init.body).not.toContain("at ");
    expect(body.path).toBe(window.location.pathname);
  });

  it("omits the message for tool pages and stops after five reports", () => {
    const fetchMock = captured();
    reportClientError(new Error("my private text"), "tools", {
      includeMessage: false,
    });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.message).toBeUndefined();
    expect(fetchMock.mock.calls[0][1].body).not.toContain("private");
    for (let index = 0; index < 10; index += 1)
      reportClientError(new Error(`e${index}`), "global");
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });

  it("never throws when the network or fetch itself fails", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => {
        throw new Error("blocked");
      }),
    );
    expect(() => reportClientError(new Error("x"), "global")).not.toThrow();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    expect(() => reportClientError("plain string", "global")).not.toThrow();
  });
});
