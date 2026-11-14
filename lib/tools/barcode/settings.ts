/**
 * Studio settings: defaults, per-format presets and the sanitiser that stands
 * between `localStorage` and the renderer.
 *
 * Nothing stored here is trusted on the way back in — a stale or hand-edited
 * value must never reach `buildLayout` unclamped, or a user could end up with a
 * one-pixel-tall barcode and no explanation.
 */
import { normalizeHex } from "@/lib/tools/qr/colour";
import type { BarcodeTextAlign, BarcodeRenderOptions } from "./layout";
import type {
  BarcodeChecksumOption,
  BarcodeFormatId,
  BarcodeNumberSystem,
} from "./types";

export type BarcodeStudioSettings = {
  format: BarcodeFormatId;
  data: string;
  moduleWidth: number;
  barHeight: number;
  quietZone: number;
  margin: number;
  foreground: string;
  background: string;
  transparent: boolean;
  showText: boolean;
  fontFamily: string;
  fontSize: number;
  textAlign: BarcodeTextAlign;
  title: string;
  description: string;
  checksum: BarcodeChecksumOption;
  numberSystem: BarcodeNumberSystem;
  guardBars: boolean;
  /** PNG export density multiplier. */
  scale: number;
};

export const SETTINGS_KEY = "qk:barcode-studio-settings:v1";

export const FONT_CHOICES = [
  {
    id: "system",
    label: "System sans",
    stack:
      "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  },
  { id: "arial", label: "Arial", stack: "Arial, Helvetica, sans-serif" },
  {
    id: "helvetica",
    label: "Helvetica",
    stack: "Helvetica, Arial, sans-serif",
  },
  { id: "verdana", label: "Verdana", stack: "Verdana, Geneva, sans-serif" },
  {
    id: "georgia",
    label: "Georgia",
    stack: "Georgia, 'Times New Roman', serif",
  },
  { id: "times", label: "Times", stack: "'Times New Roman', Times, serif" },
  {
    id: "mono",
    label: "Monospace",
    stack:
      "ui-monospace, 'SFMono-Regular', Consolas, 'Liberation Mono', monospace",
  },
  {
    id: "courier",
    label: "Courier",
    stack: "'Courier New', Courier, monospace",
  },
] as const;

/** Short, honest descriptions used by the format picker. */
export const FORMAT_PRESETS: Record<
  BarcodeFormatId,
  {
    barHeight: number;
    quietZone: number;
    moduleWidth: number;
    fontSize: number;
  }
> = {
  code128: { barHeight: 96, quietZone: 10, moduleWidth: 2.4, fontSize: 13 },
  "gs1-128": { barHeight: 96, quietZone: 10, moduleWidth: 2.4, fontSize: 13 },
  code39: { barHeight: 96, quietZone: 10, moduleWidth: 2.4, fontSize: 13 },
  code93: { barHeight: 96, quietZone: 10, moduleWidth: 2.2, fontSize: 13 },
  ean13: { barHeight: 104, quietZone: 11, moduleWidth: 2.6, fontSize: 14 },
  ean8: { barHeight: 88, quietZone: 9, moduleWidth: 2.8, fontSize: 14 },
  upca: { barHeight: 104, quietZone: 9, moduleWidth: 2.6, fontSize: 14 },
  upce: { barHeight: 88, quietZone: 9, moduleWidth: 2.8, fontSize: 14 },
  itf14: { barHeight: 104, quietZone: 10, moduleWidth: 2.6, fontSize: 13 },
  codabar: { barHeight: 88, quietZone: 10, moduleWidth: 2.6, fontSize: 13 },
  msi: { barHeight: 88, quietZone: 12, moduleWidth: 2.6, fontSize: 13 },
  pharmacode: { barHeight: 104, quietZone: 6, moduleWidth: 3, fontSize: 13 },
};

export const defaultSettings: BarcodeStudioSettings = {
  format: "code128",
  data: "QUICKKIT-2026",
  moduleWidth: 2.4,
  barHeight: 96,
  quietZone: 10,
  margin: 16,
  foreground: "#111827",
  background: "#ffffff",
  transparent: false,
  showText: true,
  fontFamily: FONT_CHOICES[0].stack,
  fontSize: 13,
  textAlign: "center",
  title: "",
  description: "",
  checksum: "none",
  numberSystem: 0,
  guardBars: true,
  scale: 3,
};

const FORMAT_IDS: BarcodeFormatId[] = [
  "code128",
  "code39",
  "code93",
  "ean13",
  "ean8",
  "upca",
  "upce",
  "itf14",
  "codabar",
  "msi",
  "pharmacode",
  "gs1-128",
];

export function isBarcodeFormat(value: unknown): value is BarcodeFormatId {
  return typeof value === "string" && (FORMAT_IDS as string[]).includes(value);
}

const clamp = (value: unknown, min: number, max: number, fallback: number) => {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
};

const text = (value: unknown, max: number, fallback = "") =>
  typeof value === "string" ? value.slice(0, max) : fallback;

/** One sanitiser for stored settings and for share/preset payloads. */
export function sanitizeSettings(input: unknown): BarcodeStudioSettings {
  const source = (input && typeof input === "object" ? input : {}) as Record<
    string,
    unknown
  >;
  const format = isBarcodeFormat(source.format)
    ? source.format
    : defaultSettings.format;
  const align: BarcodeTextAlign =
    source.textAlign === "left" || source.textAlign === "right"
      ? source.textAlign
      : "center";
  const checksum: BarcodeChecksumOption =
    source.checksum === "mod10" ||
    source.checksum === "mod11" ||
    source.checksum === "mod43"
      ? source.checksum
      : "none";
  const fontFamily =
    FONT_CHOICES.find((choice) => choice.stack === source.fontFamily)?.stack ??
    defaultSettings.fontFamily;
  return {
    format,
    data: text(source.data, 256, defaultSettings.data),
    moduleWidth: clamp(
      source.moduleWidth,
      0.75,
      16,
      FORMAT_PRESETS[format].moduleWidth,
    ),
    barHeight: clamp(
      source.barHeight,
      24,
      600,
      FORMAT_PRESETS[format].barHeight,
    ),
    quietZone: clamp(source.quietZone, 0, 40, FORMAT_PRESETS[format].quietZone),
    margin: clamp(source.margin, 0, 80, defaultSettings.margin),
    foreground: normalizeHex(
      typeof source.foreground === "string" ? source.foreground : "",
      defaultSettings.foreground,
    ),
    background: normalizeHex(
      typeof source.background === "string" ? source.background : "",
      defaultSettings.background,
    ),
    transparent: Boolean(source.transparent),
    showText: source.showText === undefined ? true : Boolean(source.showText),
    fontFamily,
    fontSize: clamp(source.fontSize, 7, 40, FORMAT_PRESETS[format].fontSize),
    textAlign: align,
    title: text(source.title, 80),
    description: text(source.description, 160),
    checksum,
    numberSystem: source.numberSystem === 1 ? 1 : 0,
    guardBars:
      source.guardBars === undefined ? true : Boolean(source.guardBars),
    scale: clamp(source.scale, 1, 6, defaultSettings.scale),
  };
}

/** Options bag for `buildLayout`, derived from studio settings. */
export function renderOptionsFrom(
  settings: BarcodeStudioSettings,
): BarcodeRenderOptions {
  return {
    moduleWidth: settings.moduleWidth,
    barHeight: settings.barHeight,
    quietZone: settings.quietZone,
    margin: settings.margin,
    foreground: settings.foreground,
    background: settings.background,
    transparent: settings.transparent,
    showText: settings.showText,
    fontFamily: settings.fontFamily,
    fontSize: settings.fontSize,
    textAlign: settings.textAlign,
    title: settings.title,
    description: settings.description,
    guardExtension: settings.showText
      ? Math.round(settings.fontSize * 0.55)
      : 0,
  };
}

/** Apply a format's preset geometry, keeping anything the user typed. */
export function applyFormatPreset(
  settings: BarcodeStudioSettings,
  format: BarcodeFormatId,
): BarcodeStudioSettings {
  const preset = FORMAT_PRESETS[format];
  return {
    ...settings,
    format,
    moduleWidth: preset.moduleWidth,
    barHeight: preset.barHeight,
    quietZone: preset.quietZone,
    fontSize: preset.fontSize,
    checksum:
      format === "code39"
        ? "none"
        : format === "msi"
          ? "mod10"
          : settings.checksum,
  };
}

export function loadSettings(): BarcodeStudioSettings {
  if (typeof localStorage === "undefined") return defaultSettings;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaultSettings;
    return sanitizeSettings(JSON.parse(raw));
  } catch {
    return defaultSettings;
  }
}

export function saveSettings(settings: BarcodeStudioSettings) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // A full quota or a locked-down browser must not break the tool.
  }
}
