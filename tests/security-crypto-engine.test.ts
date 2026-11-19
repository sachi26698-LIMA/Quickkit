import { describe, expect, it } from "vitest";
import {
  generateRsaKeys,
  generateRsaSigningKeys,
  rsaDecrypt,
  rsaEncrypt,
  signRsaMessage,
  verifyRsaSignature,
} from "@/lib/tools/security/rsa";
import { hmac } from "@/lib/tools/security/hmac";
import { verifyJwt } from "@/lib/tools/security/jwt-verify";
import { compareCertificateDnsName } from "@/lib/tools/security/certificate";
import {
  generateCsp,
  generatePermissionsPolicy,
} from "@/lib/tools/security/review";
import { analyzeUrlBatch } from "@/lib/tools/security/url-review";
import { addBusinessDays, buildInterviewPlan } from "@/lib/tools/hr/documents";
import { descriptionPixels, pixelWidth } from "@/lib/tools/seo/analyze";
import { actionVerbs, buildBullet } from "@/lib/tools/career/letters";

describe("RSA encryption", () => {
  it("round-trips a message through an RSA key pair", async () => {
    const { publicKey, privateKey } = await generateRsaKeys(2048);
    const cipher = await rsaEncrypt("hello", publicKey);
    expect(await rsaDecrypt(cipher, privateKey)).toBe("hello");
  }, 30_000);

  it("rejects a key size it was not asked to support", async () => {
    await expect(generateRsaKeys(1024)).rejects.toThrow();
  }, 30_000);

  it("refuses to encrypt an empty message", async () => {
    const { publicKey } = await generateRsaKeys(2048);
    await expect(rsaEncrypt("", publicKey)).rejects.toThrow();
  }, 30_000);

  it("refuses a message longer than the key can hold", async () => {
    const { publicKey } = await generateRsaKeys(2048);
    await expect(rsaEncrypt("x".repeat(1000), publicKey)).rejects.toThrow(
      /at most/,
    );
  }, 30_000);

  it("fails to decrypt with the wrong key", async () => {
    const first = await generateRsaKeys(2048);
    const second = await generateRsaKeys(2048);
    const cipher = await rsaEncrypt("hello", first.publicKey);
    await expect(rsaDecrypt(cipher, second.privateKey)).rejects.toThrow(
      /Decryption failed/,
    );
  }, 60_000);

  it("rejects a ciphertext that is not base64url", async () => {
    const { privateKey } = await generateRsaKeys(2048);
    await expect(rsaDecrypt("not*base64", privateKey)).rejects.toThrow();
  }, 30_000);
});

describe("RSA signatures", () => {
  it("verifies a signature it just produced", async () => {
    const { publicKey, privateKey } = await generateRsaSigningKeys(2048);
    const signature = await signRsaMessage("hello", privateKey);
    expect(await verifyRsaSignature("hello", signature, publicKey)).toContain(
      "SIGNATURE VALID",
    );
  }, 30_000);

  it("rejects a signature over a different message", async () => {
    const { publicKey, privateKey } = await generateRsaSigningKeys(2048);
    const signature = await signRsaMessage("hello", privateKey);
    expect(await verifyRsaSignature("goodbye", signature, publicKey)).toContain(
      "SIGNATURE INVALID",
    );
  }, 30_000);

  it("says key ownership and trust are not verified", async () => {
    const { publicKey, privateKey } = await generateRsaSigningKeys(2048);
    const signature = await signRsaMessage("hello", privateKey);
    expect(await verifyRsaSignature("hello", signature, publicKey)).toContain(
      "trust are not verified",
    );
  }, 30_000);

  it("rejects a signature that is not hexadecimal", async () => {
    const { publicKey } = await generateRsaSigningKeys(2048);
    await expect(
      verifyRsaSignature("hello", "zzzz", publicKey),
    ).rejects.toThrow();
  }, 30_000);
});

describe("HMAC", () => {
  // A 32-byte key, because the engine refuses anything shorter — an HMAC key
  // that is a password is a weak HMAC key.
  const KEY = "a-shared-secret-of-32-bytes!!!";

  it("produces the same digest for the same message and key", async () => {
    const first = await hmac("message", KEY, "utf8", "SHA-256");
    const second = await hmac("message", KEY, "utf8", "SHA-256");
    expect(first).toBe(second);
  });

  it("produces a different digest for a different message", async () => {
    const first = await hmac("message", KEY, "utf8", "SHA-256");
    const second = await hmac("other", KEY, "utf8", "SHA-256");
    expect(first).not.toBe(second);
  });

  it("produces a digest of the right length for the hash", async () => {
    expect(await hmac("message", KEY, "utf8", "SHA-256")).toHaveLength(64);
    expect(await hmac("message", KEY, "utf8", "SHA-512")).toHaveLength(128);
  });

  it("accepts a hex key", async () => {
    const result = await hmac(
      "message",
      "0a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20",
      "hex",
      "SHA-256",
    );
    expect(result).toHaveLength(64);
  });

  it("rejects a key shorter than 16 bytes", async () => {
    await expect(hmac("message", "short", "utf8", "SHA-256")).rejects.toThrow(
      /16–4096 bytes/,
    );
  });

  it("rejects a hex key with an odd number of digits", async () => {
    await expect(hmac("message", "abc", "hex", "SHA-256")).rejects.toThrow();
  });

  it("rejects an unsupported hash", async () => {
    await expect(
      hmac("message", KEY, "utf8", "MD5" as "SHA-256"),
    ).rejects.toThrow();
  });

  it("verifies a digest that matches", async () => {
    const digest = await hmac("message", KEY, "utf8", "SHA-256");
    const result = await hmac("message", KEY, "utf8", "SHA-256", digest);
    expect(result).toContain("MATCHES");
  });

  it("reports a digest that does not match", async () => {
    const result = await hmac(
      "message",
      KEY,
      "utf8",
      "SHA-256",
      "deadbeef".repeat(8),
    );
    expect(result).toContain("DOES NOT MATCH");
  });

  it("says a valid tag does not establish who owns the key", async () => {
    const digest = await hmac("message", KEY, "utf8", "SHA-256");
    const result = await hmac("message", KEY, "utf8", "SHA-256", digest);
    expect(result).toContain("does not establish who owns");
  });
});

describe("JWT verification", () => {
  /** Build an HS256 token with the Web Crypto API, as the tool does. */
  async function makeToken(
    claims: Record<string, unknown>,
    secret: string,
  ): Promise<string> {
    const encoder = new TextEncoder();
    const toUrl = (bytes: Uint8Array) =>
      btoa(String.fromCharCode(...bytes))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
    const head = toUrl(
      encoder.encode(JSON.stringify({ alg: "HS256", typ: "JWT" })),
    );
    const body = toUrl(encoder.encode(JSON.stringify(claims)));
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const signature = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(`${head}.${body}`),
    );
    return `${head}.${body}.${toUrl(new Uint8Array(signature))}`;
  }

  const SECRET = "a-secret-key-of-at-least-32-bytes-long";

  it("verifies a token it signed", async () => {
    const token = await makeToken({ sub: "1" }, SECRET);
    const result = await verifyJwt(token, "HS256", SECRET);
    expect(result).toContain("SIGNATURE VALID");
  });

  it("rejects a token signed with a different key", async () => {
    const token = await makeToken({ sub: "1" }, SECRET);
    const result = await verifyJwt(
      token,
      "HS256",
      "a-different-secret-key-of-32-bytes-long!!",
    );
    expect(result).toContain("SIGNATURE INVALID");
  });

  it("reports an expired token", async () => {
    const token = await makeToken({ exp: 1000 }, SECRET);
    const result = await verifyJwt(token, "HS256", SECRET);
    expect(result).toContain("expired");
  });

  it("does not report expiry for a token that is still valid", async () => {
    const token = await makeToken({ exp: 4_000_000_000 }, SECRET);
    const result = await verifyJwt(token, "HS256", SECRET);
    expect(result).not.toContain("Token is expired");
    expect(result).toContain("SIGNATURE VALID");
  });

  it("rejects a token that is not three parts", async () => {
    await expect(verifyJwt("a.b", "HS256", SECRET)).rejects.toThrow();
  });

  it("rejects an unsupported algorithm", async () => {
    await expect(
      verifyJwt("a.b.c", "none" as "HS256", SECRET),
    ).rejects.toThrow();
  });

  it("says the signature does not prove the issuer is trustworthy", async () => {
    const token = await makeToken({ sub: "1" }, SECRET);
    const result = await verifyJwt(token, "HS256", SECRET);
    expect(result.toLowerCase()).toContain("trust");
  });
});

describe("certificate hostname matching", () => {
  it("matches an exact name", () => {
    expect(compareCertificateDnsName("example.com", ["example.com"])).toBe(
      true,
    );
  });

  it("matches a wildcard on the leftmost label only", () => {
    expect(
      compareCertificateDnsName("www.example.com", ["*.example.com"]),
    ).toBe(true);
  });

  it("matches a wildcard leftmost label against one extra label", () => {
    expect(
      compareCertificateDnsName("a.b.example.com", ["*.b.example.com"]),
    ).toBe(true);
  });

  it("does not match a wildcard against a deeper host", () => {
    expect(
      compareCertificateDnsName("x.a.b.example.com", ["*.b.example.com"]),
    ).toBe(false);
  });

  it("does not match a wildcard that appears in any other position", () => {
    expect(compareCertificateDnsName("a.example.com", ["a.*.com"])).toBe(false);
  });

  it("does not match a different domain", () => {
    expect(compareCertificateDnsName("other.com", ["example.com"])).toBe(false);
  });

  it("rejects a hostname with a scheme", () => {
    expect(() =>
      compareCertificateDnsName("https://example.com", ["example.com"]),
    ).toThrow();
  });

  it("rejects an empty hostname", () => {
    expect(() => compareCertificateDnsName("", ["example.com"])).toThrow();
  });
});

describe("policy generators", () => {
  it("builds a CSP with a default-src", () => {
    const result = generateCsp("none", false, "");
    expect(result).toContain("default-src 'self'");
    expect(result).toContain("frame-ancestors 'none'");
  });

  it("adds data: to img-src only when asked", () => {
    expect(generateCsp("self", true, "")).toContain("img-src 'self' data:");
    expect(generateCsp("self", false, "")).not.toContain("data:");
  });

  it("refuses a connect origin that is not HTTPS", () => {
    expect(() => generateCsp("self", false, "http://example.com")).toThrow();
  });

  it("refuses a connect origin with a path", () => {
    expect(() =>
      generateCsp("self", false, "https://example.com/api"),
    ).toThrow();
  });

  it("refuses a connect origin with credentials", () => {
    expect(() =>
      generateCsp("self", false, "https://user:pass@example.com"),
    ).toThrow();
  });

  it("says a starter policy is not a guarantee", () => {
    expect(generateCsp("none", false, "")).toContain(
      "does not guarantee protection",
    );
  });

  it("builds a permissions policy for the supported features", () => {
    const result = generatePermissionsPolicy({
      camera: "none",
      microphone: "none",
      geolocation: "self",
      payment: "none",
    });
    expect(result).toContain("camera=()");
    expect(result).toContain("geolocation=(self)");
  });

  it("refuses a feature value it does not support", () => {
    expect(() =>
      generatePermissionsPolicy({
        camera: "*" as "none",
        microphone: "none",
        geolocation: "none",
        payment: "none",
      }),
    ).toThrow();
  });
});

describe("batch URL review", () => {
  it("reviews every URL in the batch", () => {
    const result = analyzeUrlBatch("https://example.com\nhttp://example.org");
    expect(result).toContain("URL 1");
    expect(result).toContain("URL 2");
  });

  it("says no destination was contacted", () => {
    expect(analyzeUrlBatch("https://example.com")).toContain(
      "No destinations were contacted",
    );
  });

  it("reports a bad line without echoing it", () => {
    const result = analyzeUrlBatch("https://example.com\nnot a url");
    expect(result).toContain("Unable to review");
    expect(result).not.toContain("not a url");
  });

  it("refuses an empty batch", () => {
    expect(() => analyzeUrlBatch("")).toThrow();
  });

  it("refuses a batch with too many URLs", () => {
    expect(() =>
      analyzeUrlBatch(
        Array.from({ length: 26 }, (_, i) => `https://e${i}.com`).join("\n"),
      ),
    ).toThrow();
  });
});

describe("addBusinessDays", () => {
  it("adds business days, skipping the weekend", () => {
    // 2026-03-02 is a Monday, so ten business days later is Monday the 16th:
    // the count starts the day after the start date and never lands on a
    // weekend.
    const result = addBusinessDays({ from: "2026-03-02", days: 10 });
    expect(result.date).toBe("2026-03-16");
  });

  it("skips a declared holiday and says so", () => {
    const result = addBusinessDays({
      from: "2026-03-02",
      days: 5,
      holidays: ["2026-03-04"],
    });
    expect(result.skipped).toContain("2026-03-04");
    expect(result.date).toBe("2026-03-10");
  });

  it("counts backwards for a negative number of days", () => {
    const result = addBusinessDays({ from: "2026-03-16", days: -10 });
    expect(result.date).toBe("2026-03-02");
  });

  it("returns nothing for an invalid date", () => {
    expect(addBusinessDays({ from: "not-a-date", days: 5 }).date).toBe("");
  });
});

describe("buildInterviewPlan", () => {
  it("builds questions for a known competency", () => {
    const result = buildInterviewPlan({
      role: "Backend Engineer",
      competencies: ["problem solving"],
    });
    expect(result.questions.length).toBeGreaterThan(0);
    expect(result.issues.length).toBe(0);
  });

  it("reports a competency that has no question bank", () => {
    const result = buildInterviewPlan({
      role: "Backend Engineer",
      competencies: ["underwater basket weaving"],
    });
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it("caps the questions per competency", () => {
    const result = buildInterviewPlan({
      role: "Backend Engineer",
      competencies: ["problem solving"],
      questionsPerCompetency: 99,
    });
    const perCompetency = result.questions.filter(
      (item) => item.competency === "problem solving",
    ).length;
    expect(perCompetency).toBe(3);
  });
});

describe("pixel width", () => {
  it("measures wide characters as wider than narrow ones", () => {
    expect(pixelWidth("WWWWW")).toBeGreaterThan(pixelWidth("iiiii"));
  });

  it("measures an empty string as zero", () => {
    expect(pixelWidth("")).toBe(0);
  });

  it("checks a description against the pixel budget", () => {
    expect(descriptionPixels("x".repeat(50)).status).toBe("ok");
    expect(descriptionPixels("x".repeat(10)).status).toBe("short");
    expect(descriptionPixels("x".repeat(120)).status).toBe("long");
  });
});

describe("career bullet building", () => {
  it("suggests action verbs for a named area", () => {
    const verbs = actionVerbs("engineering");
    expect(verbs.length).toBeGreaterThan(0);
  });

  it("falls back to generic verbs for an unknown area", () => {
    expect(actionVerbs("not an area").length).toBeGreaterThan(0);
  });

  it("builds a bullet from the facts supplied", () => {
    const result = buildBullet({
      verb: "Led",
      action: "Migrated",
      object: "40 services to Kubernetes",
      outcome: "cut deploy time by half",
    });
    expect(result.bullet).toContain("Kubernetes");
    expect(result.complete).toBe(true);
  });

  it("never invents a metric", () => {
    const result = buildBullet({
      verb: "Led",
      action: "Migrated",
      object: "40 services",
      outcome: "improved reliability",
    });
    expect(result.bullet).not.toMatch(/\d+%/);
  });

  it("lists what is still missing", () => {
    const result = buildBullet({ action: "", object: "", outcome: "" });
    expect(result.complete).toBe(false);
    expect(result.missing.length).toBeGreaterThan(0);
  });
});
