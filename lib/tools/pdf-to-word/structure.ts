import type {
  Block,
  BlockAlign,
  ExtractedPage,
  PdfTextItem,
  StructureOptions,
  StructuredPage,
  TextRun,
} from "./types";
import { DEFAULT_STRUCTURE_OPTIONS } from "./types";

/**
 * Pure structuring: positioned text fragments -> document blocks
 * (headings, paragraphs, lists, tables, images). No pdfjs/DOM here so the
 * heuristics are unit-testable with synthetic items.
 */

const TABLE_CELL_GAP_PT = 14;
const TABLE_MIN_ROWS = 3;
const TABLE_MAX_CELL_CHARS = 48;
const COLUMN_GUTTER_PT = 26;

interface Line {
  items: PdfTextItem[];
  runs: TextRun[];
  text: string;
  x: number;
  y: number;
  right: number;
  fontSize: number;
  bold: boolean;
}

function runsForItems(items: PdfTextItem[]): TextRun[] {
  const runs: TextRun[] = [];
  let prev: PdfTextItem | null = null;
  for (const item of items) {
    const text = item.text;
    if (!text) continue;
    let prefix = "";
    if (prev) {
      const gap = item.x - (prev.x + prev.width);
      const needsSpace =
        gap > Math.max(1.2, item.fontSize * 0.22) &&
        !/\s$/.test(prev.text) &&
        !/^\s/.test(text);
      if (needsSpace) prefix = " ";
    }
    const last = runs[runs.length - 1];
    if (
      last &&
      last.bold === item.bold &&
      last.italic === item.italic &&
      last.link === item.link
    ) {
      last.text += prefix + text;
    } else {
      runs.push({
        text: prefix + text,
        bold: item.bold,
        italic: item.italic,
        ...(item.link ? { link: item.link } : {}),
      });
    }
    prev = item;
  }
  if (runs.length) runs[0].text = runs[0].text.replace(/^\s+/, "");
  return runs.filter((r) => r.text.length > 0);
}

/** Group positioned items into visual lines, top-to-bottom. */
export function groupLines(items: PdfTextItem[]): Line[] {
  const sorted = [...items]
    .filter((i) => i.text.trim().length > 0)
    .sort((a, b) => a.y - b.y || a.x - b.x);
  const lines: Line[] = [];
  for (const item of sorted) {
    const current = lines[lines.length - 1];
    const tolerance = current
      ? Math.max(2, 0.4 * Math.min(current.fontSize, item.fontSize))
      : 0;
    if (current && Math.abs(item.y - current.y) <= tolerance) {
      current.items.push(item);
      current.right = Math.max(current.right, item.x + item.width);
      current.x = Math.min(current.x, item.x);
      current.fontSize = Math.max(current.fontSize, item.fontSize);
    } else {
      lines.push({
        items: [item],
        runs: [],
        text: "",
        x: item.x,
        y: item.y,
        right: item.x + item.width,
        fontSize: item.fontSize,
        bold: false,
      });
    }
  }
  for (const line of lines) {
    line.items.sort((a, b) => a.x - b.x);
    line.runs = runsForItems(line.items);
    line.text = line.runs
      .map((r) => r.text)
      .join("")
      .trim();
    const totalChars = line.items.reduce((n, i) => n + i.text.trim().length, 0);
    const boldChars = line.items.reduce(
      (n, i) => n + (i.bold ? i.text.trim().length : 0),
      0,
    );
    line.bold = totalChars > 0 && boldChars / totalChars > 0.6;
  }
  return lines.filter((l) => l.text.length > 0);
}

function medianBodyFontSize(lines: Line[]): number {
  const weighted: number[] = [];
  for (const line of lines) {
    const weight = Math.max(1, Math.min(12, Math.round(line.text.length / 12)));
    for (let i = 0; i < weight; i++) weighted.push(line.fontSize);
  }
  if (!weighted.length) return 11;
  weighted.sort((a, b) => a - b);
  return weighted[Math.floor(weighted.length / 2)];
}

/** Split a line into table-cell candidates at wide horizontal gaps. */
export function splitCells(line: Line): { x: number; text: string }[] {
  const cells: { x: number; text: string }[] = [];
  let current: PdfTextItem[] = [];
  const flush = () => {
    if (!current.length) return;
    const runs = runsForItems(current);
    const text = runs
      .map((r) => r.text)
      .join("")
      .trim();
    if (text) cells.push({ x: current[0].x, text });
    current = [];
  };
  let prev: PdfTextItem | null = null;
  for (const item of line.items) {
    if (prev && item.x - (prev.x + prev.width) > TABLE_CELL_GAP_PT) flush();
    current.push(item);
    prev = item;
  }
  flush();
  return cells;
}

const BULLET_RE = /^\s*[•·▪◦*\-–—]\s+/;
const NUMBERED_RE = /^\s*\d{1,3}[.)]\s+/;

function stripRunsPrefix(runs: TextRun[], count: number): TextRun[] {
  const out: TextRun[] = [];
  let remaining = count;
  for (const run of runs) {
    if (remaining >= run.text.length) {
      remaining -= run.text.length;
      continue;
    }
    out.push(remaining > 0 ? { ...run, text: run.text.slice(remaining) } : run);
    remaining = 0;
  }
  return out.filter((r) => r.text.length > 0);
}

function inferAlign(
  lines: Line[],
  regionLeft: number,
  regionRight: number,
): BlockAlign {
  if (lines.length === 1) {
    const line = lines[0];
    const center = (line.x + line.right) / 2;
    const regionCenter = (regionLeft + regionRight) / 2;
    if (Math.abs(center - regionCenter) < 10 && line.x > regionLeft + 14)
      return "center";
    if (regionRight - line.right < 8 && line.x > regionLeft + 30)
      return "right";
    return "left";
  }
  const leftsAligned =
    Math.max(...lines.map((l) => l.x)) - Math.min(...lines.map((l) => l.x)) < 5;
  const body = lines.slice(0, -1);
  const rightsAligned =
    body.length > 0 &&
    Math.max(...body.map((l) => l.right)) -
      Math.min(...body.map((l) => l.right)) <
      6;
  if (leftsAligned && rightsAligned) return "justify";
  const centers = lines.map((l) => (l.x + l.right) / 2);
  if (Math.max(...centers) - Math.min(...centers) < 8) return "center";
  return "left";
}

interface ColumnRegion {
  left: number;
  right: number;
}

function detectColumns(lines: Line[], pageWidth: number): ColumnRegion[] {
  const whole: ColumnRegion[] = [{ left: 0, right: pageWidth }];
  if (lines.length < 8) return whole;
  const bins = 48;
  const occupied = new Array<boolean>(bins).fill(false);
  for (const line of lines) {
    const from = Math.floor((line.x / pageWidth) * bins);
    const to = Math.min(bins - 1, Math.floor((line.right / pageWidth) * bins));
    for (let i = Math.max(0, from); i <= to; i++) occupied[i] = true;
  }
  // Look for a sustained empty gutter in the middle 30%..70% of the page.
  const midFrom = Math.floor(bins * 0.3);
  const midTo = Math.ceil(bins * 0.7);
  let runStart = -1;
  for (let i = midFrom; i <= midTo; i++) {
    if (!occupied[i]) {
      if (runStart < 0) runStart = i;
      const gutterPt = ((i - runStart + 1) / bins) * pageWidth;
      if (gutterPt >= COLUMN_GUTTER_PT) {
        const split = ((runStart + i + 1) / 2 / bins) * pageWidth;
        const leftLines = lines.filter((l) => l.right <= split + 4).length;
        const rightLines = lines.filter((l) => l.x >= split - 4).length;
        if (leftLines >= 4 && rightLines >= 4) {
          return [
            { left: 0, right: split },
            { left: split, right: pageWidth },
          ];
        }
      }
    } else {
      runStart = -1;
    }
  }
  return whole;
}

type ClassifiedLine =
  | { type: "heading"; level: 1 | 2 | 3; line: Line }
  | { type: "bullet" | "numbered" | "text"; line: Line };

function classifyLine(
  line: Line,
  bodySize: number,
  detectHeadingsLists: boolean,
): ClassifiedLine {
  if (!detectHeadingsLists) return { type: "text", line };
  const ratio = line.fontSize / bodySize;
  if (line.text.length <= 140) {
    if (ratio >= 1.85) return { type: "heading", level: 1, line };
    if (ratio >= 1.4) return { type: "heading", level: 2, line };
    if (ratio >= 1.16 || (line.bold && ratio >= 1.06))
      return { type: "heading", level: 3, line };
  }
  if (BULLET_RE.test(line.text)) return { type: "bullet", line };
  if (NUMBERED_RE.test(line.text)) return { type: "numbered", line };
  return { type: "text", line };
}

function structureRegion(
  lines: Line[],
  region: ColumnRegion,
  bodySize: number,
  options: StructureOptions,
): Block[] {
  const blocks: Block[] = [];
  const classified = lines.map((l) =>
    classifyLine(l, bodySize, options.detectHeadingsLists),
  );
  let prevBottom = lines.length ? lines[0].y : 0;

  const spaceBefore = (line: Line) =>
    Math.max(0, Math.min(48, line.y - prevBottom));

  let i = 0;
  while (i < classified.length) {
    const entry = classified[i];
    const line = entry.line;

    // --- tables: >=3 consecutive aligned multi-cell lines ---
    if (entry.type === "text" && options.detectTables) {
      const candidateLines: Line[] = [];
      let j = i;
      while (j < classified.length && classified[j].type === "text") {
        const cells = splitCells(classified[j].line);
        if (
          cells.length < 2 ||
          cells.some((c) => c.text.length > TABLE_MAX_CELL_CHARS)
        )
          break;
        candidateLines.push(classified[j].line);
        j++;
      }
      if (candidateLines.length >= TABLE_MIN_ROWS) {
        const firstCells = splitCells(candidateLines[0]);
        const colStarts = firstCells.map((c) => c.x);
        const rows: string[][] = [];
        let ok = true;
        for (const rowLine of candidateLines) {
          const cells = splitCells(rowLine);
          const row = new Array<string>(colStarts.length).fill("");
          for (const cell of cells) {
            let best = -1;
            let bestDist = Infinity;
            colStarts.forEach((start, idx) => {
              const d = Math.abs(cell.x - start);
              if (d < bestDist) {
                bestDist = d;
                best = idx;
              }
            });
            if (best < 0 || bestDist > 10) {
              ok = false;
              break;
            }
            row[best] = row[best] ? `${row[best]} ${cell.text}` : cell.text;
          }
          if (!ok) break;
          rows.push(row);
        }
        if (ok) {
          const tableRight = Math.max(...candidateLines.map((l) => l.right));
          const colWidthsPt = colStarts.map((start, idx) =>
            idx + 1 < colStarts.length
              ? colStarts[idx + 1] - start
              : Math.max(40, tableRight - start),
          );
          blocks.push({
            kind: "table",
            rows,
            colWidthsPt,
            x: candidateLines[0].x,
            y: candidateLines[0].y,
            fontSize: candidateLines[0].fontSize,
          });
          prevBottom =
            candidateLines[candidateLines.length - 1].y +
            candidateLines[candidateLines.length - 1].fontSize;
          i = j;
          continue;
        }
      }
    }

    // --- headings (merge consecutive same-level lines) ---
    if (entry.type === "heading") {
      const group: Line[] = [line];
      let j = i + 1;
      while (j < classified.length) {
        const next = classified[j];
        if (next.type !== "heading" || next.level !== entry.level) break;
        if (
          next.line.y - group[group.length - 1].y >=
          entry.line.fontSize * 2.2
        )
          break;
        group.push(next.line);
        j++;
      }
      blocks.push({
        kind: "heading",
        level: entry.level,
        runs: group.flatMap((l, idx) =>
          idx === 0
            ? l.runs
            : [{ text: " ", bold: l.bold, italic: false }, ...l.runs],
        ),
        x: line.x,
        y: line.y,
        fontSize: line.fontSize,
        align: inferAlign(group, region.left, region.right),
      });
      prevBottom = group[group.length - 1].y + group[group.length - 1].fontSize;
      i = j;
      continue;
    }

    // --- lists ---
    if (entry.type === "bullet" || entry.type === "numbered") {
      const ordered = entry.type === "numbered";
      const markerRe = ordered ? NUMBERED_RE : BULLET_RE;
      const items: TextRun[][] = [];
      let j = i;
      while (j < classified.length) {
        const e = classified[j];
        if (e.type === (ordered ? "numbered" : "bullet")) {
          const match = e.line.text.match(markerRe);
          const strip = match ? match[0].length : 0;
          // Runs text may differ in leading space; strip by trimmed offset.
          const trimmedLead =
            e.line.runs.map((r) => r.text).join("").length -
            e.line.runs
              .map((r) => r.text)
              .join("")
              .trimStart().length;
          items.push(stripRunsPrefix(e.line.runs, trimmedLead + strip));
          j++;
        } else if (
          e.type === "text" &&
          items.length > 0 &&
          e.line.x > line.x + 6 &&
          e.line.y - classified[j - 1].line.y < e.line.fontSize * 2
        ) {
          const last = items[items.length - 1];
          items[items.length - 1] = [
            ...last,
            { text: " ", bold: false, italic: false },
            ...e.line.runs,
          ];
          j++;
        } else break;
      }
      blocks.push({
        kind: "list",
        ordered,
        items,
        x: line.x,
        y: line.y,
        fontSize: line.fontSize,
      });
      prevBottom = classified[j - 1].line.y + classified[j - 1].line.fontSize;
      i = j;
      continue;
    }

    // --- paragraphs: merge following text lines ---
    const group: Line[] = [line];
    let j = i + 1;
    while (j < classified.length && classified[j].type === "text") {
      const next = classified[j].line;
      const prevLine = group[group.length - 1];
      const gap = next.y - prevLine.y;
      const sizeRatio = next.fontSize / prevLine.fontSize;
      if (gap > prevLine.fontSize * 1.9 || sizeRatio < 0.85 || sizeRatio > 1.18)
        break;
      group.push(next);
      j++;
    }
    const runs: TextRun[] = [];
    group.forEach((l, idx) => {
      if (idx > 0) {
        const prevText = group[idx - 1].text;
        const dehyphenate =
          /[A-Za-z]-$/.test(prevText) && /^[a-z]/.test(l.text);
        if (dehyphenate && runs.length) {
          const last = runs[runs.length - 1];
          last.text = last.text.replace(/-$/, "");
        } else {
          runs.push({ text: " ", bold: false, italic: false });
        }
      }
      runs.push(...l.runs);
    });
    blocks.push({
      kind: "paragraph",
      runs,
      x: Math.min(...group.map((l) => l.x)),
      y: line.y,
      widthPt:
        Math.max(...group.map((l) => l.right)) -
        Math.min(...group.map((l) => l.x)),
      fontSize: line.fontSize,
      align: inferAlign(group, region.left, region.right),
      spaceBeforePt: spaceBefore(line),
    });
    prevBottom = group[group.length - 1].y + group[group.length - 1].fontSize;
    i = j;
  }
  return blocks;
}

export function structurePage(
  page: ExtractedPage,
  options: StructureOptions = DEFAULT_STRUCTURE_OPTIONS,
): StructuredPage {
  const lines = groupLines(page.items);
  const bodySize = medianBodyFontSize(lines);
  const regions = detectColumns(lines, page.widthPt);
  const multiColumn = regions.length > 1;

  const blocks: Block[] = [];
  for (const region of regions) {
    const regionLines = multiColumn
      ? lines.filter((l) => {
          const center = (l.x + l.right) / 2;
          return center >= region.left && center < region.right;
        })
      : lines;
    blocks.push(...structureRegion(regionLines, region, bodySize, options));
  }

  // Interleave images by vertical position within the block flow.
  for (const image of [...page.images].sort((a, b) => a.y - b.y)) {
    const block: Block = { kind: "image", image };
    const at = blocks.findIndex(
      (b) => b.kind !== "image" && b.y > image.y + image.height * 0.5,
    );
    if (at === -1) blocks.push(block);
    else blocks.splice(at, 0, block);
  }

  return {
    pageNumber: page.pageNumber,
    widthPt: page.widthPt,
    heightPt: page.heightPt,
    blocks,
    multiColumn,
    fromOcr: page.fromOcr,
  };
}

/**
 * Structure a whole document, removing running headers/footers: an identical
 * first-or-last text line repeated in the top/bottom margin of at least
 * three pages is dropped and counted.
 */
export function structureDocument(
  pages: ExtractedPage[],
  options: StructureOptions = DEFAULT_STRUCTURE_OPTIONS,
): {
  pages: StructuredPage[];
  removedRunningLines: number;
} {
  const structured = pages.map((page) => structurePage(page, options));
  if (pages.length < 3 || options.keepRunningHeadersFooters)
    return { pages: structured, removedRunningLines: 0 };

  const tally = new Map<string, number>();
  const edgeText = (page: StructuredPage, edge: "top" | "bottom") => {
    const texts = page.blocks.filter(
      (b): b is Extract<Block, { kind: "paragraph" | "heading" }> =>
        b.kind === "paragraph" || b.kind === "heading",
    );
    const block = edge === "top" ? texts[0] : texts[texts.length - 1];
    if (!block) return null;
    const margin = page.heightPt * 0.09;
    if (edge === "top" && block.y > margin) return null;
    if (edge === "bottom" && block.y < page.heightPt - margin) return null;
    const text = block.runs
      .map((r) => r.text)
      .join("")
      .replace(/\d+/g, "#")
      .trim()
      .toLowerCase();
    return text ? { key: `${edge}:${text}`, block } : null;
  };

  for (const page of structured) {
    for (const edge of ["top", "bottom"] as const) {
      const found = edgeText(page, edge);
      if (found) tally.set(found.key, (tally.get(found.key) ?? 0) + 1);
    }
  }
  const threshold = Math.max(3, Math.ceil(pages.length * 0.6));
  let removed = 0;
  for (const page of structured) {
    for (const edge of ["top", "bottom"] as const) {
      const found = edgeText(page, edge);
      if (found && (tally.get(found.key) ?? 0) >= threshold) {
        page.blocks = page.blocks.filter((b) => b !== found.block);
        removed++;
      }
    }
  }
  return { pages: structured, removedRunningLines: removed };
}
