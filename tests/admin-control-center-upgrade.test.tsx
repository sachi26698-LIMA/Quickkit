// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import {
  CategoryDonutChart,
  EntityBarList,
  OperationalTrendChart,
} from "@/components/admin/admin-charts";
import { AdminConfirmDialog } from "@/components/admin/admin-confirm-dialog";
import { AdminLiveProvider } from "@/components/admin/admin-live-context";
import { AdminOverviewLive } from "@/components/admin/admin-overview-live";
import {
  AdminIdentityContext,
  AdminShell,
} from "@/components/admin/admin-shell";
import SecurityOverview from "@/components/admin/security-overview";
import type { OverviewConnectedSnapshot } from "@/lib/supabase/admin-data";

const mockPush = vi.fn();
const mockReplace = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin",
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  localStorage.clear();
  mockPush.mockReset();
  mockReplace.mockReset();
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    value: "visible",
  });
});

function buildFullSnapshot(
  overrides: Partial<OverviewConnectedSnapshot> = {},
): OverviewConnectedSnapshot {
  const now = new Date("2026-11-15T12:00:00.000Z");
  const recentIso = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
  const olderIso = new Date(now.getTime() - 10 * 86_400_000).toISOString();

  return {
    connected: true,
    total_tools: 60,
    active_tools: 54,
    published_tools: 54,
    unpublished_tools: 6,
    featured_tools: 8,
    total_categories: 8,
    published_categories: 8,
    contact_count: 14,
    feedback_count: 9,
    new_contact_count: 3,
    new_feedback_count: 2,
    category_distribution: [
      { slug: "pdf-tools", name: "PDF Tools", count: 24 },
      { slug: "image-tools", name: "Image Tools", count: 20 },
      { slug: "text-tools", name: "Text Tools", count: 16 },
    ],
    activity: [
      {
        id: "act-1",
        actor_email: "owner@example.test",
        action: "update_tool",
        entity_type: "tool",
        entity_id: "merge-pdf",
        created_at: recentIso,
      },
      {
        id: "act-2",
        actor_email: "owner@example.test",
        action: "update_category",
        entity_type: "category",
        entity_id: "pdf-tools",
        created_at: olderIso,
      },
      {
        id: "act-3",
        actor_email: "owner@example.test",
        action: "update_site_settings",
        entity_type: "site_settings",
        entity_id: "homepage_update",
        created_at: recentIso,
      },
    ],
    period_comparison: {
      contacts_7d: 5,
      contacts_prev_7d: 2,
      feedback_7d: 4,
      feedback_prev_7d: 4,
      activity_7d: 9,
      activity_prev_7d: 3,
      has_contact_history: true,
      has_feedback_history: true,
      has_activity_history: true,
    },
    trends: {
      daily: [
        { date: "2026-11-13", contacts: 1, feedback: 2, activity: 3 },
        { date: "2026-11-14", contacts: 2, feedback: 1, activity: 4 },
        { date: "2026-11-15", contacts: 3, feedback: 2, activity: 5 },
      ],
      recent_entities: [
        {
          label: "merge-pdf",
          entity_type: "tool",
          entity_id: "merge-pdf",
          count: 5,
          last_at: recentIso,
        },
        {
          label: "homepage_update",
          entity_type: "site_settings",
          entity_id: "homepage_update",
          count: 2,
          last_at: recentIso,
        },
      ],
    },
    health: {
      checked_at: "2026-11-15T12:00:00.000Z",
      supabase_connected: true,
      auth_verified: true,
      allowlist_configured: true,
      analytics_url_present: false,
      analytics_token_present: false,
      sitemap_origin_configured: true,
      indexing_enabled: true,
      rls_verified_by_app: false,
      smtp_verified_by_app: false,
      error_monitoring_configured: false,
    },
    ...overrides,
  };
}

describe("Admin data visualization charts", () => {
  it("renders interactive CategoryDonutChart slices and updates active share on focus", () => {
    render(
      <CategoryDonutChart
        total={60}
        data={[
          { slug: "pdf-tools", name: "PDF Tools", count: 24 },
          { slug: "image-tools", name: "Image Tools", count: 36 },
        ]}
      />,
    );
    expect(
      screen.getByRole("img", {
        name: "Tool distribution across 2 categories totaling 60 tools",
      }),
    ).toBeTruthy();
    expect(screen.getByText("100%")).toBeTruthy();
    expect(screen.getByText("60 total")).toBeTruthy();

    fireEvent.focus(screen.getByRole("button", { name: /PDF Tools/i }));
    expect(screen.getAllByText("40%").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("24 tools")).toBeTruthy();
  });

  it("renders OperationalTrendChart with accessible interactive points", () => {
    render(
      <OperationalTrendChart
        points={[
          { date: "2026-11-14", value: 2, secondaryValue: 1 },
          { date: "2026-11-15", value: 4, secondaryValue: 2 },
        ]}
        primaryLabel="Contact submissions"
        secondaryLabel="Feedback"
        ariaLabel="14-day submission trend"
      />,
    );
    expect(
      screen.getByRole("img", { name: "14-day submission trend" }),
    ).toBeTruthy();
    const pointBtn = screen.getByRole("button", {
      name: /Nov 15: 4 Contact submissions, 2 Feedback/i,
    });
    fireEvent.focus(pointBtn);
    expect(screen.getByText(/4 Contact submissions/i)).toBeTruthy();
  });

  it("renders EntityBarList with proportional persisted counts", () => {
    render(
      <EntityBarList
        items={[
          { label: "merge-pdf", subtitle: "tool", count: 5 },
          { label: "compress-pdf", subtitle: "tool", count: 2 },
        ]}
      />,
    );
    expect(screen.getByText("merge-pdf")).toBeTruthy();
    expect(
      screen.getByRole("img", { name: "merge-pdf: 5 recorded events" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("img", { name: "compress-pdf: 2 recorded events" }),
    ).toBeTruthy();
  });
});

describe("AdminConfirmDialog accessibility and safety", () => {
  it("focuses Cancel safely, dismisses on Escape, and runs onConfirm when confirmed", async () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(
      <AdminConfirmDialog
        config={{
          title: "Delete submission?",
          description: "This action permanently removes the record.",
          confirmLabel: "Delete permanently",
          targetLabel: "sub-42",
          tone: "danger",
          onConfirm,
        }}
        onClose={onClose}
      />,
    );

    const dialog = screen.getByRole("alertdialog");
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(screen.getByText("sub-42")).toBeTruthy();
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Cancel" }),
    );

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Delete permanently" }));
    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
  });
});

describe("AdminOverviewLive advanced live-sync, filtering, health, and customization", () => {
  it("persists refresh interval, pauses when tab is hidden, and syncs on tab visibility restoration", async () => {
    vi.useFakeTimers();
    const snap = buildFullSnapshot();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: snap }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <AdminLiveProvider>
        <AdminIdentityContext.Provider value="owner@example.test">
          <AdminOverviewLive initialSnapshot={snap} />
        </AdminIdentityContext.Provider>
      </AdminLiveProvider>,
    );

    // Switch interval to 30s
    const intervalSelect = screen.getByLabelText("Overview refresh interval");
    fireEvent.change(intervalSelect, { target: { value: "30000" } });
    expect(localStorage.getItem("quickkit-admin-refresh-interval")).toBe(
      "30000",
    );

    // Hide the tab and advance 65 seconds — should NOT poll while hidden
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "hidden",
    });
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await act(async () => {
      vi.advanceTimersByTime(65_000);
    });
    expect(fetchMock).not.toHaveBeenCalled();

    // Restore visibility — should immediately trigger a verified sync
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
      await Promise.resolve();
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/overview",
      expect.objectContaining({
        cache: "no-store",
        credentials: "same-origin",
      }),
    );
  });

  it("prevents overlapping refresh calls when a request is already in flight", async () => {
    const snap = buildFullSnapshot();
    let resolveFetch: ((value: unknown) => void) | null = null;
    const fetchMock = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <AdminLiveProvider>
        <AdminIdentityContext.Provider value="owner@example.test">
          <AdminOverviewLive initialSnapshot={snap} />
        </AdminIdentityContext.Provider>
      </AdminLiveProvider>,
    );

    const refreshBtn = within(
      screen.getByRole("region", { name: "Workspace status" }),
    ).getByRole("button", { name: "Refresh dashboard data" });

    fireEvent.click(refreshBtn);
    fireEvent.click(refreshBtn);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveFetch?.({
        ok: true,
        status: 200,
        json: async () => ({ data: snap }),
      });
      await Promise.resolve();
    });
  });

  it("filters persisted activity by query and event type", () => {
    const snap = buildFullSnapshot();
    render(
      <AdminLiveProvider>
        <AdminIdentityContext.Provider value="owner@example.test">
          <AdminOverviewLive initialSnapshot={snap} />
        </AdminIdentityContext.Provider>
      </AdminLiveProvider>,
    );

    expect(screen.getByText(/— merge-pdf/)).toBeTruthy();
    expect(screen.getByText(/— pdf-tools/)).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Filter activity by event type"), {
      target: { value: "setting" },
    });
    expect(screen.getByText(/— homepage_update/)).toBeTruthy();
    expect(screen.queryByText(/— merge-pdf/)).toBeNull();

    fireEvent.change(screen.getByLabelText("Filter activity by event type"), {
      target: { value: "all" },
    });
    fireEvent.change(screen.getByLabelText("Search recent activity"), {
      target: { value: "merge-pdf" },
    });
    expect(screen.getByText(/— merge-pdf/)).toBeTruthy();
    expect(screen.queryByText(/— homepage_update/)).toBeNull();
  });

  it("renders truthful 9-item System Health Command Center, real 7d delta, and runs full verification check", async () => {
    const snap = buildFullSnapshot();
    const fetchMock = vi.fn(async (url: string) => {
      if (url === "/api/admin/security") {
        return {
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
              rls_status: "Verify in Supabase SQL / dashboard",
              signup_disabled: null,
              checked_at: "2026-11-15T12:05:00.000Z",
            },
          }),
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ data: snap }),
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <AdminLiveProvider>
        <AdminIdentityContext.Provider value="owner@example.test">
          <AdminOverviewLive initialSnapshot={snap} />
        </AdminIdentityContext.Provider>
      </AdminLiveProvider>,
    );

    // Must be truthful about external / unconfigured services. The app cannot
    // introspect pg_policies from the service-role client, so RLS stays an
    // explicit OWNER ACTION rather than a green tick it cannot justify, and
    // SMTP is reported as NOT CONFIGURED because nothing here probes delivery.
    expect(screen.getByText("Owner action required")).toBeTruthy();
    expect(screen.getByText("NOT CONFIGURED")).toBeTruthy();
    expect(screen.getAllByText("Not configured").length).toBeGreaterThanOrEqual(
      2,
    );

    // Real 7d comparison delta appears because period_comparison is supplied
    expect(screen.getByText("+3 vs prior 7d")).toBeTruthy();

    // Switch bottom trend tab to Visitors to verify honest empty state
    fireEvent.click(screen.getByRole("tab", { name: "Visitors" }));
    expect(
      screen.getByText("Visitor usage analytics not connected"),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Run full check/i }));
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/admin/security",
        expect.objectContaining({ credentials: "same-origin" }),
      );
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/admin/overview",
        expect.objectContaining({ credentials: "same-origin" }),
      );
    });
  });

  it("supports widget personalization dialog and restores defaults cleanly", () => {
    const snap = buildFullSnapshot();
    render(
      <AdminLiveProvider>
        <AdminIdentityContext.Provider value="owner@example.test">
          <AdminOverviewLive initialSnapshot={snap} />
        </AdminIdentityContext.Provider>
      </AdminLiveProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: /Customize/i }));
    const dialog = screen.getByRole("dialog", { name: "Dashboard layout" });
    expect(dialog).toBeTruthy();

    const hideQuickActions = within(dialog).getByRole("button", {
      name: "Hide Quick actions",
    });
    fireEvent.click(hideQuickActions);
    expect(screen.queryByRole("heading", { name: "Quick actions" })).toBeNull();

    fireEvent.click(
      within(dialog).getByRole("button", { name: /Restore defaults/i }),
    );
    expect(screen.getByRole("heading", { name: "Quick actions" })).toBeTruthy();
  });
});

describe("AdminShell header controls, notification center, and cadence menu", () => {
  it("shows verified inbox badges, opens notification center, and persists cadence preference", () => {
    render(
      <AdminShell
        email="owner@example.test"
        initialBadges={{
          submissions: 4,
          feedback: 2,
          recentActivity: [
            {
              id: "n-1",
              actor_email: "owner@example.test",
              action: "update_tool",
              entity_type: "tool",
              entity_id: "merge-pdf",
              created_at: "2026-11-15T11:55:00.000Z",
            },
          ],
        }}
      >
        <div>Body</div>
      </AdminShell>,
    );

    // Notification center popover
    fireEvent.click(
      screen.getByRole("button", { name: "Open notification center" }),
    );
    const popover = screen.getByRole("dialog", {
      name: "Notification center",
    });
    expect(within(popover).getByText("4")).toBeTruthy();
    expect(within(popover).getByText("2")).toBeTruthy();
    expect(within(popover).getByText("update tool")).toBeTruthy();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(
      screen.queryByRole("dialog", { name: "Notification center" }),
    ).toBeNull();

    // Auto-refresh cadence menu
    fireEvent.click(
      screen.getByRole("button", { name: "Auto-refresh interval" }),
    );
    const menu = screen.getByRole("menu", { name: "Auto-refresh schedule" });
    fireEvent.click(
      within(menu).getByRole("menuitemradio", { name: /Every 2 minutes/i }),
    );
    expect(localStorage.getItem("quickkit-admin-refresh-interval")).toBe(
      "120000",
    );
  });
});

describe("SecurityOverview honest checks and secret-safety", () => {
  it("renders verified security boundary cards and supports re-run checks", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
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
          rls_status: "Verify in Supabase SQL / dashboard",
          signup_disabled: null,
          checked_at: "2026-11-15T12:10:00.000Z",
          analytics_url_present: true,
          analytics_token_present: false,
          sitemap_origin_configured: true,
          indexing_enabled: true,
          smtp_status:
            "Managed externally in Supabase Auth · not verified by app",
          error_monitoring_status: "Not configured",
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <AdminLiveProvider>
        <SecurityOverview />
      </AdminLiveProvider>,
    );

    expect(await screen.findByText("owner@example.test")).toBeTruthy();
    expect(screen.getByText("Configured (server-only)")).toBeTruthy();
    expect(screen.getByText("Connected")).toBeTruthy();
    expect(screen.getByText("Present on server (value hidden)")).toBeTruthy();
    expect(
      screen.getByText(
        "Managed externally in Supabase Auth · not verified by app",
      ),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Re-run checks/i }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });
});

describe("WCAG 2.1 AA design-system color contrast verification", () => {
  function relativeLuminance(hex: string) {
    const num = Number.parseInt(hex.replace("#", ""), 16);
    const rgb = [(num >> 16) & 255, (num >> 8) & 255, num & 255].map((c) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  }

  function contrastRatio(fg: string, bg: string) {
    const l1 = relativeLuminance(fg);
    const l2 = relativeLuminance(bg);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  }

  it("ensures every Light and Dark Admin foreground/background token pair meets WCAG 2.1 AA (>= 4.5:1)", () => {
    const pairs: [string, string, string][] = [
      ["Light primary ink on card", "#241638", "#FFFFFF"],
      ["Light primary ink on canvas", "#241638", "#F7F5FC"],
      ["Light soft ink on card", "#4C3F63", "#FFFFFF"],
      ["Light muted ink on card", "#685F7A", "#FFFFFF"],
      ["Light muted ink on canvas", "#685F7A", "#F7F5FC"],
      ["Light violet accent on card", "#7828D8", "#FFFFFF"],
      ["Light primary button label", "#FFFFFF", "#7828D8"],
      ["Light status good badge", "#0F6F6D", "#E7F8F6"],
      ["Light status warn badge", "#8A4B0F", "#FFF5E8"],
      ["Light status danger badge", "#96193C", "#FFF0F4"],
      ["Sidebar primary label on deep plum", "#FFFFFF", "#27103F"],
      ["Dark primary ink on dark card", "#F6F2FC", "#1D1130"],
      ["Dark primary ink on dark canvas", "#F6F2FC", "#12091E"],
      ["Dark soft ink on dark card", "#DCD4EA", "#1D1130"],
      ["Dark muted ink on dark card", "#B8AECB", "#1D1130"],
      ["Dark muted ink on dark canvas", "#B8AECB", "#12091E"],
      ["Dark cyan link on dark card", "#35C6D0", "#1D1130"],
    ];

    for (const [label, fg, bg] of pairs) {
      expect(
        contrastRatio(fg, bg),
        `${label} (${fg} on ${bg})`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });
});
