// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import AdminResourceTable from "@/components/admin/admin-resource-table";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("Admin catalog CRUD controls", () => {
  it("creates a custom category through the persisted category API", async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === "POST")
        return { ok: true, status: 201, json: async () => ({ created: true }) };
      return { ok: true, json: async () => ({ data: [] }) };
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<AdminResourceTable kind="categories" />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Add custom category" }),
    );
    fireEvent.change(screen.getByLabelText(/URL slug/), {
      target: { value: "document-lab" },
    });
    fireEvent.change(screen.getByLabelText("Category name"), {
      target: { value: "Document Lab" },
    });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "A collection for document utilities." },
    });
    fireEvent.change(screen.getByLabelText("SEO title"), {
      target: { value: "Document Lab tools" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      const createCall = fetchMock.mock.calls.find(
        ([, init]) => init?.method === "POST",
      );
      expect(createCall).toBeDefined();
      expect(JSON.parse(String(createCall?.[1]?.body))).toMatchObject({
        slug: "document-lab",
        name: "Document Lab",
        is_published: false,
      });
    });
  });

  it("archives an existing tool by disabling and unpublishing it without deleting its record", async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === "PATCH")
        return { ok: true, json: async () => ({ ok: true }) };
      return {
        ok: true,
        json: async () => ({
          data: [
            {
              slug: "merge-pdf",
              name: "Merge PDF",
              description: "Combine PDFs.",
              category: "PDF Tools",
              icon: "pdf",
              is_published: true,
              is_enabled: true,
              is_featured: false,
              seo_title: "Merge PDF",
              seo_description: "Combine PDFs locally.",
              canonical_path: "/tools/merge-pdf",
              is_indexable: true,
              route: "/tools/merge-pdf",
            },
          ],
        }),
      };
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal(
      "confirm",
      vi.fn(() => true),
    );
    render(<AdminResourceTable kind="tools" />);
    await screen.findAllByText("Merge PDF");
    fireEvent.click(screen.getByRole("button", { name: "Archive" }));
    await waitFor(() => {
      const archiveCall = fetchMock.mock.calls.find(
        ([, init]) => init?.method === "PATCH",
      );
      expect(archiveCall).toBeDefined();
      expect(JSON.parse(String(archiveCall?.[1]?.body))).toEqual({
        slug: "merge-pdf",
        is_enabled: false,
        is_published: false,
      });
    });
  });

  it("resets tool overrides with explicit confirmation and no record deletion", async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === "DELETE")
        return { ok: true, json: async () => ({ reset: true }) };
      return {
        ok: true,
        json: async () => ({
          data: [
            {
              slug: "merge-pdf",
              name: "Merge PDF",
              description: "Combine PDFs.",
              category: "PDF Tools",
              icon: "pdf",
              is_published: true,
              is_enabled: true,
              is_featured: false,
              seo_title: "Merge PDF",
              seo_description: "Combine PDFs locally.",
              canonical_path: "/tools/merge-pdf",
              is_indexable: true,
              route: "/tools/merge-pdf",
            },
          ],
        }),
      };
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal(
      "confirm",
      vi.fn(() => true),
    );
    render(<AdminResourceTable kind="tools" />);
    await screen.findAllByText("Merge PDF");
    fireEvent.click(screen.getByRole("button", { name: "Reset overrides" }));
    await waitFor(() => {
      const resetCall = fetchMock.mock.calls.find(
        ([, init]) => init?.method === "DELETE",
      );
      expect(resetCall).toBeDefined();
      expect(JSON.parse(String(resetCall?.[1]?.body))).toEqual({
        slug: "merge-pdf",
        confirm: true,
      });
    });
  });
});
