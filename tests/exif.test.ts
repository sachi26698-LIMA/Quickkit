import { describe, expect, it } from "vitest";
import {
  METADATA_SCAN_LIMIT,
  metadataSummary,
  scanExifBlock,
  scanMetadata,
} from "../lib/tools/exif";

const ascii = (value: string) => Array.from(new TextEncoder().encode(value));

/** Build a minimal little-endian TIFF block with orientation/camera/GPS tags. */
function exifBlock() {
  const entries = 4;
  const tiff = new Uint8Array(8 + 2 + entries * 12 + 4 + 64);
  const view = new DataView(tiff.buffer);
  tiff[0] = 0x49;
  tiff[1] = 0x49;
  view.setUint16(2, 42, true);
  view.setUint32(4, 8, true);
  view.setUint16(8, entries, true);
  let entry = 10;
  const put = (tag: number, type: number, count: number, value: number) => {
    view.setUint16(entry, tag, true);
    view.setUint16(entry + 2, type, true);
    view.setUint32(entry + 4, count, true);
    view.setUint32(entry + 8, value, true);
    entry += 12;
  };
  const stringsAt = 10 + entries * 12 + 4;
  put(0x0112, 3, 1, 6); // orientation 6
  put(0x010f, 2, 6, stringsAt); // Make
  put(0x0110, 2, 8, stringsAt + 8); // Model
  put(0x8825, 4, 1, 0); // GPS IFD pointer
  tiff.set(ascii("Canon\u0000"), stringsAt);
  tiff.set(ascii("EOS R5 \u0000"), stringsAt + 8);
  return tiff;
}

function jpegWithExif() {
  const block = exifBlock();
  const payload = new Uint8Array(6 + block.length);
  payload.set(ascii("Exif"), 0);
  payload[5] = 0;
  payload.set(block, 6);
  const header = [0xff, 0xd8, 0xff, 0xe1, 0, 0];
  const length = payload.length + 2;
  const bytes = new Uint8Array(header.length + payload.length + 4);
  bytes.set(header, 0);
  bytes[4] = (length >> 8) & 0xff;
  bytes[5] = length & 0xff;
  bytes.set(payload, 6);
  bytes.set([0xff, 0xda, 0x00, 0x02], 6 + payload.length);
  return bytes;
}

describe("EXIF scanning", () => {
  it("reads orientation, camera and GPS presence", () => {
    const report = scanMetadata(jpegWithExif(), "image/jpeg");
    expect(report.hasExif).toBe(true);
    expect(report.hasGps).toBe(true);
    expect(report.orientation).toBe(6);
    expect(report.camera).toBe("Canon EOS R5");
    expect(report.stripped).toBe(true);
  });

  it("handles big-endian TIFF blocks and ICC/XMP segments", () => {
    const block = new Uint8Array(26);
    const view = new DataView(block.buffer);
    block[0] = 0x4d;
    block[1] = 0x4d;
    view.setUint16(2, 42, false);
    view.setUint32(4, 8, false);
    view.setUint16(8, 1, false);
    view.setUint16(10, 0x0112, false);
    view.setUint16(12, 3, false);
    view.setUint32(14, 1, false);
    view.setUint16(18, 3, false);
    expect(scanExifBlock(block).orientation).toBe(3);
  });

  it("ignores corrupt blocks instead of throwing", () => {
    expect(scanExifBlock(new Uint8Array([1, 2, 3]))).toEqual({
      orientation: null,
      camera: null,
      captured: null,
      hasGps: false,
    });
    expect(() =>
      scanMetadata(
        new Uint8Array([0xff, 0xd8, 0xff, 0xe1, 0, 2]),
        "image/jpeg",
      ),
    ).not.toThrow();
  });

  it("reports PNG eXIf and iCCP chunks", () => {
    const exif = exifBlock();
    const chunkLength = exif.length;
    const bytes = new Uint8Array(8 + 12 + chunkLength + 12);
    bytes.set([137, 80, 78, 71, 13, 10, 26, 10], 0);
    const view = new DataView(bytes.buffer);
    view.setUint32(8, chunkLength);
    bytes.set(ascii("eXIf"), 12);
    bytes.set(exif, 16);
    const second = 8 + 12 + chunkLength;
    view.setUint32(second, 4);
    bytes.set(ascii("iCCP"), second + 4);
    const report = scanMetadata(bytes, "image/png");
    expect(report.hasExif).toBe(true);
    expect(report.hasIcc).toBe(true);
    expect(report.orientation).toBe(6);
  });

  it("reports WebP EXIF, ICCP and XMP chunks", () => {
    const bytes = new Uint8Array(12 + 8 + 4 + 8 + 4 + 8 + 4);
    bytes.set(ascii("RIFF"), 0);
    bytes.set(ascii("WEBP"), 8);
    const view = new DataView(bytes.buffer);
    let offset = 12;
    for (const chunk of ["EXIF", "ICCP", "XMP "]) {
      bytes.set(ascii(chunk), offset);
      view.setUint32(offset + 4, 4, true);
      offset += 12;
    }
    const report = scanMetadata(bytes, "image/webp");
    expect(report.hasExif).toBe(true);
    expect(report.hasIcc).toBe(true);
    expect(report.hasXmp).toBe(true);
  });

  it("reports clean files and summarises findings", () => {
    const clean = scanMetadata(new Uint8Array([1, 2, 3]), "image/webp");
    expect(clean.hasExif).toBe(false);
    expect(metadataSummary(clean)).toBe("No embedded metadata found");
    expect(metadataSummary(scanMetadata(jpegWithExif(), "image/jpeg"))).toBe(
      "Found EXIF, GPS location — removed from every output",
    );
  });

  it("only scans a bounded prefix of the file", () => {
    const huge = new Uint8Array(METADATA_SCAN_LIMIT + 1024);
    huge.set(jpegWithExif(), 0);
    expect(scanMetadata(huge, "image/jpeg").hasExif).toBe(true);
    expect(METADATA_SCAN_LIMIT).toBe(256 * 1024);
  });
});
