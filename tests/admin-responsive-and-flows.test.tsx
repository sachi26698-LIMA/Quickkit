// @vitest-environment jsdom
import { readFile } from "node:fs/promises";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { AdminConfirmDialog } from "@/components/admin/admin-confirm-dialog";
import AdminLoginForm from "@/components/admin/admin-login-form";
import { AdminOverviewLive } from "@/components/admin/admin-overview-live";
import {
  AdminIdentityContext,
  AdminShell,
} from "@/components/admin/admin-shell";
import type { OverviewConnectedSnapshot } from "@/lib/supabase/admin-data";

const routerMocks = vi.hoisted(() => ({
  replace: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
  pathname: "/admin",
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: routerMocks.replace,
    push: routerMocks.push,
    refresh: routerMocks.refresh,
  }),
  usePathname: () => routerMocks.pathname,
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  localStorage.clear();
});

const baseSnapshot: OverviewConnectedSnapshot = {
  connected: true,
  total_tools: 56,
  active_tools: 54,
  published_tools: 54,
  unpublished_tools: 2,
  featured_tools: 6,
  total_categories: 7,
  published_categories: 7,
  contact_count: 4,
  feedback_count: 5,
  new_contact_count: 2,
  new_feedback_count: 1,
  category_distribution: [
    { slug: "pdf-tools", name: "PDF Tools", count: 12, published: true },
    { slug: "image-tools", name: "Image Tools", count: 8, published: true },
  ],
  activity: [
    {
      id: 1,
      actor_email: "owner@example.test",
      action: "tool.updated",
      entity_type: "tool",
      entity_id: "merge-pdf",
      created_at: "2026-11-15T10:00:00.000Z",
    },
  ],
  health: {
    checked_at: "2026-11-15T10:05:00.000Z",
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
};

describe("Admin Login actionable setup & sign-in flow", () => {
  it("renders an actionable setup checklist without secrets and disables submit when unconfigured", () => {
    render(
      <AdminLoginForm
        message="Admin sign-in is unavailable until the owner configures the server-only QUICKKIT_ADMIN_EMAILS allowlist."
        disabled
        setupItems={[
          {
            name: "QUICKKIT_ADMIN_EMAILS",
            role: "Server-only owner email allowlist",
            present: false,
          },
          {
            name: "NEXT_PUBLIC_SUPABASE_URL",
            role: "Supabase project URL",
            present: true,
          },
        ]}
      />,
    );

    const checklist = screen.getByRole("region", {
      name: "Administrator setup checklist",
    });
    expect(checklist.textContent).toContain("Administrator setup required");
    expect(checklist.textContent).toContain("HTTP 503");
    expect(checklist.textContent).toContain("QUICKKIT_ADMIN_EMAILS");
    expect(checklist.textContent).toContain("Missing");
    expect(checklist.textContent).toContain("Configured");

    const submit = screen.getByRole("button", {
      name: /Sign-in unavailable until configured/i,
    });
    expect((submit as HTMLButtonElement).disabled).toBe(true);
  });

  it("submits credentials via same-origin POST, surfaces errors, and redirects to /admin on success", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: "Administrator sign-in failed." }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ ok: true }),
      });
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminLoginForm />);

    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "owner@example.test" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "wrong-pass" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /Sign in to Control Center/i }),
    );

    expect(
      await screen.findByText("Administrator sign-in failed."),
    ).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "valid-pass" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /Sign in to Control Center/i }),
    );

    await waitFor(() =>
      expect(routerMocks.replace).toHaveBeenCalledWith("/admin"),
    );
    expect(routerMocks.refresh).toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/auth/login",
      expect.objectContaining({
        method: "POST",
        credentials: "same-origin",
      }),
    );
  });
});

describe("Admin Dashboard stale-data & full refresh recovery lifecycle", () => {
  it("transitions Connected -> Stale on 503 -> Connected on Try again -> Offline -> Online recovery", async () => {
    const recovered: OverviewConnectedSnapshot = {
      ...baseSnapshot,
      published_tools: 55,
      unpublished_tools: 1,
      contact_count: 6,
    };
    const onlineRecovered: OverviewConnectedSnapshot = {
      ...recovered,
      contact_count: 7,
    };

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({ error: "Admin database tables are not ready." }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: recovered }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: onlineRecovered }),
      });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <AdminIdentityContext.Provider value="owner@example.test">
        <AdminOverviewLive initialSnapshot={baseSnapshot} />
      </AdminIdentityContext.Provider>,
    );

    // 1. Starts connected with verified values
    expect(screen.getByText("54")).toBeTruthy();

    // 2. Manual refresh hits 503 -> Stale warning banner preserves last verified totals
    fireEvent.click(
      within(
        screen.getByRole("region", { name: "Workspace status" }),
      ).getByRole("button", { name: "Refresh dashboard data" }),
    );
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Showing stale data");
    expect(alert.textContent).toContain("Admin database tables are not ready.");
    expect(screen.getByText("54")).toBeTruthy();

    // 3. Clicking "Try again" recovers to Connected with updated verified values
    fireEvent.click(within(alert).getByRole("button", { name: /Try again/i }));
    await waitFor(() =>
      expect(screen.queryByText("Showing stale data")).toBeNull(),
    );
    expect(screen.getByText("55")).toBeTruthy();
    expect(screen.getByText("6")).toBeTruthy();
    expect(
      within(
        screen.getByRole("region", { name: "Workspace status" }),
      ).getByText("Connected · periodic sync"),
    ).toBeTruthy();

    // 4. Browser goes offline -> Offline banner -> online restores automatically
    fireEvent(window, new Event("offline"));
    expect(await screen.findByText(/Browser is offline/i)).toBeTruthy();

    fireEvent(window, new Event("online"));
    await waitFor(() => expect(screen.getByText("7")).toBeTruthy());
    expect(screen.queryByText(/Browser is offline/i)).toBeNull();
  });
});

describe("Admin responsive shell navigation, dialogs, and CSS breakpoints", () => {
  it("opens and closes mobile drawer, toggles theme, and runs confirmation dialogs cleanly", async () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();

    render(
      <AdminShell email="owner@example.test">
        <div>Main workspace</div>
        <AdminConfirmDialog
          config={{
            title: "Delete submission",
            description: "This permanently removes the contact submission.",
            confirmLabel: "Delete record",
            onConfirm,
          }}
          onClose={onClose}
        />
      </AdminShell>,
    );

    // Mobile menu button toggles navigation drawer and Escape closes it
    const menuTrigger = screen.getByRole("button", {
      name: "Open navigation",
    });
    expect(menuTrigger.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(menuTrigger);
    expect(menuTrigger.getAttribute("aria-expanded")).toBe("true");
    expect(
      screen.getByRole("button", { name: "Close navigation" }),
    ).toBeTruthy();

    // Confirm dialog accessible contract
    const dialog = screen.getByRole("alertdialog");
    expect(dialog.textContent).toContain("Delete submission");
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Delete record" }),
    );
    expect(onConfirm).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("includes dedicated responsive media queries for mobile, tablet, and desktop layouts", async () => {
    const css = await readFile("components/admin/admin.module.css", "utf8");
    const mediaQueries = css.match(/@media\s*\([^)]+\)/g) ?? [];
    expect(mediaQueries.length).toBeGreaterThanOrEqual(4);
    // Desktop/laptop, tablet, mobile, and compact mobile breakpoints
    expect(css).toContain("@media (max-width: 1360px)");
    expect(css).toContain("@media (max-width: 1080px)");
    expect(css).toContain("@media (max-width: 820px)");
    expect(css).toContain("@media (max-width: 440px)");
    expect(css).toContain(".admin-mobile-menu");
    expect(css).toContain("content: attr(data-label)");
  });
});
