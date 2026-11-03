import {
  PdfMergeError,
  formatMiB,
  sanitizeOutputFilename,
  type PdfFileCandidate,
  type PdfInspectionFeatures,
} from "./merge-pdf-logic";

/**
 * Browser-safety bounds for the local PDF Compressor. These intentionally stay
 * separate from Merger/Splitter limits: batch compression retains every output
 * for individual/ZIP download, so the total retained output is bounded too.
 */
export const PDF_COMPRESS_LIMITS = {
  maxDecodedStreamBytes: 64 * 1024 * 1024,
  maxFileBytes: 50 * 1024 * 1024,
  maxFiles: 20,
  maxGeneratedBytes: 128 * 1024 * 1024,
  maxImageDimension: 12_000,
  maxImagePixels: 24_000_000,
  maxPagesPerFile: 1_000,
  maxTotalBytes: 100 * 1024 * 1024,
  maxTotalPages: 2_000,
} as const;

export type PdfCompressionPresetId =
  "custom" | "high" | "low" | "maximum" | "medium";

export interface PdfCompressionSettings {
  grayscaleImages: boolean;
  imageQuality: number;
  maxImageDimension: number;
  preset: PdfCompressionPresetId;
  recompressImages: boolean;
  targetBytes?: number;
}

export interface PdfCompressionPreset {
  description: string;
  id: Exclude<PdfCompressionPresetId, "custom">;
  label: string;
  settings: Omit<PdfCompressionSettings, "preset" | "targetBytes">;
}

export const PDF_COMPRESSION_PRESETS: PdfCompressionPreset[] = [
  {
    description:
      "Gentlest image changes. Best first choice for print, photos and detailed scans.",
    id: "low",
    label: "Low compression",
    settings: {
      grayscaleImages: false,
      imageQuality: 0.88,
      maxImageDimension: 3200,
      recompressImages: true,
    },
  },
  {
    description:
      "Balanced size and readability for everyday sharing, email and uploads.",
    id: "medium",
    label: "Medium compression",
    settings: {
      grayscaleImages: false,
      imageQuality: 0.78,
      maxImageDimension: 2400,
      recompressImages: true,
    },
  },
  {
    description:
      "Smaller files with a visible quality trade-off in detailed images.",
    id: "high",
    label: "High compression",
    settings: {
      grayscaleImages: false,
      imageQuality: 0.64,
      maxImageDimension: 1800,
      recompressImages: true,
    },
  },
  {
    description:
      "Most aggressive supported-image reduction. Check fine text and photos carefully.",
    id: "maximum",
    label: "Maximum compression",
    settings: {
      grayscaleImages: false,
      imageQuality: 0.5,
      maxImageDimension: 1300,
      recompressImages: true,
    },
  },
];

export const DEFAULT_PDF_COMPRESSION_SETTINGS: PdfCompressionSettings = {
  grayscaleImages: false,
  imageQuality: 0.78,
  maxImageDimension: 2400,
  preset: "medium",
  recompressImages: true,
};

export interface PdfCompressionAnalysis {
  imageBytes: number;
  imageCount: number;
  largestImageDimension: number;
  streamBytes: number;
  streamCount: number;
  supportedImageBytes: number;
  supportedImageCount: number;
  uncompressedStreamBytes: number;
  unsupportedImageCount: number;
}

export interface PdfCompressionStats {
  attempts: number;
  imageBytesAfter: number;
  imageBytesBefore: number;
  imagesRecompressed: number;
  imagesSkipped: number;
  losslessBytesSaved: number;
  masksRecompressed: number;
  streamsRecompressed: number;
  targetReached?: boolean;
  unchanged: boolean;
}

export type PdfCompressionProgressStage =
  | "analyzing"
  | "finalizing"
  | "images"
  | "lossless"
  | "preparing"
  | "saving"
  | "validating";

export interface PdfCompressionProgress {
  current: number;
  fileName?: string;
  message: string;
  stage: PdfCompressionProgressStage;
  total: number;
}

function invalidSettings(message: string): PdfMergeError {
  return new PdfMergeError("invalid_selection", message);
}

export function presetSettings(
  preset: Exclude<PdfCompressionPresetId, "custom">,
): PdfCompressionSettings {
  const found = PDF_COMPRESSION_PRESETS.find((item) => item.id === preset);
  if (!found) throw invalidSettings("Choose a compression level to continue.");
  return { ...found.settings, preset };
}

export function normalizeCompressionSettings(
  input: PdfCompressionSettings,
): PdfCompressionSettings {
  if (
    !Number.isFinite(input.imageQuality) ||
    input.imageQuality < 0.28 ||
    input.imageQuality > 0.95
  ) {
    throw invalidSettings(
      "Choose an image quality between 28% and 95%. Higher quality keeps more detail; lower quality usually makes images smaller.",
    );
  }
  if (
    !Number.isInteger(input.maxImageDimension) ||
    input.maxImageDimension < 500 ||
    input.maxImageDimension > 6000
  ) {
    throw invalidSettings(
      "Choose a maximum embedded-image size between 500 and 6,000 pixels on the longest side.",
    );
  }
  if (input.targetBytes !== undefined) {
    if (
      !Number.isSafeInteger(input.targetBytes) ||
      input.targetBytes < 1024 ||
      input.targetBytes > PDF_COMPRESS_LIMITS.maxFileBytes
    ) {
      throw invalidSettings(
        `Choose a target size of at least 1 KiB and no more than ${formatMiB(PDF_COMPRESS_LIMITS.maxFileBytes)} per PDF.`,
      );
    }
  }
  return {
    grayscaleImages: Boolean(input.grayscaleImages),
    imageQuality: Math.round(input.imageQuality * 1000) / 1000,
    maxImageDimension: input.maxImageDimension,
    preset: input.preset,
    recompressImages: Boolean(input.recompressImages),
    ...(input.targetBytes === undefined
      ? {}
      : { targetBytes: input.targetBytes }),
  };
}

export interface PdfCompressionAttempt extends PdfCompressionSettings {
  attempt: number;
}

/**
 * Target-size mode tries the user's chosen quality first, then progressively
 * trades image quality/resolution for size. Text and vector pages are never
 * rasterized just to chase a target that the document structure cannot reach.
 */
export function buildCompressionAttempts(
  input: PdfCompressionSettings,
): PdfCompressionAttempt[] {
  const settings = normalizeCompressionSettings(input);
  if (settings.targetBytes === undefined || !settings.recompressImages) {
    return [{ ...settings, attempt: 1 }];
  }

  const ladders = [
    { dimensionFactor: 1, qualityDrop: 0 },
    { dimensionFactor: 0.82, qualityDrop: 0.08 },
    { dimensionFactor: 0.64, qualityDrop: 0.17 },
    { dimensionFactor: 0.48, qualityDrop: 0.27 },
    { dimensionFactor: 0.34, qualityDrop: 0.38 },
  ];
  const attempts: PdfCompressionAttempt[] = [];
  const seen = new Set<string>();
  for (const ladder of ladders) {
    const imageQuality = Math.max(
      0.28,
      Math.round((settings.imageQuality - ladder.qualityDrop) * 1000) / 1000,
    );
    const maxImageDimension = Math.max(
      700,
      Math.round(settings.maxImageDimension * ladder.dimensionFactor),
    );
    const key = `${imageQuality}:${maxImageDimension}`;
    if (seen.has(key)) continue;
    seen.add(key);
    attempts.push({
      ...settings,
      attempt: attempts.length + 1,
      imageQuality,
      maxImageDimension,
    });
  }
  return attempts;
}

export type PdfTargetSizeUnit = "KiB" | "MiB";

export function parseTargetSize(
  value: string,
  unit: PdfTargetSizeUnit,
): number {
  const trimmed = value.trim().replace(/,/g, "");
  if (!trimmed) {
    throw invalidSettings("Enter a target size, or turn target size off.");
  }
  const numeric = Number(trimmed);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    throw invalidSettings(
      "Enter a positive target size, for example 500 KiB or 2 MiB.",
    );
  }
  const multiplier = unit === "MiB" ? 1024 * 1024 : 1024;
  const bytes = Math.round(numeric * multiplier);
  return normalizeCompressionSettings({
    ...DEFAULT_PDF_COMPRESSION_SETTINGS,
    targetBytes: bytes,
  }).targetBytes!;
}

export function validatePdfCompressionCandidate(
  file: PdfFileCandidate,
  currentFileCount: number,
  currentTotalBytes: number,
): PdfMergeError | null {
  if (currentFileCount >= PDF_COMPRESS_LIMITS.maxFiles) {
    return new PdfMergeError(
      "too_many_files",
      `You can compress up to ${PDF_COMPRESS_LIMITS.maxFiles} PDFs in one local batch. Remove a file or finish this batch first.`,
    );
  }
  const hasPdfExtension = /\.pdf$/i.test(file.name.trim());
  const hasPdfType =
    !file.type || file.type.toLowerCase() === "application/pdf";
  if (!hasPdfExtension || !hasPdfType) {
    return new PdfMergeError(
      "invalid_pdf",
      `“${file.name}” is not a PDF. Choose a file ending in .pdf; images and office documents are not converted by this tool.`,
    );
  }
  if (file.size === 0) {
    return new PdfMergeError(
      "invalid_pdf",
      `“${file.name}” is empty. Choose a complete PDF exported from your document app.`,
    );
  }
  if (file.size > PDF_COMPRESS_LIMITS.maxFileBytes) {
    return new PdfMergeError(
      "file_too_large",
      `“${file.name}” is ${formatMiB(file.size)}, above the ${formatMiB(PDF_COMPRESS_LIMITS.maxFileBytes)} per-file local-processing limit. Split it into smaller PDFs, then compress each part.`,
    );
  }
  if (currentTotalBytes + file.size > PDF_COMPRESS_LIMITS.maxTotalBytes) {
    return new PdfMergeError(
      "total_too_large",
      `Adding “${file.name}” would take this batch to ${formatMiB(currentTotalBytes + file.size)}, above the ${formatMiB(PDF_COMPRESS_LIMITS.maxTotalBytes)} batch limit. Remove a file or compress in smaller batches.`,
    );
  }
  return null;
}

export function defaultCompressedFilename(sourceName: string): string {
  const base = sanitizeOutputFilename(sourceName, "document").replace(
    /\.pdf$/i,
    "",
  );
  return sanitizeOutputFilename(`${base}-compressed`, "compressed-pdf");
}

export function makeUniqueFilenames(filenames: string[]): string[] {
  const counts = new Map<string, number>();
  return filenames.map((filename) => {
    const sanitized = sanitizeOutputFilename(filename, "compressed-pdf");
    const key = sanitized.toLocaleLowerCase();
    const count = (counts.get(key) ?? 0) + 1;
    counts.set(key, count);
    if (count === 1) return sanitized;
    return sanitizeOutputFilename(
      `${sanitized.replace(/\.pdf$/i, "")} (${count})`,
      "compressed-pdf",
    );
  });
}

export function savingsPercent(
  originalBytes: number,
  outputBytes: number,
): number {
  if (!Number.isFinite(originalBytes) || originalBytes <= 0) return 0;
  return Math.max(
    -100,
    Math.min(100, ((originalBytes - outputBytes) / originalBytes) * 100),
  );
}

export function formatSavingsPercent(
  originalBytes: number,
  outputBytes: number,
): string {
  const percent = savingsPercent(originalBytes, outputBytes);
  if (percent > 0) return `${percent.toFixed(percent >= 10 ? 1 : 2)}% smaller`;
  if (percent < 0)
    return `${Math.abs(percent).toFixed(Math.abs(percent) >= 10 ? 1 : 2)}% larger`;
  return "No size change";
}

export function compressionBlocker(
  features: PdfInspectionFeatures,
): string | undefined {
  if (features.hasXFA) {
    return "Dynamic XFA forms are not supported. Print or export this file to a standard PDF, then compress that copy.";
  }
  if (features.hasSignedSignature) {
    return "This PDF appears to be digitally signed. Compression is blocked so a signature is not silently invalidated; compress an unsigned copy if you have one.";
  }
  return undefined;
}

export function compressionFeatureWarnings(
  features: PdfInspectionFeatures,
): string[] {
  const warnings: string[] = [];
  if (features.hasSignatureField && !features.hasSignedSignature) {
    warnings.push(
      "This PDF contains unsigned signature fields. Review the compressed copy before signing or sharing it.",
    );
  }
  if (features.hasForm) {
    warnings.push(
      "Form structure is preserved where the PDF engine can rewrite it safely, but check calculations, field order and appearances in the result.",
    );
  }
  if (features.hasAttachments) {
    warnings.push(
      "Embedded attachments are not recompressed as files. Keep the original and confirm attachments open in the result.",
    );
  }
  if (features.hasLayers) {
    warnings.push(
      "Layer/optional-content behavior can vary after a rewrite. Check layer visibility in the compressed copy.",
    );
  }
  if (features.hasTags) {
    warnings.push(
      "Tagged-PDF/PDF-UA conformance is not guaranteed after rewriting streams or images. Validate accessibility separately for compliance work.",
    );
  }
  if (features.hasJavaScript) {
    warnings.push(
      "This PDF contains scripts or script actions. QUICKKIT does not run them, and script behavior is not guaranteed after compression.",
    );
  }
  if (features.hasOutlines) {
    warnings.push(
      "Bookmarks are retained structurally in most files, but check important destinations after compression.",
    );
  }
  return warnings;
}
