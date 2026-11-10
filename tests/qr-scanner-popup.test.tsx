// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  within,
} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import QRCode from "qrcode";
import ScanRedirectModal from "../components/tools/qr-scanner/redirect-modal";
import ResultsPanel from "../components/tools/qr-scanner/results-panel";
import {
  useScanner,
  type ScanItem,
  type ScannerApi,
} from "../components/tools/qr-scanner/use-scanner";
import { defaultSettings } from "../lib/tools/qr-scanner/settings";
import type { DecodedSymbol, Raster } from "../lib/tools/qr-scanner/types";

afterEach(cleanup);

function makeSymbol(data: string): DecodedSymbol {
  return {
    data,
    bytes: new TextEncoder().encode(data),
    version: 3,
    errorCorrection: null,
    corners: {
      topLeft: { x: 10, y: 10 },
      topRight: { x: 110, y: 10 },
      bottomRight: { x: 110, y: 110 },
      bottomLeft: { x: 10, y: 110 },
    },
    pass: "original",
    inverted: false,
  };
}

function makeItem(payloads: string[], sourceName = "1000204501.png"): ScanItem {
  return {
    id: "scan-1",
    sourceName,
    sourceBytes: 337_203,
    scannedAt: Date.UTC(2026, 10, 10, 16, 12, 56),
    symbols: payloads.map(makeSymbol),
    attempts: ["original: decoded"],
    durationMs: 184,
    failure: null,
    imageUrl: null,
    imageWidth: 2000,
    imageHeight: 2000,
  };
}

function makeStubApi(results: ScanItem[], openPopup = vi.fn()): ScannerApi {
  return {
    ready: true,
    settings: defaultSettings,
    updateSettings: vi.fn(),
    results,
    popupItem: results[0] ?? null,
    openPopup,
    closePopup: vi.fn(),
    selected: new Set<string>(),
    toggleSelected: vi.fn(),
    selectAll: vi.fn(),
    removeResult: vi.fn(),
    clearResults: vi.fn(),
    history: [],
    visibleHistory: [],
    historyQuery: "",
    setHistoryQuery: vi.fn(),
    historyType: "all",
    setHistoryType: vi.fn(),
    historySort: "newest",
    setHistorySort: vi.fn(),
    deleteHistoryRecords: vi.fn(),
    wipeHistory: vi.fn(),
    flash: null,
    setFlash: vi.fn(),
    announce: vi.fn(),
    busy: false,
    scanFile: vi.fn(),
    scanRasterAndCommit: vi.fn(),
    decodeOnly: vi.fn(),
    commitDecoded: vi.fn(),
    isDuplicate: vi.fn(),
    checkDuplicate: vi.fn(),
  };
}

describe("ScanRedirectModal & ResultsPanel redirect upgrade", () => {
  it("opens a modal popup showing all QR data plus a clickable redirect link to the source", () => {
    const url = "https://biocraft-bice.vercel.app/";
    const item = makeItem([url]);
    const onClose = vi.fn();

    render(<ScanRedirectModal item={item} onClose={onClose} flash={vi.fn()} />);

    const dialog = screen.getByRole("dialog", {
      name: /QR Code Scanned — Redirect Ready/i,
    });
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getAllByText("Website URL").length).toBeGreaterThan(
      0,
    );
    expect(
      within(dialog).getAllByText("biocraft-bice.vercel.app").length,
    ).toBeGreaterThan(0);

    const redirectLine = dialog.querySelector("a.scanner-redirect-line");
    expect(redirectLine).not.toBeNull();
    expect(redirectLine).toHaveAttribute("href", url);
    expect(redirectLine).toHaveAttribute("target", "_blank");
    expect(redirectLine).toHaveAttribute(
      "rel",
      expect.stringContaining("noopener"),
    );

    const ctaLinks = within(dialog).getAllByRole("link", {
      name: /Open source link/i,
    });
    expect(ctaLinks[0]).toHaveAttribute("href", url);

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("supports switching between multiple decoded QR codes inside the popup", () => {
    const item = makeItem([
      "https://biocraft-bice.vercel.app/",
      "mailto:contact@example.org?subject=Support",
    ]);
    render(<ScanRedirectModal item={item} onClose={vi.fn()} flash={vi.fn()} />);

    const dialog = screen.getByRole("dialog");
    expect(dialog.querySelector("a.scanner-redirect-line")).toHaveAttribute(
      "href",
      "https://biocraft-bice.vercel.app/",
    );

    fireEvent.click(
      within(dialog).getByRole("tab", { name: /#2 Email address/i }),
    );
    expect(
      dialog.querySelector("a.scanner-redirect-line")?.getAttribute("href"),
    ).toContain("mailto:contact%40example.org");
  });

  it("masks Wi-Fi passwords in the popup by default and lets the user reveal them", () => {
    const item = makeItem(["WIFI:S:OfficeWiFi;T:WPA;P:SuperSecret99;;"]);
    render(<ScanRedirectModal item={item} onClose={vi.fn()} flash={vi.fn()} />);

    const dialog = screen.getByRole("dialog");
    const fields = dialog.querySelector(".scanner-popup-fields")!;
    expect(fields.textContent).toContain("OfficeWiFi");
    expect(fields.textContent).not.toContain("SuperSecret99");

    fireEvent.click(
      within(dialog).getByRole("button", { name: /Show sensitive fields/i }),
    );
    expect(fields.textContent).toContain("SuperSecret99");
  });

  it("renders a clickable redirect line inside ResultsPanel and blocks high-risk lookalikes", () => {
    const safeUrl = "https://biocraft-bice.vercel.app/";
    const phishUrl = "https://paypa1.com/verify";
    const openPopup = vi.fn();
    const safeItem = makeItem([safeUrl], "safe.png");
    const phishItem = {
      ...makeItem([phishUrl], "phish.png"),
      id: "scan-2",
    };

    const { container } = render(
      <ResultsPanel api={makeStubApi([safeItem, phishItem], openPopup)} />,
    );

    const cards = container.querySelectorAll(".scanner-symbol");
    expect(cards).toHaveLength(2);

    // Safe URL card has direct clickable redirect line + Open source link CTA
    const safeRedirect = cards[0].querySelector("a.scanner-redirect-line");
    expect(safeRedirect).not.toBeNull();
    expect(safeRedirect).toHaveAttribute("href", safeUrl);

    fireEvent.click(
      within(cards[0] as HTMLElement).getByRole("button", {
        name: /Redirect popup/i,
      }),
    );
    expect(openPopup).toHaveBeenCalledWith(safeItem);

    // High-risk lookalike card has NO clickable redirect line and disables opening
    expect(cards[1].querySelector("a.scanner-redirect-line")).toBeNull();
    expect(cards[1].querySelector(".scanner-open .secondary")).toBeDisabled();
    expect(cards[1].querySelector(".scanner-open-blocked")).not.toBeNull();
  });

  it("useScanner opens popupItem automatically on upload & camera decode when popupOnScan is enabled", async () => {
    const qr = QRCode.create("https://biocraft-bice.vercel.app/", {
      errorCorrectionLevel: "M",
    });
    const modules = qr.modules.size;
    const margin = 4;
    const total = modules + margin * 2;
    const size = 320;
    const rgba = new Uint8ClampedArray(size * size * 4);
    for (let y = 0; y < size; y += 1) {
      const row = Math.floor((y * total) / size) - margin;
      for (let x = 0; x < size; x += 1) {
        const col = Math.floor((x * total) / size) - margin;
        const on =
          row >= 0 && col >= 0 && row < modules && col < modules
            ? qr.modules.get(row, col) === 1
            : false;
        const v = on ? 0 : 255;
        const offset = (y * size + x) * 4;
        rgba[offset] = v;
        rgba[offset + 1] = v;
        rgba[offset + 2] = v;
        rgba[offset + 3] = 255;
      }
    }
    const raster: Raster = { width: size, height: size, rgba };

    const { result } = renderHook(() => useScanner());

    await act(async () => {
      await result.current.scanRasterAndCommit(raster, {
        sourceName: "1000204501.png",
        openPopup: true,
      });
    });

    expect(result.current.popupItem).not.toBeNull();
    expect(result.current.popupItem?.sourceName).toBe("1000204501.png");
    expect(result.current.popupItem?.symbols[0].data).toBe(
      "https://biocraft-bice.vercel.app/",
    );

    act(() => {
      result.current.closePopup();
    });
    expect(result.current.popupItem).toBeNull();

    // Camera decode also opens popup
    const decoded = await result.current.decodeOnly(raster, {
      profile: "frame",
    });
    act(() => {
      result.current.commitDecoded(raster, decoded, {
        sourceName: "Camera capture",
        openPopup: true,
      });
    });
    expect(result.current.popupItem?.sourceName).toBe("Camera capture");
  });
});
