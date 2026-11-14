/**
 * 2D symbols: QR Code, GS1 QR Code, Data Matrix and PDF417.
 *
 * These four are delegated to BWIPP (via `bwip-js`), the reference
 * implementation of the ISO/IEC 18004 (QR), ISO/IEC 16022 (Data Matrix) and
 * ISO/IEC 15438 (PDF417) symbologies. We do not hand-write a 2D encoder: a
 * Reed-Solomon mistake in a QR code produces a label that looks perfect and
 * fails at the till, so using the reference implementation and verifying its
 * output with an independent decoder is the honest engineering choice.
 *
 * `bwip-js` is heavy, so it is only imported by the client panel that offers 2D
 * formats — never by the linear generator, the scanner or the server.
 */
// The "/browser" entry point resolves cleanly for the bundler, the test runner
// and the type checker (the bare specifier only exposes conditional exports).
import bwipjs from "bwip-js/browser";
import { parseGs1 } from "./gs1";

export type TwoDFormatId = "qrcode" | "gs1qrcode" | "datamatrix" | "pdf417";

export type TwoDEcLevel = "L" | "M" | "Q" | "H";

export type TwoDFormatMeta = {
  id: TwoDFormatId;
  name: string;
  blurb: string;
  example: string;
  placeholder: string;
  rules: string[];
  usedFor: string;
  /** QR accepts L/M/Q/H; PDF417 accepts 0–8; Data Matrix picks its own. */
  ec: "qr" | "pdf417" | "none";
  /** Optional human-readable caption is meaningless for 2D symbols. */
  humanReadable: false;
};

export const TWO_D_FORMATS: TwoDFormatMeta[] = [
  {
    id: "qrcode",
    name: "QR Code",
    blurb:
      "The general-purpose square code. It is not a GS1 code unless the data is a GS1 element string — this studio keeps the two apart.",
    example: "https://quickkit.online",
    placeholder: "Text or URL, e.g. https://example.com",
    rules: [
      "Up to 2,953 bytes at error correction L (fewer at M, Q and H)",
      "Error correction: L 7%, M 15%, Q 25%, H 30% recovery",
      "An ordinary QR code carries no GS1 application identifiers",
    ],
    usedFor: "Links, tickets, Wi-Fi, payments, general data",
    ec: "qr",
    humanReadable: false,
  },
  {
    id: "gs1qrcode",
    name: "GS1 QR Code",
    blurb:
      "A QR code whose payload is a GS1 element string with FNC1 in the first position, so a scanner reports application identifiers instead of raw text.",
    example: "(01)09506000134352(17)251231(10)LOT-42",
    placeholder: "(01)09506000134352(10)LOT-42",
    rules: [
      "Data must be GS1 AI data — bracketed (01)… form or a valid element string",
      "GTINs must pass the GS1 check digit before a symbol is drawn",
      "FNC1 is inserted by the encoder, never typed",
    ],
    usedFor: "Retail and healthcare packs that must carry AIs",
    ec: "qr",
    humanReadable: false,
  },
  {
    id: "datamatrix",
    name: "Data Matrix",
    blurb:
      "Square or rectangular matrix used on small parts, vials and labels where a QR code will not fit.",
    example: "QK-2026-0001",
    placeholder: "Text, e.g. SERIAL-0042",
    rules: [
      "Up to 1,556 bytes (ASCII), 3,116 digits",
      "Error correction is chosen by the encoder from the symbol size",
      "Latin-1 text is encoded directly; other characters need an ECI",
    ],
    usedFor: "Pharmaceuticals, electronics, small labels",
    ec: "none",
    humanReadable: false,
  },
  {
    id: "pdf417",
    name: "PDF417",
    blurb:
      "Stacked multi-row code for ID cards, boarding passes and documents that need a lot of data.",
    example: "QUICKKIT|2026|A1B2C3",
    placeholder: "Text, e.g. NAME|ID|DOB",
    rules: [
      "Up to 1,850 printable ASCII characters",
      "Error correction levels 0–8 trade capacity for robustness",
      "Read by laser scanners as well as camera imagers",
    ],
    usedFor: "ID documents, boarding passes, logistics paperwork",
    ec: "pdf417",
    humanReadable: false,
  },
];

export function twoDMeta(id: TwoDFormatId) {
  return TWO_D_FORMATS.find((format) => format.id === id) ?? TWO_D_FORMATS[0];
}

export type TwoDProblem = { code: string; message: string };

export type TwoDBuildOptions = {
  /** Pixels per module; 3 keeps a screen preview sharp. */
  scale?: number;
  ecLevel?: TwoDEcLevel;
  /** PDF417 error correction 0–8. */
  pdf417Level?: number;
  foreground?: string;
  background?: string;
  /** Quiet-zone padding in modules. */
  padding?: number;
};

export type TwoDResult =
  | {
      ok: true;
      format: TwoDFormatId;
      svg: string;
      /** Nominal square size in modules (includes padding). */
      width: number;
      height: number;
      notes: string[];
    }
  | { ok: false; problems: TwoDProblem[] };

const MAX_BYTES: Record<TwoDFormatId, number> = {
  qrcode: 2953,
  gs1qrcode: 2000,
  datamatrix: 1556,
  pdf417: 1850,
};

function hex(value: string | undefined, fallback: string) {
  const clean = (value ?? "").replace("#", "").trim();
  return /^[0-9a-f]{6}$/i.test(clean) ? clean.toLowerCase() : fallback;
}

function utf8Bytes(value: string) {
  return new TextEncoder().encode(value).length;
}

/** Validate before drawing: every rejection names the rule that fired. */
export function validateTwoD(
  format: TwoDFormatId,
  raw: string,
):
  | { ok: true; value: string; notes: string[] }
  | { ok: false; problems: TwoDProblem[] } {
  const value = raw.trim();
  const meta = twoDMeta(format);
  if (!value)
    return {
      ok: false,
      problems: [
        {
          code: "empty",
          message: `Enter the data for the ${meta.name}.`,
        },
      ],
    };

  const bytes = utf8Bytes(value);
  if (bytes > MAX_BYTES[format])
    return {
      ok: false,
      problems: [
        {
          code: "length",
          message: `${meta.name} holds at most ${MAX_BYTES[format].toLocaleString()} bytes at full capacity — this input is ${bytes.toLocaleString()} bytes. Split it or shorten it.`,
        },
      ],
    };

  if (format === "gs1qrcode") {
    const parsed = parseGs1(value);
    if (!parsed.ok)
      return {
        ok: false,
        problems: [{ code: parsed.code, message: parsed.message }],
      };
    if (
      !/^\d{14}$/.test(parsed.fields[0]?.value ?? "") &&
      parsed.fields[0]?.ai !== "8006"
    )
      return {
        ok: false,
        problems: [
          {
            code: "gs1-ai",
            message:
              "A GS1 QR Code should start with a primary identifier — AI (01) GTIN or AI (8006) — so scanners can identify the item before reading the rest.",
          },
        ],
      };
    return {
      ok: true,
      value: parsed.hri,
      notes: [
        `${parsed.fields.length} application identifier${parsed.fields.length === 1 ? "" : "s"} validated.`,
        "FNC1 is placed in the first symbol character by the encoder.",
      ],
    };
  }

  return {
    ok: true,
    value,
    notes:
      format === "datamatrix" && /[^\x00-\x7f]/.test(value)
        ? [
            "Non-ASCII characters are encoded as UTF-8 bytes; not every Data Matrix reader applies the same 8-bit interpretation.",
          ]
        : [],
  };
}

/** Render the symbol to SVG (the format every export path shares). */
export function buildTwoD(
  format: TwoDFormatId,
  raw: string,
  options: TwoDBuildOptions = {},
): TwoDResult {
  const validated = validateTwoD(format, raw);
  if (!validated.ok) return validated;

  const meta = twoDMeta(format);
  const scale = Math.min(Math.max(Math.round(options.scale ?? 3), 1), 10);
  const padding = Math.min(Math.max(Math.round(options.padding ?? 4), 0), 40);
  const ecLevel = options.ecLevel ?? "M";
  const pdf417Level =
    options.pdf417Level === undefined
      ? 4
      : Math.min(Math.max(Math.round(options.pdf417Level), 0), 8);

  try {
    const svg = bwipjs.toSVG({
      bcid: format,
      text: validated.value,
      scale,
      padding,
      barcolor: hex(options.foreground, "000000"),
      backgroundcolor: hex(options.background, "ffffff"),
      ...(meta.ec === "qr" ? { eclevel: ecLevel } : {}),
      ...(meta.ec === "pdf417" ? { eclevel: pdf417Level } : {}),
    } as Parameters<typeof bwipjs.toSVG>[0]);

    const box = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
    const width = box ? Number(box[1]) : 0;
    const height = box ? Number(box[2]) : 0;
    if (!width || !height)
      return {
        ok: false,
        problems: [
          {
            code: "render",
            message:
              "The symbol was encoded but its dimensions could not be read.",
          },
        ],
      };

    return {
      ok: true,
      format,
      svg,
      width,
      height,
      notes: [
        ...validated.notes,
        meta.ec === "qr"
          ? `Error correction ${ecLevel} (${ecLevel === "L" ? "7" : ecLevel === "M" ? "15" : ecLevel === "Q" ? "25" : "30"}% recovery).`
          : meta.ec === "pdf417"
            ? `PDF417 error correction level ${pdf417Level} of 8.`
            : "Error correction is selected by the Data Matrix symbol size.",
      ],
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error ?? "unknown error");
    return {
      ok: false,
      problems: [
        {
          code: "encode",
          message: `The ${meta.name} could not be encoded: ${message.split("\n")[0]}`,
        },
      ],
    };
  }
}

/** SVG → PNG/JPEG bytes, in the browser only (needs a real canvas). */
export async function svgToRaster(
  svg: string,
  options: {
    scale?: number;
    mime?: "image/png" | "image/jpeg";
    background?: string;
  } = {},
): Promise<{ bytes: Uint8Array; width: number; height: number }> {
  if (typeof document === "undefined" && typeof OffscreenCanvas === "undefined")
    throw new Error("Raster export needs a browser canvas.");

  const scale = Math.min(Math.max(options.scale ?? 3, 1), 12);
  const mime = options.mime ?? "image/png";
  const box = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  if (!box) throw new Error("The symbol SVG has no viewBox.");
  const width = Math.ceil(Number(box[1]) * scale);
  const height = Math.ceil(Number(box[2]) * scale);

  const image = new Image();
  const url = URL.createObjectURL(
    new Blob([svg], { type: "image/svg+xml;charset=utf-8" }),
  );
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () =>
        reject(new Error("The symbol could not be rasterised."));
      image.src = url;
    });

    const canvas =
      typeof OffscreenCanvas !== "undefined"
        ? new OffscreenCanvas(width, height)
        : Object.assign(document.createElement("canvas"), { width, height });
    const context = canvas.getContext("2d") as
      CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
    if (!context) throw new Error("This browser refused a 2D canvas context.");
    if (mime === "image/jpeg") {
      context.fillStyle = options.background ?? "#ffffff";
      context.fillRect(0, 0, width, height);
    }
    context.drawImage(image as CanvasImageSource, 0, 0, width, height);

    const blob =
      "convertToBlob" in canvas
        ? await (canvas as OffscreenCanvas).convertToBlob({
            type: mime,
            quality: mime === "image/jpeg" ? 0.95 : undefined,
          })
        : await new Promise<Blob | null>((resolve) =>
            (canvas as HTMLCanvasElement).toBlob(
              (result) => resolve(result),
              mime,
              0.95,
            ),
          );
    if (!blob) throw new Error("The browser could not encode the image.");
    return {
      bytes: new Uint8Array(await blob.arrayBuffer()),
      width,
      height,
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}
