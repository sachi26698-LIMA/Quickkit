/**
 * Tiny, dependency-free metadata scanner for the Image Resizer.
 *
 * It only reports what a file *contains* so the UI can show a privacy summary;
 * the canvas pipeline always writes clean output with no metadata.
 * Default scan is limited to 256 KiB; callers may request up to 15 MiB.
 */

export type MetadataReport = {
  format: string;
  hasExif: boolean;
  hasGps: boolean;
  hasIcc: boolean;
  hasXmp: boolean;
  orientation: number | null;
  camera: string | null;
  captured: string | null;
  stripped: true;
};

export const METADATA_SCAN_LIMIT = 256 * 1024;

const ASCII = (bytes: Uint8Array, start: number, length: number) =>
  String.fromCharCode(...bytes.subarray(start, start + length));

function clean(value: string) {
  return value.replace(/[\u0000-\u001f]+/g, " ").trim();
}

/** Reads the EXIF TIFF block inside a JPEG APP1 segment. */
export function scanExifBlock(block: Uint8Array): {
  orientation: number | null;
  camera: string | null;
  captured: string | null;
  hasGps: boolean;
} {
  const result = {
    orientation: null as number | null,
    camera: null as string | null,
    captured: null as string | null,
    hasGps: false,
  };
  if (block.length < 8) return result;
  const little = block[0] === 0x49 && block[1] === 0x49;
  const big = block[0] === 0x4d && block[1] === 0x4d;
  if (!little && !big) return result;
  const view = new DataView(block.buffer, block.byteOffset, block.byteLength);
  const u16 = (offset: number) =>
    little ? view.getUint16(offset, true) : view.getUint16(offset, false);
  const u32 = (offset: number) =>
    little ? view.getUint32(offset, true) : view.getUint32(offset, false);

  try {
    if (u16(2) !== 42) return result;
    const ifd0 = u32(4);
    if (ifd0 + 2 > block.length) return result;
    const count = u16(ifd0);
    if (count > 512) return result;
    for (let index = 0; index < count; index += 1) {
      const entry = ifd0 + 2 + index * 12;
      if (entry + 12 > block.length) break;
      const tag = u16(entry);
      const type = u16(entry + 2);
      const entries = u32(entry + 4);
      const valueOffset = entry + 8;
      const ascii = () => {
        if (entries === 0 || entries > 4096) return "";
        const start = entries <= 4 ? valueOffset : u32(valueOffset);
        if (start < 0 || start + entries > block.length) return "";
        return clean(ASCII(block, start, entries));
      };
      if (tag === 0x0112 && type === 3) {
        const value = u16(valueOffset);
        if (value >= 1 && value <= 8) result.orientation = value;
      } else if (tag === 0x010f) {
        const make = ascii();
        if (make) result.camera = make;
      } else if (tag === 0x0110) {
        const model = ascii();
        if (model)
          result.camera =
            result.camera && !model.startsWith(result.camera)
              ? `${result.camera} ${model}`
              : model;
      } else if (tag === 0x0132) {
        const taken = ascii();
        if (taken) result.captured = taken;
      } else if (tag === 0x8825) {
        result.hasGps = true;
      }
    }
  } catch {
    return result;
  }
  return result;
}

export function scanMetadata(
  bytes: Uint8Array,
  type: string,
  scanLimit = METADATA_SCAN_LIMIT,
): MetadataReport {
  const report: MetadataReport = {
    format: type.replace("image/", "").toUpperCase(),
    hasExif: false,
    hasGps: false,
    hasIcc: false,
    hasXmp: false,
    orientation: null,
    camera: null,
    captured: null,
    stripped: true,
  };
  const data = bytes.subarray(
    0,
    Math.min(Math.max(0, scanLimit), 15 * 1024 * 1024),
  );

  if (type === "image/jpeg") {
    let offset = 2;
    while (offset + 4 < data.length) {
      if (data[offset] !== 0xff) break;
      const marker = data[offset + 1];
      if (marker === 0xda) break; // start of scan: metadata is behind us
      if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7)) {
        offset += 2;
        continue;
      }
      const length = (data[offset + 2] << 8) | data[offset + 3];
      if (length < 2) break;
      const payload = data.subarray(offset + 4, offset + 2 + length);
      if (marker === 0xe1 && ASCII(payload, 0, 6) === "Exif\u0000\u0000") {
        report.hasExif = true;
        const exif = scanExifBlock(payload.subarray(6));
        report.orientation = exif.orientation;
        report.camera = exif.camera;
        report.captured = exif.captured;
        report.hasGps = report.hasGps || exif.hasGps;
      }
      if (
        marker === 0xe1 &&
        ASCII(payload, 0, 29).includes("http://ns.adobe.com/xap/1.0/")
      )
        report.hasXmp = true;
      if (marker === 0xe2 && ASCII(payload, 0, 11) === "ICC_PROFILE")
        report.hasIcc = true;
      offset += 2 + length;
    }
    return report;
  }

  if (type === "image/png") {
    let offset = 8;
    while (offset + 8 <= data.length) {
      const length =
        (data[offset] << 24) |
        (data[offset + 1] << 16) |
        (data[offset + 2] << 8) |
        data[offset + 3];
      const chunk = ASCII(data, offset + 4, 4);
      if (chunk === "eXIf") {
        report.hasExif = true;
        const exif = scanExifBlock(
          data.subarray(offset + 8, offset + 8 + length),
        );
        report.orientation = exif.orientation;
        report.camera = exif.camera;
        report.captured = exif.captured;
        report.hasGps = report.hasGps || exif.hasGps;
      }
      if (chunk === "iCCP") report.hasIcc = true;
      if (chunk === "iTXt" || chunk === "tEXt") {
        const text = ASCII(data, offset + 8, Math.min(length, 64));
        if (text.toLowerCase().includes("xml:com.adobe.xmp"))
          report.hasXmp = true;
      }
      if (chunk === "IEND" || length < 0) break;
      offset += 12 + length;
    }
    return report;
  }

  if (type === "image/webp") {
    let offset = 12;
    while (offset + 8 <= data.length) {
      const chunk = ASCII(data, offset, 4);
      const size =
        data[offset + 4] |
        (data[offset + 5] << 8) |
        (data[offset + 6] << 16) |
        (data[offset + 7] << 24);
      if (size < 0) break;
      if (chunk === "EXIF") {
        report.hasExif = true;
        const block = data.subarray(offset + 8, offset + 8 + size);
        const exif = scanExifBlock(
          ASCII(block, 0, 6) === "Exif\u0000\u0000" ? block.subarray(6) : block,
        );
        report.orientation = exif.orientation;
        report.camera = exif.camera;
        report.captured = exif.captured;
        report.hasGps = report.hasGps || exif.hasGps;
      }
      if (chunk === "ICCP") report.hasIcc = true;
      if (chunk === "XMP ") report.hasXmp = true;
      offset += 8 + size + (size % 2);
    }
  }

  return report;
}

export function metadataSummary(report: MetadataReport) {
  const found: string[] = [];
  if (report.hasExif) found.push("EXIF");
  if (report.hasGps) found.push("GPS location");
  if (report.hasIcc) found.push("colour profile");
  if (report.hasXmp) found.push("XMP");
  if (!found.length) return "No embedded metadata found";
  return `Found ${found.join(", ")} — removed from every output`;
}
