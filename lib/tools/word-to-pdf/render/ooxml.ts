import { strFromU8, unzipSync } from "fflate";
import { DOMParser } from "@xmldom/xmldom";
import type {
  Document as XmlDocument,
  Element as XmlElement,
  Node as XmlNode,
} from "@xmldom/xmldom";
import { inspectImageHeader } from "../../image-header";

/**
 * Read-only OOXML (WordprocessingML) model used by the built-in DOCX renderer.
 *
 * This module deliberately stops at the document model: no layout, no PDF. It
 * understands styles, numbering, sections, tables, images, headers/footers and
 * simple fields. Anything it cannot represent is reported through `warnings`
 * instead of silently disappearing.
 */
export const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

export type Align = "left" | "center" | "right" | "justify";
export type LineRule = "auto" | "exact" | "atLeast";

export type RunProps = {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  smallCaps: boolean;
  caps: boolean;
  size: number;
  color: string | null;
  highlight: string | null;
  font: string;
  superscript: boolean;
  subscript: boolean;
  hidden: boolean;
  spacing: number;
};

export type TabStop = { position: number; align: "left" | "center" | "right" };

export type ParaProps = {
  styleId: string | null;
  align: Align;
  spaceBefore: number;
  spaceAfter: number;
  lineRule: LineRule;
  line: number;
  indentLeft: number;
  indentRight: number;
  firstLine: number;
  hanging: number;
  pageBreakBefore: boolean;
  keepNext: boolean;
  keepLines: boolean;
  tabs: TabStop[];
  shading: string | null;
  numId: number | null;
  numLevel: number;
  borderBottom: boolean;
  run: Partial<RunProps>;
};

export type Run =
  | { kind: "text"; text: string; props: RunProps }
  | { kind: "tab" }
  | { kind: "break" }
  | { kind: "pageBreak" }
  | { kind: "field"; name: "PAGE" | "NUMPAGES" }
  | {
      kind: "image";
      rel: string;
      width: number;
      height: number;
      alt: string;
    };

export type Paragraph = {
  kind: "paragraph";
  props: ParaProps;
  runs: Run[];
};

export type Edge = {
  on: boolean;
  color: string;
  width: number;
};

export type EdgeName = "top" | "bottom" | "left" | "right";

export type TableBorders = {
  top: Edge;
  bottom: Edge;
  left: Edge;
  right: Edge;
  insideH: Edge;
  insideV: Edge;
};

export type Insets = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export type TableCell = {
  blocks: Block[];
  span: number;
  vMerge: "restart" | "continue" | null;
  shading: string | null;
  width: number | null;
  margins: Insets;
  /** Explicit cell-level overrides; table/style borders supply the rest. */
  borders: Partial<Record<EdgeName, Edge>>;
  valign: "top" | "center" | "bottom";
};

export type TableRow = {
  cells: TableCell[];
  height: number | null;
  header: boolean;
};

export type Table = {
  kind: "table";
  grid: number[];
  rows: TableRow[];
  borders: TableBorders;
  cellMargins: Insets;
  align: Align;
  indent: number;
};

export type Block = Paragraph | Table;

export type HeaderFooter = { blocks: Block[]; found: boolean };

export type Section = {
  blocks: Block[];
  pageWidth: number;
  pageHeight: number;
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
    header: number;
    footer: number;
  };
  titlePg: boolean;
  headers: {
    default?: HeaderFooter;
    first?: HeaderFooter;
    even?: HeaderFooter;
  };
  footers: {
    default?: HeaderFooter;
    first?: HeaderFooter;
    even?: HeaderFooter;
  };
};

export type ImageAsset = {
  bytes: Uint8Array;
  type: "image/png" | "image/jpeg";
  width: number;
  height: number;
};

export type DocxModel = {
  sections: Section[];
  /** w:evenAndOddHeaders — selects the even part on even document pages. */
  evenOdd: boolean;
  images: Map<string, ImageAsset>;
  title: string;
  author: string;
  subject: string;
  keywords: string;
  warnings: Set<string>;
  defaultPage: { width: number; height: number };
};

const T = (twips: string | null, fallback = 0) =>
  twips === null ? fallback : Number(twips) / 20;

function parseXml(xml: string) {
  if (/<!DOCTYPE|<!ENTITY/i.test(xml))
    throw new Error("Document contains unsupported XML declarations.");
  return new DOMParser({
    onError: () => {
      throw new Error("Corrupted DOCX XML.");
    },
  }).parseFromString(xml, "application/xml");
}

function attr(el: XmlElement | null, name: string): string | null {
  if (!el) return null;
  return (
    el.getAttributeNS(W, name) ||
    el.getAttribute(`w:${name}`) ||
    el.getAttribute(name) ||
    null
  );
}
function rattr(el: XmlElement | null, name: string): string | null {
  if (!el) return null;
  return (
    el.getAttributeNS(R, name) ||
    el.getAttribute(`r:${name}`) ||
    el.getAttribute(name) ||
    null
  );
}

type AnyNode = XmlElement | XmlDocument;

function elementChildren(el: AnyNode | null): XmlElement[] {
  if (!el) return [];
  const out: XmlElement[] = [];
  for (let i = 0; i < el.childNodes.length; i++) {
    const node = el.childNodes[i] as XmlNode;
    if (node.nodeType === 1) out.push(node as unknown as XmlElement);
  }
  return out;
}

function child(el: AnyNode | null, local: string): XmlElement | null {
  return elementChildren(el).find((node) => localName(node) === local) || null;
}
function localName(el: XmlElement): string {
  return el.localName || el.nodeName.replace(/^.*:/, "");
}

function descendants(el: AnyNode | null, local: string): XmlElement[] {
  if (!el) return [];
  return Array.from(el.getElementsByTagNameNS("*", local)) as XmlElement[];
}

function truthy(el: AnyNode | null): boolean {
  if (!el) return false;
  const value = attr(el as XmlElement, "val");
  return value === null || !/^(0|false|off|none)$/i.test(value);
}

function hexColor(el: AnyNode | null): string | null {
  const value = attr(el as XmlElement, "val");
  if (!value || !/^[0-9a-f]{6}$/i.test(value)) return null;
  return value.toUpperCase();
}

const HIGHLIGHTS: Record<string, string> = {
  yellow: "FFFF00",
  green: "00FF00",
  cyan: "00FFFF",
  magenta: "FF00FF",
  blue: "0000FF",
  red: "FF0000",
  darkBlue: "000080",
  darkCyan: "008080",
  darkGreen: "008000",
  darkMagenta: "800080",
  darkRed: "800000",
  darkYellow: "808000",
  darkGray: "808080",
  lightGray: "C0C0C0",
  black: "000000",
};

export const baseRun: RunProps = {
  bold: false,
  italic: false,
  underline: false,
  strike: false,
  smallCaps: false,
  caps: false,
  size: 11,
  color: null,
  highlight: null,
  font: "Calibri",
  superscript: false,
  subscript: false,
  hidden: false,
  spacing: 0,
};

export const baseParagraph: ParaProps = {
  styleId: null,
  align: "left",
  spaceBefore: 0,
  spaceAfter: 0,
  lineRule: "auto",
  line: 1.15,
  indentLeft: 0,
  indentRight: 0,
  firstLine: 0,
  hanging: 0,
  pageBreakBefore: false,
  keepNext: false,
  keepLines: false,
  tabs: [],
  shading: null,
  numId: null,
  numLevel: 0,
  borderBottom: false,
  run: {},
};

function parseRunProps(
  el: AnyNode | null,
  sizeFallback: number,
): Partial<RunProps> {
  if (!el) return {};
  const out: Partial<RunProps> = {};
  if (child(el, "b")) out.bold = truthy(child(el, "b"));
  if (child(el, "i")) out.italic = truthy(child(el, "i"));
  if (child(el, "strike") || child(el, "dstrike")) out.strike = true;
  const underline = child(el, "u");
  if (underline) out.underline = truthy(underline);
  if (child(el, "caps")) out.caps = truthy(child(el, "caps"));
  if (child(el, "smallCaps")) out.smallCaps = truthy(child(el, "smallCaps"));
  const vanish = child(el, "vanish");
  if (vanish) out.hidden = truthy(vanish);
  const size = child(el, "sz");
  if (size && attr(size, "val")) {
    const half = Number(attr(size, "val"));
    if (Number.isFinite(half) && half > 0) out.size = half / 2;
  } else {
    out.size = sizeFallback;
  }
  const color = child(el, "color");
  if (color) {
    const value = attr(color, "val");
    if (value && /^[0-9a-f]{6}$/i.test(value)) out.color = value.toUpperCase();
    else if (value === "auto") out.color = null;
  }
  const highlight = child(el, "highlight");
  if (highlight) {
    const value = attr(highlight, "val") || "";
    out.highlight = HIGHLIGHTS[value] || null;
  }
  const spacing = child(el, "spacing");
  if (spacing && attr(spacing, "val")) out.spacing = T(attr(spacing, "val"));
  const fonts = child(el, "rFonts");
  if (fonts) {
    const name =
      attr(fonts, "ascii") || attr(fonts, "hAnsi") || attr(fonts, "cs");
    if (name) out.font = name;
  }
  const vertAlign = child(el, "vertAlign");
  if (vertAlign) {
    const value = attr(vertAlign, "val");
    out.superscript = value === "superscript";
    out.subscript = value === "subscript";
  }
  return out;
}

function parseTabs(el: AnyNode | null): TabStop[] {
  const tabs = child(el, "tabs");
  if (!tabs) return [];
  return elementChildren(tabs)
    .filter((node) => localName(node) === "tab")
    .map((node) => ({
      position: T(attr(node, "pos")),
      align:
        attr(node, "val") === "center"
          ? ("center" as const)
          : attr(node, "val") === "right"
            ? ("right" as const)
            : ("left" as const),
    }))
    .filter((tab) => tab.position > 0)
    .sort((a, b) => a.position - b.position);
}

function parseParagraphProps(el: AnyNode | null): Partial<ParaProps> {
  if (!el) return {};
  const out: Partial<ParaProps> = {};
  const style = child(el, "pStyle");
  if (style) out.styleId = attr(style, "val");
  const jc = child(el, "jc");
  if (jc) {
    const value = attr(jc, "val");
    out.align =
      value === "center" || value === "right" || value === "both"
        ? value === "both"
          ? "justify"
          : (value as Align)
        : "left";
  }
  const spacing = child(el, "spacing");
  if (spacing) {
    if (attr(spacing, "before")) out.spaceBefore = T(attr(spacing, "before"));
    if (attr(spacing, "after")) out.spaceAfter = T(attr(spacing, "after"));
    if (attr(spacing, "line")) {
      const raw = Number(attr(spacing, "line"));
      const rule = attr(spacing, "lineRule");
      if (rule === "exact" || rule === "atLeast") {
        // Fixed heights are absolute: twips -> points.
        out.line = raw / 20;
        out.lineRule = rule;
      } else {
        // "auto" is a multiple of single spacing: 240 = 1.0, 276 = 1.15.
        out.line = raw / 240;
        out.lineRule = "auto";
      }
    }
  }
  const ind = child(el, "ind");
  if (ind) {
    if (attr(ind, "left") || attr(ind, "start"))
      out.indentLeft = T(attr(ind, "left") || attr(ind, "start"));
    if (attr(ind, "right") || attr(ind, "end"))
      out.indentRight = T(attr(ind, "right") || attr(ind, "end"));
    if (attr(ind, "firstLine")) out.firstLine = T(attr(ind, "firstLine"));
    if (attr(ind, "hanging")) out.hanging = T(attr(ind, "hanging"));
  }
  const numbering = child(el, "numPr");
  if (numbering) {
    const numId = child(numbering, "numId");
    if (numId && attr(numId, "val") !== null) {
      const value = Number(attr(numId, "val"));
      out.numId = Number.isFinite(value) && value > 0 ? value : null;
    }
    const level = child(numbering, "ilvl");
    if (level && attr(level, "val") !== null)
      out.numLevel = Number(attr(level, "val")) || 0;
  }
  const tabs = parseTabs(el);
  if (tabs.length) out.tabs = tabs;
  const shading = child(el, "shd");
  if (shading) out.shading = hexColor(shading);
  if (child(el, "pageBreakBefore"))
    out.pageBreakBefore = truthy(child(el, "pageBreakBefore"));
  if (child(el, "keepNext")) out.keepNext = truthy(child(el, "keepNext"));
  if (child(el, "keepLines")) out.keepLines = truthy(child(el, "keepLines"));
  if (child(el, "pBdr")) {
    const borders = child(el, "pBdr")!;
    out.borderBottom = truthy(child(borders, "bottom"));
  }
  out.run = parseRunProps(child(el, "rPr"), 11);
  return out;
}

type TableStyleProps = {
  borders?: Partial<TableBorders>;
  cellMargins?: Insets;
  indent?: number;
};

type StyleDef = {
  id: string;
  type: string;
  basedOn: string | null;
  pPr: Partial<ParaProps>;
  rPr: Partial<RunProps>;
  tbl?: TableStyleProps;
};

export type NumLevel = {
  ilvl: number;
  start: number;
  format: string;
  text: string;
  suffix: string;
  pPr: Partial<ParaProps>;
  rPr: Partial<RunProps>;
};

export type Numbering = Map<number, Map<number, NumLevel>>;

function parseStyles(xml: string | undefined) {
  const styles = new Map<string, StyleDef>();
  const docRun: Partial<RunProps> = {};
  const docParagraph: Partial<ParaProps> = {};
  if (!xml) return { styles, docRun, docParagraph };
  const doc = parseXml(xml);
  const defaults = descendants(doc, "docDefaults")[0];
  if (defaults) {
    Object.assign(
      docRun,
      parseRunProps(child(child(defaults, "rPrDefault"), "rPr"), 11),
    );
    Object.assign(
      docParagraph,
      parseParagraphProps(child(child(defaults, "pPrDefault"), "pPr")),
    );
  }
  for (const style of descendants(doc, "style")) {
    const id = attr(style, "styleId");
    if (!id) continue;
    const basedOn = child(style, "basedOn");
    const type = attr(style, "type") || "paragraph";
    const tblPr = child(style, "tblPr");
    const tbl: TableStyleProps = {};
    if (tblPr) {
      const borders = parseBorderSet(child(tblPr, "tblBorders"));
      if (Object.keys(borders).length) tbl.borders = borders;
      const mar = child(tblPr, "tblCellMar");
      if (mar) tbl.cellMargins = readInsets(mar, undefined);
      const ind = child(tblPr, "tblInd");
      if (ind && attr(ind, "w")) tbl.indent = T(attr(ind, "w"));
    }
    styles.set(id, {
      id,
      type,
      basedOn: basedOn ? attr(basedOn, "val") : null,
      pPr: parseParagraphProps(child(style, "pPr")),
      rPr: parseRunProps(child(style, "rPr"), 11),
      tbl: Object.keys(tbl).length ? tbl : undefined,
    });
  }
  return { styles, docRun, docParagraph };
}

function parseLevels(parent: XmlElement): Map<number, NumLevel> {
  const levels = new Map<number, NumLevel>();
  for (const lvl of descendants(parent, "lvl")) {
    const ilvl = Number(attr(lvl, "ilvl") || 0);
    const start = Number(attr(child(lvl, "start"), "val") || 1);
    const format = attr(child(lvl, "numFmt"), "val") || "decimal";
    const text = attr(child(lvl, "lvlText"), "val") || "";
    const suffix = attr(child(lvl, "suff"), "val") || "tab";
    levels.set(ilvl, {
      ilvl,
      start: Number.isFinite(start) ? start : 1,
      format,
      text,
      suffix,
      pPr: parseParagraphProps(child(lvl, "pPr")),
      rPr: parseRunProps(child(lvl, "rPr"), 11),
    });
  }
  return levels;
}

function parseNumbering(xml: string | undefined): Numbering {
  const numbering: Numbering = new Map();
  if (!xml) return numbering;
  const doc = parseXml(xml);
  const abstracts = new Map<string, Map<number, NumLevel>>();
  for (const abstract of descendants(doc, "abstractNum")) {
    const id = attr(abstract, "abstractNumId");
    if (id) abstracts.set(id, parseLevels(abstract));
  }
  for (const num of descendants(doc, "num")) {
    const id = Number(attr(num, "numId"));
    if (!Number.isFinite(id)) continue;
    const abstractId = attr(child(num, "abstractNumId"), "val");
    const levels = new Map(abstracts.get(abstractId || "") || []);
    for (const override of elementChildren(num).filter(
      (node) => localName(node) === "lvlOverride",
    )) {
      const ilvl = Number(attr(override, "ilvl") || 0);
      const startOverride = attr(child(override, "startOverride"), "val");
      const level = child(override, "lvl");
      if (level) {
        const parsed = parseLevels(override).get(ilvl);
        if (parsed) levels.set(ilvl, parsed);
      } else if (startOverride && levels.get(ilvl)) {
        levels.set(ilvl, {
          ...levels.get(ilvl)!,
          start: Number(startOverride),
        });
      }
    }
    numbering.set(id, levels);
  }
  return numbering;
}

function relsFor(xml: string | undefined) {
  const map = new Map<string, { target: string; external: boolean }>();
  if (!xml) return map;
  const doc = parseXml(xml);
  for (const rel of descendants(doc, "Relationship")) {
    const id = rel.getAttribute("Id");
    const target = rel.getAttribute("Target");
    if (id && target)
      map.set(id, {
        target,
        external: rel.getAttribute("TargetMode") === "External",
      });
  }
  return map;
}

function readCoreProps(xml: string | undefined) {
  if (!xml) return { title: "", author: "", subject: "", keywords: "" };
  try {
    const doc = parseXml(xml);
    const pick = (local: string) => {
      const nodes = doc.getElementsByTagNameNS("*", local);
      return nodes.length ? (nodes.item(0)?.textContent || "").trim() : "";
    };
    return {
      title: pick("title"),
      author: pick("creator"),
      subject: pick("subject"),
      keywords: pick("keywords"),
    };
  } catch {
    return { title: "", author: "", subject: "", keywords: "" };
  }
}

function imageAsset(name: string, data: Uint8Array): ImageAsset | null {
  const type = /\.png$/i.test(name)
    ? ("image/png" as const)
    : /\.jpe?g$/i.test(name)
      ? ("image/jpeg" as const)
      : null;
  if (!type) return null;
  try {
    const size = inspectImageHeader(data, type);
    if (!size.width || !size.height) return null;
    return { bytes: data, type, width: size.width, height: size.height };
  } catch {
    return null;
  }
}

type Context = {
  rels: Map<string, { target: string; external: boolean }>;
  images: Map<string, ImageAsset>;
  numbering: Numbering;
  styles: Map<string, StyleDef>;
  docRun: Partial<RunProps>;
  docParagraph: Partial<ParaProps>;
  warnings: Set<string>;
  counters: Map<number, number[]>;
};

function mergeOne<T extends object>(
  ...values: (Partial<T> | undefined)[]
): Partial<T> {
  const out: Partial<T> = {};
  for (const value of values)
    if (value)
      for (const key of Object.keys(value) as (keyof T)[]) {
        const item = value[key];
        if (item !== undefined) out[key] = item;
      }
  return out;
}

function styleChain(context: Context, id: string | null, type: string) {
  const chain: StyleDef[] = [];
  let current = id;
  for (let depth = 0; current && depth < 12; depth++) {
    const style = context.styles.get(current);
    if (!style) break;
    if (style.type === type || style.type === "paragraph") chain.unshift(style);
    current = style.basedOn;
  }
  return chain;
}

function resolveParagraph(context: Context, el: XmlElement): ParaProps {
  const directPPr = child(el, "pPr");
  const direct = parseParagraphProps(directPPr);
  const styleId = direct.styleId ?? context.docParagraph.styleId ?? null;
  const chain = styleChain(context, styleId, "paragraph");
  const merged = mergeOne<ParaProps>(
    context.docParagraph,
    ...chain.map((style) => style.pPr),
    direct,
  );
  const runMerged = mergeOne<RunProps>(
    context.docRun,
    ...chain.map((style) => style.rPr),
    direct.run,
  );
  const props = { ...baseParagraph, ...merged, styleId };
  props.run = runMerged;
  // A paragraph style may itself be numbered (e.g. ListParagraph).
  if (props.numId === null) {
    for (const style of [...chain].reverse()) {
      const fromStyle = style.pPr.numId;
      if (fromStyle) {
        props.numId = fromStyle;
        props.numLevel = style.pPr.numLevel ?? 0;
        break;
      }
    }
  }
  // A numbering level carries its own paragraph indentation. In Word it wins
  // over the paragraph style but loses to direct formatting, which is why the
  // fields the paragraph sets itself are skipped here.
  if (props.numId !== null) {
    const levels = context.numbering.get(props.numId);
    const level = levels?.get(props.numLevel ?? 0) ?? levels?.get(0);
    const levelProps = level?.pPr;
    if (levelProps) {
      if (
        direct.indentLeft === undefined &&
        levelProps.indentLeft !== undefined
      )
        props.indentLeft = levelProps.indentLeft;
      if (
        direct.indentRight === undefined &&
        levelProps.indentRight !== undefined
      )
        props.indentRight = levelProps.indentRight;
      if (direct.hanging === undefined && levelProps.hanging !== undefined)
        props.hanging = levelProps.hanging;
      if (direct.firstLine === undefined && levelProps.firstLine !== undefined)
        props.firstLine = levelProps.firstLine;
      if (!direct.tabs?.length && levelProps.tabs?.length)
        props.tabs = levelProps.tabs;
    }
  }
  return props;
}

function resolveRun(
  context: Context,
  el: XmlElement,
  para: ParaProps,
): RunProps {
  const rPr = child(el, "rPr");
  const direct = parseRunProps(rPr, baseRun.size);
  const charStyleEl = child(rPr, "rStyle");
  const chain = charStyleEl
    ? styleChain(context, attr(charStyleEl, "val"), "character")
    : [];
  return {
    ...baseRun,
    ...para.run,
    ...mergeOne<RunProps>(...chain.map((style) => style.rPr)),
    ...direct,
    // Style sizes are half-points resolved earlier; never inherit a stale fallback.
    size: direct.size ?? para.run.size ?? baseRun.size,
  };
}

function formatNumber(value: number, format: string): string {
  switch (format) {
    case "lowerLetter":
      return letter(value).toLowerCase();
    case "upperLetter":
      return letter(value);
    case "lowerRoman":
      return roman(value).toLowerCase();
    case "upperRoman":
      return roman(value);
    case "decimalZero":
      return String(value).padStart(2, "0");
    case "none":
      return "";
    default:
      return String(value);
  }
}

function letter(value: number) {
  let result = "";
  let n = value;
  while (n > 0) {
    const rem = (n - 1) % 26;
    result = String.fromCharCode(65 + rem) + result;
    n = Math.floor((n - 1) / 26);
  }
  return result;
}

function roman(value: number) {
  const table: [number, string][] = [
    [1000, "M"],
    [900, "CM"],
    [500, "D"],
    [400, "CD"],
    [100, "C"],
    [90, "XC"],
    [50, "L"],
    [40, "XL"],
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ];
  let n = value;
  let out = "";
  for (const [amount, symbol] of table)
    while (n >= amount) {
      out += symbol;
      n -= amount;
    }
  return out;
}

function listLabel(context: Context, props: ParaProps): string | null {
  if (!props.numId) return null;
  const levels = context.numbering.get(props.numId);
  if (!levels) return null;
  const level = levels.get(props.numLevel) || levels.get(0);
  if (!level) return null;
  let counters = context.counters.get(props.numId);
  if (!counters) {
    counters = [];
    context.counters.set(props.numId, counters);
  }
  counters[props.numLevel] = (counters[props.numLevel] || level.start - 1) + 1;
  for (let deeper = props.numLevel + 1; deeper < 9; deeper++)
    counters[deeper] = 0;
  if (level.format === "bullet") {
    const bullet = level.text || "•";
    // Word stores Symbol/Wingdings bullets as private-use characters.
    return /[^\u0020-\u024f]/.test(bullet) ? "•" : bullet;
  }
  return level.text.replace(/%(\d)/g, (_, index: string) => {
    const levelIndex = Number(index) - 1;
    const deeperLevel = levels.get(levelIndex) || level;
    return formatNumber(
      counters![levelIndex] || deeperLevel.start,
      deeperLevel.format,
    );
  });
}

type FieldState = { instr: string; result: boolean } | null;

function collectRuns(
  context: Context,
  parent: AnyNode,
  para: ParaProps,
  out: Run[],
  state: { field: FieldState } = { field: null },
) {
  for (const node of elementChildren(parent)) {
    const name = localName(node);
    if (name === "r") {
      const props = resolveRun(context, node, para);
      if (props.hidden) continue;
      for (const item of elementChildren(node)) {
        const itemName = localName(item);
        // Complex fields (PAGE, NUMPAGES, ...) arrive as fldChar begin /
        // instrText / separate / cached result / end across several runs.
        if (itemName === "fldChar") {
          const type = attr(item, "fldCharType");
          if (type === "begin") state.field = { instr: "", result: false };
          else if (type === "separate" && state.field) {
            state.field.result = true;
            const token = state.field.instr
              .trim()
              .split(/\s+/)[0]
              .toUpperCase();
            if (token === "NUMPAGES" || token === "PAGE")
              out.push({ kind: "field", name: token });
          } else if (type === "end") state.field = null;
          continue;
        }
        if (itemName === "instrText") {
          if (state.field) state.field.instr += item.textContent || "";
          continue;
        }
        if (state.field?.result) {
          const token = state.field.instr.trim().split(/\s+/)[0].toUpperCase();
          // Cached PAGE/NUMPAGES results are replaced by the live value; every
          // other field (PAGEREF, REF, TOC entries) keeps Word's stored text.
          if (token === "PAGE" || token === "NUMPAGES") continue;
        }
        if (itemName === "t")
          out.push({ kind: "text", text: item.textContent || "", props });
        else if (itemName === "tab") out.push({ kind: "tab" });
        else if (itemName === "br") {
          const type = attr(item, "type");
          out.push(type === "page" ? { kind: "pageBreak" } : { kind: "break" });
        } else if (itemName === "cr") out.push({ kind: "break" });
        else if (itemName === "noBreakHyphen")
          out.push({ kind: "text", text: "-", props });
        else if (itemName === "sym") {
          const char = attr(item, "char");
          if (char) {
            const code = parseInt(char, 16);
            out.push({
              kind: "text",
              text: Number.isFinite(code) ? String.fromCharCode(code) : "•",
              props,
            });
          }
        } else if (itemName === "drawing" || itemName === "pict")
          collectDrawing(context, item, out);
      }
    } else if (
      name === "hyperlink" ||
      name === "smartTag" ||
      name === "ins" ||
      name === "sdt" ||
      name === "sdtContent"
    ) {
      collectRuns(context, node, para, out, state);
    } else if (name === "fldSimple") {
      const instruction = (attr(node, "instr") || "").trim().toUpperCase();
      if (
        instruction.startsWith("PAGE") ||
        instruction.startsWith("NUMPAGES")
      ) {
        out.push({
          kind: "field",
          name: instruction.startsWith("NUMPAGES") ? "NUMPAGES" : "PAGE",
        });
      } else collectRuns(context, node, para, out, state);
    } else if (name === "del" || name === "delText") {
      // Deleted tracked changes are intentionally not rendered.
    } else if (name === "AlternateContent") {
      const choice = child(node, "Choice");
      collectRuns(context, choice || node, para, out, state);
    }
  }
}

function collectDrawing(context: Context, el: XmlElement, out: Run[]) {
  for (const blip of descendants(el, "blip")) {
    const rel = blip.getAttributeNS(R, "embed") || blip.getAttribute("r:embed");
    if (!rel) continue;
    if (!context.images.has(rel)) {
      const relation = context.rels.get(rel);
      if (relation)
        context.warnings.add(
          `Skipped unsupported media: ${relation.target.split("/").pop()}`,
        );
      continue;
    }
    const extents = descendants(el, "extent");
    const extent =
      extents.find((node) => node.getAttribute("cx")) || extents[0] || null;
    const cx = Number(extent?.getAttribute("cx") || 0);
    const cy = Number(extent?.getAttribute("cy") || 0);
    const image = context.images.get(rel)!;
    const width = cx > 0 ? cx / 12700 : image.width * 0.75;
    const height = cy > 0 ? cy / 12700 : image.height * 0.75;
    if (width < 1 || height < 1) continue;
    const docPr = descendants(el, "docPr")[0];
    out.push({
      kind: "image",
      rel,
      width,
      height,
      alt: docPr?.getAttribute("descr") || docPr?.getAttribute("name") || "",
    });
  }
  if (descendants(el, "txbxContent").length) {
    context.warnings.add("Text boxes are not rendered by the built-in engine.");
  }
}

function parseParagraph(context: Context, el: XmlElement): Paragraph {
  const props = resolveParagraph(context, el);
  const runs: Run[] = [];
  collectRuns(context, el, props, runs);
  const label = listLabel(context, props);
  if (label !== null) {
    const level =
      context.numbering.get(props.numId!)?.get(props.numLevel) ||
      context.numbering.get(props.numId!)?.get(0);
    runs.unshift({
      kind: "text",
      text: `${label}${level?.suffix === "nothing" ? "" : level?.suffix === "space" ? " " : "\t"}`,
      props: {
        ...baseRun,
        ...props.run,
        ...(level?.rPr || {}),
        size: level?.rPr?.size ?? props.run.size ?? baseRun.size,
      },
    });
  }
  return { kind: "paragraph", props, runs };
}

const NO_EDGE: Edge = { on: false, color: "000000", width: 0.7 };

function parseEdge(el: AnyNode | null): Edge | null {
  if (!el) return null;
  const value = attr(el as XmlElement, "val");
  if (value === null) return null;
  if (value === "nil" || value === "none") return { ...NO_EDGE, on: false };
  const sz = Number(attr(el as XmlElement, "sz"));
  return {
    on: true,
    color: hexColor(el) || "000000",
    width: Math.min(
      6,
      Math.max(0.4, (Number.isFinite(sz) && sz > 0 ? sz : 8) / 8),
    ),
  };
}

const BORDER_NAMES = [
  "top",
  "bottom",
  "left",
  "right",
  "insideH",
  "insideV",
] as const;

function parseBorderSet(
  el: AnyNode | null,
): Partial<Record<(typeof BORDER_NAMES)[number], Edge>> {
  if (!el) return {};
  const out: Partial<Record<(typeof BORDER_NAMES)[number], Edge>> = {};
  for (const name of BORDER_NAMES) {
    const edge = parseEdge(child(el, name));
    if (edge) out[name] = edge;
  }
  return out;
}

const NO_BORDERS: TableBorders = {
  top: NO_EDGE,
  bottom: NO_EDGE,
  left: NO_EDGE,
  right: NO_EDGE,
  insideH: NO_EDGE,
  insideV: NO_EDGE,
};

function readInsets(
  el: AnyNode | null,
  fallback: Insets = { top: 0, right: 5.4, bottom: 0, left: 5.4 },
): Insets {
  if (!el) return { ...fallback };
  const read = (name: keyof Insets) => {
    const node = child(el, name);
    const value = node ? (attr(node, "w") ?? attr(node, "val")) : null;
    return value === null ? fallback[name] : T(value);
  };
  return {
    top: read("top"),
    right: read("right"),
    bottom: read("bottom"),
    left: read("left"),
  };
}

/**
 * Cell shading is a fill colour or a Word pattern fill. Pattern fills carry
 * only a pattern name in w:val, so they are approximated with a flat tint of
 * the same density and the approximation is reported to the caller.
 */
function shadingOf(el: AnyNode | null): {
  fill: string | null;
  pattern: boolean;
} {
  if (!el) return { fill: null, pattern: false };
  const node = el as XmlElement;
  const fill = attr(node, "fill");
  const pattern = (attr(node, "val") || "").toLowerCase();
  if (fill && /^[0-9a-f]{6}$/i.test(fill) && fill.toLowerCase() !== "ffffff")
    return { fill: fill.toUpperCase(), pattern: false };
  if (fill && /^[0-9a-f]{6}$/i.test(fill) && fill.toLowerCase() === "ffffff")
    return { fill: null, pattern: false };
  const density: Record<string, number> = {
    pct5: 0.05,
    pct10: 0.1,
    pct12: 0.125,
    pct15: 0.15,
    pct20: 0.2,
    pct25: 0.25,
    pct30: 0.3,
    pct40: 0.4,
    pct50: 0.5,
    pct60: 0.6,
    pct70: 0.7,
    pct75: 0.75,
    pct80: 0.8,
    pct90: 0.9,
  };
  if (pattern in density) {
    const base = hexColor(child(node, "color") as XmlElement) || "808080";
    return { fill: blend(base, density[pattern]), pattern: true };
  }
  if (pattern && pattern !== "clear" && pattern !== "nil") {
    const base = hexColor(child(node, "color") as XmlElement) || "808080";
    return { fill: blend(base, 0.15), pattern: true };
  }
  return { fill: null, pattern: false };
}

function blend(hex: string, weight: number) {
  const channel = (offset: number) =>
    Math.round(
      255 - (255 - parseInt(hex.slice(offset, offset + 2), 16)) * weight,
    )
      .toString(16)
      .padStart(2, "0");
  return (channel(0) + channel(2) + channel(4)).toUpperCase();
}

/** Rows and cells are frequently wrapped in content controls or revisions. */
function tableParts(el: AnyNode | null, local: string): XmlElement[] {
  const out: XmlElement[] = [];
  for (const node of elementChildren(el)) {
    const name = localName(node);
    if (name === local) out.push(node);
    else if (
      name === "sdt" ||
      name === "sdtContent" ||
      name === "customXml" ||
      name === "ins" ||
      name === "del" ||
      name === "moveFrom" ||
      name === "moveTo"
    )
      out.push(...tableParts(node, local));
  }
  return out;
}

function parseTable(context: Context, el: XmlElement): Table {
  const grid = descendants(child(el, "tblGrid"), "gridCol").map((col) =>
    T(attr(col, "w")),
  );
  const tblPr = child(el, "tblPr");
  const styleId = attr(child(tblPr, "tblStyle"), "val");
  const chain = styleChain(context, styleId, "table");

  // Style borders first (outer style, then basedOn), then direct formatting.
  const borderSets = [
    ...chain.map((style) => style.tbl?.borders),
    parseBorderSet(child(tblPr, "tblBorders")),
  ].filter(Boolean) as Partial<TableBorders>[];
  const borders: TableBorders = { ...NO_BORDERS };
  for (const set of borderSets)
    for (const key of BORDER_NAMES) if (set[key]) borders[key] = set[key]!;

  let margins: Insets = { top: 0, right: 5.4, bottom: 0, left: 5.4 };
  for (const style of chain)
    if (style.tbl?.cellMargins) margins = style.tbl.cellMargins;
  const mar = child(tblPr, "tblCellMar");
  if (mar) margins = readInsets(mar, margins);

  let indent = 0;
  for (const style of chain)
    if (style.tbl?.indent !== undefined) indent = style.tbl.indent;
  const indEl = child(tblPr, "tblInd");
  if (indEl && attr(indEl, "w")) indent = T(attr(indEl, "w"));

  const alignValue = attr(child(tblPr, "jc"), "val");
  // Table styles may set paragraph defaults (Table Grid removes cell spacing).
  const styleParagraph = mergeOne<ParaProps>(
    ...chain.map((style) => style.pPr),
  );
  const savedParagraph = context.docParagraph;
  context.docParagraph = mergeOne<ParaProps>(savedParagraph, styleParagraph);

  const rows: TableRow[] = [];
  try {
    for (const rowEl of tableParts(el, "tr")) {
      const trPr = child(rowEl, "trPr");
      const heightEl = child(trPr, "trHeight");
      const cells: TableCell[] = [];
      for (const cellEl of tableParts(rowEl, "tc")) {
        const tcPr = child(cellEl, "tcPr");
        const span = Number(attr(child(tcPr, "gridSpan"), "val") || 1);
        const vMergeEl = child(tcPr, "vMerge");
        const blocks: Block[] = [];
        for (const node of elementChildren(cellEl)) {
          const name = localName(node);
          if (name === "p") blocks.push(parseParagraph(context, node));
          else if (name === "tbl") blocks.push(parseTable(context, node));
          else if (name === "sdt") {
            for (const inner of descendants(node, "p"))
              blocks.push(parseParagraph(context, inner));
          }
        }
        if (!blocks.length) blocks.push(parseParagraph(context, cellEl));
        blocks.push(...textBoxBlocks(context, cellEl));
        const widthEl = child(tcPr, "tcW");
        const widthType = attr(widthEl, "type");
        const widthValue = attr(widthEl, "w");
        const shade = shadingOf(child(tcPr, "shd"));
        if (shade.pattern)
          context.warnings.add(
            "Patterned table cell shading is approximated with a flat tint.",
          );
        const cellBorders: Partial<Record<EdgeName, Edge>> = {};
        const direct = parseBorderSet(child(tcPr, "tcBorders"));
        for (const name of ["top", "bottom", "left", "right"] as const)
          if (direct[name]) cellBorders[name] = direct[name];
        cells.push({
          blocks,
          span: Number.isFinite(span) && span > 0 ? span : 1,
          vMerge: vMergeEl
            ? attr(vMergeEl, "val") === "restart"
              ? "restart"
              : "continue"
            : null,
          shading: shade.fill,
          width:
            widthEl && widthType === "dxa" && widthValue ? T(widthValue) : null,
          margins: readInsets(child(tcPr, "tcMar"), margins),
          borders: cellBorders,
          valign:
            attr(child(tcPr, "vAlign"), "val") === "center"
              ? "center"
              : attr(child(tcPr, "vAlign"), "val") === "bottom"
                ? "bottom"
                : "top",
        });
      }
      rows.push({
        cells,
        height: heightEl ? T(attr(heightEl, "h")) : null,
        header: truthy(child(trPr, "tblHeader")),
      });
    }
  } finally {
    context.docParagraph = savedParagraph;
  }
  return {
    kind: "table",
    grid,
    rows,
    borders,
    cellMargins: margins,
    align:
      alignValue === "center"
        ? "center"
        : alignValue === "right"
          ? "right"
          : "left",
    indent,
  };
}


/**
 * Text boxes (DrawingML wps:txbx and legacy VML v:textbox) carry real document
 * text. Word floats them; a linear PDF writer cannot reproduce the float, so
 * their paragraphs are emitted inline right after the containing block and the
 * approximation is reported.
 */
function textBoxBlocks(context: Context, node: XmlElement): Block[] {
  const out: Block[] = [];
  // Nested boxes are visited too: each paragraph belongs to exactly one box's
  // direct children, so nothing is emitted twice.
  for (const box of descendants(node, "txbxContent")) {
    for (const inner of elementChildren(box)) {
      const name = localName(inner);
      if (name === "p") out.push(parseParagraph(context, inner));
      else if (name === "tbl") out.push(parseTable(context, inner));
    }
  }
  if (out.length)
    context.warnings.add(
      "Floating text boxes are placed inline at their anchor position.",
    );
  return out;
}

function parseBlocks(context: Context, root: XmlElement): Block[] {
  const blocks: Block[] = [];
  for (const node of elementChildren(root)) {
    const name = localName(node);
    if (name === "p") {
      blocks.push(parseParagraph(context, node));
      blocks.push(...textBoxBlocks(context, node));
    } else if (name === "tbl") blocks.push(parseTable(context, node));
    else if (name === "sdt") {
      for (const inner of elementChildren(child(node, "sdtContent") || node)) {
        const innerName = localName(inner);
        if (innerName === "p") blocks.push(parseParagraph(context, inner));
        else if (innerName === "tbl") blocks.push(parseTable(context, inner));
      }
    }
  }
  return blocks;
}

function parseHeaderFooter(
  context: Context,
  xml: string | undefined,
): HeaderFooter | undefined {
  if (!xml) return undefined;
  const doc = parseXml(xml);
  const root = doc.documentElement as unknown as XmlElement | null;
  if (!root) return undefined;
  return { blocks: parseBlocks(context, root), found: true };
}

function sectionGeometry(
  sectPr: AnyNode | null,
  fallback: { width: number; height: number },
) {
  const size = child(sectPr, "pgSz");
  const width = size ? T(attr(size, "w"), fallback.width * 20) : fallback.width;
  const height = size
    ? T(attr(size, "h"), fallback.height * 20)
    : fallback.height;
  const marginsEl = child(sectPr, "pgMar");
  const edge = (name: string, fallbackValue: number) =>
    marginsEl ? T(attr(marginsEl, name), fallbackValue) : fallbackValue;
  return {
    pageWidth: width > 100 ? width : fallback.width,
    pageHeight: height > 100 ? height : fallback.height,
    margins: {
      top: edge("top", 72),
      right: edge("right", 72),
      bottom: edge("bottom", 72),
      left: edge("left", 72),
      header: edge("header", 36),
      footer: edge("footer", 36),
    },
  };
}

export function parseDocxPackage(bytes: Uint8Array): DocxModel {
  if (bytes[0] !== 0x50 || bytes[1] !== 0x4b)
    throw new Error("This is not a DOCX package.");
  let expanded = 0;
  let entries = 0;
  const files = unzipSync(bytes, {
    filter: (file) => {
      expanded += file.originalSize;
      entries++;
      if (
        expanded > 160 * 1024 * 1024 ||
        entries > 4000 ||
        file.originalSize > 64 * 1024 * 1024
      )
        throw new Error("DOCX expands beyond the safe processing limit.");
      if (file.name.includes("..") || file.name.startsWith("/"))
        throw new Error("DOCX contains an unsafe package path.");
      if (
        /vbaProject|activeX|oleObject/i.test(file.name) ||
        (/embeddings\//i.test(file.name) &&
          /\.(bin|exe|dll|docm)$/i.test(file.name))
      )
        throw new Error(
          "Macros and embedded executable/OLE objects are unsupported.",
        );
      return true;
    },
  });
  if (!files["word/document.xml"] || !files["[Content_Types].xml"])
    throw new Error(
      "Unsupported or corrupted DOCX: required document parts are missing.",
    );

  const text = (name: string) =>
    files[name] ? strFromU8(files[name]) : undefined;
  const warnings = new Set<string>();
  const core = readCoreProps(text("docProps/core.xml"));
  const relsDoc = relsFor(text("word/_rels/document.xml.rels"));
  const images = new Map<string, ImageAsset>();
  for (const [id, relation] of relsDoc) {
    if (relation.external) continue;
    const target = relation.target.startsWith("/")
      ? relation.target.slice(1)
      : `word/${relation.target.replace(/^\.\//, "")}`;
    const data = files[target];
    if (!data) continue;
    const asset = imageAsset(target, data);
    if (asset) images.set(id, asset);
    else if (/\.(png|jpe?g|gif|bmp|tiff?|emf|wmf|svg)$/i.test(target))
      warnings.add(
        `Skipped unsupported image format: ${target.split("/").pop()}`,
      );
  }

  const styleData = parseStyles(text("word/styles.xml"));
  const context: Context = {
    rels: relsDoc,
    images,
    numbering: parseNumbering(text("word/numbering.xml")),
    styles: styleData.styles,
    docRun: styleData.docRun,
    docParagraph: styleData.docParagraph,
    warnings,
    counters: new Map(),
  };

  const documentXml = text("word/document.xml")!;
  const doc = parseXml(documentXml);
  const body = descendants(doc, "body")[0];
  if (!body) throw new Error("Corrupted DOCX: missing document body.");
  if (descendants(doc, "altChunk").length)
    warnings.add("Embedded HTML (altChunk) blocks are not rendered.");
  if (descendants(doc, "footnoteReference").length)
    warnings.add("Footnotes are not rendered by the built-in engine.");
  if (descendants(doc, "endnoteReference").length)
    warnings.add("Endnotes are not rendered by the built-in engine.");
  if (descendants(doc, "commentReference").length)
    warnings.add("Word comments are not rendered.");
  if (descendants(doc, "object").length)
    warnings.add("Embedded OLE objects are not rendered.");

  const settings = text("word/settings.xml");
  const evenOdd = Boolean(settings && /<w:evenAndOddHeaders\b/.test(settings));

  const defaultPage = { width: 595.28, height: 841.89 };
  const sections: Section[] = [];
  let blocks: Block[] = [];

  const headerFooter = (sectPr: AnyNode | null) => {
    const headers: Section["headers"] = {};
    const footers: Section["footers"] = {};
    if (!sectPr) return { headers, footers, titlePg: false };
    for (const reference of elementChildren(sectPr)) {
      const name = localName(reference);
      if (name !== "headerReference" && name !== "footerReference") continue;
      const type = attr(reference, "type") || "default";
      const rel = rattr(reference, "id");
      if (!rel) continue;
      const relation = relsDoc.get(rel);
      if (!relation) continue;
      const path = `word/${relation.target.replace(/^\.\//, "")}`;
      const part = text(path);
      if (!part) continue;
      const parsed = parseHeaderFooter(context, part);
      if (!parsed) continue;
      const slot =
        type === "first" ? "first" : type === "even" ? "even" : "default";
      if (name === "headerReference") headers[slot] = parsed;
      else footers[slot] = parsed;
    }
    return { headers, footers, titlePg: truthy(child(sectPr, "titlePg")) };
  };

  const pushSection = (section: Section) => {
    const previous = sections[sections.length - 1];
    // OOXML inherits header/footer parts from the previous section when a
    // section declares none; without this, later sections lose them entirely.
    if (previous) {
      if (!Object.keys(section.headers).length)
        section.headers = previous.headers;
      if (!Object.keys(section.footers).length)
        section.footers = previous.footers;
    }
    sections.push(section);
  };

  for (const node of elementChildren(body)) {
    const name = localName(node);
    if (name === "p") {
      const paragraph = parseParagraph(context, node);
      blocks.push(paragraph);
      blocks.push(...textBoxBlocks(context, node));
      const sectPr = child(child(node, "pPr"), "sectPr");
      if (sectPr) {
        const geometry = sectionGeometry(sectPr, defaultPage);
        pushSection({
          blocks,
          ...geometry,
          ...headerFooter(sectPr),
        });
        blocks = [];
      }
    } else if (name === "tbl") {
      blocks.push(parseTable(context, node));
      blocks.push(...textBoxBlocks(context, node));
    } else if (name === "sdt") {
      const content = child(node, "sdtContent") || node;
      blocks.push(...parseBlocks(context, content));
    } else if (name === "sectPr") {
      const geometry = sectionGeometry(node, defaultPage);
      pushSection({
        blocks,
        ...geometry,
        ...headerFooter(node),
      });
      blocks = [];
    }
  }
  if (blocks.length || !sections.length) {
    const geometry = sectionGeometry(null, defaultPage);
    pushSection({
      blocks,
      ...geometry,
      headers: {},
      footers: {},
      titlePg: false,
    });
  }

  return {
    sections,
    evenOdd,
    images,
    warnings,
    defaultPage,
    ...core,
  };
}
