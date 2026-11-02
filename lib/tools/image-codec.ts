/**
 * Small, dependency-free raster codecs for formats a canvas cannot produce or
 * read: BMP (write), baseline TIFF (read + write) and single-frame GIF (write).
 *
 * Everything works on plain RGBA bytes so it runs in a Web Worker, in the page
 * and in Node under Vitest. No DOM, no third-party code.
 */

export type RgbaImage = {
  width: number;
  height: number;
  /** RGBA, 4 bytes per pixel, row-major, top-down. */
  data: Uint8ClampedArray;
};

export function createRgba(width: number, height: number): RgbaImage {
  return { width, height, data: new Uint8ClampedArray(width * height * 4) };
}

export function hexToRgb(hex: string): [number, number, number] {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return [255, 255, 255];
  const value = Number.parseInt(match[1], 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

export function hasTransparency(image: RgbaImage): boolean {
  const { data } = image;
  for (let index = 3; index < data.length; index += 4)
    if (data[index] < 255) return true;
  return false;
}

/* ---------------------------------- BMP ---------------------------------- */

/**
 * 24-bit uncompressed BMP, bottom-up with 4-byte row padding. BMP has no alpha
 * channel, so transparent pixels are composited onto `background` first.
 */
export function encodeBmp(
  image: RgbaImage,
  background = "#ffffff",
): Uint8Array {
  const { width, height, data } = image;
  const [bgR, bgG, bgB] = hexToRgb(background);
  const rowBytes = Math.ceil((width * 3) / 4) * 4;
  const pixelBytes = rowBytes * height;
  const fileSize = 54 + pixelBytes;
  const bytes = new Uint8Array(fileSize);
  const view = new DataView(bytes.buffer);

  bytes[0] = 0x42;
  bytes[1] = 0x4d;
  view.setUint32(2, fileSize, true);
  view.setUint32(10, 54, true);
  view.setUint32(14, 40, true);
  view.setInt32(18, width, true);
  view.setInt32(22, height, true);
  view.setUint16(26, 1, true);
  view.setUint16(28, 24, true);
  view.setUint32(30, 0, true);
  view.setUint32(34, pixelBytes, true);
  view.setInt32(38, 2835, true);
  view.setInt32(42, 2835, true);
  view.setUint32(46, 0, true);
  view.setUint32(50, 0, true);

  for (let y = 0; y < height; y += 1) {
    const rowStart = 54 + (height - 1 - y) * rowBytes;
    for (let x = 0; x < width; x += 1) {
      const source = (y * width + x) * 4;
      const alpha = data[source + 3] / 255;
      const offset = rowStart + x * 3;
      bytes[offset] = Math.round(data[source + 2] * alpha + bgB * (1 - alpha));
      bytes[offset + 1] = Math.round(
        data[source + 1] * alpha + bgG * (1 - alpha),
      );
      bytes[offset + 2] = Math.round(data[source] * alpha + bgR * (1 - alpha));
    }
  }
  return bytes;
}

/* ---------------------------------- GIF ---------------------------------- */

type Box = {
  colors: Uint32Array;
  rMin: number;
  rMax: number;
  gMin: number;
  gMax: number;
  bMin: number;
  bMax: number;
};

function packRgb(r: number, g: number, b: number) {
  return (r << 16) | (g << 8) | b;
}

function boxStats(box: Box) {
  box.rMin = box.gMin = box.bMin = 255;
  box.rMax = box.gMax = box.bMax = 0;
  for (const color of box.colors) {
    const r = (color >> 16) & 255;
    const g = (color >> 8) & 255;
    const b = color & 255;
    if (r < box.rMin) box.rMin = r;
    if (r > box.rMax) box.rMax = r;
    if (g < box.gMin) box.gMin = g;
    if (g > box.gMax) box.gMax = g;
    if (b < box.bMin) box.bMin = b;
    if (b > box.bMax) box.bMax = b;
  }
}

/** Median-cut palette. Returns up to `maxColors` RGB triples. */
export function medianCutPalette(
  image: RgbaImage,
  maxColors = 256,
): number[][] {
  const { data } = image;
  const sampleStep =
    Math.max(4, Math.floor((image.width * image.height) / 40_000)) * 4;
  const samples: number[] = [];
  for (let index = 0; index < data.length; index += sampleStep) {
    if (data[index + 3] < 128) continue;
    samples.push(packRgb(data[index], data[index + 1], data[index + 2]));
  }
  if (!samples.length) samples.push(0xffffff);
  const boxes: Box[] = [
    {
      colors: Uint32Array.from(samples),
      rMin: 0,
      rMax: 0,
      gMin: 0,
      gMax: 0,
      bMin: 0,
      bMax: 0,
    },
  ];
  boxStats(boxes[0]);
  while (boxes.length < maxColors) {
    let target = -1;
    let widest = 0;
    boxes.forEach((box, index) => {
      if (box.colors.length < 2) return;
      const span = Math.max(
        box.rMax - box.rMin,
        box.gMax - box.gMin,
        box.bMax - box.bMin,
      );
      if (span > widest) {
        widest = span;
        target = index;
      }
    });
    if (target < 0) break;
    const box = boxes[target];
    const rSpan = box.rMax - box.rMin;
    const gSpan = box.gMax - box.gMin;
    const bSpan = box.bMax - box.bMin;
    const channel =
      rSpan >= gSpan && rSpan >= bSpan ? 16 : gSpan >= bSpan ? 8 : 0;
    const sorted = Array.from(box.colors).sort(
      (a, b) => ((a >> channel) & 255) - ((b >> channel) & 255),
    );
    const mid = sorted.length >> 1;
    const lower: Box = {
      colors: Uint32Array.from(sorted.slice(0, mid)),
      rMin: 0,
      rMax: 0,
      gMin: 0,
      gMax: 0,
      bMin: 0,
      bMax: 0,
    };
    const upper: Box = {
      colors: Uint32Array.from(sorted.slice(mid)),
      rMin: 0,
      rMax: 0,
      gMin: 0,
      gMax: 0,
      bMin: 0,
      bMax: 0,
    };
    boxStats(lower);
    boxStats(upper);
    boxes.splice(target, 1, lower, upper);
  }
  return boxes.map((box) => {
    let r = 0;
    let g = 0;
    let b = 0;
    for (const color of box.colors) {
      r += (color >> 16) & 255;
      g += (color >> 8) & 255;
      b += color & 255;
    }
    const count = Math.max(1, box.colors.length);
    return [
      Math.round(r / count),
      Math.round(g / count),
      Math.round(b / count),
    ];
  });
}

function nearestColor(
  palette: number[][],
  r: number,
  g: number,
  b: number,
): number {
  let best = 0;
  let bestDistance = Infinity;
  for (let index = 0; index < palette.length; index += 1) {
    const [pr, pg, pb] = palette[index];
    const distance =
      (pr - r) * (pr - r) + (pg - g) * (pg - g) + (pb - b) * (pb - b);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = index;
      if (distance === 0) break;
    }
  }
  return best;
}

type BitWriter = {
  bytes: number[];
  current: number;
  bits: number;
};

function writeBits(
  writer: BitWriter,
  value: number,
  count: number,
  lsbFirst: boolean,
) {
  if (lsbFirst) {
    writer.current |= value << writer.bits;
    writer.bits += count;
    while (writer.bits >= 8) {
      writer.bytes.push(writer.current & 255);
      writer.current >>>= 8;
      writer.bits -= 8;
    }
  } else {
    for (let bit = count - 1; bit >= 0; bit -= 1) {
      writer.current = (writer.current << 1) | ((value >> bit) & 1);
      writer.bits += 1;
      if (writer.bits === 8) {
        writer.bytes.push(writer.current & 255);
        writer.current = 0;
        writer.bits = 0;
      }
    }
  }
}

function flushBits(writer: BitWriter, lsbFirst: boolean) {
  if (!writer.bits) return;
  if (lsbFirst) writer.bytes.push(writer.current & 255);
  else writer.bytes.push((writer.current << (8 - writer.bits)) & 255);
  writer.current = 0;
  writer.bits = 0;
}

/**
 * Shared LZW core.
 * earlyChange follows the TIFF convention (increase the code width one code
 * earlier than GIF does). Bit order differs between the two containers.
 */
export function lzwEncode(
  data: Uint8Array,
  minCodeSize: number,
  earlyChange: boolean,
  lsbFirst: boolean,
): Uint8Array {
  const clearCode = 1 << minCodeSize;
  const endCode = clearCode + 1;
  const writer: BitWriter = { bytes: [], current: 0, bits: 0 };
  let codeSize = minCodeSize + 1;
  let nextCode = clearCode + 2;
  let table = new Map<number, number>();

  writeBits(writer, clearCode, codeSize, lsbFirst);
  if (!data.length) {
    writeBits(writer, endCode, codeSize, lsbFirst);
    flushBits(writer, lsbFirst);
    return Uint8Array.from(writer.bytes);
  }

  let prefix = data[0];
  for (let index = 1; index < data.length; index += 1) {
    const next = data[index];
    const key = (prefix << 8) | next;
    const found = table.get(key);
    if (found !== undefined) {
      prefix = found;
      continue;
    }
    writeBits(writer, prefix, codeSize, lsbFirst);
    table.set(key, nextCode);
    nextCode += 1;
    if (nextCode === (earlyChange ? (1 << codeSize) - 1 : 1 << codeSize)) {
      if (codeSize < 12) codeSize += 1;
    }
    if (nextCode >= 4095) {
      writeBits(writer, clearCode, codeSize, lsbFirst);
      table = new Map();
      codeSize = minCodeSize + 1;
      nextCode = clearCode + 2;
    }
    prefix = next;
  }
  writeBits(writer, prefix, codeSize, lsbFirst);
  writeBits(writer, endCode, codeSize, lsbFirst);
  flushBits(writer, lsbFirst);
  return Uint8Array.from(writer.bytes);
}

export type GifOptions = {
  /** Keep alpha by reserving a transparent palette entry. */
  transparent?: boolean;
  /** 2–256. */
  maxColors?: number;
  /** Loop count for future animated output; 0 = play once. */
  loop?: number;
};

/**
 * Single-frame GIF89a with a global colour table built by median cut.
 * Animated inputs are not re-animated: the caller passes one frame.
 */
export function encodeGif(
  image: RgbaImage,
  options: GifOptions = {},
): Uint8Array {
  const transparent = options.transparent ?? true;
  const wantsAlpha = transparent && hasTransparency(image);
  const maxColors = Math.min(
    wantsAlpha ? 255 : 256,
    Math.max(2, options.maxColors ?? 256),
  );
  const palette = medianCutPalette(image, maxColors);
  if (wantsAlpha) palette.push([0, 0, 0]);
  const transparentIndex = wantsAlpha ? palette.length - 1 : -1;
  while (palette.length < 2) palette.push([0, 0, 0]);

  const lookup = new Map<number, number>();
  const indices = new Uint8Array(image.width * image.height);
  const { data } = image;
  for (let pixel = 0; pixel < indices.length; pixel += 1) {
    const offset = pixel * 4;
    const alpha = data[offset + 3];
    if (wantsAlpha && alpha < 128) {
      indices[pixel] = transparentIndex;
      continue;
    }
    const key = packRgb(data[offset], data[offset + 1], data[offset + 2]);
    let index = lookup.get(key);
    if (index === undefined) {
      index = nearestColor(
        palette,
        data[offset],
        data[offset + 1],
        data[offset + 2],
      );
      lookup.set(key, index);
    }
    indices[pixel] = index;
  }

  const tableSize = Math.max(2, 1 << Math.ceil(Math.log2(palette.length)));
  const tableBits = Math.log2(tableSize);
  const minCodeSize = Math.max(2, tableBits);
  const lzw = lzwEncode(indices, minCodeSize, false, true);

  const bytes: number[] = [];
  const push = (...values: number[]) => bytes.push(...values);
  const pushU16 = (value: number) => push(value & 255, (value >> 8) & 255);

  push(0x47, 0x49, 0x46, 0x38, 0x39, 0x61); // GIF89a
  pushU16(image.width);
  pushU16(image.height);
  push(0x80 | ((tableBits - 1) & 0x07), 0, 0);
  for (let index = 0; index < tableSize; index += 1) {
    const [r, g, b] = palette[index] ?? [0, 0, 0];
    push(r, g, b);
  }
  if (transparentIndex >= 0) {
    push(0x21, 0xf9, 0x04, 0x01);
    pushU16(0);
    push(transparentIndex, 0x00);
  }
  push(0x2c);
  pushU16(0);
  pushU16(0);
  pushU16(image.width);
  pushU16(image.height);
  push(0);
  push(minCodeSize);
  for (let offset = 0; offset < lzw.length; offset += 255) {
    const chunk = lzw.subarray(offset, offset + 255);
    push(chunk.length, ...chunk);
  }
  push(0x00, 0x3b);
  return Uint8Array.from(bytes);
}

/* --------------------------------- TIFF ---------------------------------- */

type TiffEntry = {
  tag: number;
  type: number;
  count: number;
  valueOffset: number;
};

const TIFF_TYPE_SIZE: Record<number, number> = {
  1: 1, // BYTE
  2: 1, // ASCII
  3: 2, // SHORT
  4: 4, // LONG
  5: 8, // RATIONAL
};

/**
 * Baseline TIFF writer: 8-bit RGB, or RGBA with unassociated alpha.
 * `compression: "lzw"` produces a valid TIFF LZW stream; "none" is uncompressed.
 */
export function encodeTiff(
  image: RgbaImage,
  options: {
    compression?: "lzw" | "none";
    dpi?: number;
    software?: string;
  } = {},
): Uint8Array {
  const compression = options.compression ?? "lzw";
  const dpi = Math.round(options.dpi ?? 72);
  const software = options.software ?? "QUICKKIT Image Converter";
  const alpha = hasTransparency(image);
  const samples = alpha ? 4 : 3;
  const raw = new Uint8Array(image.width * image.height * samples);
  const { data } = image;
  for (let pixel = 0; pixel < image.width * image.height; pixel += 1) {
    const source = pixel * 4;
    const target = pixel * samples;
    raw[target] = data[source];
    raw[target + 1] = data[source + 1];
    raw[target + 2] = data[source + 2];
    if (alpha) raw[target + 3] = data[source + 3];
  }
  const strip = compression === "lzw" ? lzwEncode(raw, 8, true, false) : raw;

  const entries: TiffEntry[] = [];
  const ifdEntries = 12;
  const ifdStart = 8;
  const externalStart = ifdStart + 2 + ifdEntries * 12 + 4;

  const bitsPerSample = new Uint8Array(samples * 2);
  const bitsView = new DataView(bitsPerSample.buffer);
  for (let index = 0; index < samples; index += 1)
    bitsView.setUint16(index * 2, 8, true);

  const softwareBytes = new TextEncoder().encode(`${software}\0`);
  const xRes = new Uint8Array(8);
  new DataView(xRes.buffer).setUint32(0, dpi, true);
  new DataView(xRes.buffer).setUint32(4, 1, true);
  const yRes = new Uint8Array(8);
  new DataView(yRes.buffer).setUint32(0, dpi, true);
  new DataView(yRes.buffer).setUint32(4, 1, true);

  let cursor = externalStart;
  const bitsOffset = cursor;
  cursor += bitsPerSample.length;
  if (cursor % 2) cursor += 1;
  const xResOffset = cursor;
  cursor += 8;
  const yResOffset = cursor;
  cursor += 8;
  const softwareOffset = cursor;
  cursor += softwareBytes.length;
  if (cursor % 2) cursor += 1;
  const stripOffset = cursor;
  cursor += strip.length;

  const push = (tag: number, type: number, count: number, value: number) => {
    entries.push({ tag, type, count, valueOffset: value });
  };
  push(256, 4, 1, image.width);
  push(257, 4, 1, image.height);
  push(258, 3, samples, bitsOffset);
  push(259, 3, 1, compression === "lzw" ? 5 : 1);
  push(262, 3, 1, 2); // RGB
  push(273, 4, 1, stripOffset);
  push(277, 3, 1, samples);
  push(278, 4, 1, image.height);
  push(279, 4, 1, strip.length);
  push(282, 5, 1, xResOffset);
  push(283, 5, 1, yResOffset);
  push(284, 3, 1, 1);
  push(296, 3, 1, 2);
  push(305, 2, softwareBytes.length, softwareOffset);
  if (alpha) {
    push(338, 3, 1, 2); // unassociated alpha
  }
  entries.sort((a, b) => a.tag - b.tag);

  const bytes = new Uint8Array(cursor);
  const view = new DataView(bytes.buffer);
  bytes[0] = 0x49;
  bytes[1] = 0x49;
  view.setUint16(2, 42, true);
  view.setUint32(4, ifdStart, true);
  view.setUint16(ifdStart, entries.length, true);
  entries.forEach((entry, index) => {
    const offset = ifdStart + 2 + index * 12;
    view.setUint16(offset, entry.tag, true);
    view.setUint16(offset + 2, entry.type, true);
    view.setUint32(offset + 4, entry.count, true);
    const size = (TIFF_TYPE_SIZE[entry.type] ?? 1) * entry.count;
    if (size <= 4) {
      if (entry.type === 3 && entry.count === 1)
        view.setUint16(offset + 8, entry.valueOffset, true);
      else view.setUint32(offset + 8, entry.valueOffset, true);
    } else {
      view.setUint32(offset + 8, entry.valueOffset, true);
    }
  });
  view.setUint32(ifdStart + 2 + entries.length * 12, 0, true);
  bytes.set(bitsPerSample, bitsOffset);
  bytes.set(xRes, xResOffset);
  bytes.set(yRes, yResOffset);
  bytes.set(softwareBytes, softwareOffset);
  bytes.set(strip, stripOffset);
  return bytes;
}

function readTiffValue(
  view: DataView,
  entry: TiffEntry,
  index: number,
  little: boolean,
): number {
  const size = TIFF_TYPE_SIZE[entry.type] ?? 1;
  const inline = size * entry.count <= 4;
  const base = inline
    ? entry.valueOffset + index * size
    : entry.valueOffset + index * size;
  if (entry.type === 3) return view.getUint16(base, little);
  if (entry.type === 4) return view.getUint32(base, little) >>> 0;
  return view.getUint8(base);
}

function readRational(view: DataView, offset: number, little: boolean) {
  const numerator = view.getUint32(offset, little);
  const denominator = view.getUint32(offset + 4, little);
  return { numerator, denominator };
}

function lzwDecodeTiff(
  input: Uint8Array,
  expected: number,
  earlyChange: boolean,
): Uint8Array {
  const output = new Uint8Array(expected);
  let outIndex = 0;
  let bitBuffer = 0;
  let bitCount = 0;
  let byteIndex = 0;
  const clearCode = 256;
  const endCode = 257;
  let codeSize = 9;
  let table: Uint8Array[] = [];
  const reset = () => {
    table = [];
    for (let index = 0; index < 256; index += 1)
      table.push(Uint8Array.of(index));
    table.push(new Uint8Array(0), new Uint8Array(0)); // clear + end placeholders
    codeSize = 9;
  };
  reset();
  const nextCode = () => clearCode + 2 + (table.length - 258);
  let previous: Uint8Array | null = null;

  const readCode = (): number => {
    while (bitCount < codeSize) {
      if (byteIndex >= input.length) return endCode;
      bitBuffer = (bitBuffer << 8) | input[byteIndex];
      byteIndex += 1;
      bitCount += 8;
    }
    const code = (bitBuffer >> (bitCount - codeSize)) & ((1 << codeSize) - 1);
    bitCount -= codeSize;
    return code;
  };

  while (outIndex < expected) {
    const code = readCode();
    if (code === clearCode) {
      reset();
      previous = null;
      continue;
    }
    if (code === endCode) break;
    let entry: Uint8Array;
    if (code < table.length) {
      entry = table[code];
    } else if (previous) {
      entry = new Uint8Array(previous.length + 1);
      entry.set(previous);
      entry[previous.length] = previous[0];
    } else break;
    output.set(
      entry.subarray(0, Math.min(entry.length, expected - outIndex)),
      outIndex,
    );
    outIndex += Math.min(entry.length, expected - outIndex);
    if (previous) {
      const added = new Uint8Array(previous.length + 1);
      added.set(previous);
      added[previous.length] = entry[0];
      table.push(added);
      if (
        table.length === (earlyChange ? (1 << codeSize) - 1 : 1 << codeSize) &&
        codeSize < 12
      )
        codeSize += 1;
    }
    previous = entry;
  }
  return output.subarray(0, Math.max(0, outIndex));
}

function decodePackBits(input: Uint8Array, expected: number): Uint8Array {
  const output = new Uint8Array(expected);
  let source = 0;
  let target = 0;
  while (source < input.length && target < expected) {
    const header = (input[source] << 24) >> 24; // signed
    source += 1;
    if (header >= 0) {
      const count = header + 1;
      for (let index = 0; index < count && target < expected; index += 1)
        output[target++] = input[source++] ?? 0;
    } else if (header !== -128) {
      const count = 1 - header;
      const value = input[source++] ?? 0;
      for (let index = 0; index < count && target < expected; index += 1)
        output[target++] = value;
    }
  }
  return output;
}

/**
 * Baseline TIFF reader: strips, 8-bit data, RGB / RGBA / grayscale / palette,
 * none / LZW / PackBits compression, orientation 1 and horizontal predictor.
 * Tiled and 16-bit files are rejected with an explicit message instead of
 * producing wrong pixels.
 */
export function decodeTiff(bytes: Uint8Array): RgbaImage {
  if (bytes.length < 8) throw new Error("This TIFF file is too short to read.");
  const little =
    bytes[0] === 0x49 && bytes[1] === 0x49
      ? true
      : bytes[0] === 0x4d && bytes[1] === 0x4d
        ? false
        : null;
  if (little === null)
    throw new Error("This file is not a TIFF image (bad header).");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint16(2, little) !== 42)
    throw new Error("This TIFF file is damaged: wrong signature.");
  const ifdOffset = view.getUint32(4, little);
  if (ifdOffset + 2 > bytes.length)
    throw new Error("This TIFF file is damaged: no image directory.");
  const count = view.getUint16(ifdOffset, little);
  const entries = new Map<number, TiffEntry>();
  for (let index = 0; index < count; index += 1) {
    const offset = ifdOffset + 2 + index * 12;
    if (offset + 12 > bytes.length) break;
    const tag = view.getUint16(offset, little);
    const type = view.getUint16(offset + 2, little);
    const entryCount = view.getUint32(offset + 4, little);
    const size = (TIFF_TYPE_SIZE[type] ?? 1) * entryCount;
    const valueOffset =
      size <= 4 ? offset + 8 : view.getUint32(offset + 8, little);
    entries.set(tag, { tag, type, count: entryCount, valueOffset });
  }

  const value = (tag: number, fallback: number) => {
    const entry = entries.get(tag);
    if (!entry) return fallback;
    return readTiffValue(view, entry, 0, little);
  };
  const values = (tag: number): number[] => {
    const entry = entries.get(tag);
    if (!entry) return [];
    return Array.from({ length: entry.count }, (_, index) =>
      readTiffValue(view, entry, index, little),
    );
  };

  if (entries.has(322) || entries.has(323))
    throw new Error(
      "Tiled TIFFs are not supported. Re-save as a stripped TIFF or PNG.",
    );
  const width = value(256, 0);
  const height = value(257, 0);
  if (!width || !height) throw new Error("This TIFF has no pixel dimensions.");
  const bitsPerSample = values(258);
  if (!bitsPerSample.length) bitsPerSample.push(1);
  if (bitsPerSample.some((bits) => bits !== 8))
    throw new Error(
      "Only 8-bit per channel TIFF files are supported. Convert 16-bit or 1-bit TIFFs to PNG first.",
    );
  const compression = value(259, 1);
  const photometric = value(262, 2);
  const samplesPerPixel = value(277, 1);
  const planar = value(284, 1);
  if (planar !== 1)
    throw new Error("Planar (separated) TIFFs are not supported.");
  const predictor = value(317, 1);
  const colorMap = values(320);
  const stripOffsets = values(273);
  const stripCounts = values(279);
  if (!stripOffsets.length) throw new Error("This TIFF has no image strips.");
  if (!stripCounts.length) stripCounts.push(bytes.length - stripOffsets[0]);

  const channels =
    photometric === 2 ? samplesPerPixel : photometric === 3 ? 1 : 1;
  const bytesPerRow = width * channels;
  const expected = bytesPerRow * height;
  const raw = new Uint8Array(expected);

  let written = 0;
  for (let strip = 0; strip < stripOffsets.length; strip += 1) {
    const start = stripOffsets[strip];
    const length = stripCounts[strip] ?? 0;
    if (start + length > bytes.length)
      throw new Error("This TIFF file is truncated.");
    const chunk = bytes.subarray(start, start + length);
    let decoded: Uint8Array;
    if (compression === 1) decoded = chunk;
    else if (compression === 5 || compression === 32773) {
      const remaining = expected - written;
      decoded =
        compression === 5
          ? lzwDecodeTiff(chunk, remaining, true)
          : decodePackBits(chunk, remaining);
    } else
      throw new Error(
        `This TIFF uses compression ${compression}, which is not supported (JPEG and deflate TIFFs must be re-saved).`,
      );
    raw.set(
      decoded.subarray(0, Math.min(decoded.length, expected - written)),
      written,
    );
    written += Math.min(decoded.length, expected - written);
  }

  // Undo horizontal differencing, row by row and channel by channel.
  if (predictor === 2) {
    for (let row = 0; row < height; row += 1) {
      const rowStart = row * bytesPerRow;
      for (let x = channels; x < bytesPerRow; x += 1)
        raw[rowStart + x] =
          (raw[rowStart + x] + raw[rowStart + x - channels]) & 255;
    }
  } else if (predictor !== 1 && predictor !== 0 && predictor !== 2) {
    throw new Error(`TIFF predictor ${predictor} is not supported.`);
  }

  const output = createRgba(width, height);
  const out = output.data;
  if (photometric === 2) {
    for (let pixel = 0; pixel < width * height; pixel += 1) {
      const source = pixel * samplesPerPixel;
      const target = pixel * 4;
      out[target] = raw[source];
      out[target + 1] = raw[source + 1];
      out[target + 2] = raw[source + 2];
      out[target + 3] = samplesPerPixel >= 4 ? raw[source + 3] : 255;
    }
  } else if (photometric === 3 && colorMap.length >= 3) {
    const paletteSize = colorMap.length / 3;
    for (let pixel = 0; pixel < width * height; pixel += 1) {
      const index = raw[pixel];
      const target = pixel * 4;
      out[target] = colorMap[index] >> 8;
      out[target + 1] = colorMap[paletteSize + index] >> 8;
      out[target + 2] = colorMap[paletteSize * 2 + index] >> 8;
      out[target + 3] = 255;
    }
  } else if (photometric === 0 || photometric === 1) {
    const invert = photometric === 0;
    for (let pixel = 0; pixel < width * height; pixel += 1) {
      const gray = invert ? 255 - raw[pixel] : raw[pixel];
      const target = pixel * 4;
      out[target] = gray;
      out[target + 1] = gray;
      out[target + 2] = gray;
      out[target + 3] = 255;
    }
  } else {
    throw new Error(
      `TIFF photometric interpretation ${photometric} is not supported.`,
    );
  }
  return output;
}

/** Reads the pixel size without decoding the image. */
export function inspectTiff(bytes: Uint8Array): {
  width: number;
  height: number;
} {
  if (bytes.length < 8) throw new Error("This TIFF file is too short to read.");
  const little =
    bytes[0] === 0x49 && bytes[1] === 0x49
      ? true
      : bytes[0] === 0x4d && bytes[1] === 0x4d
        ? false
        : null;
  if (little === null) throw new Error("This file is not a TIFF image.");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint16(2, little) !== 42)
    throw new Error("This TIFF file is damaged.");
  const ifdOffset = view.getUint32(4, little);
  const count = view.getUint16(ifdOffset, little);
  let width = 0;
  let height = 0;
  for (let index = 0; index < count; index += 1) {
    const offset = ifdOffset + 2 + index * 12;
    if (offset + 12 > bytes.length) break;
    const tag = view.getUint16(offset, little);
    const type = view.getUint16(offset + 2, little);
    const entryCount = view.getUint32(offset + 4, little);
    const size = (TIFF_TYPE_SIZE[type] ?? 1) * entryCount;
    const valueOffset =
      size <= 4 ? offset + 8 : view.getUint32(offset + 8, little);
    const entry: TiffEntry = { tag, type, count: entryCount, valueOffset };
    if (tag === 256) width = readTiffValue(view, entry, 0, little);
    if (tag === 257) height = readTiffValue(view, entry, 0, little);
  }
  if (!width || !height) throw new Error("This TIFF has no pixel dimensions.");
  return { width, height };
}

/** TIFF resolution tag (dpi) when present, else null. */
export function tiffDpi(bytes: Uint8Array): number | null {
  try {
    const little = bytes[0] === 0x49;
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const ifdOffset = view.getUint32(4, little);
    const count = view.getUint16(ifdOffset, little);
    for (let index = 0; index < count; index += 1) {
      const offset = ifdOffset + 2 + index * 12;
      const tag = view.getUint16(offset, little);
      if (tag !== 282) continue;
      const type = view.getUint16(offset + 2, little);
      if (type !== 5) return null;
      const valueOffset = view.getUint32(offset + 8, little);
      const { numerator, denominator } = readRational(
        view,
        valueOffset,
        little,
      );
      if (!denominator) return null;
      return Math.round(numerator / denominator);
    }
    return null;
  } catch {
    return null;
  }
}
