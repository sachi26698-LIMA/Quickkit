"use client";
/**
 * Batch barcode studio: a CSV in, a ZIP of symbols out.
 *
 * The engine is the studio's own (`buildBulkRows`), so a row that fails here
 * fails in the same way and with the same sentence as in the single-label
 * workspace. Every row is reported: nothing is dropped silently, and the report
 * CSV uses the same wording as the table on screen.
 */
import { useCallback, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  Upload,
} from "lucide-react";
import {
  BARCODE_BULK_LIMITS,
  BULK_TEMPLATE,
  buildBulkRows,
  bulkCounts,
  exportableRows,
  guessDataColumn,
  guessTitleColumn,
  parseBulkText,
  readBulkFile,
  type BulkRow,
} from "@/lib/tools/barcode/bulk";
import { BARCODE_FORMATS } from "@/lib/tools/barcode/formats";
import {
  bulkEntryNames,
  bulkReportCsv,
  svgFor,
} from "@/lib/tools/barcode/export";
import type { BarcodeFormatId } from "@/lib/tools/barcode/types";
import { createZip } from "@/lib/tools/zip";
import { downloadBlob } from "@/lib/tools/download";
import styles from "@/components/tools/barcode-suite/suite.module.css";

export default function BatchStudio() {
  const [text, setText] = useState(BULK_TEMPLATE);
  const [format, setFormat] = useState<BarcodeFormatId>("code128");
  const [dataColumn, setDataColumn] = useState<number | "auto">("auto");
  const [titleColumn, setTitleColumn] = useState<number | "auto">("auto");
  const [rows, setRows] = useState<BulkRow[] | null>(null);
  const [busy, setBusy] = useState("");
  const [problem, setProblem] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const table = useMemo(() => {
    try {
      return parseBulkText(text);
    } catch {
      return null;
    }
  }, [text]);

  const headers = useMemo(() => table?.headers ?? [], [table]);
  const resolved = useMemo(() => {
    if (!table) return { data: -1, title: -1 };
    return {
      data: dataColumn === "auto" ? guessDataColumn(headers) : dataColumn,
      title:
        titleColumn === "auto"
          ? guessTitleColumn(headers, guessDataColumn(headers))
          : titleColumn,
    };
  }, [table, headers, dataColumn, titleColumn]);

  const counts = useMemo(() => (rows ? bulkCounts(rows) : null), [rows]);
  const printable = useMemo(() => (rows ? exportableRows(rows) : []), [rows]);

  const build = () => {
    setProblem("");
    if (!table) {
      setProblem("That text is not a readable CSV table.");
      setRows([]);
      return;
    }
    if (resolved.data < 0) {
      setProblem(
        "No column looks like barcode data. Pick the data column by hand — the tool will not guess for you when the header is ambiguous.",
      );
      setRows([]);
      return;
    }
    if (table.rows.length > BARCODE_BULK_LIMITS.maxRows) {
      setProblem(
        `This file has ${table.rows.length} data rows. The limit is ${BARCODE_BULK_LIMITS.maxRows} per run; only the first ${BARCODE_BULK_LIMITS.maxRows} were encoded, and the report says so.`,
      );
    }
    setRows(
      buildBulkRows(table, {
        format,
        columns: { data: resolved.data, title: resolved.title },
      }),
    );
  };

  const onFile = useCallback(async (file: File) => {
    setProblem("");
    if (file.size > BARCODE_BULK_LIMITS.maxFileBytes) {
      setProblem(
        `That file is ${Math.round(file.size / 1024)} KB. The limit is ${Math.round(
          BARCODE_BULK_LIMITS.maxFileBytes / 1024,
        )} KB, so it was not read.`,
      );
      return;
    }
    try {
      const parsed = await readBulkFile(file);
      setText(
        parsed.rows
          .map((row) =>
            row
              .map((cell) => (cell.includes(",") ? `"${cell}"` : cell))
              .join(","),
          )
          .join("\n"),
      );
      setRows(null);
    } catch {
      setProblem(
        "That file could not be read as CSV. Check the encoding and the delimiter.",
      );
    }
  }, []);

  const downloadZip = async (kind: "svg" | "png") => {
    if (!printable.length) return;
    setBusy(kind);
    setProblem("");
    try {
      const entries: { name: string; data: Uint8Array }[] = [];
      const names = bulkEntryNames(
        printable.map((row) => ({ format, value: row.data })),
        kind,
      );
      if (kind === "svg") {
        printable.forEach((row, index) => {
          entries.push({
            name: names[index],
            data: new TextEncoder().encode(svgFor(row.spec!, {})),
          });
        });
      } else {
        const { buildLayout } = await import("@/lib/tools/barcode/layout");
        const { layoutToPng } = await import("@/lib/tools/barcode/canvas");
        for (let index = 0; index < printable.length; index += 1) {
          const layout = buildLayout({
            spec: printable[index].spec!,
            options: {},
          });
          const { bytes } = await layoutToPng(layout, 3);
          entries.push({ name: names[index], data: bytes });
        }
      }
      const zip = createZip(entries);
      downloadBlob(
        new Blob([zip as unknown as BlobPart], { type: "application/zip" }),
        `quickkit-batch-${format}-${kind}.zip`,
      );
    } catch {
      setProblem(
        "The archive could not be built in this browser. Try the SVG archive instead.",
      );
    } finally {
      setBusy("");
    }
  };

  const downloadReport = () => {
    if (!rows) return;
    downloadBlob(
      new Blob(
        [
          bulkReportCsv(
            rows.map((row) => ({
              line: row.line,
              status: row.status,
              value: row.data,
              message: row.message,
            })),
          ),
        ],
        { type: "text/csv;charset=utf-8" },
      ),
      `quickkit-batch-${format}-report.csv`,
    );
  };

  return (
    <div className={styles.workspace}>
      <div className={styles.heading}>
        <h2>Batch studio</h2>
        <p>
          Paste or upload a CSV and get one symbol per row. Valid rows,
          duplicates and failures are listed separately, the report names every
          row, and nothing is silently dropped on the way to the ZIP.
        </p>
      </div>

      <section className={styles.card} aria-labelledby="batch-input-heading">
        <div className={styles.cardHead}>
          <FileSpreadsheet size={16} aria-hidden="true" />
          <h3 id="batch-input-heading">1 · Your rows</h3>
          <p>
            One header row, then one product per line. The first column holding
            barcode data is picked automatically and can be overridden below.
          </p>
        </div>
        <label className={styles.field} htmlFor="batch-csv">
          CSV content
          <textarea
            id="batch-csv"
            className={styles.textarea}
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              setRows(null);
            }}
            spellCheck={false}
            style={{ minHeight: 140 }}
          />
        </label>
        <div className={styles.actions}>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv,text/plain"
            className={styles.srOnly}
            id="batch-file"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void onFile(file);
              event.target.value = "";
            }}
          />
          <button
            type="button"
            className={styles.buttonSecondary}
            onClick={() => fileRef.current?.click()}
          >
            <Upload size={14} aria-hidden="true" /> Upload CSV
          </button>
          <button
            type="button"
            className={styles.buttonGhost}
            onClick={() => {
              setText(BULK_TEMPLATE);
              setRows(null);
            }}
          >
            Reset to template
          </button>
        </div>
        <p className={styles.hint}>
          Limits: {BARCODE_BULK_LIMITS.maxRows} rows,{" "}
          {Math.round(BARCODE_BULK_LIMITS.maxFileBytes / 1024 / 1024)} MB file,{" "}
          {BARCODE_BULK_LIMITS.maxColumns} columns. The file is read in this
          tab.
        </p>
      </section>

      <section className={styles.card} aria-labelledby="batch-format-heading">
        <div className={styles.cardHead}>
          <h3 id="batch-format-heading">2 · Format and columns</h3>
          <p>
            Every row is encoded with the same format. Mixed formats in one file
            are not supported, because a label sheet with two symbologies needs
            two print runs anyway.
          </p>
        </div>
        <div className={styles.grid}>
          <label className={styles.field}>
            Symbol
            <select
              className={styles.select}
              value={format}
              onChange={(event) => {
                setFormat(event.target.value as BarcodeFormatId);
                setRows(null);
              }}
            >
              {BARCODE_FORMATS.map((meta) => (
                <option key={meta.id} value={meta.id}>
                  {meta.name}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            Data column
            <select
              className={styles.select}
              value={String(dataColumn)}
              onChange={(event) => {
                const value = event.target.value;
                setDataColumn(value === "auto" ? "auto" : Number(value));
                setRows(null);
              }}
            >
              <option value="auto">Auto</option>
              {headers.map((header, index) => (
                <option key={`data-${index}`} value={index}>
                  {index + 1}. {header || "(no header)"}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            Label column (optional)
            <select
              className={styles.select}
              value={String(titleColumn)}
              onChange={(event) => {
                const value = event.target.value;
                setTitleColumn(value === "auto" ? "auto" : Number(value));
                setRows(null);
              }}
            >
              <option value="auto">Auto</option>
              <option value="-1">None</option>
              {headers.map((header, index) => (
                <option key={`title-${index}`} value={index}>
                  {index + 1}. {header || "(no header)"}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.button} onClick={build}>
            Encode {table?.rows.length ?? 0} rows
          </button>
        </div>
        {problem && (
          <p className={styles.error} role="alert">
            <AlertTriangle size={13} aria-hidden="true" /> {problem}
          </p>
        )}
      </section>

      {rows && (
        <section className={styles.card} aria-labelledby="batch-result-heading">
          <div className={styles.cardHead}>
            <h3 id="batch-result-heading">3 · Result</h3>
            {counts && (
              <p>
                {counts.total} rows · {counts.ok} ready · {counts.duplicate}{" "}
                duplicate · {counts.skipped} skipped · {counts.invalid} invalid
              </p>
            )}
          </div>
          <div className={styles.actions} style={{ marginTop: 0 }}>
            <button
              type="button"
              className={styles.buttonSecondary}
              disabled={!printable.length || busy !== ""}
              onClick={() => void downloadZip("svg")}
            >
              {busy === "svg" ? (
                <Loader2 size={14} aria-hidden="true" />
              ) : (
                <Download size={14} aria-hidden="true" />
              )}
              SVG ZIP ({printable.length})
            </button>
            <button
              type="button"
              className={styles.buttonSecondary}
              disabled={!printable.length || busy !== ""}
              onClick={() => void downloadZip("png")}
            >
              {busy === "png" ? (
                <Loader2 size={14} aria-hidden="true" />
              ) : (
                <Download size={14} aria-hidden="true" />
              )}
              PNG ZIP ({printable.length})
            </button>
            <button
              type="button"
              className={styles.buttonGhost}
              onClick={downloadReport}
            >
              <Download size={13} aria-hidden="true" /> Report CSV
            </button>
          </div>

          <div
            className={styles.scroll}
            style={{ marginTop: 12, maxHeight: 420, overflowY: "auto" }}
          >
            <table className={styles.table}>
              <caption className={styles.srOnly}>
                Every CSV row with its encoding status
              </caption>
              <thead>
                <tr>
                  <th scope="col">Row</th>
                  <th scope="col">Status</th>
                  <th scope="col">Data</th>
                  <th scope="col">Detail</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={`${row.line}-${row.status}`}>
                    <td>{row.line}</td>
                    <td>
                      {row.status === "ok" || row.status === "duplicate" ? (
                        <span className={styles.ok}>
                          <CheckCircle2 size={12} aria-hidden="true" />{" "}
                          {row.status}
                        </span>
                      ) : (
                        <span className={styles.bad}>
                          <AlertTriangle size={12} aria-hidden="true" />{" "}
                          {row.status}
                        </span>
                      )}
                    </td>
                    <td className={styles.mono}>{row.data || "—"}</td>
                    <td>{row.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={styles.hint}>
            QR, Data Matrix and PDF417 batches are generated from the 2D panel
            of the barcode studio one symbol at a time; a mixed 1D/2D sheet
            needs a layout decision this table cannot make.
          </p>
        </section>
      )}
    </div>
  );
}
