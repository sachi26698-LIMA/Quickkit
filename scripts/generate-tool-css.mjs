/**
 * Generates app/tool-pages.generated.css from app/globals.css.
 *
 * Why: the tool pages were styled over many phases with 9–12px text and a
 * fixed plum/lavender palette baked into hundreds of rules. Instead of
 * editing every shared rule (which would also touch the homepage), this
 * script re-emits only the tool-related rules, scoped to
 * `.tool-page[data-tool]`, with
 *   1. a type ramp that lifts every small px font-size (hierarchy preserved),
 *   2. the plum/lavender/rose literals remapped onto the per-tool theme
 *      variables (--t-rgb, --t2-rgb, --t-deep) set by ToolShell.
 *
 * Usage: node scripts/generate-tool-css.mjs
 * The same ramp/colour mapping is exported for the word-to-pdf and
 * pdf-lock-unlock CSS modules (see scripts/retheme-tool-modules.mjs).
 */
import fs from "node:fs";
import path from "node:path";
import postcss from "postcss";

const root = process.cwd();

/* ---------- type ramp -------------------------------------------------- */
const RAMP = new Map([
  [7, 12],
  [8, 12],
  [8.5, 12],
  [9, 12],
  [9.5, 12.5],
  [10, 12.5],
  [10.5, 13],
  [11, 13.5],
  [11.5, 13.5],
  [12, 14],
  [12.5, 14],
  [13, 14.5],
  [13.5, 15],
  [14, 15],
  [14.5, 15.5],
  [15, 16],
  [15.5, 16],
]);
export function rampPx(value) {
  return value.replace(/(-?\d*\.?\d+)px\b/g, (m, n) => {
    const to = RAMP.get(Number(n));
    return to ? `${to}px` : m;
  });
}

/* ---------- colour mapping --------------------------------------------- */
function parseHex(h) {
  let s = h.slice(1);
  if (s.length === 3 || s.length === 4) s = [...s].map((c) => c + c).join("");
  const r = parseInt(s.slice(0, 2), 16);
  const g = parseInt(s.slice(2, 4), 16);
  const b = parseInt(s.slice(4, 6), 16);
  const a = s.length === 8 ? parseInt(s.slice(6, 8), 16) / 255 : 1;
  return { r, g, b, a };
}
function hsl({ r, g, b }) {
  const R = r / 255;
  const G = g / 255;
  const B = b / 255;
  const max = Math.max(R, G, B);
  const min = Math.min(R, G, B);
  const l = (max + min) / 2;
  const c = max - min;
  let h = 0;
  if (c) {
    if (max === R) h = ((G - B) / c + 6) % 6;
    else if (max === G) h = (B - R) / c + 2;
    else h = (R - G) / c + 4;
    h *= 60;
  }
  const s = c === 0 ? 0 : c / (1 - Math.abs(2 * l - 1));
  return { h, s, l, chroma: c * 255 };
}
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
const mix = (pct) => `color-mix(in srgb, rgb(var(--t-rgb)) ${pct}%, #fff)`;

/** Returns a replacement for a brand-family colour, or null to keep it. */
export function mapColor(
  { r, g, b, a },
  { border = false, text = false } = {},
) {
  const { h, l, chroma } = hsl({ r, g, b });
  if (chroma < 3) return null; // neutral
  // brand family: blue-violet … purple … magenta … rose/pink
  const brand = h >= 235 && h <= 343;
  if (!brand) return null;
  if (l < 0.16) return null; // near-black ink stays ink (text readability)
  if (a < 1) {
    // translucent plum/purple (borders, shadows, washes)
    if (l < 0.6) return `rgb(var(--t-rgb) / ${+a.toFixed(3)})`;
    return `rgb(var(--t-rgb) / ${+(a * 0.8).toFixed(3)})`;
  }
  if (l >= 0.88) {
    const p = clamp(Math.round((1 - l) * 100 * (border ? 2.1 : 1.15)), 2, 26);
    return mix(p);
  }
  if (l >= 0.72 && !text)
    return mix(clamp(Math.round((1 - l) * 100 * 1.6), 20, 56));
  // text colours must stay AA-readable on light surfaces: always the deep shade
  if (l >= 0.3 && !text) return "rgb(var(--t-rgb))";
  return "var(--t-deep)";
}
const COLOR_PROPS =
  /^(color|background|background-color|background-image|border|border-color|border-top|border-right|border-bottom|border-left|border-top-color|border-right-color|border-bottom-color|border-left-color|outline|outline-color|box-shadow|text-shadow|fill|stroke|accent-color|caret-color)$/;
export function mapColors(prop, value) {
  const border = /border|outline/.test(prop);
  const text = prop === "color";
  let out = value;
  out = out.replace(
    /#[0-9a-fA-F]{8}\b|#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g,
    (m) => {
      const rep = mapColor(parseHex(m), { border, text });
      return rep ?? m;
    },
  );
  out = out.replace(
    /rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)/g,
    (m, r, g, b, alpha) => {
      let a = 1;
      if (alpha !== undefined)
        a = alpha.endsWith("%") ? parseFloat(alpha) / 100 : parseFloat(alpha);
      const rep = mapColor({ r: +r, g: +g, b: +b, a }, { border, text });
      return rep ?? m;
    },
  );
  return out;
}

export function transformDecl(prop, value) {
  let next = value;
  if (prop === "font-size") next = rampPx(next);
  if (COLOR_PROPS.test(prop) && !/var\(--t-/.test(value))
    next = mapColors(prop, next);
  return next;
}

/* ---------- main ------------------------------------------------------- */
function splitSelectors(sel) {
  const out = [];
  let depth = 0;
  let cur = "";
  for (const ch of sel) {
    if (ch === "(" || ch === "[") depth++;
    if (ch === ")" || ch === "]") depth--;
    if (ch === "," && depth === 0) {
      out.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

function walkFiles(dir, exts, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkFiles(p, exts, acc);
    else if (exts.some((x) => p.endsWith(x))) acc.push(p);
  }
  return acc;
}

function main() {
  const sources = [
    ...walkFiles(path.join(root, "components/tools"), [".tsx"]),
    path.join(root, "components/tool-shell.tsx"),
    ...walkFiles(path.join(root, "app/tools"), [".tsx"]),
  ];
  const tokens = new Set();
  const addWords = (str) => {
    for (const m of str.matchAll(/[A-Za-z][A-Za-z0-9_-]*/g)) tokens.add(m[0]);
  };
  for (const f of sources) {
    const text = fs.readFileSync(f, "utf8");
    for (const hit of text.matchAll(/className\s*=\s*/g)) {
      let i = hit.index + hit[0].length;
      if (text[i] === '"' || text[i] === "'") {
        const end = text.indexOf(text[i], i + 1);
        addWords(text.slice(i + 1, end));
      } else if (text[i] === "{") {
        let depth = 0;
        let j = i;
        for (; j < text.length; j++) {
          if (text[j] === "{") depth++;
          else if (text[j] === "}" && --depth === 0) break;
        }
        // keep only the quoted / template-literal pieces of the expression
        const expr = text.slice(i, j);
        for (const q of expr.matchAll(/"([^"]*)"|'([^']*)'|`([^`]*)`/g))
          addWords((q[1] ?? q[2] ?? q[3] ?? "").replace(/\$\{[^}]*\}/g, " "));
      }
    }
  }

  const css = fs.readFileSync(path.join(root, "app/globals.css"), "utf8");
  const marker = css.indexOf("Glass design system V2");
  const cut = marker > 0 ? css.lastIndexOf("/*", marker) : -1;
  const parsed = postcss.parse(cut > 0 ? css.slice(0, cut) : css);

  const classesOf = (sel) =>
    [...sel.matchAll(/\.(-?[A-Za-z_][A-Za-z0-9_-]*)/g)].map((m) => m[1]);
  const keep = (sel) => {
    if (/^(html|body|:root|\*)/.test(sel)) return false;
    const cls = classesOf(sel);
    if (!cls.length) return false;
    return cls.every((c) => tokens.has(c) || c.startsWith("tool-"));
  };
  const scope = (sel) => {
    if (sel.startsWith(".tool-page-compact"))
      return sel.replace(
        ".tool-page-compact",
        ".tool-page[data-tool].tool-page-compact",
      );
    if (/(^|[\s>+~])\.tool-page\b(?!-)/.test(sel))
      return sel.replace(/\.tool-page\b(?!-)/, ".tool-page[data-tool]");
    return `.tool-page[data-tool] ${sel}`;
  };

  const out = [];
  let rules = 0;
  let decls = 0;
  const emit = (node, indent) => {
    for (const child of node.nodes ?? []) {
      if (child.type === "rule") {
        if (
          child.parent?.type === "atrule" &&
          /keyframes|font-face/.test(child.parent.name)
        )
          continue;
        const sels = splitSelectors(child.selector).filter(keep);
        if (!sels.length) continue;
        const changed = [];
        child.walkDecls((d) => {
          if (d.parent !== child) return;
          const next = transformDecl(d.prop, d.value);
          if (next !== d.value)
            changed.push(
              `${d.prop}: ${next}${d.important ? " !important" : ""};`,
            );
        });
        if (!changed.length) continue;
        rules++;
        decls += changed.length;
        out.push(
          `${indent}${sels.map(scope).join(",\n" + indent)} {\n${indent}  ${changed.join(`\n${indent}  `)}\n${indent}}`,
        );
      } else if (child.type === "atrule") {
        if (/keyframes|font-face|import|charset|layer/.test(child.name))
          continue;
        if (!child.nodes) continue;
        const inner = [];
        const saved = out.length;
        emit(child, indent + "  ");
        if (out.length > saved) {
          const body = out.splice(saved).join("\n");
          inner.push(
            `${indent}@${child.name} ${child.params} {\n${body}\n${indent}}`,
          );
          out.push(...inner);
        }
      }
    }
  };
  emit(parsed, "");

  const header = `/* GENERATED by scripts/generate-tool-css.mjs — do not edit by hand.
   Re-emits tool-related rules from globals.css scoped to
   .tool-page[data-tool], with a lifted type ramp and per-tool theme colours.
   Hand-written refinements live in tool-pages.css (loaded after this file). */\n`;
  fs.writeFileSync(
    path.join(root, "app/tool-pages.generated.css"),
    header + out.join("\n") + "\n",
  );
  console.log(`emitted ${rules} rules / ${decls} declarations`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
