import { describe, expect, it, vi } from "vitest";
import { tools } from "@/lib/catalog";

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_HTTP_ERROR_FALLBACK;404");
  },
}));

import {
  mergePublicCatalog,
  requirePublicToolShellData,
  resolvePublicToolShellData,
} from "@/lib/supabase/public-catalog";

describe("published tool route resolution", () => {
  it("resolves a visible tool with the effective public catalogue", () => {
    const catalog = mergePublicCatalog([], []);
    const resolved = resolvePublicToolShellData(catalog, "merge-pdf");
    expect(resolved?.tool.slug).toBe("merge-pdf");
    expect(resolved?.categories.map((category) => category.slug)).toContain(
      "pdf-tools",
    );
    expect(resolved?.tools.length).toBe(tools.length);
  });

  it("returns no route data for an unpublished or disabled tool", () => {
    const catalog = mergePublicCatalog(
      [
        {
          tool_slug: "merge-pdf",
          is_published: false,
          is_enabled: true,
        } as never,
        {
          tool_slug: "word-counter",
          is_published: true,
          is_enabled: false,
        } as never,
      ],
      [],
    );
    expect(resolvePublicToolShellData(catalog, "merge-pdf")).toBeNull();
    expect(resolvePublicToolShellData(catalog, "word-counter")).toBeNull();
    expect(resolvePublicToolShellData(catalog, "not-a-tool")).toBeNull();
    expect(() => requirePublicToolShellData(catalog, "merge-pdf")).toThrow(
      "NEXT_HTTP_ERROR_FALLBACK;404",
    );
  });
});
