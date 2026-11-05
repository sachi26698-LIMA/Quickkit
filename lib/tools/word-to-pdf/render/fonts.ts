import { readFile } from "node:fs/promises";
import { join } from "node:path";
import fontkit from "@cantoo/fontkit";
import type { PDFDocument, PDFFont } from "@cantoo/pdf-lib";

/**
 * Font strategy for the built-in DOCX renderer.
 *
 * Every glyph is drawn with an embedded Noto font (SIL OFL 1.1, `assets/noto`).
 * They are read once per server process, then subset per generated PDF so a
 * 1,000-page document does not ship 5 MiB of unused outlines.
 */
export type Face = "sans" | "serif" | "mono";
export type Script =
  | "latin"
  | "devanagari"
  | "gujarati"
  | "bengali"
  | "tamil"
  | "telugu"
  | "kannada"
  | "malayalam"
  | "gurmukhi"
  | "other";

type FontKey = `${Face}${"-bold" | ""}${"-italic" | "-bolditalic"}` | "script";

const FILES: Record<string, string> = {
  sans: "NotoSans-Regular.ttf",
  "sans-bold": "NotoSans-Bold.ttf",
  "sans-italic": "NotoSans-Italic.ttf",
  "sans-bolditalic": "NotoSans-BoldItalic.ttf",
  serif: "NotoSerif-Regular.ttf",
  "serif-bold": "NotoSerif-Bold.ttf",
  "serif-italic": "NotoSerif-Regular.ttf",
  "serif-bolditalic": "NotoSerif-Bold.ttf",
  mono: "NotoSansMono-Regular.ttf",
  "mono-bold": "NotoSansMono-Regular.ttf",
  "mono-italic": "NotoSansMono-Regular.ttf",
  "mono-bolditalic": "NotoSansMono-Regular.ttf",
  gujarati: "NotoSansGujarati-Regular.ttf",
  "gujarati-bold": "NotoSansGujarati-Bold.ttf",
  devanagari: "NotoSansDevanagari-Regular.ttf",
  "devanagari-bold": "NotoSansDevanagari-Bold.ttf",
  bengali: "NotoSansBengali-Regular.ttf",
  "bengali-bold": "NotoSansBengali-Regular.ttf",
  tamil: "NotoSansTamil-Regular.ttf",
  "tamil-bold": "NotoSansTamil-Regular.ttf",
  telugu: "NotoSansTelugu-Regular.ttf",
  "telugu-bold": "NotoSansTelugu-Regular.ttf",
  kannada: "NotoSansKannada-Regular.ttf",
  "kannada-bold": "NotoSansKannada-Regular.ttf",
  malayalam: "NotoSansMalayalam-Regular.ttf",
  "malayalam-bold": "NotoSansMalayalam-Regular.ttf",
  gurmukhi: "NotoSansGurmukhi-Regular.ttf",
  "gurmukhi-bold": "NotoSansGurmukhi-Regular.ttf",
};

export const FONT_DIRECTORY =
  process.env.QUICKKIT_DOCX_FONT_DIR || join(process.cwd(), "assets", "noto");

const bytes = new Map<string, Promise<Uint8Array>>();

function fontBytes(file: string) {
  let pending = bytes.get(file);
  if (!pending) {
    pending = readFile(join(FONT_DIRECTORY, file)).then(
      (buffer) => new Uint8Array(buffer),
    );
    bytes.set(file, pending);
    pending.catch(() => bytes.delete(file));
  }
  return pending;
}

/** Fonts are document-bound in pdf-lib, so the cache is per render. */
export class FontBook {
  private readonly cache = new Map<string, Promise<PDFFont>>();
  readonly used = new Set<string>();

  constructor(private readonly pdf: PDFDocument) {
    pdf.registerFontkit(fontkit);
  }

  face(name: string): Face {
    const value = name.toLowerCase();
    if (/courier|mono|consol/.test(value)) return "mono";
    if (/times|serif|georgia|garamond|cambria|book|minion|palatino/.test(value))
      return "serif";
    return "sans";
  }

  key(face: Face, bold: boolean, italic: boolean, script: Script): string {
    if (script === "latin" || script === "other")
      return face + (bold ? "-bold" : "") + (italic ? "-italic" : "");
    return script + (bold ? "-bold" : "");
  }

  get(face: Face, bold: boolean, italic: boolean, script: Script) {
    const key = this.key(face, bold, italic, script) as FontKey;
    const file = FILES[key] || FILES["sans"];
    let pending = this.cache.get(key);
    if (!pending) {
      pending = fontBytes(file)
        .then((data) => this.pdf.embedFont(data, { subset: true }))
        .catch(() =>
          fontBytes(FILES["sans"]).then((data) =>
            this.pdf.embedFont(data, { subset: true }),
          ),
        );
      this.cache.set(key, pending);
    }
    this.used.add(key);
    return pending;
  }

  async width(
    text: string,
    size: number,
    face: Face,
    bold: boolean,
    italic: boolean,
  ) {
    let total = 0;
    for (const part of segmentByScript(text)) {
      const font = await this.get(face, bold, italic, part.script);
      total += safeWidth(font, part.text, size);
    }
    return total;
  }
}

function safeWidth(font: PDFFont, text: string, size: number) {
  try {
    return font.widthOfTextAtSize(text, size);
  } catch {
    // A malformed string should never abort a whole conversion.
    return text.length * size * 0.5;
  }
}

const RANGES: [Script, number, number][] = [
  ["devanagari", 0x0900, 0x097f],
  ["bengali", 0x0980, 0x09ff],
  ["gurmukhi", 0x0a00, 0x0a7f],
  ["gujarati", 0x0a80, 0x0aff],
  ["tamil", 0x0b80, 0x0bff],
  ["telugu", 0x0c00, 0x0c7f],
  ["kannada", 0x0c80, 0x0cff],
  ["malayalam", 0x0d00, 0x0d7f],
];

export function scriptOf(codePoint: number): Script {
  if (codePoint < 0x0530 || (codePoint >= 0x1e00 && codePoint <= 0x1eff))
    return "latin";
  for (const [script, start, end] of RANGES)
    if (codePoint >= start && codePoint <= end) return script;
  // Latin-1, punctuation, symbols, Cyrillic and Greek are covered by Noto Sans.
  if (codePoint <= 0x24ff) return "latin";
  return "other";
}

export function splitScripts(text: string) {
  const parts: { text: string; script: Script }[] = [];
  let current = "";
  let script: Script | null = null;
  for (const char of text) {
    // Every combining mark shares its base character's Unicode block, so the
    // script comparison alone keeps a vowel sign with its consonant.
    const next = scriptOf(char.codePointAt(0) || 0);
    if (script && next === script) {
      current += char;
      continue;
    }
    if (current && script) parts.push({ text: current, script });
    current = char;
    script = next;
  }
  if (current && script) parts.push({ text: current, script });
  return parts;
}

/** Splits text into drawable runs; unsupported scripts fall back to Noto Sans. */
export function segmentByScript(text: string) {
  return splitScripts(text).map((part) => ({
    ...part,
    script:
      part.script === "other" &&
      /[\u0e00-\u0fff\u1000-\u109f\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af\u0590-\u05ff\u0600-\u06ff]/.test(
        part.text,
      )
        ? "other"
        : part.script,
  }));
}

export function unsupportedScript(text: string) {
  return /[\u0590-\u06ff\u0e00-\u0fff\u1000-\u109f\u3040-\u30ff\u4e00-\u9fff\uac00-\ud7af]/.test(
    text,
  );
}
