/**
 * Turn a payload string into the QR module matrix using the `qrcode` encoder.
 *
 * `createMatrix` is the only place that talks to the encoder: it checks the
 * content against the published byte-mode capacity table, applies the requested
 * (or boosted) error-correction level, and returns the finished bitmap that the
 * renderers draw.
 */
import * as QRCode from "qrcode";
import { fitQr, MAX_QR_PAYLOAD_BYTES, utf8Length } from "./capacity";
import { QrUserError, type QrErrorLevel } from "./types";

export type QrMatrix = {
  /** Row-major, 1 = dark module. */
  data: Uint8Array;
  /** Modules per side, quiet zone excluded. */
  size: number;
  version: number;
  level: QrErrorLevel;
  mask: number;
  bytes: number;
  capacity: number;
};

export function createMatrix(
  payload: string,
  level: QrErrorLevel,
  options: { boost?: boolean } = {},
): QrMatrix {
  const bytes = utf8Length(payload);
  const fit = fitQr(bytes, level);
  if (!fit.ok) {
    if (fit.reason === "empty")
      throw new QrUserError("There is nothing to encode yet.");
    if (fit.reason === "too-long")
      throw new QrUserError(
        `This payload is ${bytes.toLocaleString()} bytes, which is over the tool's ${MAX_QR_PAYLOAD_BYTES.toLocaleString()}-byte ceiling (a version-40 symbol at level L).`,
      );
    throw new QrUserError(
      "This content is too much for a single QR code. Shorten it or split it across codes.",
    );
  }
  const chosenLevel = options.boost === false ? level : fit.boostTo;
  let qr: QRCode.QRCode;
  try {
    qr = QRCode.create(payload, { errorCorrectionLevel: chosenLevel });
  } catch (error) {
    throw new QrUserError(
      error instanceof Error &&
        /too long|code capacity|big/i.test(error.message)
        ? "The encoder could not fit this content into any QR version. Shorten it and try again."
        : "The QR encoder could not build this symbol.",
    );
  }
  const size = qr.modules.size;
  const source = qr.modules.data as Uint8ClampedArray | Uint8Array;
  const data = new Uint8Array(size * size);
  for (let index = 0; index < data.length; index += 1)
    data[index] = source[index] ? 1 : 0;
  // The encoder reports its level as { bit } — 0 M, 1 L, 2 H, 3 Q.
  const BIT_TO_LEVEL: Record<number, QrErrorLevel> = {
    0: "M",
    1: "L",
    2: "H",
    3: "Q",
  };
  const reported = (
    qr.errorCorrectionLevel as unknown as { bit?: number } | undefined
  )?.bit;
  return {
    data,
    size,
    version: qr.version ?? fit.version,
    level: (reported === undefined
      ? chosenLevel
      : BIT_TO_LEVEL[reported]) as QrErrorLevel,
    mask: qr.maskPattern ?? 0,
    bytes,
    capacity: fit.capacity,
  };
}

/** True when (row, col) sits inside one of the three finder patterns. */
export function isFinderModule(size: number, row: number, col: number) {
  const last = size - 7;
  if (row < 7 && col < 7) return true;
  if (row < 7 && col >= last) return true;
  if (row >= last && col < 7) return true;
  return false;
}

/**
 * Count dark modules a logo overlay would sit on top of. Used to explain the
 * scannability risk in plain numbers instead of a vague warning.
 */
export function modulesUnderLogo(
  matrix: QrMatrix,
  logo: {
    scale: number;
    offsetX: number;
    offsetY: number;
  },
  margin: number,
) {
  const total = matrix.size + margin * 2;
  const side = Math.round(logo.scale * total);
  const centreCol = (0.5 + logo.offsetX) * total - margin;
  const centreRow = (0.5 + logo.offsetY) * total - margin;
  const fromCol = Math.floor(centreCol - side / 2);
  const toCol = Math.ceil(centreCol + side / 2);
  const fromRow = Math.floor(centreRow - side / 2);
  const toRow = Math.ceil(centreRow + side / 2);
  let darkCovered = 0;
  let totalCovered = 0;
  for (
    let row = Math.max(0, fromRow);
    row < Math.min(matrix.size, toRow);
    row += 1
  )
    for (
      let col = Math.max(0, fromCol);
      col < Math.min(matrix.size, toCol);
      col += 1
    ) {
      totalCovered += 1;
      if (matrix.data[row * matrix.size + col]) darkCovered += 1;
    }
  return { darkCovered, totalCovered, side };
}
