import { MAX_IMAGE_PIXELS, validateImage } from "./image-input";
const invalid = () =>
  new Error(
    "This image could not be decoded. Check its contents and file type.",
  );
function ascii(bytes: Uint8Array, start: number, length: number) {
  return String.fromCharCode(...bytes.subarray(start, start + length));
}
export function checkImageDimensions(width: number, height: number) {
  if (
    !width ||
    !height ||
    width * height > MAX_IMAGE_PIXELS ||
    width > 8192 ||
    height > 8192
  )
    throw new Error(
      "Use an image up to 24 megapixels, with neither side above 8,192 pixels.",
    );
  return { width, height };
}
// Inspect bounded file bytes before browser decode/preview, avoiding allocation of an oversized pixel buffer.
export function inspectImageHeader(
  bytes: Uint8Array,
  type: string,
): { width: number; height: number } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (
    type === "image/png" &&
    bytes.length >= 33 &&
    ascii(bytes, 0, 8) === "\x89PNG\r\n\x1a\n" &&
    ascii(bytes, 12, 4) === "IHDR"
  )
    return checkImageDimensions(view.getUint32(16), view.getUint32(20));
  if (type === "image/jpeg" && bytes[0] === 0xff && bytes[1] === 0xd8) {
    let offset = 2;
    while (offset + 3 < bytes.length) {
      if (bytes[offset++] !== 0xff) throw invalid();
      while (bytes[offset] === 0xff) offset++;
      const marker = bytes[offset++];
      if (marker === 0xda || marker === 0xd9) break;
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) continue;
      if (offset + 2 > bytes.length) break;
      const length = view.getUint16(offset);
      if (length < 2 || offset + length > bytes.length) break;
      if (
        [
          0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd,
          0xce, 0xcf,
        ].includes(marker)
      ) {
        if (length < 8) break;
        return checkImageDimensions(
          view.getUint16(offset + 5),
          view.getUint16(offset + 3),
        );
      }
      offset += length;
    }
  }
  if (
    type === "image/webp" &&
    bytes.length >= 20 &&
    ascii(bytes, 0, 4) === "RIFF" &&
    ascii(bytes, 8, 4) === "WEBP"
  ) {
    let offset = 12;
    while (offset + 8 <= bytes.length) {
      const chunk = ascii(bytes, offset, 4);
      const size = view.getUint32(offset + 4, true);
      const start = offset + 8;
      if (start + size > bytes.length) break;
      if (chunk === "VP8X" && size >= 10) {
        const width =
          1 +
          bytes[start + 4] +
          (bytes[start + 5] << 8) +
          (bytes[start + 6] << 16);
        const height =
          1 +
          bytes[start + 7] +
          (bytes[start + 8] << 8) +
          (bytes[start + 9] << 16);
        return checkImageDimensions(width, height);
      }
      if (chunk === "VP8L" && size >= 5 && bytes[start] === 0x2f)
        return checkImageDimensions(
          1 + bytes[start + 1] + ((bytes[start + 2] & 0x3f) << 8),
          1 +
            (bytes[start + 2] >> 6) +
            (bytes[start + 3] << 2) +
            ((bytes[start + 4] & 0x0f) << 10),
        );
      if (
        chunk === "VP8 " &&
        size >= 10 &&
        bytes[start + 3] === 0x9d &&
        bytes[start + 4] === 0x01 &&
        bytes[start + 5] === 0x2a
      )
        return checkImageDimensions(
          view.getUint16(start + 6, true) & 0x3fff,
          view.getUint16(start + 8, true) & 0x3fff,
        );
      offset = start + size + (size % 2);
    }
  }
  throw invalid();
}
export async function preflightImage(file: File) {
  validateImage(file);
  return inspectImageHeader(
    new Uint8Array(await file.arrayBuffer()),
    file.type,
  );
}
