"use client";
/**
 * Bulk generation from a CSV.
 *
 * The interface is honest about scale: rows are validated up front, render work
 * is chunked so the tab stays responsive, invalid rows are listed and exported
 * rather than dropped, and the ZIP/PDF writers stream one label at a time so a
 * thousand-row batch does not build a thousand bitmaps in memory at once.
 */
import { useCallback, useMemo, useRef, useState } from "react";
import {
  Download,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Loader2,
  Rows3,
  ShieldCheck,
  TriangleAlert,
  Upload,
} from "lucide-react";
import { downloadBlob, downloadText, formatBytes } from "@/lib/tools/download";
import { renderOptionsFrom } from "@/lib/tools/barcode/settings";
import { BARCODE_FORMATS, formatMeta } from "@/lib/tools/barcode/formats";
import {
  BARCODE_BULK_LIMITS,
  BULK_TEMPLATE,
  buildBulkRows,
  bulkCounts,
  exportableRows,
  guessDataColumn,
  guessTitleColumn,
  processInBatches,
  readBulkFile,
  type BulkRow,
} from "@/lib/tools/barcode/bulk";
import type { CsvTable } from "@/lib/tools/qr/bulk";
import {
  barcodeFilename,
  bulkEntryNames,
  bulkReportCsv,
  svgFor,
} from "@/lib/tools/barcode/export";
import {
  BARCODE_PAPERS,
  DEFAULT_LABEL_SIZE,
  planSheet,
  type BarcodePaper,
} from "@/lib/tools/barcode/pdf";
import type { BarcodeFormatId } from "@/lib/tools/barcode/types";
import { WorkspaceHeading } from "../tool-ui";
import type { useBarcodeStudio } from "./use-barcode-studio";

type Studio = ReturnType<typeof useBarcodeStudio>;

const PREVIEW_LIMIT = 8;
const TABLE_LIMIT = 100;

export default function BulkPanel({ studio }: { studio: Studio }) {
  const { settings } = studio;
  const [table, setTable] = useState<CsvTable | null>(null);
  const [fileLabel, setFileLabel] = useState("");
  const [dataColumn, setDataColumn] = useState(0);
  const [titleColumn, setTitleColumn] = useState(-1);
  const [format, setFormat] = useState<BarcodeFormatId>(settings.format);
  const [skipDuplicates, setSkipDuplicates] = useState(false);
  const [rows, setRows] = useState<BulkRow[]>([]);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [thumbs, setThumbs] = useState<{ name: string; src: string }[]>([]);
  const [busy, setBusy] = useState<null | "reading" | "generating" | "zip" | "pdf">(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [paper, setPaper] = useState<BarcodePaper>("a4");
  const [labelWidth, setLabelWidth] = useState(DEFAULT_LABEL_SIZE.widthMm);
  const [labelHeight, setLabelHeight] = useState(DEFAULT_LABEL_SIZE.heightMm);
  const inputRef = useRef<HTMLInputElement>(null);
  const abort = useRef({ aborted: false });

  const counts = useMemo(() => bulkCounts(rows), [rows]);
  const printable = useMemo(() => exportableRows(rows), [rows]);
  const renderOptions = useMemo(() => renderOptionsFrom(settings), [settings]);
  const sheet = planSheet(printable.length || 1, {
    paper,
    label: { widthMm: labelWidth, heightMm: labelHeight },
    marginMm: 10,
    gapMm: 4,
    whiteBackground: true,
    render: {},
  });

  const loadFile = useCallback(async (file: File) => {
    setError(null);
    setBusy("reading");
    setRows([]);
    setThumbs([]);
    try {
      const parsed = await readBulkFile(file);
      const headers = parsed.headers.length ? parsed.headers : ["data"];
      setTable(parsed);
      setFileLabel(`${file.name} · ${formatBytes(file.size)} · ${parsed.rows.length} row${parsed.rows.length === 1 ? "" : "s"}`);
      setDataColumn(guessDataColumn(headers));
      setTitleColumn(guessTitleColumn(headers, guessDataColumn(headers)));
      if (parsed.notes.length) setError(parsed.notes[0]);
    } catch (loadError) {
      setTable(null);
      setError(
        loadError instanceof Error ? loadError.message : "That CSV could not be read.",
      );
    } finally {
      setBusy(null);
    }
  }, []);

  const generate = useCallback(async () => {
    if (!table) return;
    setError(null);
    setBusy("generating");
    setThumbs([]);
    abort.current = { aborted: false };
    try {
      const built = buildBulkRows(table, {
        format,
        columns: { data: dataColumn, title: titleColumn },
        encode: {
          checksum: settings.checksum,
          numberSystem: settings.numberSystem,
          guardBars: settings.guardBars,
        },
        skipDuplicates,
      });
      setRows(built);
      setProgress({ done: 0, total: Math.min(built.length, PREVIEW_LIMIT) });

      // Thumbnails are rendered in chunks so a 1,000-row batch paints nothing
      // synchronously: the table and counts appear first, pictures follow.
      const sample = exportableRows(built).slice(0, PREVIEW_LIMIT);
      const { results } = await processInBatches(
        sample,
        (row) => ({
          name: row.data,
          src: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
            svgFor(row.spec!, renderOptions, `${format} ${row.spec!.display}`),
          )}`,
        }),
        {
          batchSize: 2,
          onProgress: (done, total) => setProgress({ done, total }),
          signal: abort.current,
        },
      );
      setThumbs(results);
    } catch (generateError) {
      setError(
        generateError instanceof Error
          ? generateError.message
          : "The batch could not be generated.",
      );
    } finally {
      setBusy(null);
    }
  }, [table, format, dataColumn, titleColumn, settings, skipDuplicates, renderOptions]);

  const downloadReport = useCallback(() => {
    const csv = bulkReportCsv(
      rows.map((row) => ({
        line: row.line,
        status: row.status,
        value: row.data,
        message: row.message,
      })),
    );
    downloadText(csv, `quickkit-barcode-bulk-report-${format}.csv`, "text/csv;charset=utf-8");
    studio.setFlash({
      kind: "success",
      text: "Report CSV saved — every row, including the ones that failed.",
    });
  }, [rows, format, studio]);

  const downloadZip = useCallback(
    async (kind: "svg" | "png") => {
      if (!printable.length) return;
      setBusy("zip");
      abort.current = { aborted: false };
      try {
        const { createZip: zip } = await import("@/lib/tools/zip");
        const entries: { name: string; data: Uint8Array }[] = [];
        if (kind === "svg") {
          const { results } = await processInBatches(
            printable,
            (row) => ({
              name: row.data,
              data: new TextEncoder().encode(
                svgFor(row.spec!, renderOptions, `${format} ${row.spec!.display}`),
              ),
            }),
            {
              batchSize: 50,
              onProgress: (done, total) => setProgress({ done, total }),
              signal: abort.current,
            },
          );
          const names = bulkEntryNames(printable.map((row) => ({ format, value: row.data })), "svg");
          results.forEach((entry, index) => entries.push({ name: names[index], data: entry.data }));
        } else {
          const { layoutToPng } = await import("@/lib/tools/barcode/canvas");
          const { buildLayout } = await import("@/lib/tools/barcode/layout");
          const names = bulkEntryNames(printable.map((row) => ({ format, value: row.data })), "png");
          for (let index = 0; index < printable.length; index += 1) {
            if (abort.current.aborted) break;
            const layout = buildLayout({ spec: printable[index].spec!, options: renderOptions });
            const { bytes } = await layoutToPng(layout, Math.min(3, settings.scale));
            entries.push({ name: names[index], data: bytes });
            setProgress({ done: index + 1, total: printable.length });
            if (index % 5 === 4) await new Promise((resolve) => setTimeout(resolve, 0));
          }
        }
        if (!entries.length) throw new Error("Nothing was generated, so there is no ZIP to build.");
        const bytes = zip(entries);
        downloadBlob(
          new Blob([bytes as unknown as BlobPart], { type: "application/zip" }),
          barcodeFilename({ format, value: "bulk", ext: "zip", suffix: `${entries.length}-${kind}` }),
        );
        studio.setFlash({
          kind: "success",
          text: `ZIP saved with ${entries.length} ${kind.toUpperCase()} file${entries.length === 1 ? "" : "s"}.`,
        });
      } catch (zipError) {
        studio.setFlash({
          kind: "error",
          text: zipError instanceof Error ? zipError.message : "The ZIP could not be built.",
        });
      } finally {
        setBusy(null);
      }
    },
    [printable, format, renderOptions, settings.scale, studio],
  );

  const downloadPdf = useCallback(async () => {
    if (!printable.length) return;
    setBusy("pdf");
    abort.current = { aborted: false };
    try {
      const { createBarcodePdf } = await import("@/lib/tools/barcode/pdf");
      const items = [];
      for (const row of printable) {
        if (abort.current.aborted) break;
        items.push({ spec: row.spec!, title: row.title || settings.title, description: settings.description });
      }
      const bytes = await createBarcodePdf(items, {
        paper,
        label: { widthMm: labelWidth, heightMm: labelHeight },
        marginMm: 10,
        gapMm: 4,
        whiteBackground: true,
        render: renderOptions,
      });
      downloadBlob(
        new Blob([bytes as unknown as BlobPart], { type: "application/pdf" }),
        barcodeFilename({
          format,
          value: "bulk",
          ext: "pdf",
          suffix: `${items.length}-sheet`,
        }),
      );
      studio.setFlash({
        kind: "success",
        text: `PDF saved — ${items.length} labels on ${sheet.pages} page${sheet.pages === 1 ? "" : "s"}.`,
      });
    } catch (pdfError) {
      studio.setFlash({
        kind: "error",
        text: pdfError instanceof Error ? pdfError.message : "The PDF could not be built.",
      });
    } finally {
      setBusy(null);
    }
  }, [printable, paper, labelWidth, labelHeight, renderOptions, format, settings.title, settings.description, sheet.pages, studio]);

  const downloadRow = useCallback(
    async (row: BulkRow, kind: "svg" | "png") => {
      if (!row.spec) return;
      const name = barcodeFilename({ format, value: row.spec.value, ext: kind, index: row.line });
      if (kind === "svg") {
        downloadBlob(
          new Blob([svgFor(row.spec, renderOptions, `${format} ${row.spec.display}`)], {
            type: "image/svg+xml;charset=utf-8",
          }),
          name,
        );
        return;
      }
      try {
        const [{ layoutToPng }, { buildLayout }] = await Promise.all([
          import("@/lib/tools/barcode/canvas"),
          import("@/lib/tools/barcode/layout"),
        ]);
        const layout = buildLayout({ spec: row.spec, options: renderOptions });
        const { bytes } = await layoutToPng(layout, Math.min(4, settings.scale));
        downloadBlob(new Blob([bytes as unknown as BlobPart], { type: "image/png" }), name);
      } catch (rowError) {
        studio.setFlash({
          kind: "error",
          text: rowError instanceof Error ? rowError.message : "That PNG could not be created.",
        });
      }
    },
    [format, renderOptions, settings.scale, studio],
  );

  const headers = table?.headers ?? [];
  const meta = formatMeta(format);

  return (
    <fieldset className="workspace bc-bulk" aria-label="Bulk barcode generator">
      <WorkspaceHeading
        title="Bulk barcode generator"
        description="One barcode per CSV row, validated row by row, exported as SVG, PNG, a ZIP or a print-ready PDF sheet."
      />

      <section className="qr-card">
        <div className="qr-card-head">
          <div>
            <h3>1. Load your data</h3>
            <p>
              Up to {BARCODE_BULK_LIMITS.maxRows.toLocaleString()} rows and{" "}
              {BARCODE_BULK_LIMITS.maxFileBytes / 1024 / 1024} MB. First row is
              the header.
            </p>
          </div>
          <button
            type="button"
            className="qr-mini-button"
            onClick={() =>
              downloadText(BULK_TEMPLATE, "quickkit-barcode-template.csv", "text/csv;charset=utf-8")
            }
          >
            <Download size={13} aria-hidden="true" /> CSV template
          </button>
        </div>

        <label
          className={dragOver ? "qr-dropzone over" : "qr-dropzone"}
          onDragOver={(event) => {
            event.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragOver(false);
            const file = event.dataTransfer.files?.[0];
            if (file) void loadFile(file);
          }}
        >
          {busy === "reading" ? (
            <Loader2 size={22} className="qr-spin" aria-hidden="true" />
          ) : (
            <Upload size={22} aria-hidden="true" />
          )}
          <span>
            {fileLabel || "Choose a CSV or drop it here"}
            <small>Any column can hold the barcode data — you pick it next.</small>
          </span>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv,text/plain"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void loadFile(file);
              event.target.value = "";
            }}
          />
        </label>

        {error ? (
          <p className="qr-field-error" role="alert">
            <TriangleAlert size={13} aria-hidden="true" /> {error}
          </p>
        ) : null}

        {table ? (
          <div className="bc-grid bc-bulk-config">
            <div className="qr-field">
              <label htmlFor="bc-column-data">Barcode data column</label>
              <select
                id="bc-column-data"
                className="qr-input"
                value={dataColumn}
                onChange={(event) => setDataColumn(Number(event.target.value))}
              >
                {headers.map((header, index) => (
                  <option key={`${header}-${index}`} value={index}>
                    {header || `Column ${index + 1}`}
                  </option>
                ))}
              </select>
            </div>
            <div className="qr-field">
              <label htmlFor="bc-column-title">Label column (optional)</label>
              <select
                id="bc-column-title"
                className="qr-input"
                value={titleColumn}
                onChange={(event) => setTitleColumn(Number(event.target.value))}
              >
                <option value={-1}>None</option>
                {headers.map((header, index) => (
                  <option key={`${header}-${index}`} value={index}>
                    {header || `Column ${index + 1}`}
                  </option>
                ))}
              </select>
            </div>
            <div className="qr-field">
              <label htmlFor="bc-bulk-format">Format for every row</label>
              <select
                id="bc-bulk-format"
                className="qr-input"
                value={format}
                onChange={(event) => setFormat(event.target.value as BarcodeFormatId)}
              >
                {BARCODE_FORMATS.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.name}
                  </option>
                ))}
              </select>
              <p className="help">{meta.blurb}</p>
            </div>
          </div>
        ) : null}

        {table ? (
          <div className="bc-bulk-controls">
            <label className="checkbox qr-toggle">
            <input
              type="checkbox"
              checked={skipDuplicates}
              onChange={(event) => setSkipDuplicates(event.target.checked)}
            />
            <span>
              Skip rows that repeat an earlier value
              <small>
                Off by default: printing the same label twice is normal. Both
                ways, duplicates are reported.
              </small>
              </span>
            </label>
            <div className="bc-actions">
              <button
                type="button"
                className="primary"
                onClick={generate}
                disabled={busy === "generating" || !table.rows.length}
              >
                {busy === "generating" ? (
                  <Loader2 size={15} className="qr-spin" aria-hidden="true" />
                ) : (
                  <Rows3 size={15} aria-hidden="true" />
                )}
                Generate {table.rows.length.toLocaleString()} labels
              </button>
              <span className="bc-dim">
                {table.delimiter === "\t" ? "tab-separated" : `“${table.delimiter}” separated`} ·{" "}
                {headers.length} column{headers.length === 1 ? "" : "s"}
                {table.truncated ? " · truncated at the row limit" : ""}
              </span>
            </div>
          </div>
        ) : null}
      </section>

      {rows.length ? (
        <section className="qr-card">
          <div className="qr-card-head">
            <div>
              <h3>2. Review and export</h3>
              <p>
                {counts.ok.toLocaleString()} ready · {counts.duplicate.toLocaleString()}{" "}
                duplicate · {counts.invalid.toLocaleString()} invalid
                {counts.skipped ? ` · ${counts.skipped} skipped` : ""}
              </p>
            </div>
            <span className={counts.invalid ? "qr-badge bad" : "qr-badge good"}>
              {counts.invalid ? `${counts.invalid} need attention` : "Every row valid"}
            </span>
          </div>

          {thumbs.length ? (
            <>
              <span className="qr-block-label">
                Preview — first {thumbs.length} of {printable.length}
              </span>
              <div className="bc-thumbs">
                {thumbs.map((thumb, index) => (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    key={`${thumb.name}-${index}`}
                    src={thumb.src}
                    alt={`${format} barcode for ${thumb.name}`}
                    loading="lazy"
                  />
                ))}
              </div>
            </>
          ) : null}

          <div className="bc-grid">
            <div className="qr-field">
              <label htmlFor="bc-bulk-paper">PDF paper</label>
              <select
                id="bc-bulk-paper"
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
              <label htmlFor="bc-bulk-w">Label width — {labelWidth} mm</label>
              <input
                id="bc-bulk-w"
                type="range"
                min={15}
                max={180}
                step={1}
                value={labelWidth}
                onChange={(event) => setLabelWidth(Number(event.target.value))}
              />
            </div>
            <div className="qr-field">
              <label htmlFor="bc-bulk-h">Label height — {labelHeight} mm</label>
              <input
                id="bc-bulk-h"
                type="range"
                min={10}
                max={120}
                step={1}
                value={labelHeight}
                onChange={(event) => setLabelHeight(Number(event.target.value))}
              />
            </div>
          </div>
          <p className="help">
            {sheet.perPage} label{sheet.perPage === 1 ? "" : "s"} per{" "}
            {paper === "fit" ? "page" : BARCODE_PAPERS[paper].label} ·{" "}
            {sheet.pages} page{sheet.pages === 1 ? "" : "s"} for{" "}
            {printable.length.toLocaleString()} labels.
          </p>

          {busy && progress.total ? (
            <p className="bc-progress" role="status">
              <Loader2 size={13} className="qr-spin" aria-hidden="true" />
              {progress.done} / {progress.total} rendered
            </p>
          ) : null}

          <div className="bc-actions">
            <button
              type="button"
              className="primary"
              onClick={() => downloadZip("svg")}
              disabled={!printable.length || busy !== null}
            >
              <Download size={15} aria-hidden="true" /> ZIP of SVG
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => downloadZip("png")}
              disabled={!printable.length || busy !== null}
            >
              <ImageIcon size={15} aria-hidden="true" /> ZIP of PNG
            </button>
            <button
              type="button"
              className="secondary"
              onClick={downloadPdf}
              disabled={!printable.length || busy !== null}
            >
              <FileText size={15} aria-hidden="true" /> PDF sheet
            </button>
            <button type="button" className="secondary" onClick={downloadReport} disabled={!rows.length}>
              <FileSpreadsheet size={15} aria-hidden="true" /> Report CSV
            </button>
          </div>

          <div className="bc-table-wrap">
            <table className="bc-table">
              <caption className="sr-only">
                Row-by-row result: status, data and explanation
              </caption>
              <thead>
                <tr>
                  <th scope="col">Row</th>
                  <th scope="col">Status</th>
                  <th scope="col">Data</th>
                  <th scope="col">Details</th>
                  <th scope="col">File</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, TABLE_LIMIT).map((row) => (
                  <tr key={`${row.line}-${row.canonical}`} className={`bc-row ${row.status}`}>
                    <td>{row.line}</td>
                    <td>
                      <span className={row.status === "ok" ? "qr-badge good" : row.status === "invalid" ? "qr-badge bad" : "qr-badge"}>
                        {row.status}
                      </span>
                    </td>
                    <td className="bc-cell-data">{row.data || "—"}</td>
                    <td>{row.title ? `${row.title} — ${row.message}` : row.message}</td>
                    <td>
                      {row.spec ? (
                        <span className="bc-row-actions">
                          <button type="button" className="qr-link-button" onClick={() => downloadRow(row, "svg")}>
                            SVG
                          </button>
                          <button type="button" className="qr-link-button" onClick={() => downloadRow(row, "png")}>
                            PNG
                          </button>
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > TABLE_LIMIT ? (
              <p className="help">
                Showing the first {TABLE_LIMIT} of {rows.length.toLocaleString()} rows.
                Exports always include every row.
              </p>
            ) : null}
          </div>
        </section>
      ) : null}

      <p className="qr-privacy-foot">
        <ShieldCheck size={15} aria-hidden="true" /> The CSV is parsed and every
        barcode is rendered in this tab. Nothing is uploaded, and the file never
        leaves your device.
      </p>
    </fieldset>
  );
}
