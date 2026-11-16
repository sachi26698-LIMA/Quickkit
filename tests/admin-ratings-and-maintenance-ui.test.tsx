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
import { summarizeRatings } from "@/components/admin/admin-feedback-insights";

const nav = vi.hoisted(() => ({ pathname: "/admin/feedback" }));
vi.mock("next/navigation", () => {
  const router = { replace: () => {}, push: () => {} };
  return { usePathname: () => nav.pathname, useRouter: () => router };
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const message = {
  id: "11111111-1111-4111-8111-111111111111",
  created_at: "2026-11-13T08:00:00.000Z",
  name: "Asha Patel",
  message: "Please add keyboard shortcuts.",
  feedback_type: "feature_request",
  status: "new",
  internal_notes: "",
  source: "message",
};
const rating = (
  id: string,
  tool: [string, string],
  stars: number,
  extra: Record<string, unknown> = {},
) => ({
  id: `${id.repeat(8)}-${id.repeat(4)}-4${id.repeat(3)}-8${id.repeat(3)}-${id.repeat(12)}`,
  created_at: `2026-11-1${id}T08:00:00.000Z`,
  name: null,
  message: "",
  status: "new",
  internal_notes: "",
  source: "rating",
  tool_slug: tool[0],
  tool_name: tool[1],
  rating: stars,
  tags: [],
  ...extra,
});
const feedbackRows = [
  message,
  rating("4", ["merge-pdf", "Merge PDF"], 5, {
    tags: ["Easy to use", "Great result"],
    message: "Worked first time.",
  }),
  rating("5", ["merge-pdf", "Merge PDF"], 4),
  rating("6", ["split-pdf", "Split PDF"], 1, {
    tags: ["Speed"],
    message: "Slow on big files.",
  }),
];

function stubFetch(
  getBody: Record<string, unknown>,
  onWrite?: (init: RequestInit) => void,
) {
  const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
    if (init?.method && init.method !== "GET") {
      onWrite?.(init);
      return { ok: true, json: async () => ({ ok: true }) };
    }
    return { ok: true, json: async () => getBody };
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("rating summary", () => {
  it("averages ratings, counts each star and groups by tool, ignoring written messages", () => {
    const summary = summarizeRatings(feedbackRows as never);
    expect(summary.count).toBe(3);
    expect(summary.average).toBeCloseTo(10 / 3);
    expect(summary.distribution).toEqual([1, 0, 0, 1, 1]);
    expect(summary.low).toBe(1);
    expect(summary.tools).toEqual([
      { slug: "merge-pdf", name: "Merge PDF", count: 2, average: 4.5 },
      { slug: "split-pdf", name: "Split PDF", count: 1, average: 1 },
    ]);
    expect(summarizeRatings([message] as never)).toMatchObject({
      count: 0,
      average: null,
      tools: [],
    });
  });
});

describe("admin feedback inbox with ratings", () => {
  it("shows stars, chosen options, the tool and the summary alongside written messages", async () => {
    nav.pathname = "/admin/feedback";
    stubFetch({ data: feedbackRows, ratings_ready: true });
    render(<AdminResourceTable kind="feedback" />);
    expect(await screen.findByText("Asha Patel")).toBeTruthy();

    const table = screen.getByRole("table");
    expect(within(table).getAllByText("Merge PDF")).toHaveLength(2);
    expect(within(table).getByText("Easy to use")).toBeTruthy();
    expect(within(table).getByText("Worked first time.")).toBeTruthy();
    expect(
      within(table).getAllByRole("img", { name: "5 out of 5 stars" }),
    ).toHaveLength(1);
    expect(
      within(table).getAllByRole("img", { name: "1 out of 5 stars" }),
    ).toHaveLength(1);

    const metrics = screen.getByLabelText("feedback summary metrics");
    expect(within(metrics).getByText("Average rating")).toBeTruthy();
    expect(within(metrics).getByText("3.3")).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "Rating breakdown" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "Ratings by tool" }),
    ).toBeTruthy();
    expect(screen.queryByText(/migration has not been applied/)).toBeNull();
  });

  it("filters by source, star rating and tool", async () => {
    nav.pathname = "/admin/feedback";
    stubFetch({ data: feedbackRows, ratings_ready: true });
    render(<AdminResourceTable kind="feedback" />);
    await screen.findByText("Asha Patel");
    const table = screen.getByRole("table");

    fireEvent.change(
      screen.getByRole("combobox", { name: "Filter by feedback source" }),
      { target: { value: "rating" } },
    );
    await waitFor(() => expect(screen.queryByText("Asha Patel")).toBeNull());
    expect(within(table).getAllByText("Tool rating")).toHaveLength(3);

    fireEvent.change(
      screen.getByRole("combobox", { name: "Filter by star rating" }),
      { target: { value: "low" } },
    );
    await waitFor(() =>
      expect(within(table).getAllByText("Tool rating")).toHaveLength(1),
    );
    expect(within(table).getByText("Slow on big files.")).toBeTruthy();

    fireEvent.change(
      screen.getByRole("combobox", { name: "Filter by star rating" }),
      { target: { value: "all" } },
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Merge PDF: 4.5 out of 5 from 2 ratings. Show only this tool.",
      }),
    );
    await waitFor(() =>
      expect(within(table).getAllByText("Tool rating")).toHaveLength(2),
    );
    expect(within(table).queryByText("Slow on big files.")).toBeNull();
    expect(
      (
        screen.getByRole("combobox", {
          name: "Filter by tool",
        }) as HTMLSelectElement
      ).value,
    ).toBe("merge-pdf");
  });

  it("saves a rating's status with its source and never sends a message type", async () => {
    nav.pathname = "/admin/feedback";
    const writes: Record<string, unknown>[] = [];
    stubFetch({ data: [feedbackRows[3]], ratings_ready: true }, (init) =>
      writes.push({
        method: init.method,
        ...JSON.parse(String(init.body)),
      }),
    );
    render(<AdminResourceTable kind="feedback" />);
    await screen.findByText("Slow on big files.");
    fireEvent.click(screen.getByRole("button", { name: "View / edit" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).queryByLabelText("Feedback type")).toBeNull();
    expect(within(dialog).getByText("Speed")).toBeTruthy();
    fireEvent.change(within(dialog).getByLabelText("Status"), {
      target: { value: "resolved" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: /Save/ }));
    await waitFor(() => expect(writes).toHaveLength(1));
    expect(writes[0]).toEqual({
      method: "PATCH",
      id: feedbackRows[3].id,
      source: "rating",
      status: "resolved",
      internal_notes: "",
    });
  });

  it("explains when ratings are not being stored yet", async () => {
    nav.pathname = "/admin/feedback";
    stubFetch({ data: [message], ratings_ready: false });
    render(<AdminResourceTable kind="feedback" />);
    await screen.findByText("Asha Patel");
    expect(
      screen.getByText(/migration has not been applied/).textContent,
    ).toContain("quickkit_tool_feedback");
  });
});

describe("admin tool maintenance switch", () => {
  const tool = (overrides: Record<string, unknown> = {}) => ({
    slug: "merge-pdf",
    name: "Merge PDF",
    description: "Merge PDF description",
    category: "PDF Tools",
    icon: "tool",
    is_published: true,
    is_enabled: true,
    is_featured: false,
    seo_title: "Merge PDF",
    seo_description: "Merge PDF SEO description",
    canonical_path: "/tools/merge-pdf",
    is_indexable: true,
    route: "/tools/merge-pdf",
    maintenance_enabled: false,
    maintenance_reason: "",
    maintenance_since: null,
    ...overrides,
  });

  it("turns a tool off with the typed reason", async () => {
    nav.pathname = "/admin/tools";
    const writes: Record<string, unknown>[] = [];
    stubFetch({ data: [tool()], category_options: ["PDF Tools"] }, (init) =>
      writes.push(JSON.parse(String(init.body))),
    );
    render(<AdminResourceTable kind="tools" />);
    fireEvent.click(await screen.findByRole("button", { name: "Turn off" }));
    const dialog = await screen.findByRole("dialog", {
      name: "Turn off Merge PDF",
    });
    fireEvent.change(
      within(dialog).getByLabelText("Reason shown to visitors"),
      { target: { value: " Adding batch export. Back by 6 PM. " } },
    );
    expect(
      within(dialog).getByText("Adding batch export. Back by 6 PM.", {
        selector: "p",
      }),
    ).toBeTruthy();
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Turn tool off" }),
    );
    await waitFor(() => expect(writes).toHaveLength(1));
    expect(writes[0]).toEqual({
      slug: "merge-pdf",
      maintenance_enabled: true,
      maintenance_reason: "Adding batch export. Back by 6 PM.",
    });
  });

  it("marks a switched-off tool and turns it back on", async () => {
    nav.pathname = "/admin/tools";
    const writes: Record<string, unknown>[] = [];
    stubFetch(
      {
        data: [
          tool({
            maintenance_enabled: true,
            maintenance_reason: "Fixing exports",
            maintenance_since: "2026-11-15T04:00:00.000Z",
          }),
        ],
        category_options: ["PDF Tools"],
      },
      (init) => writes.push(JSON.parse(String(init.body))),
    );
    render(<AdminResourceTable kind="tools" />);
    expect(await screen.findByText("Off · maintenance")).toBeTruthy();
    const metrics = screen.getByLabelText("tools summary metrics");
    expect(within(metrics).getByText("Off for maintenance")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Turn on" }));
    const dialog = await screen.findByRole("dialog", {
      name: "Merge PDF is switched off",
    });
    expect(
      (
        within(dialog).getByLabelText(
          "Reason shown to visitors",
        ) as HTMLTextAreaElement
      ).value,
    ).toBe("Fixing exports");
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Turn tool back on" }),
    );
    await waitFor(() => expect(writes).toHaveLength(1));
    expect(writes[0]).toEqual({
      slug: "merge-pdf",
      maintenance_enabled: false,
    });
  });
});
