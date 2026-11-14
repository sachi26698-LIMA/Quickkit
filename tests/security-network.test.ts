import { afterEach, describe, expect, it, vi } from "vitest";
import { lookupDns, validatePublicDomain } from "../lib/tools/security/network";
afterEach(() => vi.unstubAllGlobals());
describe("consent-based public DNS resolver", () => {
  it("validates names and rejects URLs, IP addresses and known local suffixes", () => {
    expect(validatePublicDomain("_dmarc.Example.com.")).toBe(
      "_dmarc.example.com",
    );
    for (const name of [
      "localhost",
      "192.168.1.1",
      "router.local",
      "a.internal",
      "https://example.com",
      "x.example.com/path",
      "a..com",
    ])
      expect(() => validatePublicDomain(name)).toThrow();
  });
  it("sends only the name and type to a fixed HTTPS resolver and reports AD cautiously", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          Status: 0,
          AD: true,
          Answer: [{ type: 1, TTL: 60, data: "203.0.113.1" }],
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const result = await lookupDns("example.com", "A");
    const [url, options] = fetchMock.mock.calls[0];
    expect(new URL(url).origin).toBe("https://cloudflare-dns.com");
    expect(new URL(url).searchParams.get("name")).toBe("example.com");
    expect(options.credentials).toBe("omit");
    expect(options.redirect).toBe("error");
    expect(result).toContain("resolver reports successful DNSSEC validation");
    expect(result).toContain("203.0.113.1");
  });
  it("does not call the resolver for malformed input and fails safely", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(lookupDns("http://127.0.0.1", "A")).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockResolvedValue(new Response("oops", { status: 500 }));
    await expect(lookupDns("example.com", "A")).rejects.toThrow("HTTP error");
  });
});

it("uses only ipify for the opt-in IPv4 check", async () => {
  const { lookupPublicIp } = await import("../lib/tools/security/network");
  const fetchMock = vi
    .fn()
    .mockResolvedValue(new Response('{"ip":"203.0.113.5"}', { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
  expect(await lookupPublicIp()).toContain("203.0.113.5");
  expect(fetchMock.mock.calls[0][0]).toBe("https://api.ipify.org?format=json");
});

it("allows network services only on their exact tool routes", async () => {
  vi.stubEnv("NODE_ENV", "production");
  vi.resetModules();
  try {
    const { default: config } = await import("../next.config");
    const rules = (await config.headers?.()) ?? [];
    for (const [path, host] of [
      ["/tools/dns-lookup", "https://cloudflare-dns.com"],
      ["/tools/dnssec-status-checker", "https://cloudflare-dns.com"],
      ["/tools/public-ip-information", "https://api.ipify.org"],
    ]) {
      const policy =
        rules
          .find((rule) => rule.source === path)
          ?.headers.find((header) => header.key === "Content-Security-Policy")
          ?.value ?? "";
      expect(policy).toContain(host);
      if (path === "/tools/public-ip-information")
        expect(policy).toContain("https://api64.ipify.org");
      expect(policy).not.toContain(
        host.includes("cloudflare")
          ? "https://api.ipify.org"
          : "https://cloudflare-dns.com",
      );
    }
    const global =
      rules
        .find((rule) => rule.source === "/:path*")
        ?.headers.find((header) => header.key === "Content-Security-Policy")
        ?.value ?? "";
    expect(global).not.toContain("https://cloudflare-dns.com");
    expect(global).not.toContain("https://api.ipify.org");
    expect(global).not.toContain("https://api64.ipify.org");
  } finally {
    vi.unstubAllEnvs();
  }
});

describe("opt-in public email TXT record lookup", () => {
  it("joins quoted TXT segments and rejects malformed or unsupported encoding", async () => {
    const { parseTxtPresentation } =
      await import("../lib/tools/security/network");
    expect(parseTxtPresentation('"v=spf1 " "include:example.com -all"')).toBe(
      "v=spf1 include:example.com -all",
    );
    expect(parseTxtPresentation('"hello\\032world"')).toBe("hello world");
    expect(() => parseTxtPresentation('"unterminated')).toThrow();
    expect(() => parseTxtPresentation('"a\\255"')).toThrow();
  });
  it.each([
    ["spf", "", "example.com", '"v=spf1 " "-all"', "All mechanism: -all"],
    [
      "dmarc",
      "",
      "_dmarc.example.com",
      '"v=DMARC1; p=reject"',
      "DMARC policy: reject",
    ],
    [
      "dkim",
      "selector1",
      "selector1._domainkey.example.com",
      '"v=DKIM1; k=rsa; p=YWJj"',
      "Public key tag: present",
    ],
  ] as const)(
    "queries the correct name for %s and reviews returned TXT",
    async (kind, selector, expectedName, txt, expected) => {
      const { lookupEmailRecord } =
        await import("../lib/tools/security/network");
      const fetchMock = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            Status: 0,
            AD: true,
            Answer: [{ name: expectedName, type: 16, TTL: 60, data: txt }],
          }),
        ),
      );
      vi.stubGlobal("fetch", fetchMock);
      const result = await lookupEmailRecord("example.com", kind, selector);
      expect(new URL(fetchMock.mock.calls[0][0]).searchParams.get("name")).toBe(
        expectedName,
      );
      expect(result).toContain(expected);
      expect(result).toContain("no email authentication");
    },
  );
  it("handles duplicates, NXDOMAIN and resolver failures without inventing success", async () => {
    const { lookupEmailRecord } = await import("../lib/tools/security/network");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          Status: 0,
          Answer: [
            { type: 16, TTL: 60, data: '"v=spf1 -all"' },
            { type: 16, TTL: 60, data: '"v=spf1 ~all"' },
          ],
        }),
      ),
    );
    expect(await lookupEmailRecord("example.com", "spf")).toContain(
      "Multiple matching records",
    );
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ Status: 3 })),
    );
    expect(await lookupEmailRecord("example.com", "dmarc")).toContain(
      "No matching record",
    );
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ Status: 2 })),
    );
    await expect(lookupEmailRecord("example.com", "spf")).rejects.toThrow(
      "inconclusive",
    );
    await expect(
      lookupEmailRecord("example.com", "dkim", "bad.selector"),
    ).rejects.toThrow("selector");
  });
  it("rejects truncated, oversized and invalid resolver responses", async () => {
    const { lookupEmailRecord } = await import("../lib/tools/security/network");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ Status: 0, TC: true })),
    );
    await expect(lookupEmailRecord("example.com", "spf")).rejects.toThrow(
      "truncated",
    );
    fetchMock.mockResolvedValueOnce(new Response("x".repeat(100_001)));
    await expect(lookupEmailRecord("example.com", "spf")).rejects.toThrow(
      "too large",
    );
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ Status: 0, Answer: [{ type: 16, data: 1, TTL: 60 }] }),
      ),
    );
    await expect(lookupEmailRecord("example.com", "spf")).rejects.toThrow(
      "Invalid resolver",
    );
  });
});

it("supports opt-in dual-stack IP lookup, validates addresses and bounds streamed replies", async () => {
  const { lookupPublicIp } = await import("../lib/tools/security/network");
  const mock = vi.fn();
  vi.stubGlobal("fetch", mock);
  mock.mockResolvedValueOnce(new Response('{"ip":"2001:db8::1"}'));
  expect(await lookupPublicIp("any")).toContain(
    "Public IPv6 observed by ipify: 2001:db8::1",
  );
  expect(mock.mock.calls[0][0]).toBe("https://api64.ipify.org?format=json");
  mock.mockResolvedValueOnce(new Response('{"ip":"203.0.113.42"}'));
  expect(await lookupPublicIp("any")).toContain("Public IPv4");
  for (const bad of [
    "001.2.3.4",
    "256.0.0.1",
    "fe80::1%eth0",
    "2001:::1",
    "https://x",
  ]) {
    mock.mockResolvedValueOnce(new Response(JSON.stringify({ ip: bad })));
    await expect(lookupPublicIp("any")).rejects.toThrow("Invalid IP");
  }
  mock.mockResolvedValueOnce(new Response("x".repeat(1001)));
  await expect(lookupPublicIp()).rejects.toThrow("too large");
});

it("rejects impossible DNS status and negative TTL", async () => {
  const mock = vi.fn();
  vi.stubGlobal("fetch", mock);
  mock.mockResolvedValueOnce(new Response(JSON.stringify({ Status: -1 })));
  await expect(lookupDns("example.com", "A")).rejects.toThrow(
    "Invalid resolver",
  );
  mock.mockResolvedValueOnce(
    new Response(
      JSON.stringify({
        Status: 0,
        Answer: [{ type: 1, TTL: -1, data: "203.0.113.1" }],
      }),
    ),
  );
  await expect(lookupDns("example.com", "A")).rejects.toThrow(
    "Invalid resolver",
  );
});

it("validates an entire DNS batch before sending sequential queries, and reports partial failures", async () => {
  const { lookupDnsBatch } = await import("../lib/tools/security/network");
  const mock = vi.fn();
  vi.stubGlobal("fetch", mock);
  await expect(lookupDnsBatch("example.com\nlocalhost", "A")).rejects.toThrow();
  await expect(
    lookupDnsBatch("example.com\nEXAMPLE.COM.", "A"),
  ).rejects.toThrow("duplicate");
  await expect(
    lookupDnsBatch(
      Array.from({ length: 11 }, (_, i) => `a${i}.example.com`).join("\n"),
      "A",
    ),
  ).rejects.toThrow("1–10");
  expect(mock).not.toHaveBeenCalled();
  mock
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          Status: 0,
          Answer: [{ type: 1, TTL: 60, data: "203.0.113.10" }],
        }),
      ),
    )
    .mockRejectedValueOnce(new Error("unreachable"));
  const report = await lookupDnsBatch("example.com\nexample.org", "A");
  expect(mock).toHaveBeenCalledTimes(2);
  expect(report).toContain("2 sequential queries");
  expect(report).toContain("203.0.113.10");
  expect(report).toContain("Lookup failed");
  expect(report).toContain("not evidence that a domain does not exist");
  expect(new URL(mock.mock.calls[0][0]).origin).toBe(
    "https://cloudflare-dns.com",
  );
});

it("stops a DNS batch on cancellation before sending further domains", async () => {
  const { lookupDnsBatch } = await import("../lib/tools/security/network");
  const controller = new AbortController();
  const mock = vi.fn().mockImplementation(async () => {
    controller.abort();
    return new Response(JSON.stringify({ Status: 0, Answer: [] }));
  });
  vi.stubGlobal("fetch", mock);
  await expect(
    lookupDnsBatch("example.com\nexample.org", "A", controller.signal),
  ).rejects.toThrow("canceled");
  expect(mock).toHaveBeenCalledTimes(1);
});
