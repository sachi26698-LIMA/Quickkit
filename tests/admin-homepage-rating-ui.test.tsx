// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import AdminResourceTable from "@/components/admin/admin-resource-table";
import {
  HOMEPAGE_RATING_KEY,
  ratingGroupOf,
  summarizeRatings,
} from "@/components/admin/admin-feedback-insights";

vi.mock("next/navigation", () => {
  const router = { replace: () => {}, push: () => {} };
  return { usePathname: () => "/admin/feedback", useRouter: () => router };
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const base = {
  status: "new",
  internal_notes: "",
  feedback_type: "unclassified",
};
const plain = {
  ...base,
  id: "11111111-1111-4111-8111-111111111111",
  created_at: "2026-11-11T08:00:00.000Z",
  name: "Ravi Shah",
  message: "Please add keyboard shortcuts.",
  source: "message",
};
const homepageFive = {
  ...base,
  id: "22222222-2222-4222-8222-222222222222",
  created_at: "2026-11-12T08:00:00.000Z",
  name: "Asha Patel",
  message: "Everything in one place.",
  source: "message",
  rating: 5,
  tags: ["Easy to use", "Useful tools"],
};
const homepageOne = {
  ...base,
  id: "33333333-3333-4333-8333-333333333333",
  created_at: "2026-11-13T08:00:00.000Z",
  name: null,
  message: "",
  source: "message",
  rating: 1,
  tags: ["Something broke"],
};
const toolFour = {
  id: "44444444-4444-4444-8444-444444444444",
  created_at: "2026-11-14T08:00:00.000Z",
  name: null,
  message: "",
  status: "new",
  internal_notes: "",
  source: "rating",
  tool_slug: "merge-pdf",
  tool_name: "PDF Merger",
  rating: 4,
  tags: [],
};
const rows = [plain, homepageFive, homepageOne, toolFour];

function stubFetch(
  getBody: Record<string, unknown>,
  onWrite?: (init: RequestInit) => void,
) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method && init.method !== "GET") {
        onWrite?.(init);
        return { ok: true, json: async () => ({ ok: true }) };
      }
      return { ok: true, json: async () => getBody };
    }),
  );
}

describe("rating summary with homepage ratings", () => {
  it("counts homepage ratings with tool ratings and gives them their own group", () => {
    const summary = summarizeRatings(rows as never);
    expect(summary.count).toBe(3);
    expect(summary.average).toBeCloseTo(10 / 3);
    expect(summary.distribution).toEqual([1, 0, 0, 1, 1]);
    expect(summary.low).toBe(1);
    expect(summary.tools).toEqual([
      {
        slug: HOMEPAGE_RATING_KEY,
        name: "Homepage feedback form",
        count: 2,
        average: 3,
      },
      { slug: "merge-pdf", name: "PDF Merger", count: 1, average: 4 },
    ]);
  });

  it("puts each row in the right group and unrated messages in none", () => {
    expect(ratingGroupOf(plain as never)).toBe("");
    expect(ratingGroupOf(homepageFive as never)).toBe(HOMEPAGE_RATING_KEY);
    expect(ratingGroupOf(toolFour as never)).toBe("merge-pdf");
    // The stand-in can never be mistaken for a real tool address.
    expect(HOMEPAGE_RATING_KEY).not.toMatch(/^[a-z0-9][a-z0-9-]{0,79}$/);
  });
});

describe("admin feedback inbox with homepage ratings", () => {
  it("shows the stars and chosen options on homepage feedback", async () => {
    stubFetch({
      data: rows,
      ratings_ready: true,
      homepage_ratings_ready: true,
    });
    render(<AdminResourceTable kind="feedback" />);
    expect(await screen.findByText("Asha Patel")).toBeTruthy();
    const table = screen.getByRole("table");

    const fiveStar = within(table)
      .getByText("Everything in one place.")
      .closest("tr")!;
    expect(
      within(fiveStar).getByRole("img", { name: "5 out of 5 stars" }),
    ).toBeTruthy();
    expect(within(fiveStar).getByText("5/5")).toBeTruthy();
    expect(within(fiveStar).getByText("Loved it!")).toBeTruthy();
    expect(within(fiveStar).getByText("Easy to use")).toBeTruthy();
    expect(within(fiveStar).getByText("Useful tools")).toBeTruthy();
    expect(within(fiveStar).getByText("Homepage feedback")).toBeTruthy();

    // A rating sent without a name or a message is still a readable row.
    const oneStar = within(table).getByText("Something broke").closest("tr")!;
    expect(within(oneStar).getByText("Anonymous")).toBeTruthy();
    expect(
      within(oneStar).getByRole("img", { name: "1 out of 5 stars" }),
    ).toBeTruthy();

    // The unrated message shows no stars.
    const unrated = within(table).getByText("Ravi Shah").closest("tr")!;
    expect(within(unrated).queryByRole("img")).toBeNull();

    const metrics = screen.getByLabelText("feedback summary metrics");
    expect(within(metrics).getByText("Star ratings")).toBeTruthy();
    expect(within(metrics).getByText("3.3")).toBeTruthy();
    expect(
      screen.getByText(/1 tool rated · plus the homepage form/),
    ).toBeTruthy();
    expect(screen.queryByText(/migration has not been applied/)).toBeNull();
  });

  it("filters to homepage ratings from the summary and by stars", async () => {
    stubFetch({
      data: rows,
      ratings_ready: true,
      homepage_ratings_ready: true,
    });
    render(<AdminResourceTable kind="feedback" />);
    await screen.findByText("Asha Patel");
    const table = screen.getByRole("table");

    fireEvent.click(
      screen.getByRole("button", {
        name: "Homepage feedback form: 3.0 out of 5 from 2 ratings. Show only these.",
      }),
    );
    await waitFor(() => expect(screen.queryByText("Ravi Shah")).toBeNull());
    expect(within(table).queryByText("PDF Merger")).toBeNull();
    expect(within(table).getByText("Asha Patel")).toBeTruthy();
    expect(within(table).getByText("Something broke")).toBeTruthy();
    expect(
      (
        screen.getByRole("combobox", {
          name: "Filter by tool",
        }) as HTMLSelectElement
      ).value,
    ).toBe(HOMEPAGE_RATING_KEY);

    fireEvent.change(screen.getByRole("combobox", { name: "Filter by tool" }), {
      target: { value: "all" },
    });
    fireEvent.change(
      screen.getByRole("combobox", { name: "Filter by star rating" }),
      { target: { value: "low" } },
    );
    await waitFor(() => expect(screen.queryByText("Asha Patel")).toBeNull());
    expect(within(table).getByText("Something broke")).toBeTruthy();
    expect(within(table).queryByText("PDF Merger")).toBeNull();

    fireEvent.change(
      screen.getByRole("combobox", { name: "Filter by star rating" }),
      { target: { value: "all" } },
    );
    fireEvent.change(
      screen.getByRole("combobox", { name: "Filter by feedback source" }),
      { target: { value: "message" } },
    );
    await waitFor(() =>
      expect(within(table).queryByText("PDF Merger")).toBeNull(),
    );
    expect(within(table).getByText("Ravi Shah")).toBeTruthy();
    expect(within(table).getByText("Asha Patel")).toBeTruthy();
  });

  it("shows the rating in the editor and saves only status, type and notes", async () => {
    const writes: Record<string, unknown>[] = [];
    stubFetch(
      {
        data: [homepageOne],
        ratings_ready: true,
        homepage_ratings_ready: true,
      },
      (init) =>
        writes.push({ method: init.method, ...JSON.parse(String(init.body)) }),
    );
    render(<AdminResourceTable kind="feedback" />);
    await screen.findByText("Something broke");
    fireEvent.click(screen.getByRole("button", { name: "View / edit" }));
    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByRole("img", { name: "1 out of 5 stars" }),
    ).toBeTruthy();
    expect(within(dialog).getByText(/1\/5 · Disappointing/)).toBeTruthy();
    expect(within(dialog).getByText("Something broke")).toBeTruthy();
    expect(
      within(dialog).getByText("The visitor did not add a written comment."),
    ).toBeTruthy();
    // Homepage feedback keeps its message type, unlike a tool rating.
    fireEvent.change(within(dialog).getByLabelText("Feedback type"), {
      target: { value: "bug" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: /Save/ }));
    await waitFor(() => expect(writes).toHaveLength(1));
    expect(writes[0]).toEqual({
      method: "PATCH",
      id: homepageOne.id,
      status: "new",
      feedback_type: "bug",
      internal_notes: "",
    });
  });

  it("shows which tool homepage feedback is about, still grouped under the form", async () => {
    const about = {
      ...homepageFive,
      tool_slug: "merge-pdf",
      tool_name: "PDF Merger",
    };
    stubFetch({
      data: [about, plain],
      ratings_ready: true,
      homepage_ratings_ready: true,
    });
    render(<AdminResourceTable kind="feedback" />);
    await screen.findByText("Everything in one place.");
    expect(
      screen.getByText("Homepage feedback · about PDF Merger"),
    ).toBeTruthy();
    // Feedback about QUICKKIT overall names no tool.
    expect(screen.getAllByText("Homepage feedback")).not.toHaveLength(0);
    expect(ratingGroupOf(about as never)).toBe(HOMEPAGE_RATING_KEY);
    fireEvent.click(screen.getAllByRole("button", { name: "View / edit" })[0]);
    const dialog = await screen.findByRole("dialog");
    const link = within(dialog).getByRole("link", { name: /PDF Merger/ });
    expect(link.getAttribute("href")).toBe("/tools/merge-pdf");
    expect(within(dialog).getByText("About:")).toBeTruthy();
  });

  it("explains when homepage ratings cannot be stored yet", async () => {
    stubFetch({
      data: [plain],
      ratings_ready: true,
      homepage_ratings_ready: false,
    });
    render(<AdminResourceTable kind="feedback" />);
    await screen.findByText("Ravi Shah");
    const notice = screen.getByText(/migration has not been applied/);
    expect(notice.textContent).toContain("quickkit_feedback_rating");
    expect(notice.textContent).toContain("homepage feedback form");
  });

  it("stays quiet about migrations when an older server sends no flag", async () => {
    stubFetch({ data: [plain] });
    render(<AdminResourceTable kind="feedback" />);
    await screen.findByText("Ravi Shah");
    expect(screen.queryByText(/migration has not been applied/)).toBeNull();
  });
});
