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
import ImageResizer from "../components/tools/image-resizer";
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

describe("image resizer workspace", () => {
  it("starts empty with a safe disabled resize action", async () => {
    render(<ImageResizer />);
    expect(
      await screen.findByRole("heading", {
        name: "Resize anything. Keep the detail.",
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: /Resize images/ }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: /Download ZIP/ })).toBeDisabled();
    expect(screen.getByLabelText("Add images")).toHaveAttribute(
      "accept",
      "image/jpeg,image/png,image/webp,image/avif",
    );
  });

  it("switches between dimension, percentage and preset controls", async () => {
    render(<ImageResizer />);
    expect(screen.getByLabelText("Width (px)")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: /Percentage/ }));
    expect(screen.getByLabelText("Scale percentage")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Scale percentage"), {
      target: { value: "25" },
    });
    expect(screen.getByLabelText("Scale percentage")).toHaveValue(25);
    expect(screen.getByRole("button", { name: "50%" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    fireEvent.click(screen.getByRole("radio", { name: /Presets/ }));
    expect(
      screen.getByRole("radio", { name: /Instagram story/ }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: /Instagram story/ }));
    expect(
      screen.getByRole("radio", { name: /Instagram story/ }),
    ).toBeChecked();
    expect(
      screen.getByRole("radio", { name: /Instagram post/ }),
    ).not.toBeChecked();
  });

  it("switches to the edit tab and exposes crop, rotation and colour controls", async () => {
    render(<ImageResizer />);
    fireEvent.click(screen.getByRole("tab", { name: /Edit/ }));
    expect(
      screen.getByText("Add an image to unlock cropping, rotation, flips and colour adjustments."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Undo/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Redo/ })).toBeDisabled();
    expect(screen.getByRole("tab", { name: /Edit/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: /Resize/ })).toHaveAttribute(
      "aria-selected",
      "false",
    );
    fireEvent.click(screen.getByRole("tab", { name: /Resize/ }));
    expect(screen.getByLabelText("Width (px)")).toHaveValue(1920);
  });

  it("rejects invalid DPI and print sizes without crashing", async () => {
    render(<ImageResizer />);
    fireEvent.click(screen.getByText(/DPI & print size/));
    const dpi = screen.getByLabelText("DPI (print resolution)");
    fireEvent.change(dpi, { target: { value: "10" } });
    fireEvent.click(
      screen.getByRole("button", { name: "Use print size as pixels" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "between 36 and 1,200",
    );
  });

  it("toggles the aspect lock and output format controls", async () => {
    render(<ImageResizer />);
    const lock = screen.getByRole("button", {
      name: "Unlock aspect ratio",
    });
    expect(lock).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(lock);
    expect(
      screen.getByRole("button", { name: "Lock aspect ratio" }),
    ).toHaveAttribute("aria-pressed", "false");
    const quality = screen.getByLabelText(/^Quality/);
    expect(quality).toBeEnabled();
    fireEvent.change(screen.getByLabelText("Output format"), {
      target: { value: "image/png" },
    });
    expect(quality).toBeDisabled();
    expect(screen.getByLabelText("Output format")).toHaveValue("image/png");
  });
});
