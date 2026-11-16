import type { CSSProperties } from "react";
import type { ToolCategory } from "@/lib/catalog";

/**
 * Colour identity for each tool page.
 *
 * Every tool owns one accent that no other tool uses, shared by its listing
 * card, related links, 3D icon and workspace. The 56 accents are spread over
 * the whole colour wheel and over light and dark shades so that any two tools
 * are told apart at a glance, and tools listed in the same category sit
 * further apart still because their cards are shown side by side. Both
 * distances are enforced in tests/tool-theme.test.tsx (measured in OKLab, a
 * colour space built to match what the eye sees), so adding a tool with a
 * look-alike colour fails the build instead of reaching the site.
 *
 * Category colours remain the fallback for a tool that has no entry yet.
 *
 *  rgb   primary accent as "r g b" (used with alpha in CSS)
 *  rgb2  lighter partner of the same hue (gradients / highlights)
 *  deep  text-safe darker shade of the primary (≥ 4.5:1 on white). Buttons
 *        put white text on a gradient from `deep` towards `rgb`, so `deep`
 *        must also keep that gradient dark enough.
 */
export type ToolTheme = { rgb: string; rgb2: string; deep: string };

const t = (rgb: string, rgb2: string, deep: string): ToolTheme => ({
  rgb,
  rgb2,
  deep,
});

export const toolThemes: Record<string, ToolTheme> = {
  // PDF Tools
  "merge-pdf": t("109 40 217", "168 85 255", "#5b21b6"),
  "split-pdf": t("243 87 10", "253 168 139", "#8d2f05"),
  "compress-pdf": t("34 92 0", "78 136 56", "#174300"),
  "pdf-to-image": t("195 60 160", "247 110 208", "#87216e"),
  "images-to-pdf": t("5 64 176", "53 112 227", "#002c88"),
  "pdf-studio": t("142 6 70", "193 67 112", "#6a0232"),
  "word-to-pdf": t("210 95 251", "232 179 254", "#76308f"),
  "pdf-to-word": t("29 150 109", "89 198 154", "#005c40"),
  "pdf-lock-unlock": t("193 161 69", "239 206 115", "#554306"),
  // Image Tools
  "image-compressor": t("244 63 94", "251 113 133", "#9f1239"),
  "image-resizer": t("48 188 117", "108 238 163", "#02502d"),
  "image-cropper": t("111 91 233", "155 149 255", "#4a3ba2"),
  "image-to-image": t("166 10 138", "218 76 185", "#7e1869"),
  // QR & Barcode
  "qr-generator": t("200 16 46", "255 59 48", "#991b1b"),
  "qr-code-scanner": t("6 160 176", "86 208 224", "#075761"),
  "barcode-generator": t("43 198 28", "101 245 89", "#054b01"),
  "barcode-scanner": t("122 146 252", "184 200 254", "#3745a8"),
  "barcode-developer": t("241 10 243", "254 157 251", "#7b237b"),
  "batch-studio": t("238 98 163", "254 176 207", "#931f5b"),
  "batch-code-checker": t("2 90 141", "62 135 189", "#02436b"),
  "gs1-intelligence": t("154 38 250", "186 134 253", "#5f2d93"),
  "product-lookup": t("151 81 5", "200 126 64", "#743c01"),
  // Text & Writing
  "word-counter": t("92 40 160", "134 88 210", "#45157e"),
  "image-to-text": t("25 114 251", "118 170 254", "#0e49a5"),
  "case-converter": t("192 38 211", "232 121 249", "#86198f"),
  // Developer Tools
  "json-formatter": t("66 69 253", "116 140 252", "#313da0"),
  "json-validator": t("6 144 222", "112 191 254", "#055484"),
  "html-formatter": t("239 134 25", "254 195 150", "#6f3b05"),
  "css-minifier": t("158 107 243", "197 171 253", "#6239a0"),
  "javascript-minifier": t("135 151 58", "181 198 106", "#4b5701"),
  "base64-encoder-decoder": t("122 29 118", "170 77 164", "#60005d"),
  "url-encoder-decoder": t("26 134 16", "82 181 73", "#0a5b04"),
  "uuid-generator": t("214 17 109", "253 107 156", "#8c0e46"),
  "regex-tester": t("196 84 49", "248 131 95", "#8c2800"),
  "hash-generator": t("58 187 177", "111 233 222", "#094a45"),
  "xml-formatter": t("86 101 119", "129 145 164", "#3e4c5d"),
  // Security & Privacy
  "password-generator": t("40 165 29", "97 214 86", "#085e02"),
  "advanced-cryptography": t("160 19 7", "212 76 60", "#7c0300"),
  "dns-email-security": t("192 124 59", "242 171 107", "#794300"),
  "website-security-review": t("23 4 249", "67 114 253", "#173392"),
  "privacy-metadata-manager": t("146 40 187", "194 93 238", "#6c2788"),
  "url-network-privacy": t("3 126 167", "75 173 216", "#095470"),
  "privacy-policy-workbench": t("245 17 169", "254 149 204", "#89195f"),
  "api-credential-tools": t("100 103 0", "144 148 62", "#4d5004"),
  // Calculators
  "percentage-calculator": t("26 98 196", "75 145 247", "#01489f"),
  "bmi-calculator": t("148 180 31", "191 226 89", "#384700"),
  "discount-calculator": t("171 48 98", "223 96 142", "#8f144c"),
  "gst-calculator": t("7 116 76", "71 162 119", "#045738"),
  "age-calculator": t("252 86 221", "253 183 235", "#882676"),
  "date-difference-calculator": t("68 7 206", "102 85 254", "#2f2087"),
  "emi-calculator": t("145 116 21", "192 162 77", "#5f4a01"),
  "loan-calculator": t("42 178 238", "156 218 253", "#004966"),
  "scientific-calculator": t("123 55 2", "171 98 55", "#5c2700"),
  "unit-converter": t("188 138 237", "223 195 253", "#65338e"),
  "temperature-converter": t("242 124 119", "252 192 187", "#922428"),
  "time-converter": t("114 137 161", "159 183 209", "#3d5268"),
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
