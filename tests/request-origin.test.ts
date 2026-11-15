import { describe, expect, it } from "vitest";
import { getRequestOrigin, hasSameOrigin } from "@/lib/supabase/request-origin";

function makeRequest({
  url = "http://0.0.0.0:3000/api/check",
  origin,
  headers = {},
}: {
  url?: string;
  origin?: string;
  headers?: Record<string, string>;
} = {}) {
  return {
    url,
    headers: new Headers({ ...(origin ? { origin } : {}), ...headers }),
  };
}

describe("reverse-proxy-aware same-origin validation", () => {
  it("uses the browser-visible forwarded host and protocol instead of an internal bind host", () => {
    const request = makeRequest({
      origin: "https://preview.quickkit.example",
      headers: {
        host: "internal-service:3000",
        "x-forwarded-host": "preview.quickkit.example",
        "x-forwarded-proto": "https",
      },
    });
    expect(getRequestOrigin(request)).toBe("https://preview.quickkit.example");
    expect(hasSameOrigin(request)).toBe(true);
  });

  it("uses the Host header for direct local requests and normalizes default ports", () => {
    const request = makeRequest({
      origin: "http://localhost",
      headers: { host: "localhost:80" },
    });
    expect(getRequestOrigin(request)).toBe("http://localhost");
    expect(hasSameOrigin(request)).toBe(true);
  });

  it("rejects a foreign origin even when the request has forwarded headers", () => {
    const request = makeRequest({
      origin: "https://attacker.example",
      headers: {
        host: "internal-service:3000",
        "x-forwarded-host": "quickkit.example",
        "x-forwarded-proto": "https",
      },
    });
    expect(hasSameOrigin(request)).toBe(false);
  });

  it("fails closed for missing origins, ambiguous host chains, invalid protocols, and malformed hosts", () => {
    expect(hasSameOrigin(makeRequest())).toBe(false);
    expect(
      getRequestOrigin(
        makeRequest({
          headers: { "x-forwarded-host": "one.example,two.example" },
        }),
      ),
    ).toBeNull();
    expect(
      getRequestOrigin(
        makeRequest({
          headers: {
            "x-forwarded-host": "quickkit.example",
            "x-forwarded-proto": "javascript",
          },
        }),
      ),
    ).toBeNull();
    expect(
      getRequestOrigin(
        makeRequest({
          headers: { "x-forwarded-host": "quickkit.example/path" },
        }),
      ),
    ).toBeNull();
  });
});
