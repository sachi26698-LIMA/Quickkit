/**
 * Extraction engine: turns geometry-aware OCR lines into a document section.
 *
 * All heuristics live here (no DOM, no engine) so they can be unit-tested and
 * so the same code powers Smart OCR, the editor and every export.
 */
import {
  detectTables,
  groupRows,
  lowConfidenceShare,
  meanConfidence,
  readingOrder,
} from "./geometry";
import type {
  ExtractedField,
  ExtractedTable,
  ExtractionMode,
  OcrLine,
  OcrPage,
  PageExtraction,
} from "./types";

type ResolvedMode = Exclude<ExtractionMode, "smart">;

export interface ExtractionOptions {
  mode: ExtractionMode;
  /** Words below this confidence are treated as uncertain. */
  confidenceThreshold: number;
  /** Keep intentional blank lines between paragraphs. */
  keepParagraphBreaks: boolean;
  /** Re-join words split across a line break with a hyphen. */
  joinHyphenated: boolean;
}

export const DEFAULT_EXTRACTION: ExtractionOptions = {
  mode: "smart",
  confidenceThreshold: 60,
  keepParagraphBreaks: true,
  joinHyphenated: true,
};

const BULLET = /^([-*•·▪◦‣o]|\d{1,3}[.)]|[a-zA-Z][.)])\s+/u;
const LABEL_VALUE = /^\s*([^:：]{2,48}?)\s*[:：]\s*(.+)$/u;
const LABEL_VALUE_TAB = /^\s*([^:：]{2,48}?)\s{2,}([^\s].*)$/u;

/** Lines in visual order for a page, honouring RTL scripts. */
export function orderedLines(
  page: Pick<OcrPage, "lines" | "width" | "rtl">,
): OcrLine[] {
  return readingOrder(page.lines, page.width, page.rtl);
}

/**
 * Median line height, used as the reference for "big text".
 * Zero-height lines are ignored.
 */
export function medianHeight(lines: OcrLine[]): number {
  const heights = lines
    .map((line) => line.height)
    .filter((height) => height > 0)
    .sort((a, b) => a - b);
  if (!heights.length) return 12;
  const middle = Math.floor(heights.length / 2);
  return heights.length % 2
    ? heights[middle]
    : Math.round((heights[middle - 1] + heights[middle]) / 2);
}

/**
 * A line is a heading when it is clearly taller than the body text, short,
 * and not a table cell or a sentence that merely wrapped.
 */
export function isHeading(
  line: OcrLine,
  median: number,
  previous?: OcrLine,
): boolean {
  if (line.height < median * 1.25) return false;
  const words = line.words.length || line.text.trim().split(/\s+/u).length;
  if (words > 14) return false;
  if (/[.,;]$/u.test(line.text.trim())) return false;
  // A genuinely larger line that follows a smaller one is a break in flow.
  if (previous && Math.abs(previous.height - line.height) < median * 0.2)
    return false;
  return true;
}

/** Re-join "inter-" + "national" style hyphenation at line ends. */
export function joinHyphenation(text: string): string {
  return text
    .replace(/(\p{Ll})-\n(\p{Ll})/gu, "$1$2")
    .replace(/(\p{L})-[\u2010\u2011]\n(\p{Ll})/gu, "$1$2");
}

/**
 * Join wrapped lines into paragraphs: a line continues the previous one when
 * it starts lowercase or the previous line has no terminal punctuation and
 * the vertical gap is small.
 */
export function joinParagraphs(
  lines: OcrLine[],
  keepBreaks: boolean,
): string[] {
  const paragraphs: string[] = [];
  let current = "";
  let previous: OcrLine | null = null;
  for (const line of lines) {
    const text = line.text.trim();
    if (!text) continue;
    const continues =
      previous !== null &&
      keepBreaks &&
      !/[.!?:;।॥]$/u.test(previous.text.trim()) &&
      (line.paragraph === previous.paragraph ||
        Math.abs(line.bbox.y0 - previous.bbox.y1) <
          Math.max(4, previous.height * 0.8));
    if (!current) current = text;
    else if (continues && !BULLET.test(text)) current = `${current} ${text}`;
    else {
      paragraphs.push(current);
      current = text;
    }
    previous = line;
  }
  if (current) paragraphs.push(current);
  return paragraphs;
}

/** Plain text: paragraphs, no layout tricks, hyphenation repaired. */
export function toPlainText(
  lines: OcrLine[],
  options: ExtractionOptions,
): string {
  const paragraphs = joinParagraphs(lines, options.keepParagraphBreaks);
  const text = paragraphs.join("\n\n");
  return options.joinHyphenated ? joinHyphenation(text) : text;
}

/** Layout text: keeps line breaks and column order, blank lines between blocks. */
export function toLayoutText(lines: OcrLine[]): string {
  const output: string[] = [];
  let previous: OcrLine | null = null;
  for (const line of lines) {
    if (previous) {
      const gap = line.bbox.y0 - previous.bbox.y1;
      if (gap > previous.height * 0.9) output.push("");
    }
    output.push(line.text.replace(/\s+$/u, ""));
    previous = line;
  }
  return output
    .join("\n")
    .replace(/\n{3,}/gu, "\n\n")
    .trim();
}

/**
 * Formatted text as light Markdown: headings become `#`/`##`, bullets stay
 * bullets, everything else is grouped into paragraphs.
 */
export function toFormattedText(
  lines: OcrLine[],
  options: ExtractionOptions,
): { text: string; headings: string[] } {
  const median = medianHeight(lines);
  const headings: string[] = [];
  const blocks: string[] = [];
  let paragraph: string[] = [];
  let previous: OcrLine | undefined;

  const flush = () => {
    if (paragraph.length) {
      blocks.push(paragraph.join(" "));
      paragraph = [];
    }
  };

  for (const line of lines) {
    const text = line.text.trim();
    if (!text) continue;
    if (isHeading(line, median, previous)) {
      flush();
      const level = line.height > median * 1.7 ? "##" : "###";
      blocks.push(`${level} ${text}`);
      headings.push(text);
    } else if (BULLET.test(text)) {
      flush();
      blocks.push(text.replace(BULLET, "- "));
    } else {
      paragraph.push(text);
    }
    previous = line;
  }
  flush();
  const text = options.joinHyphenated
    ? joinHyphenation(blocks.join("\n\n"))
    : blocks.join("\n\n");
  return { text, headings };
}

/** Render an extracted table as aligned text (the editor-friendly form). */
export function tableToText(table: ExtractedTable): string {
  const rows = table.headers.length
    ? [table.headers, ...table.rows]
    : table.rows;
  if (!rows.length) return "";
  const columns = Math.max(...rows.map((row) => row.length));
  const widths = Array.from({ length: columns }, (_, index) =>
    Math.max(1, ...rows.map((row) => (row[index] ?? "").trim().length)),
  );
  const pad = (value: string, width: number) => {
    const text = value.trim();
    // Pad by code points so Devanagari/Tamil columns still line up.
    const length = [...text].length;
    return text + " ".repeat(Math.max(0, width - length));
  };
  const lines = rows.map((row) =>
    widths
      .map((width, index) => pad(row[index] ?? "", width))
      .join("  ")
      .replace(/\s+$/u, ""),
  );
  if (table.headers.length) {
    const divider = widths.map((width) => "-".repeat(width)).join("  ");
    lines.splice(1, 0, divider);
  }
  return lines.join("\n");
}

/** Key–value pairs: `Label: value` on one line, or label then value. */
export function extractFields(
  lines: OcrLine[],
  threshold: number,
): ExtractedField[] {
  const fields: ExtractedField[] = [];
  lines.forEach((line, index) => {
    const text = line.text.trim();
    if (!text || text.length > 160) return;
    const colon = LABEL_VALUE.exec(text);
    if (colon) {
      const label = colon[1].trim();
      const value = colon[2].trim();
      if (label && value && label.split(/\s+/u).length <= 6) {
        fields.push({
          label,
          value,
          confidence: line.confidence,
          line: index,
        });
        return;
      }
    }
    const tabbed = LABEL_VALUE_TAB.exec(text);
    if (tabbed && tabbed[1].trim().split(/\s+/u).length <= 4) {
      fields.push({
        label: tabbed[1].trim(),
        value: tabbed[2].trim(),
        confidence: line.confidence,
        line: index,
      });
    }
  });
  // Two-line "label then value" pairs, e.g. receipts printed on separate rows.
  for (let i = 0; i < lines.length - 1; i += 1) {
    const label = lines[i].text.trim();
    const value = lines[i + 1].text.trim();
    if (!label || !value) continue;
    if (label.length > 32 || /\d{4,}/u.test(label)) continue;
    if (!/^[\p{Lu}][\p{L}\s./&-]*:?$/u.test(label)) continue;
    if (fields.some((field) => field.line === i)) continue;
    if (!/^[\p{L}\d(+\-.,/%₹$€£]/u.test(value)) continue;
    if (value.split(/\s+/u).length > 8) continue;
    if (fields.some((field) => field.label === label.replace(/:$/u, "")))
      continue;
    fields.push({
      label: label.replace(/:$/u, ""),
      value,
      confidence: Math.min(lines[i].confidence, lines[i + 1].confidence),
      line: i,
    });
  }
  return fields.filter((field) => field.confidence >= threshold * 0.5);
}

export function fieldsToText(fields: ExtractedField[]): string {
  return fields.map((field) => `${field.label}: ${field.value}`).join("\n");
}

/** How "table-like" a page is, 0..1. Used by Smart OCR. */
export function tabularScore(lines: OcrLine[]): number {
  if (lines.length < 3) return 0;
  const rows = groupRows(lines);
  const multi = rows.filter((row) => row.length >= 2).length;
  return rows.length ? multi / rows.length : 0;
}

/**
 * Decide which extraction mode to actually run.
 * Order of evidence: real table region > form-like key/value density >
 * multi-heading structure > layout with columns > plain text.
 */
export function resolveSmartMode(
  lines: OcrLine[],
  tables: ExtractedTable[],
  fields: ExtractedField[],
  median: number,
): { mode: ResolvedMode; rationale: string } {
  if (tables.length > 0)
    return {
      mode: "table",
      rationale: `${tables.length} table region${tables.length === 1 ? "" : "s"} with consistent columns detected, so rows and columns were kept.`,
    };
  const headings = lines.filter((line, index) =>
    isHeading(line, median, lines[index - 1]),
  ).length;
  if (fields.length >= 3 && fields.length >= headings)
    return {
      mode: "structured",
      rationale: `${fields.length} label/value pairs detected, so the page was treated as a form.`,
    };
  if (headings >= 2)
    return {
      mode: "formatted",
      rationale: `${headings} headings detected by text size, so structure was preserved.`,
    };
  if (lines.length > 8)
    return {
      mode: "layout",
      rationale:
        "No tables or fields found, so the layout, paragraph breaks and reading order were preserved.",
    };
  return {
    mode: "plain",
    rationale: "Short, uncomplicated text, so clean plain text was produced.",
  };
}

function detectRtl(languages: string[], lines: OcrLine[]): boolean {
  if (languages.includes("urd")) return true;
  // Fallback: if most letters are Arabic-script code points, treat as RTL.
  const sample = lines
    .map((line) => line.text)
    .join(" ")
    .slice(0, 2000);
  const arabic = (sample.match(/[\u0600-\u06FF]/gu) ?? []).length;
  const latin = (sample.match(/[A-Za-z]/gu) ?? []).length;
  return arabic > Math.max(10, latin);
}

/**
 * The single entry point used by the tool: build a PageExtraction from a page.
 */
export function extractPage(
  page: OcrPage,
  options: Partial<ExtractionOptions> = {},
): PageExtraction {
  const settings: ExtractionOptions = { ...DEFAULT_EXTRACTION, ...options };
  const lines = orderedLines(page);
  const median = medianHeight(lines);
  const tables = detectTables(lines);
  const fields = extractFields(lines, settings.confidenceThreshold);

  let resolved: ResolvedMode;
  let rationale: string;
  if (settings.mode === "smart") {
    const decision = resolveSmartMode(lines, tables, fields, median);
    resolved = decision.mode;
    rationale = decision.rationale;
  } else {
    resolved = settings.mode;
    rationale =
      tables.length > 0 && resolved !== "table"
        ? `${tables.length} table region${tables.length === 1 ? "" : "s"} were also found — switch to Table Extraction to keep the rows.`
        : "";
  }

  let text: string;
  let headings: string[] = [];
  switch (resolved) {
    case "layout":
      text = toLayoutText(lines);
      break;
    case "formatted": {
      const formatted = toFormattedText(lines, settings);
      text = formatted.text;
      headings = formatted.headings;
      break;
    }
    case "table": {
      if (tables.length) text = tables.map(tableToText).join("\n\n");
      else text = toLayoutText(lines);
      if (!tables.length)
        rationale =
          rationale ||
          "No table columns were detected on this page, so lines were kept as text.";
      break;
    }
    case "structured": {
      const parts: string[] = [];
      if (fields.length) parts.push(fieldsToText(fields));
      if (tables.length) parts.push(tables.map(tableToText).join("\n\n"));
      text = parts.length ? parts.join("\n\n") : toLayoutText(lines);
      if (!parts.length)
        rationale =
          rationale ||
          "No label/value pairs were found on this page, so lines were kept as text.";
      break;
    }
    case "plain":
    default:
      text = toPlainText(lines, settings);
      break;
  }

  const lowLines = lines
    .map((line, index) =>
      line.confidence < settings.confidenceThreshold ? index : -1,
    )
    .filter((index) => index >= 0);

  return {
    mode: settings.mode,
    resolvedMode: resolved,
    text: text.trim(),
    tables,
    fields,
    headings,
    lowConfidenceLines: lowLines,
    rationale,
  };
}

/**
 * Build an OcrPage from raw engine output. Kept here so both the browser
 * worker client and the tests can construct pages without the engine.
 */
export function buildPage(params: {
  id: string;
  sourceId: string;
  sourceName: string;
  page: number;
  pageCount: number;
  width: number;
  height: number;
  lines: OcrLine[];
  text: string;
  confidence?: number;
  durationMs?: number;
  languages: string[];
  threshold?: number;
  warnings?: string[];
}): OcrPage {
  const confidence = params.confidence ?? meanConfidence(params.lines);
  return {
    id: params.id,
    sourceId: params.sourceId,
    sourceName: params.sourceName,
    page: params.page,
    pageCount: params.pageCount,
    width: params.width,
    height: params.height,
    lines: params.lines,
    text: params.text,
    confidence,
    durationMs: params.durationMs ?? 0,
    lowConfidenceShare: lowConfidenceShare(params.lines, params.threshold),
    languages: params.languages,
    rtl: detectRtl(params.languages, params.lines),
    warnings: params.warnings ?? [],
  };
}

/** Combined document text with page headers, used by whole-document exports. */
export function combineDocument(
  sections: Array<{ title: string; text: string }>,
  includeHeaders: boolean,
): string {
  return sections
    .map((section, index) =>
      includeHeaders
        ? `${index > 0 ? "\n\n" : ""}--- ${section.title} ---\n${section.text}`
        : section.text,
    )
    .join("\n");
}
