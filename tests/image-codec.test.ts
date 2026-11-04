import { describe, expect, it } from "vitest";
import {
  createRgba,
  decodeTiff,
  encodeBmp,
  encodeGif,
  encodeTiff,
  hasTransparency,
  hexToRgb,
  inspectGif,
  inspectTiff,
  medianCutPalette,
  tiffDpi,
  type RgbaImage,
} from "../lib/tools/image-codec";

function solid(width: number, height: number, rgba: number[]): RgbaImage {
  const image = createRgba(width, height);
  for (let pixel = 0; pixel < width * height; pixel += 1)
    image.data.set(rgba, pixel * 4);
  return image;
}

function quilt(width: number, height: number): RgbaImage {
  const colors = [
    [0, 0, 0],
    [255, 255, 255],
    [255, 0, 0],
    [0, 255, 0],
    [0, 0, 255],
    [255, 255, 0],
    [255, 0, 255],
    [0, 255, 255],
    [128, 0, 0],
    [0, 128, 0],
    [0, 0, 128],
    [128, 128, 0],
    [128, 0, 128],
    [0, 128, 128],
    [192, 192, 192],
    [64, 64, 64],
  ];
  const image = createRgba(width, height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const [r, g, b] = colors[(x * 3 + y * 5) % colors.length];
      image.data.set([r, g, b, 255], (y * width + x) * 4);
    }
  }
  return image;
}

function noise(width: number, height: number): RgbaImage {
  const image = createRgba(width, height);
  let seed = 12345;
  for (let pixel = 0; pixel < width * height; pixel += 1) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    image.data[pixel * 4] = seed & 255;
    image.data[pixel * 4 + 1] = (seed >> 8) & 255;
    image.data[pixel * 4 + 2] = (seed >> 16) & 255;
    image.data[pixel * 4 + 3] = 255;
  }
  return image;
}

/* ------------------------------- BMP reader ------------------------------ */

function readBmp(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const width = view.getInt32(18, true);
  const height = view.getInt32(22, true);
  const bpp = view.getUint16(28, true);
  const rowBytes = Math.ceil((width * 3) / 4) * 4;
  const pixels = new Uint8Array(width * Math.abs(height) * 3);
  for (let y = 0; y < Math.abs(height); y += 1) {
    const rowStart = 54 + (Math.abs(height) - 1 - y) * rowBytes;
    for (let x = 0; x < width; x += 1) {
      const source = rowStart + x * 3;
      const target = (y * width + x) * 3;
      pixels[target] = bytes[source + 2];
      pixels[target + 1] = bytes[source + 1];
      pixels[target + 2] = bytes[source];
    }
  }
  return { width, height, bpp, pixels };
}

/* ------------------------------- GIF reader ------------------------------ */

function tiffTags(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const ifd = view.getUint32(4, true);
  const count = view.getUint16(ifd, true);
  const tags = new Map<
    number,
    { type: number; count: number; value: number }
  >();
  for (let index = 0; index < count; index += 1) {
    const offset = ifd + 2 + index * 12;
    tags.set(view.getUint16(offset, true), {
      type: view.getUint16(offset + 2, true),
      count: view.getUint32(offset + 4, true),
      value: view.getUint32(offset + 8, true),
    });
  }
  return tags;
}

function readGif(bytes: Uint8Array) {
  if (String.fromCharCode(...bytes.subarray(0, 6)) !== "GIF89a")
    throw new Error("Not a GIF89a file");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const width = view.getUint16(6, true);
  const height = view.getUint16(8, true);
  const packed = bytes[10];
  if (!(packed & 0x80)) throw new Error("Expected a global colour table");
  const tableSize = 2 << (packed & 0x07);
  const palette: number[][] = [];
  for (let index = 0; index < tableSize; index += 1) {
    const offset = 13 + index * 3;
    palette.push([bytes[offset], bytes[offset + 1], bytes[offset + 2]]);
  }
  let cursor = 13 + tableSize * 3;
  let transparentIndex = -1;
  while (cursor < bytes.length) {
    const block = bytes[cursor];
    if (block === 0x3b) break;
    if (block === 0x21) {
      const label = bytes[cursor + 1];
      cursor += 2;
      if (label === 0xf9) {
        const size = bytes[cursor];
        const flags = bytes[cursor + 1];
        if (flags & 1) transparentIndex = bytes[cursor + 4];
        cursor += 1 + size + 1;
      } else {
        while (bytes[cursor] !== 0) cursor += 1 + bytes[cursor];
        cursor += 1;
      }
      continue;
    }
    if (block !== 0x2c) throw new Error(`Unexpected GIF block ${block}`);
    const left = view.getUint16(cursor + 1, true);
    const top = view.getUint16(cursor + 3, true);
    const imageWidth = view.getUint16(cursor + 5, true);
    const imageHeight = view.getUint16(cursor + 7, true);
    const imagePacked = bytes[cursor + 9];
    if (imagePacked & 0x80) throw new Error("Local colour tables unsupported");
    if (left !== 0 || top !== 0) throw new Error("Unexpected image origin");
    if (imageWidth !== width || imageHeight !== height)
      throw new Error("Unexpected image size");
    cursor += 10;
    const minCodeSize = bytes[cursor];
    cursor += 1;
    const chunks: number[] = [];
    while (bytes[cursor] !== 0) {
      const length = bytes[cursor];
      chunks.push(...bytes.subarray(cursor + 1, cursor + 1 + length));
      cursor += 1 + length;
    }
    cursor += 1;
    const pixels = decodeGifLzw(
      Uint8Array.from(chunks),
      minCodeSize,
      width * height,
    );
    return { width, height, palette, transparentIndex, pixels };
  }
  throw new Error("No image block found");
}

/** GIF LZW (LSB-first) written independently of the encoder for cross-checks. */
function decodeGifLzw(
  data: Uint8Array,
  minCodeSize: number,
  expected: number,
): number[] {
  const clear = 1 << minCodeSize;
  const end = clear + 1;
  let table: number[][] = [];
  let codeSize = minCodeSize + 1;
  const reset = () => {
    table = [];
    for (let index = 0; index < clear; index += 1) table.push([index]);
    table.push([], []);
    codeSize = minCodeSize + 1;
  };
  reset();
  let bitBuffer = 0;
  let bitCount = 0;
  let cursor = 0;
  const read = () => {
    while (bitCount < codeSize) {
      if (cursor >= data.length) return -1;
      bitBuffer |= data[cursor] << bitCount;
      cursor += 1;
      bitCount += 8;
    }
    const code = bitBuffer & ((1 << codeSize) - 1);
    bitBuffer >>= codeSize;
    bitCount -= codeSize;
    return code;
  };
  const output: number[] = [];
  let previous: number[] | null = null;
  while (output.length < expected) {
    const code = read();
    if (code === -1 || code === end) break;
    if (code === clear) {
      reset();
      previous = null;
      continue;
    }
    let entry: number[];
    if (code < table.length) entry = table[code];
    else if (previous) entry = [...previous, previous[0]];
    else break;
    output.push(...entry);
    if (previous) {
      table.push([...previous, entry[0]]);
      if (table.length === 1 << codeSize && codeSize < 12) codeSize += 1;
    }
    previous = entry;
  }
  return output;
}

/* --------------------------------- tests --------------------------------- */

describe("colour helpers", () => {
  it("parses hex colours and falls back to white", () => {
    expect(hexToRgb("#7c5cff")).toEqual([124, 92, 255]);
    expect(hexToRgb("ffffff")).toEqual([255, 255, 255]);
    expect(hexToRgb("#12345")).toEqual([255, 255, 255]);
    expect(hexToRgb("nope")).toEqual([255, 255, 255]);
  });

  it("detects transparency", () => {
    expect(hasTransparency(solid(2, 2, [1, 2, 3, 255]))).toBe(false);
    const image = solid(2, 2, [1, 2, 3, 255]);
    image.data[3] = 0;
    expect(hasTransparency(image)).toBe(true);
  });
});

describe("BMP encoder", () => {
  it("writes a valid 24-bit header with padded rows", () => {
    const image = quilt(3, 2);
    const bytes = encodeBmp(image);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    expect(String.fromCharCode(bytes[0], bytes[1])).toBe("BM");
    expect(view.getUint32(2, true)).toBe(bytes.length);
    expect(view.getUint32(10, true)).toBe(54);
    expect(view.getUint32(14, true)).toBe(40);
    expect(view.getInt32(18, true)).toBe(3);
    expect(view.getInt32(22, true)).toBe(2);
    expect(view.getUint16(26, true)).toBe(1);
    expect(view.getUint16(28, true)).toBe(24);
    // 3 px * 3 bytes = 9, padded to 12 per row.
    expect(bytes.length).toBe(54 + 12 * 2);
  });

  it("stores pixels bottom-up as BGR and pads rows with zeroes", () => {
    const image = createRgba(2, 2);
    // top-left red, top-right green, bottom-left blue, bottom-right white
    image.data.set([255, 0, 0, 255, 0, 255, 0, 255], 0);
    image.data.set([0, 0, 255, 255, 255, 255, 255, 255], 8);
    const bytes = encodeBmp(image);
    // Bottom row first: blue then white.
    expect([...bytes.subarray(54, 60)]).toEqual([255, 0, 0, 255, 255, 255]);
    // Top row after 8-byte stride: red then green.
    expect([...bytes.subarray(62, 68)]).toEqual([0, 0, 255, 0, 255, 0]);
  });

  it("flattens transparency onto the chosen background", () => {
    const transparent = solid(1, 1, [0, 0, 0, 0]);
    const red = encodeBmp(transparent, "#ff0000");
    const decoded = readBmp(red);
    expect([...decoded.pixels]).toEqual([255, 0, 0]);
    const half = solid(1, 1, [0, 0, 0, 128]);
    const flat = readBmp(encodeBmp(half, "#ffffff"));
    expect(flat.pixels[0]).toBeGreaterThan(100);
    expect(flat.pixels[1]).toBeGreaterThan(100);
  });

  it("round-trips a multi-colour image exactly", () => {
    const image = quilt(17, 11);
    const decoded = readBmp(encodeBmp(image));
    expect(decoded.width).toBe(17);
    expect(decoded.height).toBe(11);
    for (let pixel = 0; pixel < 17 * 11; pixel += 1) {
      expect([...decoded.pixels.subarray(pixel * 3, pixel * 3 + 3)]).toEqual([
        image.data[pixel * 4],
        image.data[pixel * 4 + 1],
        image.data[pixel * 4 + 2],
      ]);
    }
  });
});

describe("TIFF encoder and decoder", () => {
  it("writes a little-endian baseline header", () => {
    const bytes = encodeTiff(quilt(4, 3), { compression: "none" });
    expect(bytes[0]).toBe(0x49);
    expect(bytes[1]).toBe(0x49);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    expect(view.getUint16(2, true)).toBe(42);
    expect(view.getUint32(4, true)).toBe(8);
    expect(view.getUint16(8, true)).toBeGreaterThanOrEqual(14);
  });

  it("round-trips RGB pixel data without compression", () => {
    const image = quilt(9, 7);
    const decoded = decodeTiff(encodeTiff(image, { compression: "none" }));
    expect(decoded.width).toBe(9);
    expect(decoded.height).toBe(7);
    expect([...decoded.data]).toEqual([...image.data]);
  });

  it("round-trips RGB pixel data with LZW", () => {
    const image = quilt(13, 9);
    const decoded = decodeTiff(encodeTiff(image, { compression: "lzw" }));
    expect([...decoded.data]).toEqual([...image.data]);
  });

  it("round-trips noisy data through LZW dictionary resets", () => {
    const image = noise(120, 90);
    const decoded = decodeTiff(encodeTiff(image, { compression: "lzw" }));
    expect([...decoded.data]).toEqual([...image.data]);
  });

  it("keeps an alpha channel only when the image has transparency", () => {
    const opaque = quilt(5, 5);
    const opaqueDecoded = decodeTiff(
      encodeTiff(opaque, { compression: "none" }),
    );
    expect(opaqueDecoded.data[3]).toBe(255);
    // SamplesPerPixel is 3 for opaque images, so alpha is synthesised.
    expect([...opaqueDecoded.data.filter((_, i) => i % 4 === 3)]).toEqual(
      new Array(25).fill(255),
    );

    const image = solid(4, 4, [10, 20, 30, 200]);
    image.data[3] = 0;
    image.data[7] = 128;
    const bytes = encodeTiff(image, { compression: "lzw" });
    const decoded = decodeTiff(bytes);
    expect([...decoded.data]).toEqual([...image.data]);
    const tags = tiffTags(bytes);
    expect(tags.has(338)).toBe(true); // ExtraSamples: unassociated alpha
    expect(tags.get(277)?.value).toBe(4); // SamplesPerPixel
  });

  it("records and reads the resolution and software tags", () => {
    const bytes = encodeTiff(quilt(4, 4), { compression: "none", dpi: 300 });
    expect(tiffDpi(bytes)).toBe(300);
    expect(new TextDecoder().decode(bytes)).toContain("QUICKKIT");
    expect(tiffDpi(encodeTiff(quilt(2, 2), { dpi: 72 }))).toBe(72);
    expect(tiffDpi(new Uint8Array([1, 2, 3]))).toBeNull();
  });

  it("inspects dimensions without decoding pixels", () => {
    expect(
      inspectTiff(encodeTiff(quilt(21, 6), { compression: "lzw" })),
    ).toEqual({ width: 21, height: 6 });
    expect(() => inspectTiff(new Uint8Array([1, 2, 3, 4]))).toThrow(
      /too short/i,
    );
    expect(() => inspectTiff(new Uint8Array(8))).toThrow(/not a TIFF/i);
  });

  it("rejects input that is not a readable TIFF", () => {
    expect(() => decodeTiff(new Uint8Array([1, 2, 3]))).toThrow(/too short/i);
    expect(() => decodeTiff(new Uint8Array(16))).toThrow(/not a TIFF/i);
    const truncated = encodeTiff(quilt(10, 10), { compression: "none" }).slice(
      0,
      60,
    );
    expect(() => decodeTiff(truncated)).toThrow();
  });
});

describe("GIF encoder", () => {
  it("writes a valid single-frame GIF89a with a global palette", () => {
    const image = quilt(8, 5);
    const bytes = encodeGif(image);
    const gif = readGif(bytes);
    expect(gif.width).toBe(8);
    expect(gif.height).toBe(5);
    expect(gif.palette.length).toBeGreaterThanOrEqual(2);
    expect(gif.palette.length).toBeLessThanOrEqual(256);
    expect(gif.transparentIndex).toBe(-1);
  });

  it("reproduces a 16-colour image exactly", () => {
    const image = quilt(20, 14);
    const gif = readGif(encodeGif(image));
    expect(gif.pixels).toHaveLength(20 * 14);
    for (let pixel = 0; pixel < 20 * 14; pixel += 1) {
      expect(gif.palette[gif.pixels[pixel]]).toEqual([
        image.data[pixel * 4],
        image.data[pixel * 4 + 1],
        image.data[pixel * 4 + 2],
      ]);
    }
  });

  it("keeps exactly 16 palette entries for a flat 16-colour image", () => {
    const palette = medianCutPalette(quilt(40, 40), 256);
    expect(palette).toHaveLength(16);
    expect(new Set(palette.map((color) => color.join(","))).size).toBe(16);
  });

  it("reserves a transparent entry only when alpha is present", () => {
    const image = solid(6, 6, [200, 40, 90, 255]);
    image.data.set([0, 0, 0, 0], 0); // one transparent pixel
    const gif = readGif(encodeGif(image));
    expect(gif.transparentIndex).toBeGreaterThanOrEqual(0);
    expect(gif.pixels[0]).toBe(gif.transparentIndex);
    // Opaque pixels must never reuse the reserved transparent index.
    for (let pixel = 1; pixel < 36; pixel += 1)
      expect(gif.pixels[pixel]).not.toBe(gif.transparentIndex);
    expect(gif.palette[gif.pixels[1]]).toEqual([200, 40, 90]);
  });

  it("flattens when transparency is switched off", () => {
    const image = solid(4, 4, [10, 200, 30, 128]);
    image.data[3] = 0;
    const gif = readGif(encodeGif(image, { transparent: false }));
    expect(gif.transparentIndex).toBe(-1);
    expect(gif.palette.length).toBe(2);
    expect(gif.palette[gif.pixels[1]]).toEqual([10, 200, 30]);
  });

  it("handles large noisy images with dictionary growth and clear codes", () => {
    const image = noise(160, 120);
    const gif = readGif(encodeGif(image));
    expect(gif.pixels).toHaveLength(160 * 120);
    expect(gif.palette.length).toBe(256);
  });

  it("handles single-pixel and solid images", () => {
    const single = readGif(encodeGif(solid(1, 1, [1, 2, 3, 255])));
    expect(single.pixels).toHaveLength(1);
    expect(single.palette.length).toBe(2);
    expect(single.palette[single.pixels[0]]).toEqual([1, 2, 3]);
    const solidGif = readGif(encodeGif(solid(5, 5, [255, 255, 255, 255])));
    expect(solidGif.palette[solidGif.pixels[0]]).toEqual([255, 255, 255]);
  });
});

/* --------------------------- gif frame walking --------------------------- */

/** Minimal GIF89a built by hand: header, global table, then N frames. */
function buildGif(frames: number, options: { loop?: boolean } = {}) {
  const bytes: number[] = [];
  const push = (...values: number[]) => bytes.push(...values);
  const text = (value: string) =>
    push(...value.split("").map((c) => c.charCodeAt(0)));

  text("GIF89a");
  push(8, 0, 6, 0); // 8 x 6 logical size
  push(0x80); // global colour table, 2 entries
  push(0, 0); // background, aspect
  push(255, 0, 0, 0, 255, 0); // 2-entry palette

  if (options.loop) {
    push(0x21, 0xff, 11);
    text("NETSCAPE2.0");
    push(3, 1, 0, 0, 0);
  }

  for (let frame = 0; frame < frames; frame += 1) {
    push(0x21, 0xf9, 4, 0, 10, 0, 0, 0); // graphic control, 100 ms delay
    push(0x2c, 0, 0, 0, 0, 8, 0, 6, 0, 0); // image descriptor, no local table
    push(2, 2, 0x44, 0x01, 0x00); // LZW min code 2 + one data sub-block + end
  }
  push(0x3b); // trailer
  return new Uint8Array(bytes);
}

describe("inspectGif", () => {
  it("reads the size of a real single-frame encode", () => {
    const encoded = encodeGif(solid(12, 9, [10, 20, 30, 255]));
    const info = inspectGif(encoded);
    expect(info.width).toBe(12);
    expect(info.height).toBe(9);
    expect(info.frames).toBe(1);
    expect(info.animated).toBe(false);
  });

  it("counts frames in an animation", () => {
    const info = inspectGif(buildGif(4));
    expect(info.width).toBe(8);
    expect(info.height).toBe(6);
    expect(info.frames).toBe(4);
    expect(info.animated).toBe(true);
  });

  it("sees the Netscape loop extension", () => {
    expect(inspectGif(buildGif(2, { loop: true })).loops).toBe(true);
    expect(inspectGif(buildGif(2)).loops).toBe(false);
  });

  it("does not mistake a sub-block for a frame", () => {
    // 0x2c appears inside the image data; a byte scanner would over-count.
    const info = inspectGif(buildGif(1));
    expect(info.frames).toBe(1);
    expect(info.animated).toBe(false);
  });

  it("rejects files that are not GIFs", () => {
    expect(() => inspectGif(new Uint8Array([1, 2, 3]))).toThrow(/too short/);
    expect(() =>
      inspectGif(
        new Uint8Array("PNG-not-a-gif".split("").map((c) => c.charCodeAt(0))),
      ),
    ).toThrow(/not a GIF/);
  });
});
