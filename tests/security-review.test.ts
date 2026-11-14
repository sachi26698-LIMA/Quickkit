import { describe, expect, it } from "vitest";
import {
  parseResponseHeaders,
  reviewCsp,
  reviewCookies,
  reviewFrameOptions,
  reviewHeaders,
  reviewHsts,
  reviewRobots,
  securityTxt,
  validateSecurityTxt,
} from "../lib/tools/security/review";
import {
  analyzeEmailHeaders,
  reviewSpf,
  reviewDkim,
  reviewDmarc,
} from "../lib/tools/security/email";
import { legalDraft } from "../lib/tools/security/legal";

describe("local security and privacy reviews", () => {
  it("reviews headers without echoing cookies", () => {
    const result = reviewHeaders(
      "HTTP/1.1 200 OK\nSet-Cookie: sid=secret\nStrict-Transport-Security: max-age=0",
    );
    expect(result).toContain("disables HSTS");
    expect(result).not.toContain("sid=secret");
    expect(() => parseResponseHeaders("not a header")).toThrow();
  });
  it("flags common CSP issues, duplicate directives and missing headers", () => {
    expect(
      reviewCsp("default-src *; script-src 'unsafe-inline'; script-src 'self'"),
    ).toContain("Duplicate");
    expect(reviewCsp("script-src 'unsafe-eval'")).toContain("unsafe-eval");
    expect(() => reviewCsp("")).toThrow();
  });
  it("reviews HSTS, cookie and framing settings", () => {
    expect(reviewHsts("max-age=31536000; includeSubDomains")).toContain(
      "includeSubDomains: present",
    );
    expect(reviewHsts("max-age=bad")).toContain("invalid");
    expect(reviewCookies("Set-Cookie: a=secret; SameSite=None")).toContain(
      "requires Secure",
    );
    expect(reviewCookies("a=secret; Secure; HttpOnly")).not.toContain("secret");
    expect(reviewFrameOptions("DENY")).toContain("blocks framing");
    expect(reviewFrameOptions("ALLOW-FROM foo")).toContain("obsolete");
  });
  it("does not represent robots.txt as access control", () =>
    expect(reviewRobots("User-agent: *\nDisallow: /private")).toContain(
      "not access control",
    ));
  it("validates security.txt contact and expiry", () => {
    expect(securityTxt("mailto:security@example.com", "2099-01-01")).toContain(
      "Contact: mailto:",
    );
    expect(() => securityTxt("http://example.com", "2099-01-01")).toThrow();
    expect(() =>
      securityTxt("mailto:test@example.com", "2000-01-01"),
    ).toThrow();
  });
  it("rejects normalized invalid security.txt dates and accepts real leap days", () => {
    expect(() => securityTxt("mailto:a@example.com", "2099-02-29")).toThrow();
    expect(securityTxt("mailto:a@example.com", "2096-02-29")).toContain(
      "2096-02-29",
    );
    const review = (date: string) =>
      validateSecurityTxt(
        `Contact: mailto:a@example.com\nExpires: ${date}`,
        Date.parse("2026-01-01T00:00:00Z"),
      );
    expect(review("2099-02-29T12:00:00Z")).toContain("HIGH");
    expect(review("2096-02-29T12:00:00+05:30")).not.toContain("HIGH");
    expect(review("2096-02-29T12:00:60Z")).toContain(
      "leap seconds are not supported",
    );
    expect(review("2096-02-29T12:00:00+24:00")).toContain("HIGH");
  });
  it("treats email authentication results as unverified", () => {
    expect(
      analyzeEmailHeaders(
        "Received: from example\nAuthentication-Results: example; spf=pass",
      ),
    ).toContain("can be forged");
    expect(() => analyzeEmailHeaders("no colon")).toThrow();
  });
  it("reviews SPF, DKIM and DMARC without claiming DNS verification", () => {
    expect(reviewSpf("v=spf1 +all")).toContain("Warning");
    expect(() => reviewSpf("hello")).toThrow();
    expect(reviewDkim("v=DKIM1; p=")).toContain("revoked");
    expect(() => reviewDkim("v=DKIM1")).toThrow();
    expect(reviewDmarc("v=DMARC1; p=none")).toContain("Monitoring");
    expect(() => reviewDmarc("v=DMARC1; p=bad")).toThrow();
  });
  it.each([
    "privacy-policy",
    "cookie-policy",
    "retention-policy",
    "consent-notice",
    "dpa",
  ] as const)("creates %s draft with user facts and legal warning", (mode) => {
    const facts = Object.fromEntries(
      [
        "organization",
        "contact",
        "data",
        "purpose",
        "sharing",
        "retention",
        "rights",
        "cookies",
        "choices",
        "deletion",
        "responsibilities",
        "consequences",
        "parties",
        "processing",
        "instructions",
        "security",
        "termination",
      ].map((field) => [field, `Example ${field}`]),
    );
    const draft = legalDraft(mode, JSON.stringify(facts));
    expect(draft).toContain("Legal review required");
    expect(draft).toContain("Example organization");
    expect(() => legalDraft(mode, "{}")).toThrow();
  });
});

it("produces actionable static header findings without exposing sensitive values", () => {
  const report = reviewHeaders(
    [
      "Content-Security-Policy-Report-Only: default-src 'self'",
      "X-Content-Type-Options: invalid",
      "X-Frame-Options: ALLOW-FROM https://example.org",
      "Set-Cookie: session=private-cookie",
      "Authorization: Bearer private-token",
    ].join("\n"),
  );
  expect(report).toContain("Only a report-only CSP");
  expect(report).toContain("nosniff");
  expect(report).toContain("unrecognized or obsolete");
  expect(report).toContain("no site was contacted");
  expect(report).not.toContain("private-cookie");
  expect(report).not.toContain("private-token");
  const strong = reviewHeaders(
    "Content-Security-Policy: default-src 'self'; frame-ancestors 'none'\nStrict-Transport-Security: max-age=31536000\nX-Content-Type-Options: nosniff\nReferrer-Policy: no-referrer\nPermissions-Policy: camera=()\nX-Frame-Options: DENY",
  );
  expect(strong).toContain("No listed findings detected");
  expect(strong).not.toContain("HIGH:");
  expect(
    reviewHeaders(
      "Strict-Transport-Security: max-age=0\nStrict-Transport-Security: max-age=1",
    ),
  ).toContain("Multiple HSTS");
});
