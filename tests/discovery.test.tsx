// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { ToolExplorer } from "../components/tools/tool-explorer";
import { ToolCard } from "../components/tools/tool-card";
import { tools } from "../lib/catalog";

afterEach(cleanup);

const cards = () => document.querySelectorAll(".tool-card");

describe("tool explorer", () => {
  it("renders every tool as a link to its own route", () => {
    render(<ToolExplorer />);
    expect(cards()).toHaveLength(tools.length);
    for (const tool of tools) {
      expect(
        screen.getByRole("link", { name: new RegExp(tool.name) }),
      ).toHaveAttribute("href", `/tools/${tool.slug}`);
    }
  });

  it("filters live while typing and reports the count", () => {
    render(<ToolExplorer />);
    fireEvent.change(screen.getByLabelText("Search tools"), {
      target: { value: "json" },
    });
    expect(cards()).toHaveLength(1);
    expect(screen.getByRole("status")).toHaveTextContent("1 of 6 tools");
  });

  it("searches description and keyword text, not just names", () => {
    render(<ToolExplorer />);
    const input = screen.getByLabelText("Search tools");
    fireEvent.change(input, { target: { value: "crypto" } });
    expect(screen.getByText("Password Generator")).toBeInTheDocument();
    fireEvent.change(input, { target: { value: "webp" } });
    expect(screen.getByText("Image Compressor")).toBeInTheDocument();
  });

  it("clears the query with Escape", () => {
    render(<ToolExplorer />);
    const input = screen.getByLabelText("Search tools");
    fireEvent.change(input, { target: { value: "qr" } });
    expect(cards()).toHaveLength(1);
    fireEvent.keyDown(input, { key: "Escape" });
    expect(cards()).toHaveLength(tools.length);
  });

  it("clears the query with the clear button", () => {
    render(<ToolExplorer />);
    fireEvent.change(screen.getByLabelText("Search tools"), {
      target: { value: "qr" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
    expect(
      (screen.getByLabelText("Search tools") as HTMLInputElement).value,
    ).toBe("");
    expect(cards()).toHaveLength(tools.length);
  });

  it("filters by category and marks the active chip", () => {
    render(<ToolExplorer />);
    const textChip = screen.getByRole("button", { name: "Text" });
    fireEvent.click(textChip);
    expect(textChip).toHaveAttribute("aria-pressed", "true");
    expect(cards()).toHaveLength(2);
    expect(screen.getByText("Word Counter")).toBeInTheDocument();
    expect(screen.queryByText("JSON Formatter")).not.toBeInTheDocument();
  });

  it("shows an actionable empty state and restores the catalog", () => {
    render(<ToolExplorer />);
    fireEvent.change(screen.getByLabelText("Search tools"), {
      target: { value: "pdf merge" },
    });
    expect(cards()).toHaveLength(0);
    expect(screen.getByText("No tools found")).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Clear search & filters" }),
    );
    expect(cards()).toHaveLength(tools.length);
  });

  it("combines the category and the search query", () => {
    render(<ToolExplorer />);
    fireEvent.click(screen.getByRole("button", { name: "Developer" }));
    fireEvent.change(screen.getByLabelText("Search tools"), {
      target: { value: "password" },
    });
    expect(cards()).toHaveLength(0);
  });
});

describe("tool card", () => {
  it("exposes the tool name, description and route", () => {
    render(<ToolCard tool={tools[0]} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", `/tools/${tools[0].slug}`);
    expect(
      within(link).getByRole("heading", { name: tools[0].name }),
    ).toBeInTheDocument();
    expect(link).toHaveTextContent(tools[0].description);
  });
});
