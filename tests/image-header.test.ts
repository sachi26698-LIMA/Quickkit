import { it, expect } from "vitest";
import {
  inspectImageHeader,
  checkImageDimensions,
} from "../lib/tools/image-header";
function png(width: number, height: number) {
  const bytes = new Uint8Array(33);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
  bytes.set([73, 72, 68, 82], 12);
  const v = new DataView(bytes.buffer);
  v.setUint32(16, width);
  v.setUint32(20, height);
  return bytes;
}
it("reads PNG dimensions without decoding a pixel buffer", () =>
  expect(inspectImageHeader(png(640, 480), "image/png")).toEqual({
    width: 640,
    height: 480,
  }));
it("rejects oversized PNG before decode", () =>
  expect(() => inspectImageHeader(png(100000, 100000), "image/png")).toThrow(
    "24 megapixels",
  ));
it.each([
  [0, 1],
  [1, 0],
  [8193, 2],
  [8192, 8192],
])("rejects out-of-bounds dimensions %s×%s", (w, h) =>
  expect(() => checkImageDimensions(w, h)).toThrow(),
);
it("reads JPEG SOF dimensions", () => {
  const bytes = new Uint8Array([
    255, 216, 255, 192, 0, 8, 8, 1, 224, 2, 128, 0,
  ]);
  expect(inspectImageHeader(bytes, "image/jpeg")).toEqual({
    width: 640,
    height: 480,
  });
});
it("reads extended WebP dimensions", () => {
  const b = new Uint8Array(30);
  b.set([82, 73, 70, 70], 0);
  b.set([87, 69, 66, 80, 86, 80, 56, 88], 8);
  new DataView(b.buffer).setUint32(16, 10, true);
  b[24] = 127;
  b[25] = 2;
  b[27] = 223;
  b[28] = 1;
  expect(inspectImageHeader(b, "image/webp")).toEqual({
    width: 640,
    height: 480,
  });
});
it.each(["image/jpeg", "image/png", "image/webp"])(
  "rejects corrupt or mismatched %s contents",
  (type) =>
    expect(() => inspectImageHeader(new Uint8Array([1, 2, 3]), type)).toThrow(
      "decoded",
    ),
);
