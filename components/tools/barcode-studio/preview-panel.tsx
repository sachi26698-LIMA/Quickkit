"use client";
/**
 * The preview column: the symbol, what it measured, whether it still scans, and
 * every way out of the tool (PNG, SVG, PDF, print, clipboard).
 */
import { useState } from "react";
import {
  BadgeCheck,
  Copy,
  Download,
  FileText,
  Loader2,
  Printer,
  ScanBarcode,
  TriangleAlert,
} from "lucide-react";
import { svgDataUri } from "@/lib/tools/barcode/svg";
import { layoutMillimetres } from "@/lib/tools/barcode/layout";
import { formatMeta } from "@/lib/tools/barcode/formats";
import {
  BARCODE_PAPERS,
  DEFAULT_LABEL_SIZE,
  planSheet,
  type BarcodePaper,
} from "@/lib/tools/barcode/pdf";
import { barcodeFilename } from "@/lib/tools/barcode/export";
import { EmptyState } from "../tool-ui";
import type { useBarcodeStudio } from "./use-barcode-studio";

type Studio = ReturnType<typeof useBarcodeStudio>;

export default function PreviewPanel({ studio }: { studio: Studio }) {
  const { settings, result, layout, svg, verification, checking, busy } =
    studio;
  const meta = formatMeta(settings.format);
  const [paper, setPaper] = useState<BarcodePaper>("a4");
  const [labelWidth, setLabelWidth] = useState(DEFAULT_LABEL_SIZE.widthMm);
  const [labelHeight, setLabelHeight] = useState(DEFAULT_LABEL_SIZE.heightMm);
  const [whiteBackground, setWhiteBackground] = useState(true);
  const [pdfBusy, setPdfBusy] = useState(false);

  const mm = layout ? layoutMillimetres(layout, 300) : null;
  const sheet = planSheet(1, {
    paper,
    label: { widthMm: labelWidth, heightMm: labelHeight },
    marginMm: 10,
    gapMm: 4,
    whiteBackground,
    render: {},
  });

  const downloadPdf = async () => {
    if (!result.ok && !layout) return;
    if (!result.ok) return;
    setPdfBusy(true);
    try {
      const [{ createBarcodePdf }, { downloadBlob: save }] = await Promise.all([
        import("@/lib/tools/barcode/pdf"),
        import("@/lib/tools/download"),
      ]);
      const bytes = await createBarcodePdf(
        [
          {
            spec: result.spec,
            title: settings.title,
            description: settings.description,
          },
        ],
        {
          paper,
          label: { widthMm: labelWidth, heightMm: labelHeight },
          marginMm: 10,
          gapMm: 4,
          whiteBackground,
          render: {
            moduleWidth: settings.moduleWidth,
            barHeight: settings.barHeight,
            quietZone: settings.quietZone,
            margin: settings.margin,
            foreground: settings.foreground,
            background: settings.background,
            transparent: false,
            showText: settings.showText,
            fontFamily: settings.fontFamily,
            fontSize: settings.fontSize,
            textAlign: settings.textAlign,
            title: settings.title,
            description: settings.description,
          },
        },
      );
      save(
        new Blob([bytes as unknown as BlobPart], { type: "application/pdf" }),
        barcodeFilename({
          format: settings.format,
          value: result.spec.value,
          ext: "pdf",
          suffix: `${labelWidth}x${labelHeight}mm`,
        }),
      );
      studio.setFlash({
        kind: "success",
        text: `PDF saved — ${labelWidth} × ${labelHeight} mm label${paper === "fit" ? "" : ` on ${BARCODE_PAPERS[paper].label}`}.`,
      });
    } catch (error) {
      studio.setFlash({
        kind: "error",
        text:
          error instanceof Error
            ? error.message
            : "The PDF could not be created.",
      });
    } finally {
      setPdfBusy(false);
    }
  };

  const copySvg = async () => {
    if (!svg) return;
    try {
      await navigator.clipboard.writeText(svg);
      studio.setFlash({
        kind: "success",
        text: "SVG markup copied to the clipboard.",
      });
    } catch {
      studio.setFlash({
        kind: "error",
        text: "The clipboard is blocked in this browser. Use Download SVG instead.",
      });
    }
  };

  return (
    <section
      className="qr-card bc-preview-card"
      aria-labelledby="bc-preview-heading"
    >
      <div className="qr-card-head">
        <div>
          <h3 id="bc-preview-heading">Live preview</h3>
          <p>
            {result.ok
              ? `${meta.name} · ${result.spec.modules} modules`
              : "Nothing to draw yet — fix the data above."}
          </p>
        </div>
        {verification ? (
          <span className={verification.ok ? "qr-badge good" : "qr-badge bad"}>
            <BadgeCheck size={12} aria-hidden="true" />
            {verification.ok ? "Scans" : "Not scannable"}
          </span>
        ) : null}
      </div>

      <div
        className={
          settings.transparent
            ? "bc-preview-stage transparent"
            : "bc-preview-stage"
        }
      >
        {svg && layout ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            className="bc-preview-img"
            src={svgDataUri(svg)}
            width={layout.width}
            height={layout.height}
            alt={`${meta.name} barcode encoding ${result.ok ? result.spec.display : ""}`}
            decoding="async"
          />
        ) : (
          <EmptyState icon={<ScanBarcode size={26} aria-hidden="true" />}>
            Enter valid data for {meta.name} and the barcode appears here.
          </EmptyState>
        )}
      </div>

      {layout && result.ok ? (
        <dl className="bc-meta">
          <div>
            <dt>Symbol</dt>
            <dd>
              {layout.width} × {layout.height} px
            </dd>
          </div>
          <div>
            <dt>Quiet zone</dt>
            <dd>
              {layout.quietLeft} / {layout.quietRight} modules
            </dd>
          </div>
          <div>
            <dt>At 300 dpi</dt>
            <dd>
              {mm?.width.toFixed(1)} × {mm?.height.toFixed(1)} mm
            </dd>
          </div>
          <div>
            <dt>Narrow bar</dt>
            <dd>{mm ? `${mm.module.toFixed(2)} mm` : "—"}</dd>
          </div>
        </dl>
      ) : null}

      {verification ? (
        <div className={verification.ok ? "qr-verdict" : "qr-verdict warn"}>
          {verification.ok ? (
            <BadgeCheck size={16} aria-hidden="true" />
          ) : (
            <TriangleAlert size={16} aria-hidden="true" />
          )}
          <div>
            <strong>
              {verification.ok
                ? `Decoded independently as ${verification.format}`
                : "The decoder could not read this symbol"}
            </strong>
            <p>{verification.message}</p>
            <p className="qr-verdict-hint">
              Tried: {verification.attempts.slice(0, 6).join(", ")}
            </p>
          </div>
        </div>
      ) : null}

      <div className="bc-actions">
        <button
          type="button"
          className="primary"
          onClick={studio.downloadPng}
          disabled={!result.ok || busy === "png"}
        >
          {busy === "png" ? (
            <Loader2 size={15} className="qr-spin" aria-hidden="true" />
          ) : (
            <Download size={15} aria-hidden="true" />
          )}
          PNG
        </button>
        <button
          type="button"
          className="secondary"
          onClick={studio.downloadJpeg}
          disabled={!result.ok || busy === "jpeg"}
        >
          {busy === "jpeg" ? (
            <Loader2 size={15} className="qr-spin" aria-hidden="true" />
          ) : (
            <Download size={15} aria-hidden="true" />
          )}
          JPEG
        </button>
        <button
          type="button"
          className="secondary"
          onClick={studio.downloadSvg}
          disabled={!result.ok}
        >
          <Download size={15} aria-hidden="true" /> SVG
        </button>
        <button
          type="button"
          className="secondary"
          onClick={downloadPdf}
          disabled={!result.ok || pdfBusy}
        >
          {pdfBusy ? (
            <Loader2 size={15} className="qr-spin" aria-hidden="true" />
          ) : (
            <FileText size={15} aria-hidden="true" />
          )}
          PDF
        </button>
        <button
          type="button"
          className="secondary"
          onClick={studio.printLabel}
          disabled={!result.ok}
        >
          <Printer size={15} aria-hidden="true" /> Print
        </button>
        <button
          type="button"
          className="secondary"
          onClick={studio.checkScan}
          disabled={!result.ok || checking || !meta.scannable}
          title={
            meta.scannable
              ? "Decode the rendered bars with an independent reader"
              : `${meta.name} cannot be decoded by the bundled reader`
          }
        >
          {checking ? (
            <Loader2 size={15} className="qr-spin" aria-hidden="true" />
          ) : (
            <ScanBarcode size={15} aria-hidden="true" />
          )}
          Check it scans
        </button>
        <button
          type="button"
          className="qr-mini-button"
          onClick={copySvg}
          disabled={!svg}
        >
          <Copy size={13} aria-hidden="true" /> Copy SVG
        </button>
      </div>

      <details className="bc-print-options">
        <summary>PDF label and paper</summary>
        <div className="bc-grid">
          <div className="qr-field">
            <label htmlFor="bc-paper">Paper</label>
            <select
              id="bc-paper"
              className="qr-input"
              value={paper}
              onChange={(event) => setPaper(event.target.value as BarcodePaper)}
            >
              {Object.entries(BARCODE_PAPERS).map(([id, entry]) => (
                <option key={id} value={id}>
                  {entry.label}
                </option>
              ))}
            </select>
          </div>
          <div className="qr-field">
            <label htmlFor="bc-label-w">Label width — {labelWidth} mm</label>
            <input
              id="bc-label-w"
              type="range"
              min={15}
              max={180}
              step={1}
              value={labelWidth}
              onChange={(event) => setLabelWidth(Number(event.target.value))}
            />
          </div>
          <div className="qr-field">
            <label htmlFor="bc-label-h">Label height — {labelHeight} mm</label>
            <input
              id="bc-label-h"
              type="range"
              min={10}
              max={120}
              step={1}
              value={labelHeight}
              onChange={(event) => setLabelHeight(Number(event.target.value))}
            />
          </div>
        </div>
        <label className="checkbox qr-toggle">
          <input
            type="checkbox"
            checked={whiteBackground}
            onChange={(event) => setWhiteBackground(event.target.checked)}
          />
          <span>
            Print an opaque white background
            <small>
              Keep this on for coloured or kraft stock: bars printed on the
              label colour lose contrast.
            </small>
          </span>
        </label>
        <p className="help">
          {paper === "fit"
            ? "One page per label, exactly the label size."
            : `${sheet.columns} column${sheet.columns === 1 ? "" : "s"} × ${sheet.rows} row${sheet.rows === 1 ? "" : "s"} per sheet (${sheet.perPage} labels).`}{" "}
          Bars are drawn as vectors, so the printed edge is as sharp as the
          printer allows.
        </p>
      </details>

      <p className="qr-privacy-foot">
        The preview is an SVG built in this tab. Downloads are generated from
        the same geometry, so the file you save carries the symbol you just
        checked.
      </p>
    </section>
  );
}
