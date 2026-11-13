import type { CSSProperties } from "react";
import type { ToolCategory } from "@/lib/catalog";

/**
 * Colour identity for each tool page.
 *
 * Every category owns a family (PDF → violet, Image → coral/pink, QR → red,
 * Calculators → blue, Developer → indigo/cyan, Security → teal, Text → plum),
 * and each tool inside a family gets a small, deliberate shift of its primary
 * and secondary accent so pages feel individual without leaving the family.
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
  // PDF Tools — violet family
  "merge-pdf": t("109 40 217", "168 85 255", "#5b21b6"),
  "split-pdf": t("147 51 234", "232 121 249", "#6b21a8"),
  "compress-pdf": t("91 33 182", "99 102 241", "#4c1d95"),
  "pdf-to-image": t("124 58 237", "244 114 182", "#5b21b6"),
  "images-to-pdf": t("126 34 206", "236 72 153", "#6b21a8"),
  "pdf-studio": t("79 70 229", "168 85 247", "#4338ca"),
  "word-to-pdf": t("99 52 224", "59 130 246", "#4c1d95"),
  "pdf-to-word": t("109 40 217", "14 165 233", "#5b21b6"),
  "pdf-lock-unlock": t("88 28 135", "192 38 211", "#581c87"),
  // Image Tools — coral / pink family
  "image-compressor": t("255 62 130", "255 112 74", "#be123c"),
  "image-resizer": t("244 63 94", "251 146 60", "#be123c"),
  "image-cropper": t("236 72 153", "255 112 74", "#be185d"),
  "image-to-image": t("240 84 60", "236 72 153", "#ad3508"),
  // QR & Barcode — red
  "qr-code-scanner": t("185 28 28", "251 113 133", "#991b1b"),
  "qr-generator": t("200 16 46", "255 59 48", "#b91c1c"),
  "barcode-generator": t("194 40 22", "245 158 11", "#9a3412"),
  // Text & Writing — plum / lavender
  "word-counter": t("107 33 168", "183 148 246", "#6b21a8"),
  "image-to-text": t("134 25 143", "236 72 153", "#86198f"),
  "case-converter": t("126 34 206", "192 132 252", "#7e22ce"),
  // Developer Tools — each utility has its own indigo-family accent.
  "json-formatter": t("67 56 202", "6 182 212", "#3730a3"),
  "json-validator": t("8 145 178", "34 211 238", "#0e7490"),
  "html-formatter": t("234 88 12", "251 146 60", "#c2410c"),
  "css-minifier": t("13 148 136", "45 212 191", "#0f766e"),
  "javascript-minifier": t("180 83 9", "245 158 11", "#a16207"),
  "base64-encoder-decoder": t("107 33 168", "183 148 246", "#581c87"),
  "url-encoder-decoder": t("14 116 144", "34 211 238", "#0e7490"),
  "uuid-generator": t("190 24 93", "244 63 94", "#9d174d"),
  "regex-tester": t("124 58 237", "192 38 211", "#6d28d9"),
  "hash-generator": t("5 150 105", "20 184 166", "#047857"),
  "xml-formatter": t("2 132 199", "6 182 212", "#0369a1"),

  // Security & Privacy — teal
  "password-generator": t("13 148 136", "20 184 166", "#0f766e"),
  // Calculators — blue family
  "percentage-calculator": t("29 78 216", "14 165 233", "#1d4ed8"),
  "bmi-calculator": t("2 132 199", "20 184 166", "#0369a1"),
  "discount-calculator": t("37 99 235", "139 92 246", "#1d4ed8"),
  "gst-calculator": t("3 105 161", "16 185 129", "#075985"),
  "age-calculator": t("59 130 246", "34 211 238", "#1d4ed8"),
  "date-difference-calculator": t("30 64 175", "99 102 241", "#1e40af"),
  "emi-calculator": t("30 58 138", "56 189 248", "#1e3a8a"),
  "loan-calculator": t("29 78 216", "45 212 191", "#1e40af"),
  "scientific-calculator": t("55 48 163", "59 130 246", "#312e81"),
  "unit-converter": t("8 145 178", "59 130 246", "#0e7490"),
  "temperature-converter": t("2 132 199", "251 146 60", "#0369a1"),
  "time-converter": t("79 70 229", "14 165 233", "#3730a3"),
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
