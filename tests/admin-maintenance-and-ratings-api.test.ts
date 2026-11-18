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

import { DELETE, GET, PATCH } from "@/app/api/admin/[resource]/route";

afterEach(() => vi.clearAllMocks());

const ID = "33333333-3333-4333-8333-333333333333";

function request(resource: string, method: string, body?: unknown) {
  return new NextRequest(`https://quickkit.example/api/admin/${resource}`, {
    method,
    headers:
      method === "GET"
        ? undefined
        : {
            origin: "https://quickkit.example",
            "content-type": "application/json",
          },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function params(resource: string) {
  return { params: Promise.resolve({ resource }) };
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

type Call = { table: string; op: string; args: unknown[] };

/**
 * A chainable stand-in for the Supabase query builder. Every method records
 * its call and returns the same builder; awaiting it, or calling
 * `maybeSingle`, resolves with the configured result for that table.
 */
function fakeDb(
  results: Record<string, { data?: unknown; error?: unknown }> = {},
) {
  const calls: Call[] = [];
  const db = {
    from(table: string) {
      const result = { data: null, error: null, ...(results[table] ?? {}) };
      const builder: Record<string, unknown> = {};
      for (const op of [
        "select",
        "insert",
        "upsert",
        "update",
        "delete",
        "eq",
        "order",
        "limit",
      ]) {
        builder[op] = (...args: unknown[]) => {
          calls.push({ table, op, args });
          return builder;
        };
      }
      builder.maybeSingle = async () => result;
      builder.then = (
        resolve: (value: unknown) => unknown,
        reject: (reason: unknown) => unknown,
      ) => Promise.resolve(result).then(resolve, reject);
      return builder;
    },
  };
  mocks.client.mockReturnValue(db);
  return {
    calls,
    find: (table: string, op: string) =>
      calls.find((call) => call.table === table && call.op === op),
    all: (table: string, op: string) =>
      calls.filter((call) => call.table === table && call.op === op),
  };
}

describe("Admin API: switching a tool off for maintenance", () => {
  it("stores the switch and the visitor note in metadata, keeping other metadata keys", async () => {
    authorized();
    const db = fakeDb({
      quickkit_admin_tool_overrides: {
        data: { metadata_override: { layout: "wide" } },
      },
    });
    const response = await PATCH(
      request("tools", "PATCH", {
        slug: "merge-pdf",
        maintenance_enabled: true,
        maintenance_reason: "  Adding a page-order editor. Back by 6 PM.  ",
      }),
      params("tools"),
    );
    expect(response.status).toBe(200);
    const [row, options] = db.find("quickkit_admin_tool_overrides", "upsert")!
      .args as [Record<string, unknown>, unknown];
    expect(options).toEqual({ onConflict: "tool_slug" });
    expect(Object.keys(row).sort()).toEqual([
      "metadata_override",
      "tool_slug",
      "updated_by",
    ]);
    expect(row.tool_slug).toBe("merge-pdf");
    const metadata = row.metadata_override as {
      layout: string;
      maintenance: { enabled: boolean; reason: string; since: string };
    };
    expect(metadata.layout).toBe("wide");
    expect(metadata.maintenance.enabled).toBe(true);
    expect(metadata.maintenance.reason).toBe(
      "Adding a page-order editor. Back by 6 PM.",
    );
    expect(Number.isNaN(Date.parse(metadata.maintenance.since))).toBe(false);
  });

  it("audits the switch by name without copying the note into the activity log", async () => {
    authorized();
    const db = fakeDb();
    await PATCH(
      request("tools", "PATCH", {
        slug: "merge-pdf",
        maintenance_enabled: true,
        maintenance_reason: "Private-ish wording for visitors",
      }),
      params("tools"),
    );
    const audit = db.find("quickkit_admin_activity", "insert")!
      .args[0] as Record<string, unknown>;
    expect(audit).toMatchObject({
      action: "tool.maintenance_on",
      entity_type: "tool",
      entity_id: "merge-pdf",
      details: { fields: ["metadata_override"] },
    });
    expect(JSON.stringify(audit)).not.toContain("Private-ish");
  });

  it("turns the tool back on, remembers the note and drops the start time", async () => {
    authorized();
    const db = fakeDb({
      quickkit_admin_tool_overrides: {
        data: {
          metadata_override: {
            maintenance: {
              enabled: true,
              reason: "Fixing exports",
              since: "2026-11-15T04:00:00.000Z",
            },
          },
        },
      },
    });
    const response = await PATCH(
      request("tools", "PATCH", {
        slug: "merge-pdf",
        maintenance_enabled: false,
      }),
      params("tools"),
    );
    expect(response.status).toBe(200);
    const row = db.find("quickkit_admin_tool_overrides", "upsert")!
      .args[0] as Record<string, unknown>;
    expect(row.metadata_override).toEqual({
      maintenance: { enabled: false, reason: "Fixing exports" },
    });
    expect(
      (
        db.find("quickkit_admin_activity", "insert")!.args[0] as {
          action: string;
        }
      ).action,
    ).toBe("tool.maintenance_off");
  });

  it("keeps the original start time when only the note changes while off", async () => {
    authorized();
    const db = fakeDb({
      quickkit_admin_tool_overrides: {
        data: {
          metadata_override: {
            maintenance: {
              enabled: true,
              reason: "Fixing exports",
              since: "2026-11-15T04:00:00.000Z",
            },
          },
        },
      },
    });
    await PATCH(
      request("tools", "PATCH", {
        slug: "merge-pdf",
        maintenance_enabled: true,
        maintenance_reason: "Almost done — 20 more minutes.",
      }),
      params("tools"),
    );
    const row = db.find("quickkit_admin_tool_overrides", "upsert")!
      .args[0] as Record<string, unknown>;
    expect(row.metadata_override).toEqual({
      maintenance: {
        enabled: true,
        reason: "Almost done — 20 more minutes.",
        since: "2026-11-15T04:00:00.000Z",
      },
    });
    expect(
      (
        db.find("quickkit_admin_activity", "insert")!.args[0] as {
          action: string;
        }
      ).action,
    ).toBe("tool.update");
  });

  it("does not rewrite metadata when an ordinary edit leaves maintenance unchanged", async () => {
    authorized();
    const db = fakeDb({
      quickkit_admin_tool_overrides: { data: { metadata_override: {} } },
    });
    const response = await PATCH(
      request("tools", "PATCH", {
        slug: "merge-pdf",
        is_featured: true,
        maintenance_enabled: false,
        maintenance_reason: "",
      }),
      params("tools"),
    );
    expect(response.status).toBe(200);
    const row = db.find("quickkit_admin_tool_overrides", "upsert")!
      .args[0] as Record<string, unknown>;
    expect(row).not.toHaveProperty("metadata_override");
    expect(row.is_featured).toBe(true);
  });

  it("rejects a non-boolean switch, an over-long note and an unknown tool without writing", async () => {
    authorized();
    const db = fakeDb();
    for (const body of [
      { slug: "merge-pdf", maintenance_enabled: "yes" },
      { slug: "merge-pdf", maintenance_enabled: true, maintenance_reason: 5 },
      {
        slug: "merge-pdf",
        maintenance_enabled: true,
        maintenance_reason: "x".repeat(301),
      },
      { slug: "not-a-tool", maintenance_enabled: true },
    ]) {
      const response = await PATCH(
        request("tools", "PATCH", body),
        params("tools"),
      );
      expect(response.status, JSON.stringify(body).slice(0, 70)).toBe(400);
    }
    expect(db.all("quickkit_admin_tool_overrides", "upsert")).toHaveLength(0);
    expect(db.all("quickkit_admin_activity", "insert")).toHaveLength(0);
  });

  it("fails without writing when the current metadata cannot be read", async () => {
    authorized();
    const db = fakeDb({
      quickkit_admin_tool_overrides: { error: new Error("offline") },
    });
    const response = await PATCH(
      request("tools", "PATCH", {
        slug: "merge-pdf",
        maintenance_enabled: true,
      }),
      params("tools"),
    );
    expect(response.status).toBe(503);
    expect(db.all("quickkit_admin_tool_overrides", "upsert")).toHaveLength(0);
  });

  it("requires an authorized administrator", async () => {
    mocks.verify.mockResolvedValue({ status: "unauthenticated" });
    const response = await PATCH(
      request("tools", "PATCH", {
        slug: "merge-pdf",
        maintenance_enabled: true,
      }),
      params("tools"),
    );
    expect(response.status).toBe(401);
    expect(mocks.client).not.toHaveBeenCalled();
  });
});

describe("Admin API: feedback inbox with tool ratings", () => {
  const message = {
    id: "11111111-1111-4111-8111-111111111111",
    created_at: "2026-11-14T08:00:00.000Z",
    name: "Asha",
    message: "Please add shortcuts.",
    feedback_type: "feature_request",
    status: "new",
    internal_notes: "",
  };
  const rating = {
    id: ID,
    created_at: "2026-11-15T08:00:00.000Z",
    tool_slug: "merge-pdf",
    rating: 2,
    tags: ["Speed"],
    comment: "Slow on big files.",
    status: "new",
    internal_notes: "",
    consent_at: "2026-11-15T08:00:00.000Z",
  };

  it("merges written messages and ratings, newest first, with the tool's name", async () => {
    authorized();
    fakeDb({
      quickkit_feedback_submissions: { data: [message] },
      quickkit_tool_feedback: { data: [rating] },
    });
    const response = await GET(request("feedback", "GET"), params("feedback"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ratings_ready).toBe(true);
    expect(body.data).toHaveLength(2);
    expect(body.data[0]).toEqual({
      id: ID,
      created_at: "2026-11-15T08:00:00.000Z",
      status: "new",
      internal_notes: "",
      name: null,
      message: "Slow on big files.",
      source: "rating",
      tool_slug: "merge-pdf",
      tool_name: expect.stringMatching(/merge/i),
      rating: 2,
      tags: ["Speed"],
    });
    expect(body.data[1]).toMatchObject({ ...message, source: "message" });
  });

  it("still returns written messages when the ratings table is not available yet", async () => {
    authorized();
    fakeDb({
      quickkit_feedback_submissions: { data: [message] },
      quickkit_tool_feedback: { error: new Error("relation does not exist") },
    });
    const response = await GET(request("feedback", "GET"), params("feedback"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ratings_ready).toBe(false);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].source).toBe("message");
  });

  it("reports the inbox as unavailable when written messages cannot be read", async () => {
    authorized();
    fakeDb({
      quickkit_feedback_submissions: { error: new Error("offline") },
      quickkit_tool_feedback: { data: [rating] },
    });
    const response = await GET(request("feedback", "GET"), params("feedback"));
    expect(response.status).toBe(503);
  });

  it("updates the status and notes of a rating in the ratings table only", async () => {
    authorized();
    const db = fakeDb({ quickkit_tool_feedback: { data: { id: ID } } });
    const response = await PATCH(
      request("feedback", "PATCH", {
        id: ID,
        source: "rating",
        status: "resolved",
        internal_notes: "Checked the big-file path.",
      }),
      params("feedback"),
    );
    expect(response.status).toBe(200);
    expect(db.find("quickkit_tool_feedback", "update")!.args[0]).toEqual({
      status: "resolved",
      internal_notes: "Checked the big-file path.",
    });
    expect(db.find("quickkit_tool_feedback", "eq")!.args).toEqual(["id", ID]);
    expect(db.all("quickkit_feedback_submissions", "update")).toHaveLength(0);
    const audit = db.find("quickkit_admin_activity", "insert")!
      .args[0] as Record<string, unknown>;
    expect(JSON.stringify(audit)).not.toContain("big-file");
  });

  it("refuses a message type on a rating and an unknown source", async () => {
    authorized();
    const db = fakeDb({ quickkit_tool_feedback: { data: { id: ID } } });
    for (const body of [
      { id: ID, source: "rating", feedback_type: "bug" },
      { id: ID, source: "other", status: "resolved" },
      { id: ID, source: "rating", rating: 5 },
    ]) {
      const response = await PATCH(
        request("feedback", "PATCH", body),
        params("feedback"),
      );
      expect(response.status, JSON.stringify(body)).toBe(400);
    }
    expect(db.all("quickkit_tool_feedback", "update")).toHaveLength(0);
  });

  it("keeps written messages on their own table when no source is sent", async () => {
    authorized();
    const db = fakeDb({ quickkit_feedback_submissions: { data: { id: ID } } });
    const response = await PATCH(
      request("feedback", "PATCH", { id: ID, feedback_type: "bug" }),
      params("feedback"),
    );
    expect(response.status).toBe(200);
    expect(db.all("quickkit_feedback_submissions", "update")).toHaveLength(1);
    expect(db.all("quickkit_tool_feedback", "update")).toHaveLength(0);
  });

  it("deletes a rating only with confirmation and only from the ratings table", async () => {
    authorized();
    const db = fakeDb({ quickkit_tool_feedback: { data: { id: ID } } });
    const refused = await DELETE(
      request("feedback", "DELETE", { id: ID, source: "rating" }),
      params("feedback"),
    );
    expect(refused.status).toBe(400);
    expect(db.all("quickkit_tool_feedback", "delete")).toHaveLength(0);

    const response = await DELETE(
      request("feedback", "DELETE", {
        id: ID,
        source: "rating",
        confirm: true,
      }),
      params("feedback"),
    );
    expect(response.status).toBe(200);
    expect(db.all("quickkit_tool_feedback", "delete")).toHaveLength(1);
    expect(db.all("quickkit_feedback_submissions", "delete")).toHaveLength(0);
  });

  it("does not accept a source on contact submissions", async () => {
    authorized();
    const db = fakeDb({ quickkit_contact_submissions: { data: { id: ID } } });
    const response = await DELETE(
      request("submissions", "DELETE", {
        id: ID,
        source: "rating",
        confirm: true,
      }),
      params("submissions"),
    );
    expect(response.status).toBe(400);
    expect(db.calls.filter((call) => call.op === "delete")).toHaveLength(0);
  });
});

describe("Admin API: operator-managed social icons and legal dates", () => {
  const siteSettings = "quickkit_admin_site_settings";

  /**
   * Returns `all`/`find` helpers bound to the db instance the route actually
   * used, so assertions read the recorded writes rather than a second, unused
   * builder.
   */
  function settingsDb() {
    return fakeDb({
      // The audit write must succeed, otherwise the API correctly refuses to
      // persist a change it could not record.
      quickkit_admin_activity: { data: null },
      [siteSettings]: { data: null },
    });
  }

  let captured: ReturnType<typeof fakeDb> | null = null;

  async function patchSettings(setting_key: string, setting_value: unknown) {
    authorized();
    captured = settingsDb();
    const response = await PATCH(
      request("settings", "PATCH", {
        entries: [{ setting_key, setting_value }],
      }),
      params("settings"),
    );
    // `fakeDb` returns the recorder the route's builder wrote into.
    const writes = (table: string, op: string) => captured!.all(table, op);
    return { response, writes };
  }

  it("accepts a social link whose icon is on the platform allowlist", async () => {
    const { response, writes } = await patchSettings("social_links", [
      {
        label: "Instagram",
        href: "https://instagram.com/quickkit",
        icon: "instagram",
      },
    ]);
    expect(response.status).toBe(200);
    // `upsert` is called with the array of rows, so the payload is args[0][0].
    const write = writes(siteSettings, "upsert").at(-1)!;
    const rows = write.args[0] as { setting_value: unknown }[];
    expect(rows).toHaveLength(1);
    expect(rows[0].setting_value).toEqual([
      {
        label: "Instagram",
        href: "https://instagram.com/quickkit",
        icon: "instagram",
      },
    ]);
  });

  it("rejects an icon that is not on the allowlist", async () => {
    const { response, writes } = await patchSettings("social_links", [
      { label: "Sneaky", href: "https://example.test", icon: "</svg><script>" },
    ]);
    expect(response.status).toBe(400);
    expect(writes(siteSettings, "upsert")).toHaveLength(0);
  });

  it("still rejects an unknown extra key on a social link", async () => {
    const { response } = await patchSettings("social_links", [
      { label: "X", href: "https://example.test", colour: "red" },
    ]);
    expect(response.status).toBe(400);
  });

  it("still rejects a non-HTTPS or credentialed URL even with a valid icon", async () => {
    for (const href of [
      "http://instagram.com/quickkit",
      "https://user:pass@instagram.com/quickkit",
    ]) {
      const { response } = await patchSettings("social_links", [
        { label: "Instagram", href, icon: "instagram" },
      ]);
      expect(response.status, href).toBe(400);
    }
  });

  it("stores a valid legal date pair", async () => {
    const { response, writes } = await patchSettings("legal_meta", {
      last_updated: "1 December 2026",
      last_updated_iso: "2026-12-01",
    });
    expect(response.status).toBe(200);
    const write = writes(siteSettings, "upsert").at(-1)!;
    const rows = write.args[0] as { setting_value: unknown }[];
    expect(rows).toHaveLength(1);
    expect(rows[0].setting_value).toEqual({
      last_updated: "1 December 2026",
      last_updated_iso: "2026-12-01",
    });
  });

  it("rejects an impossible calendar date or markup in the label", async () => {
    for (const value of [
      { last_updated: "31 February 2026", last_updated_iso: "2026-02-31" },
      { last_updated: "<b>Now</b>", last_updated_iso: "2026-12-01" },
      { last_updated: "1 December 2026", last_updated_iso: "not-a-date" },
      { last_updated: "", last_updated_iso: "2026-12-01" },
    ]) {
      const { response } = await patchSettings("legal_meta", value);
      expect(response.status, JSON.stringify(value)).toBe(400);
    }
  });
});
