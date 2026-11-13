// @vitest-environment jsdom
/**
 * Barcode studio UI wiring.
 *
 * These run the real engine inside jsdom: typing re-encodes, an invalid value
 * surfaces the exact rule that failed and withdraws the preview, a colour change
 * reaches the SVG, and the lazy Scanner/Bulk panels mount with their controls.
 * No browser is required, which is also why the camera path is asserted through
 * the "not available here" branch rather than a live stream.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import BarcodeStudio from "../components/tools/barcode-studio";

beforeEach(() => {
  // Settings persist to local storage by design; each test starts from the
  // shipped defaults so one case cannot leak an invalid value into the next.
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function pickFormat(name: string) {
  const group = screen.getByRole("radiogroup", { name: "Barcode format" });
  const button = Array.from(group.querySelectorAll("[role='radio']")).find(
    (node) => node.textContent?.includes(name),
  );
  if (!button) throw new Error(`No format radio for ${name}`);
  fireEvent.click(button);
}

function previewImage() {
  return screen.getByRole("img", {
    name: /barcode encoding/i,
  }) as HTMLImageElement;
}

describe("barcode studio — generator", () => {
  it("draws a live preview of the default Code 128 symbol", async () => {
    render(<BarcodeStudio />);
    const image = await waitFor(() => previewImage());
    expect(image.getAttribute("src")).toMatch(/^data:image\/svg\+xml/);
    expect(screen.getByText(/Code 128 · .* modules/)).toBeInTheDocument();
    expect(screen.getByText("Symbol")).toBeInTheDocument();
    expect(screen.getByText("Quiet zone")).toBeInTheDocument();
    expect(screen.getByText("Narrow bar")).toBeInTheDocument();
  });

  it("refuses an invalid value, names the rule, and removes the preview", async () => {
    render(<BarcodeStudio />);
    await waitFor(() => previewImage());
    pickFormat("EAN-13");
    const input = screen.getByLabelText("Barcode data") as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: "59012341234" } });
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("12 digits");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(screen.queryByRole("img", { name: /barcode encoding/i })).toBeNull();
    expect(screen.getByText(/Nothing to draw yet/)).toBeInTheDocument();
  });

  it("calculates the missing check digit and keeps the export buttons live", async () => {
    render(<BarcodeStudio />);
    await waitFor(() => previewImage());
    pickFormat("EAN-13");
    const input = screen.getByLabelText("Barcode data") as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: "590123412345" } });
    await screen.findByText(/Check digit 7 was calculated/);
    expect(
      screen.getByRole("img", {
        name: /EAN-13 barcode encoding 5901234123457/,
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^PNG$/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /^SVG$/i })).toBeEnabled();
    fireEvent.change(input, { target: { value: "5901234123458" } });
    expect((await screen.findByRole("alert")).textContent).toContain(
      "should be 7",
    );
    expect(screen.getByRole("button", { name: /^PNG$/i })).toBeDisabled();
  });

  it("moves the bar colour into the rendered SVG", async () => {
    render(<BarcodeStudio />);
    const before = (await waitFor(() => previewImage())).getAttribute("src");
    fireEvent.click(screen.getByText("Colours"));
    const hex = screen.getByLabelText("Bar colour hex value");
    fireEvent.change(hex, { target: { value: "#7f1d1d" } });
    const after = await waitFor(() => {
      const src = previewImage().getAttribute("src")!;
      expect(src).not.toBe(before);
      return src;
    });
    expect(decodeURIComponent(after!.split(",")[1])).toContain("#7f1d1d");
    expect(screen.getByText(/Contrast [\d.]+:1/)).toBeInTheDocument();
  });

  it("warns when the bars are lighter than the background", async () => {
    render(<BarcodeStudio />);
    await waitFor(() => previewImage());
    fireEvent.click(screen.getByText("Colours"));
    fireEvent.change(screen.getByLabelText("Bar colour hex value"), {
      target: { value: "#f8fafc" },
    });
    expect(await screen.findByText(/below 4.5:1/)).toBeInTheDocument();
    // Light bars on a dark field are the dangerous case: scanners refuse them.
    fireEvent.change(screen.getByLabelText("Background colour hex value"), {
      target: { value: "#111827" },
    });
    expect(await screen.findByText(/inverted symbol/)).toBeInTheDocument();
  });

  it("fills the field from the example chip", async () => {
    render(<BarcodeStudio />);
    await waitFor(() => previewImage());
    pickFormat("Pharmacode");
    fireEvent.click(screen.getByRole("button", { name: /Try \d+/ }));
    expect(
      (screen.getByLabelText("Barcode data") as HTMLTextAreaElement).value,
    ).toMatch(/^\d{3,6}$/);
  });
});

describe("barcode studio — tabs", () => {
  it("switches modes with the keyboard and mounts the lazy panels", async () => {
    render(<BarcodeStudio />);
    await waitFor(() => previewImage());
    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((tab) => tab.textContent?.trim())).toEqual([
      "Generator",
      "Scanner",
      "Bulk (CSV)",
    ]);
    fireEvent.keyDown(tabs[0], { key: "ArrowRight" });
    await waitFor(() =>
      expect(screen.getByRole("tab", { name: /Scanner/ })).toHaveAttribute(
        "aria-selected",
        "true",
      ),
    );
    expect(
      await screen.findByRole("button", { name: /Start camera/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/camera stays off until you press Start/i),
    ).toBeInTheDocument();
  });

  it("explains a missing camera instead of throwing", async () => {
    render(<BarcodeStudio />);
    await waitFor(() => previewImage());
    fireEvent.click(screen.getByRole("tab", { name: /Scanner/ }));
    fireEvent.click(
      await screen.findByRole("button", { name: /Start camera/i }),
    );
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/camera/i);
    // Nothing was requested: there is no stream to leak and no error boundary trap.
    expect(screen.queryByRole("button", { name: /Stop/i })).toBeNull();
  });

  it("opens the bulk workspace with its CSV controls", async () => {
    render(<BarcodeStudio />);
    await waitFor(() => previewImage());
    fireEvent.click(screen.getByRole("tab", { name: /Bulk/ }));
    expect(
      await screen.findByRole(
        "button",
        { name: /CSV template/i },
        { timeout: 5000 },
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Choose a CSV or drop it here/i),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/1,000/).length).toBeGreaterThan(0);
  });
});
