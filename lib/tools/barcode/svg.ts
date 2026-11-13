/**
 * SVG serialisation.
 *
 * The output is a closed vocabulary: `<svg>`, `<title>`, `<desc>`, `<rect>`
 * and `<text>`. No `foreignObject`, no `<script>`, no event attributes, no
 * `xlink:href` — user text only ever reaches the file as escaped character
 * data inside `<text>`. That is what makes it safe to hand the same string to
 * `dangerouslySetInnerHTML`, an `<img>` data URI or a download.
 */
import type { BarcodeLayout, TextBlock } from "./layout";

/** Escape character data and attribute values. Also strips control characters. */
export function escapeXml(value: string) {
  return (
    value
      // C0 controls (except tab/newline, which are collapsed anyway) cannot
      // appear in XML 1.0 at all — dropping them keeps the file well-formed.
      .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;")
  );
}

/** Quote a font stack for an attribute value. */
function fontStack(family: string) {
  return escapeXml(family.replace(/["\\]/g, ""));
}

function textElement(block: TextBlock, family: string) {
  const attrs = [
    `x="${block.x.toFixed(2)}"`,
    `y="${block.y.toFixed(2)}"`,
    `font-family="${fontStack(family)}"`,
    `font-size="${block.size.toFixed(2)}"`,
    `font-weight="${block.weight}"`,
    `fill="${escapeXml(block.color)}"`,
    `text-anchor="${block.anchor}"`,
    // `dominant-baseline="text-before-edge"` puts the top of the text box at
    // y, which is what the canvas `textBaseline = "top"` path does too.
    'dominant-baseline="text-before-edge"',
  ];
  return `  <text ${attrs.join(" ")}>${escapeXml(block.text)}</text>`;
}

export type SvgMeta = {
  /** Accessible name; also the `<title>` element. */
  title: string;
  description?: string;
};

export function layoutToSvg(layout: BarcodeLayout, meta: SvgMeta): string {
  const lines: string[] = [];
  lines.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${layout.width}" height="${layout.height}" viewBox="0 0 ${layout.width} ${layout.height}" role="img" aria-labelledby="bc-title">`,
  );
  lines.push(`  <title id="bc-title">${escapeXml(meta.title)}</title>`);
  if (meta.description)
    lines.push(`  <desc>${escapeXml(meta.description)}</desc>`);
  if (layout.background) {
    lines.push(
      `  <rect x="0" y="0" width="${layout.width}" height="${layout.height}" fill="${escapeXml(layout.background)}"/>`,
    );
  }
  lines.push(
    `  <g fill="${escapeXml(layout.foreground)}" shape-rendering="crispEdges">`,
  );
  for (const bar of layout.bars) {
    lines.push(
      `    <rect x="${bar.x}" y="${bar.y}" width="${bar.width}" height="${bar.height}"/>`,
    );
  }
  lines.push("  </g>");
  for (const block of layout.texts)
    lines.push(textElement(block, layout.fontFamily));
  lines.push("</svg>");
  return `${lines.join("\n")}\n`;
}

/** A data URI safe for `<img src>` and for CSS backgrounds. */
export function svgDataUri(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * Guard used by the tests and the export path: refuse to hand out an SVG that
 * contains anything outside the closed vocabulary above.
 */
export function isSvgSafe(svg: string) {
  if (
    /<script|foreignObject|on[a-z]+\s*=|javascript:|xlink:href|<!ENTITY/i.test(
      svg,
    )
  )
    return false;
  return /^<svg[\s>]/.test(svg.trim());
}
