/**
 * QR print layout definitions — pure data and pure functions.
 *
 * Deliberately free of pdf-lib: the studio hook imports DEFAULT_SHEET and the
 * export panel imports PRINT_LAYOUTS/clampSheet at module load, and those must
 * not drag ~240 kB gzipped of PDF code into the tool's first paint. The PDF
 * builders live in ./layouts and load pdf-lib dynamically.
 */
export type QrPrintLayoutId =
  | "single"
  | "business-card"
  | "sticker"
  | "product-label"
  | "poster"
  | "table-tent"
  | "a4-sheet";

export type QrPrintLayout = {
  id: QrPrintLayoutId;
  name: string;
  blurb: string;
  /** Fixed page size in mm; null means "use the chosen paper" (single). */
  pageMm: { w: number; h: number } | null;
  /** Printed code width in mm (a starting point the sheet grid can override). */
  codeMm: number;
};

export const PRINT_LAYOUTS: QrPrintLayout[] = [
  {
    id: "single",
    name: "Single code",
    blurb: "One code centred on the paper you choose below.",
    pageMm: null,
    codeMm: 45,
  },
  {
    id: "business-card",
    name: "Business card",
    blurb: "85 × 55 mm card — code on the right, name on the left.",
    pageMm: { w: 85, h: 55 },
    codeMm: 22,
  },
  {
    id: "sticker",
    name: "Sticker",
    blurb: "50 × 50 mm square label — code fills the face.",
    pageMm: { w: 50, h: 50 },
    codeMm: 40,
  },
  {
    id: "product-label",
    name: "Product label",
    blurb: "70 × 40 mm label — code left, caption right.",
    pageMm: { w: 70, h: 40 },
    codeMm: 28,
  },
  {
    id: "poster",
    name: "Poster",
    blurb: "A4 with a large 130 mm code and a bold caption.",
    pageMm: { w: 210, h: 297 },
    codeMm: 130,
  },
  {
    id: "table-tent",
    name: "Table tent",
    blurb: "A4 landscape, fold in half — a code on each standing face.",
    pageMm: { w: 297, h: 210 },
    codeMm: 70,
  },
  {
    id: "a4-sheet",
    name: "A4 cut sheet",
    blurb: "A grid of identical codes on A4, with cut guides.",
    pageMm: { w: 210, h: 297 },
    codeMm: 45,
  },
];

export function printLayoutDef(id: QrPrintLayoutId): QrPrintLayout {
  return PRINT_LAYOUTS.find((layout) => layout.id === id) ?? PRINT_LAYOUTS[0];
}

export type SheetOptions = {
  cols: number;
  rows: number;
  codeMm: number;
  gapMm: number;
};

export const DEFAULT_SHEET: SheetOptions = {
  cols: 3,
  rows: 4,
  codeMm: 45,
  gapMm: 6,
};

/** Clamp a sheet grid to something that actually fits on A4 with a margin. */
export function clampSheet(input: Partial<SheetOptions>): SheetOptions {
  const base = { ...DEFAULT_SHEET, ...input };
  const cols = Math.max(1, Math.min(6, Math.round(base.cols)));
  const rows = Math.max(1, Math.min(8, Math.round(base.rows)));
  const gapMm = Math.max(0, Math.min(15, base.gapMm));
  // Leave a 10 mm outer margin; shrink the code if the grid would overflow.
  const maxCode = Math.min(
    (210 - 20 - gapMm * (cols - 1)) / cols,
    (297 - 20 - gapMm * (rows - 1)) / rows,
  );
  const codeMm = Math.max(12, Math.min(base.codeMm, Math.floor(maxCode)));
  return { cols, rows, codeMm, gapMm };
}
