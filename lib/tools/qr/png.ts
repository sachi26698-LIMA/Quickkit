/**
 * Dependency-free PNG encoder.
 *
 * The QR image is rasterised by `raster.ts`, then encoded here — no canvas in
 * the loop — so a downloaded PNG is byte-for-byte what the preview showed and
 * what the unit tests decode.
 *
 * Compression uses `CompressionStream("deflate")` when the platform provides
 * it (all current browsers, Node ≥ 18) and falls back to stored DEFLATE blocks
 * otherwise, so encoding never fails, only gets bigger.
 */
import { crc32 } from "../zip";
import type { QrBitmap } from "./raster";

const signature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

function chunk(type: string, data: Uint8Array) {
  const length = data.length;
  const bytes = new Uint8Array(12 + length);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, length);
  for (let index = 0; index < 4; index += 1)
    bytes[4 + index] = type.charCodeAt(index);
  bytes.set(data, 8);
  const crc = crc32(bytes.subarray(4, 8 + length));
  view.setUint32(8 + length, crc >>> 0);
  return bytes;
}

/** Capable enough to compress: browsers and Node ≥ 18; jsdom and old engines no. */
function canCompress() {
  return (
    typeof CompressionStream === "function" &&
    typeof ReadableStream === "function" &&
    typeof Blob === "function" &&
    typeof Blob.prototype.stream === "function"
  );
}

async function readStream(stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    chunks.push(value);
    length += value.length;
  }
  const out = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

async function deflate(bytes: Uint8Array) {
  if (canCompress()) {
    try {
      const stream = new Blob([bytes as unknown as BlobPart])
        .stream()
        .pipeThrough(new CompressionStream("deflate"));
      const compressed = await readStream(stream as ReadableStream<Uint8Array>);
      // A zero-length result means the platform lied about its streams.
      if (compressed.length) return compressed;
    } catch {
      /* fall through to stored blocks */
    }
  }
  return storedDeflate(bytes);
}

/** zlib-wrapped stored (uncompressed) DEFLATE, for engines without streams. */
function storedDeflate(bytes: Uint8Array) {
  const maxBlock = 65_535;
  const blocks = Math.max(1, Math.ceil(bytes.length / maxBlock));
  const out = new Uint8Array(2 + bytes.length + blocks * 5 + 4);
  const view = new DataView(out.buffer);
  let offset = 0;
  out[offset++] = 0x78;
  out[offset++] = 0x01;
  for (let block = 0; block < blocks; block += 1) {
    const start = block * maxBlock;
    const size = Math.min(maxBlock, bytes.length - start);
    const last = block === blocks - 1 ? 1 : 0;
    out[offset++] = last;
    view.setUint16(offset, size & 0xffff, true);
    offset += 2;
    view.setUint16(offset, ~size & 0xffff, true);
    offset += 2;
    out.set(bytes.subarray(start, start + size), offset);
    offset += size;
  }
  let a = 1;
  let b = 0;
  for (let index = 0; index < bytes.length; index += 1) {
    a = (a + bytes[index]) % 65521;
    b = (b + a) % 65521;
  }
  view.setUint32(offset, (b << 16) | a, false);
  return out.subarray(0, offset + 4);
}

export async function encodePng(bitmap: QrBitmap): Promise<Uint8Array> {
  const { width, height, rgba } = bitmap;
  if (!width || !height) throw new Error("Nothing was rendered to encode.");
  const stride = width * 4;
  const raw = new Uint8Array((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0; // filter: none
    raw.set(rgba.subarray(y * stride, (y + 1) * stride), y * (stride + 1) + 1);
  }
  const header = new Uint8Array(13);
  const view = new DataView(header.buffer);
  view.setUint32(0, width);
  view.setUint32(4, height);
  header[8] = 8; // bit depth
  header[9] = 6; // truecolour + alpha
  const compressed = await deflate(raw);
  const total =
    signature.length + 12 + header.length + 12 + compressed.length + 12;
  const out = new Uint8Array(total);
  let offset = 0;
  const push = (bytes: Uint8Array) => {
    out.set(bytes, offset);
    offset += bytes.length;
  };
  push(signature);
  push(chunk("IHDR", header));
  push(chunk("IDAT", compressed));
  push(chunk("IEND", new Uint8Array(0)));
  return out;
}

export function pngBlob(bytes: Uint8Array) {
  return new Blob([bytes as unknown as BlobPart], { type: "image/png" });
}

export async function bitmapToPngBlob(bitmap: QrBitmap) {
  return pngBlob(await encodePng(bitmap));
}

/** Standard base64, chunked so huge images do not blow the argument limit. */
export function base64FromBytes(bytes: Uint8Array) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize)
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  return btoa(binary);
}

/** Base64url, used for share links (no padding, URL-safe alphabet). */
export function base64UrlFromBytes(bytes: Uint8Array) {
  return base64FromBytes(bytes)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function bytesFromBase64Url(text: string) {
  const padded = text.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, "="));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1)
    bytes[index] = binary.charCodeAt(index);
  return bytes;
}
