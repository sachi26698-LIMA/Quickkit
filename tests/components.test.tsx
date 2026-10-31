// @vitest-environment jsdom
import { afterEach, describe, it, expect, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import CopyButton from "../components/tools/copy-button";
import WordCounter from "../components/tools/word-counter";
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
describe("copy feedback", () => {
  it("disables empty output", () => {
    render(<CopyButton text="" />);
    expect(screen.getByRole("button", { name: "Copy" })).toBeDisabled();
  });
  it("copies the exact output", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    render(<CopyButton text="hello 世界" />);
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        "Copied to clipboard.",
      ),
    );
    expect(writeText).toHaveBeenCalledWith("hello 世界");
  });
  it("explains unavailable clipboard", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: undefined,
      configurable: true,
    });
    render(<CopyButton text="hello" />);
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("Copy unavailable"),
    );
  });
});
describe("word workspace", () => {
  it("updates counts and clears text", () => {
    render(<WordCounter />);
    fireEvent.change(screen.getByLabelText("Your text"), {
      target: { value: "One two three." },
    });
    expect(screen.getByText("Words").parentElement).toHaveTextContent("3Words");
    fireEvent.click(screen.getByRole("button", { name: "Clear text" }));
    expect(screen.getByLabelText("Your text")).toHaveValue("");
    expect(screen.getByText("Words").parentElement).toHaveTextContent("0Words");
  });
});
