/**
 * Redirect handling and failure mapping for the GTIN lookup proxy.
 *
 * The proxy is the one place in the app that makes an outbound request from the
 * server. `redirect: "follow"` would let the upstream edge choose the next
 * host, including a link-local address; these tests pin down that every hop is
 * checked first, and that a blocked hop is reported rather than retried.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  LOOKUP_MAX_REDIRECTS,
  lookupProduct,
  offFamilyHost,
} from "@/lib/tools/barcode-scanner/product-lookup";
import { GET } from "@/app/api/product-lookup/route";
import { resetLookupState } from "@/lib/tools/barcode-scanner/lookup-cache";

/** Valid EAN-13 from a 12-digit stem, so each test can use a fresh cache key. */
function ean13(stem: string): string {
  const digits = stem.split("").map(Number);
  const sum = digits.reduce(
    (total, digit, index) => total + digit * (index % 2 === 0 ? 1 : 3),
    0,
  );
  return `${stem}${(10 - (sum % 10)) % 10}`;
}

const PAYLOAD = {
  status: "success",
  product: {
    code: "",
    product_name: "Test spread",
    brands: "Test",
    quantity: "400 g",
    categories: "Spreads",
  },
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function redirect(location: string, status = 302): Response {
  return new Response(null, { status, headers: { location } });
}

beforeEach(() => {
  resetLookupState();
  vi.unstubAllGlobals();
});

describe("offFamilyHost", () => {
  it("accepts the four databases and their national subdomains", () => {
    expect(offFamilyHost("world.openfoodfacts.org")).toBe(
      "world.openfoodfacts.org",
    );
    expect(offFamilyHost("in.openfoodfacts.org")).toBe(
      "world.openfoodfacts.org",
    );
    expect(offFamilyHost("world.openbeautyfacts.org")).toBe(
      "world.openbeautyfacts.org",
    );
    expect(offFamilyHost("images.openfoodfacts.org")).toBe(
      "world.openfoodfacts.org",
    );
  });

  it("rejects lookalike and unrelated hosts", () => {
    expect(offFamilyHost("openfoodfacts.org.evil.test")).toBeNull();
    expect(offFamilyHost("notopenfoodfacts.org")).toBeNull();
    expect(offFamilyHost("169.254.169.254")).toBeNull();
    expect(offFamilyHost("localhost")).toBeNull();
  });
});

describe("redirect guard", () => {
  it("follows a redirect to a national server", async () => {
    const gtin = ean13("301762042200");
    const seen: string[] = [];
    const fetchImpl = (async (input: RequestInfo | URL) => {
      const url = String(input);
      seen.push(url);
      if (seen.length === 1)
        return redirect(
          `https://in.openfoodfacts.org/api/v3.6/product/${gtin}`,
        );
      return json(PAYLOAD);
    }) as typeof fetch;

    const result = await lookupProduct(gtin, { fetchImpl });
    expect(result.status).toBe("found");
    expect(seen).toHaveLength(2);
  });

  it("refuses to follow a redirect off the OFF family", async () => {
    const gtin = ean13("301762042201");
    const seen: string[] = [];
    const fetchImpl = (async (input: RequestInfo | URL) => {
      seen.push(String(input));
      return redirect("https://169.254.169.254/latest/meta-data/", 302);
    }) as typeof fetch;

    const result = await lookupProduct(gtin, { fetchImpl });
    expect(result.status).toBe("error");
    if (result.status !== "error") return;
    expect(result.reason).toBe("upstream");
    expect(result.message).toContain("169.254.169.254");
    expect(result.message).toContain("not one of its own databases");
    expect(seen).toHaveLength(1);
  });

  it("refuses a downgrade to plain http", async () => {
    const gtin = ean13("301762042202");
    const fetchImpl = (async () =>
      redirect(
        "http://world.openfoodfacts.org/api/v3.6/product/x",
      )) as unknown as typeof fetch;
    const result = await lookupProduct(gtin, { fetchImpl });
    expect(result.status).toBe("error");
    if (result.status !== "error") return;
    expect(result.message).toContain("not one of its own databases");
  });

  it("stops a redirect that points at itself", async () => {
    const gtin = ean13("301762042203");
    const fetchImpl = (async (input: RequestInfo | URL) =>
      redirect(String(input))) as unknown as typeof fetch;
    const result = await lookupProduct(gtin, { fetchImpl });
    expect(result.status).toBe("error");
    if (result.status !== "error") return;
    expect(result.message).toContain("kept redirecting");
  });

  it("gives up after the hop budget", async () => {
    const gtin = ean13("301762042204");
    let hop = 0;
    const fetchImpl = (async () => {
      hop += 1;
      return redirect(
        `https://world.openfoodfacts.org/api/v3.6/product/hop${hop}`,
      );
    }) as unknown as typeof fetch;
    const result = await lookupProduct(gtin, { fetchImpl });
    expect(result.status).toBe("error");
    expect(hop).toBe(LOOKUP_MAX_REDIRECTS + 1);
  });
});

describe("route failure mapping", () => {
  it("answers 504 when the lookup times out", async () => {
    const gtin = ean13("301762042205");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw Object.assign(new Error("The operation timed out."), {
          name: "TimeoutError",
        });
      }),
    );
    const response = await GET(
      new Request(`https://quickkit.test/api/product-lookup?gtin=${gtin}`),
    );
    expect(response.status).toBe(504);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    const body = (await response.json()) as { reason: string };
    expect(body.reason).toBe("timeout");
    vi.unstubAllGlobals();
  });

  it("answers 502 and keeps the upstream status", async () => {
    const gtin = ean13("301762042206");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => json({ status: "failure" }, 503)),
    );
    const response = await GET(
      new Request(`https://quickkit.test/api/product-lookup?gtin=${gtin}`),
    );
    expect(response.status).toBe(502);
    const body = (await response.json()) as {
      reason: string;
      upstreamStatus: number;
    };
    expect(body.reason).toBe("upstream");
    expect(body.upstreamStatus).toBe(503);
    vi.unstubAllGlobals();
  });

  it("ignores a caller-supplied URL and only ever asks OFF", async () => {
    const gtin = ean13("301762042207");
    const seen: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        seen.push(String(input));
        return json(PAYLOAD);
      }),
    );
    const response = await GET(
      new Request(
        `https://quickkit.test/api/product-lookup?gtin=${gtin}&url=https://evil.test/&host=169.254.169.254`,
      ),
    );
    expect(response.status).toBe(200);
    expect(seen).toHaveLength(1);
    expect(new URL(seen[0]).hostname).toBe("world.openfoodfacts.org");
    vi.unstubAllGlobals();
  });
});
