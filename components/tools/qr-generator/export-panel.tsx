"use client";
/**
 * DOWNLOAD — the format row under the preview. Real files, honest names, each
 * one gated on a completed decode of these exact pixels: no format is offered
 * for a code that has not been read back, and nothing is faked while waiting.
 */
import { useState } from "react";
import {
  Copy,
  Download,
  FileArchive,
  FileText,
  Image as ImageIcon,
  LayoutGrid,
  Maximize2,
  Printer,
  Share2,
} from "lucide-react";
import { PAPER_SIZES, qrFilename, type QrPaper } from "@/lib/tools/qr/export";
import {
  PRINT_LAYOUTS,
  clampSheet,
  printLayoutDef,
  type QrPrintLayoutId,
} from "@/lib/tools/qr/layouts";
import { QrDisclosure, QrRange, QrToggle } from "./shared";
import type { QrStudio } from "./use-qr-studio";

const DPI_OPTIONS = [72, 150, 300, 600];

export default function ExportPanel({ studio }: { studio: QrStudio }) {
  const {
    output,
    design,
    label,
    typeId,
    pdfOptions,
    setPdfOptions,
    pngDpi,
    setPngDpi,
    printLayout,
    setPrintLayout,
    sheet,
    setSheet,
    payloadResult,
  } = studio;
  const [customPx, setCustomPx] = useState(1024);
  const layoutDef = printLayoutDef(printLayout);
  const verified = Boolean(output?.verification?.ok);
  // The preview panel already promises "export is blocked" when its own safety
  // audit fails — a zero quiet zone, for instance, decodes here but not in the
  // field — so the download row has to honour the same verdict, not only the
  // decode result. Otherwise the badge and the buttons disagree.
  const safetyBlocked = output?.safety?.level === "blocked";
  const blocked = (output !== null && !verified) || safetyBlocked;
  const ready = Boolean(output) && verified && !safetyBlocked;
  const bytes = output?.png?.length ?? 0;

  const name = (ext: "png" | "svg" | "pdf", size?: number, suffix?: string) =>
    qrFilename({ label, typeId, ext, size, suffix });

  const lockReason =
    blocked && safetyBlocked
      ? "Blocked by the safety audit under the preview"
      : "Blocked until this exact code has been decoded";

  return (
    <div className="qr-download" id="qr-export">
      <div className="qr-download-head">
        <span className="qr-block-label">Download</span>
        <span
          className={
            ready ? "qr-badge good" : blocked ? "qr-badge bad" : "qr-badge idle"
          }
        >
          {ready ? "verified" : blocked ? "blocked" : "pending"}
          {bytes ? ` · ${Math.round(bytes / 1024)} KB` : ""}
        </span>
      </div>

      <div className="qr-formats">
        <button
          type="button"
          className="primary qr-format"
          onClick={() => void studio.exportPng()}
          disabled={!ready}
          title={ready ? `Save the verified ${design.size} px PNG` : lockReason}
        >
          <ImageIcon size={15} aria-hidden="true" />
          <strong>PNG</strong>
          <small>
            {design.size} px{design.transparent ? " · transparent" : ""}
          </small>
        </button>
        <button
          type="button"
          className="secondary qr-format"
          onClick={() => void studio.exportPng(2048)}
          disabled={!payloadResult.ok || safetyBlocked || studio.busy !== null}
          title={
            safetyBlocked
              ? lockReason
              : "Re-renders at 2048 px and re-verifies before saving"
          }
        >
          <Maximize2 size={15} aria-hidden="true" />
          <strong>High-res PNG</strong>
          <small>2048 px · print</small>
        </button>
        <button
          type="button"
          className="secondary qr-format"
          onClick={() => void studio.exportSvg()}
          disabled={!ready}
          title={ready ? "Save the SVG vector file" : lockReason}
        >
          <FileText size={15} aria-hidden="true" />
          <strong>SVG</strong>
          <small>vector</small>
        </button>
        <button
          type="button"
          className="secondary qr-format"
          onClick={() => void studio.exportPdf()}
          disabled={!ready}
          title={ready ? "Save the printable PDF page" : lockReason}
        >
          <Printer size={15} aria-hidden="true" />
          <strong>PDF</strong>
          <small>
            {printLayout === "single"
              ? pdfOptions.paper === "letter"
                ? "Letter"
                : pdfOptions.paper === "square"
                  ? "60 mm"
                  : pdfOptions.paper === "fit"
                    ? "cropped"
                    : "A4"
              : printLayout === "a4-sheet"
                ? `${sheet.cols}×${sheet.rows} sheet`
                : layoutDef.name}
          </small>
        </button>
      </div>

      {blocked ? (
        <p className="qr-blocked" role="alert">
          {safetyBlocked && verified
            ? `Downloads stay locked while the safety audit blocks this code: ${
                output?.safety?.findings.find(
                  (finding) => finding.level === "blocked",
                )?.message ?? "the styling is too risky to hand out."
              } `
            : "Downloads stay locked while the decode check fails. "}
          {output?.verification?.message}
        </p>
      ) : null}

      <QrDisclosure
        level="sub"
        id="qr-export-more"
        title="Copy, share and file details"
        hint="Clipboard copy, a shareable link, PDF page setup and the exact file names."
        icon={<Download size={14} />}
      >
        <div className="qr-export-actions">
          <button
            type="button"
            className="secondary"
            onClick={() => void studio.copyImage()}
            disabled={!ready}
          >
            <Copy size={14} /> Copy PNG
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() => void studio.shareLink()}
            disabled={!payloadResult.ok}
          >
            <Share2 size={14} /> Share link
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() =>
              void studio.savePreset(
                label === studio.def.label
                  ? `${studio.def.label} design`
                  : `${label} design`,
              )
            }
          >
            <FileArchive size={14} /> Save as preset
          </button>
        </div>

        <div className="qr-filenames" aria-label="File names that will be used">
          <span className="qr-block-label">File names</span>
          <ul>
            <li>
              <code>{name("png", design.size)}</code>
            </li>
            <li>
              <code>{name("png", 2048, "hi-res")}</code>
            </li>
            <li>
              <code>{name("svg", undefined, "vector")}</code>
            </li>
            <li>
              <code>{name("pdf", undefined, printLayout)}</code>
            </li>
          </ul>
        </div>

        <span className="qr-block-label">PNG options</span>
        <div className="qr-pdf-grid">
          <div className="qr-field half">
            <label htmlFor="qr-png-dpi">Print resolution (DPI metadata)</label>
            <select
              id="qr-png-dpi"
              value={pngDpi}
              onChange={(event) => setPngDpi(Number(event.target.value))}
            >
              {DPI_OPTIONS.map((dpi) => (
                <option key={dpi} value={dpi}>
                  {dpi} DPI
                  {dpi === 300 ? " · print" : dpi === 72 ? " · screen" : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="qr-field half">
            <label htmlFor="qr-png-custom">Custom size (px)</label>
            <div className="qr-custom-px">
              <input
                id="qr-png-custom"
                type="number"
                className="qr-input"
                min={64}
                max={4096}
                step={1}
                value={customPx}
                onChange={(event) => setCustomPx(Number(event.target.value))}
              />
              <button
                type="button"
                className="secondary qr-mini-button"
                disabled={
                  !payloadResult.ok ||
                  safetyBlocked ||
                  studio.busy !== null ||
                  !Number.isFinite(customPx) ||
                  customPx < 64 ||
                  customPx > 4096
                }
                onClick={() =>
                  void studio.exportPng(
                    Math.round(Math.min(4096, Math.max(64, customPx))),
                  )
                }
                title="Re-renders at this size and re-verifies before saving"
              >
                <Maximize2 size={13} /> Export
              </button>
            </div>
          </div>
        </div>
        <p className="help">
          DPI is written into the PNG as metadata (the pixels are unchanged and
          stay decode-verified). 300 DPI suits print; a custom size re-renders
          and re-checks the code before saving.
        </p>

        <span className="qr-block-label">
          <LayoutGrid size={13} aria-hidden="true" /> Print layout
        </span>
        <div className="qr-field">
          <label htmlFor="qr-print-layout">PDF layout</label>
          <select
            id="qr-print-layout"
            value={printLayout}
            onChange={(event) =>
              setPrintLayout(event.target.value as QrPrintLayoutId)
            }
          >
            {PRINT_LAYOUTS.map((layout) => (
              <option key={layout.id} value={layout.id}>
                {layout.name}
              </option>
            ))}
          </select>
          <p className="qr-field-hint">{layoutDef.blurb}</p>
        </div>

        {printLayout === "a4-sheet" && (
          <div className="qr-pdf-grid">
            <QrRange
              id="qr-sheet-cols"
              label="Columns"
              value={sheet.cols}
              min={1}
              max={6}
              onChange={(cols) => setSheet(clampSheet({ ...sheet, cols }))}
            />
            <QrRange
              id="qr-sheet-rows"
              label="Rows"
              value={sheet.rows}
              min={1}
              max={8}
              onChange={(rows) => setSheet(clampSheet({ ...sheet, rows }))}
            />
            <QrRange
              id="qr-sheet-code"
              label="Code width"
              value={sheet.codeMm}
              min={12}
              max={90}
              suffix=" mm"
              onChange={(codeMm) => setSheet(clampSheet({ ...sheet, codeMm }))}
            />
            <QrRange
              id="qr-sheet-gap"
              label="Gap"
              value={sheet.gapMm}
              min={0}
              max={15}
              suffix=" mm"
              onChange={(gapMm) => setSheet(clampSheet({ ...sheet, gapMm }))}
            />
          </div>
        )}

        {printLayout !== "single" && printLayout !== "a4-sheet" && (
          <p className="help">
            {layoutDef.name} prints on a fixed {layoutDef.pageMm?.w} ×{" "}
            {layoutDef.pageMm?.h} mm page with a {layoutDef.codeMm} mm code. The
            caption toggle below still applies.
          </p>
        )}

        {printLayout === "single" && (
          <>
            <span className="qr-block-label">PDF page</span>
            <div className="qr-pdf-grid">
              <div className="qr-field half">
                <label htmlFor="qr-pdf-paper">Paper</label>
                <select
                  id="qr-pdf-paper"
                  value={pdfOptions.paper}
                  onChange={(event) =>
                    setPdfOptions({
                      ...pdfOptions,
                      paper: event.target.value as QrPaper,
                    })
                  }
                >
                  {Object.entries(PAPER_SIZES).map(([id, paper]) => (
                    <option key={id} value={id}>
                      {paper.label}
                    </option>
                  ))}
                </select>
              </div>
              <QrRange
                id="qr-pdf-size"
                label="Printed code width"
                value={pdfOptions.sizeMm}
                min={15}
                max={160}
                suffix=" mm"
                onChange={(sizeMm) => setPdfOptions({ ...pdfOptions, sizeMm })}
              />
              <QrRange
                id="qr-pdf-pad"
                label="Page padding"
                value={pdfOptions.paddingMm}
                min={0}
                max={25}
                suffix=" mm"
                onChange={(paddingMm) =>
                  setPdfOptions({ ...pdfOptions, paddingMm })
                }
              />
            </div>
          </>
        )}

        <QrToggle
          id="qr-pdf-caption"
          label="Print a caption with the code"
          hint={`Adds “${label}” in Helvetica — no dates, no tracking data.`}
          checked={pdfOptions.caption !== null}
          onChange={(on) =>
            setPdfOptions({ ...pdfOptions, caption: on ? "" : null })
          }
        />

        <p className="help">
          The share link carries your content in the URL fragment after “#”,
          which browsers never send to a server. Anyone you send it to can read
          it — do not use it for private data. A transparent PNG exports with
          alpha; a PDF always has a page behind the code.
        </p>
      </QrDisclosure>
    </div>
  );
}
