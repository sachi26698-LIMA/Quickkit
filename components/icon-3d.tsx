import { securityToolDefinitions } from "@/lib/tools/security/catalog";
import { SecurityGlyph } from "@/components/security-glyphs";
import { useId, type CSSProperties, type ReactNode } from "react";
import type { CategoryMeta, Tool, ToolCategory } from "@/lib/catalog";

/**
 * Shared 3D icon system.
 *
 * One component renders every category and tool icon so the whole product
 * keeps the same depth, lighting and motion language:
 *
 *   .i3d            sized box + CSS perspective
 *   └ .i3d-shadow   soft ground shadow (moves opposite to the float)
 *   └ .i3d-tilt     hover / pointer tilt layer (transition only)
 *     └ .i3d-body   idle float + gentle rotation (CSS keyframes, transform only)
 *       ├ base svg  extruded glass tile (thickness, rim, gloss)
 *       ├ glyph svg raised object, pushed forward on the Z axis for parallax
 *       └ shine     light reflection that sweeps across on hover
 *
 * Everything is inline SVG + CSS transforms: no images, no animation library,
 * no randomness (timings derive from the icon name, so SSR and client agree).
 * The wrapper is decorative (aria-hidden); the card around it carries the
 * accessible name. Styles live in app/globals.css under "Glass design system".
 */

/**
 * One colour identity per category. Tools inherit the tone of their primary
 * category, so a category reads as one family while every tool keeps its own
 * glyph.
 */
export type Tone =
  | "violet"
  | "coral"
  | "crimson"
  | "plum"
  | "indigo"
  | "azure"
  | "emerald"
  | "magenta"
  | "cyan"
  | "teal"
  | "amber"
  | "rose";

export type GlyphName =
  | `security-${string}`
  | "pdf"
  | "image"
  | "qr"
  | "text"
  | "code"
  | "calc"
  | "shield"
  | "sparkles"
  | "wordCount"
  | "qrReader"
  | "ocrText"
  | "case"
  | "json"
  | "jsonValidate"
  | "htmlMarkup"
  | "cssStyle"
  | "javascript"
  | "base64"
  | "urlLink"
  | "uuid"
  | "regex"
  | "hash"
  | "xml"
  | "key"
  | "qrScan"
  | "imgCompress"
  | "imgResize"
  | "crop"
  | "imgSwap"
  | "imgsToPdf"
  | "pdfToImg"
  | "layers"
  | "mergePdf"
  | "splitPdf"
  | "compressPdf"
  | "wordToPdf"
  | "pdfToWord"
  | "pdfLock"
  | "percent"
  | "scale"
  | "tag"
  | "receipt"
  | "cake"
  | "calendar"
  | "coins"
  | "bank"
  | "wave"
  | "ruler"
  | "thermo"
  | "clock";

type Paint = {
  /** white → pale-tone gradient for the raised object */
  w: string;
  /** warm accent gradient */
  a: string;
  /** unique clip-path id for glyphs that need one */
  clip: string;
};

const round = { strokeLinecap: "round", strokeLinejoin: "round" } as const;
const D = "var(--i-dark)";

/** Folded-corner sheet (24 × 32) used by every document-style glyph. */
function Sheet({
  p,
  x,
  y,
  children,
  fold = true,
  fill,
  opacity,
  rotate,
}: {
  p: Paint;
  x: number;
  y: number;
  children?: ReactNode;
  fold?: boolean;
  fill?: string;
  opacity?: number;
  rotate?: number;
}) {
  const tr = `translate(${x} ${y})${rotate ? ` rotate(${rotate} 12 16)` : ""}`;
  return (
    <g transform={tr} opacity={opacity}>
      <path
        d="M5 0 H17 L24 7 V27 a5 5 0 0 1 -5 5 H5 a5 5 0 0 1 -5 -5 V5 a5 5 0 0 1 5 -5 Z"
        fill={fill ?? p.w}
      />
      {fold ? (
        <path d="M17 0 V4.5 a2.5 2.5 0 0 0 2.5 2.5 H24 Z" fill={p.a} />
      ) : null}
      {children}
    </g>
  );
}

const Bar = ({
  x,
  y,
  w,
  o = 0.38,
}: {
  x: number;
  y: number;
  w: number;
  o?: number;
}) => <rect x={x} y={y} width={w} height={2.6} rx={1.3} fill={D} opacity={o} />;

/** Landscape (sun + hills) drawn inside a w × h box at the origin. */
function Landscape({ p, w, h }: { p: Paint; w: number; h: number }) {
  return (
    <g>
      <circle cx={w * 0.72} cy={h * 0.3} r={Math.max(2, h * 0.14)} fill={p.w} />
      <path
        d={`M0 ${h} V${h * 0.74} L${w * 0.3} ${h * 0.42} L${w * 0.5} ${h * 0.68} L${w * 0.66} ${h * 0.52} L${w} ${h * 0.82} V${h} Z`}
        fill={D}
        opacity={0.5}
      />
    </g>
  );
}

const glyphs: Record<
  Exclude<GlyphName, `security-${string}`>,
  (p: Paint) => ReactNode
> = {
  /* ---------------- categories ---------------- */
  pdf: (p) => (
    <>
      <Sheet p={p} x={18} y={13} fold={false} opacity={0.5} rotate={-10} />
      <Sheet p={p} x={21} y={15}>
        <Bar x={4} y={11} w={16} />
        <rect x={4} y={17} width={13} height={7} rx={2.5} fill={p.a} />
        <Bar x={4} y={26} w={9} o={0.25} />
      </Sheet>
    </>
  ),
  image: (p) => (
    <>
      <rect x={14} y={16} width={36} height={30} rx={7} fill={p.w} />
      <clipPath id={p.clip}>
        <rect width={27} height={21} rx={3.5} />
      </clipPath>
      <rect x={18.5} y={20.5} width={27} height={21} rx={3.5} fill={p.a} />
      <g clipPath={`url(#${p.clip})`} transform="translate(18.5 20.5)">
        <Landscape p={p} w={27} h={21} />
      </g>
    </>
  ),
  qr: (p) => (
    <>
      {[
        [15, 14],
        [36, 14],
        [15, 35],
      ].map(([x, y]) => (
        <g key={`${x}${y}`}>
          <rect x={x} y={y} width={14} height={14} rx={4} fill={p.w} />
          <rect
            x={x + 4.2}
            y={y + 4.2}
            width={5.6}
            height={5.6}
            rx={1.8}
            fill={p.a}
          />
        </g>
      ))}
      {[
        [36, 35],
        [44.5, 35],
        [40, 40],
        [36, 45],
        [44.5, 45],
      ].map(([x, y]) => (
        <rect
          key={`${x}${y}`}
          x={x}
          y={y}
          width={6}
          height={6}
          rx={1.8}
          fill={p.w}
        />
      ))}
    </>
  ),
  text: (p) => (
    <>
      <rect x={15} y={15} width={30} height={9} rx={3.5} fill={p.w} />
      <rect x={25.5} y={15} width={9} height={31} rx={3.5} fill={p.w} />
      <rect x={47} y={27} width={4} height={19} rx={2} fill={p.a} />
    </>
  ),
  code: (p) => (
    <>
      <path
        d="M25 19 L14.5 31 L25 43"
        fill="none"
        stroke={p.w}
        strokeWidth={6}
        {...round}
      />
      <path
        d="M39 19 L49.5 31 L39 43"
        fill="none"
        stroke={p.w}
        strokeWidth={6}
        {...round}
      />
      <path
        d="M35.5 16 L28.5 46"
        fill="none"
        stroke={p.a}
        strokeWidth={5}
        {...round}
      />
    </>
  ),
  calc: (p) => (
    <>
      <rect x={18} y={12} width={28} height={38} rx={7} fill={p.w} />
      <rect
        x={22}
        y={16.5}
        width={20}
        height={9}
        rx={3}
        fill={D}
        opacity={0.7}
      />
      {[0, 1, 2].flatMap((r) =>
        [0, 1, 2].map((c) => (
          <rect
            key={`${r}${c}`}
            x={22.4 + c * 6.8}
            y={29.5 + r * 6.6}
            width={5.2}
            height={5}
            rx={1.8}
            fill={r === 2 && c === 2 ? p.a : D}
            opacity={r === 2 && c === 2 ? 1 : 0.4}
          />
        )),
      )}
    </>
  ),
  shield: (p) => (
    <>
      <path
        d="M32 11 L48.5 17.5 V30 C48.5 40 41.5 46.5 32 51 C22.5 46.5 15.5 40 15.5 30 V17.5 Z"
        fill={p.w}
      />
      <path
        d="M32 17 L43 21.5 V30 C43 36.5 38.5 41 32 44.5 C25.5 41 21 36.5 21 30 V21.5 Z"
        fill={p.a}
      />
      <path
        d="M26.5 30.5 L30.5 34.5 L38 26"
        fill="none"
        stroke={p.w}
        strokeWidth={3.8}
        {...round}
      />
    </>
  ),
  sparkles: (p) => (
    <>
      <path
        d="M30 12 C31.6 23 34.5 26.5 46 28.5 C34.5 30.5 31.6 34 30 46 C28.4 34 25.5 30.5 14 28.5 C25.5 26.5 28.4 23 30 12 Z"
        fill={p.w}
      />
      <path
        d="M47 11 C47.7 15.5 48.8 16.8 53.5 17.7 C48.8 18.6 47.7 19.9 47 24.5 C46.3 19.9 45.2 18.6 40.5 17.7 C45.2 16.8 46.3 15.5 47 11 Z"
        fill={p.a}
      />
      <path
        d="M45 38 C45.5 41.3 46.3 42.2 49.6 42.8 C46.3 43.4 45.5 44.3 45 47.6 C44.5 44.3 43.7 43.4 40.4 42.8 C43.7 42.2 44.5 41.3 45 38 Z"
        fill={p.a}
        opacity={0.9}
      />
    </>
  ),

  /* ---------------- text & developer ---------------- */
  wordCount: (p) => (
    <>
      <Sheet p={p} x={16} y={14} fold={false}>
        <Bar x={4} y={7} w={16} />
        <Bar x={4} y={13} w={12} />
        <Bar x={4} y={19} w={14} />
      </Sheet>
      <circle cx={42.5} cy={40.5} r={10} fill={p.a} />
      <path
        d="M40 35.5 L38.8 45.5 M46 35.5 L44.8 45.5 M37 38.8 H47.5 M36.4 42.6 H46.9"
        stroke={p.w}
        strokeWidth={2}
        fill="none"
        {...round}
      />
    </>
  ),
  case: (p) => (
    <>
      <path
        d="M14 46 L26 16 L38 46"
        fill="none"
        stroke={p.w}
        strokeWidth={6}
        {...round}
      />
      <path
        d="M19.5 36.5 H32.5"
        fill="none"
        stroke={p.w}
        strokeWidth={5}
        {...round}
      />
      <circle
        cx={45}
        cy={38.5}
        r={5.4}
        fill="none"
        stroke={p.a}
        strokeWidth={3.8}
      />
      <path
        d="M50.4 32.5 V45"
        fill="none"
        stroke={p.a}
        strokeWidth={3.8}
        {...round}
      />
    </>
  ),
  json: (p) => (
    <>
      <path
        d="M25.5 14 C20.5 14 20.5 17.5 20.5 21.5 V25.5 C20.5 29 18.5 30.4 15.5 31 C18.5 31.6 20.5 33 20.5 36.5 V40.5 C20.5 44.5 20.5 48 25.5 48"
        fill="none"
        stroke={p.w}
        strokeWidth={4.4}
        {...round}
      />
      <path
        d="M38.5 14 C43.5 14 43.5 17.5 43.5 21.5 V25.5 C43.5 29 45.5 30.4 48.5 31 C45.5 31.6 43.5 33 43.5 36.5 V40.5 C43.5 44.5 43.5 48 38.5 48"
        fill="none"
        stroke={p.w}
        strokeWidth={4.4}
        {...round}
      />
      {[26.5, 32, 37.5].map((x) => (
        <circle key={x} cx={x} cy={31} r={2.5} fill={p.a} />
      ))}
    </>
  ),
  jsonValidate: (p) => (
    <>
      <Sheet p={p} x={15} y={12}>
        <Bar x={4} y={10} w={13} />
        <Bar x={4} y={16} w={11} />
      </Sheet>
      <path
        d="M39 31 L49 35 V42 C49 48 44.5 51 39 53 C33.5 51 29 48 29 42 V35 Z"
        fill={p.a}
      />
      <path
        d="M34.5 41.5 L38 45 L44 38.5"
        fill="none"
        stroke={p.w}
        strokeWidth={2.8}
        {...round}
      />
    </>
  ),
  htmlMarkup: (p) => (
    <>
      <path
        d="M25 18 L14 31 L25 44 M39 18 L50 31 L39 44"
        fill="none"
        stroke={p.w}
        strokeWidth={5}
        {...round}
      />
      <path
        d="M36 14 L28 48"
        fill="none"
        stroke={p.a}
        strokeWidth={4.5}
        {...round}
      />
      <circle cx={15} cy={49} r={3.2} fill={p.a} />
    </>
  ),
  cssStyle: (p) => (
    <>
      <rect x={15} y={15} width={33} height={34} rx={8} fill={p.w} />
      <path
        d="M20 23 H43 M20 29 H36 M20 35 H40"
        fill="none"
        stroke={D}
        strokeOpacity={0.45}
        strokeWidth={2.4}
        {...round}
      />
      <path
        d="M37 39 C37 34 44 31 44 26 C44 31 51 34 51 39 A7 7 0 0 1 37 39 Z"
        fill={p.a}
      />
      <path
        d="M41 40 C41 37.5 44 36 44 33.5 C44 36 47 37.5 47 40 A3 3 0 0 1 41 40 Z"
        fill={p.w}
        opacity={0.9}
      />
    </>
  ),
  javascript: (p) => (
    <>
      <rect x={13} y={13} width={38} height={38} rx={9} fill={p.w} />
      <path
        d="M32 21 V39 C32 45 28 48 22 45"
        fill="none"
        stroke={D}
        strokeWidth={4}
        {...round}
      />
      <path
        d="M43 24 C40 21 35 22 35 26 C35 31 45 29 45 36 C45 42 39 44 34 40"
        fill="none"
        stroke={p.a}
        strokeWidth={3.8}
        {...round}
      />
      <circle cx={25} cy={38} r={2.2} fill={p.a} />
    </>
  ),
  base64: (p) => (
    <>
      <rect x={15} y={15} width={34} height={34} rx={8} fill={p.w} />
      {[0, 1, 2].map((row) =>
        [0, 1, 2].map((column) => (
          <rect
            key={`${row}-${column}`}
            x={21 + column * 7}
            y={21 + row * 7}
            width={4.5}
            height={4.5}
            rx={1.5}
            fill={(row + column) % 2 === 0 ? p.a : D}
            opacity={(row + column) % 2 === 0 ? 1 : 0.42}
          />
        )),
      )}
      <path d="M20 45 L44 20" stroke={p.a} strokeWidth={3.5} {...round} />
    </>
  ),
  urlLink: (p) => (
    <>
      <g transform="rotate(-38 32 32)">
        <rect
          x={14}
          y={25}
          width={24}
          height={14}
          rx={7}
          fill="none"
          stroke={p.w}
          strokeWidth={4.5}
        />
        <rect
          x={26}
          y={25}
          width={24}
          height={14}
          rx={7}
          fill="none"
          stroke={p.a}
          strokeWidth={4.5}
        />
        <path d="M24 32 H40" stroke={D} strokeWidth={2.5} {...round} />
      </g>
    </>
  ),
  uuid: (p) => (
    <>
      <rect x={15} y={15} width={34} height={34} rx={8} fill={p.w} />
      <path
        d="M23 24 H41 M23 30 H37 M23 36 H34"
        fill="none"
        stroke={D}
        strokeOpacity={0.42}
        strokeWidth={2.4}
        {...round}
      />
      <circle cx={42} cy={41} r={8.5} fill={p.a} />
      <path
        d="M42 36 V46 M37 41 H47"
        stroke={p.w}
        strokeWidth={2.3}
        {...round}
      />
    </>
  ),
  regex: (p) => (
    <>
      <circle cx={29} cy={29} r={15} fill={p.w} />
      <circle
        cx={29}
        cy={29}
        r={8.5}
        fill="none"
        stroke={p.a}
        strokeWidth={3.3}
      />
      <path d="M40 40 L51 51" stroke={p.w} strokeWidth={5} {...round} />
      <path d="M25 29 H33 M29 25 V33" stroke={D} strokeWidth={2.1} {...round} />
    </>
  ),
  hash: (p) => (
    <>
      <rect x={14} y={14} width={36} height={36} rx={9} fill={p.w} />
      <path
        d="M26 20 L23 44 M39 20 L36 44 M19 29 H45 M18 37 H44"
        fill="none"
        stroke={D}
        strokeWidth={3.3}
        opacity={0.62}
        {...round}
      />
      <path
        d="M26 20 L23 44 M19 29 H45"
        fill="none"
        stroke={p.a}
        strokeWidth={3.3}
        {...round}
      />
    </>
  ),
  xml: (p) => (
    <>
      <path
        d="M25 19 L15 31 L25 43 M39 19 L49 31 L39 43"
        fill="none"
        stroke={p.w}
        strokeWidth={4.5}
        {...round}
      />
      <path
        d="M36 15 L28 47"
        fill="none"
        stroke={p.a}
        strokeWidth={4}
        {...round}
      />
      <circle cx={32} cy={31} r={3.2} fill={D} />
      <circle cx={32} cy={50} r={2.8} fill={p.a} />
    </>
  ),
  key: (p) => (
    <g transform="rotate(-32 32 31)">
      <circle cx={21} cy={31} r={10.5} fill={p.w} />
      <circle cx={21} cy={31} r={4} fill="var(--i-mid)" />
      <rect x={29} y={28} width={24} height={6} rx={3} fill={p.w} />
      <rect x={42} y={33} width={4.6} height={8} rx={1.8} fill={p.a} />
      <rect x={49} y={33} width={4} height={6} rx={1.8} fill={p.a} />
    </g>
  ),

  /* ---------------- QR ---------------- */
  qrScan: (p) => (
    <>
      <path
        d="M14 22 V18 a4 4 0 0 1 4 -4 H22 M42 14 H46 a4 4 0 0 1 4 4 V22 M50 42 V46 a4 4 0 0 1 -4 4 H42 M22 50 H18 a4 4 0 0 1 -4 -4 V42"
        fill="none"
        stroke={p.a}
        strokeWidth={3.6}
        {...round}
      />
      {[
        [21, 21],
        [33.5, 21],
        [21, 33.5],
      ].map(([x, y]) => (
        <g key={`${x}${y}`}>
          <rect x={x} y={y} width={9.5} height={9.5} rx={3} fill={p.w} />
          <rect
            x={x + 3}
            y={y + 3}
            width={3.5}
            height={3.5}
            rx={1.2}
            fill={p.a}
          />
        </g>
      ))}
      <rect x={33.5} y={33.5} width={4.5} height={4.5} rx={1.3} fill={p.w} />
      <rect x={40} y={36.5} width={4.5} height={4.5} rx={1.3} fill={p.w} />
    </>
  ),

  qrReader: (p) => (
    <>
      <path
        d="M14 22 V18 a4 4 0 0 1 4 -4 H22 M42 14 H46 a4 4 0 0 1 4 4 V22 M50 42 V46 a4 4 0 0 1 -4 4 H42 M22 50 H18 a4 4 0 0 1 -4 -4 V42"
        fill="none"
        stroke={p.w}
        strokeWidth={3.6}
        {...round}
      />
      <rect x={21} y={20.5} width={8} height={8} rx={2.4} fill={p.w} />
      <rect x={35} y={35.5} width={8} height={8} rx={2.4} fill={p.w} />
      <rect x={18} y={29.5} width={28} height={5} rx={2.5} fill={p.a} />
    </>
  ),

  ocrText: (p) => (
    <>
      <rect x={13} y={16} width={36} height={32} rx={7} fill={p.w} />
      <path
        d="M21 26.5 H41 M21 33 H36 M21 39.5 H28"
        fill="none"
        stroke={p.a}
        strokeWidth={3.4}
        {...round}
      />
      <circle cx={46} cy={43} r={9} fill={p.a} />
      <path
        d="M41.8 39.8 H50.2 M46 39.8 V47.2"
        fill="none"
        stroke={p.w}
        strokeWidth={2.8}
        {...round}
      />
    </>
  ),

  /* ---------------- image tools ---------------- */
  imgCompress: (p) => (
    <>
      <rect x={20} y={17} width={24} height={26} rx={6} fill={p.w} />
      <g transform="translate(23 20)">
        <rect width={18} height={20} rx={3} fill={p.a} />
        <clipPath id={p.clip}>
          <rect width={18} height={20} rx={3} />
        </clipPath>
        <g clipPath={`url(#${p.clip})`}>
          <Landscape p={p} w={18} h={20} />
        </g>
      </g>
      <path
        d="M11.5 24 L17.5 30 L11.5 36 M52.5 24 L46.5 30 L52.5 36"
        fill="none"
        stroke={p.a}
        strokeWidth={4}
        {...round}
      />
    </>
  ),
  imgResize: (p) => (
    <>
      <rect
        x={16}
        y={14}
        width={32}
        height={32}
        rx={6}
        fill="none"
        stroke={p.a}
        strokeWidth={2.8}
        strokeDasharray="4 4"
        {...round}
      />
      <rect x={16} y={28} width={20} height={20} rx={5} fill={p.w} />
      <g transform="translate(19 31)">
        <clipPath id={p.clip}>
          <rect width={14} height={14} rx={2.5} />
        </clipPath>
        <rect width={14} height={14} rx={2.5} fill={p.a} opacity={0.9} />
        <g clipPath={`url(#${p.clip})`}>
          <Landscape p={p} w={14} h={14} />
        </g>
      </g>
      <path
        d="M34 30 L47 17 M39.5 17 H47 V24.5"
        fill="none"
        stroke={p.w}
        strokeWidth={4}
        {...round}
      />
    </>
  ),
  crop: (p) => (
    <>
      <path
        d="M22 11 V38 a3 3 0 0 0 3 3 H52"
        fill="none"
        stroke={p.w}
        strokeWidth={6}
        {...round}
      />
      <path
        d="M11 22 H38 a3 3 0 0 1 3 3 V52"
        fill="none"
        stroke={p.w}
        strokeWidth={6}
        {...round}
      />
      <rect x={26} y={26} width={10} height={10} rx={3} fill={p.a} />
    </>
  ),
  imgSwap: (p) => (
    <>
      <g transform="translate(12 14)">
        <rect width={24} height={21} rx={6} fill={p.w} />
        <clipPath id={p.clip}>
          <rect width={17} height={14} rx={2.5} />
        </clipPath>
        <rect x={3.5} y={3.5} width={17} height={14} rx={2.5} fill={p.a} />
        <g clipPath={`url(#${p.clip})`} transform="translate(3.5 3.5)">
          <Landscape p={p} w={17} h={14} />
        </g>
      </g>
      <g transform="translate(28 28)">
        <rect width={24} height={21} rx={6} fill={p.a} />
        <rect
          x={3.5}
          y={3.5}
          width={17}
          height={14}
          rx={2.5}
          fill={p.w}
          opacity={0.35}
        />
        <g transform="translate(3.5 3.5)">
          <Landscape p={p} w={17} h={14} />
        </g>
      </g>
      <circle cx={32} cy={32} r={7.5} fill={p.w} />
      <path
        d="M28 30.4 H36 M33.4 28 L36 30.4 L33.4 32.8 M36 34.2 H28 M30.6 31.8 L28 34.2 L30.6 36.6"
        fill="none"
        stroke={D}
        strokeWidth={1.7}
        {...round}
      />
    </>
  ),

  /* ---------------- PDF tools ---------------- */
  imgsToPdf: (p) => (
    <>
      <g transform="translate(11 13) rotate(-8 10 9)">
        <rect width={21} height={18} rx={5} fill={p.w} opacity={0.6} />
        <circle cx={14.5} cy={6.5} r={2.4} fill={p.a} />
      </g>
      <Sheet p={p} x={24} y={17}>
        <rect x={4} y={10} width={16} height={9} rx={2.5} fill={p.a} />
        <Bar x={4} y={22} w={16} />
        <Bar x={4} y={27} w={9} o={0.25} />
      </Sheet>
    </>
  ),
  pdfToImg: (p) => (
    <>
      <Sheet p={p} x={13} y={12} opacity={0.95}>
        <Bar x={4} y={10} w={14} />
        <Bar x={4} y={16} w={10} />
      </Sheet>
      <g transform="translate(27 27)">
        <rect width={25} height={21} rx={6} fill={p.a} />
        <clipPath id={p.clip}>
          <rect width={19} height={15} rx={3} />
        </clipPath>
        <rect
          x={3}
          y={3}
          width={19}
          height={15}
          rx={3}
          fill={p.w}
          opacity={0.4}
        />
        <g clipPath={`url(#${p.clip})`} transform="translate(3 3)">
          <Landscape p={p} w={19} h={15} />
        </g>
      </g>
    </>
  ),
  layers: (p) => (
    <>
      <path
        d="M14 38 L32 46 L50 38"
        fill="none"
        stroke={p.w}
        strokeWidth={5}
        opacity={0.7}
        {...round}
      />
      <path
        d="M14 30.5 L32 38.5 L50 30.5"
        fill="none"
        stroke={p.a}
        strokeWidth={5}
        {...round}
      />
      <path
        d="M32 13 L50 21.5 L32 30 L14 21.5 Z"
        fill={p.w}
        stroke={p.w}
        strokeWidth={4}
        {...round}
      />
    </>
  ),
  mergePdf: (p) => (
    <>
      <Sheet p={p} x={13} y={12} fold={false} opacity={0.55} rotate={-8} />
      <Sheet p={p} x={21} y={16}>
        <Bar x={4} y={11} w={16} />
        <Bar x={4} y={17} w={12} />
      </Sheet>
      <circle cx={44.5} cy={43.5} r={10} fill={p.a} />
      <path
        d="M44.5 38.5 V48.5 M39.5 43.5 H49.5"
        stroke={p.w}
        strokeWidth={3.4}
        {...round}
      />
    </>
  ),
  splitPdf: (p) => (
    <>
      <path
        d="M30 14 H20 a5 5 0 0 0 -5 5 V43 a5 5 0 0 0 5 5 H30 Z"
        fill={p.w}
        transform="translate(-2.5 0)"
      />
      <g transform="translate(2.5 0)">
        <path d="M34 14 H40 L49 23 V43 a5 5 0 0 1 -5 5 H34 Z" fill={p.w} />
        <path d="M40 14 V18.5 a4.5 4.5 0 0 0 4.5 4.5 H49 Z" fill={p.a} />
      </g>
      <path
        d="M32 9 V53"
        stroke={p.a}
        strokeWidth={2.8}
        strokeDasharray="3.5 3.5"
        {...round}
      />
      <rect
        x={18.5}
        y={28}
        width={8}
        height={2.6}
        rx={1.3}
        fill={D}
        opacity={0.35}
      />
      <rect
        x={38}
        y={28}
        width={8}
        height={2.6}
        rx={1.3}
        fill={D}
        opacity={0.35}
      />
    </>
  ),
  compressPdf: (p) => (
    <>
      <Sheet p={p} x={20} y={15}>
        <Bar x={4} y={12} w={16} />
        <Bar x={4} y={18} w={11} />
        <Bar x={4} y={24} w={13} o={0.25} />
      </Sheet>
      <path
        d="M10.5 25 L16.5 31 L10.5 37 M53.5 25 L47.5 31 L53.5 37"
        fill="none"
        stroke={p.a}
        strokeWidth={4}
        {...round}
      />
    </>
  ),
  wordToPdf: (p) => (
    <>
      <Sheet p={p} x={13} y={13} fold={false}>
        <path
          d="M4.5 9 L7.5 22 L12 12.5 L16.5 22 L19.5 9"
          fill="none"
          stroke={D}
          strokeOpacity={0.65}
          strokeWidth={2.8}
          {...round}
        />
      </Sheet>
      <rect x={31} y={31} width={21} height={16} rx={5} fill={p.a} />
      <path
        d="M36.5 39 H46.5 M43 35.2 L46.8 39 L43 42.8"
        fill="none"
        stroke={p.w}
        strokeWidth={2.8}
        {...round}
      />
    </>
  ),
  pdfToWord: (p) => (
    <>
      <Sheet p={p} x={13} y={13}>
        <Bar x={4} y={11} w={14} />
        <Bar x={4} y={17} w={10} />
        <Bar x={4} y={23} w={12} o={0.25} />
      </Sheet>
      <rect x={31} y={31} width={21} height={16} rx={5} fill={p.a} />
      <path
        d="M34.5 35.5 L37.2 43 L41.5 37.5 L45.8 43 L48.5 35.5"
        fill="none"
        stroke={p.w}
        strokeWidth={2.6}
        {...round}
      />
    </>
  ),
  pdfLock: (p) => (
    <>
      <Sheet p={p} x={13} y={12}>
        <Bar x={4} y={11} w={14} />
        <Bar x={4} y={17} w={10} />
      </Sheet>
      <path
        d="M34 33 V29.5 a6.5 6.5 0 0 1 13 0 V33"
        fill="none"
        stroke={p.w}
        strokeWidth={4}
        {...round}
      />
      <rect x={30} y={32} width={21} height={17} rx={5} fill={p.a} />
      <circle cx={40.5} cy={39.5} r={2.4} fill={p.w} />
      <rect x={39.4} y={40} width={2.2} height={5} rx={1.1} fill={p.w} />
    </>
  ),

  /* ---------------- calculators ---------------- */
  percent: (p) => (
    <>
      <circle
        cx={22}
        cy={21}
        r={5.2}
        fill="none"
        stroke={p.w}
        strokeWidth={4.6}
      />
      <circle
        cx={42}
        cy={41}
        r={5.2}
        fill="none"
        stroke={p.w}
        strokeWidth={4.6}
      />
      <path d="M43 15 L21 47" stroke={p.a} strokeWidth={5.4} {...round} />
    </>
  ),
  scale: (p) => (
    <>
      <rect x={14} y={14} width={36} height={36} rx={10} fill={p.w} />
      <path
        d="M21.5 30 A10.5 10.5 0 0 1 42.5 30"
        fill="none"
        stroke={p.a}
        strokeWidth={4}
        {...round}
      />
      <path
        d="M32 31 L36.5 23.5"
        stroke={D}
        strokeOpacity={0.75}
        strokeWidth={2.8}
        {...round}
      />
      <circle cx={32} cy={31} r={2.8} fill={D} opacity={0.75} />
      <rect
        x={21}
        y={39}
        width={22}
        height={4.5}
        rx={2.2}
        fill={D}
        opacity={0.2}
      />
    </>
  ),
  tag: (p) => (
    <>
      <path
        d="M28 12.5 H46.5 a4.5 4.5 0 0 1 4.5 4.5 V35.5 a4.5 4.5 0 0 1 -1.3 3.2 L37 51.4 a4.5 4.5 0 0 1 -6.4 0 L13.6 34.4 a4.5 4.5 0 0 1 0 -6.4 L24.8 13.8 A4.5 4.5 0 0 1 28 12.5 Z"
        fill={p.w}
      />
      <circle cx={43} cy={21} r={3.2} fill="var(--i-mid)" />
      <circle
        cx={28.5}
        cy={29}
        r={2.7}
        fill="none"
        stroke={p.a}
        strokeWidth={2.4}
      />
      <circle
        cx={36}
        cy={38}
        r={2.7}
        fill="none"
        stroke={p.a}
        strokeWidth={2.4}
      />
      <path d="M37 27 L27.5 39.5" stroke={p.a} strokeWidth={2.8} {...round} />
    </>
  ),
  receipt: (p) => (
    <>
      <path
        d="M19 12 H45 V50 L41 46.5 L37 50 L32 46.5 L27 50 L23 46.5 L19 50 Z"
        fill={p.w}
        stroke={p.w}
        strokeWidth={2}
        {...round}
      />
      <Bar x={23.5} y={18} w={17} />
      <Bar x={23.5} y={24} w={11} o={0.25} />
      <circle cx={40} cy={36.5} r={7.4} fill={p.a} />
      <circle cx={37.6} cy={34.2} r={1.4} fill={p.w} />
      <circle cx={42.4} cy={38.8} r={1.4} fill={p.w} />
      <path
        d="M42.6 33.8 L37.4 39.2"
        stroke={p.w}
        strokeWidth={1.6}
        {...round}
      />
    </>
  ),
  cake: (p) => (
    <>
      <rect x={30.4} y={18} width={3.2} height={10} rx={1.6} fill={p.a} />
      <path
        d="M32 10 C35.4 13.4 35.4 17 32 17 C28.6 17 28.6 13.4 32 10 Z"
        fill={p.w}
      />
      <rect x={14} y={28} width={36} height={20} rx={6} fill={p.w} />
      <path
        d="M14 35 q4.5 5.5 9 0 t9 0 t9 0 t9 0"
        fill="none"
        stroke={p.a}
        strokeWidth={3.6}
        {...round}
      />
      <rect
        x={19}
        y={42}
        width={26}
        height={2.6}
        rx={1.3}
        fill={D}
        opacity={0.22}
      />
    </>
  ),
  calendar: (p) => (
    <>
      <rect x={13} y={15} width={38} height={35} rx={8} fill={p.w} />
      <path
        d="M13 24 a9 9 0 0 1 9 -9 H42 a9 9 0 0 1 9 9 V27 H13 Z"
        fill={p.a}
      />
      <rect x={22} y={11} width={4} height={9} rx={2} fill={D} opacity={0.75} />
      <rect x={38} y={11} width={4} height={9} rx={2} fill={D} opacity={0.75} />
      <circle cx={23} cy={36} r={3.3} fill={p.a} />
      <circle cx={41} cy={43} r={3.3} fill={p.a} />
      <path
        d="M26 37.5 L38 41.5"
        stroke={D}
        strokeOpacity={0.35}
        strokeWidth={1.8}
        strokeDasharray="2.4 2.4"
        {...round}
      />
      <circle cx={32} cy={33} r={1.5} fill={D} opacity={0.25} />
      <circle cx={41} cy={34} r={1.5} fill={D} opacity={0.25} />
    </>
  ),
  coins: (p) => (
    <>
      {[41, 34, 27].map((y, i) => (
        <g key={y}>
          <path
            d={`M17.5 ${y} v4.5 a14.5 5.5 0 0 0 29 0 v-4.5 Z`}
            fill={i === 2 ? p.w : p.a}
            opacity={i === 2 ? 1 : 0.95}
          />
          <ellipse cx={32} cy={y} rx={14.5} ry={5.5} fill={p.w} />
          <ellipse cx={32} cy={y} rx={9} ry={3} fill={D} opacity={0.12} />
        </g>
      ))}
      <rect x={38.5} y={9.5} width={13} height={12} rx={3.4} fill={p.a} />
      <rect
        x={38.5}
        y={13.6}
        width={13}
        height={2.4}
        fill={p.w}
        opacity={0.9}
      />
    </>
  ),
  bank: (p) => (
    <>
      <path
        d="M32 12 L50.5 23 H13.5 Z"
        fill={p.w}
        stroke={p.w}
        strokeWidth={3}
        {...round}
      />
      <circle cx={32} cy={19} r={2.3} fill={p.a} />
      {[18, 29, 40].map((x) => (
        <rect
          key={x}
          x={x}
          y={27}
          width={6.2}
          height={15.5}
          rx={2.4}
          fill={p.w}
        />
      ))}
      <rect x={13.5} y={45.5} width={37} height={5.5} rx={2.7} fill={p.a} />
    </>
  ),
  wave: (p) => (
    <>
      <rect x={12.5} y={14} width={39} height={34} rx={9} fill={p.w} />
      <path
        d="M18 31 H46"
        stroke={D}
        strokeOpacity={0.25}
        strokeWidth={1.8}
        {...round}
      />
      <path
        d="M32 19 V43"
        stroke={D}
        strokeOpacity={0.2}
        strokeWidth={1.8}
        {...round}
      />
      <path
        d="M18 31 C21 19 26.5 19 32 31 S43 43 46 31"
        fill="none"
        stroke={p.a}
        strokeWidth={4}
        {...round}
      />
    </>
  ),
  ruler: (p) => (
    <g transform="rotate(-38 32 31)">
      <rect x={8} y={21.5} width={48} height={19} rx={5} fill={p.w} />
      {[14, 20.5, 27, 33.5, 40, 46.5].map((x, i) => (
        <rect
          key={x}
          x={x}
          y={21.5}
          width={2.2}
          height={i % 2 ? 6 : 9.5}
          rx={1.1}
          fill={D}
          opacity={0.5}
        />
      ))}
      <rect x={13} y={33.5} width={16} height={3.6} rx={1.8} fill={p.a} />
    </g>
  ),
  thermo: (p) => (
    <>
      <rect x={25.5} y={11} width={13} height={33} rx={6.5} fill={p.w} />
      <circle cx={32} cy={43} r={9.6} fill={p.w} />
      <rect x={30.1} y={22} width={3.8} height={21} rx={1.9} fill={p.a} />
      <circle cx={32} cy={43} r={5.4} fill={p.a} />
      {[17, 24.5, 32].map((y, i) => (
        <rect
          key={y}
          x={42}
          y={y}
          width={i === 1 ? 4.6 : 7}
          height={2.6}
          rx={1.3}
          fill={p.w}
          opacity={0.9}
        />
      ))}
    </>
  ),
  clock: (p) => (
    <>
      <circle cx={32} cy={31} r={19} fill={p.w} />
      <circle cx={32} cy={31} r={14.2} fill="var(--i-light)" />
      {[
        [32, 20.5],
        [42.5, 31],
        [32, 41.5],
        [21.5, 31],
      ].map(([x, y]) => (
        <circle
          key={`${x}${y}`}
          cx={x}
          cy={y}
          r={1.2}
          fill={D}
          opacity={0.45}
        />
      ))}
      <path
        d="M32 31 V22.5"
        stroke={D}
        strokeOpacity={0.75}
        strokeWidth={3.2}
        {...round}
      />
      <path d="M32 31 L38.5 35" stroke={p.a} strokeWidth={3.2} {...round} />
      <circle cx={32} cy={31} r={2.4} fill={p.a} />
    </>
  ),
};

/** Deterministic 0..1 value derived from the icon name (no Math.random). */
function seed(name: string, salt: number): number {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < name.length; i += 1) {
    h = Math.imul(h ^ name.charCodeAt(i), 16777619);
  }
  return ((h >>> 0) % 1000) / 1000;
}

export type Icon3DProps = {
  name: GlyphName;
  tone: Tone;
  /** Rendered size in px. */
  size?: number;
  /** Extra classes for placement (e.g. `.category-icon-3d`). */
  className?: string;
  /** Seed for the float timing; defaults to `name`. */
  motionKey?: string;
};

export default function Icon3D({
  name,
  tone,
  size = 56,
  className,
  motionKey,
}: Icon3DProps) {
  const raw = useId();
  const uid = `i3-${raw.replace(/[^a-zA-Z0-9]/g, "")}`;
  const key = motionKey ?? name;
  const paint: Paint = {
    w: `url(#${uid}w)`,
    a: `url(#${uid}a)`,
    clip: `${uid}c`,
  };
  const style = {
    "--s": `var(--icon-size, ${size}px)`,
    "--i-dur": `${(3.8 + seed(key, 1) * 2.4).toFixed(2)}s`,
    "--i-delay": `${(-seed(key, 2) * 7).toFixed(2)}s`,
  } as CSSProperties;

  return (
    <span
      className={`i3d i3d-${tone}${className ? ` ${className}` : ""}`}
      style={style}
      aria-hidden="true"
    >
      <span className="i3d-shadow" />
      <span className="i3d-tilt">
        <span className="i3d-body">
          <svg className="i3d-base" viewBox="0 0 64 64" focusable="false">
            <defs>
              <linearGradient id={`${uid}f`} x1="0.15" y1="0" x2="0.85" y2="1">
                <stop offset="0" style={{ stopColor: "var(--i-hi)" }} />
                <stop offset="0.5" style={{ stopColor: "var(--i-mid)" }} />
                <stop offset="1" style={{ stopColor: "var(--i-deep)" }} />
              </linearGradient>
              <linearGradient id={`${uid}g`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#fff" stopOpacity="0.7" />
                <stop offset="1" stopColor="#fff" stopOpacity="0" />
              </linearGradient>
            </defs>
            <rect
              x="6"
              y="10"
              width="52"
              height="48"
              rx="17"
              style={{ fill: "var(--i-dark)" }}
            />
            <rect
              x="6"
              y="6"
              width="52"
              height="48"
              rx="17"
              fill={`url(#${uid}f)`}
            />
            <path
              d="M6 24 C6 14 14 6 24 6 H40 C50 6 58 14 58 24 C42 31 22 31 6 24 Z"
              fill={`url(#${uid}g)`}
            />
            <rect
              x="6.7"
              y="6.7"
              width="50.6"
              height="46.6"
              rx="16.4"
              fill="none"
              stroke="#fff"
              strokeOpacity="0.55"
              strokeWidth="1.2"
            />
          </svg>
          <svg className="i3d-glyph" viewBox="0 0 64 64" focusable="false">
            <defs>
              <linearGradient
                id={`${uid}w`}
                gradientUnits="userSpaceOnUse"
                x1="22"
                y1="10"
                x2="38"
                y2="52"
              >
                <stop offset="0" stopColor="#fff" />
                <stop offset="1" style={{ stopColor: "var(--i-light)" }} />
              </linearGradient>
              <linearGradient
                id={`${uid}a`}
                gradientUnits="userSpaceOnUse"
                x1="20"
                y1="10"
                x2="44"
                y2="52"
              >
                <stop offset="0" style={{ stopColor: "var(--i-a1)" }} />
                <stop offset="1" style={{ stopColor: "var(--i-a2)" }} />
              </linearGradient>
            </defs>
            {/* userSpaceOnUse gradients: straight (zero-width bbox) strokes still paint */}
            {name.startsWith("security-") ? (
              <SecurityGlyph slug={name.slice(9)} color={paint.w} />
            ) : (
              glyphs[name as Exclude<GlyphName, `security-${string}`>](paint)
            )}
          </svg>
          <span className="i3d-shine" />
        </span>
      </span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Catalog mapping                                                     */
/* ------------------------------------------------------------------ */

/** Category palette: deep + bright pair per category (see globals.css). */
export const categoryTones: Record<ToolCategory, Tone> = {
  "PDF Tools": "violet",
  "Image Tools": "coral",
  "QR & Barcode": "crimson",
  "Text & Writing": "plum",
  "Developer Tools": "indigo",
  Calculators: "azure",
  "Security & Privacy": "emerald",
  "AI Tools": "magenta",
};

export const categoryArt: Record<CategoryMeta["icon"], GlyphName> = {
  pdf: "pdf",
  image: "image",
  qr: "qr",
  text: "text",
  code: "code",
  calc: "calc",
  shield: "shield",
  sparkles: "sparkles",
};

/** One unique glyph per tool, keyed by route slug (the catalog's `icon` key is shared by e.g. every calculator). */
export const toolArt: Record<string, GlyphName> = {
  ...Object.fromEntries(
    securityToolDefinitions.map((item) => [
      item.slug,
      `security-${item.slug}` as const,
    ]),
  ),
  "advanced-cryptography": "security-rsa-cryptography",
  "dns-email-security": "security-dns-lookup",
  "website-security-review": "security-security-headers-analyzer",
  "privacy-metadata-manager": "security-image-metadata-inspector",
  "url-network-privacy": "security-url-safety-review",
  "privacy-policy-workbench": "security-privacy-policy-generator",
  "api-credential-tools": "security-api-key-format-validator",
  "word-counter": "wordCount",
  "case-converter": "case",
  "json-formatter": "json",
  "json-validator": "jsonValidate",
  "html-formatter": "htmlMarkup",
  "css-minifier": "cssStyle",
  "javascript-minifier": "javascript",
  "base64-encoder-decoder": "base64",
  "url-encoder-decoder": "urlLink",
  "uuid-generator": "uuid",
  "regex-tester": "regex",
  "hash-generator": "hash",
  "xml-formatter": "xml",
  "password-generator": "key",
  "qr-generator": "qrScan",
  "qr-code-scanner": "qrReader",
  "image-to-text": "ocrText",
  "image-compressor": "imgCompress",
  "image-resizer": "imgResize",
  "image-cropper": "crop",
  "image-to-image": "imgSwap",
  "images-to-pdf": "imgsToPdf",
  "pdf-to-image": "pdfToImg",
  "pdf-studio": "layers",
  "merge-pdf": "mergePdf",
  "split-pdf": "splitPdf",
  "compress-pdf": "compressPdf",
  "word-to-pdf": "wordToPdf",
  "pdf-to-word": "pdfToWord",
  "pdf-lock-unlock": "pdfLock",
  "percentage-calculator": "percent",
  "bmi-calculator": "scale",
  "discount-calculator": "tag",
  "gst-calculator": "receipt",
  "age-calculator": "cake",
  "date-difference-calculator": "calendar",
  "emi-calculator": "coins",
  "loan-calculator": "bank",
  "scientific-calculator": "wave",
  "unit-converter": "ruler",
  "temperature-converter": "thermo",
  "time-converter": "clock",
};

/** Fallback for a tool added to the catalog before it has bespoke art. */
const fallbackArt: Record<string, GlyphName> = {
  text: "text",
  case: "case",
  code: "code",
  key: "key",
  qr: "qr",
  image: "image",
  pdf: "pdf",
  calc: "calc",
};

export const categoryTone = (name: ToolCategory): Tone => categoryTones[name];

/** Tool cards share the 3D system while each Developer Tool has its own accent. */
const toolAccentTones: Record<string, Tone> = {
  "json-formatter": "indigo",
  "json-validator": "cyan",
  "html-formatter": "coral",
  "css-minifier": "emerald",
  "javascript-minifier": "amber",
  "base64-encoder-decoder": "plum",
  "url-encoder-decoder": "teal",
  "uuid-generator": "rose",
  "regex-tester": "magenta",
  "hash-generator": "crimson",
  "xml-formatter": "azure",
};
export function toolTone(tool: Pick<Tool, "category" | "slug">): Tone {
  return (
    toolAccentTones[tool.slug] ??
    categoryTones[tool.category as ToolCategory] ??
    "violet"
  );
}

export function ToolIcon3D({
  tool,
  size = 56,
  className,
}: {
  tool: Pick<Tool, "slug" | "icon" | "category">;
  size?: number;
  className?: string;
}) {
  const glyph = toolArt[tool.slug] ?? fallbackArt[tool.icon] ?? "sparkles";
  return (
    <Icon3D
      name={glyph}
      tone={toolTone(tool)}
      size={size}
      className={className}
      motionKey={tool.slug}
    />
  );
}

export function CategoryIcon3D({
  meta,
  size = 56,
  className,
}: {
  meta: CategoryMeta;
  size?: number;
  className?: string;
}) {
  return (
    <Icon3D
      name={categoryArt[meta.icon]}
      tone={categoryTone(meta.name)}
      size={size}
      className={className}
      motionKey={`cat-${meta.slug}`}
    />
  );
}
