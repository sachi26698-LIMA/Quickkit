"use client";
import { useState } from "react";
import {
  AlertTriangle,
  Check,
  ClipboardCopy,
  Download,
  FileArchive,
  FileJson,
  FileSpreadsheet,
  FileText,
  FileType2,
  Loader2,
} from "lucide-react";
import {
  EXPORT_FORMATS,
  type ExportFormat,
  type OcrDocumentSection,
} from "@/lib/tools/image-to-text/types";
import {
  buildExport,
  buildZip,
  safeFilename,
  type BatchFile,
} from "@/lib/tools/image-to-text/export";
import { downloadBlob, downloadText } from "@/lib/tools/download";

const ICONS: Record<ExportFormat, typeof FileText> = {
  txt: FileText,
  docx: FileType2,
  pdf: FileText,
  csv: FileSpreadsheet,
  json: FileJson,
};

export type ExportScope = "combined" | "active" | "pages" | "each";

export default function ExportPanel({
  sections,
  activeId,
  selectedPages,
  documentTitle,
  settingsSnapshot,
  disabled,
  onCopyAll,
}: {
  sections: OcrDocumentSection[];
  activeId: string | null;
  selectedPages: Set<string>;
  documentTitle: string;
  settingsSnapshot: unknown;
  disabled: boolean;
  onCopyAll: () => void;
}) {
  const [scope, setScope] = useState<ExportScope>("combined");
  const [includeHeaders, setIncludeHeaders] = useState(false);
  const [includeGeometry, setIncludeGeometry] = useState(false);
  const [busy, setBusy] = useState<ExportFormat | "zip" | null>(null);
  const [report, setReport] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const active = sections.find((section) => section.id === activeId) ?? null;
  const chosen = sections.filter((section) => selectedPages.has(section.id));

  const sectionsForScope = (): OcrDocumentSection[] => {
    if (scope === "active") return active ? [active] : [];
    if (scope === "pages" || scope === "each") return chosen;
    return sections;
  };

  const scopeLabel = () => {
    if (scope === "active") return active ? `“${active.title}”` : "no page";
    if (scope === "pages") return `${chosen.length} selected page(s)`;
    if (scope === "each") return "one file per page";
    return `${sections.length} page(s) combined`;
  };

  const runExport = async (format: ExportFormat) => {
    setError(null);
    setReport(null);
    const target = sectionsForScope();
    if (!target.length) {
      setError(
        scope === "active"
          ? "No page is open in the editor yet."
          : "No pages are selected for export.",
      );
      return;
    }
    setBusy(format);
    try {
      if (scope === "each" && format !== "csv") {
        const files: BatchFile[] = [];
        for (const section of target) {
          const built = await buildExport(format, [section], {
            combined: false,
            includeHeaders: false,
            includeGeometry,
            settings: settingsSnapshot,
            documentTitle,
          });
          files.push(...built.files);
        }
        if (files.length === 1) {
          const [only] = files;
          if (only.bytes)
            downloadBlob(
              new Blob([only.bytes as unknown as BlobPart]),
              only.name,
            );
          else if (only.blob) downloadBlob(only.blob, only.name);
          else downloadText(only.text ?? "", only.name);
        } else {
          downloadBlob(
            await buildZip(files),
            `${safeFilename(documentTitle)}-ocr.zip`,
          );
        }
        setReport(`${files.length} file(s) · ${scopeLabel()}`);
        return;
      }
      const built = await buildExport(format, target, {
        combined: scope === "combined",
        includeHeaders,
        includeGeometry,
        settings: settingsSnapshot,
        documentTitle,
      });
      if (built.files.length === 1 && scope !== "pages") {
        const [only] = built.files;
        if (only.bytes)
          downloadBlob(
            new Blob([only.bytes as unknown as BlobPart]),
            only.name,
          );
        else if (only.blob) downloadBlob(only.blob, only.name);
        else downloadText(only.text ?? "", only.name);
      } else {
        downloadBlob(
          await buildZip(built.files),
          `${safeFilename(documentTitle)}-${format}.zip`,
        );
      }
      setReport(`${built.summary} · ${scopeLabel()}`);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "That export could not be created.",
      );
    } finally {
      setBusy(null);
    }
  };

  const csvDisabled = !sections.some(
    (section) => section.extraction.tables.length,
  );

  return (
    <section className="i2t-export" aria-labelledby="i2t-export-title">
      <div className="i2t-card-head">
        <h3 id="i2t-export-title">
          <Download size={16} aria-hidden="true" /> Export
        </h3>
        <span className="i2t-badge">{scopeLabel()}</span>
      </div>

      <div
        className="i2t-export-scope"
        role="radiogroup"
        aria-label="Export scope"
      >
        {(
          [
            ["combined", "Combined document"],
            ["active", "This page"],
            ["pages", "Selected pages"],
            ["each", "One file per page"],
          ] as const
        ).map(([value, label]) => (
          <label key={value} className={scope === value ? "is-active" : ""}>
            <input
              type="radio"
              name="i2t-scope"
              checked={scope === value}
              onChange={() => setScope(value)}
            />
            {label}
          </label>
        ))}
      </div>

      <div className="i2t-export-options">
        <label>
          <input
            type="checkbox"
            checked={includeHeaders}
            onChange={(event) => setIncludeHeaders(event.target.checked)}
          />
          Add page headings
        </label>
        <label>
          <input
            type="checkbox"
            checked={includeGeometry}
            onChange={(event) => setIncludeGeometry(event.target.checked)}
          />
          JSON: include word positions
        </label>
      </div>

      <div className="i2t-export-grid">
        {EXPORT_FORMATS.map((format) => {
          const Icon = ICONS[format.id];
          const unavailable = format.id === "csv" && csvDisabled;
          return (
            <button
              key={format.id}
              type="button"
              className="i2t-export-btn"
              disabled={disabled || busy !== null || unavailable}
              onClick={() => void runExport(format.id)}
              title={
                unavailable
                  ? "No tables were found — choose Table Extraction and read again"
                  : format.hint
              }
            >
              {busy === format.id ? (
                <Loader2 size={16} className="spin" aria-hidden="true" />
              ) : (
                <Icon size={16} aria-hidden="true" />
              )}
              <span>
                <strong>{format.label}</strong>
                <small>{unavailable ? "no tables found" : format.hint}</small>
              </span>
            </button>
          );
        })}
        <button
          type="button"
          className="i2t-export-btn"
          disabled={disabled || busy !== null}
          onClick={onCopyAll}
        >
          <ClipboardCopy size={16} aria-hidden="true" />
          <span>
            <strong>Copy</strong>
            <small>All text to clipboard</small>
          </span>
        </button>
        <button
          type="button"
          className="i2t-export-btn"
          disabled={disabled || busy !== null || sections.length < 2}
          onClick={async () => {
            setBusy("zip");
            setError(null);
            try {
              const built = await buildExport("txt", sections, {
                combined: false,
                includeHeaders: true,
                includeGeometry: false,
                settings: settingsSnapshot,
                documentTitle,
              });
              const text = await buildExport("json", sections, {
                combined: false,
                includeHeaders: false,
                includeGeometry: includeGeometry,
                settings: settingsSnapshot,
                documentTitle,
              });
              const files: BatchFile[] = [
                ...built.files.map((file) => ({
                  ...file,
                  name: `${safeFilename(documentTitle)}.txt`,
                })),
                ...text.files.map((file) => ({
                  ...file,
                  name: `${safeFilename(documentTitle)}.json`,
                })),
              ];
              downloadBlob(
                await buildZip(files),
                `${safeFilename(documentTitle)}-batch.zip`,
              );
              setReport(`Batch archive · ${sections.length} page(s)`);
            } catch (cause) {
              setError(
                cause instanceof Error ? cause.message : "Batch export failed.",
              );
            } finally {
              setBusy(null);
            }
          }}
          title="TXT + JSON for the whole batch in one ZIP"
        >
          {busy === "zip" ? (
            <Loader2 size={16} className="spin" aria-hidden="true" />
          ) : (
            <FileArchive size={16} aria-hidden="true" />
          )}
          <span>
            <strong>ZIP</strong>
            <small>Batch archive (TXT + JSON)</small>
          </span>
        </button>
      </div>

      {report && (
        <p className="i2t-export-report" role="status">
          <Check size={14} aria-hidden="true" /> {report}
        </p>
      )}
      {error && (
        <p className="i2t-export-report error" role="alert">
          <AlertTriangle size={14} aria-hidden="true" /> {error}
        </p>
      )}
      <p className="i2t-help">
        Exports are built here in your browser. DOCX keeps headings and real
        tables editable; PDF writes Latin text as real text and draws Indic and
        RTL pages with a selectable Unicode layer over every line, so the
        letters look right and still copy and search; CSV is UTF-8 with a BOM so
        Excel opens Hindi, Gujarati and Tamil correctly.
      </p>
    </section>
  );
}
