// @vitest-environment jsdom
/**
 * A `?gtin=` deep link on the product lookup page must perform the lookup, not
 * merely fill the input. The payload is a fixture shaped like the documented
 * Open Food Facts v3.6 response, parsed by the same function the route uses; no
 * test here claims a live response.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import ProductLookup from "../components/tools/product-lookup";
import { parseProductPayload } from "../lib/tools/barcode-scanner/product-lookup";

const GTIN = "0731946697725";

const payload = {
  status: "success",
  code: GTIN,
  product: {
    product_name: "Deep link syrup",
    brands: "Example Labs",
    manufacturers: "Example Laboratories Pvt Ltd",
    ingredients_text: "Aqua, glycerin",
    nutriments: { sugars_100g: 12 },
  },
};

function jsonResponse(body: unknown) {
  return {
    ok: true,
    status: 200,
    headers: { get: () => null },
    json: async () => body,
  } as unknown as Response;
}

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => jsonResponse(parseProductPayload(GTIN, payload))),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.history.replaceState(null, "", "/tools/product-lookup");
});

describe("?gtin= deep link", () => {
  it("runs the lookup for a valid deep-linked GTIN", async () => {
    window.history.replaceState(null, "", `/tools/product-lookup?gtin=${GTIN}`);
    render(<ProductLookup />);

    expect(await screen.findByText("Deep link syrup")).toBeInTheDocument();
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain(
      `/api/product-lookup?gtin=${GTIN}`,
    );
    // The box is filled too, so the visitor can edit and re-run it.
    expect(screen.getByDisplayValue(GTIN)).toBeInTheDocument();
  });

  it("rejects an invalid deep-linked value without sending anything", async () => {
    window.history.replaceState(null, "", "/tools/product-lookup?gtin=123");
    render(<ProductLookup />);

    expect(
      await screen.findByText(/not a valid GTIN|valid GTIN/i, undefined, {
        timeout: 3000,
      }),
    ).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });
});
