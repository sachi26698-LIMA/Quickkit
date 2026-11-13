/**
 * Open Food Facts v3 integration: request shape, response validation, image
 * proxying, caching and throttling.
 *
 * Every transport here is a mock. No live call to Open Food Facts is made or
 * claimed: the sandbox this project is developed in has no outbound network, so
 * live connectivity is explicitly unverified (see the readiness report).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  LOOKUP_DISCLOSURE,
  lookupProduct,
  normalizeImageUrl,
  parseProductPayload,
  productUrl,
  userAgent,
} from "@/lib/tools/barcode-scanner/product-lookup";
import {
  LOOKUP_TTL_MS,
  TokenBucket,
  TtlCache,
  lookupBucket,
  resetLookupState,
  ttlFor,
} from "@/lib/tools/barcode-scanner/lookup-cache";
import { GET } from "@/app/api/product-lookup/route";

const GTIN = "4006381333931";

/** Build a valid 13-digit GTIN from a numeric prefix. */
function makeGtin(prefix: number): string {
  const base = String(prefix).padStart(12, "0").slice(0, 12);
  const sum = [...base].reduce((total, digit, index) => {
    return total + Number(digit) * (index % 2 === 0 ? 1 : 3);
  }, 0);
  return base + String((10 - (sum % 10)) % 10);
}

const v3Payload = {
  status: "success",
  product: {
    code: GTIN,
    product_name: "Gentle Cleanser",
    brands: "Example Brand, Second Brand",
    quantity: "200 ml",
    categories: "Cosmetics, Face wash",
    last_modified_t: 1_700_000_000,
    image_front_small_url:
      "https://images.openbeautyfacts.org/images/products/400/638/133/3931/front_en.3.200.jpg",
  },
};

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    ...init,
    headers: { "content-type": "application/json", ...(init.headers ?? {}) },
  });
}

beforeEach(() => {
  resetLookupState();
  vi.unstubAllGlobals();
});

describe("request construction", () => {
  it("uses the v3 product endpoint with product_type=all", () => {
    const url = new URL(productUrl(GTIN));
    expect(url.origin).toBe("https://world.openfoodfacts.org");
    expect(url.pathname).toBe(`/api/v3.6/product/${GTIN}`);
    expect(url.searchParams.get("product_type")).toBe("all");
    expect(url.searchParams.get("fields")).toContain("image_front_small_url");
  });

  it("sends the AppName/Version (contact) User-Agent OFF asks for", async () => {
    expect(userAgent()).toMatch(/^QUICKKIT-BarcodeScanner\/[\d.]+ \(.+\)$/);
    const seen: RequestInit[] = [];
    await lookupProduct(GTIN, {
      fetchImpl: (async (_input: RequestInfo | URL, init?: RequestInit) => {
        seen.push(init ?? {});
        return jsonResponse(v3Payload);
      }) as typeof fetch,
    });
    const headers = seen[0].headers as Record<string, string>;
    expect(headers["User-Agent"]).toBe(userAgent());
    expect(seen[0].redirect).toBe("follow");
    expect(seen[0].cache).toBe("no-store");
  });
});

describe("v3 response validation", () => {
  it("maps a v3 success payload, attributing the host that answered", () => {
    const result = parseProductPayload(
      GTIN,
      v3Payload,
      "world.openbeautyfacts.org",
    );
    expect(result.status).toBe("found");
    if (result.status !== "found") return;
    expect(result.product.name).toBe("Gentle Cleanser");
    expect(result.product.sourceName).toBe("Open Beauty Facts");
    expect(result.product.sourceUrl).toBe(
      `https://world.openbeautyfacts.org/product/${GTIN}`,
    );
    expect(result.product.imagePath).toBe(
      `/api/product-lookup?gtin=${GTIN}&image=1`,
    );
    expect(result.product.imageLicence).toBe("CC-BY-SA");
    expect(result.product.manufacturerVerified).toBe(false);
    expect(result.product.disclosure).toBe(LOOKUP_DISCLOSURE);
  });

  it("treats a v3 failure envelope as not-found, never as a guess", () => {
    expect(
      parseProductPayload(GTIN, { status: "failure", errors: [] }).status,
    ).toBe("not-found");
    expect(parseProductPayload(GTIN, { status: "failure" }).status).toBe(
      "not-found",
    );
  });

  it("drops an image that is not HTTPS on a known OFF host", () => {
    expect(normalizeImageUrl("https://cdn.example.com/front.jpg")).toBeNull();
    expect(
      normalizeImageUrl("http://images.openbeautyfacts.org/front.jpg"),
    ).toBeNull();
    expect(
      normalizeImageUrl("https://images.openbeautyfacts.org/front.jpg"),
    ).toBe("https://images.openbeautyfacts.org/front.jpg");
    expect(normalizeImageUrl(42)).toBeNull();
  });

  it("rejects a JSON body that is not an object", async () => {
    const result = await lookupProduct(GTIN, {
      fetchImpl: (async () =>
        new Response("not json", {
          status: 200,
          headers: { "content-type": "text/plain" },
        })) as typeof fetch,
    });
    expect(result.status).toBe("error");
    if (result.status === "error") expect(result.reason).toBe("response");
  });
});

describe("upstream failure taxonomy", () => {
  it("surfaces 429 as rate-limited with the Retry-After value", async () => {
    const result = await lookupProduct(GTIN, {
      fetchImpl: (async () =>
        new Response("", {
          status: 429,
          headers: { "retry-after": "42" },
        })) as typeof fetch,
    });
    expect(result).toMatchObject({
      status: "rate-limited",
      retryAfterSeconds: 42,
    });
  });

  it("distinguishes a timeout from a network failure", async () => {
    const timeout = Object.assign(new Error("timed out"), {
      name: "TimeoutError",
    });
    const timedOut = await lookupProduct(GTIN, {
      fetchImpl: (async () => {
        throw timeout;
      }) as typeof fetch,
    });
    expect(timedOut.status).toBe("error");
    if (timedOut.status === "error") expect(timedOut.reason).toBe("timeout");

    const offline = await lookupProduct(GTIN, {
      fetchImpl: (async () => {
        throw new Error("network down");
      }) as typeof fetch,
    });
    expect(offline.status).toBe("error");
    if (offline.status === "error") expect(offline.reason).toBe("network");
  });

  it("never caches an error", async () => {
    const errorResult = await lookupProduct(GTIN, {
      fetchImpl: (async () =>
        new Response("", { status: 503 })) as typeof fetch,
    });
    expect(ttlFor(errorResult)).toBe(0);
    expect(ttlFor({ status: "found", product: {} as never })).toBe(
      LOOKUP_TTL_MS.found,
    );
    expect(ttlFor({ status: "not-found", message: "" })).toBe(
      LOOKUP_TTL_MS["not-found"],
    );
  });
});

describe("cache and throttle", () => {
  it("expires entries on their own clock and evicts the oldest", () => {
    const cache = new TtlCache<number>(2);
    cache.set("a", 1, 1000, 0);
    cache.set("b", 2, 1000, 0);
    expect(cache.get("a", 500)).toBe(1);
    expect(cache.get("a", 1001)).toBeUndefined();
    cache.set("c", 3, 1000, 1001);
    cache.set("d", 4, 1000, 1001);
    expect(cache.size).toBe(2);
    // "a" was refreshed, so "b" was the oldest entry and is the one evicted.
    expect(cache.get("b", 1001)).toBeUndefined();
    expect(cache.get("c", 1001)).toBe(3);
    expect(cache.get("d", 1001)).toBe(4);
  });

  it("refills the bucket at the configured rate", () => {
    const bucket = new TokenBucket(2, 60);
    expect(bucket.take(0).ok).toBe(true);
    expect(bucket.take(0).ok).toBe(true);
    const blocked = bucket.take(0);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.retryAfterSeconds).toBe(1);
    expect(bucket.take(1000).ok).toBe(true);
    bucket.reset();
    expect(bucket.take(0).ok).toBe(true);
  });
});

describe("lookup route", () => {
  it("returns a found record with attribution and a cache header", async () => {
    const fetchSpy = vi.fn(async () => jsonResponse(v3Payload));
    vi.stubGlobal("fetch", fetchSpy);
    const response = await GET(
      new Request(`https://quickkit.test/api/product-lookup?gtin=${GTIN}`),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("X-Quickkit-Cache")).toBe("MISS");
    const body = (await response.json()) as {
      status: string;
      product?: { sourceName: string; manufacturerVerified: boolean };
    };
    expect(body.status).toBe("found");
    expect(body.product?.sourceName).toBe("Open Food Facts");
    expect(body.product?.manufacturerVerified).toBe(false);

    const again = await GET(
      new Request(`https://quickkit.test/api/product-lookup?gtin=${GTIN}`),
    );
    expect(again.headers.get("X-Quickkit-Cache")).toBe("HIT");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("answers 429 with Retry-After once its own bucket is empty", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    for (let index = 0; index < 10; index += 1) {
      expect(lookupBucket.take().ok).toBe(true);
    }
    const response = await GET(
      new Request(`https://quickkit.test/api/product-lookup?gtin=${GTIN}`),
    );
    expect(response.status).toBe(429);
    expect(Number(response.headers.get("Retry-After"))).toBeGreaterThan(0);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("proxies an image only after validating type and size", async () => {
    const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
    const fetchSpy = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("openbeautyfacts.org/images")) {
        return new Response(bytes, {
          status: 200,
          headers: { "content-type": "image/jpeg", "content-length": "4" },
        });
      }
      return jsonResponse(v3Payload);
    });
    vi.stubGlobal("fetch", fetchSpy);

    const response = await GET(
      new Request(
        `https://quickkit.test/api/product-lookup?gtin=${GTIN}&image=1`,
      ),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/jpeg");
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(response.headers.get("Cache-Control")).toContain("max-age=86400");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(bytes);
  });

  it("refuses an image that is not an allowed type", async () => {
    const fetchSpy = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("openbeautyfacts.org/images")) {
        return new Response("<html></html>", {
          status: 200,
          headers: { "content-type": "text/html" },
        });
      }
      return jsonResponse(v3Payload);
    });
    vi.stubGlobal("fetch", fetchSpy);
    const response = await GET(
      new Request(
        `https://quickkit.test/api/product-lookup?gtin=${GTIN}&image=1`,
      ),
    );
    expect(response.status).toBe(502);
  });

  it("refuses an image above the size cap before reading the body", async () => {
    const fetchSpy = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("openbeautyfacts.org/images")) {
        return new Response(new Uint8Array([1]), {
          status: 200,
          headers: {
            "content-type": "image/png",
            "content-length": "99999999",
          },
        });
      }
      return jsonResponse(v3Payload);
    });
    vi.stubGlobal("fetch", fetchSpy);
    const response = await GET(
      new Request(
        `https://quickkit.test/api/product-lookup?gtin=${GTIN}&image=1`,
      ),
    );
    expect(response.status).toBe(502);
  });

  it("answers 404 for a record that has no image", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({
          status: "success",
          product: { product_name: "No picture", brands: "Example" },
        }),
      ),
    );
    const response = await GET(
      new Request(
        `https://quickkit.test/api/product-lookup?gtin=${GTIN}&image=1`,
      ),
    );
    expect(response.status).toBe(404);
  });

  it("rejects a malformed GTIN before any fetch", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const response = await GET(
      new Request("https://quickkit.test/api/product-lookup?gtin=123"),
    );
    expect(response.status).toBe(400);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("uses distinct valid GTINs without dictionary collisions", () => {
    const values = [1, 2, 3, 4, 5].map(makeGtin);
    expect(new Set(values).size).toBe(values.length);
    for (const value of values) expect(value).toMatch(/^\d{13}$/);
  });
});
