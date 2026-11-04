/**
 * SVG serializer for a QR scene.
 *
 * Produces a fully standalone vector file (gradients as real SVG gradients,
 * embedded logo as a PNG data URI) that prints at any size and opens in any
 * editor — with the same geometry the preview and the PNG use.
 */
import { base64FromBytes, encodePng } from "./png";
import type { Paint } from "./colour";
import type { QrScene, Radii, Shape } from "./scene";
import { rgbToHex } from "./colour";

const num = (value: number) => {
  const rounded = Math.round(value * 100) / 100;
  return Object.is(rounded, -0) ? "0" : String(rounded);
};

function roundedRectPath(x: number, y: number, w: number, h: number, r: Radii) {
  const [tl, tr, br, bl] = r;
  if (!tl && !tr && !br && !bl)
    return `M${num(x)} ${num(y)}H${num(x + w)}V${num(y + h)}H${num(x)}Z`;
  return [
    `M${num(x + tl)} ${num(y)}`,
    `H${num(x + w - tr)}`,
    tr ? `A${num(tr)} ${num(tr)} 0 0 1 ${num(x + w)} ${num(y + tr)}` : "",
    `V${num(y + h - br)}`,
    br ? `A${num(br)} ${num(br)} 0 0 1 ${num(x + w - br)} ${num(y + h)}` : "",
    `H${num(x + bl)}`,
    bl ? `A${num(bl)} ${num(bl)} 0 0 1 ${num(x)} ${num(y + h - bl)}` : "",
    `V${num(y + tl)}`,
    tl ? `A${num(tl)} ${num(tl)} 0 0 1 ${num(x + tl)} ${num(y)}` : "",
    "Z",
  ]
    .filter(Boolean)
    .join("");
}

function circlePath(cx: number, cy: number, r: number) {
  return `M${num(cx - r)} ${num(cy)}a${num(r)} ${num(r)} 0 1 0 ${num(r * 2)} 0a${num(r)} ${num(r)} 0 1 0 ${num(-r * 2)} 0Z`;
}

type SvgDoc = { defs: string[]; body: string[]; index: number };

function paintRef(paint: Paint, doc: SvgDoc): string {
  if (paint.type === "solid") return rgbToHex(paint.rgb);
  doc.index += 1;
  const id = `qk-q${doc.index}`;
  const stops = paint.stops
    .map(
      (stop) =>
        `<stop offset="${num(stop.at)}" stop-color="${rgbToHex(stop.rgb)}"/>`,
    )
    .join("");
  if (paint.type === "linear")
    doc.defs.push(
      `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${num(paint.x0)}" y1="${num(paint.y0)}" x2="${num(paint.x1)}" y2="${num(paint.y1)}">${stops}</linearGradient>`,
    );
  else
    doc.defs.push(
      `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${num(paint.cx)}" cy="${num(paint.cy)}" r="${num(paint.r)}">${stops}</radialGradient>`,
    );
  return `url(#${id})`;
}

async function shapeMarkup(shape: Shape, doc: SvgDoc): Promise<string> {
  switch (shape.type) {
    case "rect":
      return `<rect x="${num(shape.x)}" y="${num(shape.y)}" width="${num(shape.w)}" height="${num(shape.h)}" fill="${paintRef(shape.paint, doc)}"/>`;
    case "roundrect":
      return `<path d="${roundedRectPath(shape.x, shape.y, shape.w, shape.h, shape.radii)}" fill="${paintRef(shape.paint, doc)}"/>`;
    case "ringrect": {
      const t = shape.thickness;
      const inner = shape.radii.map((r) => Math.max(0, r - t)) as Radii;
      const d = `${roundedRectPath(shape.x, shape.y, shape.w, shape.h, shape.radii)}${roundedRectPath(
        shape.x + t,
        shape.y + t,
        shape.w - t * 2,
        shape.h - t * 2,
        inner,
      )}`;
      return `<path d="${d}" fill="${paintRef(shape.paint, doc)}" fill-rule="evenodd"/>`;
    }
    case "circle":
      return `<circle cx="${num(shape.cx)}" cy="${num(shape.cy)}" r="${num(shape.r)}" fill="${paintRef(shape.paint, doc)}"/>`;
    case "ring": {
      const d = `${circlePath(shape.cx, shape.cy, shape.rOuter)}${circlePath(shape.cx, shape.cy, shape.rInner)}`;
      return `<path d="${d}" fill="${paintRef(shape.paint, doc)}" fill-rule="evenodd"/>`;
    }
    case "image": {
      const bytes = await encodePng({
        width: shape.src.width,
        height: shape.src.height,
        rgba: shape.src.rgba,
      });
      const href = `data:image/png;base64,${base64FromBytes(bytes)}`;
      const clipId = shape.radii[0] ? `qk-clip${doc.index + 1}` : "";
      if (clipId) {
        doc.index += 1;
        doc.defs.push(
          `<clipPath id="${clipId}"><path d="${roundedRectPath(
            shape.x,
            shape.y,
            shape.w,
            shape.h,
            shape.radii,
          )}"/></clipPath>`,
        );
      }
      return `<image href="${href}" x="${num(shape.x)}" y="${num(shape.y)}" width="${num(shape.w)}" height="${num(shape.h)}" preserveAspectRatio="none"${clipId ? ` clip-path="url(#${clipId})"` : ""}/>`;
    }
  }
}

export async function sceneToSvg(
  scene: QrScene,
  options: { title?: string; embedLogo?: boolean } = {},
): Promise<string> {
  const doc: SvgDoc = { defs: [], body: [], index: 0 };
  const crisp =
    scene.shapes.length > 0 && scene.modulePx % 1 === 0 ? " crispEdges" : "";
  if (scene.background) doc.body.push(await shapeMarkup(scene.background, doc));
  for (const shape of scene.shapes) {
    if (shape.type === "image" && options.embedLogo === false) continue;
    doc.body.push(await shapeMarkup(shape, doc));
  }
  const size = num(scene.size);
  const title = options.title
    ? `<title>${escapeXml(options.title)}</title>`
    : "";
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" shape-rendering="${crisp ? "crispEdges" : "geometricPrecision"}">`,
    title,
    doc.defs.length ? `<defs>${doc.defs.join("")}</defs>` : "",
    doc.body.join(""),
    `</svg>`,
  ].join("");
}

export function escapeXml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
