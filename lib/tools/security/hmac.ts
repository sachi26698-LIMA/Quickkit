const encoder = new TextEncoder();
export type HmacHash = "SHA-256" | "SHA-384" | "SHA-512";
export type HmacKeyFormat = "utf8" | "hex";
const lengths: Record<HmacHash, number> = {
  "SHA-256": 32,
  "SHA-384": 48,
  "SHA-512": 64,
};
function bytesFromHex(value: string): Uint8Array<ArrayBuffer> {
  if (!/^(?:[0-9a-fA-F]{2})+$/.test(value))
    throw new Error("Enter an even-length hexadecimal value.");
  return Uint8Array.from(value.match(/../g)!, (pair) => parseInt(pair, 16));
}
/** HMAC keys and messages stay in browser memory and are not included in the report. */
export async function hmac(
  message: string,
  secret: string,
  format: HmacKeyFormat,
  hash: HmacHash,
  expected?: string,
) {
  if (!globalThis.crypto?.subtle)
    throw new Error(
      "Web Crypto is unavailable; use a secure context and current browser.",
    );
  if (!Object.hasOwn(lengths, hash))
    throw new Error("Choose a supported HMAC hash.");
  if (format !== "hex" && format !== "utf8")
    throw new Error("Choose a supported key encoding.");
  const msg = encoder.encode(message);
  if (msg.length > 1_000_000)
    throw new Error("Message exceeds 1,000,000 UTF-8 bytes.");
  if (secret.length > 8192) throw new Error("Key is too large.");
  const raw = format === "hex" ? bytesFromHex(secret) : encoder.encode(secret);
  if (raw.length < 16 || raw.length > 4096)
    throw new Error(
      "Use a key of 16–4096 bytes; generate a random key rather than a password.",
    );
  const key = await crypto.subtle.importKey(
    "raw",
    raw,
    { name: "HMAC", hash },
    false,
    ["sign", "verify"],
  );
  if (expected !== undefined) {
    const tag = bytesFromHex(expected.trim());
    if (tag.length !== lengths[hash])
      throw new Error(
        `Expected tag must be ${lengths[hash]} bytes for ${hash}.`,
      );
    const valid = await crypto.subtle.verify("HMAC", key, tag, msg);
    return valid
      ? "HMAC MATCHES with the supplied key and message. A valid tag does not establish who owns the shared key."
      : "HMAC DOES NOT MATCH the supplied key and message.";
  }
  const result = new Uint8Array(await crypto.subtle.sign("HMAC", key, msg));
  return Array.from(result, (b) => b.toString(16).padStart(2, "0")).join("");
}
