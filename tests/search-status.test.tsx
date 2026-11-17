// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import SearchStatus from "../components/search-status";

afterEach(cleanup);

/**
 * The search status row.
 *
 * The rule these enforce is the honesty requirement: QUICKKIT search is local,
 * so the UI must never claim a percentage or a request that did not happen.
 */
describe("search status", () => {
  it("announces a genuine pending state", () => {
    render(<SearchStatus state="busy" query="pdf" count={0} />);
    expect(screen.getByRole("status")).toHaveTextContent("Searching");
  });

  it("announces the result count when finished", () => {
    render(<SearchStatus state="idle" query="pdf" count={4} />);
    expect(screen.getByRole("status")).toHaveTextContent("4 tools found");
  });

  it("uses the singular for one result", () => {
    render(<SearchStatus state="idle" query="merge" count={1} />);
    expect(screen.getByRole("status")).toHaveTextContent("1 tool found");
  });

  it("announces an empty result honestly", () => {
    render(<SearchStatus state="idle" query="zzzz" count={0} />);
    expect(screen.getByRole("status")).toHaveTextContent("No tools match");
  });

  it("says nothing when there is no query", () => {
    render(<SearchStatus state="idle" query="   " count={0} />);
    expect(screen.getByRole("status")).toHaveTextContent("");
  });

  it("surfaces a catalogue load failure instead of spinning forever", () => {
    render(<SearchStatus state="error" query="pdf" count={0} />);
    expect(screen.getByRole("status")).toHaveTextContent("could not load");
  });

  it("never renders a percentage anywhere", () => {
    for (const state of ["idle", "busy", "error"] as const) {
      const { container, unmount } = render(
        <SearchStatus state={state} query="pdf" count={2} />,
      );
      expect(container.textContent ?? "").not.toMatch(/\d+\s*%/u);
      unmount();
    }
  });

  it("renders a visible row only for busy and error", () => {
    const busy = render(<SearchStatus state="busy" query="pdf" count={0} />);
    expect(busy.container.querySelector(".search-status")).toBeTruthy();
    busy.unmount();

    const idle = render(<SearchStatus state="idle" query="pdf" count={2} />);
    expect(idle.container.querySelector(".search-status")).toBeNull();
    idle.unmount();
  });

  it("marks the visible row decorative so it is not announced twice", () => {
    const { container } = render(
      <SearchStatus state="busy" query="pdf" count={0} />,
    );
    expect(container.querySelector(".search-status")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });
});

describe("useToolSearch exposes real states", () => {
  it("reports loading, ready and error rather than a silent failure", async () => {
    const source = await import("node:fs").then((m) =>
      m.readFileSync("lib/use-tool-search.ts", "utf8"),
    );
    // The hook used to infer "still loading" from `filter === null`, so a failed
    // download looked identical to a slow one and the UI said "Searching…"
    // forever. The rejection must be handled and surfaced.
    expect(source).toMatch(/\.catch\(/u);
    expect(source).toMatch(/setStatus\("error"\)/u);
    expect(source).toMatch(/setStatus\("loading"\)/u);
  });
});
