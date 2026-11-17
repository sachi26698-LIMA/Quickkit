// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import UploadProgress from "../components/upload-progress";

afterEach(cleanup);

/**
 * Progress display for the local processing tools.
 *
 * The central rule: a number appears only when the caller has a real
 * measurement. Everything else is indeterminate, with no invented percentage.
 */
describe("upload / processing progress", () => {
  it("renders nothing when idle", () => {
    const { container } = render(<UploadProgress state={{ status: "idle" }} />);
    expect(container.firstChild).toBeNull();
  });

  it("shows a real percentage when one is supplied", () => {
    render(
      <UploadProgress
        state={{ status: "working", label: "Compressing", percent: 42 }}
      />,
    );
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "42",
    );
    expect(screen.getByText("42%")).toBeInTheDocument();
  });

  it("omits the number entirely when no measurement exists", () => {
    const { container } = render(
      <UploadProgress state={{ status: "working", label: "Preparing" }} />,
    );
    const bar = screen.getByRole("progressbar");
    // No aria-valuenow, no visible percent, and the fill is the indeterminate
    // variant — a fake 0% or 100% would be a lie about work not yet done.
    expect(bar).not.toHaveAttribute("aria-valuenow");
    expect(container.textContent ?? "").not.toMatch(/\d+\s*%/u);
    expect(container.querySelector(".is-indeterminate")).toBeTruthy();
  });

  it("clamps out-of-range percentages instead of rendering nonsense", () => {
    render(
      <UploadProgress
        state={{ status: "working", label: "Working", percent: 250 }}
      />,
    );
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "100",
    );
  });

  it("treats a non-finite percentage as indeterminate", () => {
    const { container } = render(
      <UploadProgress
        state={{ status: "working", label: "Working", percent: Number.NaN }}
      />,
    );
    expect(screen.getByRole("progressbar")).not.toHaveAttribute(
      "aria-valuenow",
    );
    expect(container.querySelector(".is-indeterminate")).toBeTruthy();
  });

  it("announces success politely", () => {
    render(
      <UploadProgress
        state={{ status: "success", label: "Merged 3 PDFs", detail: "2.4 MB" }}
      />,
    );
    const region = screen.getByRole("status");
    expect(region).toHaveTextContent("Merged 3 PDFs");
    expect(region).toHaveTextContent("2.4 MB");
  });

  it("announces failure assertively and offers a retry", () => {
    const onRetry = vi.fn();
    render(
      <UploadProgress
        state={{ status: "error", label: "Could not read file", onRetry }}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Could not read file");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("reports cancellation", () => {
    const { container } = render(
      <UploadProgress state={{ status: "cancelled" }} />,
    );
    expect(container.textContent).toMatch(/Cancelled/u);
  });

  it("offers a cancel control only while working, and calls it", () => {
    const onCancel = vi.fn();
    render(
      <UploadProgress
        state={{ status: "working", label: "Merging", onCancel }}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("never renders the word 'upload' for on-device work", () => {
    // The component name is historical. What matters is the copy a visitor
    // actually sees: every one of these tools processes files locally, so the
    // rendered text must never imply a network transfer.
    const states = [
      { status: "working", label: "Preparing", percent: 40 },
      { status: "working", label: "Preparing" },
      { status: "success", label: "Done", detail: "1 MB" },
      { status: "error", label: "Failed", detail: "Corrupt" },
      { status: "cancelled" },
    ] as const;
    for (const state of states) {
      const { container, unmount } = render(
        <UploadProgress state={state as never} />,
      );
      expect(
        (container.textContent ?? "").toLowerCase(),
        JSON.stringify(state),
      ).not.toContain("upload");
      unmount();
    }
  });
});
