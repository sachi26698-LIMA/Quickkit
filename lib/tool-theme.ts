import type { CSSProperties } from "react";
import type { ToolCategory } from "@/lib/catalog";

/**
 * Colour identity for each tool page.
 *
 * Each tool owns an explicit accent, shared by listing cards, related links,
 * 3D icons and its workspace. Category colours remain the fallback for new
 * tools, not a restriction on the palette of existing tools.
 *
 *  rgb   primary accent as "r g b" (used with alpha in CSS)
 *  rgb2  secondary accent (gradient partner / highlights)
 *  deep  text-safe darker shade of the primary (≥ 4.5:1 on white)
 */
export type ToolTheme = { rgb: string; rgb2: string; deep: string };

const t = (rgb: string, rgb2: string, deep: string): ToolTheme => ({
  rgb,
  rgb2,
  deep,
});

export const toolThemes: Record<string, ToolTheme> = {
  // PDF Tools — distinct accents for each document task
  "merge-pdf": t("109 40 217", "168 85 255", "#5b21b6"),
  "split-pdf": t("234 88 12", "251 146 60", "#9a3412"),
  "compress-pdf": t("5 150 105", "52 211 153", "#065f46"),
  "pdf-to-image": t("219 39 119", "244 114 182", "#9d174d"),
  "images-to-pdf": t("2 132 199", "56 189 248", "#075985"),
  "pdf-studio": t("79 70 229", "129 140 248", "#3730a3"),
  "word-to-pdf": t("37 99 235", "96 165 250", "#1e40af"),
  "pdf-to-word": t("13 148 136", "45 212 191", "#115e59"),
  "pdf-lock-unlock": t("180 83 9", "251 191 36", "#78350f"),
  // Image Tools — rose, cyan, violet and amber
  "image-compressor": t("244 63 94", "251 113 133", "#9f1239"),
  "image-resizer": t("0 153 173", "34 211 238", "#155e75"),
  "image-cropper": t("139 92 246", "196 181 253", "#5b21b6"),
  "image-to-image": t("217 119 6", "251 191 36", "#92400e"),
  // QR & Barcode
  "qr-code-scanner": t("15 118 110", "45 212 191", "#134e4a"),
  "qr-generator": t("200 16 46", "255 59 48", "#991b1b"),
  // Text & Writing
  "word-counter": t("107 33 168", "183 148 246", "#6b21a8"),
  "image-to-text": t("3 105 161", "56 189 248", "#075985"),
  "case-converter": t("192 38 211", "232 121 249", "#86198f"),
  // Developer Tools
  "json-formatter": t("67 56 202", "6 182 212", "#3730a3"),
  "json-validator": t("8 145 178", "34 211 238", "#155e75"),
  "html-formatter": t("249 115 22", "253 186 116", "#9a3412"),
  "css-minifier": t("16 185 129", "110 231 183", "#065f46"),
  "javascript-minifier": t("202 138 4", "250 204 21", "#854d0e"),
  "base64-encoder-decoder": t("126 34 206", "192 132 252", "#581c87"),
  "url-encoder-decoder": t("6 182 212", "103 232 249", "#155e75"),
  "uuid-generator": t("190 24 93", "244 63 94", "#9d174d"),
  "regex-tester": t("147 51 234", "216 180 254", "#6b21a8"),
  "hash-generator": t("22 163 74", "74 222 128", "#166534"),
  "xml-formatter": t("14 165 233", "125 211 252", "#075985"),

  // Security & Privacy — teal
  "password-generator": t("17 139 119", "20 184 166", "#115e59"),
  // Calculators — distinct accents across finance, health and converters
  "percentage-calculator": t("29 78 216", "96 165 250", "#1e3a8a"),
  "bmi-calculator": t("101 163 13", "163 230 53", "#3f6212"),
  "discount-calculator": t("225 29 72", "251 113 133", "#9f1239"),
  "gst-calculator": t("21 128 61", "74 222 128", "#14532d"),
  "age-calculator": t("217 70 239", "240 171 252", "#86198f"),
  "date-difference-calculator": t("124 58 237", "167 139 250", "#5b21b6"),
  "emi-calculator": t("30 58 138", "59 130 246", "#1e3a8a"),
  "loan-calculator": t("4 120 87", "52 211 153", "#064e3b"),
  "scientific-calculator": t("55 48 163", "129 140 248", "#312e81"),
  "unit-converter": t("14 116 144", "103 232 249", "#164e63"),
  "temperature-converter": t("220 38 38", "251 146 60", "#991b1b"),
  "time-converter": t("71 85 105", "148 163 184", "#334155"),
};

/** Category family used for any tool that has no explicit entry yet. */
const categoryFallback: Record<ToolCategory, ToolTheme> = {
  "PDF Tools": toolThemes["merge-pdf"],
  "Image Tools": toolThemes["image-compressor"],
  "QR & Barcode": toolThemes["qr-generator"],
  "Text & Writing": toolThemes["word-counter"],
  "Developer Tools": toolThemes["json-formatter"],
  Calculators: toolThemes["percentage-calculator"],
  "Security & Privacy": toolThemes["password-generator"],
  "AI Tools": t("192 38 211", "124 58 237", "#a21caf"),
};

export function toolTheme(slug: string, category: ToolCategory): ToolTheme {
  return toolThemes[slug] ?? categoryFallback[category];
}

/** Inline CSS variables consumed by app/tool-pages.css. */
export function toolThemeStyle(theme: ToolTheme): CSSProperties {
  return {
    "--t-rgb": theme.rgb,
    "--t2-rgb": theme.rgb2,
    "--t-deep": theme.deep,
  } as CSSProperties;
}

/** Glass-card tokens shared by discovery cards and related-tool links. */
export function toolSurfaceStyle(theme: ToolTheme): CSSProperties {
  return {
    "--c-rgb": theme.rgb,
    "--c2-rgb": theme.rgb2,
    "--c-deep": theme.deep,
  } as CSSProperties;
}

/** Apply on the icon itself so category tone classes cannot override it. */
export function toolIconStyle(theme: ToolTheme): CSSProperties {
  return {
    ...toolSurfaceStyle(theme),
    "--i-hi": `color-mix(in srgb, rgb(${theme.rgb}) 40%, white)`,
    "--i-mid": `rgb(${theme.rgb})`,
    "--i-deep": theme.deep,
    "--i-dark": `color-mix(in srgb, ${theme.deep} 72%, black)`,
    "--i-light": `color-mix(in srgb, rgb(${theme.rgb}) 12%, white)`,
    "--i-glow": theme.rgb,
  } as CSSProperties;
}
