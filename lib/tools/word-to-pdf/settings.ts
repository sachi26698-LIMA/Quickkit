export const MAX_FILE = 20 * 1024 * 1024;
export const MAX_QUEUE = 80 * 1024 * 1024;
export const sizes = {
  A4: [210, 297],
  A3: [297, 420],
  A5: [148, 210],
  Letter: [215.9, 279.4],
  Legal: [215.9, 355.6],
} as const;
export type Settings = {
  paper: "Original" | keyof typeof sizes | "Custom";
  landscape: boolean;
  width: number;
  height: number;
  margins: boolean;
  top: number;
  right: number;
  bottom: number;
  left: number;
  quality: "standard" | "high" | "print";
  pages: string;
  header: string;
  footer: string;
  numbering: boolean;
  position: "top" | "bottom";
  align: "left" | "center" | "right";
  font: "Helvetica" | "Times-Roman" | "Courier";
  fontSize: number;
  color: string;
  layoutScope: "all" | "selected";
  layoutPages: string;
  excludePages: string;
  pageOrder: string;
  overlayPages: string;
  startNumber: number;
  numberStyle: "arabic" | "roman";
  skipFirstNumber: boolean;
  rotation: number;
  backgroundEnabled: boolean;
  backgroundColor: string;
  compression: "auto" | "jpeg" | "lossless";
  jpegQuality: number;
  preserveResolution: boolean;
  imageDpi: number;
  tagged: boolean;
  title: string;
  author: string;
  subject: string;
  keywords: string;
};
export const defaults: Settings = {
  paper: "Original",
  landscape: false,
  width: 210,
  height: 297,
  margins: false,
  top: 25,
  right: 25,
  bottom: 25,
  left: 25,
  quality: "standard",
  pages: "",
  header: "",
  footer: "",
  numbering: false,
  position: "bottom",
  align: "center",
  font: "Helvetica",
  fontSize: 10,
  color: "#3B1B4F",
  layoutScope: "all",
  layoutPages: "",
  excludePages: "",
  pageOrder: "",
  overlayPages: "",
  startNumber: 1,
  numberStyle: "arabic",
  skipFirstNumber: false,
  rotation: 0,
  backgroundEnabled: false,
  backgroundColor: "#F4D7D4",
  compression: "auto",
  jpegQuality: 90,
  preserveResolution: true,
  imageDpi: 300,
  tagged: false,
  title: "",
  author: "",
  subject: "",
  keywords: "",
};
export function validateSettings(input: unknown): Settings {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new Error("Invalid page settings.");
  const s = { ...defaults, ...input } as Settings;
  if (
    !["Original", "Custom", ...Object.keys(sizes)].includes(s.paper) ||
    !["standard", "high", "print"].includes(s.quality) ||
    !["left", "center", "right"].includes(s.align) ||
    !["top", "bottom"].includes(s.position) ||
    !["Helvetica", "Times-Roman", "Courier"].includes(s.font)
  )
    throw new Error("Unsupported settings.");
  for (const key of [
    "width",
    "height",
    "top",
    "right",
    "bottom",
    "left",
    "fontSize",
  ] as const) {
    if (
      typeof s[key] !== "number" ||
      !Number.isFinite(s[key]) ||
      s[key] <
        (key === "width" || key === "height"
          ? 50
          : key === "fontSize"
            ? 6
            : 0) ||
      s[key] >
        (key === "fontSize"
          ? 36
          : key === "width" || key === "height"
            ? 600
            : 100)
    )
      throw new Error(`Invalid ${key}.`);
  }
  for (const key of ["landscape", "margins", "numbering"] as const)
    if (typeof s[key] !== "boolean") throw new Error(`Invalid ${key}.`);
  for (const key of ["pages", "header", "footer", "color"] as const)
    if (typeof s[key] !== "string") throw new Error(`Invalid ${key}.`);
  if (
    !/^#[0-9a-f]{6}$/i.test(s.color) ||
    s.header.length > 120 ||
    s.footer.length > 120 ||
    /[^\x20-\x7e]/.test(s.header + s.footer)
  )
    throw new Error(
      "Overlay text supports up to 120 basic Latin characters. Existing document text is not restricted.",
    );
  if (
    s.pages.length > 400 ||
    (s.pages.trim() &&
      !/^\d+(?:\s*-\s*\d+)?(?:\s*,\s*\d+(?:\s*-\s*\d+)?)*$/.test(
        s.pages.trim(),
      ))
  )
    throw new Error("Use page ranges such as 1-3, 5.");
  if (s.paper !== "Original") {
    const [w, h] = s.paper === "Custom" ? [s.width, s.height] : sizes[s.paper];
    const width = s.landscape ? h : w,
      height = s.landscape ? w : h;
    if (
      s.margins &&
      (s.left + s.right >= width - 10 || s.top + s.bottom >= height - 10)
    )
      throw new Error("Margins leave no usable page area.");
  }
  if (
    !["all", "selected"].includes(s.layoutScope) ||
    !["arabic", "roman"].includes(s.numberStyle) ||
    !["auto", "jpeg", "lossless"].includes(s.compression) ||
    ![0, 90, 180, 270].includes(s.rotation)
  )
    throw new Error("Unsupported studio settings.");
  for (const k of [
    "skipFirstNumber",
    "backgroundEnabled",
    "preserveResolution",
    "tagged",
  ] as const)
    if (typeof s[k] !== "boolean") throw new Error(`Invalid ${k}.`);
  for (const [k, min, max] of [
    ["startNumber", 1, 3900],
    ["jpegQuality", 1, 100],
    ["imageDpi", 72, 600],
  ] as const)
    if (!Number.isInteger(s[k]) || s[k] < min || s[k] > max)
      throw new Error(`Invalid ${k}.`);
  if (
    typeof s.backgroundColor !== "string" ||
    !/^#[0-9a-f]{6}$/i.test(s.backgroundColor)
  )
    throw new Error("Invalid background colour.");
  for (const k of [
    "layoutPages",
    "excludePages",
    "pageOrder",
    "overlayPages",
  ] as const)
    if (
      typeof s[k] !== "string" ||
      s[k].length > 400 ||
      (s[k].trim() &&
        !/^\d+(?:\s*-\s*\d+)?(?:\s*,\s*\d+(?:\s*-\s*\d+)?)*$/.test(s[k].trim()))
    )
      throw new Error(`Invalid ${k}; use 1-3, 5.`);
  for (const k of ["title", "author", "subject", "keywords"] as const)
    if (
      typeof s[k] !== "string" ||
      s[k].length > 200 ||
      /[\x00-\x1f]/.test(s[k])
    )
      throw new Error(`Invalid PDF ${k}.`);
  return s;
}
export function selectedPages(range: string, count: number): number[] {
  if (!range.trim()) return Array.from({ length: count }, (_, i) => i);
  const result = new Set<number>();
  for (const part of range.split(",")) {
    const [start, end = start] = part.split("-").map(Number);
    if (
      !Number.isInteger(start) ||
      !Number.isInteger(end) ||
      start < 1 ||
      end < start ||
      end > count
    )
      throw new Error(`Page selection is outside this document (1–${count}).`);
    for (let p = start; p <= end; p++) result.add(p - 1);
  }
  return [...result].sort((a, b) => a - b);
}
export function outputName(name: string): string {
  return (
    (name
      .replace(/\.pdf$/i, "")
      .replace(/[^\p{L}\p{N} ._-]/gu, "_")
      .replace(/^\.+/, "")
      .trim()
      .slice(0, 100) || "document") + ".pdf"
  );
}

/** Only changes to these values require native rendering and a new upload. */
export function nativeKey(s: Settings): string {
  return JSON.stringify([
    s.layoutScope === "all" && (s.paper !== "Original" || s.margins)
      ? [
          s.paper,
          s.landscape,
          s.paper === "Custom" ? s.width : null,
          s.paper === "Custom" ? s.height : null,
          s.margins,
          s.top,
          s.right,
          s.bottom,
          s.left,
        ]
      : "original",
    s.quality,
    s.compression,
    s.jpegQuality,
    s.preserveResolution,
    s.imageDpi,
    s.tagged,
  ]);
}
export function orderedPages(s: Settings, count: number): number[] {
  const included = selectedPages(s.pages, count);
  const excluded = new Set(
    s.excludePages.trim() ? selectedPages(s.excludePages, count) : [],
  );
  const allowed = included.filter((p) => !excluded.has(p));
  if (!allowed.length) throw new Error("Page selection excludes every page.");
  if (!s.pageOrder.trim()) return allowed;
  const order: number[] = [];
  for (const part of s.pageOrder.split(",")) {
    // selectedPages validates each range while preserving the requested range order.
    for (const p of selectedPages(part, count)) {
      if (!allowed.includes(p) || order.includes(p))
        throw new Error(
          "Output order must list each included page exactly once.",
        );
      order.push(p);
    }
  }
  if (order.length !== allowed.length)
    throw new Error("Output order must list each included page exactly once.");
  return order;
}
export function pageNumber(
  value: number,
  style: Settings["numberStyle"],
): string {
  if (style === "arabic") return String(value);
  let result = "";
  for (const [n, letters] of [
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
  ] as const)
    while (value >= n) {
      result += letters;
      value -= n;
    }
  return result;
}
