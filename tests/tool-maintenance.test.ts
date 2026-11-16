import { describe, expect, it } from "vitest";
import {
  TOOL_MAINTENANCE_REASON_MAX,
  readStoredToolMaintenance,
  readToolMaintenance,
  withToolMaintenance,
} from "@/lib/tool-maintenance";
import { mergePublicCatalog } from "@/lib/supabase/public-catalog";

describe("per-tool maintenance state", () => {
  it("treats missing, malformed and switched-on metadata as not off", () => {
    for (const metadata of [
      null,
      undefined,
      "maintenance",
      [],
      {},
      { maintenance: null },
      { maintenance: [] },
      { maintenance: { enabled: "true", reason: "x" } },
      { maintenance: { enabled: false, reason: "Earlier note" } },
    ]) {
      expect(readToolMaintenance(metadata)).toBeNull();
    }
  });

  it("returns the administrator's note and start time while a tool is off", () => {
    expect(
      readToolMaintenance({
        maintenance: {
          enabled: true,
          reason: "  Adding batch export. Back by 6 PM.  ",
          since: "2026-11-15T09:30:00+05:30",
        },
      }),
    ).toEqual({
      reason: "Adding batch export. Back by 6 PM.",
      since: "2026-11-15T04:00:00.000Z",
    });
  });

  it("drops an over-long or non-text note and an invalid date instead of trusting them", () => {
    expect(
      readToolMaintenance({
        maintenance: {
          enabled: true,
          reason: "x".repeat(TOOL_MAINTENANCE_REASON_MAX + 1),
          since: "not a date",
        },
      }),
    ).toEqual({ reason: "", since: null });
    expect(
      readToolMaintenance({ maintenance: { enabled: true, reason: 42 } }),
    ).toEqual({ reason: "", since: null });
  });

  it("keeps other metadata keys and remembers the last note when switched back on", () => {
    const off = withToolMaintenance(
      { layout: "wide" },
      { enabled: true, reason: "Fixing a bug", since: "2026-11-15T04:00:00Z" },
    );
    expect(off).toEqual({
      layout: "wide",
      maintenance: {
        enabled: true,
        reason: "Fixing a bug",
        since: "2026-11-15T04:00:00Z",
      },
    });
    const on = withToolMaintenance(off, {
      enabled: false,
      reason: "Fixing a bug",
      since: null,
    });
    expect(on).toEqual({
      layout: "wide",
      maintenance: { enabled: false, reason: "Fixing a bug" },
    });
    expect(readStoredToolMaintenance(on)).toEqual({
      enabled: false,
      reason: "Fixing a bug",
      since: null,
    });
    expect(readToolMaintenance(on)).toBeNull();
  });
});

describe("public catalogue maintenance projection", () => {
  it("keeps a switched-off tool listed and carries its notice", () => {
    const { tools } = mergePublicCatalog(
      [
        {
          tool_slug: "merge-pdf",
          is_published: true,
          is_enabled: true,
          metadata_override: {
            maintenance: {
              enabled: true,
              reason: "New page-order editor is being added.",
              since: "2026-11-15T04:00:00.000Z",
            },
          },
        } as never,
      ],
      [],
    );
    const tool = tools.find((item) => item.slug === "merge-pdf");
    expect(tool?.maintenance).toEqual({
      reason: "New page-order editor is being added.",
      since: "2026-11-15T04:00:00.000Z",
    });
    expect(tools.find((item) => item.slug === "split-pdf")?.maintenance).toBe(
      null,
    );
  });

  it("reports no maintenance when no override row exists", () => {
    const { tools } = mergePublicCatalog([], []);
    expect(tools.length).toBeGreaterThan(0);
    expect(tools.every((tool) => tool.maintenance === null)).toBe(true);
  });
});
