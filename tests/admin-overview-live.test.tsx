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
import { AdminIdentityContext } from "@/components/admin/admin-shell";
import { AdminOverviewLive } from "@/components/admin/admin-overview-live";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
});

const snapshot = {
  connected: true as const,
  total_tools: 56,
  active_tools: 56,
  published_tools: 56,
  unpublished_tools: 0,
  total_categories: 8,
  published_categories: 8,
  contact_count: 3,
  feedback_count: 2,
  category_distribution: [{ slug: "pdf-tools", name: "PDF Tools", count: 12 }],
  activity: [],
};

function renderDashboard() {
  return render(
    <AdminIdentityContext.Provider value="owner@example.test">
      <AdminOverviewLive initialSnapshot={snapshot} />
    </AdminIdentityContext.Provider>,
  );
}

describe("Admin executive dashboard refresh", () => {
  it("shows actual supplied totals and labels polling honestly instead of claiming realtime", () => {
    renderDashboard();
    expect(screen.getByText("56")).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();
    expect(
      within(
        screen.getByRole("region", { name: "Workspace status" }),
      ).getByText("Connected · periodic sync"),
    ).toBeTruthy();
    expect(screen.queryByText(/\bLIVE\b/i)).toBeNull();
    expect(screen.getAllByText("Not available").length).toBeGreaterThan(0);
    expect(
      screen.getByText(
        /No verified first-party visitor analytics are configured/,
      ),
    ).toBeTruthy();
  });

  it("refreshes through the authorized Admin endpoint and renders returned values", async () => {
    const updated = { ...snapshot, published_tools: 55, unpublished_tools: 1 };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: updated }),
    });
    vi.stubGlobal("fetch", fetchMock);
    renderDashboard();

    fireEvent.click(
      within(
        screen.getByRole("region", { name: "Workspace status" }),
      ).getByRole("button", { name: "Refresh dashboard data" }),
    );
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/admin/overview",
        expect.objectContaining({
          credentials: "same-origin",
          cache: "no-store",
        }),
      ),
    );
    await waitFor(() => expect(screen.getByText("55")).toBeTruthy());
    expect(screen.getByText("1")).toBeTruthy();
  });

  it("keeps the last verified values and warns that they are stale after a failed refresh", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => ({ error: "Unavailable" }),
      }),
    );
    renderDashboard();

    fireEvent.click(
      within(
        screen.getByRole("region", { name: "Workspace status" }),
      ).getByRole("button", { name: "Refresh dashboard data" }),
    );
    expect(await screen.findByText("Showing stale data")).toBeTruthy();
    expect(screen.getByText("56")).toBeTruthy();
    expect(screen.getByText("Unavailable")).toBeTruthy();
  });
});
