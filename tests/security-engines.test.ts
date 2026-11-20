import { describe, expect, it } from "vitest";
import {
  assessPassword,
  base64url,
  bytesToUrl,
  compareHashes,
  decodeJwt,
  entropy,
  generateKey,
  passwordPolicy,
  passphrase,
  randomString,
  secureIndex,
  sensitiveInfo,
  urlToBytes,
} from "@/lib/tools/security/logic";
import { parseUniqueJsonObject } from "@/lib/tools/security/json-object";
import {
  reviewCookies,
  reviewCsp,
  reviewFrameOptions,
  reviewHeaders,
  reviewHsts,
  reviewRobots,
  securityTxt,
  validateSecurityTxt,
} from "@/lib/tools/security/review";
import { reviewDmarc, reviewDkim, reviewSpf } from "@/lib/tools/security/email";
import { analyzeUrl } from "@/lib/tools/security/url-review";
import { validatePublicDomain } from "@/lib/tools/security/network";

describe("secure randomness", () => {
  it("stays inside the requested range", () => {
    for (let i = 0; i < 200; i++) {
      const value = secureIndex(10);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(10);
    }
  });

  it("rejects an impossible range instead of returning a biased value", () => {
    expect(() => secureIndex(0)).toThrow();
    expect(() => secureIndex(-1)).toThrow();
    expect(() => secureIndex(1.5)).toThrow();
    expect(() => secureIndex(70_000)).toThrow();
  });

  it("produces the requested length", () => {
    expect(randomString("abcdefghij", 32)).toHaveLength(32);
  });

  it("rejects an alphabet with repeats, which would skew the selection", () => {
    expect(() => randomString("aab", 4)).toThrow();
  });

  it("rejects a single-character alphabet", () => {
    expect(() => randomString("a", 4)).toThrow();
  });

  it("makes a passphrase from the given number of words", () => {
    const phrase = passphrase(5, "-", false);
    expect(phrase.split("-")).toHaveLength(5);
  });

  it("refuses to make a passphrase outside the safe range", () => {
    expect(() => passphrase(2, "-", false)).toThrow();
    expect(() => passphrase(50, "-", false)).toThrow();
  });

  it("generates a 256-bit key as 64 hex characters", () => {
    expect(generateKey()).toMatch(/^[a-f0-9]{64}$/);
  });

  it("generates a different key each time", () => {
    expect(generateKey()).not.toBe(generateKey());
  });
});

describe("password assessment", () => {
  it("warns about a short password", () => {
    expect(assessPassword("abc")).toContain("16 characters");
  });

  it("flags a common password", () => {
    expect(assessPassword("password123")).toContain("common");
  });

  it("does not claim a password is unbreakable", () => {
    const result = assessPassword("correct-horse-battery-staple-9");
    expect(result).toContain("not a guarantee");
  });

  it("says the entropy formula is not a strength estimate", () => {
    expect(entropy(16, 94)).toContain("not a strength estimate");
  });

  it("rejects an empty password", () => {
    expect(() => assessPassword("")).toThrow();
  });
});

describe("passwordPolicy", () => {
  it("reports a sample that satisfies the requirements", () => {
    const result = passwordPolicy(
      12,
      { uppercase: true, lowercase: true, digit: true, symbol: true },
      "Str0ng!Passphrase",
    );
    expect(result).toContain("meets");
  });

  it("reports a sample that does not", () => {
    const result = passwordPolicy(
      12,
      { uppercase: true, lowercase: true, digit: true, symbol: true },
      "weak",
    );
    expect(result.toLowerCase()).toContain("does not");
  });

  it("rejects a minimum length outside the safe range", () => {
    expect(() =>
      passwordPolicy(4, {
        uppercase: true,
        lowercase: true,
        digit: true,
        symbol: true,
      }),
    ).toThrow();
  });
});

describe("base64url", () => {
  it("round-trips UTF-8 text", () => {
    const encoded = base64url("héllo wörld ✓", false);
    expect(base64url(encoded, true)).toBe("héllo wörld ✓");
  });

  it("produces URL-safe output with no padding", () => {
    const encoded = base64url("subject?subject_1", false);
    expect(encoded).not.toMatch(/[+/=]/);
  });

  it("rejects invalid base64url input", () => {
    expect(() => base64url("not*valid*base64", true)).toThrow();
  });

  it("round-trips raw bytes", () => {
    const bytes = new Uint8Array([0, 1, 250, 255]);
    expect(Array.from(urlToBytes(bytesToUrl(bytes)))).toEqual([0, 1, 250, 255]);
  });
});

describe("compareHashes", () => {
  it("reports a match", () => {
    expect(compareHashes("abc123", "ABC123")).toContain("match");
  });

  it("reports a mismatch", () => {
    expect(compareHashes("abc123", "abc124")).toContain("do not match");
  });

  it("warns that a length does not identify the algorithm", () => {
    expect(compareHashes("abc123", "abc124")).toContain("does not identify");
  });

  it("says a match does not establish authenticity", () => {
    expect(compareHashes("abc123", "abc123")).toContain("authenticity");
  });

  it("rejects a digest that is not hexadecimal", () => {
    expect(() => compareHashes("zzz", "abc")).toThrow();
  });

  it("rejects an odd-length digest", () => {
    expect(() => compareHashes("abc", "abc")).toThrow();
  });
});

describe("decodeJwt", () => {
  const encode = (value: unknown) =>
    bytesToUrl(new TextEncoder().encode(JSON.stringify(value)));

  it("decodes the header and claims", () => {
    const token = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: "1" })}.sig`;
    const result = decodeJwt(token);
    expect(result).toContain("HS256");
    expect(result).toContain('"sub"');
  });

  it("says the signature is not verified", () => {
    const token = `${encode({ alg: "none" })}.${encode({})}.sig`;
    expect(decodeJwt(token)).toContain("UNVERIFIED");
  });

  it("reports an expired token against the device clock", () => {
    const token = `${encode({ alg: "HS256" })}.${encode({ exp: 1000 })}.sig`;
    expect(decodeJwt(token)).toContain("Expired");
  });

  it("reports a token that has not expired", () => {
    const token = `${encode({ alg: "HS256" })}.${encode({ exp: 4_000_000_000 })}.sig`;
    expect(decodeJwt(token)).toContain("Not expired");
  });

  it("rejects a token that is not three parts", () => {
    expect(() => decodeJwt("only.two")).toThrow();
  });

  it("rejects an alg of none without treating it as signed", () => {
    const token = `${encode({ alg: "none" })}.${encode({})}.sig`;
    expect(decodeJwt(token)).toContain("UNVERIFIED");
  });
});

describe("parseUniqueJsonObject", () => {
  it("parses a plain object", () => {
    expect(parseUniqueJsonObject('{"a":1}')).toEqual({ a: 1 });
  });

  it("rejects a duplicate member", () => {
    expect(() => parseUniqueJsonObject('{"a":1,"a":2}')).toThrow();
  });

  it("rejects an array", () => {
    expect(() => parseUniqueJsonObject("[1,2]")).toThrow();
  });

  it("rejects invalid JSON", () => {
    expect(() => parseUniqueJsonObject("{oops")).toThrow();
  });
});

describe("sensitiveInfo", () => {
  it("counts an email address without echoing it back", () => {
    const result = sensitiveInfo("write to ravi@example.com", false);
    expect(result).toContain("Potential email addresses: 1");
    expect(result).not.toContain("ravi@example.com");
  });

  it("masks an email address when asked", () => {
    const result = sensitiveInfo("write to ravi@example.com", true);
    expect(result).not.toContain("ravi@example.com");
    expect(result).toContain("[EMAIL]");
  });

  it("does not report a plain number as a phone number", () => {
    const result = sensitiveInfo("the total was 1234", false);
    expect(result).toContain("Potential phone-like strings: 0");
  });

  it("says a checksum does not confirm an active card", () => {
    expect(sensitiveInfo("4111111111111111", false)).toContain(
      "does not confirm an active card",
    );
  });
});

describe("header reviews", () => {
  it("reads the HSTS max-age", () => {
    expect(reviewHsts("max-age=31536000; includeSubDomains")).toContain(
      "31536000",
    );
  });

  it("says a max-age of zero disables HSTS", () => {
    expect(reviewHsts("max-age=0")).toContain("disables HSTS");
  });

  it("rejects a duplicate max-age", () => {
    expect(reviewHsts("max-age=100; max-age=200")).toContain("duplicate");
  });

  it("reports a missing default-src in a CSP", () => {
    expect(reviewCsp("script-src 'self'")).toContain("No default-src");
  });

  it("flags unsafe-inline in a CSP", () => {
    expect(
      reviewCsp("default-src 'self'; script-src 'unsafe-inline'"),
    ).toContain("unsafe-inline");
  });

  it("flags a wildcard source", () => {
    expect(reviewCsp("default-src *")).toContain("Wildcard");
  });

  it("says it is a limited static review, not a guarantee", () => {
    expect(reviewCsp("default-src 'self'")).toContain("not a complete CSP");
  });

  it("flags a cookie with no Secure flag", () => {
    const result = reviewCookies("session=abc123; HttpOnly");
    expect(result.toLowerCase()).toContain("secure");
  });

  it("accepts a fully flagged cookie", () => {
    const result = reviewCookies(
      "session=abc123; Secure; HttpOnly; SameSite=Strict",
    );
    expect(result.toLowerCase()).not.toContain("missing secure");
  });

  it("reviews pasted response headers", () => {
    const result = reviewHeaders(
      "Content-Security-Policy: default-src 'self'\nX-Frame-Options: DENY",
    );
    expect(result.length).toBeGreaterThan(0);
  });

  it("reviews frame options", () => {
    expect(reviewFrameOptions("SAMEORIGIN").length).toBeGreaterThan(0);
  });

  it("reviews a robots.txt", () => {
    expect(
      reviewRobots("User-agent: *\nDisallow: /admin/").length,
    ).toBeGreaterThan(0);
  });
});

describe("security.txt", () => {
  const FUTURE = "2999-06-01";

  it("writes the contact and the expiry", () => {
    const result = securityTxt("mailto:security@example.com", FUTURE);
    expect(result).toContain("Contact: mailto:security@example.com");
    expect(result).toContain("Expires:");
  });

  it("refuses a contact that is not a mailto or HTTPS URL", () => {
    expect(() => securityTxt("javascript:alert(1)", FUTURE)).toThrow();
    expect(() => securityTxt("http://example.com", FUTURE)).toThrow();
  });

  it("refuses an expiry that is not in the future", () => {
    expect(() =>
      securityTxt("mailto:security@example.com", "2000-01-01"),
    ).toThrow();
  });

  it("accepts a well-formed security.txt", () => {
    const text = securityTxt("mailto:security@example.com", FUTURE);
    const result = validateSecurityTxt(
      text,
      Date.parse("2026-01-01T00:00:00Z"),
    );
    expect(result).not.toContain("HIGH:");
  });

  it("flags an expired security.txt", () => {
    const text = securityTxt("mailto:security@example.com", FUTURE);
    const result = validateSecurityTxt(
      text,
      Date.parse("2999-12-31T00:00:00Z"),
    );
    expect(result).toContain("HIGH: Expires is in the past");
  });

  it("says what it did not verify", () => {
    const text = securityTxt("mailto:security@example.com", FUTURE);
    expect(validateSecurityTxt(text)).toContain("were not verified");
  });
});

describe("email DNS reviews", () => {
  it("accepts a simple SPF record", () => {
    expect(
      reviewSpf("v=spf1 include:_spf.example.com -all").length,
    ).toBeGreaterThan(0);
  });

  it("flags SPF that ends in +all", () => {
    expect(reviewSpf("v=spf1 include:_spf.example.com +all")).toContain("+all");
  });

  it("flags more than ten SPF lookups", () => {
    const record = `v=spf1 ${Array.from(
      { length: 11 },
      (_, i) => `include:s${i}.example.com`,
    ).join(" ")} -all`;
    expect(reviewSpf(record)).toContain("10");
  });

  it("reviews a DMARC record", () => {
    expect(
      reviewDmarc("v=DMARC1; p=reject; rua=mailto:dmarc@example.com").length,
    ).toBeGreaterThan(0);
  });

  it("rejects a DMARC record with no policy", () => {
    expect(() =>
      reviewDmarc("v=DMARC1; rua=mailto:dmarc@example.com"),
    ).toThrow();
  });

  it("reviews DKIM key material", () => {
    expect(
      reviewDkim(
        "v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDExample; h=sha256;",
      ).length,
    ).toBeGreaterThan(0);
  });
});

describe("url review", () => {
  it("flags an http URL as unencrypted", () => {
    expect(analyzeUrl("http://example.com")).toContain(
      "HIGH: HTTP does not encrypt",
    );
  });

  it("does not flag an https URL as unencrypted", () => {
    expect(analyzeUrl("https://example.com")).not.toContain("does not encrypt");
  });

  it("says the review is not a phishing detector", () => {
    expect(analyzeUrl("https://example.com")).toContain(
      "not a reputation check, phishing detector",
    );
  });

  it("flags an IP address in place of a hostname", () => {
    expect(analyzeUrl("https://192.168.1.1/login").length).toBeGreaterThan(0);
  });

  it("flags embedded credentials in a URL", () => {
    expect(analyzeUrl("https://user:pass@example.com").length).toBeGreaterThan(
      0,
    );
  });
});

describe("validatePublicDomain", () => {
  it("accepts a normal domain", () => {
    expect(validatePublicDomain("Example.com")).toBe("example.com");
  });

  it("rejects a URL", () => {
    expect(() => validatePublicDomain("https://example.com")).toThrow();
  });

  it("rejects a local name", () => {
    expect(() => validatePublicDomain("localhost")).toThrow();
  });

  it("rejects an IP address", () => {
    expect(() => validatePublicDomain("192.168.1.1")).toThrow();
  });

  it("rejects a single-label name", () => {
    expect(() => validatePublicDomain("intranet")).toThrow();
  });
});
