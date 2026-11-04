import type {
  ConvertFormat,
  InputFormat,
  InputKind,
} from "@/lib/tools/image-convert";
import type { SizeReport } from "@/lib/tools/image-size";

export type QueueStatus =
  "inspecting" | "ready" | "converting" | "done" | "error" | "cancelled";

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
  /**
   * Clockwise degrees the user asked for, always a multiple of 90. Absent or
   * 0 means the image is placed exactly as it was read.
   */
  rotation?: number;
  dpi?: number | null;
  pageCount?: number;
  /**
   * PDF only: first page size in points. Used to estimate rendered output size
   * before conversion. Pages within one PDF can differ, so this is page 1.
   */
  pageWidthPt?: number;
  pageHeightPt?: number;
  /** GIF only: real frame count, so animations are handled explicitly. */
  frames?: number;
  animated?: boolean;
  status: QueueStatus;
  error?: string;
  /** 0–1 when the source reports real page progress; undefined otherwise. */
  progress?: number;
  /** Per-file target format in image mode; "auto" follows the shared setting. */
  override: ConvertFormat | "auto";
};

/** A PDF page inside the studio grid. */
export type StudioPage = {
  id: string;
  /** Queue item id this page came from. */
  itemId: string;
  sourceIndex: number;
  page: number;
  rotation: 0 | 90 | 180 | 270;
  removed: boolean;
  /** Object URL of the rendered thumbnail, if one was produced. */
  thumb?: string;
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
  /** What the size engine actually did — absent in fixed-quality mode. */
  size?: SizeReport;
};

export type Message = {
  tone: "info" | "success" | "error";
  text: string;
} | null;

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
