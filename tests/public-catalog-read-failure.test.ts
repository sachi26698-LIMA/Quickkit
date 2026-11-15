import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ client: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/master-admin", () => ({
  getMasterAdminServiceClient: mocks.client,
}));

import {
  mergePublicCatalog,
  getPublicCatalog,
} from "@/lib/supabase/public-catalog";

afterEach(() => vi.clearAllMocks());

describe("public catalog read failures", () => {
  it.each([
    "quickkit_admin_tool_overrides",
    "quickkit_admin_category_overrides",
  ])(
    "uses the complete shipped catalogue if %s cannot be read",
    async (failedTable) => {
      const overrides: Record<string, { data: unknown; error: unknown }> = {
        quickkit_admin_tool_overrides: {
          data: [
            {
              tool_slug: "merge-pdf",
              name_override: "Temporary name",
              is_enabled: true,
              is_published: true,
            },
          ],
          error: null,
        },
        quickkit_admin_category_overrides: {
          data: [],
          error: null,
        },
      };
      overrides[failedTable as keyof typeof overrides] = {
        data: null,
        error: { code: "XX000" },
      };
      mocks.client.mockReturnValue({
        from: (table: keyof typeof overrides) => ({
          select: () => Promise.resolve(overrides[table]),
        }),
      });

      expect(await getPublicCatalog()).toEqual(mergePublicCatalog([], []));
    },
  );
});
