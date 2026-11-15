// @vitest-environment jsdom
/**
 * The scanner's scan-to-information path.
 *
 * Typing a value by hand is the same code path the camera and the image decoder
 * feed: a decoded string goes into the result list, the identifier is classified,
 * and a GTIN is looked up automatically. The payloads below are fixtures shaped
 * like the documented Open Food Facts v3.6 response — no test here claims a live
 * lookup, and the fixture is deliberately incomplete so the missing-field
 * behaviour is exercised.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import BarcodeScanner from "../components/tools/barcode-scanner";
import { parseProductPayload } from "../lib/tools/barcode-scanner/product-lookup";

const GTIN = "0731946697725";

const payload = {
  status: "success",
  code: GTIN,
  product: {
    product_name: "Example Cough Syrup 100 ml",
    brands: "Example Labs",
    quantity: "100 ml",
    categories: "Medicines, Cough syrups",
    ingredients_text: "Aqua, glycerin, honey, citric acid",
    allergens: "en:none-declared",
    manufacturers: "Example Laboratories Pvt Ltd",
    packaging: "Carton box with glass bottle",
    origins: "India",
    countries: "India",
    generic_name: "Honey-based cough syrup",
    nutriments: { "energy-kcal_100g": 120, sugars_100g: 28 },
    last_modified_t: 1794471481,
    image_front_url:
      "https://images.openfoodfacts.org/images/products/073/194/669/7725/front.jpg",
  },
};

/** jsdom has no `Response`, so the stub answers the two members the code reads. */
function jsonResponse(body: unknown) {
  return {
    ok: true,
    status: 200,
    headers: { get: () => null },
    json: async () => body,
  } as unknown as Response;
}

/** The route's own response shape, produced by the parser the route uses. */
function routeResult(body: unknown = payload) {
  return parseProductPayload(GTIN, body);
}

function typeAndAdd(value: string) {
  fireEvent.change(screen.getByPlaceholderText("5901234123457"), {
    target: { value },
  });
  fireEvent.click(screen.getByRole("button", { name: /Add as typed value/i }));
}

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => jsonResponse(routeResult())),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("scan to information", () => {
  it("classifies the reported scan as a GTIN-13 and looks it up automatically", async () => {
    render(<BarcodeScanner />);
    typeAndAdd(GTIN);

    // Identity is shown without any network help.
    expect((await screen.findAllByText("GTIN-13")).length).toBeGreaterThan(0);
    expect(screen.getByText(/Valid — the last digit/i)).toBeInTheDocument();
    expect(screen.getByText("Decoded number")).toBeInTheDocument();
    expect(screen.getByText("Raw content")).toBeInTheDocument();

    // The lookup is fired without pressing a button, exactly once.
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain(
      `/api/product-lookup?gtin=${GTIN}`,
    );
  });

  it("renders every field the record carries", async () => {
    render(<BarcodeScanner />);
    typeAndAdd(GTIN);

    expect(
      await screen.findByText("Example Cough Syrup 100 ml"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Example Laboratories Pvt Ltd"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Carton box with glass bottle"),
    ).toBeInTheDocument();
    expect(screen.getByText("India")).toBeInTheDocument();
    expect(screen.getByText("Honey-based cough syrup")).toBeInTheDocument();
    expect(screen.getByText(/Aqua, glycerin, honey/i)).toBeInTheDocument();
    expect(screen.getByText(/en:none-declared/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Open Food Facts/).length).toBeGreaterThan(0);
  });

  it("names the fields the record does not carry instead of inventing them", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse(
          routeResult({
            status: "success",
            product: { product_name: "Sparse item" },
          }),
        ),
      ),
    );
    render(<BarcodeScanner />);
    typeAndAdd(GTIN);
    await screen.findByText("Sparse item");

    const missing = screen.getByText(/Not provided by this record/i);
    expect(missing).toBeInTheDocument();
    expect(screen.getByText("brand")).toBeInTheDocument();
    expect(screen.getByText("ingredients")).toBeInTheDocument();
    expect(screen.getByText("manufacturer")).toBeInTheDocument();
    expect(screen.getByText("packaging")).toBeInTheDocument();
    expect(screen.getByText("country of origin")).toBeInTheDocument();
  });

  it("shows the exact not-found sentence when the database has no record", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse(routeResult({ status: "failure" }))),
    );
    render(<BarcodeScanner />);
    typeAndAdd(GTIN);
    expect(
      await screen.findByText(
        /Barcode successfully decoded, but no matching product record was found/i,
      ),
    ).toBeInTheDocument();
  });

  it("reports a network failure without pretending the barcode failed", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
    );
    render(<BarcodeScanner />);
    typeAndAdd(GTIN);
    expect(await screen.findByText(/Lookup unavailable/i)).toBeInTheDocument();
    expect(
      screen.getByText(/barcode you scanned is unaffected/i),
    ).toBeInTheDocument();
  });

  it("never looks up an ordinary Code 128 value", async () => {
    render(<BarcodeScanner />);
    typeAndAdd("INV-2026-0042");
    expect((await screen.findAllByText("Decoded text")).length).toBeGreaterThan(
      0,
    );
    expect(
      screen.getAllByText(/No product lookup is attempted/i).length,
    ).toBeGreaterThan(0);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("refuses to look up a GTIN with a bad check digit", async () => {
    render(<BarcodeScanner />);
    typeAndAdd("04005808147709");
    expect(
      await screen.findByText(/check digit does not validate/i),
    ).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("shows GS1 Application Identifiers for an element string", async () => {
    render(<BarcodeScanner />);
    typeAndAdd("(01)09506000134352(17)270930(10)LOT-9");
    expect(
      (await screen.findAllByText("GS1 element string")).length,
    ).toBeGreaterThan(0);
    const table = screen.getByRole("table", {
      name: /Application Identifiers/i,
    });
    expect(within(table).getByText(/Expiry/i)).toBeInTheDocument();
    expect(within(table).getByText("LOT-9")).toBeInTheDocument();
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
  });
});
