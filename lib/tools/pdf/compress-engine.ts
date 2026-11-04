import {
  PDFArray,
  PDFBool,
  PDFDict,
  PDFDocument,
  PDFName,
  PDFNumber,
  PDFRawStream,
  PDFRef,
  PDFStream,
  type PDFObject,
} from "@cantoo/pdf-lib";

import {
  PDF_COMPRESS_LIMITS,
  buildCompressionAttempts,
  compressionBlocker,
  compressionFeatureWarnings,
  normalizeCompressionSettings,
  type PdfCompressionAnalysis,
  type PdfCompressionAttempt,
  type PdfCompressionProgress,
  type PdfCompressionSettings,
  type PdfCompressionStats,
} from "./compress-pdf-logic";
import { inspectPdfFeatures } from "./merge-engine";
import {
  PdfMergeError,
  formatMiB,
  isPdfSignature,
  type PdfInspection,
  type PdfInspectionFeatures,
} from "./merge-pdf-logic";

const LOAD_OPTIONS = {
  capNumbers: true,
  preserveXFA: true,
  updateMetadata: false,
} as const;

export interface PdfCompressionInspectionResult {
  analysis: PdfCompressionAnalysis;
  inspection: PdfInspection;
}

export interface PdfImageCodecResult {
  bytes: Uint8Array;
  height: number;
  width: number;
}

export interface PdfGraySamplesResult {
  height: number;
  samples: Uint8Array;
  width: number;
}

export interface PdfImageCodec {
  resizeEncodedToGraySamples: (
    bytes: Uint8Array,
    mimeType: string,
    targetWidth: number,
    targetHeight: number,
  ) => Promise<PdfGraySamplesResult>;
  resizeEncodedToJpeg: (
    bytes: Uint8Array,
    mimeType: string,
    targetWidth: number,
    targetHeight: number,
    quality: number,
    grayscale: boolean,
  ) => Promise<PdfImageCodecResult>;
  resizeSamplesToGraySamples: (
    samples: Uint8Array,
    width: number,
    height: number,
    targetWidth: number,
    targetHeight: number,
  ) => Promise<PdfGraySamplesResult>;
  resizeSamplesToJpeg: (
    samples: Uint8Array,
    width: number,
    height: number,
    channels: 1 | 3,
    targetWidth: number,
    targetHeight: number,
    quality: number,
    grayscale: boolean,
  ) => Promise<PdfImageCodecResult>;
}

export interface PdfCompressionOptions {
  entryId?: string;
  imageCodec?: PdfImageCodec | null;
  now?: Date;
  onProgress?: (progress: PdfCompressionProgress) => void;
  password?: string;
  yieldControl?: () => Promise<void>;
}

export interface PdfCompressionResult {
  analysis: PdfCompressionAnalysis;
  bytes: Uint8Array;
  inspection: PdfInspection;
  notices: string[];
  originalBytes: number;
  outputBytes: number;
  pageCount: number;
  settingsUsed: PdfCompressionSettings;
  stats: PdfCompressionStats;
}

interface LoadedPdf {
  doc: PDFDocument;
  encrypted: boolean;
}

interface PageGeometry {
  height: number;
  rotation: number;
  width: number;
}

interface DecodeParmsInfo {
  bitsPerComponent?: number;
  colors?: number;
  columns?: number;
  dict?: PDFDict;
  isArray: boolean;
  predictor: number;
  present: boolean;
}

interface ImageMaskCandidate {
  encodedBytes: number;
  filter: string;
  height: number;
  ref?: PDFRef;
  stream: PDFRawStream;
  width: number;
}

interface ImageCandidate {
  channels?: 1 | 3;
  encodedBytes: number;
  filter: string;
  height: number;
  ref: PDFRef;
  skipReason?: string;
  smask?: ImageMaskCandidate;
  stream: PDFRawStream;
  supported: boolean;
  width: number;
}

interface CandidateBuild {
  analysis: PdfCompressionAnalysis;
  bytes: Uint8Array;
  canImproveWithImages: boolean;
  inspection: PdfInspection;
  notices: string[];
  settings: PdfCompressionAttempt;
  stats: PdfCompressionStats;
}

function corruptError(entryId?: string): PdfMergeError {
  return new PdfMergeError(
    "corrupt_or_unsupported",
    "This file could not be read as a PDF. It may be corrupted, incomplete, or use an unsupported PDF structure. Open it in a PDF reader, export or print it to a new PDF, then try again.",
    entryId,
  );
}

function classifyPasswordFailure(
  error: unknown,
  entryId?: string,
  passwordWasExplicit = true,
): PdfMergeError {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (!passwordWasExplicit || message.includes("needs password")) {
    return new PdfMergeError(
      "password_required",
      "This PDF is password-protected. Enter its open password to inspect and compress it. The password stays on this device.",
      entryId,
    );
  }
  if (
    message.includes("password incorrect") ||
    message.includes("incorrect password") ||
    message.includes("invalid password")
  ) {
    return new PdfMergeError(
      "password_invalid",
      "That password did not open this PDF. Check capitalization and try again; the password is not stored.",
      entryId,
    );
  }
  return new PdfMergeError(
    "encrypted_unsupported",
    "This PDF’s encryption could not be opened locally. Remove the password in a PDF editor or export an unencrypted copy, then try again.",
    entryId,
  );
}

function assertSourceBytes(bytes: Uint8Array, entryId?: string): void {
  if (bytes.byteLength === 0) {
    throw new PdfMergeError(
      "invalid_pdf",
      "This PDF is empty. Choose a complete PDF exported from your document app.",
      entryId,
    );
  }
  if (bytes.byteLength > PDF_COMPRESS_LIMITS.maxFileBytes) {
    throw new PdfMergeError(
      "file_too_large",
      `This PDF is ${formatMiB(bytes.byteLength)}, above the ${formatMiB(PDF_COMPRESS_LIMITS.maxFileBytes)} per-file local-processing limit. Split it into smaller PDFs, then compress each part.`,
      entryId,
    );
  }
  if (!isPdfSignature(bytes)) {
    throw new PdfMergeError(
      "invalid_pdf",
      "This file does not start with PDF data. It may be renamed, incomplete, or corrupted. Export it as a PDF again and retry.",
      entryId,
    );
  }
}

async function loadPdf(
  bytes: Uint8Array,
  password?: string,
  entryId?: string,
): Promise<LoadedPdf> {
  assertSourceBytes(bytes, entryId);

  let probe: PDFDocument;
  try {
    probe = await PDFDocument.load(bytes, {
      ...LOAD_OPTIONS,
      ignoreEncryption: true,
    });
  } catch {
    throw corruptError(entryId);
  }

  if (!probe.isEncrypted) return { doc: probe, encrypted: false };

  const explicitPassword = password !== undefined;
  try {
    const doc = await PDFDocument.load(bytes, {
      ...LOAD_OPTIONS,
      ignoreEncryption: false,
      password: password ?? "",
    });
    return { doc, encrypted: true };
  } catch (error) {
    throw classifyPasswordFailure(error, entryId, explicitPassword);
  }
}

function pageGeometries(doc: PDFDocument, entryId?: string): PageGeometry[] {
  try {
    const pages = doc.getPages();
    if (pages.length < 1) throw new Error("No pages");
    return pages.map((page) => {
      const size = page.getSize();
      if (
        !Number.isFinite(size.width) ||
        !Number.isFinite(size.height) ||
        size.width <= 0 ||
        size.height <= 0
      ) {
        throw new Error("Invalid page geometry");
      }
      return { ...size, rotation: page.getRotation().angle };
    });
  } catch (error) {
    if (error instanceof PdfMergeError) throw error;
    throw corruptError(entryId);
  }
}

function inspectionFromDoc(
  doc: PDFDocument,
  encrypted: boolean,
  entryId?: string,
): { geometries: PageGeometry[]; inspection: PdfInspection } {
  const geometries = pageGeometries(doc, entryId);
  if (geometries.length > PDF_COMPRESS_LIMITS.maxPagesPerFile) {
    throw new PdfMergeError(
      "too_many_pages",
      `This PDF has ${geometries.length.toLocaleString()} pages, above the ${PDF_COMPRESS_LIMITS.maxPagesPerFile.toLocaleString()}-page per-file limit. Split it into smaller PDFs, then compress each part.`,
      entryId,
    );
  }
  const features = inspectPdfFeatures(doc);
  let title: string | undefined;
  try {
    title = doc.getTitle()?.trim() || undefined;
  } catch {
    title = undefined;
  }
  return {
    geometries,
    inspection: {
      encrypted,
      features,
      firstPage: geometries[0],
      pageCount: geometries.length,
      title,
      warnings: compressionFeatureWarnings(features),
    },
  };
}

function lookup(
  doc: PDFDocument,
  value: PDFObject | undefined,
): PDFObject | undefined {
  return value ? doc.context.lookup(value) : undefined;
}

function dictValue(dict: PDFDict, key: string): PDFObject | undefined {
  try {
    return dict.get(PDFName.of(key));
  } catch {
    return undefined;
  }
}

function nameText(
  doc: PDFDocument,
  value: PDFObject | undefined,
): string | undefined {
  const resolved = lookup(doc, value);
  return resolved instanceof PDFName ? resolved.decodeText() : undefined;
}

function dictName(
  doc: PDFDocument,
  dict: PDFDict,
  key: string,
): string | undefined {
  return nameText(doc, dictValue(dict, key));
}

function numberValue(
  doc: PDFDocument,
  dict: PDFDict,
  key: string,
): number | undefined {
  const resolved = lookup(doc, dictValue(dict, key));
  return resolved instanceof PDFNumber ? resolved.asNumber() : undefined;
}

function boolValue(
  doc: PDFDocument,
  dict: PDFDict,
  key: string,
): boolean | undefined {
  const resolved = lookup(doc, dictValue(dict, key));
  return resolved instanceof PDFBool ? resolved.asBoolean() : undefined;
}

function filterNames(doc: PDFDocument, dict: PDFDict): string[] {
  const resolved = lookup(doc, dictValue(dict, "Filter"));
  if (resolved instanceof PDFName) return [resolved.decodeText()];
  if (resolved instanceof PDFArray) {
    const names: string[] = [];
    for (let index = 0; index < resolved.size(); index += 1) {
      const name = nameText(doc, resolved.get(index));
      if (name) names.push(name);
    }
    return names;
  }
  return [];
}

function refForValue(
  doc: PDFDocument,
  value: PDFObject | undefined,
): PDFRef | undefined {
  if (value instanceof PDFRef) return value;
  const resolved = lookup(doc, value);
  return resolved ? doc.context.getObjectRef(resolved) : undefined;
}

function refKey(ref: PDFRef | undefined): string {
  return ref ? ref.toString() : "";
}

function streamSize(stream: PDFStream): number {
  try {
    const size = stream.getContentsSize();
    return Number.isFinite(size) && size > 0 ? size : 0;
  } catch {
    return 0;
  }
}

function decodeParmsInfo(doc: PDFDocument, dict: PDFDict): DecodeParmsInfo {
  const raw = dictValue(dict, "DecodeParms") ?? dictValue(dict, "DP");
  const resolved = lookup(doc, raw);
  if (!resolved) return { isArray: false, predictor: 1, present: false };
  if (resolved instanceof PDFArray) {
    return { isArray: true, predictor: 1, present: true };
  }
  if (!(resolved instanceof PDFDict)) {
    return { isArray: false, predictor: 1, present: true };
  }
  return {
    bitsPerComponent: numberValue(doc, resolved, "BitsPerComponent"),
    colors: numberValue(doc, resolved, "Colors"),
    columns: numberValue(doc, resolved, "Columns"),
    dict: resolved,
    isArray: false,
    predictor: numberValue(doc, resolved, "Predictor") ?? 1,
    present: true,
  };
}

function colorSpaceInfo(
  doc: PDFDocument,
  dict: PDFDict,
): { channels?: 1 | 3; name?: string } {
  const resolved = lookup(doc, dictValue(dict, "ColorSpace"));
  if (resolved instanceof PDFName) {
    const name = resolved.decodeText();
    if (name === "DeviceRGB" || name === "CalRGB") return { channels: 3, name };
    if (name === "DeviceGray" || name === "CalGray")
      return { channels: 1, name };
    return { name };
  }
  if (resolved instanceof PDFArray && resolved.size() > 0) {
    const name = nameText(doc, resolved.get(0));
    if (name === "ICCBased" && resolved.size() > 1) {
      const profile = lookup(doc, resolved.get(1));
      if (profile instanceof PDFStream) {
        const components = numberValue(doc, profile.dict, "N");
        return {
          channels: components === 1 ? 1 : components === 3 ? 3 : undefined,
          name,
        };
      }
    }
    if (name === "CalRGB") return { channels: 3, name };
    if (name === "CalGray") return { channels: 1, name };
    return { name };
  }
  return {};
}

function collectImages(doc: PDFDocument): {
  analysis: PdfCompressionAnalysis;
  candidates: ImageCandidate[];
} {
  const objects = doc.context.enumerateIndirectObjects();
  const imageObjects: { ref: PDFRef; stream: PDFStream }[] = [];
  let streamCount = 0;
  let streamBytes = 0;
  let uncompressedStreamBytes = 0;

  for (const [ref, object] of objects) {
    if (!(object instanceof PDFStream)) continue;
    streamCount += 1;
    const size = streamSize(object);
    streamBytes += size;
    if (filterNames(doc, object.dict).length === 0) {
      uncompressedStreamBytes += size;
    }
    if (dictName(doc, object.dict, "Subtype") === "Image") {
      imageObjects.push({ ref, stream: object });
    }
  }

  const maskRefs = new Set<string>();
  const smaskUseCounts = new Map<string, number>();
  for (const { stream } of imageObjects) {
    const smaskRef = refForValue(doc, dictValue(stream.dict, "SMask"));
    if (smaskRef) {
      maskRefs.add(refKey(smaskRef));
      smaskUseCounts.set(
        refKey(smaskRef),
        (smaskUseCounts.get(refKey(smaskRef)) ?? 0) + 1,
      );
    }
    const maskRef = refForValue(doc, dictValue(stream.dict, "Mask"));
    if (maskRef) maskRefs.add(refKey(maskRef));
  }

  const candidates: ImageCandidate[] = [];
  let imageBytes = 0;
  let largestImageDimension = 0;

  for (const { ref, stream } of imageObjects) {
    const dict = stream.dict;
    const width = numberValue(doc, dict, "Width") ?? 0;
    const height = numberValue(doc, dict, "Height") ?? 0;
    const encodedBytes = streamSize(stream);
    const filters = filterNames(doc, dict);
    const filter = filters.join("+") || "none";
    const isMaskStream = maskRefs.has(refKey(ref));

    imageBytes += encodedBytes;
    largestImageDimension = Math.max(largestImageDimension, width, height);
    if (isMaskStream) continue;

    let skipReason: string | undefined;
    const color = colorSpaceInfo(doc, dict);
    const bitsPerComponent = numberValue(doc, dict, "BitsPerComponent") ?? 8;
    const parms = decodeParmsInfo(doc, dict);
    const maskValue = lookup(doc, dictValue(dict, "Mask"));
    const smaskObject = lookup(doc, dictValue(dict, "SMask"));
    let smask: ImageMaskCandidate | undefined;

    if (!(stream instanceof PDFRawStream)) {
      skipReason = "unsupported stream";
    } else if (
      !Number.isInteger(width) ||
      !Number.isInteger(height) ||
      width < 1 ||
      height < 1 ||
      width > PDF_COMPRESS_LIMITS.maxImageDimension ||
      height > PDF_COMPRESS_LIMITS.maxImageDimension ||
      width * height > PDF_COMPRESS_LIMITS.maxImagePixels
    ) {
      skipReason = "image dimensions outside the local safety limit";
    } else if (boolValue(doc, dict, "ImageMask") === true) {
      skipReason = "image mask";
    } else if (bitsPerComponent !== 8) {
      skipReason = "unsupported bit depth";
    } else if (dictValue(dict, "Decode")) {
      skipReason = "custom decode mapping";
    } else if (dictValue(dict, "Alternates") || dictValue(dict, "OPI")) {
      skipReason = "alternate/OPI image data";
    } else if (maskValue instanceof PDFArray) {
      skipReason = "color-key transparency";
    } else if (maskValue instanceof PDFStream || dictValue(dict, "Mask")) {
      skipReason = "stencil transparency";
    } else if (
      filters.length > 1 ||
      (filters.length === 1 &&
        !["DCTDecode", "FlateDecode"].includes(filters[0]))
    ) {
      skipReason = "unsupported image filter";
    } else if (filter === "DCTDecode") {
      const supportedIccJpeg =
        color.name === "ICCBased" &&
        (color.channels === 1 || color.channels === 3);
      if (
        color.name &&
        !["DeviceRGB", "DeviceGray", "CalRGB", "CalGray"].includes(
          color.name,
        ) &&
        !supportedIccJpeg
      ) {
        skipReason = "unsupported JPEG color space";
      }
    } else if (
      !color.name ||
      !["DeviceRGB", "DeviceGray"].includes(color.name)
    ) {
      skipReason = "unsupported raster color space";
    } else if (
      parms.isArray ||
      ![1, 2, 10, 11, 12, 13, 14, 15].includes(parms.predictor)
    ) {
      skipReason = "unsupported image predictor";
    } else if (encodedBytes < 1024) {
      skipReason = "image is already very small";
    }

    if (!skipReason && smaskObject) {
      const smaskRef = refForValue(doc, dictValue(dict, "SMask"));
      if (!(smaskObject instanceof PDFRawStream)) {
        skipReason = "unsupported transparency mask";
      } else {
        const maskDict = smaskObject.dict;
        const maskWidth = numberValue(doc, maskDict, "Width") ?? 0;
        const maskHeight = numberValue(doc, maskDict, "Height") ?? 0;
        const maskFilters = filterNames(doc, maskDict);
        const maskColor = colorSpaceInfo(doc, maskDict);
        const maskParms = decodeParmsInfo(doc, maskDict);
        if (
          !smaskRef ||
          (smaskUseCounts.get(refKey(smaskRef)) ?? 0) !== 1 ||
          maskWidth !== width ||
          maskHeight !== height ||
          (numberValue(doc, maskDict, "BitsPerComponent") ?? 8) !== 8 ||
          maskColor.name !== "DeviceGray" ||
          dictValue(maskDict, "Matte") ||
          dictValue(maskDict, "SMask") ||
          dictValue(maskDict, "Mask") ||
          maskFilters.length > 1 ||
          (maskFilters.length === 1 &&
            !["DCTDecode", "FlateDecode"].includes(maskFilters[0])) ||
          maskParms.isArray ||
          ![1, 2, 10, 11, 12, 13, 14, 15].includes(maskParms.predictor)
        ) {
          skipReason = "unsupported transparency mask";
        } else {
          smask = {
            encodedBytes: streamSize(smaskObject),
            filter: maskFilters[0] ?? "none",
            height: maskHeight,
            ref: smaskRef,
            stream: smaskObject,
            width: maskWidth,
          };
        }
      }
    }

    candidates.push({
      channels: color.channels ?? (filter === "DCTDecode" ? 3 : undefined),
      encodedBytes,
      filter,
      height,
      ref,
      skipReason,
      smask,
      stream: stream as PDFRawStream,
      supported: !skipReason && stream instanceof PDFRawStream,
      width,
    });
  }

  const supported = candidates.filter((candidate) => candidate.supported);
  return {
    analysis: {
      imageBytes,
      imageCount: imageObjects.length,
      largestImageDimension,
      streamBytes,
      streamCount,
      supportedImageBytes: supported.reduce(
        (total, candidate) => total + candidate.encodedBytes,
        0,
      ),
      supportedImageCount: supported.length,
      uncompressedStreamBytes,
      unsupportedImageCount: candidates.length - supported.length,
    },
    candidates,
  };
}

function paethPredictor(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
}

/**
 * Reverses the post-Flate predictor for 8-bit image samples. PDFLib's raw
 * Flate decoder intentionally leaves this transform in place; treating those
 * bytes as pixels would corrupt scanned/raster images, so the compressor
 * reverses TIFF/PNG predictors explicitly before handing samples to canvas.
 */
export function reversePdfFlatePredictor(
  bytes: Uint8Array,
  width: number,
  height: number,
  channels: 1 | 3,
  predictor: number,
): Uint8Array {
  const rowBytes = width * channels;
  const expected = rowBytes * height;
  if (predictor === 1) {
    if (bytes.byteLength < expected) throw new Error("Short image data");
    return bytes.slice(0, expected);
  }
  if (predictor === 2) {
    if (bytes.byteLength < expected) throw new Error("Short image data");
    const output = bytes.slice(0, expected);
    for (let y = 0; y < height; y += 1) {
      const rowStart = y * rowBytes;
      for (let x = channels; x < rowBytes; x += 1) {
        output[rowStart + x] =
          (output[rowStart + x] + output[rowStart + x - channels]) & 0xff;
      }
    }
    return output;
  }
  if (predictor < 10 || predictor > 15) {
    throw new Error("Unsupported PDF image predictor");
  }

  const hasRowFilterBytes =
    bytes.byteLength >= (rowBytes + 1) * height &&
    (bytes.byteLength < expected + height + rowBytes || predictor === 15);
  const sourceStride = hasRowFilterBytes ? rowBytes + 1 : rowBytes;
  if (bytes.byteLength < sourceStride * height) {
    throw new Error("Short predictor image data");
  }

  const output = new Uint8Array(expected);
  const bytesPerPixel = channels;
  for (let y = 0; y < height; y += 1) {
    const sourceRowStart = y * sourceStride;
    const filter = hasRowFilterBytes ? bytes[sourceRowStart] : predictor - 10;
    const sourceOffset = hasRowFilterBytes
      ? sourceRowStart + 1
      : sourceRowStart;
    const outputOffset = y * rowBytes;
    for (let x = 0; x < rowBytes; x += 1) {
      const raw = bytes[sourceOffset + x];
      const left =
        x >= bytesPerPixel ? output[outputOffset + x - bytesPerPixel] : 0;
      const up = y > 0 ? output[outputOffset - rowBytes + x] : 0;
      const upLeft =
        y > 0 && x >= bytesPerPixel
          ? output[outputOffset - rowBytes + x - bytesPerPixel]
          : 0;
      let value: number;
      switch (filter) {
        case 0:
          value = raw;
          break;
        case 1:
          value = raw + left;
          break;
        case 2:
          value = raw + up;
          break;
        case 3:
          value = raw + Math.floor((left + up) / 2);
          break;
        case 4:
          value = raw + paethPredictor(left, up, upLeft);
          break;
        default:
          throw new Error("Unsupported PNG row predictor");
      }
      output[outputOffset + x] = value & 0xff;
    }
  }
  return output;
}

async function decodedImageSamples(
  stream: PDFRawStream,
  width: number,
  height: number,
  channels: 1 | 3,
  filter: string,
): Promise<Uint8Array> {
  const rowBytes = width * channels;
  const decodedCap = Math.min(
    PDF_COMPRESS_LIMITS.maxDecodedStreamBytes,
    rowBytes * height + height + rowBytes + 1024,
  );
  const decoded =
    filter === ""
      ? stream.contents
      : filter === "FlateDecode"
        ? await inflateFlateBytesCapped(stream.contents, decodedCap)
        : undefined;
  if (!decoded || decoded.byteLength > decodedCap) {
    throw new Error("Decoded image exceeds local safety limit");
  }
  const docLessDict = stream.dict;
  let predictor = 1;
  const parms = docLessDict.lookupMaybe(PDFName.of("DecodeParms"), PDFDict);
  const predictorObject = parms?.lookupMaybe(
    PDFName.of("Predictor"),
    PDFNumber,
  );
  if (predictorObject) predictor = predictorObject.asNumber();
  return reversePdfFlatePredictor(decoded, width, height, channels, predictor);
}

export interface JpegInfo {
  components: number;
  height: number;
  width: number;
}

export function parseJpegInfo(bytes: Uint8Array): JpegInfo | undefined {
  if (bytes.byteLength < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    return undefined;
  }
  let offset = 2;
  while (offset + 3 < bytes.byteLength) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    let marker = bytes[offset + 1];
    while (marker === 0xff && offset + 2 < bytes.byteLength) {
      offset += 1;
      marker = bytes[offset + 1];
    }
    if (marker === 0xd9 || marker === 0xda) break;
    if (marker >= 0xd0 && marker <= 0xd7) {
      offset += 2;
      continue;
    }
    if (offset + 3 >= bytes.byteLength) break;
    const segmentLength = (bytes[offset + 2] << 8) | bytes[offset + 3];
    if (segmentLength < 2) break;
    const isSof =
      marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
    if (isSof && segmentLength >= 8 && offset + 9 < bytes.byteLength) {
      return {
        components: bytes[offset + 9],
        height: (bytes[offset + 5] << 8) | bytes[offset + 6],
        width: (bytes[offset + 7] << 8) | bytes[offset + 8],
      };
    }
    offset += 2 + segmentLength;
  }
  return undefined;
}

function bytesToBlobPart(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
}

async function deflateBytes(
  bytes: Uint8Array,
): Promise<Uint8Array | undefined> {
  if (typeof CompressionStream === "undefined" || typeof Blob === "undefined") {
    return undefined;
  }
  try {
    const stream = new Blob([bytesToBlobPart(bytes)])
      .stream()
      .pipeThrough(new CompressionStream("deflate"));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  } catch {
    return undefined;
  }
}

export async function inflateFlateBytesCapped(
  bytes: Uint8Array,
  maxBytes: number,
): Promise<Uint8Array | undefined> {
  if (
    !Number.isSafeInteger(maxBytes) ||
    maxBytes < 0 ||
    typeof DecompressionStream === "undefined" ||
    typeof Blob === "undefined"
  ) {
    return undefined;
  }

  for (const format of ["deflate", "deflate-raw"] as const) {
    try {
      const stream = new Blob([bytesToBlobPart(bytes)])
        .stream()
        .pipeThrough(new DecompressionStream(format));
      const reader = stream.getReader();
      const chunks: Uint8Array[] = [];
      let total = 0;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = value as Uint8Array;
          total += chunk.byteLength;
          if (total > maxBytes) {
            await reader.cancel();
            return undefined;
          }
          chunks.push(chunk.slice());
        }
      } finally {
        reader.releaseLock();
      }

      const output = new Uint8Array(total);
      let offset = 0;
      for (const chunk of chunks) {
        output.set(chunk, offset);
        offset += chunk.byteLength;
      }
      return output;
    } catch {
      // PDF FlateDecode data is normally zlib (`deflate`). Raw deflate is a
      // bounded compatibility fallback; malformed data simply stays skipped.
      continue;
    }
  }
  return undefined;
}

function imageDataFromSamples(
  samples: Uint8Array,
  width: number,
  height: number,
  channels: 1 | 3,
): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let pixel = 0; pixel < width * height; pixel += 1) {
    const target = pixel * 4;
    if (channels === 1) {
      const value = samples[pixel] ?? 0;
      data[target] = value;
      data[target + 1] = value;
      data[target + 2] = value;
    } else {
      const source = pixel * 3;
      data[target] = samples[source] ?? 0;
      data[target + 1] = samples[source + 1] ?? 0;
      data[target + 2] = samples[source + 2] ?? 0;
    }
    data[target + 3] = 255;
  }
  return new ImageData(data, width, height);
}

function makeCanvas(width: number, height: number): OffscreenCanvas {
  return new OffscreenCanvas(Math.max(1, width), Math.max(1, height));
}

function drawToCanvas(
  source: CanvasImageSource,
  targetWidth: number,
  targetHeight: number,
  background: string,
): { canvas: OffscreenCanvas; context: OffscreenCanvasRenderingContext2D } {
  const canvas = makeCanvas(targetWidth, targetHeight);
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Canvas image processing is unavailable");
  context.fillStyle = background;
  context.fillRect(0, 0, targetWidth, targetHeight);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(source, 0, 0, targetWidth, targetHeight);
  return { canvas, context };
}

async function canvasToJpeg(
  canvas: OffscreenCanvas,
  context: OffscreenCanvasRenderingContext2D,
  quality: number,
  grayscale: boolean,
): Promise<PdfImageCodecResult> {
  if (grayscale) {
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    for (let index = 0; index < data.length; index += 4) {
      const luminance = Math.round(
        data[index] * 0.2126 +
          data[index + 1] * 0.7152 +
          data[index + 2] * 0.0722,
      );
      data[index] = luminance;
      data[index + 1] = luminance;
      data[index + 2] = luminance;
      data[index + 3] = 255;
    }
    context.putImageData(imageData, 0, 0);
  }
  const blob = await canvas.convertToBlob({
    quality,
    type: "image/jpeg",
  });
  return {
    bytes: new Uint8Array(await blob.arrayBuffer()),
    height: canvas.height,
    width: canvas.width,
  };
}

function canvasToGraySamples(
  canvas: OffscreenCanvas,
  context: OffscreenCanvasRenderingContext2D,
): PdfGraySamplesResult {
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const samples = new Uint8Array(canvas.width * canvas.height);
  for (let pixel = 0; pixel < samples.length; pixel += 1) {
    samples[pixel] = imageData.data[pixel * 4];
  }
  return { height: canvas.height, samples, width: canvas.width };
}

async function withDecodedBitmap<T>(
  bytes: Uint8Array,
  mimeType: string,
  run: (bitmap: ImageBitmap) => Promise<T>,
): Promise<T> {
  const bitmap = await createImageBitmap(
    new Blob([bytesToBlobPart(bytes)], { type: mimeType }),
  );
  try {
    return await run(bitmap);
  } finally {
    bitmap.close();
  }
}

export function createBrowserPdfImageCodec(): PdfImageCodec | undefined {
  if (
    typeof createImageBitmap === "undefined" ||
    typeof OffscreenCanvas === "undefined" ||
    typeof ImageData === "undefined"
  ) {
    return undefined;
  }
  return {
    async resizeEncodedToGraySamples(
      bytes,
      mimeType,
      targetWidth,
      targetHeight,
    ) {
      return withDecodedBitmap(bytes, mimeType, async (bitmap) => {
        const { canvas, context } = drawToCanvas(
          bitmap,
          targetWidth,
          targetHeight,
          "#000000",
        );
        return canvasToGraySamples(canvas, context);
      });
    },
    async resizeEncodedToJpeg(
      bytes,
      mimeType,
      targetWidth,
      targetHeight,
      quality,
      grayscale,
    ) {
      return withDecodedBitmap(bytes, mimeType, async (bitmap) => {
        const { canvas, context } = drawToCanvas(
          bitmap,
          targetWidth,
          targetHeight,
          "#ffffff",
        );
        return canvasToJpeg(canvas, context, quality, grayscale);
      });
    },
    async resizeSamplesToGraySamples(
      samples,
      width,
      height,
      targetWidth,
      targetHeight,
    ) {
      const source = makeCanvas(width, height);
      const sourceContext = source.getContext("2d", {
        willReadFrequently: true,
      });
      if (!sourceContext)
        throw new Error("Canvas image processing is unavailable");
      sourceContext.putImageData(
        imageDataFromSamples(samples, width, height, 1),
        0,
        0,
      );
      const { canvas, context } = drawToCanvas(
        source,
        targetWidth,
        targetHeight,
        "#000000",
      );
      return canvasToGraySamples(canvas, context);
    },
    async resizeSamplesToJpeg(
      samples,
      width,
      height,
      channels,
      targetWidth,
      targetHeight,
      quality,
      grayscale,
    ) {
      const source = makeCanvas(width, height);
      const sourceContext = source.getContext("2d", {
        willReadFrequently: true,
      });
      if (!sourceContext)
        throw new Error("Canvas image processing is unavailable");
      sourceContext.putImageData(
        imageDataFromSamples(samples, width, height, channels),
        0,
        0,
      );
      const { canvas, context } = drawToCanvas(
        source,
        targetWidth,
        targetHeight,
        "#ffffff",
      );
      return canvasToJpeg(canvas, context, quality, grayscale);
    },
  };
}

function targetDimensions(
  width: number,
  height: number,
  maxDimension: number,
): { height: number; width: number } {
  const scale = Math.min(1, maxDimension / Math.max(width, height));
  return {
    height: Math.max(1, Math.round(height * scale)),
    width: Math.max(1, Math.round(width * scale)),
  };
}

function setStreamLength(dict: PDFDict, length: number): void {
  dict.set(PDFName.of("Length"), PDFNumber.of(length));
}

function deleteDictKeys(dict: PDFDict, keys: string[]): void {
  for (const key of keys) dict.delete(PDFName.of(key));
}

async function recompressImages(
  doc: PDFDocument,
  settings: PdfCompressionAttempt,
  codec: PdfImageCodec,
  stats: PdfCompressionStats,
  onProgress: PdfCompressionOptions["onProgress"],
  yieldControl: () => Promise<void>,
): Promise<void> {
  const { candidates } = collectImages(doc);

  let processed = 0;
  for (const candidate of candidates) {
    onProgress?.({
      current: processed,
      message:
        candidates.length === 0
          ? "No embedded raster images need recompression"
          : `Recompressing embedded images (${processed + 1} of ${candidates.length})`,
      stage: "images",
      total: Math.max(1, candidates.length),
    });

    if (!candidate.supported || !candidate.channels) {
      stats.imagesSkipped += 1;
      processed += 1;
      continue;
    }

    try {
      const target = targetDimensions(
        candidate.width,
        candidate.height,
        settings.maxImageDimension,
      );
      const encoded =
        candidate.filter === "DCTDecode"
          ? await codec.resizeEncodedToJpeg(
              candidate.stream.contents.slice(),
              "image/jpeg",
              target.width,
              target.height,
              settings.imageQuality,
              settings.grayscaleImages,
            )
          : await codec.resizeSamplesToJpeg(
              await decodedImageSamples(
                candidate.stream,
                candidate.width,
                candidate.height,
                candidate.channels,
                candidate.filter,
              ),
              candidate.width,
              candidate.height,
              candidate.channels,
              target.width,
              target.height,
              settings.imageQuality,
              settings.grayscaleImages,
            );
      const jpegInfo = parseJpegInfo(encoded.bytes);
      if (
        !jpegInfo ||
        jpegInfo.width < 1 ||
        jpegInfo.height < 1 ||
        ![1, 3].includes(jpegInfo.components) ||
        encoded.bytes[encoded.bytes.byteLength - 2] !== 0xff ||
        encoded.bytes[encoded.bytes.byteLength - 1] !== 0xd9
      ) {
        throw new Error("Image encoder returned invalid JPEG data");
      }

      let maskBytes: Uint8Array | undefined;
      let maskUsesFlate = false;
      const dimensionsChanged =
        jpegInfo.width !== candidate.width ||
        jpegInfo.height !== candidate.height;
      if (candidate.smask && dimensionsChanged) {
        const gray =
          candidate.smask.filter === "DCTDecode"
            ? await codec.resizeEncodedToGraySamples(
                candidate.smask.stream.contents.slice(),
                "image/jpeg",
                jpegInfo.width,
                jpegInfo.height,
              )
            : await codec.resizeSamplesToGraySamples(
                await decodedImageSamples(
                  candidate.smask.stream,
                  candidate.smask.width,
                  candidate.smask.height,
                  1,
                  candidate.smask.filter,
                ),
                candidate.smask.width,
                candidate.smask.height,
                jpegInfo.width,
                jpegInfo.height,
              );
        if (
          gray.width !== jpegInfo.width ||
          gray.height !== jpegInfo.height ||
          gray.samples.byteLength !== jpegInfo.width * jpegInfo.height
        ) {
          throw new Error("Transparency mask resize failed");
        }
        const deflated = await deflateBytes(gray.samples);
        if (deflated && deflated.byteLength < gray.samples.byteLength) {
          maskBytes = deflated;
          maskUsesFlate = true;
        } else {
          maskBytes = gray.samples;
        }
      }

      const oldPairBytes =
        candidate.encodedBytes +
        (candidate.smask && dimensionsChanged
          ? candidate.smask.encodedBytes
          : 0);
      const newPairBytes =
        encoded.bytes.byteLength + (maskBytes?.byteLength ?? 0);
      const requiredSaving = Math.max(128, oldPairBytes * 0.02);
      if (newPairBytes >= oldPairBytes - requiredSaving) {
        stats.imagesSkipped += 1;
        processed += 1;
        continue;
      }

      const dict = candidate.stream.dict;
      candidate.stream.updateContents(encoded.bytes);
      dict.set(PDFName.of("Width"), PDFNumber.of(jpegInfo.width));
      dict.set(PDFName.of("Height"), PDFNumber.of(jpegInfo.height));
      dict.set(PDFName.of("BitsPerComponent"), PDFNumber.of(8));
      dict.set(PDFName.of("Filter"), PDFName.of("DCTDecode"));
      dict.set(
        PDFName.of("ColorSpace"),
        PDFName.of(jpegInfo.components === 1 ? "DeviceGray" : "DeviceRGB"),
      );
      deleteDictKeys(dict, [
        "Decode",
        "DecodeParms",
        "DP",
        "F",
        "FFilter",
        "FDecodeParms",
        "DL",
        "ID",
      ]);
      setStreamLength(dict, encoded.bytes.byteLength);

      if (candidate.smask && maskBytes) {
        const maskDict = candidate.smask.stream.dict;
        candidate.smask.stream.updateContents(maskBytes);
        maskDict.set(PDFName.of("Width"), PDFNumber.of(jpegInfo.width));
        maskDict.set(PDFName.of("Height"), PDFNumber.of(jpegInfo.height));
        maskDict.set(PDFName.of("BitsPerComponent"), PDFNumber.of(8));
        maskDict.set(PDFName.of("ColorSpace"), PDFName.of("DeviceGray"));
        if (maskUsesFlate) {
          maskDict.set(PDFName.of("Filter"), PDFName.of("FlateDecode"));
        } else {
          maskDict.delete(PDFName.of("Filter"));
        }
        deleteDictKeys(maskDict, [
          "DecodeParms",
          "DP",
          "F",
          "FFilter",
          "FDecodeParms",
          "DL",
          "ID",
        ]);
        setStreamLength(maskDict, maskBytes.byteLength);
        stats.masksRecompressed += 1;
      }

      stats.imagesRecompressed += 1;
      stats.imageBytesAfter +=
        encoded.bytes.byteLength - candidate.encodedBytes;
      if (candidate.smask && maskBytes) {
        stats.imageBytesAfter +=
          maskBytes.byteLength - candidate.smask.encodedBytes;
      }
    } catch {
      stats.imagesSkipped += 1;
    }

    processed += 1;
    if (processed % 4 === 0) await yieldControl();
  }
}

function retainedFlateDecodeParms(
  doc: PDFDocument,
  dict: PDFDict,
  filters: string[],
): PDFDict | undefined | null {
  const parms = decodeParmsInfo(doc, dict);
  if (!parms.present) return undefined;
  if (parms.isArray || filters.length !== 1) return null;
  if (!["FlateDecode", "LZWDecode"].includes(filters[0])) return null;
  if (parms.predictor === 1) return undefined;
  const literal: Record<string, number> = { Predictor: parms.predictor };
  if (parms.colors !== undefined) literal.Colors = parms.colors;
  if (parms.bitsPerComponent !== undefined) {
    literal.BitsPerComponent = parms.bitsPerComponent;
  }
  if (parms.columns !== undefined) literal.Columns = parms.columns;
  return doc.context.obj(literal);
}

async function recompressLosslessStreams(
  doc: PDFDocument,
  stats: PdfCompressionStats,
  onProgress: PdfCompressionOptions["onProgress"],
  yieldControl: () => Promise<void>,
): Promise<boolean> {
  const streams = doc.context
    .enumerateIndirectObjects()
    .map(([, object]) => object)
    .filter((object): object is PDFRawStream => object instanceof PDFRawStream);

  let decodedTotal = 0;
  let losslessUnavailable = false;

  for (let index = 0; index < streams.length; index += 1) {
    const stream = streams[index];
    if (index === 0 || index % 12 === 0) {
      onProgress?.({
        current: index,
        message: "Recompressing PDF streams losslessly",
        stage: "lossless",
        total: Math.max(1, streams.length),
      });
    }

    const dict = stream.dict;
    const type = dictName(doc, dict, "Type");
    if (type === "XRef" || type === "ObjStm" || dictValue(dict, "F")) {
      continue;
    }
    const filters = filterNames(doc, dict);
    if (
      filters.some((filter) =>
        ["DCTDecode", "JPXDecode", "JBIG2Decode", "CCITTFaxDecode"].includes(
          filter,
        ),
      )
    ) {
      continue;
    }
    const oldBytes = streamSize(stream);
    if (oldBytes <= 512) continue;

    const retainedParms = retainedFlateDecodeParms(doc, dict, filters);
    if (retainedParms === null) continue;

    if (
      filters.length > 1 ||
      (filters.length === 1 && filters[0] !== "FlateDecode")
    ) {
      continue;
    }

    try {
      const decoded =
        filters.length === 0
          ? stream.contents
          : await inflateFlateBytesCapped(
              stream.contents,
              PDF_COMPRESS_LIMITS.maxDecodedStreamBytes,
            );
      if (
        !decoded ||
        decoded.byteLength === 0 ||
        decoded.byteLength > PDF_COMPRESS_LIMITS.maxDecodedStreamBytes ||
        decodedTotal > 256 * 1024 * 1024
      ) {
        continue;
      }
      decodedTotal += decoded.byteLength;
      const deflated = await deflateBytes(decoded);
      if (!deflated) {
        losslessUnavailable = true;
        break;
      }
      const requiredSaving = Math.max(64, oldBytes * 0.005);
      if (deflated.byteLength >= oldBytes - requiredSaving) continue;

      stream.updateContents(deflated);
      dict.set(PDFName.of("Filter"), PDFName.of("FlateDecode"));
      if (retainedParms) {
        dict.set(PDFName.of("DecodeParms"), retainedParms);
      } else {
        deleteDictKeys(dict, ["DecodeParms", "DP"]);
      }
      deleteDictKeys(dict, ["FFilter", "FDecodeParms", "DL"]);
      setStreamLength(dict, deflated.byteLength);
      stats.streamsRecompressed += 1;
      stats.losslessBytesSaved += oldBytes - deflated.byteLength;
    } catch {
      // A stream that cannot be safely decoded stays exactly as it was.
      continue;
    }

    if (index % 12 === 0) await yieldControl();
  }

  return losslessUnavailable;
}

async function validateCandidate(
  bytes: Uint8Array,
  expectedGeometries: PageGeometry[],
  expectedFeatures: PdfInspectionFeatures,
): Promise<void> {
  let doc: PDFDocument;
  try {
    if (!isPdfSignature(bytes)) throw new Error("Missing PDF signature");
    doc = await PDFDocument.load(bytes, {
      ...LOAD_OPTIONS,
      ignoreEncryption: false,
    });
  } catch {
    throw new PdfMergeError(
      "output_validation_failed",
      "The compressed PDF could not be reopened for validation, so it was discarded. Try Low compression or export a fresh copy from a PDF editor and try again.",
    );
  }
  if (doc.isEncrypted) {
    throw new PdfMergeError(
      "output_validation_failed",
      "The compressed PDF remained encrypted after processing, so it was discarded. Export an unencrypted copy in a PDF editor and try again.",
    );
  }

  const actual = pageGeometries(doc);
  if (actual.length !== expectedGeometries.length) {
    throw new PdfMergeError(
      "output_validation_failed",
      "The compressed PDF changed page count during validation, so it was discarded. Your original PDF is unchanged.",
    );
  }
  for (let index = 0; index < actual.length; index += 1) {
    const expected = expectedGeometries[index];
    const page = actual[index];
    if (
      Math.abs(page.width - expected.width) > 0.02 ||
      Math.abs(page.height - expected.height) > 0.02 ||
      page.rotation !== expected.rotation
    ) {
      throw new PdfMergeError(
        "output_validation_failed",
        "The compressed PDF changed a page’s size or rotation during validation, so it was discarded. Your original PDF is unchanged.",
      );
    }
  }

  const features = inspectPdfFeatures(doc);
  const featureDropped =
    (expectedFeatures.hasAttachments && !features.hasAttachments) ||
    (expectedFeatures.hasForm && !features.hasForm) ||
    (expectedFeatures.hasOutlines && !features.hasOutlines) ||
    (expectedFeatures.hasLayers && !features.hasLayers);
  if (featureDropped) {
    throw new PdfMergeError(
      "output_validation_failed",
      "Compression would have dropped a document feature such as attachments, form fields, bookmarks or layers, so the rewritten PDF was discarded. Your original PDF is unchanged.",
    );
  }
}

async function buildCandidate(
  sourceBytes: Uint8Array,
  settings: PdfCompressionAttempt,
  options: PdfCompressionOptions,
): Promise<CandidateBuild> {
  const yieldControl =
    options.yieldControl ??
    (() => new Promise<void>((resolve) => setTimeout(resolve, 0)));
  const progress = (value: Omit<PdfCompressionProgress, "fileName">): void =>
    options.onProgress?.({ ...value });

  progress({
    current: settings.attempt,
    message:
      settings.targetBytes === undefined
        ? "Preparing the PDF for compression"
        : `Trying compression attempt ${settings.attempt} for the target size`,
    stage: "preparing",
    total: Math.max(settings.attempt, 1),
  });

  const { doc, encrypted } = await loadPdf(
    sourceBytes,
    options.password,
    options.entryId,
  );
  const { geometries, inspection } = inspectionFromDoc(
    doc,
    encrypted,
    options.entryId,
  );
  const blocker = compressionBlocker(inspection.features);
  if (blocker) {
    throw new PdfMergeError(
      inspection.features.hasXFA ? "unsupported_xfa" : "signed_pdf",
      blocker,
      options.entryId,
    );
  }

  const { analysis } = collectImages(doc);
  const stats: PdfCompressionStats = {
    attempts: settings.attempt,
    imageBytesAfter: analysis.imageBytes,
    imageBytesBefore: analysis.imageBytes,
    imagesRecompressed: 0,
    imagesSkipped: 0,
    losslessBytesSaved: 0,
    masksRecompressed: 0,
    streamsRecompressed: 0,
    unchanged: false,
  };
  const notices: string[] = [];

  const codec =
    options.imageCodec === undefined
      ? createBrowserPdfImageCodec()
      : options.imageCodec;
  let canImproveWithImages = Boolean(
    settings.recompressImages && codec && analysis.supportedImageCount > 0,
  );

  if (settings.recompressImages) {
    if (codec) {
      await recompressImages(
        doc,
        settings,
        codec,
        stats,
        options.onProgress,
        yieldControl,
      );
      canImproveWithImages = stats.imagesRecompressed > 0;
    } else {
      stats.imagesSkipped += analysis.supportedImageCount;
      canImproveWithImages = false;
      notices.push(
        "This browser could not recompress embedded images locally, so QUICKKIT used lossless PDF stream optimization only and left image data unchanged.",
      );
    }
  }

  const losslessUnavailable = await recompressLosslessStreams(
    doc,
    stats,
    options.onProgress,
    yieldControl,
  );
  if (losslessUnavailable) {
    notices.push(
      "This browser does not provide local stream recompression, so only supported image and object-stream savings were available.",
    );
  }

  try {
    doc.setProducer("QUICKKIT PDF Compressor");
    doc.setModificationDate(options.now ?? new Date());
  } catch {
    // Metadata identification is optional; content fidelity takes priority.
  }

  progress({
    current: 1,
    message: "Saving the optimized PDF",
    stage: "saving",
    total: 1,
  });
  const bytes = await doc.save({
    addDefaultPage: false,
    objectsPerTick: 50,
    useObjectStreams: true,
  });

  progress({
    current: 1,
    message: "Reopening the compressed PDF to validate pages and features",
    stage: "validating",
    total: 1,
  });
  await validateCandidate(bytes, geometries, inspection.features);

  return {
    analysis,
    bytes,
    canImproveWithImages,
    inspection,
    notices,
    settings,
    stats,
  };
}

export async function inspectPdfForCompression(
  bytes: Uint8Array,
  password?: string,
  entryId?: string,
): Promise<PdfCompressionInspectionResult> {
  const { doc, encrypted } = await loadPdf(bytes, password, entryId);
  const { inspection } = inspectionFromDoc(doc, encrypted, entryId);
  const { analysis } = collectImages(doc);
  return { analysis, inspection };
}

function shouldThrowImmediately(error: unknown): boolean {
  if (!(error instanceof PdfMergeError)) return false;
  return [
    "corrupt_or_unsupported",
    "encrypted_unsupported",
    "file_too_large",
    "invalid_pdf",
    "password_invalid",
    "password_required",
    "signed_pdf",
    "too_many_pages",
    "unsupported_xfa",
  ].includes(error.code);
}

export async function compressPdfBytes(
  sourceBytes: Uint8Array,
  settingsInput: PdfCompressionSettings,
  options: PdfCompressionOptions = {},
): Promise<PdfCompressionResult> {
  assertSourceBytes(sourceBytes, options.entryId);
  const settings = normalizeCompressionSettings(settingsInput);
  const attempts = buildCompressionAttempts(settings);

  let best: CandidateBuild | undefined;
  let lastError: unknown;
  let fallbackNotice: string | undefined;
  let attemptsRun = 0;

  for (const attempt of attempts) {
    attemptsRun += 1;
    let candidate: CandidateBuild;
    try {
      candidate = await buildCandidate(sourceBytes, attempt, options);
    } catch (error) {
      if (shouldThrowImmediately(error)) throw error;
      lastError = error;

      if (attempt.recompressImages) {
        try {
          candidate = await buildCandidate(
            sourceBytes,
            { ...attempt, recompressImages: false },
            options,
          );
          fallbackNotice =
            "Image recompression could not be validated for this PDF, so QUICKKIT recovered with lossless stream/object optimization and left the images unchanged.";
          candidate.canImproveWithImages = false;
        } catch (fallbackError) {
          if (shouldThrowImmediately(fallbackError)) throw fallbackError;
          lastError = fallbackError;
          continue;
        }
      } else {
        continue;
      }
    }

    if (!best || candidate.bytes.byteLength < best.bytes.byteLength) {
      best = candidate;
    }
    if (
      settings.targetBytes !== undefined &&
      candidate.bytes.byteLength <= settings.targetBytes
    ) {
      best = candidate;
      break;
    }
    if (settings.targetBytes !== undefined && !candidate.canImproveWithImages) {
      break;
    }
  }

  if (!best) {
    if (lastError instanceof PdfMergeError) throw lastError;
    throw new PdfMergeError(
      "worker_failed",
      "Local PDF compression stopped unexpectedly. Close other memory-heavy tabs, try Low compression, or export a fresh copy from a PDF editor and try again. Nothing was uploaded.",
      options.entryId,
    );
  }

  const requiredSaving = Math.max(
    128,
    Math.round(sourceBytes.byteLength * 0.002),
  );
  const unchanged =
    best.bytes.byteLength >= sourceBytes.byteLength - requiredSaving;
  const outputBytes = unchanged ? sourceBytes.slice() : best.bytes;
  const notices = [...best.notices];
  if (fallbackNotice) notices.unshift(fallbackNotice);

  if (unchanged) {
    notices.push(
      best.inspection.encrypted
        ? "No safely smaller rewrite was found. QUICKKIT returned the original file unchanged, so it remains password-protected rather than delivering a larger rewritten copy."
        : "No safely smaller rewrite was found. QUICKKIT returned the original file unchanged instead of delivering a larger or negligibly smaller copy.",
    );
  } else {
    if (best.stats.imagesRecompressed > 0) {
      notices.push(
        `${best.stats.imagesRecompressed.toLocaleString()} embedded image${best.stats.imagesRecompressed === 1 ? "" : "s"} recompressed. Page text and vector content were not rasterized.`,
      );
    }
    if (best.stats.imagesSkipped > 0) {
      notices.push(
        `${best.stats.imagesSkipped.toLocaleString()} embedded image${best.stats.imagesSkipped === 1 ? "" : "s"} kept unchanged because the format, color space, transparency or encoded size could not be reduced safely.`,
      );
    }
    if (best.stats.streamsRecompressed > 0) {
      notices.push(
        `${best.stats.streamsRecompressed.toLocaleString()} PDF stream${best.stats.streamsRecompressed === 1 ? "" : "s"} recompressed losslessly.`,
      );
    }
    if (best.inspection.encrypted) {
      notices.push(
        "The validated compressed copy is not password-protected. Protect it again in your PDF editor if it contains sensitive information.",
      );
    }
  }

  const targetReached =
    settings.targetBytes === undefined
      ? undefined
      : outputBytes.byteLength <= settings.targetBytes;
  if (settings.targetBytes !== undefined) {
    notices.push(
      targetReached
        ? `Target reached: ${formatMiB(outputBytes.byteLength)} is within ${formatMiB(settings.targetBytes)}.`
        : `Target not reached: the smallest safe result is ${formatMiB(outputBytes.byteLength)} rather than ${formatMiB(settings.targetBytes)}. Text, fonts, vector data, attachments or unsupported image formats can set a floor that image quality alone cannot cross.`,
    );
  }

  const stats: PdfCompressionStats = {
    ...best.stats,
    attempts: attemptsRun,
    imageBytesAfter: unchanged
      ? best.analysis.imageBytes
      : best.stats.imageBytesAfter,
    targetReached,
    unchanged,
  };

  options.onProgress?.({
    current: 1,
    message: unchanged
      ? "Original PDF retained after validation"
      : "Compressed PDF validated",
    stage: "finalizing",
    total: 1,
  });

  return {
    analysis: best.analysis,
    bytes: outputBytes,
    inspection: best.inspection,
    notices: [...new Set(notices)],
    originalBytes: sourceBytes.byteLength,
    outputBytes: outputBytes.byteLength,
    pageCount: best.inspection.pageCount,
    settingsUsed: {
      grayscaleImages: best.settings.grayscaleImages,
      imageQuality: best.settings.imageQuality,
      maxImageDimension: best.settings.maxImageDimension,
      preset: settings.preset,
      recompressImages: best.settings.recompressImages,
      ...(settings.targetBytes === undefined
        ? {}
        : { targetBytes: settings.targetBytes }),
    },
    stats,
  };
}
