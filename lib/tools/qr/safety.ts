/**
 * Static scannability analysis. Runs before any pixels exist so the UI can
 * warn while a control is being dragged, and so an unscannable design can be
 * stopped at export time with a specific reason instead of a shrug.
 */
import { effectiveContrast, MIN_CONTRAST, GOOD_CONTRAST } from "./colour";
import { modulesUnderLogo, type QrMatrix } from "./matrix";
import type { QrDesign } from "./types";

export type SafetyLevel = "good" | "caution" | "blocked";
export type SafetyFinding = {
  level: "caution" | "blocked";
  field: string;
  message: string;
  /** What the "make it safe" action changes for this finding. */
  fix?: Partial<QrDesign>;
};

export type SafetyReport = {
  level: SafetyLevel;
  contrast: number;
  quietZone: number;
  /** Pixels per module at the chosen output size; 0 while there is no symbol. */
  modulePx: number;
  logoCoverage: number;
  findings: SafetyFinding[];
};

export function analyzeScannability(
  design: QrDesign,
  matrix: QrMatrix | null,
  options: { hasLogo: boolean },
): SafetyReport {
  const findings: SafetyFinding[] = [];
  const contrast = effectiveContrast(design.fg, design.bg);
  const total = matrix ? matrix.size + design.margin * 2 : 0;
  const modulePx = matrix ? design.size / total : 0;
  let logoCoverage = 0;

  if (contrast < MIN_CONTRAST)
    findings.push({
      level: contrast < 1.4 ? "blocked" : "caution",
      field: "fg",
      message:
        contrast < 1.4
          ? `Foreground and background are almost the same colour (${contrast.toFixed(2)}:1) — a scanner cannot separate them.`
          : `Contrast is ${contrast.toFixed(2)}:1. QR codes want at least ${MIN_CONTRAST}:1: darken the modules or lighten the field.`,
      fix: {
        fg: { kind: "solid", base: "#17152b", accent: "#17152b", angle: 0 },
        bg: { kind: "solid", base: "#ffffff", accent: "#ffffff", angle: 0 },
      },
    });
  else if (contrast < GOOD_CONTRAST)
    findings.push({
      level: "caution",
      field: "fg",
      message: `Contrast is ${contrast.toFixed(2)}:1 — workable, but ${GOOD_CONTRAST}:1 or better prints more reliably.`,
    });

  if (design.margin < 2)
    findings.push({
      level: design.margin === 0 ? "blocked" : "caution",
      field: "margin",
      message:
        design.margin === 0
          ? "There is no quiet zone, so the code has no light border for a camera to lock onto."
          : `The quiet zone is only ${design.margin} module${design.margin === 1 ? "" : "s"}; the QR spec asks for 4.`,
      fix: { margin: 4 },
    });

  if (matrix) {
    if (modulePx < 2.2)
      findings.push({
        level: "blocked",
        field: "size",
        message: `Each module is ${modulePx.toFixed(2)} px at ${design.size} px — too small to resolve. Export a larger file or shorten the payload.`,
        fix: {
          size: Math.min(2048, Math.round(design.size * (3.2 / modulePx))),
        },
      });
    else if (modulePx < 3.2 && design.dotStyle !== "square")
      findings.push({
        level: "caution",
        field: "size",
        message: `Styled modules are ${modulePx.toFixed(2)} px each and can soften in print — 4 px per module is safer.`,
        fix: { size: Math.min(2048, Math.round(design.size * (4 / modulePx))) },
      });
    if (matrix.version >= 25)
      findings.push({
        level: "caution",
        field: "text",
        message: `Version ${matrix.version} is dense (${matrix.size}×${matrix.size} modules). Print it at least ${(matrix.size * 0.6).toFixed(0)} mm across for phone cameras.`,
      });
  }

  if (options.hasLogo) {
    if (design.errorLevel === "L")
      findings.push({
        level: "blocked",
        field: "errorLevel",
        message:
          "A logo covers data, so level L has too little redundancy. Use Q or H.",
        fix: { errorLevel: "Q" },
      });
    if (matrix) {
      const coverage = modulesUnderLogo(matrix, design.logo, design.margin);
      logoCoverage = coverage.darkCovered / (matrix.size * matrix.size);
      if (logoCoverage > 0.06)
        findings.push({
          level: logoCoverage > 0.13 ? "caution" : "caution",
          field: "logo.scale",
          message: `The logo covers ${Math.round(logoCoverage * 100)}% of the code's dark modules. Keep error correction at H if it must stay this big.`,
          fix: { errorLevel: "H", logo: { ...design.logo, scale: 0.16 } },
        });
    }
  }

  if (design.transparent)
    findings.push({
      level: "caution",
      field: "transparent",
      message:
        "Transparent PNG: place it on a light surface. A dark page or photo behind it reverses the contrast.",
    });
  if (design.invert)
    findings.push({
      level: "caution",
      field: "invert",
      message:
        "Inverted colours scan on most phones but fail on many cheap readers and kiosks.",
    });

  const level: SafetyLevel = findings.some((f) => f.level === "blocked")
    ? "blocked"
    : findings.length
      ? "caution"
      : "good";
  return {
    level,
    contrast,
    quietZone: design.margin,
    modulePx,
    logoCoverage,
    findings,
  };
}

/** Design changes that clear every fixable finding, for the "make it safe" button. */
export function safeFixDesign(
  design: QrDesign,
  report: SafetyReport,
): QrDesign {
  let next: QrDesign = { ...design };
  for (const finding of report.findings)
    if (finding.fix) next = { ...next, ...finding.fix };
  if (effectiveContrast(next.fg, next.bg) < MIN_CONTRAST)
    next = {
      ...next,
      fg: { kind: "solid", base: "#17152b", accent: "#17152b", angle: 0 },
      bg: { kind: "solid", base: "#ffffff", accent: "#ffffff", angle: 0 },
    };
  return next;
}
