/**
 * Pure geometry helpers: turning raw tesseract blocks into ordered lines,
 * reading-order columns and detected tables. No DOM, no engine — unit-testable.
 */
import type { OcrLine, OcrWord, ExtractedTable } from "./types";

export interface RawBbox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface RawWord {
  text?: string | null;
  confidence?: number | null;
  bbox?: RawBbox | null;
}

export interface RawLine {
  text?: string | null;
  confidence?: number | null;
  bbox?: RawBbox | null;
  words?: RawWord[] | null;
}

export interface RawParagraph {
  lines?: RawLine[] | null;
}

export interface RawBlock {
  paragraphs?: RawParagraph[] | null;
  blocktype?: string | null;
}

const EMPTY_BBOX: RawBbox = { x0: 0, y0: 0, x1: 0, y1: 0 };

function cleanBbox(bbox: RawBbox | null | undefined): RawBbox {
  if (!bbox) return { ...EMPTY_BBOX };
  const values = [bbox.x0, bbox.y0, bbox.x1, bbox.y1].map((value) =>
    Number.isFinite(value) ? Number(value) : 0,
  );
  return {
    x0: Math.min(values[0], values[2]),
    y0: Math.min(values[1], values[3]),
    x1: Math.max(values[0], values[2]),
    y1: Math.max(values[1], values[3]),
  };
}

function clampConfidence(value: number | null | undefined): number {
  if (!Number.isFinite(value as number)) return 0;
  return Math.min(100, Math.max(0, Math.round(value as number)));
}

/** Flatten tesseract's blocks -> paragraphs -> lines into OcrLine[]. */
export function flattenLines(blocks: RawBlock[] | null | undefined): OcrLine[] {
  const lines: OcrLine[] = [];
  let paragraphIndex = 0;
  (blocks ?? []).forEach((block, blockIndex) => {
    for (const paragraph of block.paragraphs ?? []) {
      const paragraphLines = paragraph.lines ?? [];
      if (paragraphLines.length) paragraphIndex += 1;
      for (const line of paragraphLines) {
        const text = (line.text ?? "").replace(/\s+$/u, "");
        const bbox = cleanBbox(line.bbox);
        if (!text.trim()) continue;
        const words: OcrWord[] = (line.words ?? [])
          .map((word) => ({
            text: (word.text ?? "").trim(),
            confidence: clampConfidence(word.confidence),
            bbox: cleanBbox(word.bbox),
          }))
          .filter((word) => word.text.length > 0);
        lines.push({
          text,
          confidence: clampConfidence(
            line.confidence ??
              (words.length
                ? words.reduce((sum, word) => sum + word.confidence, 0) /
                  words.length
                : 0),
          ),
          bbox,
          height: Math.max(1, bbox.y1 - bbox.y0),
          words,
          paragraph: paragraphIndex,
          block: blockIndex,
        });
      }
    }
  });
  return lines;
}

/** Weighted mean confidence (by word count) so short junk lines don't dominate. */
export function meanConfidence(lines: OcrLine[]): number {
  if (!lines.length) return 0;
  let weighted = 0;
  let total = 0;
  for (const line of lines) {
    const weight = Math.max(1, line.words.length);
    weighted += line.confidence * weight;
    total += weight;
  }
  return total ? Math.round((weighted / total) * 10) / 10 : 0;
}

/** Share of words below the threshold (0..1). */
export function lowConfidenceShare(lines: OcrLine[], threshold = 60): number {
  const words = lines.flatMap((line) => line.words);
  if (!words.length) return 0;
  const low = words.filter((word) => word.confidence < threshold).length;
  return Math.round((low / words.length) * 1000) / 1000;
}

/** Indices of lines whose mean word confidence is below the threshold. */
export function lowConfidenceLines(lines: OcrLine[], threshold = 60): number[] {
  return lines
    .map((line, index) => (line.confidence < threshold ? index : -1))
    .filter((index) => index >= 0);
}

export interface ColumnGroup {
  /** Left edge of the column, px. */
  left: number;
  /** Right edge of the column, px. */
  right: number;
  lines: OcrLine[];
}

/**
 * Split lines into columns by finding vertical gutters that no line crosses.
 * Returns one group per column, left-to-right (or right-to-left when `rtl`),
 * which is the reading order for multi-column documents.
 */
export function detectColumns(
  lines: OcrLine[],
  pageWidth: number,
  rtl = false,
): ColumnGroup[] {
  const usable = lines.filter((line) => line.bbox.x1 > line.bbox.x0);
  if (usable.length < 2) {
    return [{ left: 0, right: Math.max(pageWidth, 1), lines: [...lines] }];
  }
  const columnLeft = Math.min(...usable.map((line) => line.bbox.x0));
  const columnRight = Math.max(...usable.map((line) => line.bbox.x1));
  const span = Math.max(1, columnRight - columnLeft);
  // Coverage map over 200 slices of the text area.
  const buckets = 200;
  const covered = new Array<number>(buckets).fill(0);
  for (const line of usable) {
    const from = Math.floor(((line.bbox.x0 - columnLeft) / span) * buckets);
    const to = Math.ceil(((line.bbox.x1 - columnLeft) / span) * buckets);
    for (let i = Math.max(0, from); i < Math.min(buckets, to); i += 1)
      covered[i] += 1;
  }
  // A gutter is an empty run inside the text area that is wider than a
  // plausible word space and spans (nearly) the full column height.
  const minGapPx = Math.max(span * 0.025, 12);
  const minGapBuckets = Math.ceil((minGapPx / span) * buckets);
  const gutters: number[] = [];
  let runStart: number | null = null;
  for (let i = 0; i <= buckets; i += 1) {
    const empty = i === buckets || covered[i] === 0;
    if (empty && runStart === null) runStart = i;
    if (!empty && runStart !== null) {
      const width = i - runStart;
      if (runStart > 0 && i < buckets && width >= minGapBuckets)
        gutters.push(columnLeft + ((runStart + i) / 2 / buckets) * span);
      runStart = null;
    }
  }
  if (!gutters.length)
    return [{ left: 0, right: Math.max(pageWidth, 1), lines: [...lines] }];

  const edges = [columnLeft, ...gutters, columnRight];
  const columns: ColumnGroup[] = [];
  for (let i = 0; i < edges.length - 1; i += 1)
    columns.push({ left: edges[i], right: edges[i + 1], lines: [] });
  for (const line of lines) {
    const centre = (line.bbox.x0 + line.bbox.x1) / 2;
    const target =
      columns.find(
        (column) => centre >= column.left && centre <= column.right,
      ) ?? columns[0];
    target.lines.push(line);
  }
  const nonEmpty = columns.filter((column) => column.lines.length > 0);
  if (!nonEmpty.length)
    return [{ left: 0, right: Math.max(pageWidth, 1), lines: [...lines] }];
  return rtl ? nonEmpty.reverse() : nonEmpty;
}

/** Lines in reading order: column by column, top to bottom. */
export function readingOrder(
  lines: OcrLine[],
  pageWidth: number,
  rtl = false,
): OcrLine[] {
  const columns = detectColumns(lines, pageWidth, rtl);
  return columns.flatMap((column) =>
    [...column.lines].sort((a, b) => {
      const dy = a.bbox.y0 - b.bbox.y0;
      if (Math.abs(dy) > Math.max(2, Math.min(a.height, b.height) * 0.45))
        return dy;
      return rtl ? b.bbox.x1 - a.bbox.x1 : a.bbox.x0 - b.bbox.x0;
    }),
  );
}

/** Words of a line split into cell-sized groups by wide horizontal gaps. */
export function splitLineIntoCells(
  line: OcrLine,
  gapThreshold: number,
): OcrLine[] {
  if (line.words.length < 2) return [line];
  const groups: (typeof line.words)[] = [];
  let group = [line.words[0]];
  for (let index = 1; index < line.words.length; index += 1) {
    const previous = line.words[index - 1];
    const word = line.words[index];
    const gap = word.bbox.x0 - previous.bbox.x1;
    if (gap >= gapThreshold) {
      groups.push(group);
      group = [word];
    } else {
      group.push(word);
    }
  }
  groups.push(group);
  if (groups.length < 2) return [line];
  return groups.map((words) => {
    const x0 = Math.min(...words.map((word) => word.bbox.x0));
    const y0 = Math.min(...words.map((word) => word.bbox.y0));
    const x1 = Math.max(...words.map((word) => word.bbox.x1));
    const y1 = Math.max(...words.map((word) => word.bbox.y1));
    return {
      text: words.map((word) => word.text).join(" "),
      confidence: Math.round(
        words.reduce((sum, word) => sum + word.confidence, 0) / words.length,
      ),
      bbox: { x0, y0, x1, y1 },
      height: Math.max(1, y1 - y0),
      words: [...words],
      paragraph: line.paragraph,
      block: line.block,
    };
  });
}

/**
 * The widest gap that still counts as a word space. Cell gaps are measured
 * against this, so "Notebook 2 120 240" becomes four cells on a ruled table
 * without splitting an ordinary sentence into columns.
 */
export function columnGapThreshold(lines: OcrLine[]): number {
  // Word spaces are a fraction of the line height (roughly 0.2–0.6em) while a
  // column gap is at least a full line height, usually much more. Scaling from
  // the text height is therefore far more reliable than any statistic over the
  // observed gaps: a table with no prose on the page has no word gaps at all.
  return Math.max(medianHeightOf(lines) * 1.2, 12);
}

/** Median line height, used to scale every threshold on the page. */
export function medianHeightOf(lines: OcrLine[]): number {
  const heights = lines
    .map((line) => line.height)
    .filter((height) => height > 0)
    .sort((a, b) => a - b);
  if (!heights.length) return 12;
  return heights[Math.floor(heights.length / 2)];
}

/** Rows of cells: every line is split into columns, then grouped vertically. */
export function cellRows(lines: OcrLine[]): OcrLine[][] {
  const threshold = columnGapThreshold(lines);
  return groupRows(
    lines.flatMap((line) => splitLineIntoCells(line, threshold)),
  );
}

/**
 * Group lines into table rows. Two lines share a row when their vertical
 * centres are within half the median line height.
 */
export function groupRows(lines: OcrLine[]): OcrLine[][] {
  if (!lines.length) return [];
  const heights = lines.map((line) => line.height).sort((a, b) => a - b);
  const median = heights[Math.floor(heights.length / 2)] || 12;
  const tolerance = Math.max(4, median * 0.5);
  const sorted = [...lines].sort((a, b) => {
    const centreA = (a.bbox.y0 + a.bbox.y1) / 2;
    const centreB = (b.bbox.y0 + b.bbox.y1) / 2;
    if (Math.abs(centreA - centreB) > tolerance) return centreA - centreB;
    return a.bbox.x0 - b.bbox.x0;
  });
  const rows: OcrLine[][] = [];
  for (const line of sorted) {
    const centre = (line.bbox.y0 + line.bbox.y1) / 2;
    const row = rows[rows.length - 1];
    if (row) {
      const rowCentre =
        row.reduce((sum, item) => sum + (item.bbox.y0 + item.bbox.y1) / 2, 0) /
        row.length;
      if (Math.abs(centre - rowCentre) <= tolerance) {
        row.push(line);
        continue;
      }
    }
    rows.push([line]);
  }
  return rows.map((row) => row.sort((a, b) => a.bbox.x0 - b.bbox.x0));
}

/**
 * Detect a table in a run of rows: at least three rows with at least two
 * cells each, and a consistent number of cells (the most common count wins).
 */
export function detectTable(rows: OcrLine[][]): ExtractedTable | null {
  const candidates = rows.filter((row) => row.length >= 2);
  if (candidates.length < 3) return null;
  const counts = new Map<number, number>();
  for (const row of candidates)
    counts.set(row.length, (counts.get(row.length) ?? 0) + 1);
  const [columns, frequency] = [...counts.entries()].sort(
    (a, b) => b[1] - a[1] || b[0] - a[0],
  )[0];
  if (frequency < 2 || columns < 2) return null;
  const matching = candidates.filter((row) => row.length === columns);
  // Columns must line up across rows: on real prose, "cells" land at random x
  // positions and this check fails, so prose is never mistaken for a table.
  const tallest = Math.max(
    ...matching.flatMap((row) => row.map((cell) => cell.height)),
  );
  const tolerance = Math.max(10, tallest * 1.1);
  for (let column = 0; column < columns; column += 1) {
    const starts = matching.map((row) => row[column].bbox.x0);
    if (Math.max(...starts) - Math.min(...starts) > tolerance) return null;
  }
  const cells = matching.map((row) => row.map((line) => line.text.trim()));
  const confidences = matching.flatMap((row) =>
    row.map((line) => line.confidence),
  );
  const firstRow = matching[0];
  const headerLike = firstRow.every(
    (line) =>
      line.text.trim().length > 0 && !/^[\d.,%-]+$/.test(line.text.trim()),
  );
  const headers = headerLike ? cells[0] : [];
  const bodyRows = headerLike ? cells.slice(1) : cells;
  if (!bodyRows.length) return null;
  return {
    index: 0,
    headers,
    rows: bodyRows,
    confidence: confidences.length
      ? Math.round(
          confidences.reduce((sum, value) => sum + value, 0) /
            confidences.length,
        )
      : 0,
  };
}

/**
 * Find every table region on a page by walking rows top to bottom and
 * starting a new region whenever a row drops below two cells.
 */
export function detectTables(lines: OcrLine[]): ExtractedTable[] {
  const rows = cellRows(lines);
  const tables: ExtractedTable[] = [];
  let run: OcrLine[][] = [];
  const flush = () => {
    if (run.length) {
      const table = detectTable(run);
      if (table) tables.push({ ...table, index: tables.length });
    }
    run = [];
  };
  for (const row of rows) {
    if (row.length >= 2) run.push(row);
    else flush();
  }
  flush();
  return tables;
}

/** Average horizontal gap used to decide whether a line is tabular. */
export function medianCellGap(rows: OcrLine[][]): number {
  const gaps: number[] = [];
  for (const row of rows) {
    for (let i = 1; i < row.length; i += 1) {
      const gap = row[i].bbox.x0 - row[i - 1].bbox.x1;
      if (gap > 0) gaps.push(gap);
    }
  }
  if (!gaps.length) return 0;
  gaps.sort((a, b) => a - b);
  return gaps[Math.floor(gaps.length / 2)];
}

/** True when the page looks tabular enough to justify table extraction. */
export function looksTabular(lines: OcrLine[]): boolean {
  const rows = cellRows(lines);
  const multiCell = rows.filter((row) => row.length >= 2).length;
  if (rows.length < 3) return false;
  return multiCell / rows.length >= 0.4 && multiCell >= 3;
}
