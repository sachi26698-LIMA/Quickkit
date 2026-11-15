// @vitest-environment jsdom
/**
 * Stand-alone barcode scanner: history, GTIN lookup, the same-origin lookup
 * route, and the page's honesty statements.
 *
 * The camera path is asserted through its "not available here" branch, which is
 * the only one that exists in jsdom — no browser and no live stream is claimed.
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
import BarcodeScanner from "../components/tools/barcode-scanner";
import {
  LOOKUP_DISCLOSURE,
  PRODUCT_DATABASE,
  lookupProduct,
  normalizeGtin,
  parseProductPayload,
} from "../lib/tools/barcode-scanner/product-lookup";
import {
  MAX_SCANNER_HISTORY,
  SCANNER_HISTORY_KEY,
  addScanRecord,
  clearScanHistory,
  cleanScanValue,
  loadScanHistory,
  removeScanRecord,
  saveScanHistory,
  type ScanRecord,
} from "../lib/tools/barcode-scanner/history";

const GTIN_13 = "4006381333931"; // valid check digit
const GTIN_14 = "09501101530003"; // GS1 example
const UPC_A = "036000291452";

function memoryStorage(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));
  return {
    store,
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
  };
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("scanner history", () => {
  it("merges a repeated value instead of storing it twice", () => {
    const first = addScanRecord([], {
      value: GTIN_13,
      format: "ean13",
      label: "EAN-13",
      source: "camera",
      at: "2026-11-13T10:00:00.000Z",
      id: "a",
    });
    expect(first).toHaveLength(1);
    const second = addScanRecord(first, {
      value: GTIN_13,
      format: "ean13",
      label: "EAN-13",
      source: "image",
      at: "2026-11-13T11:00:00.000Z",
    });
    expect(second).toHaveLength(1);
    expect(second[0].count).toBe(2);
    expect(second[0].at).toBe("2026-11-13T11:00:00.000Z");
    expect(second[0].source).toBe("image");
  });

  it("keeps the same digits in two formats apart", () => {
    const records = addScanRecord([], {
      value: "12345670",
      format: "ean8",
      label: "EAN-8",
      source: "camera",
      id: "1",
    });
    const next = addScanRecord(records, {
      value: "12345670",
      format: "code128",
      label: "Code 128",
      source: "camera",
      id: "2",
    });
    expect(next).toHaveLength(2);
  });

  it("caps the list and drops empty values", () => {
    let records: ScanRecord[] = [];
    for (let index = 0; index < MAX_SCANNER_HISTORY + 5; index += 1)
      records = addScanRecord(records, {
        value: `VALUE-${index}`,
        format: "code128",
        label: "Code 128",
        source: "camera",
        id: `id-${index}`,
      });
    expect(records).toHaveLength(MAX_SCANNER_HISTORY);
    expect(
      addScanRecord(records, {
        value: "   ",
        format: "code128",
        label: "Code 128",
        source: "camera",
      }),
    ).toHaveLength(MAX_SCANNER_HISTORY);
  });

  it("round-trips through storage and ignores corrupt entries", () => {
    const storage = memoryStorage();
    const records = addScanRecord([], {
      value: GTIN_14,
      format: "itf14",
      label: "ITF-14",
      source: "image",
      id: "x",
    });
    saveScanHistory(storage, records);
    expect(loadScanHistory(storage)).toEqual(records);

    storage.setItem(SCANNER_HISTORY_KEY, "{not json");
    expect(loadScanHistory(storage)).toEqual([]);

    storage.setItem(
      SCANNER_HISTORY_KEY,
      JSON.stringify([{ id: "1", value: "x" }, records[0]]),
    );
    expect(loadScanHistory(storage)).toEqual(records);

    clearScanHistory(storage);
    expect(loadScanHistory(storage)).toEqual([]);
    expect(removeScanRecord(records, "x")).toEqual([]);
  });

  it("strips control characters but keeps the rest of the value", () => {
    expect(cleanScanValue("A\u0000B\u001dC")).toBe("ABC");
    expect(cleanScanValue("x".repeat(10), 4)).toBe("xxxx");
  });
});

describe("GTIN validation and product lookup", () => {
  it("accepts only real GTIN lengths with a valid check digit", () => {
    expect(normalizeGtin(GTIN_13)).toBe(GTIN_13);
    expect(normalizeGtin(` ${GTIN_14} `)).toBe(GTIN_14);
    expect(normalizeGtin(UPC_A)).toBe(UPC_A);
    expect(normalizeGtin("4006381333932")).toBeNull(); // wrong check digit
    expect(normalizeGtin("1234567")).toBeNull(); // unsupported length
    expect(normalizeGtin("ABCDEFGH")).toBeNull();
  });

  it("maps a found record without inventing fields", () => {
    const result = parseProductPayload(GTIN_13, {
      status: 1,
      product: {
        product_name: "Gentle Cleanser",
        brands: "Example Brand, Second Brand",
        quantity: "200 ml",
        categories: "Cosmetics, Face wash",
        last_modified_t: 1_700_000_000,
      },
    });
    expect(result.status).toBe("found");
    if (result.status !== "found") return;
    expect(result.product.name).toBe("Gentle Cleanser");
    expect(result.product.brands).toEqual(["Example Brand", "Second Brand"]);
    expect(result.product.manufacturerVerified).toBe(false);
    expect(result.product.sourceUrl).toContain(GTIN_13);
    expect(result.product.disclosure).toBe(LOOKUP_DISCLOSURE);
    expect(result.product.lastModified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("reports not-found honestly", () => {
    expect(parseProductPayload(GTIN_13, { status: 0 }).status).toBe(
      "not-found",
    );
    // A record with no name and no brand is not a match worth showing.
    expect(
      parseProductPayload(GTIN_13, { status: 1, product: {} }).status,
    ).toBe("not-found");
    expect(parseProductPayload(GTIN_13, null).status).toBe("error");
  });

  it("turns transport failures into described results", async () => {
    const notFound = await lookupProduct(GTIN_13, {
      fetchImpl: (async () =>
        new Response("", { status: 404 })) as typeof fetch,
    });
    expect(notFound.status).toBe("not-found");

    const broken = await lookupProduct(GTIN_13, {
      fetchImpl: (async () =>
        new Response("", { status: 503 })) as typeof fetch,
    });
    expect(broken.status).toBe("error");

    const offline = await lookupProduct(GTIN_13, {
      fetchImpl: (async () => {
        throw new Error("network down");
      }) as typeof fetch,
    });
    expect(offline.status).toBe("error");
    if (offline.status === "error")
      expect(offline.message).toMatch(/network down/);

    const invalid = await lookupProduct("not-a-gtin", {
      fetchImpl: (async () =>
        new Response("", { status: 200 })) as typeof fetch,
    });
    expect(invalid.status).toBe("invalid");
  });

  it("names a community database, not a manufacturer", () => {
    expect(PRODUCT_DATABASE.kind).toBe("community");
    expect(LOOKUP_DISCLOSURE).toMatch(/not manufacturer-verified/i);
  });
});

describe("product lookup route", () => {
  async function callRoute(query: string) {
    vi.resetModules();
    const { GET } = await import("../app/api/product-lookup/route");
    return GET(
      new Request(`https://quickkit.test/api/product-lookup?${query}`),
    );
  }

  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("rejects a bad GTIN before any network call", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const response = await callRoute("gtin=123");
    expect(response.status).toBe(400);
    const body = (await response.json()) as { status: string };
    expect(body.status).toBe("invalid");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns a found record with a cacheable response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          status: 1,
          product: {
            product_name: "Shampoo",
            brands: "Example",
            quantity: "250 ml",
          },
        }),
      })),
    );
    const response = await callRoute(`gtin=${GTIN_13}`);
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toMatch(/max-age=3600/);
    const body = (await response.json()) as {
      status: string;
      product?: { name: string };
    };
    expect(body.status).toBe("found");
    expect(body.product?.name).toBe("Shampoo");
  });

  it("returns not-found for an unknown number and does not cache upstream failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({ status: 0 }),
      })),
    );
    const missing = await callRoute(`gtin=${GTIN_13}`);
    expect(missing.status).toBe(200);
    expect(((await missing.json()) as { status: string }).status).toBe(
      "not-found",
    );

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) })),
    );
    const broken = await callRoute(`gtin=${GTIN_13}`);
    expect(broken.status).toBe(502);
    expect(broken.headers.get("Cache-Control")).toBe("no-store");
  });
});

describe("scanner page", () => {
  it("states what a barcode does not contain", () => {
    render(<BarcodeScanner />);
    expect(
      screen.getByText("A barcode is not an expiry date"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /does\s+not contain the batch, the manufacture date, the expiry date/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "batch code checker" }),
    ).toHaveAttribute("href", "/tools/batch-code-checker");
    // Nothing is scanned yet, and the page does not pretend otherwise.
    expect(screen.getByText(/Nothing scanned yet/i)).toBeInTheDocument();
  });

  it("switches between camera and image upload without a stream", () => {
    render(<BarcodeScanner />);
    expect(
      screen.getByRole("button", { name: /Start camera/ }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: /Image upload/ }));
    expect(
      screen.getByText(/Choose images or drop them here/i),
    ).toBeInTheDocument();
  });

  it("explains a missing camera instead of failing silently", async () => {
    render(<BarcodeScanner />);
    fireEvent.click(screen.getByRole("button", { name: /Start camera/ }));
    const alert = await waitFor(() => screen.getByRole("alert"));
    expect(alert.textContent).toMatch(/camera/i);
    expect(alert.textContent).toMatch(/secure|unavailable|not available/i);
  });

  it("keeps history off when the visitor opts out", () => {
    window.localStorage.clear();
    render(<BarcodeScanner />);
    const toggle = screen.getByRole("checkbox", { name: /Remember scans/i });
    expect(toggle).toBeChecked();
    fireEvent.click(toggle);
    expect(toggle).not.toBeChecked();
    expect(window.localStorage.getItem(`${SCANNER_HISTORY_KEY}:enabled`)).toBe(
      "false",
    );
  });
});
