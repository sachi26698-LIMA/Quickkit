import type { PDFDocument, PDFFont } from "@cantoo/pdf-lib";
import {
  FONT_DIRECTORY,
  FontBook,
  scriptOf,
  segmentByScript,
  splitScripts,
  type Face,
  type Script,
} from "./fonts";

export type StyledText = {
  text: string;
  script: Script;
  font: PDFFont;
  size: number;
  face: Face;
  bold: boolean;
  italic: boolean;
};

const cache = new Map<string, number>();
const MAX_CACHE = 60_000;

export class Measurer {
  private readonly book: FontBook;
  private readonly loaded = new Map<string, PDFFont>();

  constructor(private readonly pdf: PDFDocument) {
    this.book = new FontBook(pdf);
  }

  get directory() {
    return FONT_DIRECTORY;
  }

  async preload(
    requests: { face: Face; bold: boolean; italic: boolean; script: Script }[],
  ) {
    const unique = new Map<string, () => Promise<PDFFont>>();
    for (const request of requests) {
      const key = this.book.key(
        request.face,
        request.bold,
        request.italic,
        request.script,
      );
      if (this.loaded.has(key)) continue;
      unique.set(key, () =>
        this.book.get(
          request.face,
          request.bold,
          request.italic,
          request.script,
        ),
      );
    }
    unique.set(this.book.key("sans", false, false, "latin"), () =>
      this.book.get("sans", false, false, "latin"),
    );
    for (const [key, load] of unique) this.loaded.set(key, await load());
  }

  font(face: Face, bold: boolean, italic: boolean, script: Script) {
    const key = this.book.key(face, bold, italic, script);
    return (
      this.loaded.get(key) ||
      this.loaded.get(this.book.key("sans", false, false, "latin"))!
    );
  }

  width(
    text: string,
    size: number,
    face: Face,
    bold: boolean,
    italic: boolean,
  ) {
    let total = 0;
    for (const part of splitScripts(text))
      total += this.segmentWidth(
        part.text,
        part.script,
        size,
        face,
        bold,
        italic,
      );
    return total;
  }

  segmentWidth(
    text: string,
    script: Script,
    size: number,
    face: Face,
    bold: boolean,
    italic: boolean,
  ) {
    if (!text) return 0;
    const font = this.font(face, bold, italic, script);
    const key = `${font.ref.tag ?? font.name}|${script}|${size}|${text}`;
    const hit = cache.get(key);
    if (hit !== undefined) return hit;
    let value = 0;
    try {
      value = font.widthOfTextAtSize(sanitize(text, script), size);
    } catch {
      value = sanitize(text, script).length * size * 0.5;
    }
    if (cache.size > MAX_CACHE) cache.clear();
    cache.set(key, value);
    return value;
  }

  /** Splits text into font-specific runs ready for drawing. */
  segments(
    text: string,
    size: number,
    face: Face,
    bold: boolean,
    italic: boolean,
  ): StyledText[] {
    return segmentByScript(text)
      .map((part) => ({
        text: sanitize(part.text, part.script),
        script: part.script,
        font: this.font(face, bold, italic, part.script),
        size,
        face,
        bold,
        italic,
      }))
      .filter((part) => part.text.length > 0);
  }
}

/** Removes control characters and glyphs no bundled font can render. */
export function sanitize(text: string, script: Script) {
  const cleaned = text
    .replace(/\u0000/g, "")
    .replace(/[\u0001-\u0008\u000b\u000c\u000e-\u001f]/g, "");
  if (script !== "other") return cleaned;
  return cleaned.replace(/[^\u0000-\u024f\u2000-\u2bff]/g, "?");
}

export const scriptFor = scriptOf;
