/**
 * Design model: defaults, safety clamping and premium templates.
 * Colour maths lives in `colour.ts` and is re-exported here for convenience.
 *
 * `clampDesign` is the single place that decides what styling is allowed. It
 * never rejects silently — every adjustment it makes comes back as a note the
 * UI shows next to the control that caused it.
 */
import {
  LOGO_SCALE_MAX,
  LOGO_SCALE_MIN,
  QR_MARGIN_MAX,
  QR_MARGIN_MIN,
  QR_SIZE_MAX,
  QR_SIZE_MIN,
  type QrDesign,
  type QrDotStyle,
  type QrErrorLevel,
  type QrEyeStyle,
  type QrFill,
  type QrFillKind,
} from "./types";

export const DOT_STYLES: { id: QrDotStyle; label: string; hint: string }[] = [
  { id: "square", label: "Square", hint: "Classic blocks, most robust" },
  { id: "rounded", label: "Rounded", hint: "Soft corners, still solid" },
  { id: "dots", label: "Dots", hint: "Circular modules, designer look" },
  { id: "classy", label: "Classy", hint: "One angled corner per module" },
  {
    id: "classy-rounded",
    label: "Classy soft",
    hint: "Angled and rounded, needs ≥256 px",
  },
];

export const EYE_STYLES: { id: QrEyeStyle; label: string }[] = [
  { id: "square", label: "Square eyes" },
  { id: "rounded", label: "Rounded eyes" },
  { id: "dots", label: "Round eyes" },
  { id: "classy", label: "Soft square" },
  { id: "circle", label: "Circle outline" },
];

export const FILL_KINDS: { id: QrFillKind; label: string }[] = [
  { id: "solid", label: "Solid" },
  { id: "linear", label: "Linear gradient" },
  { id: "radial", label: "Radial gradient" },
];

export const ERROR_LEVELS: { id: QrErrorLevel; label: string; help: string }[] =
  [
    { id: "L", label: "L · 7%", help: "Smallest, densest payload" },
    { id: "M", label: "M · 15%", help: "Recommended for print" },
    { id: "Q", label: "Q · 25%", help: "Needed for logo overlays" },
    { id: "H", label: "H · 30%", help: "Best for damage, product labels" },
  ];

import {
  GOOD_CONTRAST,
  MIN_CONTRAST,
  contrastRatio,
  effectiveContrast,
  hexToRgb,
  isHexColor,
  mixHex,
  normalizeHex,
} from "./colour";

export {
  contrastRatio,
  effectiveContrast,
  hexToRgb,
  isHexColor,
  normalizeHex,
  mixHex,
  MIN_CONTRAST,
  GOOD_CONTRAST,
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

export function readFill(input: unknown, fallback: QrFill): QrFill {
  if (!input || typeof input !== "object") return { ...fallback };
  const raw = input as Record<string, unknown>;
  const kind: QrFillKind =
    raw.kind === "linear" || raw.kind === "radial"
      ? raw.kind
      : raw.kind === "solid"
        ? "solid"
        : fallback.kind;
  const base = isHexColor(String(raw.base ?? ""))
    ? normalizeHex(String(raw.base))
    : fallback.base;
  const accentSource =
    raw.accent === undefined ? fallback.accent : String(raw.accent);
  const accent =
    kind === "solid" || !isHexColor(accentSource)
      ? accentSource && isHexColor(accentSource)
        ? normalizeHex(accentSource)
        : base
      : normalizeHex(accentSource, base);
  return {
    kind,
    base,
    accent,
    angle: clamp(Number(raw.angle ?? fallback.angle ?? 135), 0, 359),
  };
}

export function defaultDesign(): QrDesign {
  return {
    fg: { kind: "solid", base: "#2a1b5e", accent: "#6c35e8", angle: 135 },
    bg: { kind: "solid", base: "#ffffff", accent: "#ffffff", angle: 135 },
    dotStyle: "square",
    eyeStyle: "square",
    dotScale: 0.92,
    cornerRadius: 0.18,
    margin: 4,
    size: 768,
    transparent: false,
    errorLevel: "M",
    boost: true,
    invert: false,
    logo: {
      scale: 0.18,
      offsetX: 0,
      offsetY: 0,
      padding: 0.6,
      shape: "rounded",
      halo: true,
      bg: null,
    },
    frame: { style: "none", text: "", fg: "#3b1b4f", bg: "#f4d7d4" },
    eyeFrame: null,
    eyeBall: null,
  };
}

/** Read a frame from untrusted input, falling back to the default. */
export function readFrame(input: unknown, fallback: QrDesign["frame"]) {
  if (!input || typeof input !== "object") return { ...fallback };
  const raw = input as Record<string, unknown>;
  const styles = [
    "none",
    "scan",
    "menu",
    "follow",
    "contact",
    "visit",
    "custom",
  ];
  const style = styles.includes(String(raw.style))
    ? (raw.style as QrDesign["frame"]["style"])
    : fallback.style;
  return {
    style,
    text: String(raw.text ?? fallback.text).slice(0, 40),
    fg: isHexColor(String(raw.fg ?? ""))
      ? normalizeHex(String(raw.fg))
      : fallback.fg,
    bg: isHexColor(String(raw.bg ?? ""))
      ? normalizeHex(String(raw.bg))
      : fallback.bg,
  };
}

/** Read an optional fill override (eye colours). null/absent stays null. */
export function readOptionalFill(input: unknown): QrFill | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Record<string, unknown>;
  if (!isHexColor(String(raw.base ?? ""))) return null;
  return readFill(raw, {
    kind: "solid",
    base: "#3b1b4f",
    accent: "#3b1b4f",
    angle: 0,
  });
}

export type DesignAdjustment = { field: string; message: string };

/**
 * Enforce the scannability floor. Returns the design to render plus a note for
 * every change made, so nothing is silently overridden.
 */
export function clampDesign(
  input: Partial<QrDesign> | undefined,
  options: { hasLogo?: boolean } = {},
): { design: QrDesign; adjustments: DesignAdjustment[] } {
  const base = defaultDesign();
  const raw = input ?? {};
  const adjustments: DesignAdjustment[] = [];
  const note = (field: string, message: string) =>
    adjustments.push({ field, message });

  const dotStyles = DOT_STYLES.map((style) => style.id);
  const eyeStyles = EYE_STYLES.map((style) => style.id);
  const dotStyle = dotStyles.includes(raw.dotStyle as QrDotStyle)
    ? (raw.dotStyle as QrDotStyle)
    : base.dotStyle;
  const eyeStyle = eyeStyles.includes(raw.eyeStyle as QrEyeStyle)
    ? (raw.eyeStyle as QrEyeStyle)
    : base.eyeStyle;

  const size = clamp(
    Math.round(Number(raw.size ?? base.size)),
    QR_SIZE_MIN,
    QR_SIZE_MAX,
  );
  if (size !== Number(raw.size))
    note(
      "size",
      `Output size was set to ${size} px (between ${QR_SIZE_MIN} and ${QR_SIZE_MAX} px).`,
    );

  const margin = clamp(
    Math.round(Number(raw.margin ?? base.margin)),
    QR_MARGIN_MIN,
    QR_MARGIN_MAX,
  );
  if (margin !== Number(raw.margin))
    note("margin", `Quiet zone set to ${margin} modules (0–${QR_MARGIN_MAX}).`);

  let dotScale = clamp(Number(raw.dotScale ?? base.dotScale), 0.55, 1);
  if (dotScale !== Number(raw.dotScale))
    note("dotScale", "Dot size kept between 55% and 100% of a module.");

  const cornerRadius = clamp(
    Number(raw.cornerRadius ?? base.cornerRadius),
    0,
    0.5,
  );
  if (cornerRadius !== Number(raw.cornerRadius))
    note("cornerRadius", "Corner roundness kept between 0 and 50%.");

  let errorLevel = (["L", "M", "Q", "H"] as QrErrorLevel[]).includes(
    raw.errorLevel as QrErrorLevel,
  )
    ? (raw.errorLevel as QrErrorLevel)
    : base.errorLevel;

  const logoScale = clamp(
    Number(raw.logo?.scale ?? base.logo.scale),
    LOGO_SCALE_MIN,
    LOGO_SCALE_MAX,
  );
  if (logoScale !== Number(raw.logo?.scale))
    note(
      "logo.scale",
      `Logo size capped at ${Math.round(LOGO_SCALE_MAX * 100)}% of the code — larger overlays cover too many modules.`,
    );

  if (options.hasLogo && errorLevel === "L") {
    errorLevel = "Q";
    note(
      "errorLevel",
      "A logo covers data, so error correction was raised to Q automatically.",
    );
  } else if (options.hasLogo && errorLevel === "M" && logoScale > 0.22) {
    errorLevel = "H";
    note(
      "errorLevel",
      "That logo is large, so error correction was raised to H automatically.",
    );
  }

  const transparent = Boolean(raw.transparent ?? base.transparent);
  if (
    transparent &&
    dotScale > 0.86 &&
    (dotStyle === "dots" || dotStyle === "classy-rounded")
  ) {
    dotScale = 0.86;
    note(
      "dotScale",
      "On a transparent background round dots were opened up slightly so neighbouring modules stay separate.",
    );
  }

  const invert = Boolean(raw.invert ?? base.invert);
  if (invert)
    note(
      "invert",
      "Light modules on a dark field. Many phone scanners handle it, cheap fixed-focus readers may not.",
    );
  if (margin < 2)
    note(
      "margin",
      "A quiet zone under 2 modules often fails to scan from a photo — keep a border when printing.",
    );
  if (dotStyle !== "square" && size < 256)
    note("size", "Styled modules need at least 256 px to stay crisp.");

  const design: QrDesign = {
    fg: readFill(raw.fg, base.fg),
    bg: readFill(raw.bg, base.bg),
    dotStyle,
    eyeStyle,
    dotScale,
    cornerRadius,
    margin,
    size,
    transparent,
    errorLevel,
    boost: raw.boost === undefined ? base.boost : Boolean(raw.boost),
    invert,
    logo: {
      scale: logoScale,
      offsetX: clamp(Number(raw.logo?.offsetX ?? 0), -0.34, 0.34),
      offsetY: clamp(Number(raw.logo?.offsetY ?? 0), -0.34, 0.34),
      padding: clamp(Number(raw.logo?.padding ?? base.logo.padding), 0, 3),
      shape: (["square", "rounded", "circle"] as const).includes(
        raw.logo?.shape as "square",
      )
        ? (raw.logo?.shape as QrDesign["logo"]["shape"])
        : base.logo.shape,
      halo:
        raw.logo?.halo === undefined ? base.logo.halo : Boolean(raw.logo.halo),
      bg:
        raw.logo?.bg && isHexColor(String(raw.logo.bg))
          ? normalizeHex(String(raw.logo.bg))
          : null,
    },
    frame: readFrame(raw.frame, base.frame),
    eyeFrame: readOptionalFill(raw.eyeFrame),
    eyeBall: readOptionalFill(raw.eyeBall),
  };
  return { design, adjustments };
}

/* ------------------------------------------------------------------ templates */

// The template library lives in ./templates (55 categorized, decode-verified
// designs). Re-exported here so existing imports keep working unchanged.
export {
  QR_TEMPLATES,
  QR_TEMPLATE_LIBRARY,
  TEMPLATE_CATEGORIES,
  templateById,
  categoryLabel,
  searchTemplates,
  type QrTemplate,
  type QrTemplateCategory,
} from "./templates";

/** Design without the volatile bits — what a preset actually stores. */
export function presetDesign(design: QrDesign): QrDesign {
  const { logo, ...rest } = design;
  return { ...rest, logo: { ...logo } };
}
