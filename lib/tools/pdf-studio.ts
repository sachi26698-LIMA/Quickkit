/**
 * PDF page studio model: reorder, rotate, remove, extract, split.
 *
 * Pure and DOM-free. A studio plan is an ordered list of page operations —
 * which source page, which rotation, kept or dropped — so the UI can show
 * exactly what will be written before a single byte is produced, and the
 * maths stays unit testable.
 *
 * Originals are never modified: every operation describes a new document.
 */

export type PdfPageRotation = 0 | 90 | 180 | 270;

export type PdfPageOp = {
  /** Stable id so React keys and drag state survive reordering. */
  id: string;
  /** Index into the list of source PDFs. */
  sourceIndex: number;
  /** 1-based page number inside that source. */
  page: number;
  /** Extra clockwise rotation on top of whatever the page already carries. */
  rotation: PdfPageRotation;
  /** Dropped pages stay visible in the grid, struck through, until removed. */
  removed: boolean;
};

export type PdfStudioAction = "merge" | "extract" | "split" | "compress";

export const PDF_STUDIO_ACTIONS: readonly {
  id: PdfStudioAction;
  label: string;
  note: string;
}[] = [
  {
    id: "merge",
    label: "Merge into one PDF",
    note: "Every kept page, in the order shown, written to a single document.",
  },
  {
    id: "extract",
    label: "Extract selected pages",
    note: "One PDF holding just the pages in your range, original order kept.",
  },
  {
    id: "split",
    label: "Split by ranges",
    note: "One PDF per range, downloaded individually or as a ZIP.",
  },
  {
    id: "compress",
    label: "Compress",
    note: "Rebuilds the kept pages with smaller image streams. Quality settings apply.",
  },
] as const;

/** Where stamped page numbers sit on the page. */
export type PageNumberPosition =
  | "bottom-center"
  | "bottom-right"
  | "bottom-left"
  | "top-center"
  | "top-right"
  | "top-left";

export const PAGE_NUMBER_POSITIONS: readonly {
  id: PageNumberPosition;
  label: string;
}[] = [
  { id: "bottom-center", label: "Bottom centre" },
  { id: "bottom-right", label: "Bottom right" },
  { id: "bottom-left", label: "Bottom left" },
  { id: "top-center", label: "Top centre" },
  { id: "top-right", label: "Top right" },
  { id: "top-left", label: "Top left" },
];

/** Layouts for the stamped number. `{n}` is the page, `{total}` the count. */
export const PAGE_NUMBER_FORMATS: readonly { id: string; label: string }[] = [
  { id: "{n}", label: "1" },
  { id: "{n} / {total}", label: "1 / 12" },
  { id: "Page {n} of {total}", label: "Page 1 of 12" },
  { id: "{n} of {total}", label: "1 of 12" },
];

export type PdfStudioSettings = {
  action: PdfStudioAction;
  /** "1-3, 7" — meaning depends on the action. */
  ranges: string;
  /** Index into the shared PDF compression presets. */
  compressPresetId: string;
  title: string;
  /** PDF document information dictionary, beyond the title. */
  author: string;
  subject: string;
  /** Comma-separated; written as a PDF keyword array. */
  keywords: string;
  filename: string;
  /** Stamp sequential page numbers onto every written page. */
  pageNumbers: boolean;
  pageNumberFormat: string;
  pageNumberPosition: PageNumberPosition;
  /** Point size of the stamped text. */
  pageNumberSize: number;
  /** Diagonal text drawn across every written page. */
  watermarkText: string;
  /** 0–100; lower is fainter. */
  watermarkOpacity: number;
  /** Point size of the watermark text. */
  watermarkSize: number;
  /** Clockwise degrees; 45 is the conventional diagonal. */
  watermarkAngle: number;
};

export function defaultPdfStudioSettings(): PdfStudioSettings {
  return {
    action: "merge",
    ranges: "",
    compressPresetId: "balanced",
    title: "",
    author: "",
    subject: "",
    keywords: "",
    filename: "quickkit-pages.pdf",
    pageNumbers: false,
    pageNumberFormat: "{n} / {total}",
    pageNumberPosition: "bottom-center",
    pageNumberSize: 10,
    watermarkText: "",
    watermarkOpacity: 18,
    watermarkSize: 48,
    watermarkAngle: 45,
  };
}

/** Expand a page-number format into the text to stamp. */
export function pageNumberLabel(
  format: string,
  page: number,
  total: number,
): string {
  return (
    format
      .replace(/\{n\}/gi, String(page))
      .replace(/\{total\}/gi, String(total))
      // Anything still braced is not a token we know. Drop it rather than
      // stamping "{bogus}" onto every page, matching expandNameTemplate.
      .replace(/\{[^}]*\}/g, "")
      .trim()
  );
}

export type PageNumberPlacement = {
  x: number;
  y: number;
  /** Right- or left-aligned text needs the drawn width to place correctly. */
  align: "left" | "center" | "right";
};

/**
 * Where to draw the label on a page of the given size, in PDF points.
 *
 * Margins are fixed at 24 pt so a number never collides with page content and
 * always clears the trim edge on any page size.
 */
export function pageNumberPlacement(
  position: PageNumberPosition,
  pageWidthPt: number,
  pageHeightPt: number,
  marginPt = 24,
): PageNumberPlacement {
  const horizontal = position.endsWith("right")
    ? "right"
    : position.endsWith("left")
      ? "left"
      : "center";
  const x =
    horizontal === "right"
      ? pageWidthPt - marginPt
      : horizontal === "left"
        ? marginPt
        : pageWidthPt / 2;
  const y = position.startsWith("top") ? pageHeightPt - marginPt : marginPt;
  return { x, y, align: horizontal };
}

/**
 * Split a keyword field into the array a PDF keywords entry expects.
 *
 * Accepts comma or semicolon separators, drops empties, and de-duplicates
 * case-insensitively so a repeated tag is not written twice.
 */
export function parseKeywords(value: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of value.split(/[,;]/)) {
    const tag = raw.trim();
    if (!tag) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
  }
  return out;
}

export type WatermarkPlacement = {
  x: number;
  y: number;
  angle: number;
};

/**
 * Where to draw a centred diagonal watermark on a page of the given size.
 *
 * The text is rotated about its own centre, so the draw origin is offset by
 * half the rotated text box. Without that offset a 45 degree watermark drifts
 * off the page centre and clips on narrow pages.
 */
export function watermarkPlacement(
  pageWidthPt: number,
  pageHeightPt: number,
  textWidthPt: number,
  textHeightPt: number,
  angleDeg: number,
): WatermarkPlacement {
  const radians = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  // Rotating about the centre: shift the origin back by half the rotated box.
  const x = pageWidthPt / 2 - (textWidthPt * cos - textHeightPt * sin) / 2;
  const y = pageHeightPt / 2 - (textWidthPt * sin + textHeightPt * cos) / 2;
  return { x, y, angle: ((angleDeg % 360) + 360) % 360 };
}

/* ------------------------------- building -------------------------------- */

export type PdfSourceSummary = { pages: number; name: string };

let sequence = 0;

/** One operation per page of every source, in upload order. */
export function buildPageList(
  sources: readonly PdfSourceSummary[],
): PdfPageOp[] {
  const pages: PdfPageOp[] = [];
  sources.forEach((source, sourceIndex) => {
    for (let page = 1; page <= Math.max(0, source.pages); page += 1) {
      sequence += 1;
      pages.push({
        id: `page-${sourceIndex}-${page}-${sequence}`,
        sourceIndex,
        page,
        rotation: 0,
        removed: false,
      });
    }
  });
  return pages;
}

/* ----------------------------- page editing ------------------------------ */

function mapPage(
  pages: readonly PdfPageOp[],
  id: string,
  change: (page: PdfPageOp) => PdfPageOp,
): PdfPageOp[] {
  return pages.map((page) => (page.id === id ? change(page) : page));
}

export function rotatePage(
  pages: readonly PdfPageOp[],
  id: string,
  delta: 90 | -90,
): PdfPageOp[] {
  return mapPage(pages, id, (page) => ({
    ...page,
    rotation: ((((page.rotation + delta) % 360) + 360) %
      360) as PdfPageRotation,
  }));
}

export function toggleRemoved(
  pages: readonly PdfPageOp[],
  id: string,
): PdfPageOp[] {
  return mapPage(pages, id, (page) => ({ ...page, removed: !page.removed }));
}

export function setRemoved(
  pages: readonly PdfPageOp[],
  ids: readonly string[],
  removed: boolean,
): PdfPageOp[] {
  const wanted = new Set(ids);
  return pages.map((page) =>
    wanted.has(page.id) ? { ...page, removed } : page,
  );
}

/** Move a page by a number of positions; clamped at both ends. */
export function movePage(
  pages: readonly PdfPageOp[],
  id: string,
  delta: number,
): PdfPageOp[] {
  const from = pages.findIndex((page) => page.id === id);
  const to = from + delta;
  if (from < 0 || to < 0 || to >= pages.length) return [...pages];
  const next = [...pages];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

/** Drop a page into the position held by another (drag-and-drop). */
export function dropPage(
  pages: readonly PdfPageOp[],
  fromId: string,
  toId: string,
): PdfPageOp[] {
  if (fromId === toId) return [...pages];
  const from = pages.findIndex((page) => page.id === fromId);
  const to = pages.findIndex((page) => page.id === toId);
  if (from < 0 || to < 0) return [...pages];
  const next = [...pages];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

/**
 * Duplicate a page, inserting the copy directly after the original.
 *
 * The copy inherits the source's rotation, since duplicating a page you have
 * already turned is the point of the action. It is always inserted kept, even
 * when the source is struck through — duplicating is an explicit request for
 * another usable copy of that page, not a request to clone a deletion.
 */
export function duplicatePage(
  pages: readonly PdfPageOp[],
  id: string,
): PdfPageOp[] {
  const index = pages.findIndex((page) => page.id === id);
  if (index < 0) return [...pages];
  const source = pages[index];
  sequence += 1;
  const copy: PdfPageOp = {
    ...source,
    id: `page-${source.sourceIndex}-${source.page}-${sequence}`,
    removed: false,
  };
  const next = [...pages];
  next.splice(index + 1, 0, copy);
  return next;
}

/* ------------------------------ selections ------------------------------- */

/**
 * Mark every page outside the given ranges as removed. An empty range keeps
 * everything, which is what "extract" means before the user types anything.
 */
export function keepOnlyRanges(
  pages: readonly PdfPageOp[],
  ranges: string,
  sources: readonly PdfSourceSummary[],
): PdfPageOp[] {
  const wanted = pagesForSources(pages, ranges, sources);
  if (!wanted) return pages.map((page) => ({ ...page, removed: false }));
  return pages.map((page) => ({ ...page, removed: !wanted.has(page.id) }));
}

/** Mark the pages inside the given ranges as removed. */
export function dropRanges(
  pages: readonly PdfPageOp[],
  ranges: string,
  sources: readonly PdfSourceSummary[],
): PdfPageOp[] {
  const wanted = pagesForSources(pages, ranges, sources);
  if (!wanted) return [...pages];
  return pages.map((page) => ({
    ...page,
    removed: page.removed || wanted.has(page.id),
  }));
}

const RANGE_TOKEN = /^(\d+)\s*(?:[-–]\s*(\d+))?$/;

/**
 * Resolve a range against one source's length.
 *
 * Deliberately more forgiving than `parsePageRange`: a studio plan usually
 * holds several documents of different lengths, so "1-3" against a 2-page file
 * means pages 1–2, not an error. Syntax mistakes still throw.
 */
export function resolveRangePages(input: string, pageCount: number): number[] {
  const trimmed = input.trim();
  const total = Math.max(0, Math.floor(pageCount));
  if (!trimmed || /^all$/i.test(trimmed))
    return Array.from({ length: total }, (_, index) => index + 1);
  const selected = new Set<number>();
  for (const chunk of trimmed.split(",")) {
    const part = chunk.trim();
    if (!part) continue;
    const match = RANGE_TOKEN.exec(part);
    if (!match)
      throw new Error(
        `"${part}" is not a page or range. Use numbers like 1-3, 5 or 8.`,
      );
    const start = Number(match[1]);
    const end = match[2] ? Number(match[2]) : start;
    if (start < 1 || end < 1) throw new Error("Page numbers start at 1.");
    const from = Math.min(start, end);
    const to = Math.min(total, Math.max(start, end));
    for (let page = from; page <= to; page += 1) selected.add(page);
  }
  return [...selected].sort((a, b) => a - b);
}

/**
 * Resolve a range string against every source in the plan. Ranges are applied
 * per source, so "1-2" on two 5-page PDFs means pages 1–2 of each.
 * Returns null when the range is empty.
 */
function pagesForSources(
  pages: readonly PdfPageOp[],
  ranges: string,
  sources: readonly PdfSourceSummary[],
): Set<string> | null {
  if (!ranges.trim()) return null;
  const ids = new Set<string>();
  sources.forEach((source, sourceIndex) => {
    const selected = resolveRangePages(ranges, source.pages);
    for (const page of pages)
      if (page.sourceIndex === sourceIndex && selected.includes(page.page))
        ids.add(page.id);
  });
  return ids;
}

/** Pages that will actually be written, in order. */
export function keptPages(pages: readonly PdfPageOp[]): PdfPageOp[] {
  return pages.filter((page) => !page.removed);
}

/** One group per range, for the split action. */
export function splitGroups(
  pages: readonly PdfPageOp[],
  ranges: string,
  sources: readonly PdfSourceSummary[],
): { label: string; pages: PdfPageOp[] }[] {
  const kept = keptPages(pages);
  if (!ranges.trim()) return kept.length ? [{ label: "all", pages: kept }] : [];
  const groups: { label: string; pages: PdfPageOp[] }[] = [];
  for (const group of ranges
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)) {
    const ids = pagesForSources(pages, group, sources);
    const selected = kept.filter((page) => ids?.has(page.id));
    if (selected.length) groups.push({ label: group, pages: selected });
  }
  return groups;
}

/* ------------------------------- reporting ------------------------------- */

export type PdfStudioSummary = {
  action: PdfStudioAction;
  sources: number;
  total: number;
  kept: number;
  removed: number;
  rotated: number;
  outputs: number;
};

export function summarisePlan(
  pages: readonly PdfPageOp[],
  action: PdfStudioAction,
  ranges: string,
  sources: readonly PdfSourceSummary[],
): PdfStudioSummary {
  const kept = keptPages(pages);
  const groups =
    action === "split" ? splitGroups(pages, ranges, sources).length : 0;
  return {
    action,
    sources: new Set(pages.map((page) => page.sourceIndex)).size,
    total: pages.length,
    kept: kept.length,
    removed: pages.length - kept.length,
    rotated: kept.filter((page) => page.rotation !== 0).length,
    outputs: action === "split" ? groups : kept.length ? 1 : 0,
  };
}

export function describePlan(summary: PdfStudioSummary): string {
  if (!summary.kept)
    return "No pages are selected, so nothing will be written.";
  const parts = [
    `${summary.kept} of ${summary.total} page${summary.total === 1 ? "" : "s"}`,
  ];
  if (summary.sources > 1) parts.push(`from ${summary.sources} files`);
  if (summary.rotated) parts.push(`${summary.rotated} rotated`);
  if (summary.removed) parts.push(`${summary.removed} dropped`);
  if (summary.action === "split")
    parts.push(
      `into ${summary.outputs} PDF${summary.outputs === 1 ? "" : "s"}`,
    );
  return parts.join(" · ");
}

/** Why the plan cannot run, or null when it can. */
export function planProblem(
  pages: readonly PdfPageOp[],
  action: PdfStudioAction,
  ranges: string,
  sources: readonly PdfSourceSummary[],
): string | null {
  if (!pages.length) return "Add a PDF first.";
  if (!keptPages(pages).length)
    return "Every page is marked as removed. Keep at least one page.";
  if (action === "split" && ranges.trim()) {
    const groups = splitGroups(pages, ranges, sources);
    if (!groups.length) return "No page matches that range.";
  }
  if (ranges.trim()) {
    try {
      for (const source of sources) resolveRangePages(ranges, source.pages);
    } catch (error) {
      return error instanceof Error ? error.message : "Invalid page range.";
    }
  }
  return null;
}

/** Output name for one group, de-duplicated by the caller. */
export function studioOutputName(
  filename: string,
  label: string | null,
  extension = "pdf",
): string {
  const base = (filename.trim() || "quickkit-pages").replace(/\.pdf$/i, "");
  const safe =
    base
      .replace(/[^\w\-. ]+/g, "-")
      .replace(/^[\s.\-]+/, "")
      .trim() || "quickkit-pages";
  const suffix = label ? `-${label.replace(/[^\w\-.]+/g, "-")}` : "";
  return `${safe}${suffix}.${extension}`;
}
