/**
 * Orchestration: payload → matrix → scene → pixels/SVG → safety + decode proof.
 *
 * Everything the workspace needs from one call, so the preview, the export
 * panel and the bulk pipeline all render through exactly the same code.
 */
import { buildScene, codeRegionRatio, type QrScene } from "./scene";
import { createMatrix, type QrMatrix } from "./matrix";
import { clampDesign, defaultDesign, type DesignAdjustment } from "./style";
import { analyzeScannability, type SafetyReport } from "./safety";
import { rasterizeScene, scaleBitmap, type QrBitmap } from "./raster";
import { encodePng } from "./png";
import { sceneToSvg } from "./svg";
import { verifyBitmap, type QrVerification } from "./verify";
import { utf8Length } from "./capacity";
import {
  QR_SIZE_MAX,
  QrUserError,
  type QrDesign,
  type QrErrorLevel,
  type QrLogoImage,
} from "./types";

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
  const clamped = clampDesign(base, {
    hasLogo: Boolean(request.logo),
  });
  const adjustments = clamped.adjustments;
  let design = clamped.design;
  let matrix = createMatrix(payload, design.errorLevel, {
    boost: design.boost,
  });
  // When no center logo is present and a compact pixel export would crowd
  // modules below ~3.5 px due to high ECC overhead, step ECC down so modules
  // stay large, crisp and reliably decodable (including light-on-dark palettes).
  // Stepping down alone is not always enough: a long Data Template payload can
  // stay under the threshold even at L, and a version-13 symbol crowded into a
  // 256 px preset becomes undecodable (measured: 0 of 6 decoder attempts, while
  // the same payload at 3.84 px/module decodes 4/4). Grow the canvas, which is
  // the remedy the safety analyser already offers for the same condition.
  if (!request.logo) {
    const region = design.size * codeRegionRatio(design);
    const minModulePx = 3.5;
    const candidates: QrErrorLevel[] = ["Q", "M", "L"];
    for (const candidate of candidates) {
      if (region / (matrix.size + design.margin * 2) >= minModulePx) break;
      matrix = createMatrix(payload, candidate, { boost: false });
    }
    // A dense symbol can be mathematically perfect and still fail a camera-style
    // decode once it is *styled* onto a fractional module grid: modules are laid
    // out at `codeSide / total` pixels, so unless that ratio is a whole number
    // the antialiased edges land differently on every module and smear into the
    // light field. Measured on a 109-module symbol (version 23, level M): the
    // same payload decodes at 4, 5 and 6 px per module when the pitch is whole
    // and fails at 4.27, 4.40 and 5.13 px per module when it is not — so this is
    // a pitch problem, not a "too small" problem, and a minimum px-per-module
    // rule cannot see it (it was reporting those renders as fine).
    //
    // Remedy: grow the canvas to the next size where `codeSide / total` is a
    // whole number, then *prove* it by decoding the real bitmap. Growing can
    // change the symbol's version (a bigger canvas fits more data per module),
    // which changes the pitch again, so re-resolve the matrix on each pass and
    // stop on the first size that decodes. Every bump is reported, so a
    // requested size is never silently abandoned.
    const ECC_ORDER: QrErrorLevel[] = ["L", "M", "Q", "H"];
    const snapToWholePitch = (candidate: typeof design, modules: number) => {
      const ratio = codeRegionRatio(candidate);
      if (ratio <= 0) return candidate.size;
      // Smallest size at or above the requested one whose code region divides
      // into `modules` equal whole-pixel cells.
      const wanted = candidate.size * ratio;
      const pitch = Math.max(1, Math.ceil(wanted / modules - 1e-9));
      const snapped = Math.ceil((pitch * modules) / ratio - 1e-9);
      return snapped <= candidate.size ? candidate.size : snapped;
    };
    // Density alone cannot predict this: a tiny canvas and a roomy one can both
    // land in a band where the styled modules stop decoding, and one encoder
    // version (23 at level L) emits a symbol no reader can lock onto at any
    // size. So when the caller asks for proof, decode the real bitmap and fix
    // what actually fails instead of trusting a px-per-module rule.
    if (request.verify && !request.artifacts?.svg) {
      const requestedLevel = design.errorLevel;
      const matrixAt = (level: QrErrorLevel) => {
        try {
          return createMatrix(payload, level, { boost: false });
        } catch {
          return null;
        }
      };
      // Probe the *candidate* symbol, not the one currently installed: matching
      // a new module count against the old bitmap reports a bogus verdict.
      const probeAt = (
        symbol: QrMatrix,
        candidate: typeof design,
        mods: number,
      ) => {
        const bitmap = rasterizeScene(buildScene(symbol, candidate, null));
        return verifyBitmap(bitmap, payload, { totalModules: mods }).ok;
      };
      const roundPitch = (size: number, mods: number) =>
        snapToWholePitch({ ...design, size }, mods);
      const trySymbol = (candidate: QrMatrix) => {
        const mods = candidate.size + design.margin * 2;
        const wanted = roundPitch(design.size, mods);
        if (wanted > QR_SIZE_MAX) return false;
        const nextDesign = { ...design, size: wanted };
        if (!probeAt(candidate, nextDesign, mods)) return false;
        matrix = candidate;
        if (wanted !== design.size) {
          adjustments.push({
            field: "size",
            message: `The output was raised to ${wanted} px so each of the ${mods} modules falls on whole pixels — at a fractional module size the styled edges smear and the code stops scanning.`,
          });
        }
        design = nextDesign;
        return true;
      };

      if (!probeAt(matrix, design, matrix.size + design.margin * 2)) {
        // Explain the failure on the payload's own symbol by trying a whole
        // pixel pitch first; it is the cheapest fix and the most common one.
        const initialModules = matrix.size + design.margin * 2;
        const pitched = roundPitch(design.size, initialModules);
        let fixed =
          pitched > design.size &&
          probeAt(matrix, { ...design, size: pitched }, initialModules);
        if (fixed) {
          design = { ...design, size: pitched };
          adjustments.push({
            field: "size",
            message: `The output was raised to ${pitched} px so each of the ${initialModules} modules falls on whole pixels — at a fractional module size the styled edges smear and the code stops scanning.`,
          });
        }
        // Then any stronger level the payload can still fit. Forced explicitly
        // with `boost: false`: auto-boosting would silently undo the choice.
        if (!fixed) {
          for (const level of ECC_ORDER) {
            if (ECC_ORDER.indexOf(level) <= ECC_ORDER.indexOf(requestedLevel))
              continue;
            const candidate = matrixAt(level);
            if (!candidate) continue;
            if (trySymbol(candidate)) {
              adjustments.push({
                field: "errorLevel",
                message: `Error correction was raised to level ${level} because the code did not read back at level ${requestedLevel}.`,
              });
              fixed = true;
              break;
            }
          }
        }
        let grew = false;
        if (!fixed) {
          // Last resort: more pixels for the same symbol.
          const mods = matrix.size + design.margin * 2;
          for (const factor of [1.15, 1.35, 1.6, 2]) {
            const grown = Math.min(
              QR_SIZE_MAX,
              Math.ceil(design.size * factor),
            );
            if (grown <= design.size) continue;
            if (probeAt(matrix, { ...design, size: grown }, mods)) {
              design = { ...design, size: grown };
              adjustments.push({
                field: "size",
                message: `The output was raised to ${grown} px because the ${mods}-module code did not read back at the size you asked for.`,
              });
              fixed = true;
              grew = true;
              break;
            }
          }
        }
        if (!fixed && !grew) {
          adjustments.push({
            field: "errorLevel",
            message: `This payload could not be read back at any size or error-correction level. It is close to the format's limit — shorten it and try again.`,
          });
        }
      }
    }
  }
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
          totalModules: Math.round(scene.size / scene.modulePx),
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
        totalModules: Math.round(scene.size / scene.modulePx),
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
