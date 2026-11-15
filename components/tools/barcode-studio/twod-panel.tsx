"use client";
/**
 * 2D symbols: QR, GS1 QR, Data Matrix and PDF417.
 *
 * Encoding goes through bwip-js, imported dynamically so the 1D generator never
 * pays for it. Everything the panel shows comes from the built SVG: the size is
 * the symbol's own viewBox, the contrast warning is computed from the two hex
 * colours, and the export buttons rasterise that same SVG rather than a
 * re-encoded copy.
 */
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ClipboardCopy,
  Download,
  FileCode2,
  FileImage,
  FileText,
  QrCode,
} from "lucide-react";
import {
  TWO_D_FORMATS,
  twoDMeta,
  buildTwoD,
  svgToRaster,
  type TwoDEcLevel,
  type TwoDFormatId,
  type TwoDBuildOptions,
} from "@/lib/tools/barcode/twod";
import { downloadBlob } from "@/lib/tools/download";
import { WorkspaceHeading } from "../tool-ui";

const EC_LEVELS: TwoDEcLevel[] = ["L", "M", "Q", "H"];

function channel(hex: string) {
  const clean = hex.replace("#", "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((char) => char + char)
          .join("")
      : clean;
  return [
    parseInt(full.slice(0, 2), 16) || 0,
    parseInt(full.slice(2, 4), 16) || 0,
    parseInt(full.slice(4, 6), 16) || 0,
  ];
}

function luminance(hex: string) {
  const [r, g, b] = channel(hex).map((value) => {
    const unit = value / 255;
    return unit <= 0.03928 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio, used here as a legibility proxy for a printed symbol. */
function contrastRatio(a: string, b: string) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

export default function TwoDPanel() {
  const [format, setFormat] = useState<TwoDFormatId>("qrcode");
  const [text, setText] = useState("https://quickkit.online");
  const [ecLevel, setEcLevel] = useState<TwoDEcLevel>("M");
  const [pdf417Level, setPdf417Level] = useState(4);
  const [scale, setScale] = useState(4);
  const [padding, setPadding] = useState(4);
  const [foreground, setForeground] = useState("#000000");
  const [background, setBackground] = useState("#ffffff");
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState("");
  const [exportError, setExportError] = useState("");

  const meta = twoDMeta(format);

  const options: TwoDBuildOptions = useMemo(
    () => ({
      ecLevel,
      pdf417Level,
      scale,
      padding,
      foreground,
      background,
    }),
    [ecLevel, pdf417Level, scale, padding, foreground, background],
  );

  const result = useMemo(() => {
    if (!text.trim()) return null;
    return buildTwoD(format, text, options);
  }, [format, text, options]);

  const ratio = contrastRatio(foreground, background);
  const inverted = luminance(foreground) > luminance(background);

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  const baseName = `quickkit-${format}-${
    text
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "symbol"
  }`;

  const exportSvg = () => {
    if (!result?.ok) return;
    downloadBlob(
      new Blob([result.svg], { type: "image/svg+xml;charset=utf-8" }),
      `${baseName}.svg`,
    );
  };

  const exportRaster = async (mime: "image/png" | "image/jpeg") => {
    if (!result?.ok) return;
    setExportError("");
    setExporting(mime === "image/png" ? "png" : "jpeg");
    try {
      const { bytes } = await svgToRaster(result.svg, {
        scale: Math.min(8, Math.max(2, scale)),
        mime,
        background,
      });
      downloadBlob(
        new Blob([bytes as unknown as BlobPart], { type: mime }),
        `${baseName}.${mime === "image/png" ? "png" : "jpg"}`,
      );
    } catch (error) {
      setExportError(
        error instanceof Error
          ? error.message
          : "The image could not be rasterised in this browser.",
      );
    } finally {
      setExporting("");
    }
  };

  const exportPdf = async () => {
    if (!result?.ok) return;
    setExportError("");
    setExporting("pdf");
    try {
      const { bytes } = await svgToRaster(result.svg, {
        scale: 6,
        mime: "image/png",
      });
      const { PDFDocument } = await import("@cantoo/pdf-lib");
      const pdf = await PDFDocument.create();
      const image = await pdf.embedPng(bytes);
      // Fit the symbol into a 60 mm box with a 5 mm border, so a printout has a
      // predictable physical size regardless of the on-screen scale.
      const boxPt = (60 / 25.4) * 72;
      const marginPt = (5 / 25.4) * 72;
      const page = pdf.addPage([boxPt + marginPt * 2, boxPt + marginPt * 2]);
      const fit = Math.min(boxPt / image.width, boxPt / image.height);
      const width = image.width * fit;
      const height = image.height * fit;
      page.drawImage(image, {
        x: (page.getWidth() - width) / 2,
        y: (page.getHeight() - height) / 2,
        width,
        height,
      });
      const out = await pdf.save();
      downloadBlob(
        new Blob([out as unknown as BlobPart], { type: "application/pdf" }),
        `${baseName}.pdf`,
      );
    } catch {
      setExportError(
        "The PDF could not be assembled. The SVG export keeps the symbol vector-sharp, so use it if this keeps failing.",
      );
    } finally {
      setExporting("");
    }
  };

  return (
    <div className="bc-generate">
      <WorkspaceHeading
        title="2D symbols"
        description="QR, GS1 QR, Data Matrix and PDF417, built in the tab. Error correction, colours and quiet-zone padding are yours to set; the symbol size is read back from the encoder, not guessed."
      />

      <div className="bc-grid">
        <section className="qr-card" aria-labelledby="bc2d-format-heading">
          <div className="qr-card-head">
            <div>
              <h3 id="bc2d-format-heading">Symbol and data</h3>
              <p>{meta.blurb}</p>
            </div>
            <span className="qr-card-icon" aria-hidden="true">
              <QrCode size={15} />
            </span>
          </div>

          <div className="qr-fields">
            <div className="qr-field">
              <label htmlFor="bc2d-format">Symbol</label>
              <select
                id="bc2d-format"
                className="qr-input"
                value={format}
                onChange={(event) =>
                  setFormat(event.target.value as TwoDFormatId)
                }
              >
                {TWO_D_FORMATS.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="qr-field">
              <label htmlFor="bc2d-text">Content</label>
              <textarea
                id="bc2d-text"
                className="qr-input"
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder={meta.placeholder}
                spellCheck={false}
                rows={4}
              />
            </div>
          </div>

          <ul className="bc-notes">
            {meta.rules.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>

          <div className="qr-fields">
            {meta.ec === "qr" && (
              <div className="qr-field">
                <label htmlFor="bc2d-ec">Error correction</label>
                <select
                  id="bc2d-ec"
                  className="qr-input"
                  value={ecLevel}
                  onChange={(event) =>
                    setEcLevel(event.target.value as TwoDEcLevel)
                  }
                >
                  {EC_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {level}
                      {level === "L"
                        ? " — 7% recovery"
                        : level === "M"
                          ? " — 15% recovery"
                          : level === "Q"
                            ? " — 25% recovery"
                            : " — 30% recovery"}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {meta.ec === "pdf417" && (
              <div className="qr-field">
                <label htmlFor="bc2d-pdf417">
                  PDF417 error correction (0–8)
                </label>
                <input
                  id="bc2d-pdf417"
                  type="range"
                  min={0}
                  max={8}
                  step={1}
                  value={pdf417Level}
                  onChange={(event) =>
                    setPdf417Level(Number(event.target.value))
                  }
                />
                <p className="help">
                  Level {pdf417Level}: more correction survives more damage, and
                  takes more space.
                </p>
              </div>
            )}

            <div className="qr-field">
              <label htmlFor="bc2d-scale">Scale</label>
              <input
                id="bc2d-scale"
                type="range"
                min={1}
                max={10}
                step={1}
                value={scale}
                onChange={(event) => setScale(Number(event.target.value))}
              />
              <p className="help">{scale}× module scale.</p>
            </div>

            <div className="qr-field">
              <label htmlFor="bc2d-padding">Quiet-zone padding</label>
              <input
                id="bc2d-padding"
                type="range"
                min={0}
                max={20}
                step={1}
                value={padding}
                onChange={(event) => setPadding(Number(event.target.value))}
              />
              <p className="help">
                {padding} modules of padding around the symbol.
              </p>
            </div>
          </div>

          <div className="qr-fields">
            <div className="qr-field">
              <label htmlFor="bc2d-fg">Foreground</label>
              <input
                id="bc2d-fg"
                type="color"
                className="qr-input"
                value={foreground}
                onChange={(event) => setForeground(event.target.value)}
              />
            </div>
            <div className="qr-field">
              <label htmlFor="bc2d-bg">Background</label>
              <input
                id="bc2d-bg"
                type="color"
                className="qr-input"
                value={background}
                onChange={(event) => setBackground(event.target.value)}
              />
            </div>
          </div>

          {ratio < 4.5 && (
            <p className="bc-notes" role="status">
              <AlertTriangle size={13} aria-hidden="true" /> Contrast is{" "}
              {ratio.toFixed(1)}:1. Under 4.5:1 a phone camera starts failing in
              ordinary light; 7:1 or better is safer for a printed symbol.
            </p>
          )}
          {inverted && (
            <p className="bc-notes" role="status">
              <AlertTriangle size={13} aria-hidden="true" /> The foreground is
              lighter than the background. Many decoders reject an inverted
              symbol, so print it dark-on-light.
            </p>
          )}
        </section>

        <section className="qr-card" aria-labelledby="bc2d-preview-heading">
          <div className="qr-card-head">
            <div>
              <h3 id="bc2d-preview-heading">Preview and export</h3>
              <p>
                {result?.ok
                  ? `${result.format.toUpperCase()} · ${Math.round(result.width)} × ${Math.round(
                      result.height,
                    )} px at the chosen scale`
                  : "Nothing to preview yet."}
              </p>
            </div>
            <div className="qr-card-action">
              <button
                type="button"
                className="qr-mini-button"
                onClick={copyText}
              >
                <ClipboardCopy size={12} aria-hidden="true" />
                {copied ? "Copied" : "Copy data"}
              </button>
            </div>
          </div>

          {result && !result.ok && (
            <p className="qr-field-error" role="alert">
              {result.problems[0]?.message}
            </p>
          )}

          {result?.ok && (
            <>
              <div
                className="bc-2d-preview"
                style={{
                  display: "grid",
                  placeItems: "center",
                  padding: 12,
                  background: "#fff",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                }}
                // The SVG is generated locally from validated input; bwip-js
                // emits no script and no external references.
                dangerouslySetInnerHTML={{ __html: result.svg }}
              />
              <p className="bc-notes">
                Human-readable text is not part of a 2D symbol: put the number
                under the code yourself when a person needs to read it.
              </p>
            </>
          )}
          {!text.trim() && (
            <p className="bc-notes">Enter some content to build the symbol.</p>
          )}

          {exportError && (
            <p className="qr-field-error" role="alert">
              {exportError}
            </p>
          )}

          <div className="bc-actions">
            <button
              type="button"
              className="qr-inline-button"
              onClick={exportSvg}
              disabled={!result?.ok}
            >
              <FileCode2 size={13} aria-hidden="true" /> SVG
            </button>
            <button
              type="button"
              className="qr-inline-button"
              onClick={() => void exportRaster("image/png")}
              disabled={!result?.ok || exporting !== ""}
            >
              <FileImage size={13} aria-hidden="true" /> PNG
            </button>
            <button
              type="button"
              className="qr-inline-button"
              onClick={() => void exportRaster("image/jpeg")}
              disabled={!result?.ok || exporting !== ""}
            >
              <FileImage size={13} aria-hidden="true" /> JPEG
            </button>
            <button
              type="button"
              className="qr-inline-button"
              onClick={() => void exportPdf()}
              disabled={!result?.ok || exporting !== ""}
            >
              <FileText size={13} aria-hidden="true" /> PDF
            </button>
            {exporting && (
              <span className="help">
                <Download size={12} aria-hidden="true" /> Preparing{" "}
                {exporting.toUpperCase()}…
              </span>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
