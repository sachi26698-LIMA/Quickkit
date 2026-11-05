import {
  PDFDocument,
  rgb,
  type PDFFont,
  type PDFImage,
  type PDFPage,
} from "@cantoo/pdf-lib";
import { Measurer } from "./measure";
import type { Face, Script } from "./fonts";
import { baseRun } from "./ooxml";
import type {
  Align,
  Block,
  DocxModel,
  Edge,
  Paragraph,
  Run,
  RunProps,
  Section,
  Table,
  TableCell,
} from "./ooxml";

export type RenderProgress = { stage: string; done?: number; total?: number };

export type RenderOptions = {
  maxPages?: number;
  onStage?: (progress: RenderProgress) => void;
  signal?: AbortSignal;
};

type Segment = { text: string; font: PDFFont; width: number };

type LineItem = {
  kind: "text" | "image" | "tab";
  segments?: Segment[];
  field?: "PAGE" | "NUMPAGES";
  props?: RunProps;
  width: number;
  height: number;
  ascent: number;
  descent: number;
  isSpace?: boolean;
  textChars?: number;
  image?: PDFImage;
  imageWidth?: number;
  imageHeight?: number;
};

type Line = {
  items: LineItem[];
  width: number;
  height: number;
  ascent: number;
};

type FlowItem = {
  height: number;
  textChars?: number;
  draw: (left: number, top: number) => void;
};

type CellLayout = {
  items: FlowItem[];
  height: number;
  cell: TableCell;
  width: number;
  left: number;
  edges: { top: Edge; bottom: Edge; left: Edge; right: Edge };
};

const toColor = (hex: string | null | undefined, fallback = "000000") => {
  const value = (hex || fallback).replace("#", "");
  const safe = /^[0-9a-f]{6}$/i.test(value) ? value : fallback;
  return rgb(
    parseInt(safe.slice(0, 2), 16) / 255,
    parseInt(safe.slice(2, 4), 16) / 255,
    parseInt(safe.slice(4, 6), 16) / 255,
  );
};

function faceOf(font: string): Face {
  const value = font.toLowerCase();
  if (/courier|mono|consol|menlo/.test(value)) return "mono";
  if (/times|serif|georgia|garamond|cambria|book|minion|palatino/.test(value))
    return "serif";
  return "sans";
}

export class DocxPdfRenderer {
  private readonly warnings: Set<string>;
  private readonly maxPages: number;
  private readonly onStage?: (progress: RenderProgress) => void;
  private readonly signal?: AbortSignal;
  private readonly totalBlocks: number;
  private readonly images = new Map<string, PDFImage>();
  private readonly pageMetadata: {
    index: number;
    section: Section;
    sectionPage: number;
  }[] = [];
  private section: Section;
  private page?: PDFPage;
  private pageIndex = -1;
  private sectionPage = 0;
  private y = 0;
  private renderedBlocks = 0;

  constructor(
    private readonly pdf: PDFDocument,
    private readonly model: DocxModel,
    private readonly measure: Measurer,
    options: RenderOptions,
  ) {
    this.warnings = model.warnings;
    this.maxPages = options.maxPages ?? 1000;
    this.onStage = options.onStage;
    this.signal = options.signal;
    this.section = model.sections[0];
    this.totalBlocks = model.sections.reduce(
      (sum, section) => sum + section.blocks.length,
      0,
    );
  }

  static async create(model: DocxModel, options: RenderOptions = {}) {
    const pdf = await PDFDocument.create();
    pdf.setProducer("QUICKKIT DOCX renderer");
    pdf.setCreator("QUICKKIT Word to PDF");
    return new DocxPdfRenderer(pdf, model, new Measurer(pdf), options);
  }

  async render() {
    await this.preloadFonts();
    await this.preloadImages();
    for (const [index, section] of this.model.sections.entries()) {
      this.signal?.throwIfAborted();
      this.startSection(section, index > 0);
      for (const block of section.blocks) {
        this.signal?.throwIfAborted();
        this.renderBlock(block);
        this.renderedBlocks++;
        if (this.renderedBlocks % 4 === 0) {
          this.report();
          await Promise.resolve();
        }
      }
    }
    if (this.pageIndex < 0) {
      this.startSection(this.model.sections[0], false);
      this.newPage();
    }
    this.report();
    this.drawHeadersAndFooters();
    this.pdf.setTitle(this.model.title || "Converted document");
    if (this.model.author) this.pdf.setAuthor(this.model.author);
    if (this.model.subject) this.pdf.setSubject(this.model.subject);
    if (this.model.keywords)
      this.pdf.setKeywords(
        this.model.keywords
          .split(/[,;]/)
          .map((value) => value.trim())
          .filter(Boolean),
      );
    const bytes = await this.pdf.save();
    return {
      bytes,
      pages: this.pdf.getPageCount(),
      warnings: [...this.warnings],
    };
  }

  private report() {
    this.onStage?.({
      stage: "Rendering document pages",
      done: this.renderedBlocks,
      total: Math.max(this.totalBlocks, 1),
    });
  }

  // ---------------------------------------------------------------- preload

  private async preloadFonts() {
    const requests: {
      face: Face;
      bold: boolean;
      italic: boolean;
      script: Script;
    }[] = [];
    const scripts: Script[] = [
      "latin",
      "devanagari",
      "gujarati",
      "bengali",
      "tamil",
      "telugu",
      "kannada",
      "malayalam",
      "gurmukhi",
    ];
    const seen = new Set<string>();
    const visit = (blocks: Block[]) => {
      for (const block of blocks) {
        if (block.kind === "paragraph") {
          for (const run of block.runs) {
            if (run.kind !== "text") continue;
            const face = faceOf(run.props.font);
            const key = `${face}|${run.props.bold}|${run.props.italic}`;
            if (seen.has(key)) continue;
            seen.add(key);
            for (const script of scripts)
              requests.push({
                face,
                bold: run.props.bold,
                italic: run.props.italic,
                script,
              });
          }
        } else {
          for (const row of block.rows)
            for (const cell of row.cells) visit(cell.blocks);
        }
      }
    };
    for (const section of this.model.sections) {
      visit(section.blocks);
      for (const header of Object.values(section.headers))
        if (header) visit(header.blocks);
      for (const footer of Object.values(section.footers))
        if (footer) visit(footer.blocks);
    }
    requests.push({
      face: "sans",
      bold: false,
      italic: false,
      script: "latin",
    });
    this.onStage?.({ stage: "Preparing fonts and images" });
    await this.measure.preload(requests);
  }

  private async preloadImages() {
    for (const [rel, asset] of this.model.images) {
      try {
        const image =
          asset.type === "image/png"
            ? await this.pdf.embedPng(asset.bytes)
            : await this.pdf.embedJpg(asset.bytes);
        this.images.set(rel, image);
      } catch {
        this.warnings.add(
          "An image could not be embedded and was skipped (unsupported encoding).",
        );
      }
    }
  }

  // ----------------------------------------------------------------- pages

  private startSection(section: Section, breakPage: boolean) {
    this.section = section;
    this.sectionPage = 0;
    if (breakPage && this.page) this.newPage();
    else this.y = this.contentTop;
  }

  private get contentTop() {
    return (
      this.section.pageHeight - this.section.margins.top - this.headerReserve()
    );
  }

  private get contentBottom() {
    return this.section.margins.bottom + this.footerReserve();
  }

  private get pageContentHeight() {
    return Math.max(40, this.contentTop - this.contentBottom);
  }

  private get contentWidth() {
    return Math.max(
      40,
      this.section.pageWidth -
        this.section.margins.left -
        this.section.margins.right,
    );
  }

  /**
   * Word's header/footer precedence: a title-page part for the first page of a
   * section (when w:titlePg is set), otherwise the even part on even pages when
   * w:evenAndOddHeaders is on, otherwise the default part.
   */
  private partFor(
    section: Section,
    kind: "headers" | "footers",
    sectionPage: number,
    pageNumber: number,
  ) {
    const parts = section[kind];
    if (sectionPage === 0 && section.titlePg && parts.first?.found)
      return parts.first;
    if (this.model.evenOdd && pageNumber % 2 === 0 && parts.even?.found)
      return parts.even;
    return parts.default;
  }

  private headerReserve() {
    const header = this.partFor(
      this.section,
      "headers",
      this.sectionPage,
      this.pageIndex + 1,
    );
    if (!header) return 0;
    const height = this.flow(header.blocks, this.contentWidth).reduce(
      (sum, item) => sum + item.height,
      0,
    );
    if (!height) return 0;
    return Math.min(height + 6, Math.max(20, this.section.margins.top * 0.85));
  }

  private footerReserve() {
    const footer = this.partFor(
      this.section,
      "footers",
      this.sectionPage,
      this.pageIndex + 1,
    );
    if (!footer) return 0;
    const height = this.flow(footer.blocks, this.contentWidth).reduce(
      (sum, item) => sum + item.height,
      0,
    );
    if (!height) return 0;
    return Math.min(
      height + 6,
      Math.max(20, this.section.margins.bottom * 0.85),
    );
  }

  private newPage() {
    this.pageIndex++;
    if (this.pageIndex >= this.maxPages)
      throw new Error(
        `This document renders to more than ${this.maxPages} pages. Split it before converting.`,
      );
    this.page = this.pdf.addPage([
      this.section.pageWidth,
      this.section.pageHeight,
    ]);
    this.pageMetadata.push({
      index: this.pageIndex,
      section: this.section,
      sectionPage: this.sectionPage,
    });
    this.sectionPage++;
    this.y = this.contentTop;
  }

  private ensurePage() {
    if (!this.page) this.newPage();
  }

  // ------------------------------------------------------------- paragraphs

  private runSegments(text: string, props: RunProps) {
    const face = faceOf(props.font);
    const parts = this.measure.segments(
      text,
      props.size,
      face,
      props.bold,
      props.italic,
    );
    const segments: Segment[] = parts.map((part) => ({
      text: part.text,
      font: part.font,
      width: this.measure.segmentWidth(
        part.text,
        part.script,
        props.size,
        face,
        props.bold,
        props.italic,
      ),
    }));
    return {
      segments,
      width: segments.reduce((sum, part) => sum + part.width, 0),
    };
  }

  private metrics(props: RunProps) {
    const font = this.measure.font(
      faceOf(props.font),
      props.bold,
      props.italic,
      "latin",
    );
    return {
      ascent: font.heightAtSize(props.size, { descender: false }),
      descent: props.size * 0.27,
    };
  }

  private layoutParagraph(paragraph: Paragraph, width: number): Line[] {
    const props = paragraph.props;
    const baseSize = props.run.size ?? 11;
    const left = Math.max(0, width - props.indentLeft - props.indentRight);
    const firstIndent = props.firstLine - props.hanging;
    const firstLimit = Math.max(12, left - firstIndent);
    const lines: Line[] = [];
    let items: LineItem[] = [];
    let x = 0;
    let limit = firstLimit;

    const flush = () => {
      while (items.length && items[items.length - 1].isSpace) {
        x -= items[items.length - 1].width;
        items.pop();
      }
      const ascent = items.length
        ? Math.max(...items.map((item) => item.ascent))
        : baseSize * 0.8;
      lines.push({
        items,
        width: Math.max(0, x),
        height: this.lineHeight(items, props, baseSize),
        ascent,
      });
      items = [];
      x = 0;
      limit = Math.max(12, left);
    };

    const addToken = (text: string, runProps: RunProps, isSpace: boolean) => {
      const built = this.runSegments(text, runProps);
      if (!built.width) return;
      if (isSpace && x === 0) return;
      if (x + built.width > limit && items.length) flush();
      if (built.width > limit) {
        // Word breaks a word wider than the column by characters.
        const { ascent, descent } = this.metrics(runProps);
        let buffer = "";
        const emit = (value: string) => {
          const piece = this.runSegments(value, runProps);
          if (!piece.width) return;
          if (x + piece.width > limit && items.length) flush();
          items.push({
            kind: "text",
            segments: piece.segments,
            textChars: value.length,
            props: runProps,
            width: piece.width,
            height: ascent + descent,
            ascent,
            descent,
          });
          x += piece.width;
        };
        for (const char of text) {
          const candidate = buffer + char;
          if (this.runSegments(candidate, runProps).width > limit && buffer) {
            emit(buffer);
            flush();
            buffer = char;
          } else buffer = candidate;
        }
        if (buffer) emit(buffer);
        return;
      }
      const { ascent, descent } = this.metrics(runProps);
      items.push({
        kind: "text",
        segments: built.segments,
        textChars: text.length,
        props: runProps,
        width: built.width,
        height: ascent + descent,
        ascent,
        descent,
        isSpace,
      });
      x += built.width;
    };

    // Flatten the paragraph into measurable tokens so a tab can look ahead and
    // align the text that follows it (left, centre or right tab stop).
    type Token =
      | { kind: "word"; text: string; props: RunProps }
      | { kind: "space"; props: RunProps }
      | { kind: "tab"; props: RunProps }
      | { kind: "break"; props: RunProps }
      | { kind: "field"; name: "PAGE" | "NUMPAGES"; props: RunProps }
      | { kind: "image"; run: Extract<Run, { kind: "image" }> };

    const tokens: Token[] = [];
    for (const run of paragraph.runs) {
      if (run.kind === "text") {
        let text = run.text.replace(/\u00a0/g, " ");
        if (run.props.caps || run.props.smallCaps) text = text.toUpperCase();
        for (const chunk of text.split(/(\t+)/)) {
          if (!chunk) continue;
          if (/^\t+$/.test(chunk)) {
            for (let index = 0; index < chunk.length; index++)
              tokens.push({ kind: "tab", props: run.props });
            continue;
          }
          for (const piece of chunk.split(/(\s+)/)) {
            if (!piece) continue;
            if (/^\s+$/.test(piece))
              tokens.push({ kind: "space", props: run.props });
            else tokens.push({ kind: "word", text: piece, props: run.props });
          }
        }
      } else if (run.kind === "tab")
        tokens.push({ kind: "tab", props: { ...baseRun, ...props.run } });
      else if (run.kind === "break")
        tokens.push({ kind: "break", props: { ...baseRun, ...props.run } });
      else if (run.kind === "field")
        tokens.push({
          kind: "field",
          name: run.name,
          props: { ...baseRun, ...props.run },
        });
      else if (run.kind === "image") tokens.push({ kind: "image", run });
    }

    const tokenWidth = (token: Token): number => {
      if (token.kind === "word")
        return this.runSegments(token.text, token.props).width;
      if (token.kind === "space")
        return this.runSegments(" ", token.props).width;
      if (token.kind === "field")
        return this.runSegments("0000", token.props).width;
      if (token.kind === "image") return token.run.width || 0;
      return 0;
    };

    /** Width of the content after a tab, up to the next tab or break. */
    const widthAhead = (from: number): { width: number; stops: boolean } => {
      let width = 0;
      for (let index = from; index < tokens.length; index++) {
        const token = tokens[index];
        if (token.kind === "tab" || token.kind === "break")
          return { width, stops: true };
        width += tokenWidth(token);
      }
      return { width, stops: false };
    };

    for (const [tokenIndex, token] of tokens.entries()) {
      if (token.kind === "word") {
        addToken(token.text, token.props, false);
        continue;
      }
      if (token.kind === "space") {
        addToken(" ", token.props, true);
        continue;
      }
      if (token.kind === "break") {
        flush();
        continue;
      }
      if (token.kind === "field") {
        const fieldProps: RunProps = { ...baseRun, ...token.props };
        const built = this.runSegments("0000", fieldProps);
        const { ascent, descent } = this.metrics(fieldProps);
        items.push({
          kind: "text",
          segments: built.segments,
          textChars: 0,
          field: token.name,
          props: fieldProps,
          width: built.width,
          height: ascent + descent,
          ascent,
          descent,
        });
        x += built.width;
        continue;
      }
      if (token.kind === "image") {
        const image = this.images.get(token.run.rel);
        if (!image) continue;
        let w = token.run.width;
        let h = token.run.height;
        if (!Number.isFinite(w) || !Number.isFinite(h) || w < 1 || h < 1)
          continue;
        if (w > limit) {
          h = (h * limit) / w;
          w = limit;
        }
        if (x + w > limit && items.length) flush();
        items.push({
          kind: "image",
          image,
          width: w,
          imageWidth: w,
          imageHeight: h,
          height: h,
          ascent: h * 0.98,
          descent: h * 0.02,
        });
        x += w;
        continue;
      }
      // Tab: honour the stop alignment, wrapping first if the stop is past the
      // right edge of the current line.
      const ahead = widthAhead(tokenIndex + 1);
      const place = (currentX: number) => {
        // A list label ("1." / "•") is followed by a tab that snaps the body
        // text to the paragraph's hanging indent, not to the default grid.
        const listStop =
          props.hanging > 0 &&
          currentX < props.hanging - 0.5 &&
          !props.tabs.length
            ? { position: props.hanging, align: "left" as const }
            : null;
        const stop = listStop ?? this.nextTabStop(currentX, props, left);
        const target =
          stop.align === "right"
            ? stop.position - ahead.width
            : stop.align === "center"
              ? stop.position - ahead.width / 2
              : stop.position;
        return Math.max(currentX + 4, Math.min(target, left));
      };
      let target = place(x);
      if (target + ahead.width > limit + 0.5 && items.length) {
        flush();
        target = place(x);
      }
      const widthUsed = Math.max(0, target - x);
      items.push({
        kind: "tab",
        width: widthUsed,
        height: baseSize,
        ascent: baseSize * 0.8,
        descent: baseSize * 0.2,
      });
      x += widthUsed;
    }
    flush();
    return lines;
  }

  private lineHeight(
    items: LineItem[],
    props: Paragraph["props"],
    baseSize: number,
  ) {
    const natural = items.length
      ? Math.max(...items.map((item) => item.ascent + item.descent)) * 1.16
      : baseSize * 1.3;
    if (props.lineRule === "exact") return Math.max(4, props.line);
    if (props.lineRule === "atLeast") return Math.max(props.line, natural);
    const multiplier = props.line > 0 ? props.line : 1.15;
    return Math.max(4, natural * multiplier);
  }

  private nextTabStop(
    x: number,
    props: Paragraph["props"],
    width: number,
  ): { position: number; align: "left" | "center" | "right" } {
    const stop = props.tabs.find(
      (tab) => tab.position - props.indentLeft > x + 0.5,
    );
    if (stop)
      return {
        position: Math.min(stop.position - props.indentLeft, width),
        align: stop.align,
      };
    const step = 36;
    let candidate = (Math.floor(x / step) + 1) * step;
    while (candidate <= x + 0.5) candidate += step;
    return { position: Math.min(candidate, width), align: "left" };
  }

  private drawLine(
    line: Line,
    left: number,
    top: number,
    align: Align,
    available: number,
    extraSpace: number,
  ) {
    if (!this.page || !line.items.length) return;
    let x = left;
    if (align === "center") x = left + (available - line.width) / 2;
    else if (align === "right") x = left + available - line.width;
    const baseline = top - line.ascent;
    for (const item of line.items) {
      if (item.kind === "image" && item.image) {
        try {
          this.page.drawImage(item.image, {
            x,
            y: top - (item.imageHeight || item.height),
            width: item.imageWidth || item.width,
            height: item.imageHeight || item.height,
          });
        } catch {
          this.warnings.add("An image could not be drawn.");
        }
        x += item.width;
        continue;
      }
      if (!item.segments) {
        x += item.width;
        continue;
      }
      const props = item.props!;
      const color = toColor(props.color);
      if (props.highlight)
        this.page.drawRectangle({
          x,
          y: top - line.height,
          width: item.width,
          height: line.height,
          color: toColor(props.highlight),
        });
      const text =
        item.field === "PAGE"
          ? String(this.pageIndex + 1)
          : item.field === "NUMPAGES"
            ? String(Math.max(this.pageMetadata.length, 1))
            : null;
      const segments = text
        ? this.runSegments(text, props).segments
        : item.segments;
      const shift = props.superscript
        ? props.size * 0.35
        : props.subscript
          ? -props.size * 0.2
          : 0;
      let drawn = 0;
      for (const segment of segments) {
        if (segment.text) {
          try {
            this.page.drawText(segment.text, {
              x: x + drawn,
              y: baseline + shift,
              size: props.size,
              font: segment.font,
              color,
            });
          } catch {
            this.warnings.add(
              "Some characters were dropped (unsupported glyph).",
            );
            try {
              this.page.drawText(
                segment.text.replace(/[^\u0000-\u007e]/g, "?"),
                {
                  x: x + drawn,
                  y: baseline + shift,
                  size: props.size,
                  font: segment.font,
                  color,
                },
              );
            } catch {
              /* skip unencodable segment */
            }
          }
        }
        drawn += segment.width;
      }
      const underlineWidth = text
        ? this.runSegments(text, props).width
        : item.width;
      if (props.underline)
        this.page.drawLine({
          start: { x, y: baseline - props.size * 0.14 },
          end: { x: x + underlineWidth, y: baseline - props.size * 0.14 },
          thickness: 0.6,
          color,
        });
      if (props.strike)
        this.page.drawLine({
          start: { x, y: baseline + props.size * 0.3 },
          end: { x: x + underlineWidth, y: baseline + props.size * 0.3 },
          thickness: 0.6,
          color,
        });
      x += underlineWidth + (item.isSpace ? extraSpace : 0);
    }
  }

  // ------------------------------------------------------------------ flow

  private flow(blocks: Block[], width: number): FlowItem[] {
    const items: FlowItem[] = [];
    for (const block of blocks) {
      if (block.kind === "paragraph") {
        const props = block.props;
        if (props.spaceBefore > 0)
          items.push({ height: props.spaceBefore, draw: () => undefined });
        items.push(...this.paragraphFlow(block, width));
        if (props.spaceAfter > 0)
          items.push({ height: props.spaceAfter, draw: () => undefined });
      } else items.push(...this.tableFlow(block, width));
    }
    return items;
  }

  private paragraphFlow(paragraph: Paragraph, width: number): FlowItem[] {
    const lines = this.layoutParagraph(paragraph, width);
    const props = paragraph.props;
    const available = width - props.indentLeft - props.indentRight;
    const indent = props.indentLeft + props.firstLine - props.hanging;
    return lines.map((line, index) => {
      const align = props.align;
      const spaces = line.items.filter((item) => item.isSpace).length;
      const extra =
        align === "justify" && index < lines.length - 1 && spaces
          ? Math.max(0, available - line.width) / spaces
          : 0;
      const left = index === 0 ? indent : props.indentLeft;
      return {
        height: line.height,
        textChars: line.items.reduce(
          (sum, item) => sum + (item.textChars ?? 0),
          0,
        ),
        draw: (x: number, top: number) => {
          if (props.shading && this.page)
            this.page.drawRectangle({
              x: x + left,
              y: top - line.height,
              width: Math.max(6, available),
              height: line.height,
              color: toColor(props.shading),
            });
          this.drawLine(line, x + left, top, align, available, extra);
          if (props.borderBottom && this.page)
            this.page.drawLine({
              start: { x, y: top - line.height },
              end: { x: x + available, y: top - line.height },
              thickness: 0.7,
              color: toColor("808080"),
            });
        },
      };
    });
  }

  private tableFlow(table: Table, width: number): FlowItem[] {
    const columns = this.columnWidths(table, width);
    return table.rows.map((row) => {
      const cells = this.layoutRow(table, row.cells, columns, width);
      const height = Math.max(
        ...cells.map(
          (cell) =>
            cell.height + cell.cell.margins.top + cell.cell.margins.bottom,
        ),
        row.height || 0,
      );
      return {
        height,
        draw: (left, top) => this.drawWholeRow(table, cells, height, left, top),
      };
    });
  }

  private columnWidths(table: Table, width: number) {
    const needed = Math.max(
      1,
      ...table.rows.map((row) =>
        row.cells.reduce((sum, cell) => sum + cell.span, 0),
      ),
    );
    const grid = [...table.grid];
    // A row may declare more cells than the grid describes (malformed or
    // hand-edited packages). Pad instead of collapsing cells to zero width.
    while (grid.length && grid.length < needed) {
      const average =
        grid.reduce((sum, value) => sum + value, 0) / grid.length ||
        width / needed;
      grid.push(average);
    }
    if (!grid.length)
      return Array.from({ length: needed }, () => width / needed);
    const total = grid.reduce((sum, value) => sum + value, 0);
    if (total <= 0) return grid.map(() => width / grid.length);
    if (total > width) return grid.map((value) => (value * width) / total);
    return grid;
  }

  private layoutRow(
    table: Table,
    cells: TableCell[],
    columns: number[],
    width: number,
    rowIndex = 0,
    rowCount = 1,
  ): CellLayout[] {
    const total = columns.reduce((sum, value) => sum + value, 0);
    const start =
      table.align === "center"
        ? Math.max(0, (width - total) / 2)
        : table.align === "right"
          ? Math.max(0, width - total)
          : Math.min(table.indent, Math.max(0, width - total));
    let column = 0;
    const layouts: CellLayout[] = [];
    for (const cell of cells) {
      const span = Math.max(1, Math.min(cell.span, columns.length - column));
      const cellWidth =
        cell.width && span === 1
          ? Math.min(cell.width, width)
          : columns
              .slice(column, column + span)
              .reduce((sum, value) => sum + value, 0);
      const cellWidthSafe = Math.max(8, cellWidth);
      const innerWidth = Math.max(
        8,
        cellWidthSafe - cell.margins.left - cell.margins.right,
      );
      const items =
        cell.vMerge === "continue" ? [] : this.flow(cell.blocks, innerWidth);
      const first = column === 0;
      const last = column + span >= columns.length;
      const merged = cell.vMerge === "continue";
      // Internal rules are drawn exactly once: a cell owns its left and top
      // edge, and closes its right/bottom edge only at the table boundary or
      // when it spans columns (nothing else would draw that line).
      const edges = {
        top:
          cell.borders.top ??
          (merged
            ? { ...table.borders.insideH, on: false }
            : rowIndex === 0
              ? table.borders.top
              : table.borders.insideH),
        bottom:
          cell.borders.bottom ??
          (rowIndex === rowCount - 1
            ? table.borders.bottom
            : { ...table.borders.insideH, on: false }),
        left:
          cell.borders.left ??
          (first ? table.borders.left : table.borders.insideV),
        right:
          cell.borders.right ??
          (last
            ? table.borders.right
            : span > 1
              ? table.borders.insideV
              : { ...table.borders.insideV, on: false }),
      };
      layouts.push({
        items,
        height: items.reduce((sum, item) => sum + item.height, 0),
        cell,
        width: cellWidthSafe,
        left:
          start +
          columns.slice(0, column).reduce((sum, value) => sum + value, 0),
        edges,
      });
      column += span;
    }
    return layouts;
  }

  private cellFrame(
    cell: CellLayout,
    left: number,
    top: number,
    height: number,
  ) {
    if (!this.page) return;
    const x = left + cell.left;
    if (cell.cell.shading)
      this.page.drawRectangle({
        x,
        y: top - height,
        width: cell.width,
        height,
        color: toColor(cell.cell.shading),
      });
    const stroke = (
      edge: Edge,
      x1: number,
      y1: number,
      x2: number,
      y2: number,
    ) => {
      if (!edge.on) return;
      this.page!.drawLine({
        start: { x: x1, y: y1 },
        end: { x: x2, y: y2 },
        thickness: edge.width,
        color: toColor(edge.color),
      });
    };
    stroke(cell.edges.top, x, top, x + cell.width, top);
    stroke(cell.edges.bottom, x, top - height, x + cell.width, top - height);
    stroke(cell.edges.left, x, top, x, top - height);
    stroke(cell.edges.right, x + cell.width, top, x + cell.width, top - height);
  }

  private drawWholeRow(
    table: Table,
    cells: CellLayout[],
    height: number,
    left: number,
    top: number,
  ) {
    void table;
    for (const cell of cells) {
      this.cellFrame(cell, left, top, height);
      if (cell.cell.vMerge === "continue") continue;
      const available =
        height - cell.cell.margins.top - cell.cell.margins.bottom;
      const offset =
        cell.cell.valign === "center"
          ? Math.max(0, (available - cell.height) / 2)
          : cell.cell.valign === "bottom"
            ? Math.max(0, available - cell.height)
            : 0;
      let y = top - cell.cell.margins.top - offset;
      for (const item of cell.items) {
        item.draw(left + cell.left + cell.cell.margins.left, y);
        y -= item.height;
      }
    }
  }

  private renderBlock(block: Block) {
    this.ensurePage();
    if (block.kind === "paragraph") this.renderParagraph(block);
    else this.renderTable(block);
  }

  private renderParagraph(paragraph: Paragraph) {
    const props = paragraph.props;
    if (props.pageBreakBefore && this.page && this.y < this.contentTop - 1)
      this.newPage();
    if (props.spaceBefore && this.y < this.contentTop - 1) {
      if (this.y - props.spaceBefore > this.contentBottom)
        this.y -= props.spaceBefore;
      else this.newPage();
    }
    const chunks = this.splitRunsAtPageBreaks(paragraph);
    for (const [index, chunk] of chunks.entries()) {
      if (index > 0) this.newPage();
      // A break at the very start of a paragraph leaves an empty leading chunk;
      // Word does not emit a blank line for it.
      if (!chunk.runs.length && chunks.length > 1) continue;
      const items = this.paragraphFlow(chunk, this.contentWidth);
      const total = items.reduce((sum, item) => sum + item.height, 0);
      if (
        props.keepLines &&
        total <= this.pageContentHeight &&
        !this.room(total)
      )
        this.newPage();
      for (const item of items) {
        if (!this.room(item.height)) {
          if (item.height <= this.pageContentHeight) this.newPage();
        }
        item.draw(this.section.margins.left, this.y);
        this.y -= item.height;
      }
    }
    if (props.spaceAfter) {
      if (this.y - props.spaceAfter > this.contentBottom)
        this.y -= props.spaceAfter;
    }
  }

  private splitRunsAtPageBreaks(paragraph: Paragraph): Paragraph[] {
    const chunks: Paragraph[] = [];
    let runs: Paragraph["runs"] = [];
    for (const run of paragraph.runs) {
      if (run.kind === "pageBreak") {
        chunks.push({ ...paragraph, runs });
        runs = [];
      } else runs.push(run);
    }
    chunks.push({ ...paragraph, runs });
    return chunks;
  }

  private room(height: number) {
    return this.y - height >= this.contentBottom - 0.5;
  }

  private renderTable(table: Table) {
    const columns = this.columnWidths(table, this.contentWidth);
    const headerRows = table.rows.filter((row) => row.header);
    const emitHeaders = () => {
      for (const row of headerRows) {
        const cells = this.layoutRow(
          table,
          row.cells,
          columns,
          this.contentWidth,
          0,
          Math.max(1, headerRows.length),
        );
        const height = Math.max(
          ...cells.map(
            (cell) =>
              cell.height + cell.cell.margins.top + cell.cell.margins.bottom,
          ),
          0,
        );
        if (height <= 0) continue;
        this.drawWholeRow(
          table,
          cells,
          height,
          this.section.margins.left,
          this.y,
        );
        this.y -= height;
      }
    };
    for (const [rowIndex, row] of table.rows.entries()) {
      const cells = this.layoutRow(
        table,
        row.cells,
        columns,
        this.contentWidth,
        rowIndex,
        table.rows.length,
      );
      const total = Math.max(
        ...cells.map(
          (cell) =>
            cell.height + cell.cell.margins.top + cell.cell.margins.bottom,
        ),
        row.height || 0,
      );
      if (total <= 0) continue;
      // A row that fits on an empty page but not on the current one moves to
      // the next page intact; only rows taller than a full page are split.
      if (total <= this.pageContentHeight && !this.room(total)) {
        this.newPage();
        emitHeaders();
      }
      if (this.room(total) || total <= this.pageContentHeight) {
        this.drawWholeRow(
          table,
          cells,
          total,
          this.section.margins.left,
          this.y,
        );
        this.y -= total;
        continue;
      }
      // Oversized row: split across pages, one line at a time, per cell.
      const cursors = cells.map(() => 0);
      let remaining = total;
      let guard = 0;
      while (remaining > 0.5 && guard++ < 2000) {
        if (this.y - 12 < this.contentBottom) {
          this.newPage();
          emitHeaders();
        }
        const chunk = Math.max(
          0,
          Math.min(this.y - this.contentBottom, remaining),
        );
        const plan = cells.map((cell, index) => {
          let used = 0;
          let cursor = cursors[index];
          while (
            cursor < cell.items.length &&
            used + cell.items[cursor].height <= chunk + 0.01
          ) {
            used += cell.items[cursor].height;
            cursor++;
          }
          // Never consume height without drawing: take at least one item.
          if (used === 0 && cursor < cell.items.length) {
            used = Math.min(cell.items[cursor].height, remaining);
          }
          return { used, cursor };
        });
        const drawn = Math.max(1, ...plan.map((entry) => entry.used));
        for (const [index, cell] of cells.entries()) {
          this.cellFrame(cell, this.section.margins.left, this.y, drawn);
          if (cell.cell.vMerge === "continue") continue;
          let y = this.y - cell.cell.margins.top;
          let used = 0;
          let cursor = cursors[index];
          while (
            cursor < cell.items.length &&
            used + cell.items[cursor].height <= drawn + 0.01
          ) {
            const item = cell.items[cursor];
            item.draw(
              this.section.margins.left + cell.left + cell.cell.margins.left,
              y,
            );
            y -= item.height;
            used += item.height;
            cursor++;
          }
          cursors[index] = cursor;
        }
        this.y -= drawn;
        remaining -= drawn;
        if (
          plan.every(
            (entry, index) =>
              entry.cursor === cursors[index] && entry.used === 0,
          )
        )
          remaining = 0;
      }
    }
  }

  // -------------------------------------------------------------- heads/feet

  private drawHeadersAndFooters() {
    const lastPage = this.page;
    const lastIndex = this.pageIndex;
    for (const meta of this.pageMetadata) {
      // Header/footer drawing must target the page being decorated, not the
      // page that happens to be current when the body finishes.
      this.page = this.pdf.getPage(meta.index);
      this.pageIndex = meta.index;
      const section = meta.section;
      const width =
        section.pageWidth - section.margins.left - section.margins.right;
      const header = this.partFor(
        section,
        "headers",
        meta.sectionPage,
        meta.index + 1,
      );
      const footer = this.partFor(
        section,
        "footers",
        meta.sectionPage,
        meta.index + 1,
      );
      if (header) {
        const reserve = this.headerReserveFor(section, header, width);
        const items = this.flow(header.blocks, width);
        let y = section.pageHeight - section.margins.top + reserve - 4;
        for (const item of items) {
          if (y - item.height < section.pageHeight - section.margins.top + 1)
            break;
          item.draw(section.margins.left, y);
          y -= item.height;
        }
      }
      if (footer) {
        const items = this.flow(footer.blocks, width);
        const total = items.reduce((sum, item) => sum + item.height, 0);
        let y = Math.max(6, section.margins.bottom - 4) + total;
        for (const item of items) {
          y -= item.height;
          if (y < 2) break;
          item.draw(section.margins.left, y);
        }
      }
    }
    this.page = lastPage;
    this.pageIndex = lastIndex;
  }

  private headerReserveFor(
    section: Section,
    header: { blocks: Block[] },
    width: number,
  ) {
    const height = this.flow(header.blocks, width).reduce(
      (sum, item) => sum + item.height,
      0,
    );
    if (!height) return 0;
    return Math.min(height + 6, Math.max(20, section.margins.top * 0.85));
  }
}

export async function renderDocxModel(
  model: DocxModel,
  options: RenderOptions & {
    metadata?: {
      title?: string;
      author?: string;
      subject?: string;
      keywords?: string;
    };
  } = {},
) {
  if (options.metadata) {
    if (options.metadata.title) model.title = options.metadata.title;
    if (options.metadata.author) model.author = options.metadata.author;
    if (options.metadata.subject) model.subject = options.metadata.subject;
    if (options.metadata.keywords) model.keywords = options.metadata.keywords;
  }
  const renderer = await DocxPdfRenderer.create(model, options);
  return renderer.render();
}
