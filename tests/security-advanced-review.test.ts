import { describe, expect, it } from "vitest";
import {
  generateCsp,
  generatePermissionsPolicy,
  validateSecurityTxt,
} from "../lib/tools/security/review";
import { assessPassword, sensitiveInfo } from "../lib/tools/security/logic";

describe("advanced local reviews", () => {
  it("constructs configurable CSP without directive injection", () => {
    const result = generateCsp("self", true, "https://api.example.com:8443");
    expect(result).toContain("frame-ancestors 'self'");
    expect(result).toContain("img-src 'self' data:");
    expect(result).toContain("connect-src 'self' https://api.example.com:8443");
    for (const bad of [
      "http://example.com",
      "https://example.com/path",
      "https://example.com; script-src *",
      "https://user:password@example.com",
    ])
      expect(() => generateCsp("none", false, bad)).toThrow();
  });
  it("builds feature-specific permissions policies", () => {
    expect(
      generatePermissionsPolicy({
        camera: "self",
        microphone: "none",
        geolocation: "none",
        payment: "none",
      }),
    ).toContain("camera=(self), microphone=()");
    expect(() => generatePermissionsPolicy({ camera: "self" })).toThrow();
  });
  it("checks required security.txt fields without claiming live verification", () => {
    expect(
      validateSecurityTxt(
        "Contact: mailto:security@example.com\nExpires: 2099-01-01T00:00:00Z",
      ),
    ).toContain("Publication location");
    expect(
      validateSecurityTxt(
        "Contact: mailto:security@example.com\nExpires: 2000-01-01T00:00:00Z",
      ),
    ).toContain("past");
    expect(validateSecurityTxt("Expires: bad")).toContain("Contact");
    expect(() => validateSecurityTxt("invalid field")).toThrow();
  });
  it("detects and masks Luhn-valid card patterns without returning card data", () => {
    const input = "Card 4111 1111 1111 1111; email example@example.com";
    const report = sensitiveInfo(input, false);
    expect(report).toContain("numbers (Luhn-valid): 1");
    expect(report).not.toContain("4111");
    expect(sensitiveInfo(input, true)).toBe("Card [CARD]; email [EMAIL]");
    expect(sensitiveInfo("4111 1111 1111 1112", false)).toContain(
      "numbers (Luhn-valid): 0",
    );
  });
  it("counts Unicode code points consistently and recognizes repeated non-BMP characters", () => {
    const short = assessPassword("🔐".repeat(8));
    expect(short).toContain("Length: 8 Unicode code points");
    expect(short).toContain("at least 16 characters");
    expect(short).toContain("repeated characters");
    expect(short).toContain("score: 0/4");
    expect(short).not.toContain("🔐");
  });
  it("does not rate a long predictable password as strong", () => {
    expect(assessPassword("password123456PASSWORD123456")).toContain(
      "score: 1/4",
    );
  });
});

describe("email record findings", () => {
  it("flags SPF DNS lookup budgets and unreachable terms", async () => {
    const { reviewSpf } = await import("../lib/tools/security/email");
    expect(
      reviewSpf(
        `v=spf1 ${Array.from({ length: 11 }, (_, i) => `include:d${i}.example.com`).join(" ")} -all`,
      ),
    ).toContain("exceed the SPF limit");
    expect(reviewSpf("v=spf1 -all include:example.com")).toContain(
      "unreachable",
    );
    expect(() => reviewSpf("v=spf1 -all\nextra")).toThrow();
  });
  it("validates duplicate and malformed DMARC and DKIM tags", async () => {
    const { reviewDmarc, reviewDkim } =
      await import("../lib/tools/security/email");
    expect(() => reviewDmarc("v=DMARC1; p=none; p=reject")).toThrow(
      "Duplicate",
    );
    expect(reviewDmarc("v=DMARC1; p=reject; pct=123; aspf=x")).toContain(
      "pct must",
    );
    expect(reviewDmarc("v=DMARC1; p=reject; pct=20")).toContain("below 100");
    expect(reviewDkim("v=DKIM1; p=bad!; k=rsa")).toContain(
      "not valid padded Base64",
    );
    expect(() => reviewDkim("v=DKIM1; p=; p=abc")).toThrow("Duplicate");
  });
});

it("reports CORS and cookie prefix risks without exposing values", async () => {
  const { reviewHeaders, reviewCookies, reviewHsts } =
    await import("../lib/tools/security/review");
  const cors = reviewHeaders(
    "Access-Control-Allow-Origin: *\nAccess-Control-Allow-Credentials: true",
  );
  expect(cors).toContain("Wildcard ACAO with credentials");
  expect(reviewHeaders("Access-Control-Allow-Origin: null")).toContain(
    "null origin",
  );
  expect(
    reviewHeaders("Access-Control-Allow-Origin: https://example.com"),
  ).toContain("Vary: Origin");
  const cookies = reviewCookies(
    "Set-Cookie: __Host-session=secret; Path=/; Domain=example.com\nSet-Cookie: __Secure-id=secret; Partitioned",
  );
  expect(cookies).toContain("__Host- requires");
  expect(cookies).toContain("__Secure- requires");
  expect(cookies).toContain("Partitioned requires Secure");
  expect(cookies).not.toContain("secret");
  expect(reviewHsts("max-age=10; max-age=20")).toContain("duplicate");
});

it("flags invalid, duplicate and ambiguous cookie attributes without leaking their values", async () => {
  const { reviewCookies } = await import("../lib/tools/security/review");
  const out = reviewCookies(
    "Set-Cookie: session=private; SameSite=secret; SameSite=Lax; Secure=1; Max-Age=oops",
  );
  expect(out).toContain("SameSite invalid");
  expect(out).toContain("Duplicate cookie attributes");
  expect(out).toContain("Flag attributes should not have values");
  expect(out).toContain("Invalid Max-Age");
  expect(out).not.toContain("private");
  expect(out).not.toContain("secret");
  expect(() => reviewCookies("invalid(name=value; Secure")).toThrow(
    "valid Set-Cookie",
  );
  expect(
    reviewCookies("__Host-a=v; Secure; Path=/; SameSite=Strict"),
  ).not.toContain("__Host- requires");
});

it("checks selected password policy requirements locally without returning the sample", async () => {
  const { passwordPolicy } = await import("../lib/tools/security/logic");
  const requirements = {
    uppercase: true,
    lowercase: true,
    digit: true,
    symbol: true,
  };
  const missing = passwordPolicy(8, requirements, "Åbcd1234");
  expect(missing).toContain("meets the minimum length");
  expect(missing).toContain(
    "Missing selected requirements: non-letter, non-number character",
  );
  expect(missing).not.toContain("Åbcd1234");
  expect(passwordPolicy(8, requirements, "Åbcd123!")).toContain(
    "Meets the selected composition requirements",
  );
  expect(passwordPolicy(8, requirements, "🔐".repeat(4))).toContain(
    "does not meet the minimum length",
  );
  expect(() => passwordPolicy(7, requirements)).toThrow();
});

it("distinguishes SPF static lookup terms from actual evaluation and spots malformed terms", async () => {
  const { reviewSpf, reviewDmarc } =
    await import("../lib/tools/security/email");
  const many = reviewSpf(
    `v=spf1 ${Array.from({ length: 11 }, (_, i) => `include:mail${i}.example`).join(" ")} -all`,
  );
  expect(many).toContain("may exceed the SPF limit");
  expect(many).toContain("not a count of lookups actually performed");
  expect(reviewSpf("v=spf1 -all redirect=example.com")).toContain(
    "redirect modifier to be ignored",
  );
  expect(reviewSpf("v=spf1 include -all")).toContain(
    "missing or invalid argument",
  );
  expect(
    reviewSpf(
      "v=spf1 include:example.com redirect=a.example redirect=b.example",
    ),
  ).toContain("Duplicate redirect");
  expect(reviewSpf("v=spf1 unknown -all")).toContain(
    "unrecognized or malformed mechanism",
  );
  expect(reviewDmarc("v=DMARC1; rua=mailto:a@example.com; p=reject")).toContain(
    "p must immediately follow",
  );
});
