/**
 * QUICKKIT brand asset generator.
 *
 * Rebuilds every official logo variant in `public/brand/` plus the app icons
 * (`app/icon.svg`, `public/icon.svg`, `app/apple-icon.png`, `app/favicon.ico`)
 * from two sources of truth:
 *
 *   1. The symbol geometry defined in `symbolBody()` below (hand-tuned vector
 *      art: orbital ring, planet disc, lightning bolt, orbit arc, sparkles).
 *   2. Real glyph outlines extracted from Montserrat Black Italic /
 *      SemiBold Italic, so the QUICKKIT wordmark is genuine vector letterforms
 *      and never depends on an installed font at render time.
 *
 * The wordmark colouring follows docs/BRAND_GUIDELINES.md:
 * QUICK in Deep Purple → Royal Violet, KIT in Hot Pink → Magenta.
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

const RING_GRADIENT = `
    <linearGradient id="qk-ring" x1="0.12" y1="0" x2="0.88" y2="1">
      <stop offset="0" stop-color="${PALETTE.hotPink}"/>
      <stop offset="0.24" stop-color="${PALETTE.magenta}"/>
      <stop offset="0.54" stop-color="${PALETTE.electricPurple}"/>
      <stop offset="0.8" stop-color="${PALETTE.electricBlue}"/>
      <stop offset="1" stop-color="${PALETTE.cyan}"/>
    </linearGradient>`;

const ORBIT_GRADIENT = `
    <linearGradient id="qk-orbit" x1="0" y1="0.5" x2="1" y2="0.5">
      <stop offset="0" stop-color="${PALETTE.magenta}"/>
      <stop offset="0.42" stop-color="${PALETTE.electricPurple}"/>
      <stop offset="0.75" stop-color="${PALETTE.electricBlue}"/>
      <stop offset="1" stop-color="${PALETTE.cyan}"/>
    </linearGradient>`;

const BOLT_GRADIENT = `
    <linearGradient id="qk-bolt" x1="0.15" y1="0" x2="0.85" y2="1">
      <stop offset="0" stop-color="${PALETTE.electricPurple}"/>
      <stop offset="0.55" stop-color="${PALETTE.electricBlue}"/>
      <stop offset="1" stop-color="${PALETTE.cyan}"/>
    </linearGradient>`;

const SPARK_GRADIENT = `
    <linearGradient id="qk-spark" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${PALETTE.electricPurple}"/>
      <stop offset="1" stop-color="${PALETTE.royalViolet}"/>
    </linearGradient>`;

const PLANET_GRADIENT = `
    <radialGradient id="qk-planet" cx="0.36" cy="0.3" r="0.95">
      <stop offset="0" stop-color="#2B1752"/>
      <stop offset="0.55" stop-color="#1A0F38"/>
      <stop offset="1" stop-color="#0E0822"/>
    </radialGradient>`;

// ─────────────────────────────────────────────────────────────────────────────
// Symbol geometry (512 × 512 design grid).
// ─────────────────────────────────────────────────────────────────────────────

const BOLT_D = "M 288 152 L 206 264 L 247 264 L 231 344 L 310 228 L 268 228 Z";

/** Four-point sparkle star, concave sides. */
function sparkle(cx, cy, r) {
  const w = r * 0.22;
  return (
    `M ${cx} ${cy - r} ` +
    `Q ${cx + w} ${cy - w} ${cx + r} ${cy} ` +
    `Q ${cx + w} ${cy + w} ${cx} ${cy + r} ` +
    `Q ${cx - w} ${cy + w} ${cx - r} ${cy} ` +
    `Q ${cx - w} ${cy - w} ${cx} ${cy - r} Z`
  );
}

/** Deterministic speckle field for the planet surface. */
function speckles() {
  const dots = [
    [206, 196, 3.4],
    [290, 182, 2.6],
    [232, 160, 2.2],
    [318, 226, 3.0],
    [188, 252, 2.4],
    [272, 300, 3.2],
    [222, 316, 2.4],
    [306, 282, 2.2],
    [172, 214, 2.0],
    [252, 176, 1.8],
    [330, 258, 2.0],
    [196, 292, 2.6],
  ];
  const stars = [
    [180, 178, 8],
    [316, 196, 6.5],
    [244, 332, 7],
    [326, 306, 5.5],
  ];
  let out = "";
  for (const [x, y, r] of dots) {
    out += `<circle cx="${x}" cy="${y}" r="${r}" fill="#FFFFFF" opacity="0.16"/>`;
  }
  for (const [x, y, r] of stars) {
    out += `<path d="${sparkle(x, y, r)}" fill="#FFFFFF" opacity="0.14"/>`;
  }
  return out;
}

/**
 * Full-colour symbol body on the 512 grid.
 * `simplified` drops speckles + tiny sparkles (favicon-size clarity).
 */
function symbolBody({ simplified = false, mono = null, white = false } = {}) {
  const ink = mono ?? (white ? PALETTE.white : null);
  const ringStroke = ink ? `stroke="${ink}"` : 'stroke="url(#qk-ring)"';
  const orbitStroke = ink ? `stroke="${ink}"` : 'stroke="url(#qk-orbit)"';
  const boltFill = ink ? `fill="${ink}"` : 'fill="url(#qk-bolt)"';
  const sparkFill = ink ? `fill="${ink}"` : 'fill="url(#qk-spark)"';
  const planetFill = ink ? `fill="${ink}"` : 'fill="url(#qk-planet)"';
  const boltHole =
    white || mono
      ? ""
      : `<path d="${BOLT_D}" transform="translate(2 7)" fill="#0B0620" opacity="0.4"/>`;

  // One-colour variants knock the bolt out of the planet disc (evenodd), so a
  // white/mono logo stays readable as a single ink.
  const discAndBolt =
    white || mono
      ? `<path fill-rule="evenodd" d="M 252 134 A 114 114 0 1 0 252 362 A 114 114 0 1 0 252 134 Z ${BOLT_D}" ${planetFill}/>`
      : `<circle cx="252" cy="248" r="114" ${planetFill}/>`;

  const tailStroke = ink ? `stroke="${ink}"` : 'stroke="url(#qk-tail)"';

  return `
    <!-- Q tail -->
    <path d="M 341 345 L 415 419" fill="none" ${tailStroke} stroke-width="44" stroke-linecap="round"/>
    <!-- orbit: back half (behind planet) -->
    <g transform="rotate(-22 256 288)">
      <path d="M 68 288 A 188 62 0 0 1 444 288" fill="none" ${orbitStroke} stroke-width="24" stroke-linecap="round"/>
    </g>
    <!-- main orbital ring -->
    <circle cx="252" cy="248" r="154" fill="none" ${ringStroke} stroke-width="42"/>
    <!-- planet disc -->
    ${discAndBolt}
    ${simplified || white || mono ? "" : speckles()}
    ${boltHole}
    <!-- lightning bolt (colour variants; one-colour variants use the knockout) -->
    ${white || mono ? "" : `<path d="${BOLT_D}" ${boltFill}/>`}
    <!-- orbit: front half (over planet) -->
    <g transform="rotate(-22 256 288)">
      <path d="M 68 288 A 188 62 0 0 0 444 288" fill="none" ${orbitStroke} stroke-width="24" stroke-linecap="round"/>
    </g>
    <!-- sparkles -->
    <path d="${sparkle(426, 92, 50)}" ${sparkFill}/>
    <path d="${sparkle(372, 132, 25)}" ${sparkFill}/>
    <path d="${sparkle(438, 172, 19)}" ${sparkFill}/>
    ${white || mono ? "" : `<path d="M 112 183 A 154 154 0 0 1 292 99" fill="none" stroke="#FFFFFF" stroke-width="9" stroke-linecap="round" opacity="0.16"/>`}`;
}

/** Extra gradient defs needed by the colour symbol. */
function symbolDefs() {
  return `${RING_GRADIENT}${ORBIT_GRADIENT}${BOLT_GRADIENT}${SPARK_GRADIENT}${PLANET_GRADIENT}
    <linearGradient id="qk-tail" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${PALETTE.electricPurple}"/>
      <stop offset="1" stop-color="${PALETTE.electricBlue}"/>
    </linearGradient>`;
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
  <g transform="translate(256 256) scale(0.82) translate(-256 -256)">
    ${mark}
  </g>
</svg>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Wordmark: real glyph outlines (Montserrat Black Italic).
// ─────────────────────────────────────────────────────────────────────────────

function textPaths(font, text, x, y, size) {
  const path = font.getPath(text, x, y, size);
  return path.toPathData(2);
}

function advanceWidth(font, text, size) {
  return font.getAdvanceWidth(text, size);
}

/**
 * Builds the wordmark block: QUICKKIT (two colour groups), tagline and the
 * purple→pink swoosh. Returns { inner, width, height } on a top-left origin.
 */
function wordmarkBlock({ withTagline = true, colors = "brand", scale = 1 }) {
  const heavy = loadFont("900Black_Italic");
  const tagFont = loadFont("500Medium_Italic");
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
      <linearGradient id="qk-wm-quick" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${PALETTE.deepPurple}"/>
        <stop offset="1" stop-color="${PALETTE.royalViolet}"/>
      </linearGradient>
      <linearGradient id="qk-wm-kit" x1="0" y1="0" x2="1" y2="0.9">
        <stop offset="0" stop-color="${PALETTE.hotPink}"/>
        <stop offset="1" stop-color="${PALETTE.magenta}"/>
      </linearGradient>
      <linearGradient id="qk-wm-swoosh" x1="0" y1="0.5" x2="1" y2="0.5">
        <stop offset="0" stop-color="${PALETTE.royalViolet}"/>
        <stop offset="1" stop-color="${PALETTE.hotPink}"/>
      </linearGradient>
    </defs>`
      : "";

  let inner = `<path d="${quickD}" fill="${quickFill}"/><path d="${kitPath}" fill="${kitFill}"/>`;
  let height = capY + 22 * scale;

  if (withTagline) {
    const tagSize = 39 * scale;
    const tagText = "Small tasks. Quick solutions.";
    const tagW = advanceWidth(tagFont, tagText, tagSize);
    const tagX = (totalW - tagW) / 2;
    const tagY = capY + 66 * scale;
    const tagD = textPaths(tagFont, tagText, tagX, tagY, tagSize);
    const tagFill =
      colors === "white"
        ? PALETTE.white
        : colors === "mono"
          ? "#000000"
          : colors === "dark"
            ? PALETTE.darkNavy
            : PALETTE.deepPurple;
    inner += `<path d="${tagD}" fill="${tagFill}"/>`;

    // Purple → pink crescent swoosh under the tagline.
    const sx1 = tagX + 0.02 * tagW;
    const sx2 = tagX + 0.98 * tagW;
    const sy = tagY + 18 * scale;
    const dip = 30 * scale;
    const swooshFill = colors === "brand" ? "url(#qk-wm-swoosh)" : tagFill;
    inner += `<path d="M ${sx1} ${sy} Q ${(sx1 + sx2) / 2} ${sy + dip} ${sx2} ${sy} Q ${(sx1 + sx2) / 2} ${sy + dip * 0.34} ${sx1} ${sy} Z" fill="${swooshFill}"/>`;
    height = sy + dip + 18 * scale;
  }

  return { inner, defs, width: totalW, height };
}

function wordmarkSvg(opts) {
  const { inner, defs, width, height } = wordmarkBlock(opts);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${Math.ceil(width)} ${Math.ceil(height)}" role="img" aria-label="QUICKKIT — Small tasks. Quick solutions.">
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
  const sym = symbolBody({
    simplified: false,
    mono,
    white,
  });
  const symSize = 300;
  const gap = 44;
  const wmX = symSize + gap;
  const width = wmX + wm.width + 24;
  const height = Math.max(symSize, wm.height) + 24;
  const wmY = (height - wm.height) / 2;
  const defs = (variant === "brand" ? symbolDefs() : "") + wm.defs;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${Math.ceil(width)} ${Math.ceil(height)}" role="img" aria-label="QUICKKIT — Small tasks. Quick solutions.">
  <defs>${defs}</defs>
  <g transform="translate(0 ${(height - symSize) / 2}) scale(${symSize / 512})">
    ${sym}
  </g>
  <g transform="translate(${wmX} ${wmY})">
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
  const width = Math.max(symSize, wm.width) + 48;
  const gap = 30;
  const height = symSize + gap + wm.height + 24;
  const defs = (variant === "brand" ? symbolDefs() : "") + wm.defs;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${Math.ceil(width)} ${Math.ceil(height)}" role="img" aria-label="QUICKKIT — Small tasks. Quick solutions.">
  <defs>${defs}</defs>
  <g transform="translate(${(width - symSize) / 2} 0) scale(${symSize / 512})">
    ${sym}
  </g>
  <g transform="translate(${(width - wm.width) / 2} ${symSize + gap})">
    ${wm.inner}
  </g>
</svg>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Social / OG card (1200 × 630).
// ─────────────────────────────────────────────────────────────────────────────
function ogSvg() {
  // The lockup must fit inside 1200 × 630 with margins, so the wordmark scale
  // is derived from its measured width rather than guessed.
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
  const lockupW = symSize + gap + wm.width;
  const lockupX = (1200 - lockupW) / 2;
  const lockupY = (630 - Math.max(symSize, wm.height)) / 2 - 26;
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
  <g transform="translate(${lockupX} ${lockupY + (Math.max(symSize, wm.height) - symSize) / 2}) scale(${symSize / 512})">
    ${sym}
  </g>
  <g transform="translate(${lockupX + symSize + gap} ${lockupY + (Math.max(symSize, wm.height) - wm.height) / 2})">
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
    headers.push(Buffer.from([dim, dim, 0, 0, 1, 0, 32, 0]));
    const len = png.length;
    // Entry directory record: 8-byte prefix above + size(4) + offset(4) = 16.
    const meta = Buffer.alloc(8);
    meta.writeUInt32LE(len, 0);
    meta.writeUInt32LE(offset, 4);
    headers[headers.length - 1] = Buffer.concat([
      headers[headers.length - 1],
      meta,
    ]);
    blobs.push(png);
    offset += len;
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
