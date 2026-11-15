import { describe, expect, it } from "vitest";
import { securityToolDefinitions } from "../lib/tools/security/catalog";
import {
  assessPassword,
  base64url,
  compareHashes,
  decodeJwt,
  decryptBytes,
  encryptBytes,
  entropy,
  generateKey,
  passphrase,
  randomString,
  sensitiveInfo,
  signJwt,
  textCrypto,
  analyzeHeaders,
} from "../lib/tools/security/logic";

describe("browser-local security workspaces", () => {
  it("has unique implemented slugs", () => {
    expect(new Set(securityToolDefinitions.map((tool) => tool.slug)).size).toBe(
      securityToolDefinitions.length,
    );
  });
  it("warns on common patterns without echoing passwords", () => {
    const result = assessPassword("password123456");
    expect(result).toContain("common");
    expect(result).not.toContain("password123456");
    expect(() => assessPassword("")).toThrow();
  });
  it("estimates random entropy only with valid parameters", () => {
    expect(entropy(10, 2)).toContain("10.00 bits");
    expect(() => entropy(0, 2)).toThrow();
    expect(() => entropy(10, 1)).toThrow();
  });
  it("generates random strings with a unique alphabet and valid bounds", () => {
    expect(randomString("ab", 40)).toMatch(/^[ab]{40}$/);
    expect(() => randomString("aab", 4)).toThrow();
    expect(() => randomString("ab", 0)).toThrow();
  });
  it("generates passphrases with configured count, case and separator", () => {
    expect(passphrase(8, "-", true).split("-")).toHaveLength(8);
    expect(passphrase(4, ".", true)).toMatch(
      /^[A-Z][a-z]+(?:\.[A-Z][a-z]+){3}$/,
    );
    expect(() => passphrase(3, "-", false)).toThrow();
  });
  it("round-trips Base64URL Unicode and rejects invalid input", () => {
    const encoded = base64url("ગુજરાતી 🔐", false);
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(base64url(encoded, true)).toBe("ગુજરાતી 🔐");
    expect(() => base64url("*", true)).toThrow();
  });
  it("compares case-insensitive hexadecimal hashes but does not imply authenticity", () => {
    expect(compareHashes("aaFF", "AAff")).toContain("match");
    expect(compareHashes("aa", "ab")).toContain("do not match");
    expect(() => compareHashes("a", "a")).toThrow();
  });
  it("generates a 256-bit hexadecimal key", () =>
    expect(generateKey()).toMatch(/^[0-9a-f]{64}$/));
  it("authenticates encrypted bytes and rejects wrong passwords, truncation, or tampering", async () => {
    const data = new TextEncoder().encode("secret 🔐");
    const encrypted = await encryptBytes(data, "test password");
    expect(
      new TextDecoder().decode(await decryptBytes(encrypted, "test password")),
    ).toBe("secret 🔐");
    await expect(decryptBytes(encrypted, "wrong password")).rejects.toThrow(
      "incorrect password or corrupted",
    );
    const damaged = encrypted.slice();
    damaged[damaged.length - 1] ^= 1;
    await expect(decryptBytes(damaged, "test password")).rejects.toThrow();
    await expect(
      decryptBytes(encrypted.slice(0, 12), "test password"),
    ).rejects.toThrow();
    expect(encrypted).not.toEqual(await encryptBytes(data, "test password"));
  });
  it("round-trips Unicode text and fails closed for invalid data", async () => {
    const encrypted = await textCrypto("hello 🌍", "test password", false);
    expect(await textCrypto(encrypted, "test password", true)).toBe("hello 🌍");
    await expect(
      textCrypto("invalid", "test password", true),
    ).rejects.toThrow();
    await expect(textCrypto("hello", "", false)).rejects.toThrow();
  });
  it("decrypts its own long text envelopes and rejects oversized UTF-8", async () => {
    const text = "a".repeat(750_000);
    const encrypted = await textCrypto(text, "test password", false);
    expect(encrypted.length).toBeGreaterThan(1_000_000);
    expect(await textCrypto(encrypted, "test password", true)).toBe(text);
    await expect(
      textCrypto("界".repeat(333_334), "test password", false),
    ).rejects.toThrow("UTF-8 bytes");
  });
  it("signs HS256 tokens and clearly marks decoded claims as unverified", async () => {
    const secret = "a".repeat(32);
    const token = await signJwt('{"sub":"test","exp":100}', secret);
    expect(decodeJwt(token, 101000)).toContain("Expired");
    expect(decodeJwt(token)).toContain("UNVERIFIED");
    const [header, payload, signature] = token.split(".");
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const rawSignature = Uint8Array.from(
      atob(
        signature
          .replace(/-/g, "+")
          .replace(/_/g, "/")
          .padEnd(Math.ceil(signature.length / 4) * 4, "="),
      ),
      (c) => c.charCodeAt(0),
    );
    expect(
      await crypto.subtle.verify(
        "HMAC",
        key,
        rawSignature,
        new TextEncoder().encode(`${header}.${payload}`),
      ),
    ).toBe(true);
    await expect(signJwt("{}", "short")).rejects.toThrow();
    expect(() => decodeJwt("malformed")).toThrow();
  });
  it("detects and masks common personal-information patterns with limitations", () => {
    expect(sensitiveInfo("email a@example.com", false)).toContain("1");
    expect(sensitiveInfo("email a@example.com", true)).toBe("email [EMAIL]");
    expect(() => sensitiveInfo("", true)).toThrow();
  });
  it("analyzes header names without echoing credential values", () => {
    const result = analyzeHeaders(
      "Authorization: Bearer confidential\nCookie: sid=secret",
    );
    expect(result).toContain("Authorization is present");
    expect(result).not.toContain("confidential");
    expect(result).not.toContain("sid=secret");
    expect(() => analyzeHeaders("bad header")).toThrow();
  });
});

it("reports request framing, credential and proxy risks without exposing header values", () => {
  const report = analyzeHeaders(
    [
      "Authorization: Basic dXNlcjpzZWNyZXQ=",
      "Authorization: Bearer another-secret",
      "Proxy-Authorization: secret-proxy",
      "X-API-Key: secret-key",
      "Cookie: sid=secret-cookie",
      "Content-Length: 12",
      "Content-Length: 13",
      "Transfer-Encoding: chunked",
      "X-Forwarded-Host: secret.example",
      "Referer: https://example.com/?secret=hidden",
    ].join("\n"),
  );
  for (const expected of [
    "Basic credentials",
    "Multiple Authorization",
    "Proxy-Authorization",
    "API-key",
    "Both Transfer-Encoding and Content-Length",
    "Duplicate or invalid Content-Length",
    "Forwarded headers",
    "Referer includes a query",
  ])
    expect(report).toContain(expected);
  for (const secret of [
    "dXNlcjpzZWNyZXQ",
    "another-secret",
    "secret-proxy",
    "secret-key",
    "secret-cookie",
    "secret.example",
    "hidden",
  ])
    expect(report).not.toContain(secret);
  expect(() => analyzeHeaders("Authorization: token\rInjected: x")).toThrow(
    "control characters",
  );
  expect(() => analyzeHeaders("Authorization: token\n folded")).toThrow();
});

it("flags repeated multi-character password segments without exposing the password", () => {
  const password = "long-pattern-long-pattern-long-pattern-!";
  const report = assessPassword(password);
  expect(report).toContain("repeated segments");
  expect(report).toContain("Heuristic score: 1/4");
  expect(report).not.toContain(password);
});

it("reports digest lengths without claiming to identify a hash algorithm", () => {
  const report = compareHashes("aabb", "aa");
  expect(report).toContain("do not match");
  expect(report).toContain("First digest: 2 bytes. Second digest: 1 bytes");
  expect(report).toContain("does not identify its algorithm");
  expect(report).not.toContain("aabb");
});
