/**
 * GTIN → product lookup against the Open Food Facts ecosystem.
 *
 * Four things this module refuses to do:
 *   - call the third party without the visitor asking (the UI gates it behind a
 *     button, because the GTIN leaves the device when it runs);
 *   - present a community database record as manufacturer-verified data;
 *   - show a name, brand, category or image that is not in the response;
 *   - keep guessing after a 404, a 429 or a timeout.
 *
 * The request is made server-side by `/api/product-lookup`, so the browser
 * never talks to a third-party host and the site's Content-Security-Policy does
 * not need widening.
 *
 * API notes (checked 2026-11-13 against openfoodfacts.github.io):
 *   - v3.6 is current, v2 is deprecated;
 *   - `GET /api/v3.6/product/{code}?product_type=all` answers 200, 302 (to the
 *     right server: food / beauty / petfood / products) or 404;
 *   - a custom `AppName/Version (contact)` User-Agent is required;
 *   - product reads are limited to 15 requests per minute per IP;
 *   - data is ODbL 1.0, images are CC-BY-SA, and records are volunteer-entered.
 */
import { gtinCheckOk } from "@/lib/tools/barcode/checksums";
import { contactEmail } from "@/lib/site";

export const PRODUCT_DATABASE = {
  name: "Open Food Facts",
  url: "https://world.openfoodfacts.org",
  apiBase: "https://world.openfoodfacts.org/api/v3.6",
  docs: "https://openfoodfacts.github.io/openfoodfacts-server/api/",
  licence: "ODbL 1.0",
  imageLicence: "CC-BY-SA",
  kind: "community" as const,
  note: "A collaborative public database. Records are contributed by volunteers, not verified by the manufacturer.",
};

export const LOOKUP_DISCLOSURE =
  "A product-database match confirms only that someone recorded this GTIN. It is not manufacturer-verified, and it says nothing about the batch, date, expiry or authenticity of the pack in your hand.";

/** The five OFF servers a GTIN can resolve to, and how each is named. */
export const OFF_SERVERS = {
  "world.openfoodfacts.org": {
    name: "Open Food Facts",
    url: "https://world.openfoodfacts.org",
    scope: "food",
  },
  "world.openbeautyfacts.org": {
    name: "Open Beauty Facts",
    url: "https://world.openbeautyfacts.org",
    scope: "cosmetics",
  },
  "world.openproductsfacts.org": {
    name: "Open Products Facts",
    url: "https://world.openproductsfacts.org",
    scope: "general products",
  },
  "world.openpetfoodfacts.org": {
    name: "Open Pet Food Facts",
    url: "https://world.openpetfoodfacts.org",
    scope: "pet food",
  },
} as const;

export type OffHost = keyof typeof OFF_SERVERS;

export type ProductRecord = {
  gtin: string;
  name: string;
  brands: string[];
  quantity: string | null;
  categories: string[];
  /** Ingredient statement as recorded, when the record has one. */
  ingredients: string | null;
  allergens: string[];
  /** Nutrition rows for the fields that are actually present. */
  nutrition: { label: string; value: string }[];
  /** Fields a user might expect that this record does not carry. */
  missing: string[];
  lastModified: string | null;
  /** Third-party image URL, only when it is on a known OFF host. */
  imageUrl: string | null;
  /** Same-origin proxy path for that image (never a hotlink in the browser). */
  imagePath: string | null;
  sourceName: string;
  sourceHost: OffHost;
  sourceUrl: string;
  databaseUrl: string;
  licence: string;
  imageLicence: string;
  /** Always false: this data never comes from the manufacturer. */
  manufacturerVerified: false;
  disclosure: string;
};

export type LookupErrorReason = "timeout" | "network" | "upstream" | "response";

export type LookupResult =
  | { status: "found"; product: ProductRecord }
  | { status: "not-found"; message: string }
  | { status: "invalid"; message: string }
  | { status: "rate-limited"; message: string; retryAfterSeconds: number }
  | {
      status: "error";
      message: string;
      reason: LookupErrorReason;
      /** HTTP status from the database, when it answered at all. */
      upstreamStatus?: number;
    };

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

export function offHost(hostname: string): OffHost | null {
  const host = hostname.toLowerCase();
  return (Object.keys(OFF_SERVERS) as OffHost[]).find((entry) => entry === host)
    ? (host as OffHost)
    : null;
}

/**
 * Any hostname in the OFF family, including country subdomains such as
 * `in.openfoodfacts.org`. The API sometimes redirects a world domain to the
 * nearest national server, so a redirect guard has to allow those — and only
 * those. A lookalike (`openfoodfacts.org.evil.test`) does not end with the
 * suffix and is rejected.
 */
export function offFamilyHost(hostname: string): OffHost | null {
  const host = hostname.toLowerCase();
  const asset = offAssetHost(host);
  if (asset) return asset;
  const families: [string, OffHost][] = [
    ["openfoodfacts.org", "world.openfoodfacts.org"],
    ["openbeautyfacts.org", "world.openbeautyfacts.org"],
    ["openproductsfacts.org", "world.openproductsfacts.org"],
    ["openpetfoodfacts.org", "world.openpetfoodfacts.org"],
  ];
  for (const [suffix, base] of families) {
    if (host === suffix || host.endsWith(`.${suffix}`)) return base;
  }
  return null;
}

/**
 * Image and static assets are served from `images.<database>` and
 * `static.<database>` subdomains, not from the API host. Only those four
 * database domains (and their images/static subdomains) are accepted — never a
 * generic CDN, never an arbitrary host.
 */
export function offAssetHost(hostname: string): OffHost | null {
  const host = hostname.toLowerCase();
  const direct = offHost(host);
  if (direct) return direct;
  const match = /^(?:images|static)\.([a-z0-9.-]+)$/.exec(host);
  if (!match) return null;
  return offHost(match[1]) ?? offHost(`world.${match[1]}`);
}

/**
 * Accept an image URL only when it is HTTPS on a known OFF host. Anything else
 * (a third-party CDN, a tracker, plain HTTP) is dropped rather than proxied.
 */
export function normalizeImageUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  if (!offAssetHost(url.hostname)) return null;
  return url.toString().slice(0, 500);
}

type ProductPayload = {
  status?: unknown;
  product?: unknown;
  errors?: unknown;
};

/**
 * Turn an Open Food Facts v3 payload into a `LookupResult`, defensively.
 *
 * `sourceHost` is the host that actually answered, so a beauty product resolved
 * to Open Beauty Facts is attributed to Open Beauty Facts rather than to the
 * food database that was asked first.
 */
/** The nutrition rows worth showing, in label order, per 100 g / 100 ml. */
const NUTRIENT_ROWS: { key: string; label: string; unit: string }[] = [
  { key: "energy-kcal", label: "Energy", unit: "kcal" },
  { key: "energy-kj", label: "Energy", unit: "kJ" },
  { key: "fat", label: "Fat", unit: "g" },
  { key: "saturated-fat", label: "of which saturates", unit: "g" },
  { key: "carbohydrates", label: "Carbohydrate", unit: "g" },
  { key: "sugars", label: "of which sugars", unit: "g" },
  { key: "fiber", label: "Fibre", unit: "g" },
  { key: "proteins", label: "Protein", unit: "g" },
  { key: "salt", label: "Salt", unit: "g" },
  { key: "sodium", label: "Sodium", unit: "g" },
];

export function nutritionRows(nutriments: unknown) {
  if (!nutriments || typeof nutriments !== "object") return [];
  const source = nutriments as Record<string, unknown>;
  const rows: { label: string; value: string }[] = [];
  const seen = new Set<string>();
  for (const row of NUTRIENT_ROWS) {
    const raw = source[`${row.key}_100g`];
    if (typeof raw !== "number" || !Number.isFinite(raw)) continue;
    // Energy is recorded twice (kcal and kJ); keep both, but never duplicate a
    // label with the same unit for other fields.
    const key = `${row.label}:${row.unit}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const value = `${raw.toLocaleString("en-GB", { maximumFractionDigits: 2 })} ${row.unit}`;
    rows.push({ label: `${row.label} (per 100 g/ml)`, value });
  }
  return rows;
}

export function parseProductPayload(
  gtin: string,
  payload: unknown,
  sourceHost: OffHost = "world.openfoodfacts.org",
): LookupResult {
  if (!payload || typeof payload !== "object")
    return {
      status: "error",
      reason: "response",
      message: "The product database returned an unreadable response.",
    };

  const body = payload as ProductPayload;
  const product =
    body.product && typeof body.product === "object"
      ? (body.product as Record<string, unknown>)
      : null;

  const failure =
    body.status === "failure" ||
    body.status === 0 ||
    body.status === "0" ||
    !product;

  if (failure)
    return {
      status: "not-found",
      message: `No record for GTIN ${gtin} in ${OFF_SERVERS[sourceHost].name}. That is a common result — plenty of cosmetics are not in a community database.`,
    };

  const name = text(product.product_name) ?? text(product.generic_name);
  const brands = list(product.brands);
  if (!name && !brands.length)
    return {
      status: "not-found",
      message: `A record exists for GTIN ${gtin}, but it carries no product name or brand, so nothing is shown.`,
    };

  const server = OFF_SERVERS[sourceHost];
  const imageUrl = normalizeImageUrl(
    product.image_front_small_url ??
      product.image_front_thumb_url ??
      product.image_front_url,
  );

  const record: ProductRecord = {
    gtin,
    name: name ?? "Name not recorded",
    brands,
    quantity: text(product.quantity),
    categories: list(product.categories),
    ingredients: text(product.ingredients_text),
    allergens: list(product.allergens),
    nutrition: nutritionRows(product.nutriments),
    missing: [] as string[],
    lastModified:
      typeof product.last_modified_t === "number" &&
      Number.isFinite(product.last_modified_t)
        ? new Date(product.last_modified_t * 1000).toISOString().slice(0, 10)
        : null,
    imageUrl,
    imagePath: imageUrl ? `/api/product-lookup?gtin=${gtin}&image=1` : null,
    sourceName: server.name,
    sourceHost,
    sourceUrl: `${server.url}/product/${gtin}`,
    databaseUrl: server.url,
    licence: PRODUCT_DATABASE.licence,
    imageLicence: PRODUCT_DATABASE.imageLicence,
    manufacturerVerified: false,
    disclosure: LOOKUP_DISCLOSURE,
  };

  record.missing = (
    [
      ["product name", name],
      ["brand", brands.length ? "brand" : null],
      ["quantity", record.quantity],
      ["image", record.imageUrl],
      ["category", record.categories.length ? "category" : null],
      ["ingredients", record.ingredients],
      ["nutrition", record.nutrition.length ? "nutrition" : null],
    ] as [string, unknown][]
  )
    .filter(([, value]) => !value)
    .map(([label]) => label);

  return { status: "found", product: record };
}

const FIELDS = [
  "product_name",
  "generic_name",
  "brands",
  "quantity",
  "categories",
  "ingredients_text",
  "allergens",
  "nutriments",
  "last_modified_t",
  "code",
  "image_front_small_url",
  "image_front_thumb_url",
  "image_front_url",
].join(",");

/** `AppName/Version (contact)` — the shape Open Food Facts asks for. */
export function userAgent(): string {
  const contact = contactEmail ? `; ${contactEmail}` : "";
  return `QUICKKIT-BarcodeScanner/1.1 (https://quickkit.online${contact})`;
}

export function productUrl(gtin: string): string {
  return `${PRODUCT_DATABASE.apiBase}/product/${gtin}?product_type=all&fields=${FIELDS}`;
}

function retryAfter(response: Response): number {
  const raw = response.headers?.get("retry-after") ?? null;
  const seconds = raw ? Number(raw) : NaN;
  return Number.isFinite(seconds) && seconds > 0 && seconds <= 3600
    ? Math.ceil(seconds)
    : 60;
}

/** Server-side lookup. Never throws: every failure is a described result. */
/** Redirect hops the API proxy will follow before giving up. */
export const LOOKUP_MAX_REDIRECTS = 3;

type OffFetchOutcome =
  | { kind: "response"; response: Response }
  | { kind: "blocked"; host: string; reason: "external" | "loop" };

/**
 * Fetch an OFF API URL with redirects followed by hand.
 *
 * `redirect: "follow"` would let OFF's edge send this server anywhere, including
 * a link-local address. Every hop is therefore checked against the OFF family
 * first, so the only hosts this route can reach are the four product databases
 * and their national subdomains.
 */
async function fetchOffJson(
  startUrl: string,
  init: RequestInit,
  doFetch: typeof fetch,
): Promise<OffFetchOutcome> {
  let url = startUrl;
  for (let hop = 0; hop <= LOOKUP_MAX_REDIRECTS; hop += 1) {
    const response = await doFetch(url, { ...init, redirect: "manual" });
    const isRedirect = response.status >= 300 && response.status < 400;
    if (!isRedirect) return { kind: "response", response };
    const location = response.headers.get("location");
    if (!location) return { kind: "response", response };
    let next: URL;
    try {
      next = new URL(location, url);
    } catch {
      return { kind: "response", response };
    }
    if (next.protocol !== "https:" || !offFamilyHost(next.hostname)) {
      return { kind: "blocked", host: next.hostname, reason: "external" };
    }
    if (next.toString() === url) {
      return { kind: "blocked", host: next.hostname, reason: "loop" };
    }
    url = next.toString();
  }
  return { kind: "blocked", host: new URL(url).hostname, reason: "loop" };
}

export async function lookupProduct(
  rawGtin: string,
  options: {
    fetchImpl?: typeof fetch;
    timeoutMs?: number;
    now?: number;
  } = {},
): Promise<LookupResult> {
  const gtin = normalizeGtin(rawGtin);
  if (!gtin)
    return {
      status: "invalid",
      message:
        "A GTIN must be 8, 12, 13 or 14 digits with a valid check digit.",
    };

  const doFetch = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? 8000;
  try {
    const outcome = await fetchOffJson(
      productUrl(gtin),
      {
        headers: {
          "User-Agent": userAgent(),
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(timeoutMs),
        cache: "no-store",
      },
      doFetch,
    );

    if (outcome.kind === "blocked") {
      return {
        status: "error",
        reason: "upstream",
        message:
          outcome.reason === "loop"
            ? `${PRODUCT_DATABASE.name} kept redirecting (${outcome.host}) without reaching a product, so the lookup was stopped. Nothing is shown rather than a partial guess.`
            : `The lookup was stopped because ${PRODUCT_DATABASE.name} redirected to ${outcome.host}, which is not one of its own databases. No request was sent there.`,
      };
    }

    const response = outcome.response;

    if (response.status === 404)
      return {
        status: "not-found",
        message: `No record for GTIN ${gtin} in ${PRODUCT_DATABASE.name}.`,
      };
    if (response.status === 429)
      return {
        status: "rate-limited",
        retryAfterSeconds: retryAfter(response),
        message: `${PRODUCT_DATABASE.name} is rate-limiting requests right now. Nothing is shown; try again later.`,
      };
    if (response.status >= 500) {
      // 502/503/504 mean "the database or its edge is down"; 500 means the
      // database itself errored. Both are the database's problem, not the
      // product's, and both are reported with the exact status.
      const detail =
        response.status === 502 || response.status === 504
          ? "a gateway or timeout error at the database"
          : response.status === 503
            ? "the database is temporarily unavailable"
            : "an internal error at the database";
      return {
        status: "error",
        reason: "upstream",
        upstreamStatus: response.status,
        message: `${PRODUCT_DATABASE.name} answered HTTP ${response.status} (${detail}). Nothing is shown rather than a partial guess.`,
      };
    }
    if (!response.ok)
      return {
        status: "error",
        reason: "upstream",
        message: `${PRODUCT_DATABASE.name} answered HTTP ${response.status}. Nothing is shown rather than a partial guess.`,
      };

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      return {
        status: "error",
        reason: "response",
        message:
          "The product database answered with something that was not JSON, so nothing is shown.",
      };
    }

    const host = (() => {
      try {
        return offHost(new URL(response.url).hostname);
      } catch {
        return null;
      }
    })();
    return parseProductPayload(
      gtin,
      payload,
      host ?? "world.openfoodfacts.org",
    );
  } catch (error) {
    const isTimeout =
      error instanceof Error &&
      (error.name === "TimeoutError" || error.name === "AbortError");
    const reason: LookupErrorReason = isTimeout ? "timeout" : "network";
    const detail =
      error instanceof Error && error.message.length <= 120
        ? ` (${error.message.replace(/\s+/g, " ")})`
        : "";
    return {
      status: "error",
      reason,
      message: isTimeout
        ? `The lookup timed out after ${Math.round(timeoutMs / 1000)}s. The scanned barcode itself is unaffected.`
        : `The lookup could not reach ${PRODUCT_DATABASE.name}${detail}. The scanned barcode itself is unaffected.`,
    };
  }
}
