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

  it("keeps the exact phrasing the browser suite asserts", () => {
    // "N tools found" is a contract with tests/e2e/developer-tools.spec.ts and
    // category-security-hydration.spec.ts. A singular-only rewrite here broke
    // three browser tests, so the literal string is pinned deliberately.
    render(<SearchStatus state="idle" query="merge" count={1} />);
    expect(screen.getByRole("status")).toHaveTextContent("1 tools found");
  });

  it("announces an empty result honestly", () => {
    render(<SearchStatus state="idle" query="zzzz" count={0} />);
    expect(screen.getByRole("status")).toHaveTextContent("No tools match");
  });

  it("renders no live region at all when there is nothing to say", () => {
    // An always-present empty live region is not harmless: it is a second
    // role="status" that makes getByRole("status") ambiguous for the browser
    // suite and gives a screen reader a stray announcement target.
    const { container } = render(
      <SearchStatus state="idle" query="   " count={0} />,
    );
    expect(screen.queryByRole("status")).toBeNull();
    expect(container.querySelector("[aria-live]")).toBeNull();
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
