// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import AdminResourceTable from "@/components/admin/admin-resource-table";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("admin feedback filters", () => {
  it("combines free-text, status, type, and date without overwriting filters", async () => {
    const rows = [
      {
        id: "11111111-1111-4111-8111-111111111111",
        created_at: "2026-11-09T08:00:00.000Z",
        name: "Asha Patel",
        email: "asha@example.test",
        message: "The export button fails.",
        feedback_type: "bug",
        status: "new",
        internal_notes: "",
      },
      {
        id: "22222222-2222-4222-8222-222222222222",
        created_at: "2026-11-10T08:00:00.000Z",
        name: "Ravi Shah",
        email: "ravi@example.test",
        message: "Please add batch export.",
        feedback_type: "feature_request",
        status: "resolved",
        internal_notes: "",
      },
    ];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: rows }),
      }),
    );
    render(<AdminResourceTable kind="feedback" />);
    expect(await screen.findByText("Asha Patel")).toBeTruthy();

    fireEvent.change(
      screen.getByRole("searchbox", { name: "Search feedback" }),
      {
        target: { value: "Asha" },
      },
    );
    fireEvent.change(
      screen.getByRole("combobox", { name: "Filter by status" }),
      {
        target: { value: "new" },
      },
    );
    fireEvent.change(screen.getByRole("combobox", { name: "Feedback type" }), {
      target: { value: "bug" },
    });
    fireEvent.change(screen.getByLabelText("Filter from date"), {
      target: { value: "2026-11-09" },
    });

    await waitFor(() => {
      expect(screen.getByText("Asha Patel")).toBeTruthy();
      expect(screen.queryByText("Ravi Shah")).toBeNull();
    });
  });
});
