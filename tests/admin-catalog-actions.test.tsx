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

const { replace: mockReplace } = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => {
  const router = { replace: mockReplace, push: () => {} };
  return { usePathname: () => "/admin/tools", useRouter: () => router };
});

const makeTool = (slug: string, name: string, category = "PDF Tools") => ({
  slug,
  name,
  description: `${name} description`,
  category,
  icon: "tool",
  is_published: false,
  is_enabled: true,
  is_featured: false,
  seo_title: name,
  seo_description: `${name} SEO description`,
  canonical_path: `/tools/${slug}`,
  is_indexable: true,
  route: `/tools/${slug}`,
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("Admin catalog controls", () => {
  it("filters by category and bulk-publishes the selected tool with a confirmed API response", async () => {
    const rows = [
      makeTool("merge-pdf", "Merge PDF"),
      makeTool("json-formatter", "JSON Formatter", "Developer Tools"),
    ];
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === "PATCH")
        return { ok: true, json: async () => ({ ok: true }) };
      return {
        ok: true,
        json: async () => ({
          data: rows,
          category_options: ["PDF Tools", "Developer Tools"],
        }),
      };
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<AdminResourceTable kind="tools" />);

    await screen.findByRole("checkbox", { name: "Select Merge PDF" });
    fireEvent.change(
      screen.getByRole("combobox", { name: "Filter by category" }),
      { target: { value: "Developer Tools" } },
    );
    await screen.findByRole("checkbox", { name: "Select JSON Formatter" });
    expect(
      screen.queryByRole("checkbox", { name: "Select Merge PDF" }),
    ).toBeNull();

    fireEvent.click(
      screen.getByRole("checkbox", { name: "Select JSON Formatter" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Publish" }));
    await waitFor(() => {
      const patch = fetchMock.mock.calls.find(
        ([, init]) => init?.method === "PATCH",
      );
      expect(patch).toBeDefined();
      expect(JSON.parse(String(patch?.[1]?.body))).toEqual({
        slug: "json-formatter",
        is_enabled: true,
        is_published: true,
      });
      expect(screen.getByRole("status").textContent).toContain(
        "Published for 1 selected tools",
      );
    });
  });

  it("reorders categories with keyboard-accessible move controls and confirms both API updates", async () => {
    const rows = [
      {
        slug: "pdf-tools",
        name: "PDF Tools",
        description: "PDF tools",
        display_order: 0,
        is_published: true,
        seo_title: "PDF Tools",
        icon: "pdf",
        tool_count: 0,
        is_custom: false,
      },
      {
        slug: "image-tools",
        name: "Image Tools",
        description: "Image tools",
        display_order: 1,
        is_published: true,
        seo_title: "Image Tools",
        icon: "image",
        tool_count: 0,
        is_custom: false,
      },
    ];
    const patches: Record<string, unknown>[] = [];
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === "PATCH") {
        patches.push(JSON.parse(String(init.body)));
        return { ok: true, json: async () => ({ ok: true }) };
      }
      return { ok: true, json: async () => ({ data: rows }) };
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<AdminResourceTable kind="categories" />);
    await screen.findByRole("button", { name: "Move Image Tools up" });
    fireEvent.click(
      screen.getByRole("button", { name: "Move Image Tools up" }),
    );
    await waitFor(() => {
      expect(patches).toHaveLength(2);
      expect(patches).toContainEqual({ slug: "image-tools", display_order: 0 });
      expect(patches).toContainEqual({ slug: "pdf-tools", display_order: 1 });
      expect(screen.getByRole("status").textContent).toContain(
        "Category order saved",
      );
    });
  });

  it("exports the currently filtered catalog rows as a dated CSV", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        data: [makeTool("merge-pdf", "Merge PDF")],
        category_options: ["PDF Tools"],
      }),
    }));
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:catalog"),
      revokeObjectURL: vi.fn(),
    });
    const downloads: string[] = [];
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(function (this: HTMLAnchorElement) {
        downloads.push(this.download);
      });
    render(<AdminResourceTable kind="tools" />);
    await screen.findByRole("checkbox", { name: "Select Merge PDF" });
    fireEvent.click(screen.getByRole("button", { name: "Export CSV" }));
    expect(click).toHaveBeenCalledOnce();
    expect(downloads[0]).toMatch(/^quickkit-tools-\d{4}-\d{2}-\d{2}\.csv$/);
  });

  it("redirects to owner sign-in when a protected API reports an expired session", async () => {
    mockReplace.mockClear();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        status: 401,
        ok: false,
        json: async () => ({ error: "Unauthorized" }),
      })),
    );
    render(<AdminResourceTable kind="tools" />);
    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith("/admin/login?reason=expired"),
    );
    expect((await screen.findByRole("alert")).textContent).toContain(
      "Admin session expired",
    );
  });
});
