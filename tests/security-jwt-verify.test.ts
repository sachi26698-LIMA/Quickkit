import { describe, expect, it } from "vitest";
import { bytesToUrl, signJwt } from "../lib/tools/security/logic";
import { verifyJwt } from "../lib/tools/security/jwt-verify";
const enc = new TextEncoder();
const part = (x: object) => bytesToUrl(enc.encode(JSON.stringify(x)));
const secret = "a".repeat(32);

describe("local JWT verification", () => {
  it("verifies HS256 and checks exp, nbf, issuer and audience independently", async () => {
    const token = await signJwt(
      JSON.stringify({ exp: 200, nbf: 50, iss: "issuer", aud: ["app"] }),
      secret,
    );
    expect(
      await verifyJwt(token, "HS256", secret, "issuer", "app", 100_000),
    ).toContain("SIGNATURE VALID");
    expect(
      await verifyJwt(token, "HS256", secret, "other", "other", 201_000),
    ).toMatch(/expired[\s\S]*Issuer[\s\S]*Audience/);
    expect(await verifyJwt(token, "HS256", secret, "", "", 1_000)).toContain(
      "not yet valid",
    );
    expect(await verifyJwt(token, "HS256", "b".repeat(32))).toContain(
      "SIGNATURE INVALID",
    );
  });
  it("rejects algorithm confusion, malformed data, extensions and weak keys", async () => {
    const token = await signJwt('{"exp":200}', secret);
    await expect(verifyJwt(token, "RS256", "{}")).rejects.toThrow("algorithm");
    await expect(verifyJwt(token, "HS256", "short")).rejects.toThrow("32");
    await expect(
      verifyJwt(token, "HS256", '{"kty":"RSA","n":"' + "x".repeat(50) + '"}'),
    ).rejects.toThrow("JWK");
    await expect(
      verifyJwt(
        `${part({ alg: "HS256", crit: ["b64"] })}.${part({})}.AA`,
        "HS256",
        secret,
      ),
    ).rejects.toThrow("extensions");
    await expect(
      verifyJwt(`${part({ alg: "none" })}.${part({})}.`, "HS256", secret),
    ).rejects.toThrow("signed compact");
    await expect(
      verifyJwt(`${part({ alg: "HS256" })}.${part({})}.AB`, "HS256", secret),
    ).rejects.toThrow("non-canonical");
  });
  it("verifies RS256 with a public JWK and rejects wrong and private keys", async () => {
    const keys = await crypto.subtle.generateKey(
      {
        name: "RSASSA-PKCS1-v1_5",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true,
      ["sign", "verify"],
    );
    const head = part({ alg: "RS256", typ: "JWT" });
    const body = part({ exp: 200 });
    const signed = `${head}.${body}`;
    const sig = await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      keys.privateKey,
      enc.encode(signed),
    );
    const token = `${signed}.${bytesToUrl(new Uint8Array(sig))}`;
    const pub = await crypto.subtle.exportKey("jwk", keys.publicKey);
    expect(
      await verifyJwt(token, "RS256", JSON.stringify(pub), "", "", 100_000),
    ).toContain("SIGNATURE VALID");
    const altered = `${head}.${part({ exp: 300 })}.${token.split(".")[2]}`;
    expect(await verifyJwt(altered, "RS256", JSON.stringify(pub))).toContain(
      "SIGNATURE INVALID",
    );
    const priv = await crypto.subtle.exportKey("jwk", keys.privateKey);
    await expect(
      verifyJwt(token, "RS256", JSON.stringify(priv)),
    ).rejects.toThrow("private key");
  });
  it("reports missing or malformed claims rather than treating them as valid", async () => {
    const token = await signJwt('{"nbf":"123"}', secret);
    const out = await verifyJwt(token, "HS256", secret);
    expect(out).toContain("No expiration claim");
    expect(out).toContain("nbf must be a NumericDate");
  });
});

it("rejects duplicate JWT members, including escaped and nested duplicates, before trust decisions", async () => {
  const b64 = (s: string) => bytesToUrl(enc.encode(s));
  const sign = async (header: string, body: string) => {
    const input = `${b64(header)}.${b64(body)}`;
    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    return `${input}.${bytesToUrl(new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(input))))}`;
  };
  for (const [header, body] of [
    ['{"alg":"HS256","alg":"HS256"}', "{}"],
    ['{"alg":"HS256"}', '{"exp":200,"\\u0065xp":300}'],
    ['{"alg":"HS256"}', '{"nested":{"role":"a","role":"b"}}'],
  ]) {
    await expect(
      verifyJwt(await sign(header, body), "HS256", secret),
    ).rejects.toThrow("duplicate");
  }
  const allowed = await sign(
    '{"alg":"HS256"}',
    '{"x":{"v":1},"y":{"v":2},"exp":200}',
  );
  expect(await verifyJwt(allowed, "HS256", secret, "", "", 100_000)).toContain(
    "SIGNATURE VALID",
  );
  await expect(signJwt('{"sub":"one","sub":"two"}', secret)).rejects.toThrow(
    "duplicate",
  );
});
