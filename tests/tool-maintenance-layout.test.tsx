import { expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ catalog: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/public-catalog", () => ({
  getPublicCatalog: mocks.catalog,
}));

import ToolsLayout from "@/app/(public)/tools/layout";
import ToolMaintenanceGate from "@/components/tool-maintenance-gate";

it("passes an active maintenance notice through the static ToolsLayout without request cookies", async () => {
  mocks.catalog.mockResolvedValue({
    tools: [
      {
        slug: "word-counter",
        name: "Word Counter",
        maintenance: {
          reason: "Maintenance in progress",
          since: "2026-11-18T06:09:24.907Z",
        },
      },
    ],
  });

  const tree = await ToolsLayout({ children: "static tool page" });
  const children = (tree.props as { children: React.ReactNode[] }).children;
  const gate = children.find(
    (child) =>
      typeof child === "object" &&
      child !== null &&
      "type" in child &&
      child.type === ToolMaintenanceGate,
  );

  expect(gate).toBeDefined();
  expect((gate as React.ReactElement).props).toEqual({
    notices: [
      {
        slug: "word-counter",
        name: "Word Counter",
        reason: "Maintenance in progress",
        since: "2026-11-18T06:09:24.907Z",
      },
    ],
  });
});
