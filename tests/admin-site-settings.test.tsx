// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import AdminSiteSettings from "@/components/admin/admin-site-settings";

afterEach(() => vi.unstubAllGlobals());

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
    expect(entries).toHaveLength(8);
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
});
