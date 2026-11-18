// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import AdminSiteSettings from "@/components/admin/admin-site-settings";
import "@testing-library/jest-dom/vitest";

vi.mock("next/navigation", () => {
  const router = { replace: () => {}, push: () => {} };
  return { useRouter: () => router };
});

afterEach(() => {
  // Unmount each render: every test in this file mounts the same panel, and a
  // leftover tree makes role queries ambiguous.
  cleanup();
  vi.unstubAllGlobals();
});

/**
 * The final save button. Once the form is dirty the unsaved-changes banner adds
 * its own "Save now", so an unscoped role query would be ambiguous.
 */
const saveButton = () =>
  screen.getByRole("button", { name: /Save website settings|Saving…/ });

describe("Master Admin public settings editor", () => {
  it("edits homepage content and safe link lists in the supported settings payload", async () => {
    let savedBody: {
      entries: { setting_key: string; setting_value: unknown }[];
    } | null = null;
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === "PATCH") {
        savedBody = JSON.parse(String(init.body));
        return { ok: true, json: async () => ({ ok: true }) };
      }
      return { ok: true, json: async () => ({ data: [] }) };
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<AdminSiteSettings />);

    fireEvent.change(await screen.findByLabelText("Homepage update title"), {
      target: { value: "New browser tools" },
    });
    fireEvent.change(screen.getByLabelText("Homepage update text"), {
      target: { value: "Fresh improvements are available." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add social link" }));
    fireEvent.change(screen.getByLabelText("social_links 1 label"), {
      target: { value: "Community" },
    });
    fireEvent.change(screen.getByLabelText("social_links 1 URL"), {
      target: { value: "https://example.test/community" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add footer link" }));
    fireEvent.change(screen.getByLabelText("footer_links 1 label"), {
      target: { value: "Documentation" },
    });
    fireEvent.change(screen.getByLabelText("footer_links 1 URL"), {
      target: { value: "https://docs.example.test" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Save website settings" }),
    );

    await waitFor(() => expect(savedBody).not.toBeNull());
    const entries = savedBody!.entries;
    expect(entries).toHaveLength(9);
    expect(
      entries.find((entry) => entry.setting_key === "homepage_content")
        ?.setting_value,
    ).toEqual({
      announcement_title: "New browser tools",
      announcement_body: "Fresh improvements are available.",
    });
    expect(
      entries.find((entry) => entry.setting_key === "social_links")
        ?.setting_value,
    ).toEqual([{ label: "Community", href: "https://example.test/community" }]);
    expect(
      entries.find((entry) => entry.setting_key === "footer_links")
        ?.setting_value,
    ).toEqual([{ label: "Documentation", href: "https://docs.example.test" }]);
  });

  it("lets the operator pick a social icon and clear it back to a text label", async () => {
    let savedBody: {
      entries: { setting_key: string; setting_value: unknown }[];
    } | null = null;
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === "PATCH") {
        savedBody = JSON.parse(String(init.body));
        return { ok: true, json: async () => ({ ok: true }) };
      }
      return { ok: true, json: async () => ({ data: [] }) };
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<AdminSiteSettings />);

    fireEvent.click(
      await screen.findByRole("button", { name: "Add social link" }),
    );
    fireEvent.change(screen.getByLabelText("social_links 1 label"), {
      target: { value: "Instagram" },
    });
    fireEvent.change(screen.getByLabelText("social_links 1 URL"), {
      target: { value: "https://instagram.com/quickkit" },
    });
    // The icon select only offers the fixed platform allowlist.
    const iconSelect = screen.getByLabelText("social_links 1 icon");
    const options = Array.from(
      (iconSelect as HTMLSelectElement).querySelectorAll("option"),
    ).map((option) => option.value);
    expect(options).toContain("instagram");
    expect(options[0]).toBe("");

    fireEvent.change(iconSelect, { target: { value: "instagram" } });
    fireEvent.click(saveButton());

    await waitFor(() => expect(savedBody).not.toBeNull());
    expect(
      savedBody!.entries.find((entry) => entry.setting_key === "social_links")
        ?.setting_value,
    ).toEqual([
      {
        label: "Instagram",
        href: "https://instagram.com/quickkit",
        icon: "instagram",
      },
    ]);

    // Choosing "no icon" drops the key entirely rather than storing "".
    fireEvent.change(screen.getByLabelText("social_links 1 icon"), {
      target: { value: "" },
    });
    savedBody = null;
    fireEvent.click(saveButton());
    await waitFor(() => expect(savedBody).not.toBeNull());
    expect(
      savedBody!.entries.find((entry) => entry.setting_key === "social_links")
        ?.setting_value,
    ).toEqual([{ label: "Instagram", href: "https://instagram.com/quickkit" }]);
  });

  it("edits the legal document date and keeps the display value in step", async () => {
    let savedBody: {
      entries: { setting_key: string; setting_value: unknown }[];
    } | null = null;
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === "PATCH") {
        savedBody = JSON.parse(String(init.body));
        return { ok: true, json: async () => ({ ok: true }) };
      }
      return { ok: true, json: async () => ({ data: [] }) };
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<AdminSiteSettings />);

    fireEvent.change(
      await screen.findByLabelText("Machine-readable date (YYYY-MM-DD)"),
      { target: { value: "2026-12-01" } },
    );
    expect(screen.getByLabelText("Displayed date")).toHaveValue(
      "1 December 2026",
    );

    fireEvent.click(saveButton());
    await waitFor(() => expect(savedBody).not.toBeNull());
    expect(
      savedBody!.entries.find((entry) => entry.setting_key === "legal_meta")
        ?.setting_value,
    ).toEqual({
      last_updated: "1 December 2026",
      last_updated_iso: "2026-12-01",
    });
  });
});
