import { createMD5, createSHA1, createSHA256, createSHA512 } from "hash-wasm";

export const MAX_BASE64_FILE_BYTES = 10_000_000;
export const MAX_BASE64_TEXT_LENGTH = 14_000_000;
export const MAX_HASH_TEXT_BYTES = 20_000_000;
export const MAX_HASH_FILE_BYTES = 100 * 1024 * 1024;
export const HASH_CHUNK_BYTES = 1024 * 1024;
export const UUID_BATCH_LIMIT = 2_000;

function yieldToBrowser(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

export type HashAlgorithm = "MD5" | "SHA-1" | "SHA-256" | "SHA-512";

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, offset + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

export function base64ToBytes(input: string): Uint8Array {
  const compact = input.replace(/[\t\n\r ]/gu, "");
  if (!compact) throw new Error("Enter Base64 data first.");
  if (compact.length > MAX_BASE64_TEXT_LENGTH) {
    throw new Error(
      `Base64 input is too large. Keep it below ${MAX_BASE64_TEXT_LENGTH.toLocaleString()} characters.`,
    );
  }
  if (compact.length % 4 === 1) {
    throw new Error(
      "Invalid Base64 length. Check for missing or extra characters.",
    );
  }
  if (
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2,3})?$/u.test(
      compact,
    )
  ) {
    throw new Error(
      "Invalid Base64 characters or padding. Use A–Z, a–z, 0–9, +, / and optional padding.",
    );
  }

  const padded = compact.padEnd(Math.ceil(compact.length / 4) * 4, "=");
  try {
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  } catch {
    throw new Error(
      "Could not decode this Base64 data. Check its padding and content.",
    );
  }
}

export function encodeUrl(
  input: string,
  mode: "component" | "full-url" = "component",
): string {
  if (!input) throw new Error("Enter a URL or component first.");
  if (input.length > 1_000_000) {
    throw new Error(
      "URL input is too large. Keep it below 1,000,000 characters.",
    );
  }
  return mode === "component" ? encodeURIComponent(input) : encodeURI(input);
}

export function decodeUrl(
  input: string,
  mode: "component" | "full-url" = "component",
): string {
  if (!input) throw new Error("Enter encoded URL data first.");
  if (input.length > 1_000_000) {
    throw new Error(
      "URL input is too large. Keep it below 1,000,000 characters.",
    );
  }
  try {
    return mode === "component" ? decodeURIComponent(input) : decodeURI(input);
  } catch {
    throw new Error(
      "Invalid percent-encoding. Check that each % is followed by two hexadecimal digits.",
    );
  }
}

export function createUuidV4(): string {
  if (!globalThis.crypto?.getRandomValues) {
    throw new Error("Secure random generation is unavailable in this browser.");
  }
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function generateUuidBatch(quantity: number): string[] {
  if (
    !Number.isInteger(quantity) ||
    quantity < 1 ||
    quantity > UUID_BATCH_LIMIT
  ) {
    throw new Error(
      `Choose a whole number from 1 to ${UUID_BATCH_LIMIT.toLocaleString()}.`,
    );
  }
  const values = new Set<string>();
  let attempts = 0;
  while (values.size < quantity) {
    attempts += 1;
    if (attempts > quantity * 2 + 10) {
      throw new Error("Could not make a unique batch. Try again.");
    }
    values.add(createUuidV4());
  }
  return [...values];
}

const hashers: Record<
  HashAlgorithm,
  () => Promise<{
    update: (data: Uint8Array) => unknown;
    digest: (type?: "hex") => string;
  }>
> = {
  MD5: createMD5,
  "SHA-1": createSHA1,
  "SHA-256": createSHA256,
  "SHA-512": createSHA512,
};

export async function hashBytes(
  bytes: Uint8Array,
  algorithm: HashAlgorithm,
  onProgress?: (percent: number) => void,
): Promise<string> {
  const createHasher = hashers[algorithm];
  if (!createHasher) throw new Error("Choose a supported hash algorithm.");
  const hasher = await createHasher();
  const total = bytes.byteLength;
  if (total === 0) {
    onProgress?.(100);
    return hasher.digest("hex");
  }
  for (let offset = 0; offset < total; offset += HASH_CHUNK_BYTES) {
    hasher.update(
      bytes.subarray(offset, Math.min(offset + HASH_CHUNK_BYTES, total)),
    );
    onProgress?.(
      Math.min(100, Math.round(((offset + HASH_CHUNK_BYTES) / total) * 100)),
    );
    await yieldToBrowser();
  }
  return hasher.digest("hex");
}

export async function hashText(
  text: string,
  algorithm: HashAlgorithm,
  onProgress?: (percent: number) => void,
): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  if (bytes.byteLength > MAX_HASH_TEXT_BYTES) {
    throw new Error(
      `Text is too large. Keep it below ${MAX_HASH_TEXT_BYTES.toLocaleString()} UTF-8 bytes.`,
    );
  }
  return hashBytes(bytes, algorithm, onProgress);
}

export async function hashFile(
  file: File,
  algorithm: HashAlgorithm,
  onProgress?: (percent: number) => void,
): Promise<string> {
  if (file.size > MAX_HASH_FILE_BYTES) {
    throw new Error(
      `File is too large. Keep it below ${Math.round(MAX_HASH_FILE_BYTES / 1024 / 1024)} MB.`,
    );
  }
  const createHasher = hashers[algorithm];
  if (!createHasher) throw new Error("Choose a supported hash algorithm.");
  const hasher = await createHasher();
  if (file.size === 0) {
    onProgress?.(100);
    return hasher.digest("hex");
  }
  for (let offset = 0; offset < file.size; offset += HASH_CHUNK_BYTES) {
    const chunk = new Uint8Array(
      await file
        .slice(offset, Math.min(offset + HASH_CHUNK_BYTES, file.size))
        .arrayBuffer(),
    );
    hasher.update(chunk);
    onProgress?.(
      Math.min(
        100,
        Math.round(((offset + chunk.byteLength) / file.size) * 100),
      ),
    );
    await yieldToBrowser();
  }
  return hasher.digest("hex");
}
