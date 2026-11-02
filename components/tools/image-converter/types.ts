import type {
  ConvertFormat,
  ConvertMode,
  InputFormat,
  InputKind,
} from "@/lib/tools/image-convert";

export type QueueStatus =
  | "inspecting"
  | "ready"
  | "converting"
  | "done"
  | "error"
  | "cancelled";

export type QueueItem = {
  id: string;
  file: File;
  /** Local object URL for the original image preview (never uploaded). */
  url: string;
  name: string;
  bytes: number;
  kind: InputKind;
  format: InputFormat;
  width?: number;
  height?: number;
  dpi?: number | null;
  pageCount?: number;
  status: QueueStatus;
  error?: string;
  /** Per-file target format in image mode; "auto" follows the shared setting. */
  override: ConvertFormat | "auto";
};

export type ConversionResult = {
  id: string;
  itemId: string;
  name: string;
  blob: Blob;
  url: string;
  format: ConvertFormat | "pdf";
  width?: number;
  height?: number;
  pages?: number;
  page?: number;
  sourceBytes: number;
  sourceWidth?: number;
  sourceHeight?: number;
  note?: string;
};

export type Message = { tone: "info" | "success" | "error"; text: string } | null;

export type ModeMeta = {
  id: ConvertMode;
  label: string;
  short: string;
};

export const MODE_META: readonly ModeMeta[] = [
  {
    id: "image",
    label: "Image to image",
    short: "Convert format, quality, size",
  },
  {
    id: "images-to-pdf",
    label: "Images to PDF",
    short: "One image per page",
  },
  {
    id: "pdf-to-image",
    label: "PDF to image",
    short: "Pages as JPG, PNG or WebP",
  },
] as const;

export const OVERRIDE_OPTIONS: { id: ConvertFormat | "auto"; label: string }[] =
  [
    { id: "auto", label: "Use shared format" },
    { id: "jpeg", label: "JPG" },
    { id: "png", label: "PNG" },
    { id: "webp", label: "WEBP" },
    { id: "avif", label: "AVIF" },
    { id: "gif", label: "GIF" },
    { id: "bmp", label: "BMP" },
    { id: "tiff", label: "TIFF" },
  ];

export function savingsPercent(sourceBytes: number, outputBytes: number) {
  if (!sourceBytes || !outputBytes) return null;
  return Math.round(((sourceBytes - outputBytes) / sourceBytes) * 100);
}

export function savingsLabel(sourceBytes: number, outputBytes: number) {
  const percent = savingsPercent(sourceBytes, outputBytes);
  if (percent === null) return "—";
  if (percent === 0) return "same size";
  return percent > 0 ? `${percent}% smaller` : `${Math.abs(percent)}% larger`;
}

export function formatDimensions(width?: number, height?: number) {
  if (!width || !height) return "—";
  return `${width.toLocaleString("en-US")} × ${height.toLocaleString("en-US")} px`;
}

export function formatPages(pages?: number) {
  if (!pages) return "—";
  return `${pages} page${pages === 1 ? "" : "s"}`;
}
