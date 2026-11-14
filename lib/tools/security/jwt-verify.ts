import { bytesToUrl, urlToBytes } from "./logic";
import { parseUniqueJsonObject } from "./json-object";

const utf8 = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });
type Algorithm = "HS256" | "RS256";

function decodePart(part: string): Uint8Array<ArrayBuffer> {
  if (!/^[A-Za-z0-9_-]+$/.test(part))
    throw new Error("JWT parts must use unpadded Base64URL.");
  const bytes = new Uint8Array(urlToBytes(part));
  if (bytesToUrl(bytes) !== part)
    throw new Error("JWT contains non-canonical Base64URL.");
  return bytes;
}
function objectPart(part: string): Record<string, unknown> {
  try {
    return parseUniqueJsonObject(decoder.decode(decodePart(part)));
  } catch {
    throw new Error(
      "JWT header and payload must be canonical Base64URL-encoded JSON objects without duplicate members (maximum nesting 64).",
    );
  }
}

/** Verifies only against an explicitly selected algorithm and user-supplied key. No key discovery or network access. */
export async function verifyJwt(
  token: string,
  algorithm: Algorithm,
  keyInput: string,
  issuer = "",
  audience = "",
  now = Date.now(),
): Promise<string> {
  if (token.length > 100_000) throw new Error("Token is too large.");
  if (algorithm !== "HS256" && algorithm !== "RS256")
    throw new Error("Unsupported algorithm.");
  const parts = token.trim().split(".");
  if (parts.length !== 3 || parts.some((p) => !p))
    throw new Error("Enter a signed compact three-part JWT.");
  const header = objectPart(parts[0]);
  const claims = objectPart(parts[1]);
  const signature = decodePart(parts[2]);
  if (header.alg !== algorithm)
    throw new Error(
      "Token algorithm does not match the explicitly selected algorithm; verification refused.",
    );
  if (header.crit !== undefined || header.b64 !== undefined)
    throw new Error(
      "Critical or unencoded-payload extensions are not supported.",
    );
  if (!globalThis.crypto?.subtle)
    throw new Error("Web Crypto is unavailable in this browser or context.");
  let key: CryptoKey;
  if (algorithm === "HS256") {
    const secret = utf8.encode(keyInput);
    if (secret.length < 32 || secret.length > 4096)
      throw new Error("HS256 needs a secret of 32–4096 UTF-8 bytes.");
    // Never silently reinterpret a public key as an HMAC secret.
    if (/-----BEGIN |^\s*\{/.test(keyInput))
      throw new Error(
        "HS256 expects a shared secret, not a PEM or JWK public key.",
      );
    key = await crypto.subtle.importKey(
      "raw",
      secret,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );
  } else {
    if (keyInput.length > 20_000) throw new Error("Public JWK is too large.");
    let jwk: JsonWebKey;
    try {
      jwk = parseUniqueJsonObject(keyInput) as JsonWebKey;
      if (
        !jwk ||
        Array.isArray(jwk) ||
        typeof jwk !== "object" ||
        jwk.kty !== "RSA" ||
        !jwk.n ||
        !jwk.e ||
        jwk.d ||
        jwk.p ||
        jwk.q ||
        jwk.dp ||
        jwk.dq ||
        jwk.qi ||
        jwk.oth ||
        (jwk.alg && jwk.alg !== "RS256") ||
        (jwk.use && jwk.use !== "sig") ||
        (jwk.key_ops && !jwk.key_ops.includes("verify"))
      )
        throw new Error();
      const modulus = decodePart(jwk.n);
      if (modulus.length < 256 || modulus.length > 1024 || modulus[0] < 0x80)
        throw new Error();
      decodePart(jwk.e);
    } catch {
      throw new Error(
        "Provide a public RSA JWK for RS256 with a 2048–8192-bit modulus; private key parameters are not accepted.",
      );
    }
    try {
      key = await crypto.subtle.importKey(
        "jwk",
        jwk,
        { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
        false,
        ["verify"],
      );
    } catch {
      throw new Error("Could not import the RSA public JWK for verification.");
    }
  }
  const valid = await crypto.subtle.verify(
    algorithm === "HS256" ? "HMAC" : "RSASSA-PKCS1-v1_5",
    key,
    signature,
    utf8.encode(`${parts[0]}.${parts[1]}`),
  );
  if (!valid)
    return "SIGNATURE INVALID. Claims are untrusted; do not authenticate or authorize based on them.";
  const issues: string[] = [];
  const nowSeconds = now / 1000;
  for (const name of ["exp", "nbf", "iat"] as const) {
    const value = claims[name];
    if (
      value !== undefined &&
      (typeof value !== "number" || !Number.isFinite(value))
    )
      issues.push(`${name} must be a NumericDate in seconds.`);
  }
  if (typeof claims.exp === "number" && claims.exp <= nowSeconds)
    issues.push("Token is expired (device clock).");
  if (typeof claims.nbf === "number" && claims.nbf > nowSeconds)
    issues.push("Token is not yet valid (device clock).");
  if (claims.exp === undefined)
    issues.push(
      "No expiration claim; require one if your application needs it.",
    );
  if (issuer && claims.iss !== issuer)
    issues.push("Issuer does not match the expected value.");
  if (
    audience &&
    !(
      claims.aud === audience ||
      (Array.isArray(claims.aud) &&
        claims.aud.every((a) => typeof a === "string") &&
        claims.aud.includes(audience))
    )
  )
    issues.push("Audience does not match the expected value.");
  return `SIGNATURE VALID with the supplied ${algorithm} key.\n${issues.length ? `Claim checks / warnings:\n${issues.map((x) => `• ${x}`).join("\n")}` : "Checked time and supplied issuer/audience constraints passed."}\n\nA valid signature does not establish key ownership or authorization. Confirm the key through a trusted channel and validate all claims required by your application. No token, secret or key is transmitted by this tool.\n\nHeader:\n${JSON.stringify(header, null, 2)}\n\nClaims:\n${JSON.stringify(claims, null, 2)}`;
}
