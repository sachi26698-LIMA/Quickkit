import { NextResponse } from "next/server";
import {
  LOOKUP_DISCLOSURE,
  offAssetHost,
  PRODUCT_DATABASE,
  lookupProduct,
  normalizeGtin,
  userAgent,
  type LookupResult,
  type ProductRecord,
} from "@/lib/tools/barcode-scanner/product-lookup";
import {
  lookupBucket,
  lookupCache,
  ttlFor,
} from "@/lib/tools/barcode-scanner/lookup-cache";

/**
 * Same-origin proxy for the optional GTIN product lookup and its image.
 *
 * The browser never calls Open Food Facts directly: keeping the request here
 * means no third-party host is added to `connect-src`, the visitor's IP is not
 * exposed to a third party from the client, and the response shape is
 * normalised in one place. Only a GTIN is ever sent — never a batch code, never
 * an image, never a scan history.
 *
 * The image is proxied rather than hotlinked so the browser makes no request to
 * a third-party origin at all, and so the bytes can be type-checked and capped.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_IMAGE_BYTES = 2_000_000;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function cacheHeaders(result: LookupResult): Record<string, string> {
  const cacheable = result.status === "found" || result.status === "not-found";
  return {
    "Cache-Control": cacheable
      ? "public, max-age=3600, stale-while-revalidate=86400"
      : "no-store",
  };
}

/** One lookup, with the process-local cache and token bucket applied. */
async function resolveProduct(
  gtin: string,
  now: number,
): Promise<{ result: LookupResult; cached: boolean }> {
  const cached = lookupCache.get(gtin, now);
  if (cached) return { result: cached, cached: true };

  const gate = lookupBucket.take(now);
  if (!gate.ok)
    return {
      cached: false,
      result: {
        status: "rate-limited",
        retryAfterSeconds: gate.retryAfterSeconds,
        message:
          "This server is limiting lookups to stay inside the Open Food Facts rate limit (15 product reads per minute per IP). Nothing was sent. Try again shortly.",
      },
    };

  const result = await lookupProduct(gtin);
  const ttl = ttlFor(result);
  if (ttl) lookupCache.set(gtin, result, ttl, now);
  return { result, cached: false };
}

async function imageResponse(gtin: string, now: number): Promise<Response> {
  const { result } = await resolveProduct(gtin, now);
  if (result.status !== "found") {
    const status =
      result.status === "rate-limited"
        ? 429
        : result.status === "not-found"
          ? 404
          : 502;
    return NextResponse.json(result, {
      status,
      headers: {
        ...cacheHeaders(result),
        ...(result.status === "rate-limited"
          ? { "Retry-After": String(result.retryAfterSeconds) }
          : {}),
      },
    });
  }

  const product: ProductRecord = result.product;
  const source = product.imageUrl;
  if (!source)
    return NextResponse.json(
      { status: "not-found", message: "This record has no product image." },
      { status: 404, headers: { "Cache-Control": "public, max-age=3600" } },
    );

  try {
    // `redirect: "manual"` keeps a redirect from moving the request to a host
    // that was never validated.
    const upstream = await fetch(source, {
      headers: { "User-Agent": userAgent(), Accept: "image/*" },
      redirect: "manual",
      signal: AbortSignal.timeout(6000),
      cache: "no-store",
    });
    if (!upstream.ok || !offAssetHost(new URL(upstream.url || source).hostname))
      return NextResponse.json(
        { status: "error", message: "The product image is unavailable." },
        { status: 502, headers: { "Cache-Control": "no-store" } },
      );

    const type = (upstream.headers.get("content-type") ?? "")
      .split(";")[0]
      .trim()
      .toLowerCase();
    if (!IMAGE_TYPES.has(type))
      return NextResponse.json(
        {
          status: "error",
          message: "The product image was not an image type this site serves.",
        },
        { status: 502, headers: { "Cache-Control": "no-store" } },
      );

    const declared = Number(upstream.headers.get("content-length") ?? "0");
    if (declared > MAX_IMAGE_BYTES)
      return NextResponse.json(
        {
          status: "error",
          message: "The product image is too large to proxy.",
        },
        { status: 502, headers: { "Cache-Control": "no-store" } },
      );

    const body = await upstream.arrayBuffer();
    if (body.byteLength === 0 || body.byteLength > MAX_IMAGE_BYTES)
      return NextResponse.json(
        {
          status: "error",
          message: "The product image is empty or too large to proxy.",
        },
        { status: 502, headers: { "Cache-Control": "no-store" } },
      );

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": type,
        "Content-Length": String(body.byteLength),
        "Cache-Control": "public, max-age=86400",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
        "X-Product-Source": product.sourceName,
        "X-Image-Licence": PRODUCT_DATABASE.imageLicence,
      },
    });
  } catch {
    return NextResponse.json(
      {
        status: "error",
        message:
          "The product image could not be fetched. The record itself is unaffected.",
      },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const raw = params.get("gtin") ?? "";
  const gtin = normalizeGtin(raw);
  if (!gtin)
    return NextResponse.json(
      {
        status: "invalid",
        message:
          "A GTIN must be 8, 12, 13 or 14 digits with a valid check digit.",
      },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );

  const now = Date.now();

  if (params.get("image") === "1") return imageResponse(gtin, now);

  const { result, cached } = await resolveProduct(gtin, now);
  const status =
    result.status === "error"
      ? 502
      : result.status === "rate-limited"
        ? 429
        : 200;

  return NextResponse.json(
    { ...result, disclosure: LOOKUP_DISCLOSURE },
    {
      status,
      headers: {
        ...cacheHeaders(result),
        "X-Quickkit-Cache": cached ? "HIT" : "MISS",
        ...(result.status === "rate-limited"
          ? { "Retry-After": String(result.retryAfterSeconds) }
          : {}),
      },
    },
  );
}
