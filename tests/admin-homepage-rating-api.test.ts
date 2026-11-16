import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ verify: vi.fn(), client: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin-auth", () => ({
  verifyAdminSession: mocks.verify,
  getAdminEmailAllowlist: () => ["owner@example.test"],
}));
vi.mock("@/lib/supabase/master-admin", () => ({
  getMasterAdminServiceClient: mocks.client,
}));

import { GET } from "@/app/api/admin/[resource]/route";

afterEach(() => vi.clearAllMocks());

type Result = { data?: unknown; error?: unknown };

/**
 * A chainable stand-in for the Supabase query builder whose answer depends on
 * the table and on the columns asked for, so the "does the rating column
 * exist" probe can fail while the main read succeeds.
 */
function fakeDb(resultFor: (table: string, columns: string) => Result) {
  const selects: { table: string; columns: string }[] = [];
  mocks.client.mockReturnValue({
    from(table: string) {
      let columns = "";
      const builder: Record<string, unknown> = {};
      for (const op of ["eq", "order", "limit"]) builder[op] = () => builder;
      builder.select = (value: string) => {
        columns = value;
        selects.push({ table, columns });
        return builder;
      };
      builder.then = (
        resolve: (value: unknown) => unknown,
        reject: (reason: unknown) => unknown,
      ) =>
        Promise.resolve({
          data: null,
          error: null,
          ...resultFor(table, columns),
        }).then(resolve, reject);
      return builder;
    },
  });
  return selects;
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

const getFeedback = () =>
  GET(
    new NextRequest("https://quickkit.example/api/admin/feedback", {
      method: "GET",
    }),
    { params: Promise.resolve({ resource: "feedback" }) },
  );

const base = {
  feedback_type: "unclassified",
  status: "new",
  internal_notes: "",
  consent_at: "2026-11-15T08:00:00.000Z",
};
const rated = {
  ...base,
  id: "11111111-1111-4111-8111-111111111111",
  created_at: "2026-11-15T09:00:00.000Z",
  name: "Asha",
  message: "Everything in one place.",
  rating: 5,
  tags: ["Easy to use", "Useful tools"],
};
const ratedOnly = {
  ...base,
  id: "22222222-2222-4222-8222-222222222222",
  created_at: "2026-11-15T08:00:00.000Z",
  name: null,
  message: "",
  rating: 2,
  tags: [],
};
const plain = {
  ...base,
  id: "33333333-3333-4333-8333-333333333333",
  created_at: "2026-11-15T07:00:00.000Z",
  name: "Ravi",
  message: "Please add shortcuts.",
  rating: null,
  tags: [],
};

describe("Admin API: homepage feedback with star ratings", () => {
  it("returns the rating and options on rated feedback and none on plain messages", async () => {
    authorized();
    fakeDb((table) =>
      table === "quickkit_feedback_submissions"
        ? { data: [rated, ratedOnly, plain] }
        : { data: [] },
    );
    const response = await getFeedback();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.homepage_ratings_ready).toBe(true);
    expect(body.ratings_ready).toBe(true);
    expect(body.data).toHaveLength(3);
    expect(body.data[0]).toMatchObject({
      id: rated.id,
      source: "message",
      name: "Asha",
      message: "Everything in one place.",
      rating: 5,
      tags: ["Easy to use", "Useful tools"],
    });
    expect(body.data[1]).toMatchObject({
      id: ratedOnly.id,
      source: "message",
      message: "",
      rating: 2,
      tags: [],
    });
    expect(body.data[2]).toMatchObject({ id: plain.id, source: "message" });
    // A plain message carries no rating fields at all, so it is never counted.
    expect("rating" in body.data[2]).toBe(false);
    expect("tags" in body.data[2]).toBe(false);
  });

  it("names the tool chosen under About and adds nothing when none was", async () => {
    authorized();
    fakeDb((table) =>
      table === "quickkit_feedback_submissions"
        ? {
            data: [
              { ...rated, tool_slug: "merge-pdf" },
              { ...plain, tool_slug: null },
              { ...ratedOnly, tool_slug: "retired-tool" },
            ],
          }
        : { data: [] },
    );
    const body = await (await getFeedback()).json();
    const byId = new Map<string, Record<string, unknown>>(
      body.data.map((row: { id: string }) => [row.id, row]),
    );
    expect(byId.get(rated.id)).toMatchObject({
      source: "message",
      tool_slug: "merge-pdf",
      tool_name: "PDF Merger",
      rating: 5,
    });
    expect("tool_slug" in byId.get(plain.id)!).toBe(false);
    expect("tool_name" in byId.get(plain.id)!).toBe(false);
    // A tool no longer in the catalogue is still shown, by its slug.
    expect(byId.get(ratedOnly.id)).toMatchObject({
      tool_slug: "retired-tool",
      tool_name: "retired-tool",
    });
  });

  it("ignores a stored rating that is out of range", async () => {
    authorized();
    fakeDb((table) =>
      table === "quickkit_feedback_submissions"
        ? {
            data: [
              { ...plain, rating: 9, tags: ["Easy to use"] },
              { ...plain, id: rated.id, rating: 3.5 },
            ],
          }
        : { data: [] },
    );
    const body = await (await getFeedback()).json();
    for (const row of body.data) {
      expect("rating" in row).toBe(false);
      expect("tags" in row).toBe(false);
    }
  });

  it("keeps messages readable and flags it when the rating column does not exist yet", async () => {
    authorized();
    // Before the migration: rows have no rating column and asking for it fails.
    const { rating: _rating, tags: _tags, ...legacy } = plain;
    void _rating;
    void _tags;
    const selects = fakeDb((table, columns) => {
      if (table !== "quickkit_feedback_submissions") return { data: [] };
      return columns === "rating"
        ? { error: { code: "42703", message: "column does not exist" } }
        : { data: [legacy] };
    });
    const response = await getFeedback();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.homepage_ratings_ready).toBe(false);
    expect(body.ratings_ready).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.data[0]).toMatchObject({
      id: plain.id,
      source: "message",
      message: "Please add shortcuts.",
    });
    expect(selects).toContainEqual({
      table: "quickkit_feedback_submissions",
      columns: "rating",
    });
  });
});
