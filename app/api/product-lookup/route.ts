import { NextResponse } from "next/server";
import {
  lookupProduct,
  normalizeGtin,
} from "@/lib/tools/barcode-scanner/product-lookup";

/**
 * Same-origin proxy for the optional GTIN product lookup.
 *
 * The browser never calls Open Food Facts directly: keeping the request here
 * means no third-party host is added to `connect-src`, the visitor's IP is not
 * exposed to a third party from the client, and the response shape is
 * normalised in one place. Only a GTIN is ever sent — never a batch code, never
 * an image, never a scan history.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const gtin = new URL(request.url).searchParams.get("gtin") ?? "";
  if (!normalizeGtin(gtin))
    return NextResponse.json(
      {
        status: "invalid",
        message:
          "A GTIN must be 8, 12, 13 or 14 digits with a valid check digit.",
      },
      { status: 400 },
    );

  const result = await lookupProduct(gtin);
  const cacheable = result.status === "found" || result.status === "not-found";
  return NextResponse.json(result, {
    status: result.status === "error" ? 502 : 200,
    headers: {
      "Cache-Control": cacheable
        ? "public, max-age=3600, stale-while-revalidate=86400"
        : "no-store",
    },
  });
}
