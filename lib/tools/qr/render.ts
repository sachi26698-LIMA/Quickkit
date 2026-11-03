/**
 * Orchestration: payload → matrix → scene → pixels/SVG → safety + decode proof.
 *
 * Everything the workspace needs from one call, so the preview, the export
 * panel and the bulk pipeline all render through exactly the same code.
 */
import { buildScene, type QrScene } from "./scene";
import { createMatrix, type QrMatrix } from "./matrix";
import { clampDesign, defaultDesign, type DesignAdjustment } from "./style";
import { analyzeScannability, type SafetyReport } from "./safety";
import { rasterizeScene, scaleBitmap, type QrBitmap } from "./raster";
import { encodePng } from "./png";
import { sceneToSvg } from "./svg";
import { verifyBitmap, type QrVerification } from "./verify";
import { utf8Length } from "./capacity";
import { QrUserError, type QrDesign, type QrLogoImage } from "./types";

export type RenderArtifacts = {
  /** Full-resolution RGBA — needed for PNG export and final verification. */
  bitmap?: boolean;
  png?: boolean;
  svg?: boolean;
  /** Downscaled RGBA for the live preview. */
  preview?: number;
};

export type RenderOutput = {
  payload: string;
  bytes: number;
  matrix: QrMatrix;
  design: QrDesign;
  scene: QrScene;
  adjustments: DesignAdjustment[];
  safety: SafetyReport;
  bitmap: QrBitmap | null;
  preview: QrBitmap | null;
  png: Uint8Array | null;
  svg: string | null;
  verification: QrVerification | null;
};

export type RenderRequest = {
  payload: string;
  design?: Partial<QrDesign>;
  logo?: QrLogoImage | null;
  artifacts?: RenderArtifacts;
  /** Decode the full-resolution image to prove the styling survived. */
  verify?: boolean;
};

export async function renderQr(request: RenderRequest): Promise<RenderOutput> {
  const payload = request.payload ?? "";
  if (!payload) throw new QrUserError("There is nothing to encode yet.");
  const base = { ...defaultDesign(), ...(request.design ?? {}) };
  const { design, adjustments } = clampDesign(base, {
    hasLogo: Boolean(request.logo),
  });
  const matrix = createMatrix(payload, design.errorLevel, {
    boost: design.boost,
  });
  const scene = buildScene(matrix, design, request.logo ?? null);
  const safety = analyzeScannability(design, matrix, {
    hasLogo: Boolean(request.logo),
  });
  const wantFull =
    request.artifacts?.bitmap ||
    request.artifacts?.png ||
    request.verify ||
    request.artifacts?.preview;
  const full = wantFull ? rasterizeScene(scene) : null;
  const previewSize = request.artifacts?.preview;
  const preview =
    full && previewSize
      ? scaleBitmap(full, Math.min(previewSize, full.width))
      : null;
  const png = request.artifacts?.png && full ? await encodePng(full) : null;
  const svg = request.artifacts?.svg
    ? await sceneToSvg(scene, { title: "QUICKKIT QR code" })
    : null;
  const verification =
    request.verify && full
      ? verifyBitmap(full, payload, {
          totalModules: matrix.size + design.margin * 2,
        })
      : null;
  return {
    payload,
    bytes: utf8Length(payload),
    matrix,
    design,
    scene,
    adjustments,
    safety,
    bitmap: request.artifacts?.bitmap ? full : null,
    preview,
    png,
    svg,
    verification,
  };
}

/**
 * Bulk pipeline: only the matrix and the PNG bytes, no scene retention, so a
 * few hundred codes do not pin megabytes of RGBA in memory.
 */
export async function renderQrPng(
  payload: string,
  input: QrDesign,
  logo: QrLogoImage | null,
  options: { verify?: boolean; preview?: number } = {},
): Promise<{
  png: Uint8Array;
  bitmap: QrBitmap | null;
  verification: QrVerification | null;
  matrix: QrMatrix;
  design: QrDesign;
}> {
  const { design } = clampDesign(input, { hasLogo: Boolean(logo) });
  const matrix = createMatrix(payload, design.errorLevel, {
    boost: design.boost,
  });
  const scene = buildScene(matrix, design, logo);
  const bitmap = rasterizeScene(scene);
  const png = await encodePng(bitmap);
  const verification = options.verify
    ? verifyBitmap(bitmap, payload, {
        totalModules: matrix.size + design.margin * 2,
      })
    : null;
  return {
    png,
    bitmap: options.preview ? bitmap : null,
    verification,
    matrix,
    design,
  };
}
