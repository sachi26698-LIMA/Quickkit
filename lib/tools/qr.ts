export const MAX_QR_BYTES = 2000;
export type QrErrorLevel = "L" | "M" | "Q" | "H";
export type QrOptions = {
  size: number;
  errorLevel: QrErrorLevel;
  foreground: string;
  background: string;
};
export const defaultQrOptions: QrOptions = {
  size: 768,
  errorLevel: "M",
  foreground: "#171b2e",
  background: "#ffffff",
};
export const QR_SIZES = [256, 512, 768, 1024] as const;

export function validateQr(text: string) {
  if (!text.trim())
    throw new Error("Enter text or a URL to generate a QR code.");
  if (new TextEncoder().encode(text).length > MAX_QR_BYTES)
    throw new Error(
      "Keep QR content within 2,000 UTF-8 bytes. Shorter content is easier to scan.",
    );
  return text;
}

export function qrByteLength(text: string) {
  return new TextEncoder().encode(text).length;
}

function hexToRgb(hex: string) {
  const clean = hex.replace(/^#/, "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  if (!/^[0-9a-f]{6}$/i.test(full)) return null;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
}

function luminance(hex: string) {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const [r, g, b] = rgb.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two hex colors (1–21). */
export function contrastRatio(a: string, b: string) {
  const la = luminance(a);
  const lb = luminance(b);
  if (la === null || lb === null) return 0;
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

export function validateQrOptions(options: QrOptions) {
  if (!QR_SIZES.includes(options.size as (typeof QR_SIZES)[number]))
    throw new Error("Choose a supported QR size.");
  if (!["L", "M", "Q", "H"].includes(options.errorLevel))
    throw new Error("Choose a supported error-correction level.");
  if (!hexToRgb(options.foreground) || !hexToRgb(options.background))
    throw new Error("Choose valid QR colors.");
  if (contrastRatio(options.foreground, options.background) < 3)
    throw new Error(
      "Those colors are too close together for scanners. Pick a darker code color on a lighter background (contrast at least 3:1).",
    );
  return options;
}
