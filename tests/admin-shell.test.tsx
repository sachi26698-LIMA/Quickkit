// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { AdminShell } from "@/components/admin/admin-shell";

const { push: mockPush, replace: mockReplace } = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/admin",
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});

beforeEach(() => {
  mockPush.mockClear();
  mockReplace.mockClear();
});

describe("Admin control center shell", () => {
  it("opens the command search with the keyboard shortcut and navigates to a match", async () => {
    render(
      <AdminShell email="owner@example.test">
        <p>Protected view</p>
      </AdminShell>,
    );
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    const search = await screen.findByRole("textbox", { name: "Search pages" });
    fireEvent.change(search, { target: { value: "tools" } });
    fireEvent.click(screen.getByRole("option"));
    expect(mockPush).toHaveBeenCalledWith("/admin/tools");
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Admin command search" }),
      ).toBeNull(),
    );
  });

  it("persists sidebar collapse and Admin-only dark theme preferences", async () => {
    const { container } = render(
      <AdminShell email="owner@example.test">
        <p>Protected view</p>
      </AdminShell>,
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Collapse sidebar" }),
      ).toBeTruthy(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Collapse sidebar" }));
    expect(localStorage.getItem("quickkit-admin-sidebar")).toBe("collapsed");
    fireEvent.click(
      screen.getByRole("button", { name: "Switch to dark theme" }),
    );
    expect(localStorage.getItem("quickkit-admin-theme")).toBe("dark");
    expect(
      container.querySelector("[data-theme]")?.getAttribute("data-theme"),
    ).toBe("dark");
    expect(
      container
        .querySelector("[data-collapsed]")
        ?.getAttribute("data-collapsed"),
    ).toBe("true");
  });

  it("opens a touch-friendly mobile navigation drawer and closes it with Escape", async () => {
    render(
      <AdminShell email="owner@example.test">
        <p>Protected view</p>
      </AdminShell>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Open navigation" }));
    expect(
      screen.getByRole("button", { name: "Close navigation" }),
    ).toBeTruthy();
    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: "Close navigation" }),
      ).toBeNull(),
    );
  });
});
