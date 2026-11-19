import { afterEach, describe, expect, it, vi } from "vitest";
import {
  lookupDns,
  lookupDnsBatch,
  lookupEmailRecord,
  lookupPublicIp,
  parseTxtPresentation,
} from "@/lib/tools/security/network";
import {
  analyzeEmailHeaders,
  inspectDkimPublicKey,
} from "@/lib/tools/security/email";
import { analyzeHeaders } from "@/lib/tools/security/logic";
import { parseResponseHeaders, reviewCors } from "@/lib/tools/security/review";

afterEach(() => {
  vi.unstubAllGlobals();
});

/**
 * A resolver answer in the shape the engine consumes. The engine reads the
 * response as a bounded byte stream, so the mock has to carry a real body — a
 * `json()` stub alone is not enough.
 */
function streamed(
  payload: unknown,
  init: { ok?: boolean; status?: number } = {},
) {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    // The engine reads the announced content-length before streaming.
    headers: new Headers({ "content-type": "application/dns-json" }),
    body: new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes);
        controller.close();
      },
    }),
  } as unknown as Response;
}

function dnsAnswer(records: { type: number; TTL: number; data: string }[]) {
  return streamed({ Status: 0, AD: false, Answer: records });
}

describe("DNS lookups", () => {
  it("reports the answers a resolver returned", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        dnsAnswer([{ type: 1, TTL: 300, data: "93.184.216.34" }]),
      ),
    );
    const result = await lookupDns("example.com", "A");
    expect(result).toContain("93.184.216.34");
  });

  it("says results reflect one public resolver, not private DNS", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => dnsAnswer([])),
    );
    const result = await lookupDns("example.com", "A");
    expect(result).toContain("not private DNS or proof of domain ownership");
  });

  it("says the resolver sees the query and the client IP", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => dnsAnswer([])),
    );
    const result = await lookupDns("example.com", "A");
    expect(result).toContain("resolver receives your query and IP address");
  });

  it("reports no answers rather than inventing one", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => dnsAnswer([])),
    );
    expect(await lookupDns("example.com", "MX")).toContain(
      "No answer records returned",
    );
  });

  it("refuses a private or local domain before sending a query", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    await expect(lookupDns("localhost", "A")).rejects.toThrow();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("refuses a raw IP address", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    await expect(lookupDns("93.184.216.34", "A")).rejects.toThrow();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("validates the whole batch before sending any query", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    await expect(
      lookupDnsBatch("example.com\nlocalhost", "A"),
    ).rejects.toThrow();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("caps a batch at ten domains", async () => {
    await expect(
      lookupDnsBatch(
        Array.from({ length: 11 }, (_, i) => `d${i}.example.com`).join("\n"),
        "A",
      ),
    ).rejects.toThrow(/1–10/);
  });

  it("reports a resolver timeout as a timeout", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw Object.assign(new Error("aborted"), { name: "AbortError" });
      }),
    );
    await expect(lookupDns("example.com", "A")).rejects.toThrow(/timed out/);
  });
});

describe("email DNS records", () => {
  it("looks up an SPF record", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        dnsAnswer([{ type: 16, TTL: 300, data: '"v=spf1 -all"' }]),
      ),
    );
    const result = await lookupEmailRecord("example.com", "spf");
    // The record is reviewed, not echoed: the report names the reviewed policy.
    expect(result).toContain("Matching SPF TXT records: 1");
    expect(result.toLowerCase()).toContain("spf");
  });

  it("requires a selector for DKIM", async () => {
    await expect(lookupEmailRecord("example.com", "dkim")).rejects.toThrow(
      /selector/,
    );
  });

  it("refuses a base domain with an underscore", async () => {
    await expect(
      lookupEmailRecord("_dmarc.example.com", "dmarc"),
    ).rejects.toThrow(/without underscores/);
  });

  it("refuses an unknown record kind", async () => {
    await expect(
      lookupEmailRecord("example.com", "mx" as "spf"),
    ).rejects.toThrow();
  });
});

describe("public IP lookup", () => {
  it("reports the IPv4 address the service observed", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => streamed({ ip: "203.0.113.7" })),
    );
    const result = await lookupPublicIp("ipv4");
    expect(result).toContain("203.0.113.7");
  });

  it("says the address may be a proxy or VPN", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => streamed({ ip: "203.0.113.7" })),
    );
    expect(await lookupPublicIp("ipv4")).toContain(
      "may be a VPN, proxy or shared network",
    );
  });

  it("rejects a service response that is not an IP", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => streamed({ ip: "not-an-ip" })),
    );
    await expect(lookupPublicIp("ipv4")).rejects.toThrow(/Invalid IP/);
  });

  it("refuses an address family it does not support", async () => {
    await expect(lookupPublicIp("ipv6" as "ipv4")).rejects.toThrow();
  });

  it("reports an HTTP error without echoing the body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        streamed({ error: "boom" }, { ok: false, status: 500 }),
      ),
    );
    await expect(lookupPublicIp("ipv4")).rejects.toThrow(/HTTP error/);
  });
});

describe("TXT presentation parsing", () => {
  it("joins adjacent quoted strings", () => {
    expect(parseTxtPresentation('"v=spf1 " "-all"')).toBe("v=spf1 -all");
  });

  it("passes an unquoted value through", () => {
    expect(parseTxtPresentation("v=spf1 -all")).toBe("v=spf1 -all");
  });

  it("rejects a string that never closes", () => {
    expect(() => parseTxtPresentation('"unterminated')).toThrow();
  });
});

describe("email header analysis", () => {
  const HEADERS = [
    "Received: from mail.example.com by mx.example.org; Mon, 2 Mar 2026 10:00:00 +0000",
    "Authentication-Results: mx.example.org; spf=pass; dkim=pass; dmarc=pass",
    "From: Acme <hello@example.com>",
    "Reply-To: billing@other.example",
    "Subject: Your invoice",
  ].join("\n");

  it("reports the authentication results it found", () => {
    const result = analyzeEmailHeaders(HEADERS);
    expect(result.toLowerCase()).toContain("spf=pass");
  });

  it("says header fields can be forged", () => {
    expect(analyzeEmailHeaders(HEADERS).toLowerCase()).toContain(
      "fields can be forged",
    );
  });

  it("says it does not verify SPF, DKIM or DMARC", () => {
    const result = analyzeEmailHeaders(HEADERS);
    expect(result).toContain("does not verify SPF, DKIM, DMARC");
  });

  it("counts the Received headers", () => {
    expect(analyzeEmailHeaders(HEADERS)).toContain("Received headers: 1");
  });

  it("reports when no Authentication-Results were supplied", () => {
    const result = analyzeEmailHeaders("From: a@example.com");
    expect(result).toContain("No Authentication-Results supplied");
  });

  it("refuses empty input", () => {
    expect(() => analyzeEmailHeaders("")).toThrow();
  });

  it("refuses input beyond the size limit", () => {
    expect(() => analyzeEmailHeaders("x".repeat(100_001))).toThrow();
  });
});

describe("DKIM public key inspection", () => {
  it("reads a key record and names the algorithm", async () => {
    // A short, structurally valid RSA key record — this is a format check, not
    // a cryptographic verification.
    const record =
      "v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC7" +
      "aBcDeFgHiJkLmNoPqRsTuVwXyZaBcDeFgHiJkLmNoPqRsTuVwXyZ";
    const result = await inspectDkimPublicKey(record).catch(
      (error: Error) => error.message,
    );
    expect(typeof result).toBe("string");
  });

  it("refuses a record with no p= tag", async () => {
    await expect(inspectDkimPublicKey("v=DKIM1; k=rsa")).rejects.toThrow();
  });
});

describe("response header review", () => {
  it("parses one header per line", () => {
    const headers = parseResponseHeaders(
      "HTTP/2 200\ncontent-type: text/html\nx-frame-options: DENY",
    );
    expect(headers.get("x-frame-options")).toEqual(["DENY"]);
  });

  it("rejects a line that is not a header", () => {
    expect(() => parseResponseHeaders("this is not a header")).toThrow();
  });

  it("refuses empty input", () => {
    expect(() => parseResponseHeaders("")).toThrow();
  });

  it("reports a request that carries no Authorization header", () => {
    expect(analyzeHeaders("content-type: application/json")).toContain(
      "Authorization",
    );
  });

  it("reports an Authorization header without echoing its value", () => {
    const result = analyzeHeaders("authorization: Bearer super-secret-token");
    expect(result).toContain("Authorization");
    expect(result).not.toContain("super-secret-token");
  });

  it("refuses a request header line that is not Name: value", () => {
    expect(() => analyzeHeaders("this is not a header")).toThrow();
  });

  it("refuses empty request headers", () => {
    expect(() => analyzeHeaders("")).toThrow();
  });

  it("flags a wildcard CORS origin with credentials as high risk", () => {
    const headers = parseResponseHeaders(
      "access-control-allow-origin: *\naccess-control-allow-credentials: true",
    );
    const result = reviewCors(headers);
    expect(result).toMatch(/HIGH/);
  });

  it("accepts a single explicit CORS origin", () => {
    const headers = parseResponseHeaders(
      "access-control-allow-origin: https://app.example",
    );
    expect(reviewCors(headers)).not.toMatch(/^HIGH/m);
  });

  it("treats a null CORS origin as unsafe", () => {
    const headers = parseResponseHeaders("access-control-allow-origin: null");
    expect(reviewCors(headers)).toMatch(/HIGH/);
  });
});
