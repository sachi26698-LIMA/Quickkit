/**
 * QR symbol capacity maths for byte-mode data.
 *
 * The table below is the ISO/IEC 18004 byte-mode character capacity for
 * versions 1–40 at each error-correction level, and every row is asserted
 * against the actual `qrcode` encoder in `tests/qr-capacity.test.ts`
 * (exactly `capacity` bytes encode, `capacity + 1` is refused), so a typo
 * cannot silently promise a payload size that will not fit. One row was
 * caught that way during development: level H from version 31 up.
 */
import type { QrErrorLevel } from "./types";

export const QR_LEVELS: QrErrorLevel[] = ["L", "M", "Q", "H"];

/** byteCapacity[version - 1] = [L, M, Q, H] */
export const BYTE_CAPACITY: readonly (readonly number[])[] = [
  [17, 14, 11, 7],
  [32, 26, 20, 14],
  [53, 42, 32, 24],
  [78, 62, 46, 34],
  [106, 84, 60, 44],
  [134, 106, 74, 58],
  [154, 122, 86, 64],
  [192, 152, 108, 84],
  [230, 180, 130, 98],
  [271, 213, 151, 119],
  [321, 251, 177, 137],
  [367, 287, 203, 155],
  [425, 331, 241, 177],
  [458, 362, 258, 194],
  [520, 412, 292, 220],
  [586, 450, 322, 250],
  [644, 504, 364, 280],
  [718, 560, 394, 310],
  [792, 624, 442, 338],
  [858, 666, 482, 382],
  [929, 711, 509, 403],
  [1003, 779, 565, 439],
  [1091, 857, 611, 461],
  [1171, 911, 661, 511],
  [1273, 997, 715, 535],
  [1367, 1059, 751, 593],
  [1465, 1125, 805, 625],
  [1528, 1190, 868, 658],
  [1628, 1264, 908, 698],
  [1732, 1370, 982, 742],
  [1840, 1452, 1030, 790],
  [1952, 1538, 1112, 842],
  [2068, 1628, 1168, 898],
  [2188, 1722, 1228, 958],
  [2303, 1809, 1283, 983],
  [2431, 1911, 1351, 1051],
  [2563, 1989, 1423, 1093],
  [2699, 2099, 1499, 1139],
  [2809, 2213, 1579, 1219],
  [2953, 2331, 1663, 1273],
];

export const MAX_QR_VERSION = BYTE_CAPACITY.length;

/**
 * Application ceiling. Version 40 / level L fits 2,953 bytes, but codes that
 * dense are hard to scan from a phone camera, so the tool stops earlier.
 */
export const MAX_QR_PAYLOAD_BYTES = 2500;

export const LEVEL_TOLERANCE: Record<QrErrorLevel, string> = {
  L: "≈7%",
  M: "≈15%",
  Q: "≈25%",
  H: "≈30%",
};

/** Module count for a version (21 + 4·(version−1)). */
export function moduleCount(version: number) {
  return 21 + 4 * (version - 1);
}

export function levelIndex(level: QrErrorLevel) {
  return QR_LEVELS.indexOf(level);
}

/** Capacity in bytes for a version + level, or 0 when out of range. */
export function byteCapacity(version: number, level: QrErrorLevel) {
  if (!Number.isInteger(version) || version < 1 || version > MAX_QR_VERSION)
    return 0;
  return BYTE_CAPACITY[version - 1][levelIndex(level)] ?? 0;
}

export type QrFit =
  | {
      ok: true;
      version: number;
      modules: number;
      capacity: number;
      /** Highest level that still fits in the chosen version (free robustness). */
      boostTo: QrErrorLevel;
      density: number;
    }
  | { ok: false; reason: "empty" | "too-long" | "no-version"; need: number };

/**
 * Smallest version able to carry `bytes` at `level`, plus the EC level the
 * same version could carry robustness for (the "boost" the spec calls for).
 */
export function fitQr(
  bytes: number,
  level: QrErrorLevel,
  maxBytes = MAX_QR_PAYLOAD_BYTES,
): QrFit {
  if (bytes <= 0) return { ok: false, reason: "empty", need: 0 };
  if (bytes > maxBytes)
    return { ok: false, reason: "too-long", need: bytes - maxBytes };
  const wanted = levelIndex(level);
  for (let version = 1; version <= MAX_QR_VERSION; version += 1) {
    const row = BYTE_CAPACITY[version - 1];
    if (row[wanted] >= bytes) {
      let boostTo = level;
      for (let index = QR_LEVELS.length - 1; index > wanted; index -= 1) {
        if (row[index] >= bytes) {
          boostTo = QR_LEVELS[index];
          break;
        }
      }
      const modules = moduleCount(version);
      return {
        ok: true,
        version,
        modules,
        capacity: row[wanted],
        boostTo,
        // Share of the symbol that carries data — a scannability hint only.
        density: Math.min(1, bytes / row[wanted]),
      };
    }
  }
  return { ok: false, reason: "no-version", need: 0 };
}

/** UTF-8 byte length, the unit QR byte mode actually counts in. */
export function utf8Length(text: string) {
  return new TextEncoder().encode(text).length;
}
