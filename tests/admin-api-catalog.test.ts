import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ verify: vi.fn(), client: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin-auth", () => ({
  verifyAdminSession: mocks.verify,
}));
vi.mock("@/lib/supabase/master-admin", () => ({
  getMasterAdminServiceClient: mocks.client,
}));

import { POST, DELETE } from "@/app/api/admin/[resource]/route";

afterEach(() => vi.clearAllMocks());

function request(method: string, body: unknown) {
  return new NextRequest("https://quickkit.example/api/admin/categories", {
    method,
    headers: {
      origin: "https://quickkit.example",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

function authorized() {
  mocks.verify.mockResolvedValue({
    status: "authorized",
    admin: {
      id: "11111111-1111-4111-8111-111111111111",
      email: "owner@example.test",
      lastSignInAt: null,
    },
  });
}

describe("Admin category persistence API", () => {
  it("creates a private-by-default custom category and records a safe audit event", async () => {
    authorized();
    const inserted: Array<{ table: string; row: unknown }> = [];
    const db = {
      from(table: string) {
        return {
          select: async () => ({ data: [], error: null }),
          insert: async (row: unknown) => {
            inserted.push({ table, row });
            return { error: null };
          },
        };
      },
    };
    mocks.client.mockReturnValue(db);

    const response = await POST(
      request("POST", {
        slug: "document-lab",
        name: "Document Lab",
        description: "A custom catalog grouping.",
        display_order: 20,
        seo_title: "Document Lab tools",
        icon: "pdf",
      }),
      { params: Promise.resolve({ resource: "categories" }) },
    );

    expect(response.status).toBe(201);
    const category = inserted.find(
      (entry) => entry.table === "quickkit_admin_category_overrides",
    )?.row as Record<string, unknown>;
    expect(category).toMatchObject({
      category_slug: "document-lab",
      name_override: "Document Lab",
      is_published: false,
      updated_by: "11111111-1111-4111-8111-111111111111",
    });
    expect(
      inserted.some((entry) => entry.table === "quickkit_admin_activity"),
    ).toBe(true);
  });

  it("rejects malformed category identifiers before any database write", async () => {
    authorized();
    const insert = vi.fn(async () => ({ error: null }));
    mocks.client.mockReturnValue({
      from: () => ({ select: async () => ({ data: [], error: null }), insert }),
    });
    const response = await POST(
      request("POST", { slug: "../admin", name: "Bad category" }),
      { params: Promise.resolve({ resource: "categories" }) },
    );
    expect(response.status).toBe(400);
    expect(insert).not.toHaveBeenCalled();
  });

  it("requires an authorized allowlisted Admin before the service client is used", async () => {
    mocks.verify.mockResolvedValue({ status: "unauthenticated" });
    const response = await POST(
      request("POST", { slug: "example", name: "Example" }),
      { params: Promise.resolve({ resource: "categories" }) },
    );
    expect(response.status).toBe(401);
    expect(mocks.client).not.toHaveBeenCalled();
  });

  it("refuses to archive a custom category while tools still reference it", async () => {
    authorized();
    const upsert = vi.fn(async () => ({ error: null }));
    const db = {
      from(table: string) {
        return {
          select: async () => ({
            data:
              table === "quickkit_admin_category_overrides"
                ? [
                    {
                      category_slug: "document-lab",
                      name_override: "Document Lab",
                      is_published: true,
                      display_order: 100,
                    },
                  ]
                : [
                    {
                      tool_slug: "merge-pdf",
                      category_override: "Document Lab",
                      is_enabled: true,
                      is_published: true,
                    },
                  ],
            error: null,
          }),
          insert: async () => ({ error: null }),
          upsert,
        };
      },
    };
    mocks.client.mockReturnValue(db);
    const response = await DELETE(
      request("DELETE", { slug: "document-lab", confirm: true }),
      { params: Promise.resolve({ resource: "categories" }) },
    );
    expect(response.status).toBe(409);
    expect(upsert).not.toHaveBeenCalled();
  });
});
