/**
 * GTIN → product lookup against Open Food Facts.
 *
 * Three things this module refuses to do:
 *   - call the third party without the visitor asking (the UI gates it behind a
 *     button, because the GTIN leaves the device when it runs);
 *   - present a community database record as manufacturer-verified data;
 *   - show a name, brand or category that is not in the response.
 *
 * The request is made server-side by `/api/product-lookup`, so the browser
 * never talks to a third-party host and the site's Content-Security-Policy does
 * not need widening.
 */
import { gtinCheckOk } from "@/lib/tools/barcode/checksums";

export const PRODUCT_DATABASE = {
  name: "Open Food Facts",
  url: "https://world.openfoodfacts.org",
  licence: "ODbL 1.0",
  kind: "community" as const,
  note: "A collaborative public database. Records are contributed by volunteers, not verified by the manufacturer.",
};

export const LOOKUP_DISCLOSURE =
  "A product-database match confirms only that someone recorded this GTIN. It is not manufacturer-verified, and it says nothing about the batch, date, expiry or authenticity of the pack in your hand.";

export type ProductRecord = {
  gtin: string;
  name: string;
  brands: string[];
  quantity: string | null;
  categories: string[];
  lastModified: string | null;
  sourceName: string;
  sourceUrl: string;
  licence: string;
  /** Always false: this data never comes from the manufacturer. */
  manufacturerVerified: false;
  disclosure: string;
};

export type LookupResult =
  | { status: "found"; product: ProductRecord }
  | { status: "not-found"; message: string }
  | { status: "invalid"; message: string }
  | { status: "error"; message: string };

/** 8/12/13/14 digits with a correct GTIN check digit. */
export function normalizeGtin(raw: string): string | null {
  const digits = raw.trim().replace(/[\s-]/g, "");
  if (!/^\d{8}$|^\d{12,14}$/.test(digits)) return null;
  return gtinCheckOk(digits) ? digits : null;
}

function text(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.replace(/\s+/g, " ").trim();
  return trimmed ? trimmed.slice(0, 200) : null;
}

function list(value: unknown): string[] {
  if (typeof value !== "string") return [];
  return value
    .split(",")
    .map((entry) => entry.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, 8)
    .map((entry) => entry.slice(0, 80));
}

/** Turn an Open Food Facts v2 payload into a `LookupResult`, defensively. */
export function parseProductPayload(
  gtin: string,
  payload: unknown,
): LookupResult {
  if (!payload || typeof payload !== "object")
    return {
      status: "error",
      message: "The product database returned an unreadable response.",
    };

  const body = payload as { status?: unknown; product?: unknown };
  const product =
    body.product && typeof body.product === "object"
      ? (body.product as Record<string, unknown>)
      : null;

  if (body.status === 0 || !product)
    return {
      status: "not-found",
      message: `No record for GTIN ${gtin} in ${PRODUCT_DATABASE.name}. That is the common result — plenty of cosmetics are not in a food-oriented database.`,
    };

  const name = text(product.product_name) ?? text(product.generic_name);
  const brands = list(product.brands);
  if (!name && !brands.length)
    return {
      status: "not-found",
      message: `A record exists for GTIN ${gtin}, but it carries no product name or brand, so nothing is shown.`,
    };

  return {
    status: "found",
    product: {
      gtin,
      name: name ?? "Name not recorded",
      brands,
      quantity: text(product.quantity),
      categories: list(product.categories),
      lastModified:
        typeof product.last_modified_t === "number"
          ? new Date(product.last_modified_t * 1000).toISOString().slice(0, 10)
          : null,
      sourceName: PRODUCT_DATABASE.name,
      sourceUrl: `${PRODUCT_DATABASE.url}/product/${gtin}`,
      licence: PRODUCT_DATABASE.licence,
      manufacturerVerified: false,
      disclosure: LOOKUP_DISCLOSURE,
    },
  };
}

const FIELDS =
  "product_name,generic_name,brands,quantity,categories,last_modified_t,code";

/** Server-side lookup. Never throws: every failure is a described result. */
export async function lookupProduct(
  rawGtin: string,
  options: { fetchImpl?: typeof fetch; timeoutMs?: number } = {},
): Promise<LookupResult> {
  const gtin = normalizeGtin(rawGtin);
  if (!gtin)
    return {
      status: "invalid",
      message:
        "A GTIN must be 8, 12, 13 or 14 digits with a valid check digit.",
    };

  const doFetch = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? 6000;
  try {
    const response = await doFetch(
      `${PRODUCT_DATABASE.url}/api/v2/product/${gtin}.json?fields=${FIELDS}`,
      {
        headers: {
          "User-Agent": "QUICKKIT-BarcodeScanner/1.0 (https://quickkit.online)",
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(timeoutMs),
        cache: "no-store",
      },
    );
    if (response.status === 404)
      return {
        status: "not-found",
        message: `No record for GTIN ${gtin} in ${PRODUCT_DATABASE.name}.`,
      };
    if (!response.ok)
      return {
        status: "error",
        message: `${PRODUCT_DATABASE.name} answered HTTP ${response.status}. Nothing is shown rather than a partial guess.`,
      };
    return parseProductPayload(gtin, await response.json());
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown error";
    return {
      status: "error",
      message: `The lookup could not reach ${PRODUCT_DATABASE.name} (${reason}). The scanned barcode itself is unaffected.`,
    };
  }
}
