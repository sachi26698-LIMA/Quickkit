"use client";
/**
 * DOWNLOAD — the format row under the preview. Real files, honest names, each
 * one gated on a completed decode of these exact pixels: no format is offered
 * for a code that has not been read back, and nothing is faked while waiting.
 */
import {
  Copy,
  Download,
  FileArchive,
  FileText,
  Image as ImageIcon,
  Maximize2,
  Printer,
  Share2,
} from "lucide-react";
import { PAPER_SIZES, qrFilename, type QrPaper } from "@/lib/tools/qr/export";
import { QrDisclosure, QrRange, QrToggle } from "./shared";
import type { QrStudio } from "./use-qr-studio";

export default function ExportPanel({ studio }: { studio: QrStudio }) {
  const {
    output,
    design,
    label,
    typeId,
    pdfOptions,
    setPdfOptions,
    payloadResult,
  } = studio;
  const verified = Boolean(output?.verification?.ok);
  const blocked = output !== null && !verified;
  const ready = Boolean(output) && verified;
  const bytes = output?.png?.length ?? 0;

  const name = (ext: "png" | "svg" | "pdf", size?: number, suffix?: string) =>
    qrFilename({ label, typeId, ext, size, suffix });

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
          title={
            ready
              ? `Save the verified ${design.size} px PNG`
              : "Blocked until this exact code has been decoded"
          }
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
          disabled={!payloadResult.ok || studio.busy !== null}
          title="Re-renders at 2048 px and re-verifies before saving"
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
          title={
            ready
              ? "Save the SVG vector file"
              : "Blocked until this exact code has been decoded"
          }
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
          title={
            ready
              ? "Save the printable PDF page"
              : "Blocked until this exact code has been decoded"
          }
        >
          <Printer size={15} aria-hidden="true" />
          <strong>PDF</strong>
          <small>
            {pdfOptions.paper === "letter"
              ? "Letter"
              : pdfOptions.paper === "square"
                ? "60 mm"
                : pdfOptions.paper === "fit"
                  ? "cropped"
                  : "A4"}
          </small>
        </button>
      </div>

      {blocked ? (
        <p className="qr-blocked" role="alert">
          Downloads stay locked while the decode check fails.{" "}
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
              <code>{name("pdf", undefined, pdfOptions.paper)}</code>
            </li>
          </ul>
        </div>

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
          <QrToggle
            id="qr-pdf-caption"
            label="Print a caption under the code"
            hint={`Adds “${label}” in Helvetica — no dates, no tracking data.`}
            checked={pdfOptions.caption !== null}
            onChange={(on) =>
              setPdfOptions({ ...pdfOptions, caption: on ? "" : null })
            }
          />
        </div>

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
