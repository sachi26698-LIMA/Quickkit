import { bytesToUrl, urlToBytes } from "./logic";
import { parseUniqueJsonObject } from "./json-object";
const enc = new TextEncoder();
const dec = new TextDecoder("utf-8", { fatal: true });
function webcrypto() {
  if (!globalThis.crypto?.subtle)
    throw new Error("Web Crypto is unavailable; use a secure browser context.");
  return crypto.subtle;
}
function parseJwk(
  text: string,
  usage: "encrypt" | "decrypt" | "verify" | "sign",
): JsonWebKey {
  if (!text || text.length > 30_000)
    throw new Error("Enter an RSA JWK JSON object up to 30,000 characters.");
  let jwk: JsonWebKey;
  try {
    jwk = parseUniqueJsonObject(text) as JsonWebKey;
  } catch {
    throw new Error(
      "Enter a valid JWK JSON object without duplicate members (maximum nesting 64).",
    );
  }
  if (
    !jwk ||
    Array.isArray(jwk) ||
    jwk.kty !== "RSA" ||
    typeof jwk.n !== "string" ||
    typeof jwk.e !== "string"
  )
    throw new Error("Enter an RSA JWK with modulus and exponent.");
  const needsPrivate = usage === "decrypt" || usage === "sign";
  if (needsPrivate !== (typeof jwk.d === "string"))
    throw new Error(
      needsPrivate
        ? `${usage === "decrypt" ? "Decryption" : "Signing"} requires an RSA private JWK.`
        : "Use a public JWK without private parameters.",
    );
  if (
    !needsPrivate &&
    (jwk.p || jwk.q || jwk.dp || jwk.dq || jwk.qi || jwk.oth)
  )
    throw new Error("Use a public JWK without private parameters.");
  let modulus: Uint8Array;
  try {
    modulus = urlToBytes(jwk.n);
    if (bytesToUrl(modulus) !== jwk.n) throw new Error();
  } catch {
    throw new Error("Invalid RSA modulus.");
  }
  if (modulus.length < 256 || modulus.length > 1024 || modulus[0] < 0x80)
    throw new Error("Use an RSA key with a 2048–8192-bit modulus.");
  return jwk;
}
export async function generateRsaKeys(bits: number) {
  if (bits !== 2048 && bits !== 3072)
    throw new Error("Choose 2048 or 3072 bits.");
  const subtle = webcrypto();
  const pair = await subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: bits,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"],
  );
  return {
    publicKey: JSON.stringify(
      await subtle.exportKey("jwk", pair.publicKey),
      null,
      2,
    ),
    privateKey: JSON.stringify(
      await subtle.exportKey("jwk", pair.privateKey),
      null,
      2,
    ),
  };
}
/** Signing keys are generated separately from encryption keys to preserve key separation. */
export async function generateRsaSigningKeys(bits: number) {
  if (bits !== 2048 && bits !== 3072)
    throw new Error("Choose 2048 or 3072 bits.");
  const subtle = webcrypto();
  const pair = await subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: bits,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"],
  );
  return {
    publicKey: JSON.stringify(
      await subtle.exportKey("jwk", pair.publicKey),
      null,
      2,
    ),
    privateKey: JSON.stringify(
      await subtle.exportKey("jwk", pair.privateKey),
      null,
      2,
    ),
  };
}

/** RS256 over exact UTF-8 bytes; never returns or logs the private key. */
export async function signRsaMessage(message: string, privateJwk: string) {
  const subtle = webcrypto();
  const jwk = parseJwk(privateJwk, "sign");
  const bytes = enc.encode(message);
  if (bytes.length > 1_000_000)
    throw new Error("Message exceeds 1,000,000 UTF-8 bytes.");
  let key: CryptoKey;
  try {
    key = await subtle.importKey(
      "jwk",
      jwk,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["sign"],
    );
  } catch {
    throw new Error(
      "Could not import this private key for RSASSA-PKCS1-v1_5 SHA-256 signing. Use a separate signing key.",
    );
  }
  const signature = new Uint8Array(
    await subtle.sign("RSASSA-PKCS1-v1_5", key, bytes),
  );
  return Array.from(signature, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function rsaEncrypt(message: string, publicJwk: string) {
  const subtle = webcrypto(),
    jwk = parseJwk(publicJwk, "encrypt");
  const data = enc.encode(message);
  if (!data.length) throw new Error("Enter a non-empty message.");
  const max = urlToBytes(jwk.n!).length - 2 * 32 - 2;
  if (data.length > max)
    throw new Error(
      `RSA-OAEP-SHA-256 with this key accepts at most ${max} UTF-8 bytes. Use AES-GCM for large content.`,
    );
  const key = await subtle.importKey(
    "jwk",
    jwk,
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["encrypt"],
  );
  return bytesToUrl(
    new Uint8Array(await subtle.encrypt({ name: "RSA-OAEP" }, key, data)),
  );
}
export async function rsaDecrypt(cipher: string, privateJwk: string) {
  const subtle = webcrypto(),
    jwk = parseJwk(privateJwk, "decrypt");
  if (!/^[A-Za-z0-9_-]+$/.test(cipher) || cipher.length > 1400)
    throw new Error("Enter unpadded Base64URL ciphertext.");
  const data = new Uint8Array(urlToBytes(cipher));
  if (bytesToUrl(data) !== cipher || data.length !== urlToBytes(jwk.n!).length)
    throw new Error("Ciphertext does not match the RSA key size.");
  try {
    const key = await subtle.importKey(
      "jwk",
      jwk,
      { name: "RSA-OAEP", hash: "SHA-256" },
      false,
      ["decrypt"],
    );
    return dec.decode(await subtle.decrypt({ name: "RSA-OAEP" }, key, data));
  } catch {
    throw new Error(
      "Decryption failed: wrong key, invalid data or unsupported key.",
    );
  }
}
export async function verifyRsaSignature(
  message: string,
  signatureHex: string,
  publicJwk: string,
) {
  const subtle = webcrypto(),
    jwk = parseJwk(publicJwk, "verify"),
    msg = enc.encode(message);
  if (msg.length > 1_000_000)
    throw new Error("Message exceeds 1,000,000 UTF-8 bytes.");
  if (
    !/^(?:[a-f0-9]{2})+$/i.test(signatureHex) ||
    signatureHex.length !== urlToBytes(jwk.n!).length * 2
  )
    throw new Error("Enter a hexadecimal signature matching the RSA key size.");
  const signature = Uint8Array.from(signatureHex.match(/../g)!, (v) =>
    parseInt(v, 16),
  );
  let key: CryptoKey;
  try {
    key = await subtle.importKey(
      "jwk",
      jwk,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"],
    );
  } catch {
    throw new Error(
      "Could not import this public key for RSASSA-PKCS1-v1_5 SHA-256 verification.",
    );
  }
  return (await subtle.verify("RSASSA-PKCS1-v1_5", key, signature, msg))
    ? "SIGNATURE VALID for the supplied key and message. Key ownership and trust are not verified."
    : "SIGNATURE INVALID for the supplied key and message.";
}
