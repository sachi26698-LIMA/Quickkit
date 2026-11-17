// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

const nav = vi.hoisted(() => ({
  pathname: "/",
  search: "",
  pushed: [] as string[],
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: (url: string) => nav.pushed.push(url),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => nav.pathname,
  useSearchParams: () => new URLSearchParams(nav.search),
}));

import { EXAMPLE_SEARCHES, rankTools } from "@/lib/tool-search";
import {
  clearRecentSearches,
  parseRecentSearches,
  RECENT_SEARCHES_KEY,
  rememberSearch,
} from "@/lib/use-recent-searches";
import {
  parseRecentToolSlugs,
  recordToolVisit,
  RECENT_TOOLS_KEY,
} from "@/lib/use-recent-tools";
import RecentToolsSection from "@/components/recent-tools-section";
import HeroSearch from "@/components/hero-search";
import CommandPalette from "@/components/command-palette";
import ToolExplorer from "@/components/tool-explorer";
import { toClientTools } from "@/lib/client-tool";
import { categoryMeta, tools as catalogTools } from "@/lib/catalog";

// Real catalogue entries so the fixture satisfies the literal-typed ClientTool
// union (descriptions, icon names and colour tokens are all literal unions).
const tools = toClientTools(
  catalogTools.filter((tool) =>
    ["merge-pdf", "json-formatter", "gst-calculator"].includes(tool.slug),
  ),
);
expect(tools).toHaveLength(3);

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  nav.pathname = "/";
  nav.search = "";
  nav.pushed = [];
});

describe("rankTools", () => {
  it("returns nothing for an empty query", () => {
    expect(rankTools(tools, "   ")).toEqual([]);
  });

  it("ranks name matches above description-only matches", () => {
    const ranked = rankTools(tools, "json");
    expect(ranked.map((tool) => tool.slug)).toEqual(["json-formatter"]);
    // A word taken from the real description, so the fixture can never drift
    // from the catalogue copy it exercises.
    const jsonTool = tools.find((tool) => tool.slug === "json-formatter")!;
    const word = jsonTool.description
      .split(/\s+/)
      .find((token) => token.length > 6 && !token.includes("JSON"))!;
    const byDescription = rankTools(tools, word.toLocaleLowerCase());
    expect(byDescription.map((tool) => tool.slug)).toContain("json-formatter");
  });

  it("matches by category as well as by name", () => {
    const ranked = rankTools(tools, "calculators");
    expect(ranked.map((tool) => tool.slug)).toContain("gst-calculator");
    const byCategory = rankTools(tools, "pdf tools");
    expect(byCategory.map((tool) => tool.slug)).toContain("merge-pdf");
  });
});

describe("recent searches (this browser only)", () => {
  it("parses a well-formed list and rejects junk", () => {
    expect(parseRecentSearches('["merge pdf","qr code"]')).toEqual([
      "merge pdf",
      "qr code",
    ]);
    expect(parseRecentSearches("not json")).toEqual([]);
    expect(parseRecentSearches('{"a":1}')).toEqual([]);
    expect(parseRecentSearches('[1, null, "  ", "ok"]')).toEqual(["ok"]);
  });

  it("remembers newest first, de-duplicates case-insensitively and caps at 5", () => {
    for (const q of ["a", "b", "c", "d", "e"]) rememberSearch(q);
    rememberSearch("C");
    const stored = parseRecentSearches(
      window.localStorage.getItem(RECENT_SEARCHES_KEY) ?? "[]",
    );
    expect(stored).toEqual(["C", "e", "d", "b", "a"]);
  });

  it("clears every remembered query", () => {
    rememberSearch("merge pdf");
    clearRecentSearches();
    expect(
      parseRecentSearches(
        window.localStorage.getItem(RECENT_SEARCHES_KEY) ?? "[]",
      ),
    ).toEqual([]);
  });
});

describe("recent tools (this browser only)", () => {
  it("moves a repeat visit to the front and caps the list at 6", () => {
    for (const slug of ["t1", "t2", "t3", "t4", "t5", "t6"]) {
      recordToolVisit(slug);
    }
    recordToolVisit("t2");
    const stored = parseRecentToolSlugs(
      window.localStorage.getItem(RECENT_TOOLS_KEY) ?? "[]",
    );
    expect(stored).toEqual(["t2", "t6", "t5", "t4", "t3", "t1"]);
  });
});

describe("Recently used section", () => {
  it("renders nothing when this browser has no history", () => {
    const { container } = render(<RecentToolsSection tools={tools} />);
    expect(container.querySelector(".recent-tools")).toBeNull();
  });

  it("lists remembered tools once storage holds them", () => {
    recordToolVisit("json-formatter");
    recordToolVisit("merge-pdf");
    render(<RecentToolsSection tools={tools} />);
    const section = document.querySelector(".recent-tools");
    expect(section).toBeTruthy();
    expect(screen.getByText("PDF Merger")).toBeInTheDocument();
    expect(screen.getByText("JSON Formatter")).toBeInTheDocument();
    // Newest first.
    const chips = [...document.querySelectorAll(".recent-tool-chip")];
    expect(chips[0]).toHaveTextContent("PDF Merger");
  });
});

describe("hero search seed panel", () => {
  it("offers example searches while the box is empty", () => {
    render(<HeroSearch tools={tools} />);
    const input = screen.getByRole("combobox", { name: "Search tools" });
    fireEvent.focus(input);
    for (const example of EXAMPLE_SEARCHES.slice(0, 3)) {
      expect(screen.getByText(example)).toBeInTheDocument();
    }
  });

  it("fills the input when an example chip is pressed", () => {
    render(<HeroSearch tools={tools} />);
    const input = screen.getByRole("combobox", { name: "Search tools" });
    fireEvent.focus(input);
    fireEvent.click(screen.getByText(EXAMPLE_SEARCHES[0]));
    expect(input).toHaveValue(EXAMPLE_SEARCHES[0]);
  });

  it("surfaces this browser's recent queries instead of the examples", () => {
    rememberSearch("split invoice");
    render(<HeroSearch tools={tools} />);
    fireEvent.focus(screen.getByRole("combobox", { name: "Search tools" }));
    expect(screen.getByText("split invoice")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Clear recent" }),
    ).toBeInTheDocument();
  });

  it("announces result counts through the option list", () => {
    render(<HeroSearch tools={tools} />);
    const input = screen.getByRole("combobox", { name: "Search tools" });
    fireEvent.change(input, { target: { value: "pdf" } });
    expect(screen.getByText(/tool(s)? match/)).toBeInTheDocument();
    expect(screen.getByRole("option")).toBeInTheDocument();
  });
});

describe("command palette", () => {
  it("opens with Ctrl+K on a page that has no inline search", () => {
    nav.pathname = "/tools/merge-pdf";
    render(<CommandPalette tools={tools} categories={categoryMeta} />);
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    const dialog = screen.getByRole("dialog", { name: "Search QUICKKIT" });
    expect(dialog).toBeInTheDocument();
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "json" },
    });
    expect(
      screen.getByRole("option", { name: /JSON Formatter/ }),
    ).toBeInTheDocument();
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("stays out of the way on the pages that own Ctrl+K inline", () => {
    nav.pathname = "/";
    render(<CommandPalette tools={tools} categories={categoryMeta} />);
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("All Tools explorer URL state", () => {
  it("hydrates the category filter from ?category=", () => {
    nav.pathname = "/tools";
    nav.search = "category=developer-tools";
    render(<ToolExplorer tools={tools} categoryMeta={categoryMeta} />);
    expect(
      screen.getByRole("button", { name: "Developer Tools" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("status")).toHaveTextContent("1 tools found");
  });

  it("hydrates the query from ?q= and offers a clear-filters action", () => {
    nav.pathname = "/tools";
    nav.search = "q=pdf";
    render(<ToolExplorer tools={tools} categoryMeta={categoryMeta} />);
    expect(screen.getByRole("searchbox", { name: "Search tools" })).toHaveValue(
      "pdf",
    );
    expect(screen.getByRole("status")).toHaveTextContent("1 tools found");
    fireEvent.click(screen.getByRole("button", { name: /Clear filters/ }));
    expect(screen.getByRole("status")).toHaveTextContent("3 tools found");
    expect(screen.queryByRole("button", { name: /Clear filters/ })).toBeNull();
  });
});
