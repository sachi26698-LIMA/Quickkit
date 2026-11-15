import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  new URL(
    "../supabase/migrations/202611100002_quickkit_master_admin.sql",
    import.meta.url,
  ),
  "utf8",
);
const privateTables = [
  "quickkit_admin_tool_overrides",
  "quickkit_admin_category_overrides",
  "quickkit_admin_site_settings",
  "quickkit_admin_activity",
];

describe("pending Master Admin migration least privilege", () => {
  it("is additive and leaves rollback approval to the owner", () => {
    expect(sql).toMatch(/^\s*--[^\n]*\n(?:--[^\n]*\n)*\s*begin;/i);
    expect(sql).toMatch(/commit;\s*$/i);
    expect(sql).not.toMatch(/\bdrop\s+(?:table|column|policy|trigger)\b/i);
    expect(sql).not.toMatch(/\btruncate\b/i);
    expect(sql).not.toMatch(/\bcreate\s+or\s+replace\b/i);
  });

  it("enables RLS and explicitly revokes default grants from every API role", () => {
    for (const table of privateTables) {
      expect(sql).toMatch(
        new RegExp(
          `alter table public\\.${table} enable row level security`,
          "i",
        ),
      );
    }
    const revoke = sql.match(
      /revoke all on table public\.quickkit_admin_tool_overrides,[\s\S]*?;/i,
    )?.[0];
    expect(revoke).toBeDefined();
    for (const role of ["public", "anon", "authenticated", "service_role"]) {
      expect(revoke).toMatch(new RegExp(`\\b${role}\\b`, "i"));
    }
    for (const table of privateTables) {
      expect(revoke).toContain(`public.${table}`);
    }
  });

  it("adds explicit default-deny policies for browser roles on private application tables", () => {
    for (const [policy, table] of [
      [
        "Deny browser access to contact submissions",
        "quickkit_contact_submissions",
      ],
      [
        "Deny browser access to feedback submissions",
        "quickkit_feedback_submissions",
      ],
      [
        "Deny browser access to submission limits",
        "quickkit_submission_limits",
      ],
      [
        "Deny browser access to admin tool overrides",
        "quickkit_admin_tool_overrides",
      ],
      [
        "Deny browser access to admin category overrides",
        "quickkit_admin_category_overrides",
      ],
      [
        "Deny browser access to admin site settings",
        "quickkit_admin_site_settings",
      ],
      ["Deny browser access to admin activity", "quickkit_admin_activity"],
    ]) {
      expect(sql).toMatch(
        new RegExp(
          `create policy "${policy}"\\s+on public\\.${table} for all to anon, authenticated\\s+using \\(false\\) with check \\(false\\)`,
          "i",
        ),
      );
    }
  });

  it("removes default API-role grants from the identity sequence before granting server use", () => {
    expect(sql).toMatch(
      /revoke all on sequence public\.quickkit_admin_activity_id_seq\s+from public, anon, authenticated, service_role/i,
    );
    expect(sql).toMatch(
      /grant usage, select on sequence public\.quickkit_admin_activity_id_seq\s+to service_role/i,
    );
  });

  it("re-grants only the API operations needed for each new table", () => {
    expect(sql).toMatch(
      /grant select, insert, update on public\.quickkit_admin_tool_overrides\s+to service_role/i,
    );
    expect(sql).toMatch(
      /grant select, insert, update on public\.quickkit_admin_category_overrides\s+to service_role/i,
    );
    expect(sql).toMatch(
      /grant select, insert, update on public\.quickkit_admin_site_settings\s+to service_role/i,
    );
    expect(sql).toMatch(
      /grant select, insert on public\.quickkit_admin_activity\s+to service_role/i,
    );
    expect(sql).not.toMatch(
      /grant\s+(?:all|delete|truncate|references|trigger|maintain)[^;]*quickkit_admin_/i,
    );
  });
});
