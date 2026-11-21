/**
 * QUICKKIT brand asset generator.
 *
 * Rebuilds every official logo variant in `public/brand/` plus the app icons
 * (`app/icon.svg`, `public/icon.svg`, `app/apple-icon.png`, `app/favicon.ico`)
 * from two sources of truth:
 *
 *   1. The original uploaded reference artwork in `docs/brand/reference/`.
 *      The symbol geometry below is measured directly from the orbital Q
 *      reference (ring/planet/bolt/orbit/tail/sparkle proportions) and the
 *      wordmark block from the wordmark reference (letterforms, sparkle
 *      placement, tagline and the upward crescent swoosh). Do not redesign —
 *      if the reference changes, re-measure and adjust the constants here.
 *   2. Real glyph outlines extracted from Montserrat Black Italic /
 *      SemiBold Italic, so the QUICKKIT wordmark is genuine vector letterforms
 *      and never depends on an installed font at render time.
 *
 * The wordmark colouring follows docs/BRAND_GUIDELINES.md:
 * QUICK deep royal purple, KIT vivid hot pink/magenta.
 *
 * This script is NOT part of the build. The generated assets are committed, so
 * the site never needs these tools at install or deploy time. To regenerate:
 *
 *   npm install --no-save opentype.js @resvg/resvg-js @expo-google-fonts/montserrat
 *   node scripts/brand/generate-assets.mjs
 *
 * Outputs (see docs/BRAND_ASSET_INVENTORY.md for the full manifest):
 *   public/brand/logo-symbol.svg        primary full-colour symbol
 *   public/brand/logo-wordmark.svg      official wordmark + tagline
 *   public/brand/logo-horizontal.svg    symbol + wordmark horizontal lockup
 *   public/brand/logo-vertical.svg      stacked lockup
 *   public/brand/logo-white.svg         white lockup for dark backgrounds
 *   public/brand/logo-dark.svg          dark-navy lockup for light backgrounds
 *   public/brand/logo-mono.svg          strict monochrome (black) lockup
 *   public/brand/logo-mono-white.svg    strict monochrome (white) lockup
 *   public/brand/favicon.svg            rounded-square app / favicon mark
 *   public/brand/*.png                  favicon, PWA, Apple, social raster set
 *   app/icon.svg, public/icon.svg       Next.js / PWA icon route (favicon.svg)
 *   app/apple-icon.png                  Apple touch icon (180×180)
 *   app/favicon.ico                     multi-size classic favicon
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

function tryResolve(spec) {
  try {
    return require(spec);
  } catch {
    const fallbackRoot =
      process.env.BRAND_TOOLING_ROOT || process.cwd() + "/node_modules";
    return require(path.join(fallbackRoot, spec));
  }
}

const opentype = tryResolve("opentype.js");
const { Resvg } = tryResolve("@resvg/resvg-js");

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = process.env.QUICKKIT_REPO_ROOT
  ? path.resolve(process.env.QUICKKIT_REPO_ROOT)
  : path.resolve(scriptDir, "..", "..");

const FONT_CANDIDATES = [
  "node_modules/@expo-google-fonts/montserrat",
  "@expo-google-fonts/montserrat",
];

function fontFile(variant) {
  const rel = path.join(variant, `Montserrat_${variant}.ttf`);
  for (const root of FONT_CANDIDATES) {
    const full = path.isAbsolute(root)
      ? path.join(root, rel)
      : path.join(repoRoot, root, rel);
    if (fs.existsSync(full)) return full;
    const fromCwd = path.join(process.cwd(), root, rel);
    if (fs.existsSync(fromCwd)) return fromCwd;
  }
  throw new Error(
    `Montserrat ${variant} not found. Run: npm install --no-save @expo-google-fonts/montserrat`,
  );
}

function loadFont(variant) {
  const buf = fs.readFileSync(fontFile(variant));
  return opentype.parse(
    buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Official palette (docs/BRAND_GUIDELINES.md). Keep in sync — one edit here and
// every generated asset follows.
// ─────────────────────────────────────────────────────────────────────────────
export const PALETTE = {
  deepPurple: "#30105F",
  royalViolet: "#6420C8",
  electricPurple: "#8B20F5",
  hotPink: "#F018A8",
  magenta: "#D600E8",
  electricBlue: "#165BFF",
  cyan: "#08C9F2",
  darkNavy: "#17132F",
  white: "#FFFFFF",
  lightBg: "#FAF8FF",
  softLavender: "#F0E8FF",
};

// ─────────────────────────────────────────────────────────────────────────────
// Symbol geometry — measured from docs/brand/reference/ orbital Q artwork.
//
// Reference proportions (mapped onto the 512 grid at 0.465 px→unit):
//   ring outer Ø 332 (Ro 166), band 38, planet fills the ring opening (r 128),
//   bolt ≈ 85% of the planet Ø (chunky 6-point zigzag), thin orbit band (26)
//   tilted ≈ −21° with dark tick dashes where it crosses the ring, a wide
//   flat Q-tail at ≈ 48°, and three fat convex sparkles at the upper right.
// ─────────────────────────────────────────────────────────────────────────────

const RC = { x: 222, y: 248 }; // ring centre
const RING_OUTER = 166;
const RING_BAND = 38;
const RING_R = RING_OUTER - RING_BAND / 2; // 147 stroke centre
const PLANET_R = RING_OUTER - RING_BAND; // 128 — fills the opening
const BOLT_D = "M 244 149 L 183 251 L 220 257 L 207 331 L 305 233 L 266 240 Z";
const TAIL = { x1: 340, y1: 330, x2: 437, y2: 439, w: 70 };
const ORBIT = { cx: 238, cy: 278, rx: 237, ry: 97, rot: -20.6, band: 26 };
const SPARKS = [
  [442, 40, 33], // large
  [384, 81, 22], // medium
  [420, 110, 16], // small
];

const RING_GRADIENT = `
    <linearGradient id="qk-ring" x1="0" y1="0.32" x2="1" y2="0.18">
      <stop offset="0" stop-color="#F230B0"/>
      <stop offset="0.16" stop-color="#C418C8"/>
      <stop offset="0.4" stop-color="#8B20F5"/>
      <stop offset="0.62" stop-color="#4A48F0"/>
      <stop offset="0.82" stop-color="#1E7BFF"/>
      <stop offset="1" stop-color="#08C9F2"/>
    </linearGradient>`;

const ORBIT_GRADIENT = `
    <linearGradient id="qk-orbit" x1="0" y1="0.5" x2="1" y2="0.35">
      <stop offset="0" stop-color="#D600E8"/>
      <stop offset="0.35" stop-color="#8B20F5"/>
      <stop offset="0.7" stop-color="#2E6BFF"/>
      <stop offset="1" stop-color="#08C9F2"/>
    </linearGradient>`;

const BOLT_GRADIENT = `
    <linearGradient id="qk-bolt" x1="0.15" y1="0" x2="0.75" y2="1">
      <stop offset="0" stop-color="#8B3BD8"/>
      <stop offset="0.55" stop-color="#3E6BEE"/>
      <stop offset="1" stop-color="#2E8FF0"/>
    </linearGradient>`;

const SPARK_GRADIENT = `
    <linearGradient id="qk-spark" x1="0.75" y1="0" x2="0.2" y2="1">
      <stop offset="0" stop-color="#E840C0"/>
      <stop offset="0.55" stop-color="#A932D8"/>
      <stop offset="1" stop-color="#7B20C8"/>
    </linearGradient>`;

const PLANET_GRADIENT = `
    <radialGradient id="qk-planet" cx="0.42" cy="0.32" r="1">
      <stop offset="0" stop-color="#171238"/>
      <stop offset="0.6" stop-color="#100C2C"/>
      <stop offset="1" stop-color="#0B0820"/>
    </radialGradient>`;

const TAIL_GRADIENT = `
    <linearGradient id="qk-tail" x1="0" y1="0" x2="0.85" y2="1">
      <stop offset="0" stop-color="#6A28D0"/>
      <stop offset="1" stop-color="#5D5AF0"/>
    </linearGradient>`;

// ─────────────────────────────────────────────────────────────────────────────
// Symbol artwork.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fat 4-point star (wide-based points, sides bowing gently inward) as in the
 * reference artwork — not a thin concave sparkle and not a diamond.
 */
function star(cx, cy, r) {
  const c = 0.38 * r; // inward bow (0.5 = straight chord, > 0.5 = diamond)
  return (
    `M ${cx} ${cy - r} ` +
    `Q ${cx + c} ${cy - c} ${cx + r} ${cy} ` +
    `Q ${cx + c} ${cy + c} ${cx} ${cy + r} ` +
    `Q ${cx - c} ${cy + c} ${cx - r} ${cy} ` +
    `Q ${cx - c} ${cy - c} ${cx} ${cy - r} Z`
  );
}

/** Deterministic speckle field for the planet surface. */
function speckles() {
  const dots = [
    [168, 196, 3.2],
    [252, 172, 2.4],
    [196, 152, 2.0],
    [286, 214, 2.8],
    [152, 240, 2.2],
    [240, 300, 3.0],
    [186, 318, 2.2],
    [282, 276, 2.0],
    [136, 208, 1.8],
    [222, 146, 1.6],
    [302, 250, 1.8],
    [164, 288, 2.4],
    [268, 320, 2.0],
    [128, 262, 1.6],
  ];
  const stars = [
    [146, 168, 7],
    [292, 186, 5.5],
    [214, 332, 6],
    [300, 300, 4.5],
    [122, 230, 4],
  ];
  let out = "";
  for (const [x, y, r] of dots) {
    out += `<circle cx="${x}" cy="${y}" r="${r}" fill="#8A7BD8" opacity="0.32"/>`;
  }
  for (const [x, y, r] of stars) {
    out += `<path d="${star(x, y, r)}" fill="#7E6BD0" opacity="0.3"/>`;
  }
  return out;
}

/**
 * Dark tick dashes along the orbit's front arc where it crosses the ring /
 * planet footprint — the signature texture of the reference orbit band.
 */
function orbitDashes(ink) {
  if (ink) return "";
  const steps = 260;
  let out = "";
  let since = 0;
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI; // front arc 0→π = lower half on screen
    const ex = ORBIT.rx * Math.cos(t);
    const ey = ORBIT.ry * Math.sin(t);
    const rad = (ORBIT.rot * Math.PI) / 180;
    const x = ORBIT.cx + ex * Math.cos(rad) - ey * Math.sin(rad);
    const y = ORBIT.cy + ex * Math.sin(rad) + ey * Math.cos(rad);
    const d = Math.hypot(x - RC.x, y - RC.y);
    if (d > RING_OUTER + 12) {
      since = 0;
      continue;
    }
    // tangent direction for dash orientation
    const dt = 0.01;
    const ex2 = ORBIT.rx * Math.cos(t + dt);
    const ey2 = ORBIT.ry * Math.sin(t + dt);
    const x2 = ORBIT.cx + ex2 * Math.cos(rad) - ey2 * Math.sin(rad);
    const y2 = ORBIT.cy + ex2 * Math.sin(rad) + ey2 * Math.cos(rad);
    const angle = (Math.atan2(y2 - y, x2 - x) * 180) / Math.PI;
    since += 1;
    if (since % 7 !== 2) continue;
    out += `<rect x="${(x - 1.9).toFixed(1)}" y="${(y - ORBIT.band / 2).toFixed(1)}" width="3.8" height="${ORBIT.band}" rx="1.2" fill="#0B0820" opacity="0.9" transform="rotate(${angle.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})"/>`;
  }
  return out;
}

/**
 * Wide flat Q-tail: parallel-sided wedge with rounded corners at the far end
 * (the near end tucks under the ring). Matches the reference tail shape.
 */
function tailPath() {
  const { x1, y1, x2, y2, w } = TAIL;
  const len = Math.hypot(x2 - x1, y2 - y1);
  const ux = (x2 - x1) / len;
  const uy = (y2 - y1) / len;
  const px = -uy;
  const py = ux;
  const hw = w / 2;
  const r = 26;
  const P1 = [x1 + px * hw, y1 + py * hw];
  const P2 = [x2 + px * hw, y2 + py * hw];
  const P3 = [x2 - px * hw, y2 - py * hw];
  const P4 = [x1 - px * hw, y1 - py * hw];
  const E2 = [P2[0] - ux * r, P2[1] - uy * r];
  const X2 = [P2[0] - px * r, P2[1] - py * r];
  const E3 = [P3[0] + px * r, P3[1] + py * r];
  const X3 = [P3[0] - ux * r, P3[1] - uy * r];
  return (
    `M ${P1[0].toFixed(1)} ${P1[1].toFixed(1)} ` +
    `L ${E2[0].toFixed(1)} ${E2[1].toFixed(1)} ` +
    `Q ${P2[0].toFixed(1)} ${P2[1].toFixed(1)} ${X2[0].toFixed(1)} ${X2[1].toFixed(1)} ` +
    `L ${E3[0].toFixed(1)} ${E3[1].toFixed(1)} ` +
    `Q ${P3[0].toFixed(1)} ${P3[1].toFixed(1)} ${X3[0].toFixed(1)} ${X3[1].toFixed(1)} ` +
    `L ${P4[0].toFixed(1)} ${P4[1].toFixed(1)} Z`
  );
}

/**
 * Full-colour symbol body on the 512 grid.
 * `simplified` drops speckles + sparkles + dashes (favicon-size clarity).
 */
function symbolBody({ simplified = false, mono = null, white = false } = {}) {
  const ink = mono ?? (white ? PALETTE.white : null);
  const ringStroke = ink
    ? `stroke="${ink}"`
    : 'stroke="url(#qk-ring)" stroke-linecap="round"';
  const orbitStroke = ink ? `stroke="${ink}"` : 'stroke="url(#qk-orbit)"';
  const planetFill = ink ? `fill="${ink}"` : 'fill="url(#qk-planet)"';
  const tailStroke = ink ? `stroke="${ink}"` : 'stroke="url(#qk-tail)"';

  // One-colour variants knock the bolt out of the planet disc (evenodd), so a
  // white/mono logo stays readable as a single ink.
  const discAndBolt =
    white || mono
      ? `<path fill-rule="evenodd" d="M ${RC.x} ${RC.y - PLANET_R} A ${PLANET_R} ${PLANET_R} 0 1 0 ${RC.x} ${RC.y + PLANET_R} A ${PLANET_R} ${PLANET_R} 0 1 0 ${RC.x} ${RC.y - PLANET_R} Z ${BOLT_D}" ${planetFill}/>`
      : `<circle cx="${RC.x}" cy="${RC.y}" r="${PLANET_R}" ${planetFill}/>`;

  const backArc = `M ${ORBIT.cx - ORBIT.rx} ${ORBIT.cy} A ${ORBIT.rx} ${ORBIT.ry} 0 0 1 ${ORBIT.cx + ORBIT.rx} ${ORBIT.cy}`;
  const frontArc = `M ${ORBIT.cx - ORBIT.rx} ${ORBIT.cy} A ${ORBIT.rx} ${ORBIT.ry} 0 0 0 ${ORBIT.cx + ORBIT.rx} ${ORBIT.cy}`;

  return `
    <!-- orbit: back half (behind planet) -->
    <g transform="rotate(${ORBIT.rot} ${ORBIT.cx} ${ORBIT.cy})">
      <path d="${backArc}" fill="none" ${orbitStroke} stroke-width="${ORBIT.band}" stroke-linecap="round"/>
    </g>
    <!-- Q tail (wide flat wedge, rounded far end; near end tucks under the ring) -->
    <path d="${tailPath()}" ${tailStroke.includes("url") ? 'fill="url(#qk-tail)"' : tailStroke.replace("stroke=", "fill=")}/>
    <!-- main orbital ring -->
    <circle cx="${RC.x}" cy="${RC.y}" r="${RING_R}" fill="none" ${ringStroke} stroke-width="${RING_BAND}"/>
    <!-- planet disc (fills the ring opening edge to edge) -->
    ${discAndBolt}
    ${simplified || white || mono ? "" : speckles()}
    ${white || mono ? "" : `<path d="${BOLT_D}" transform="translate(2 6)" fill="#0B0820" opacity="0.4"/>`}
    <!-- lightning bolt (colour variants; one-colour variants use the knockout) -->
    ${white || mono ? "" : `<path d="${BOLT_D}" ${ink ? `fill="${ink}"` : 'fill="url(#qk-bolt)"'}/>`}
    <!-- orbit: front half (over planet) -->
    <g transform="rotate(${ORBIT.rot} ${ORBIT.cx} ${ORBIT.cy})">
      <path d="${frontArc}" fill="none" ${orbitStroke} stroke-width="${ORBIT.band}" stroke-linecap="round"/>
      ${simplified ? "" : orbitDashes(ink)}
    </g>
    <!-- sparkles -->
    ${simplified ? "" : SPARKS.map(([x, y, r]) => `<path d="${star(x, y, r)}" ${ink ? `fill="${ink}"` : 'fill="url(#qk-spark)"'}/>`).join("\n    ")}
    ${white || mono || simplified ? "" : `<path d="M ${RC.x - RING_R * 0.92} ${RC.y - RING_R * 0.55} A ${RING_R} ${RING_R} 0 0 1 ${RC.x + RING_R * 0.05} ${RC.y - RING_R * 0.995}" fill="none" stroke="#FFFFFF" stroke-width="7" stroke-linecap="round" opacity="0.15"/>`}`;
}

/** Extra gradient defs needed by the colour symbol. */
function symbolDefs() {
  return `${RING_GRADIENT}${ORBIT_GRADIENT}${BOLT_GRADIENT}${SPARK_GRADIENT}${PLANET_GRADIENT}${TAIL_GRADIENT}`;
}

function symbolSvg({ simplified = false, mono = null, white = false } = {}) {
  const defs = mono || white ? "" : symbolDefs();
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="QUICKKIT symbol">
  <defs>${defs}</defs>
  ${symbolBody({ simplified, mono, white })}
</svg>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Favicon / app-icon badge: rounded square with the simplified mark.
// ─────────────────────────────────────────────────────────────────────────────
function faviconSvg({ rounded = true, white = true } = {}) {
  const rx = rounded ? 112 : 0;
  const mark = white
    ? symbolBody({ simplified: true, white: true })
    : symbolBody({ simplified: true });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="QUICKKIT app icon">
  <defs>
    <linearGradient id="qk-badge" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${PALETTE.deepPurple}"/>
      <stop offset="0.52" stop-color="${PALETTE.royalViolet}"/>
      <stop offset="1" stop-color="${PALETTE.electricPurple}"/>
    </linearGradient>
    ${white ? "" : symbolDefs()}
  </defs>
  <rect width="512" height="512" rx="${rx}" fill="url(#qk-badge)"/>
  <g transform="translate(256 256) scale(0.82) translate(-222 -248)">
    ${mark}
  </g>
</svg>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Wordmark: real glyph outlines (Montserrat Black Italic), reference layout.
// ─────────────────────────────────────────────────────────────────────────────

function textPaths(font, text, x, y, size) {
  const path = font.getPath(text, x, y, size);
  return path.toPathData(2);
}

function advanceWidth(font, text, size) {
  return font.getAdvanceWidth(text, size);
}

/**
 * Builds the wordmark block exactly as the wordmark reference:
 * QUICKKIT (two colour groups), the two sparkles above KIT (small violet left,
 * large pink right), the italic tagline and the purple→pink upward crescent
 * swoosh. Returns { inner, defs, width, height, top }.
 */
function wordmarkBlock({ withTagline = true, colors = "brand", scale = 1 }) {
  const heavy = loadFont("900Black_Italic");
  const tagFont = loadFont("600SemiBold_Italic");
  const size = 128 * scale;
  const tracking = -2 * scale;

  const quickText = "QUICK";
  const kitText = "KIT";
  const quickW = advanceWidth(heavy, quickText, size) + tracking;
  const kitW = advanceWidth(heavy, kitText, size);
  const totalW = quickW + kitW;

  const capY = 128 * scale; // baseline of the wordmark
  const quickD = textPaths(heavy, quickText, 0, capY, size);
  const kitPath = textPaths(heavy, kitText, quickW, capY, size);

  let quickFill;
  let kitFill;
  if (colors === "white") {
    quickFill = PALETTE.white;
    kitFill = PALETTE.white;
  } else if (colors === "mono") {
    quickFill = "#000000";
    kitFill = "#000000";
  } else if (colors === "dark") {
    quickFill = PALETTE.darkNavy;
    kitFill = PALETTE.darkNavy;
  } else {
    quickFill = "url(#qk-wm-quick)";
    kitFill = "url(#qk-wm-kit)";
  }

  const defs =
    colors === "brand"
      ? `<defs>
      <linearGradient id="qk-wm-quick" x1="0" y1="0" x2="1" y2="0.8">
        <stop offset="0" stop-color="#2E0B60"/>
        <stop offset="1" stop-color="#5E22AC"/>
      </linearGradient>
      <linearGradient id="qk-wm-kit" x1="0.1" y1="0" x2="0.6" y2="1">
        <stop offset="0" stop-color="#F055B8"/>
        <stop offset="1" stop-color="#C4157F"/>
      </linearGradient>
      <linearGradient id="qk-wm-spark-a" x1="0.8" y1="0" x2="0.2" y2="1">
        <stop offset="0" stop-color="#F060C8"/>
        <stop offset="1" stop-color="#D02090"/>
      </linearGradient>
      <linearGradient id="qk-wm-spark-b" x1="0.8" y1="0" x2="0.2" y2="1">
        <stop offset="0" stop-color="#8B4BE8"/>
        <stop offset="1" stop-color="#6420C8"/>
      </linearGradient>
      <linearGradient id="qk-wm-swoosh" x1="0" y1="0.5" x2="1" y2="0.4">
        <stop offset="0" stop-color="#7B20C8"/>
        <stop offset="0.55" stop-color="#B62BB4"/>
        <stop offset="1" stop-color="#E83090"/>
      </linearGradient>
    </defs>`
      : "";

  let inner = `<path d="${quickD}" fill="${quickFill}"/><path d="${kitPath}" fill="${kitFill}"/>`;

  // Two sparkles above KIT — small violet left, large pink right (reference).
  const sparkInk = colors === "brand" ? null : kitFill;
  const s1x = totalW * 0.83;
  const s1y = -38 * scale;
  const s2x = totalW * 0.905;
  const s2y = -42 * scale;
  inner +=
    `<path d="${star(s1x, s1y, 20 * scale)}" ${sparkInk ? `fill="${sparkInk}"` : 'fill="url(#qk-wm-spark-b)"'}/>` +
    `<path d="${star(s2x, s2y, 40 * scale)}" ${sparkInk ? `fill="${sparkInk}"` : 'fill="url(#qk-wm-spark-a)"'}/>`;

  let height = capY + 24 * scale;
  let top = -95 * scale;

  if (withTagline) {
    const tagSize = 44 * scale;
    const tagText = "Small tasks. Quick solutions.";
    const tagW = advanceWidth(tagFont, tagText, tagSize);
    const tagX = (totalW - tagW) / 2;
    const tagY = capY + 72 * scale;
    const tagD = textPaths(tagFont, tagText, tagX, tagY, tagSize);
    const tagFill =
      colors === "white"
        ? PALETTE.white
        : colors === "mono"
          ? "#000000"
          : colors === "dark"
            ? PALETTE.darkNavy
            : "#2E2260";
    inner += `<path d="${tagD}" fill="${tagFill}"/>`;

    // Purple → pink crescent swoosh — convex UP as in the reference, sitting
    // below the tagline: left tip low, top edge arcing upward, right tip
    // higher, belly dipping below (thickest ≈ 55% along).
    const L = [totalW * 0.11, capY + 106 * scale];
    const R = [totalW * 0.73, capY + 91 * scale];
    const swooshFill = colors === "brand" ? "url(#qk-wm-swoosh)" : tagFill;
    inner += `<path d="M ${L[0]} ${L[1]} C ${totalW * 0.22} ${capY + 80 * scale}, ${totalW * 0.55} ${capY + 78 * scale}, ${R[0]} ${R[1]} C ${totalW * 0.52} ${capY + 102 * scale}, ${totalW * 0.28} ${capY + 108 * scale}, ${L[0]} ${L[1]} Z" fill="${swooshFill}"/>`;
    height = capY + 126 * scale;
  }

  return { inner, defs, width: totalW, height, top };
}

function wordmarkSvg(opts) {
  const { inner, defs, width, height, top } = wordmarkBlock(opts);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 ${top} ${Math.ceil(width) + 8} ${Math.ceil(height - top)}" role="img" aria-label="QUICKKIT — Small tasks. Quick solutions.">
  ${defs}
  ${inner}
</svg>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Lockups.
// ─────────────────────────────────────────────────────────────────────────────

function horizontalSvg({ variant = "brand" } = {}) {
  const mono =
    variant === "mono"
      ? "#000000"
      : variant === "dark"
        ? PALETTE.darkNavy
        : null;
  const white = variant === "white";
  const wm = wordmarkBlock({
    withTagline: true,
    colors: variant === "brand" ? "brand" : variant,
    scale: 1,
  });
  const sym = symbolBody({ simplified: false, mono, white });
  const symSize = 300;
  const gap = 40;
  const wmX = symSize + gap;
  const wmH = wm.height - wm.top;
  const width = wmX + wm.width + 30;
  const height = Math.max(symSize, wmH) + 20;
  const defs = (variant === "brand" ? symbolDefs() : "") + wm.defs;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${Math.ceil(width)} ${Math.ceil(height)}" role="img" aria-label="QUICKKIT — Small tasks. Quick solutions.">
  <defs>${defs}</defs>
  <g transform="translate(0 ${(height - symSize) / 2}) scale(${symSize / 512})">
    ${sym}
  </g>
  <g transform="translate(${wmX} ${(height - wmH) / 2 - wm.top})">
    ${wm.inner}
  </g>
</svg>`;
}

function verticalSvg({ variant = "brand" } = {}) {
  const mono =
    variant === "mono"
      ? "#000000"
      : variant === "dark"
        ? PALETTE.darkNavy
        : null;
  const white = variant === "white";
  const wm = wordmarkBlock({
    withTagline: true,
    colors: variant === "brand" ? "brand" : variant,
    scale: 1,
  });
  const sym = symbolBody({ simplified: false, mono, white });
  const symSize = 330;
  const wmH = wm.height - wm.top;
  const width = Math.max(symSize, wm.width) + 48;
  const gap = 26;
  const height = symSize + gap + wmH + 20;
  const defs = (variant === "brand" ? symbolDefs() : "") + wm.defs;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${Math.ceil(width)} ${Math.ceil(height)}" role="img" aria-label="QUICKKIT — Small tasks. Quick solutions.">
  <defs>${defs}</defs>
  <g transform="translate(${(width - symSize) / 2} 0) scale(${symSize / 512})">
    ${sym}
  </g>
  <g transform="translate(${(width - wm.width) / 2} ${symSize + gap - wm.top})">
    ${wm.inner}
  </g>
</svg>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Social / OG card (1200 × 630).
// ─────────────────────────────────────────────────────────────────────────────
function ogSvg() {
  const symSize = 250;
  const gap = 38;
  const targetLockupW = 880;
  const probe = wordmarkBlock({ withTagline: true, colors: "brand", scale: 1 });
  const wmScale = Math.min(1, (targetLockupW - symSize - gap) / probe.width);
  const wm = wordmarkBlock({
    withTagline: true,
    colors: "brand",
    scale: wmScale,
  });
  const sym = symbolBody({ simplified: false });
  const wmH = wm.height - wm.top;
  const lockupW = symSize + gap + wm.width;
  const lockupX = (1200 - lockupW) / 2;
  const boxH = Math.max(symSize, wmH);
  const lockupY = (630 - boxH) / 2 - 20;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" role="img" aria-label="QUICKKIT — Small tasks. Quick solutions.">
  <defs>
    ${symbolDefs()}
    ${wm.defs}
    <linearGradient id="qk-og-bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${PALETTE.lightBg}"/>
      <stop offset="1" stop-color="${PALETTE.softLavender}"/>
    </linearGradient>
    <radialGradient id="qk-og-glow" cx="0.85" cy="0.12" r="0.9">
      <stop offset="0" stop-color="${PALETTE.electricPurple}" stop-opacity="0.16"/>
      <stop offset="1" stop-color="${PALETTE.electricPurple}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#qk-og-bg)"/>
  <rect width="1200" height="630" fill="url(#qk-og-glow)"/>
  <g opacity="0.5">
    <circle cx="960" cy="140" r="150" fill="none" stroke="${PALETTE.royalViolet}" stroke-width="2" stroke-dasharray="10 14"/>
  </g>
  <g transform="translate(${lockupX} ${lockupY + (boxH - symSize) / 2}) scale(${symSize / 512})">
    ${sym}
  </g>
  <g transform="translate(${lockupX + symSize + gap} ${lockupY + (boxH - wmH) / 2 - wm.top})">
    ${wm.inner}
  </g>
  <path d="M 120 566 Q 600 622 1080 566" fill="none" stroke="url(#qk-wm-swoosh)" stroke-width="10" stroke-linecap="round" opacity="0.75"/>
</svg>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Rasterisation + ICO.
// ─────────────────────────────────────────────────────────────────────────────

function renderPng(svg, width, { background = null } = {}) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: width },
    background,
  });
  return resvg.render().asPng();
}

function writePng(rel, svg, width, opts) {
  const out = path.join(repoRoot, rel);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, renderPng(svg, width, opts));
  console.log(`✓ ${rel}`);
}

/** ICO container with PNG-compressed entries (supported by all modern OSes). */
function buildIco(pngsBySize) {
  const entries = [...pngsBySize.entries()].sort((a, b) => a[0] - b[0]);
  const headerSize = 6 + entries.length * 16;
  let offset = headerSize;
  const headers = [];
  const blobs = [];
  for (const [size, png] of entries) {
    const dim = size >= 256 ? 0 : size;
    const head = Buffer.from([dim, dim, 0, 0, 1, 0, 32, 0]);
    // Entry directory record: 8-byte prefix above + size(4) + offset(4) = 16.
    const meta = Buffer.alloc(8);
    meta.writeUInt32LE(png.length, 0);
    meta.writeUInt32LE(offset, 4);
    headers.push(Buffer.concat([head, meta]));
    blobs.push(png);
    offset += png.length;
  }
  const dir = Buffer.alloc(6);
  dir.writeUInt16LE(0, 0);
  dir.writeUInt16LE(1, 2);
  dir.writeUInt16LE(entries.length, 4);
  return Buffer.concat([dir, ...headers, ...blobs]);
}

// ─────────────────────────────────────────────────────────────────────────────
// Emit everything.
// ─────────────────────────────────────────────────────────────────────────────

function write(rel, content) {
  const out = path.join(repoRoot, rel);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, content);
  console.log(`✓ ${rel}`);
}

function main() {
  // SVG vector set
  write("public/brand/logo-symbol.svg", symbolSvg());
  write(
    "public/brand/logo-wordmark.svg",
    wordmarkSvg({ withTagline: true, colors: "brand" }),
  );
  write(
    "public/brand/logo-horizontal.svg",
    horizontalSvg({ variant: "brand" }),
  );
  write("public/brand/logo-vertical.svg", verticalSvg({ variant: "brand" }));
  write("public/brand/logo-white.svg", horizontalSvg({ variant: "white" }));
  write("public/brand/logo-dark.svg", horizontalSvg({ variant: "dark" }));
  write("public/brand/logo-mono.svg", horizontalSvg({ variant: "mono" }));
  write(
    "public/brand/logo-mono-white.svg",
    horizontalSvg({ variant: "white" }).replace(
      /aria-label="[^"]*"/,
      'aria-label="QUICKKIT logo (monochrome white)"',
    ),
  );
  write("public/brand/favicon.svg", faviconSvg());

  // App icon routes
  write("app/icon.svg", faviconSvg());
  write("public/icon.svg", faviconSvg());

  // Raster set
  const favSvg = faviconSvg();
  const symSvg = symbolSvg();
  writePng("public/brand/favicon-16.png", favSvg, 16);
  writePng("public/brand/favicon-32.png", favSvg, 32);
  writePng("public/brand/favicon-48.png", favSvg, 48);
  writePng("public/brand/favicon-192.png", favSvg, 192);
  writePng("public/brand/favicon-512.png", favSvg, 512);
  writePng("public/brand/icon-192.png", symSvg, 192);
  writePng("public/brand/icon-512.png", symSvg, 512);
  writePng(
    "public/brand/icon-512-maskable.png",
    faviconSvg({ rounded: false }),
    512,
  );
  writePng(
    "public/brand/apple-touch-icon.png",
    faviconSvg({ rounded: false }),
    180,
  );
  writePng("app/apple-icon.png", faviconSvg({ rounded: false }), 180);
  writePng("public/brand/logo-symbol.png", symSvg, 512);
  writePng("public/brand/logo-horizontal.png", horizontalSvg(), 1400);
  writePng("public/brand/logo-vertical.png", verticalSvg(), 1000);
  writePng("public/brand/og-image.png", ogSvg(), 1200);

  // Classic multi-size favicon
  const ico = buildIco(
    new Map([
      [16, renderPng(favSvg, 16)],
      [32, renderPng(favSvg, 32)],
      [48, renderPng(favSvg, 48)],
    ]),
  );
  fs.writeFileSync(path.join(repoRoot, "app/favicon.ico"), ico);
  console.log("✓ app/favicon.ico");

  console.log("\nAll brand assets generated.");
}

main();
