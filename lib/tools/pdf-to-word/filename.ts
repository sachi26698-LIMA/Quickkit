import type { ConversionMode } from "./types";

/**
 * Output filename customization. The pattern supports two tokens:
 * `{name}` (source base name without extension) and `{mode}`
 * ("clean" / "layout"). Anything else is literal text. The result is
 * sanitized for common filesystems and always ends in `.docx`.
 */

export const DEFAULT_FILENAME_PATTERN = "{name}";

function sanitizeSegment(value: string): string {
  return value
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .replace(/^[.\s-]+|[.\s-]+$/g, "")
    .trim();
}

export function outputNameFor(
  pattern: string,
  sourceName: string,
  mode: ConversionMode,
): string {
  const base = sanitizeSegment(sourceName.replace(/\.pdf$/i, "")) || "document";
  const raw = (pattern.trim() || DEFAULT_FILENAME_PATTERN)
    .replace(/\.docx$/i, "")
    .replaceAll("{name}", base)
    .replaceAll("{mode}", mode === "layout" ? "layout" : "clean");
  const cleaned = sanitizeSegment(raw) || base;
  return `${cleaned}.docx`;
}
