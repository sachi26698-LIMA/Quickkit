/**
 * High-Assurance Cryptographic Security for QUICKKIT QR Generator & Scanner.
 *
 * Pure Web Crypto API (`crypto.subtle`) — zero external crypto dependencies,
 * zero server storage, 100% browser-local execution:
 *
 *  1. Anti-Tamper Digital Signatures (`ECDSA P-256` + `SHA-256`):
 *     Every Data Template QR can carry a compact 106-byte cryptographic proof
 *     (`&sg=…`) containing a 33-byte SEC1 compressed NIST P-256 public key,
 *     timestamps/expiry, and a 64-byte IEEE P1363 ECDSA signature. Modifying a
 *     single character of `?d=…`, `&sg=…`, or expiry breaks verification.
 *
 *  2. Passphrase Vault Encryption (`AES-256-GCM` + `PBKDF2-HMAC-SHA256`):
 *     Derives a 256-bit key via 210,000 PBKDF2-SHA256 iterations with a random
 *     128-bit salt and 96-bit GCM nonce. The binary header (timestamps, expiry,
 *     iterations, salt, nonce, hint) is bound as GCM Additional Authenticated
 *     Data (AAD), so neither ciphertext nor metadata can be tampered with.
 *     Works both as hosted `/qr?e=…` links and offline `QKE1.…` QR payloads.
 *
 *  3. Zero-Knowledge Fragment-Key Encryption (`AES-256-GCM` `#k=…`):
 *     Encrypts the payload into `?e=…` while keeping the random 256-bit AES key
 *     exclusively inside `#k=…` (never sent to any HTTP server) — zero-click
 *     unlock for anyone scanning the QR, 128-bit AEAD tamper protection.
 */
import { deflateSync, Inflate } from "fflate";

export const ENCRYPTED_QUERY_PARAM = "e";
export const SIGNATURE_QUERY_PARAM = "sg";
export const FRAGMENT_KEY_PARAM = "k";
export const DIRECT_ENCRYPTED_PREFIX = "QKE1.";

export const DEFAULT_PBKDF2_ITERATIONS = 210_000;
const ENVELOPE_VERSION = 1;
const ENC_MODE_PASSPHRASE = 1;
const ENC_MODE_FRAGMENT_KEY = 2;
const SIG_VERSION = 1;
const MAX_DECRYPTED_BYTES = 32_768;

const SIGNER_STORAGE_KEY = "quickkit:qr:signer-key:v1";
const TRUSTED_SIGNERS_STORAGE_KEY = "quickkit:qr:trusted-signers:v1";

/* ------------------------------------------- NIST P-256 point compression */

const P256_P =
  0xffffffff00000001000000000000000000000000ffffffffffffffffffffffffn;
const P256_B =
  0x5ac635d8aa3a93e7b3ebbd55769886bc651d06b0cc53b0f63bce3c3e27d2604bn;
const P256_A = P256_P - 3n;
const P256_SQRT_EXP = (P256_P + 1n) >> 2n;

function mod(n: bigint, m: bigint): bigint {
  const r = n % m;
  return r >= 0n ? r : r + m;
}

function powMod(base: bigint, exp: bigint, modulus: bigint): bigint {
  let result = 1n;
  let b = mod(base, modulus);
  let e = exp;
  while (e > 0n) {
    if (e & 1n) result = (result * b) % modulus;
    b = (b * b) % modulus;
    e >>= 1n;
  }
  return result;
}

function bytesToBigInt(bytes: Uint8Array): bigint {
  let value = 0n;
  for (let i = 0; i < bytes.length; i += 1) {
    value = (value << 8n) | BigInt(bytes[i]);
  }
  return value;
}

function bigIntTo32Bytes(value: bigint): Uint8Array {
  const out = new Uint8Array(32);
  let v = value;
  for (let i = 31; i >= 0; i -= 1) {
    out[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return out;
}

/** Compress a 65-byte uncompressed P-256 public key (`0x04 || X || Y`) to 33 bytes. */
export function compressP256PublicKey(raw65: Uint8Array): Uint8Array {
  if (raw65.length !== 65 || raw65[0] !== 0x04) {
    throw new Error("Expected 65-byte uncompressed P-256 public key.");
  }
  const out = new Uint8Array(33);
  out[0] = (raw65[64] & 1) === 1 ? 0x03 : 0x02;
  out.set(raw65.subarray(1, 33), 1);
  return out;
}

/** Decompress a 33-byte SEC1 P-256 point (`0x02/0x03 || X`) and validate curve membership. */
export function decompressP256PublicKey(compressed33: Uint8Array): Uint8Array {
  if (
    compressed33.length !== 33 ||
    (compressed33[0] !== 0x02 && compressed33[0] !== 0x03)
  ) {
    throw new Error("Invalid compressed P-256 public key.");
  }
  const x = bytesToBigInt(compressed33.subarray(1, 33));
  if (x <= 0n || x >= P256_P) {
    throw new Error("P-256 public key X coordinate out of range.");
  }
  const x2 = (x * x) % P256_P;
  const x3 = (x2 * x) % P256_P;
  const rhs = mod(x3 + P256_A * x + P256_B, P256_P);
  let y = powMod(rhs, P256_SQRT_EXP, P256_P);
  if ((y * y) % P256_P !== rhs) {
    throw new Error("Point does not lie on NIST P-256 curve.");
  }
  const oddWanted = compressed33[0] === 0x03;
  const isOdd = (y & 1n) === 1n;
  if (isOdd !== oddWanted) {
    y = P256_P - y;
  }
  const out = new Uint8Array(65);
  out[0] = 0x04;
  out.set(compressed33.subarray(1, 33), 1);
  out.set(bigIntTo32Bytes(y), 33);
  return out;
}

/* --------------------------------------------------- binary / base64url I/O */

const utf8Encoder = new TextEncoder();
const utf8Decoder = new TextDecoder();

export function toBase64Url(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");
  }
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function fromBase64Url(token: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/.test(token)) {
    throw new Error("Malformed base64url token.");
  }
  const padLen = (4 - (token.length % 4)) % 4;
  const base64 =
    token.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat(padLen);
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(base64, "base64"));
  }
  const binary = atob(base64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

function writeUint32BE(buf: Uint8Array, offset: number, value: number) {
  const v = Math.max(0, Math.floor(value)) >>> 0;
  buf[offset] = (v >>> 24) & 0xff;
  buf[offset + 1] = (v >>> 16) & 0xff;
  buf[offset + 2] = (v >>> 8) & 0xff;
  buf[offset + 3] = v & 0xff;
}

function readUint32BE(buf: Uint8Array, offset: number): number {
  return (
    ((buf[offset] << 24) |
      (buf[offset + 1] << 16) |
      (buf[offset + 2] << 8) |
      buf[offset + 3]) >>>
    0
  );
}

function safeInflateBytes(compressed: Uint8Array): Uint8Array {
  const chunks: Uint8Array[] = [];
  let total = 0;
  const inflator = new Inflate((chunk) => {
    total += chunk.length;
    if (total > MAX_DECRYPTED_BYTES) {
      throw new Error("Decrypted QR payload exceeds safe byte limit.");
    }
    chunks.push(chunk);
  });
  inflator.push(compressed, true);
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const part of chunks) {
    merged.set(part, offset);
    offset += part.length;
  }
  return merged;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

function subtleCrypto(): SubtleCrypto {
  if (!globalThis.crypto?.subtle) {
    throw new Error("Web Crypto API is unavailable in this environment.");
  }
  return globalThis.crypto.subtle;
}

/* ------------------------------------------- SHA-256 & Signer Fingerprints */

export async function sha256Bytes(
  input: Uint8Array | string,
): Promise<Uint8Array> {
  const data = typeof input === "string" ? utf8Encoder.encode(input) : input;
  const digest = await subtleCrypto().digest("SHA-256", toArrayBuffer(data));
  return new Uint8Array(digest);
}

export async function sha256Hex(input: Uint8Array | string): Promise<string> {
  const bytes = await sha256Bytes(input);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Deterministic, synchronous short fingerprint tag from compressed 33B pubkey for instant UI display. */
export function shortPublicKeyTag(compressedPub33: Uint8Array): string {
  // FNV-1a 64-bit mixing over the 33-byte public key for a synchronous 12-hex-char tag.
  let h1 = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  const mask = 0xffffffffffffffffn;
  for (let i = 0; i < compressedPub33.length; i += 1) {
    h1 ^= BigInt(compressedPub33[i]);
    h1 = (h1 * prime) & mask;
  }
  const hex = h1.toString(16).toUpperCase().padStart(16, "0").slice(0, 12);
  return `QK-${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}`;
}

/* -------------------------------------------- Creator Signing Key Manager */

export type StoredSignerKey = {
  version: 1;
  createdAt: number;
  fingerprint: string;
  compressedPubB64: string;
  privateJwk: JsonWebKey;
  publicJwk: JsonWebKey;
};

export type ActiveSigner = {
  fingerprint: string;
  createdAt: number;
  compressedPub: Uint8Array;
  privateKey: CryptoKey;
  publicKey: CryptoKey;
};

let memorySignerPromise: Promise<ActiveSigner> | null = null;
let hydratedStorageCache: { raw: string; signer: ActiveSigner } | null = null;

async function hydrateSignerFromRecord(
  record: StoredSignerKey,
): Promise<ActiveSigner> {
  const subtle = subtleCrypto();
  const privateKey = await subtle.importKey(
    "jwk",
    record.privateJwk,
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign"],
  );
  const publicKey = await subtle.importKey(
    "jwk",
    record.publicJwk,
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["verify"],
  );
  const compressedPub = fromBase64Url(record.compressedPubB64);
  const fingerprint = shortPublicKeyTag(compressedPub);
  return {
    fingerprint,
    createdAt: record.createdAt,
    compressedPub,
    privateKey,
    publicKey,
  };
}

export async function generateNewSigner(): Promise<{
  signer: ActiveSigner;
  record: StoredSignerKey;
}> {
  const subtle = subtleCrypto();
  const pair = await subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"],
  );
  const rawPub = new Uint8Array(await subtle.exportKey("raw", pair.publicKey));
  const compressedPub = compressP256PublicKey(rawPub);
  const fingerprint = shortPublicKeyTag(compressedPub);
  const privateJwk = await subtle.exportKey("jwk", pair.privateKey);
  const publicJwk = await subtle.exportKey("jwk", pair.publicKey);
  const createdAt = Date.now();
  const record: StoredSignerKey = {
    version: 1,
    createdAt,
    fingerprint,
    compressedPubB64: toBase64Url(compressedPub),
    privateJwk,
    publicJwk,
  };
  return {
    signer: {
      fingerprint,
      createdAt,
      compressedPub,
      privateKey: pair.privateKey,
      publicKey: pair.publicKey,
    },
    record,
  };
}

export async function getOrCreateSigner(): Promise<ActiveSigner> {
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const raw = window.localStorage.getItem(SIGNER_STORAGE_KEY);
      if (raw) {
        if (hydratedStorageCache && hydratedStorageCache.raw === raw) {
          return hydratedStorageCache.signer;
        }
        const parsed = JSON.parse(raw) as StoredSignerKey;
        if (
          parsed?.version === 1 &&
          parsed.privateJwk &&
          parsed.publicJwk &&
          parsed.compressedPubB64
        ) {
          const signer = await hydrateSignerFromRecord(parsed);
          hydratedStorageCache = { raw, signer };
          return signer;
        }
      }
      const { signer, record } = await generateNewSigner();
      const serialized = JSON.stringify(record);
      window.localStorage.setItem(SIGNER_STORAGE_KEY, serialized);
      hydratedStorageCache = { raw: serialized, signer };
      return signer;
    } catch {
      // Fall back to in-memory key if storage is unavailable or blocked.
    }
  }
  if (!memorySignerPromise) {
    memorySignerPromise = generateNewSigner().then((res) => res.signer);
  }
  return memorySignerPromise;
}

export async function rotateCreatorSigner(): Promise<ActiveSigner> {
  const { signer, record } = await generateNewSigner();
  memorySignerPromise = Promise.resolve(signer);
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const serialized = JSON.stringify(record);
      window.localStorage.setItem(SIGNER_STORAGE_KEY, serialized);
      hydratedStorageCache = { raw: serialized, signer };
    } catch {
      /* ignore quota errors */
    }
  }
  return signer;
}

export async function exportCreatorSignerJson(): Promise<string> {
  const signer = await getOrCreateSigner();
  const subtle = subtleCrypto();
  const privateJwk = await subtle.exportKey("jwk", signer.privateKey);
  const publicJwk = await subtle.exportKey("jwk", signer.publicKey);
  const backup: StoredSignerKey = {
    version: 1,
    createdAt: signer.createdAt,
    fingerprint: signer.fingerprint,
    compressedPubB64: toBase64Url(signer.compressedPub),
    privateJwk,
    publicJwk,
  };
  return JSON.stringify(backup, null, 2);
}

export async function importCreatorSignerJson(
  jsonText: string,
): Promise<ActiveSigner> {
  const parsed = JSON.parse(jsonText) as StoredSignerKey;
  if (
    parsed?.version !== 1 ||
    !parsed.privateJwk ||
    !parsed.publicJwk ||
    !parsed.compressedPubB64
  ) {
    throw new Error("Invalid QUICKKIT signing key backup file.");
  }
  const signer = await hydrateSignerFromRecord(parsed);
  memorySignerPromise = Promise.resolve(signer);
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const serialized = JSON.stringify({
        ...parsed,
        fingerprint: signer.fingerprint,
      });
      window.localStorage.setItem(SIGNER_STORAGE_KEY, serialized);
      hydratedStorageCache = { raw: serialized, signer };
    } catch {
      /* ignore */
    }
  }
  return signer;
}

/* ------------------------------------------- Trusted Signer Pinning (TOFU) */

export type PinnedSigner = {
  fingerprint: string;
  label: string;
  pinnedAt: number;
};

export function loadPinnedSigners(): PinnedSigner[] {
  if (typeof window === "undefined" || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(TRUSTED_SIGNERS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is PinnedSigner =>
        Boolean(item) &&
        typeof item === "object" &&
        typeof (item as PinnedSigner).fingerprint === "string",
    );
  } catch {
    return [];
  }
}

export function pinTrustedSigner(
  fingerprint: string,
  label = "Trusted QR Creator",
): PinnedSigner[] {
  const current = loadPinnedSigners().filter(
    (s) => s.fingerprint !== fingerprint,
  );
  const next: PinnedSigner[] = [
    { fingerprint, label: label.slice(0, 60), pinnedAt: Date.now() },
    ...current,
  ].slice(0, 50);
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      window.localStorage.setItem(
        TRUSTED_SIGNERS_STORAGE_KEY,
        JSON.stringify(next),
      );
    } catch {
      /* ignore */
    }
  }
  return next;
}

export function unpinTrustedSigner(fingerprint: string): PinnedSigner[] {
  const next = loadPinnedSigners().filter((s) => s.fingerprint !== fingerprint);
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      window.localStorage.setItem(
        TRUSTED_SIGNERS_STORAGE_KEY,
        JSON.stringify(next),
      );
    } catch {
      /* ignore */
    }
  }
  return next;
}

/* ---------------------------------- ECDSA P-256 Signing & Tamper Proofs */

function canonicalSignatureInput(
  token: string,
  issuedAtSec: number,
  expiresAtSec: number,
): Uint8Array {
  return utf8Encoder.encode(
    `QK-SIG-V1|${token}|${issuedAtSec}|${expiresAtSec}`,
  );
}

export type SignatureMetadata = {
  issuedAtSec: number;
  expiresAtSec: number;
  compressedPub: Uint8Array;
  signature: Uint8Array;
  signerFingerprint: string;
};

export function parseSignatureProof(sgToken: string): SignatureMetadata | null {
  try {
    const clean = sgToken.trim();
    const bytes = fromBase64Url(clean);
    if (toBase64Url(bytes) !== clean) return null;
    if (bytes.length !== 106 || bytes[0] !== SIG_VERSION) return null;
    const issuedAtSec = readUint32BE(bytes, 1);
    const expiresAtSec = readUint32BE(bytes, 5);
    const compressedPub = bytes.subarray(9, 42);
    const signature = bytes.subarray(42, 106);
    if (compressedPub[0] !== 0x02 && compressedPub[0] !== 0x03) return null;
    return {
      issuedAtSec,
      expiresAtSec,
      compressedPub,
      signature,
      signerFingerprint: shortPublicKeyTag(compressedPub),
    };
  } catch {
    return null;
  }
}

export async function createSignatureProof(
  targetToken: string,
  options: {
    signer?: ActiveSigner;
    issuedAtSec?: number;
    expiresAtSec?: number;
  } = {},
): Promise<{
  sgToken: string;
  signerFingerprint: string;
  issuedAtSec: number;
}> {
  const signer = options.signer ?? (await getOrCreateSigner());
  const issuedAtSec = options.issuedAtSec ?? Math.floor(Date.now() / 1000);
  const expiresAtSec = options.expiresAtSec ?? 0;

  const message = canonicalSignatureInput(
    targetToken,
    issuedAtSec,
    expiresAtSec,
  );
  const sigBuf = await subtleCrypto().sign(
    { name: "ECDSA", hash: "SHA-256" },
    signer.privateKey,
    toArrayBuffer(message),
  );
  const sigBytes = new Uint8Array(sigBuf);
  if (sigBytes.length !== 64) {
    throw new Error("Unexpected ECDSA P-256 signature length.");
  }

  const out = new Uint8Array(106);
  out[0] = SIG_VERSION;
  writeUint32BE(out, 1, issuedAtSec);
  writeUint32BE(out, 5, expiresAtSec);
  out.set(signer.compressedPub, 9);
  out.set(sigBytes, 42);

  return {
    sgToken: toBase64Url(out),
    signerFingerprint: signer.fingerprint,
    issuedAtSec,
  };
}

export async function verifySignatureProof(
  targetToken: string,
  sgToken: string,
  nowSec = Math.floor(Date.now() / 1000),
): Promise<{
  valid: boolean;
  expired: boolean;
  signerFingerprint: string | null;
  issuedAtSec: number | null;
  expiresAtSec: number | null;
  reason?: string;
}> {
  const meta = parseSignatureProof(sgToken);
  if (!meta) {
    return {
      valid: false,
      expired: false,
      signerFingerprint: null,
      issuedAtSec: null,
      expiresAtSec: null,
      reason: "Digital signature header is malformed or truncated.",
    };
  }

  try {
    const rawPub65 = decompressP256PublicKey(meta.compressedPub);
    const publicKey = await subtleCrypto().importKey(
      "raw",
      toArrayBuffer(rawPub65),
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["verify"],
    );
    const message = canonicalSignatureInput(
      targetToken,
      meta.issuedAtSec,
      meta.expiresAtSec,
    );
    const ok = await subtleCrypto().verify(
      { name: "ECDSA", hash: "SHA-256" },
      publicKey,
      toArrayBuffer(meta.signature),
      toArrayBuffer(message),
    );
    if (!ok) {
      return {
        valid: false,
        expired: false,
        signerFingerprint: meta.signerFingerprint,
        issuedAtSec: meta.issuedAtSec,
        expiresAtSec: meta.expiresAtSec || null,
        reason:
          "ECDSA P-256 cryptographic signature check failed — QR data or signature was modified after creation.",
      };
    }

    const expired = meta.expiresAtSec > 0 && nowSec > meta.expiresAtSec;
    return {
      valid: true,
      expired,
      signerFingerprint: meta.signerFingerprint,
      issuedAtSec: meta.issuedAtSec,
      expiresAtSec: meta.expiresAtSec || null,
      ...(expired
        ? {
            reason: `This signed QR code expired on ${new Date(meta.expiresAtSec * 1000).toLocaleString()}.`,
          }
        : {}),
    };
  } catch {
    return {
      valid: false,
      expired: false,
      signerFingerprint: meta.signerFingerprint,
      issuedAtSec: meta.issuedAtSec,
      expiresAtSec: meta.expiresAtSec || null,
      reason: "Signer public key is invalid or tampered with.",
    };
  }
}

/* ------------------------- AES-256-GCM Encryption (Passphrase & Auto-Key) */

async function derivePassphraseKey(
  passphrase: string,
  salt: Uint8Array,
  iterations: number,
  usage: KeyUsage[],
): Promise<CryptoKey> {
  const subtle = subtleCrypto();
  const baseKey = await subtle.importKey(
    "raw",
    toArrayBuffer(utf8Encoder.encode(passphrase)),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return subtle.deriveKey(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: toArrayBuffer(salt),
      iterations,
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    usage,
  );
}

export type EncryptedEnvelopeInfo = {
  mode: "passphrase" | "fragment-key";
  issuedAtSec: number;
  expiresAtSec: number | null;
  expired: boolean;
  hint: string;
  iterations: number;
};

/** Synchronously inspect an encrypted `e` token or `QKE1.…` payload without decrypting. */
export function inspectEncryptedEnvelope(
  tokenOrPayload: string,
  nowSec = Math.floor(Date.now() / 1000),
): EncryptedEnvelopeInfo | null {
  try {
    const rawToken = extractEncryptedToken(tokenOrPayload);
    if (!rawToken) return null;
    const bytes = fromBase64Url(rawToken);
    if (bytes.length < 39 || bytes[0] !== ENVELOPE_VERSION) return null;
    const modeByte = bytes[1];
    const issuedAtSec = readUint32BE(bytes, 2);
    const expiresRaw = readUint32BE(bytes, 6);
    const expiresAtSec = expiresRaw > 0 ? expiresRaw : null;
    const expired = expiresRaw > 0 && nowSec > expiresRaw;

    if (modeByte === ENC_MODE_PASSPHRASE) {
      if (bytes.length < 41 + 17) return null;
      const iterFactor = (bytes[10] << 8) | bytes[11];
      const hintLen = bytes[40];
      if (hintLen > 80 || bytes.length < 41 + hintLen + 17) return null;
      const hint = hintLen
        ? utf8Decoder.decode(bytes.subarray(41, 41 + hintLen))
        : "";
      return {
        mode: "passphrase",
        issuedAtSec,
        expiresAtSec,
        expired,
        hint,
        iterations: Math.max(10_000, iterFactor * 10_000),
      };
    }

    if (modeByte === ENC_MODE_FRAGMENT_KEY) {
      if (bytes.length < 22 + 17) return null;
      return {
        mode: "fragment-key",
        issuedAtSec,
        expiresAtSec,
        expired,
        hint: "",
        iterations: 0,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function extractEncryptedToken(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith(DIRECT_ENCRYPTED_PREFIX)) {
    const body = trimmed.slice(DIRECT_ENCRYPTED_PREFIX.length).trim();
    return body || null;
  }
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("/qr")) {
    try {
      const parsed = new URL(trimmed, "https://quickkit.tools");
      if (parsed.pathname.replace(/\/+$/, "") !== "/qr") return null;
      return parsed.searchParams.get(ENCRYPTED_QUERY_PARAM);
    } catch {
      return null;
    }
  }
  if (/^[A-Za-z0-9_-]{40,}$/.test(trimmed)) return trimmed;
  return null;
}

export function isEncryptedQrPayload(input: string): boolean {
  return inspectEncryptedEnvelope(input) !== null;
}

/**
 * Encrypt any UTF-8 QR payload or inner Data Template JSON/URL with
 * `AES-256-GCM` + `PBKDF2-HMAC-SHA256` (210,000 iterations by default).
 */
export async function encryptWithPassphrase(
  plaintext: string,
  passphrase: string,
  options: {
    hint?: string;
    issuedAtSec?: number;
    expiresAtSec?: number;
    iterations?: number;
  } = {},
): Promise<string> {
  const cleanPass = passphrase.trim();
  if (cleanPass.length < 4) {
    throw new Error("Encryption passphrase must be at least 4 characters.");
  }
  const issuedAtSec = options.issuedAtSec ?? Math.floor(Date.now() / 1000);
  const expiresAtSec = options.expiresAtSec ?? 0;
  const iterations = options.iterations ?? DEFAULT_PBKDF2_ITERATIONS;
  const iterFactor = Math.min(
    65535,
    Math.max(1, Math.round(iterations / 10_000)),
  );
  const actualIterations = iterFactor * 10_000;

  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const cleanHint = (options.hint ?? "").trim().slice(0, 60);
  const hintBytes = utf8Encoder.encode(cleanHint).subarray(0, 80);

  const header = new Uint8Array(41 + hintBytes.length);
  header[0] = ENVELOPE_VERSION;
  header[1] = ENC_MODE_PASSPHRASE;
  writeUint32BE(header, 2, issuedAtSec);
  writeUint32BE(header, 6, expiresAtSec);
  header[10] = (iterFactor >>> 8) & 0xff;
  header[11] = iterFactor & 0xff;
  header.set(salt, 12);
  header.set(iv, 28);
  header[40] = hintBytes.length;
  header.set(hintBytes, 41);

  const compressedPlain = deflateSync(utf8Encoder.encode(plaintext), {
    level: 9,
  });
  const aesKey = await derivePassphraseKey(cleanPass, salt, actualIterations, [
    "encrypt",
  ]);
  const cipherBuf = await subtleCrypto().encrypt(
    {
      name: "AES-GCM",
      iv: toArrayBuffer(iv),
      additionalData: toArrayBuffer(header),
      tagLength: 128,
    },
    aesKey,
    toArrayBuffer(compressedPlain),
  );
  const cipherBytes = new Uint8Array(cipherBuf);
  const envelope = new Uint8Array(header.length + cipherBytes.length);
  envelope.set(header, 0);
  envelope.set(cipherBytes, header.length);
  return toBase64Url(envelope);
}

export type DecryptResult =
  | {
      ok: true;
      plaintext: string;
      issuedAtSec: number;
      expiresAtSec: number | null;
      mode: "passphrase" | "fragment-key";
    }
  | {
      ok: false;
      reason: "wrong-key-or-tampered" | "expired" | "missing-key" | "malformed";
      message: string;
      expiresAtSec?: number | null;
    };

/**
 * Decrypt & authenticate an `AES-256-GCM` passphrase-protected QR envelope.
 * Any 1-bit tamper in ciphertext, IV, salt, hint, or expiry fails GCM authentication.
 */
export async function decryptWithPassphrase(
  tokenOrUrl: string,
  passphrase: string,
  nowSec = Math.floor(Date.now() / 1000),
): Promise<DecryptResult> {
  const token = extractEncryptedToken(tokenOrUrl);
  if (!token) {
    return {
      ok: false,
      reason: "malformed",
      message: "No encrypted QR payload was found.",
    };
  }
  const cleanPass = passphrase.trim();
  if (!cleanPass) {
    return {
      ok: false,
      reason: "missing-key",
      message: "Enter the decryption passphrase to unlock this QR code.",
    };
  }

  let bytes: Uint8Array;
  try {
    bytes = fromBase64Url(token);
  } catch {
    return {
      ok: false,
      reason: "malformed",
      message: "Encrypted QR token is corrupted or truncated.",
    };
  }

  if (
    bytes.length < 58 ||
    bytes[0] !== ENVELOPE_VERSION ||
    bytes[1] !== ENC_MODE_PASSPHRASE
  ) {
    return {
      ok: false,
      reason: "malformed",
      message: "Unsupported or corrupted encrypted QR header.",
    };
  }

  const issuedAtSec = readUint32BE(bytes, 2);
  const expiresRaw = readUint32BE(bytes, 6);
  const iterFactor = (bytes[10] << 8) | bytes[11];
  const iterations = Math.max(10_000, iterFactor * 10_000);
  const salt = bytes.subarray(12, 28);
  const iv = bytes.subarray(28, 40);
  const hintLen = bytes[40];
  const headerLen = 41 + hintLen;

  if (hintLen > 80 || bytes.length < headerLen + 17) {
    return {
      ok: false,
      reason: "malformed",
      message: "Encrypted QR envelope was truncated or modified.",
    };
  }

  const header = bytes.subarray(0, headerLen);
  const cipherBytes = bytes.subarray(headerLen);

  try {
    const aesKey = await derivePassphraseKey(cleanPass, salt, iterations, [
      "decrypt",
    ]);
    const plainBuf = await subtleCrypto().decrypt(
      {
        name: "AES-GCM",
        iv: toArrayBuffer(iv),
        additionalData: toArrayBuffer(header),
        tagLength: 128,
      },
      aesKey,
      toArrayBuffer(cipherBytes),
    );
    if (expiresRaw > 0 && nowSec > expiresRaw) {
      return {
        ok: false,
        reason: "expired",
        expiresAtSec: expiresRaw,
        message: `This encrypted QR code expired on ${new Date(expiresRaw * 1000).toLocaleString()}.`,
      };
    }
    const inflated = safeInflateBytes(new Uint8Array(plainBuf));
    return {
      ok: true,
      plaintext: utf8Decoder.decode(inflated),
      issuedAtSec,
      expiresAtSec: expiresRaw > 0 ? expiresRaw : null,
      mode: "passphrase",
    };
  } catch {
    return {
      ok: false,
      reason: "wrong-key-or-tampered",
      message:
        "Decryption failed — incorrect passphrase, or the encrypted QR data was tampered with (AES-256-GCM authentication rejected).",
    };
  }
}

/**
 * Encrypt with a random 256-bit `AES-256-GCM` key placed in `#k=…` (never sent
 * to any server) and ciphertext in `?e=…`.
 */
export async function encryptWithFragmentKey(
  plaintext: string,
  options: {
    issuedAtSec?: number;
    expiresAtSec?: number;
  } = {},
): Promise<{ eToken: string; kToken: string }> {
  const issuedAtSec = options.issuedAtSec ?? Math.floor(Date.now() / 1000);
  const expiresAtSec = options.expiresAtSec ?? 0;
  const rawKey = globalThis.crypto.getRandomValues(new Uint8Array(32));
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));

  const header = new Uint8Array(22);
  header[0] = ENVELOPE_VERSION;
  header[1] = ENC_MODE_FRAGMENT_KEY;
  writeUint32BE(header, 2, issuedAtSec);
  writeUint32BE(header, 6, expiresAtSec);
  header.set(iv, 10);

  const compressedPlain = deflateSync(utf8Encoder.encode(plaintext), {
    level: 9,
  });
  const cryptoKey = await subtleCrypto().importKey(
    "raw",
    toArrayBuffer(rawKey),
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"],
  );
  const cipherBuf = await subtleCrypto().encrypt(
    {
      name: "AES-GCM",
      iv: toArrayBuffer(iv),
      additionalData: toArrayBuffer(header),
      tagLength: 128,
    },
    cryptoKey,
    toArrayBuffer(compressedPlain),
  );
  const cipherBytes = new Uint8Array(cipherBuf);
  const envelope = new Uint8Array(header.length + cipherBytes.length);
  envelope.set(header, 0);
  envelope.set(cipherBytes, header.length);

  return {
    eToken: toBase64Url(envelope),
    kToken: toBase64Url(rawKey),
  };
}

export function extractFragmentKey(
  urlOrHash: string | null | undefined,
): string | null {
  if (!urlOrHash) return null;
  let hashPart = urlOrHash.trim();
  const hashIdx = hashPart.indexOf("#");
  if (hashIdx >= 0) hashPart = hashPart.slice(hashIdx + 1);
  else if (hashPart.startsWith("http")) return null;
  const params = new URLSearchParams(hashPart);
  return params.get(FRAGMENT_KEY_PARAM);
}

export async function decryptWithFragmentKey(
  eTokenOrUrl: string,
  explicitHash?: string | null,
  nowSec = Math.floor(Date.now() / 1000),
): Promise<DecryptResult> {
  const eToken = extractEncryptedToken(eTokenOrUrl);
  const kToken =
    extractFragmentKey(explicitHash) ?? extractFragmentKey(eTokenOrUrl);

  if (!eToken) {
    return {
      ok: false,
      reason: "malformed",
      message: "Encrypted QR envelope is missing.",
    };
  }
  if (!kToken) {
    return {
      ok: false,
      reason: "missing-key",
      message:
        "Decryption key fragment (#k=…) is missing from this URL. Scan the original QR code directly.",
    };
  }

  let bytes: Uint8Array;
  let rawKey: Uint8Array;
  try {
    bytes = fromBase64Url(eToken);
    rawKey = fromBase64Url(kToken);
  } catch {
    return {
      ok: false,
      reason: "wrong-key-or-tampered",
      message:
        "Tamper Alert — Encrypted QR token or #k= key is malformed or modified.",
    };
  }

  if (
    rawKey.length !== 32 ||
    bytes.length < 39 ||
    bytes[0] !== ENVELOPE_VERSION ||
    bytes[1] !== ENC_MODE_FRAGMENT_KEY
  ) {
    return {
      ok: false,
      reason: "wrong-key-or-tampered",
      message: "Tamper Alert — Invalid AES-256-GCM envelope or key length.",
    };
  }

  const issuedAtSec = readUint32BE(bytes, 2);
  const expiresRaw = readUint32BE(bytes, 6);
  const iv = bytes.subarray(10, 22);
  const header = bytes.subarray(0, 22);
  const cipherBytes = bytes.subarray(22);

  try {
    const cryptoKey = await subtleCrypto().importKey(
      "raw",
      toArrayBuffer(rawKey),
      { name: "AES-GCM", length: 256 },
      false,
      ["decrypt"],
    );
    const plainBuf = await subtleCrypto().decrypt(
      {
        name: "AES-GCM",
        iv: toArrayBuffer(iv),
        additionalData: toArrayBuffer(header),
        tagLength: 128,
      },
      cryptoKey,
      toArrayBuffer(cipherBytes),
    );
    if (expiresRaw > 0 && nowSec > expiresRaw) {
      return {
        ok: false,
        reason: "expired",
        expiresAtSec: expiresRaw,
        message: `This QR code expired on ${new Date(expiresRaw * 1000).toLocaleString()}.`,
      };
    }
    const inflated = safeInflateBytes(new Uint8Array(plainBuf));
    return {
      ok: true,
      plaintext: utf8Decoder.decode(inflated),
      issuedAtSec,
      expiresAtSec: expiresRaw > 0 ? expiresRaw : null,
      mode: "fragment-key",
    };
  } catch {
    return {
      ok: false,
      reason: "wrong-key-or-tampered",
      message:
        "CRITICAL TAMPER ALERT — AES-256-GCM 128-bit authentication tag failed. Encrypted QR data or key was altered!",
    };
  }
}

/* --------------------- Password Strength & Expiry Helpers ---------------- */

export type PassphraseStrength = {
  score: 0 | 1 | 2 | 3 | 4;
  label: "Too short" | "Fair" | "Good" | "Strong" | "Vault-Grade";
};

export function evaluatePassphraseStrength(pass: string): PassphraseStrength {
  const trimmed = pass.trim();
  if (trimmed.length < 4) return { score: 0, label: "Too short" };
  let points = 0;
  if (trimmed.length >= 8) points += 1;
  if (trimmed.length >= 12) points += 1;
  if (/[a-z]/.test(trimmed) && /[A-Z]/.test(trimmed)) points += 1;
  if (/\d/.test(trimmed)) points += 1;
  if (/[^A-Za-z0-9]/.test(trimmed)) points += 1;
  if (points <= 1) return { score: 1, label: "Fair" };
  if (points === 2) return { score: 2, label: "Good" };
  if (points === 3) return { score: 3, label: "Strong" };
  return { score: 4, label: "Vault-Grade" };
}

export type QrExpiryOption = "none" | "1h" | "24h" | "7d" | "30d" | "custom";

export function resolveExpiryUnixSec(
  preset: QrExpiryOption,
  customIso?: string,
  nowMs = Date.now(),
): number {
  const baseSec = Math.floor(nowMs / 1000);
  switch (preset) {
    case "1h":
      return baseSec + 3600;
    case "24h":
      return baseSec + 86_400;
    case "7d":
      return baseSec + 7 * 86_400;
    case "30d":
      return baseSec + 30 * 86_400;
    case "custom": {
      if (!customIso?.trim()) return 0;
      const parsed = Date.parse(customIso.trim());
      if (Number.isNaN(parsed)) return 0;
      return Math.max(baseSec + 60, Math.floor(parsed / 1000));
    }
    default:
      return 0;
  }
}
