"use client";
/**
 * Batch studio: a CSV in, one archive per symbology out.
 *
 * Mixed sheets are first-class here. Each row carries its own format (from a
 * column, or from the single-format fallback), every row is validated on its
 * own, and the export is grouped by symbology — a Code 128 label and a QR code
 * cannot share a print run without per-row layout decisions, so the ZIP keeps
 * them in separate folders and offers a per-format archive as well.
 *
 * Everything runs in the tab: the CSV is parsed locally, symbols are drawn
 * locally, and the ZIP is assembled from bytes already in memory.
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
  parseBulkText,
  readBulkFile,
} from "@/lib/tools/barcode/bulk";
import {
  buildMixedRows,
  exportableMixedRows,
  isTwoDFormat,
  mixedCounts,
  mixedFormatGroups,
  resolveMixedFormat,
  type MixedFormat,
  type MixedRow,
} from "@/lib/tools/barcode/bulk-mixed";
import { BARCODE_FORMATS, formatMeta } from "@/lib/tools/barcode/formats";
import { TWO_D_FORMATS, svgToRaster } from "@/lib/tools/barcode/twod";
import { buildLayout } from "@/lib/tools/barcode/layout";
import { layoutToPng } from "@/lib/tools/barcode/canvas";
import { bulkReportCsv, svgFor } from "@/lib/tools/barcode/export";
import { createZip } from "@/lib/tools/zip";
import { downloadBlob } from "@/lib/tools/download";
import styles from "@/components/tools/barcode-suite/suite.module.css";

const SAMPLE = [
  "data,label,format",
  "5901234123457,Yogurt 400 g,ean13",
  "09506000134352,Case label,itf14",
  "QUICKKIT-2026,Order card,code128",
  "https://quickkit.online,Product page,qrcode",
  "LOT-42-QC,QC tag,datamatrix",
].join("\n");

const FORMAT_OPTIONS: { id: MixedFormat; name: string }[] = [
  ...BARCODE_FORMATS.map((meta) => ({
    id: meta.id as MixedFormat,
    name: meta.name,
  })),
  ...TWO_D_FORMATS.map((meta) => ({
    id: meta.id as MixedFormat,
    name: `${meta.name} (2D)`,
  })),
];

function formatLabel(format: MixedFormat) {
  return (
    FORMAT_OPTIONS.find((entry) => entry.id === format)?.name ??
    format.toUpperCase()
  );
}

function safeName(value: string) {
  return (
    value
      .replace(/[^a-z0-9._-]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "label"
  );
}

export default function BatchStudio() {
  const [text, setText] = useState(SAMPLE);
  const [fallback, setFallback] = useState<MixedFormat>("code128");
  const [dataColumn, setDataColumn] = useState<number | "auto">("auto");
  const [titleColumn, setTitleColumn] = useState<number | "auto">("auto");
  const [formatColumn, setFormatColumn] = useState<number | "auto" | "none">(
    "auto",
  );
  const [rows, setRows] = useState<MixedRow[] | null>(null);
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

  const guessFormatColumn = useCallback(() => {
    const index = headers.findIndex((header) =>
      /^(format|symbology|type|barcode ?type|code ?type)$/i.test(header.trim()),
    );
    return index;
  }, [headers]);

  const resolved = useMemo(() => {
    const guessedData = headers.findIndex((header) =>
      /^(data|value|barcode|code|content|text|number|ean|upc|sku)$/i.test(
        header.trim(),
      ),
    );
    const data =
      dataColumn === "auto" ? (guessedData >= 0 ? guessedData : 0) : dataColumn;
    const guessedTitle = headers.findIndex(
      (header, index) =>
        index !== data &&
        /^(label|title|name|description|caption)$/i.test(header.trim()),
    );
    const title = titleColumn === "auto" ? guessedTitle : titleColumn;
    const guessedFormat = guessFormatColumn();
    const format =
      formatColumn === "none"
        ? -1
        : formatColumn === "auto"
          ? guessedFormat
          : formatColumn;
    return { data, title, format };
  }, [headers, dataColumn, titleColumn, formatColumn, guessFormatColumn]);

  const counts = useMemo(() => (rows ? mixedCounts(rows) : null), [rows]);
  const groups = useMemo(() => (rows ? mixedFormatGroups(rows) : []), [rows]);
  const printable = useMemo(
    () => (rows ? exportableMixedRows(rows) : []),
    [rows],
  );

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
    if (table.truncated || table.rows.length > BARCODE_BULK_LIMITS.maxRows) {
      setProblem(
        `This file has more than ${BARCODE_BULK_LIMITS.maxRows} data rows. Only the first ${BARCODE_BULK_LIMITS.maxRows} were encoded, and the report says so.`,
      );
    }
    const built = buildMixedRows(table, {
      data: resolved.data,
      title: resolved.title,
      formatColumn: resolved.format,
      fallback,
      maxRows: BARCODE_BULK_LIMITS.maxRows,
    });
    setRows(built);
    if (!built.length)
      setProblem("There were no data rows under the header row.");
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
              .map((cell) =>
                /[",\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell,
              )
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

  /* --------------------------------- export -------------------------------- */

  const entryBytes = async (row: MixedRow, kind: "svg" | "png") => {
    if (row.kind === "2d") {
      if (!row.svg) throw new Error("Missing 2D symbol");
      if (kind === "svg") return new TextEncoder().encode(row.svg);
      const { bytes } = await svgToRaster(row.svg, {
        scale: 3,
        mime: "image/png",
      });
      return bytes;
    }
    if (!row.spec) throw new Error("Missing linear symbol");
    if (kind === "svg") {
      return new TextEncoder().encode(svgFor(row.spec, {}));
    }
    const layout = buildLayout({ spec: row.spec, options: {} });
    const { bytes } = await layoutToPng(layout, 3);
    return bytes;
  };

  const names = (subset: MixedRow[], kind: "svg" | "png") =>
    subset.map(
      (row, index) =>
        `${String(index + 1).padStart(4, "0")}-${safeName(row.data)}.${kind}`,
    );

  const downloadGroup = async (
    format: MixedFormat,
    subset: MixedRow[],
    kind: "svg" | "png",
  ) => {
    if (!subset.length) return;
    setBusy(`${format}:${kind}`);
    setProblem("");
    try {
      const files = names(subset, kind);
      const entries: { name: string; data: Uint8Array }[] = [];
      for (let index = 0; index < subset.length; index += 1) {
        entries.push({
          name: files[index],
          data: await entryBytes(subset[index], kind),
        });
      }
      downloadBlob(
        new Blob([createZip(entries) as unknown as BlobPart], {
          type: "application/zip",
        }),
        `quickkit-batch-${format}-${kind}.zip`,
      );
    } catch {
      setProblem(
        "The archive could not be built in this browser. Try the SVG archive, which needs no canvas.",
      );
    } finally {
      setBusy("");
    }
  };

  const downloadAll = async (kind: "svg" | "png") => {
    if (!printable.length) return;
    setBusy(`all:${kind}`);
    setProblem("");
    try {
      const entries: { name: string; data: Uint8Array }[] = [];
      for (const group of groups) {
        const files = names(group.rows, kind);
        for (let index = 0; index < group.rows.length; index += 1) {
          entries.push({
            name: `${group.format}/${files[index]}`,
            data: await entryBytes(group.rows[index], kind),
          });
        }
      }
      // A manifest makes the archive self-describing: which folder is which
      // symbology, and why they were not combined into one sheet.
      entries.push({
        name: "README.txt",
        data: new TextEncoder().encode(
          [
            "QUICKKIT batch export",
            "",
            ...groups.map(
              (group) =>
                `${group.format}/  ${group.rows.length} ${formatLabel(group.format)} symbol(s)`,
            ),
            "",
            "Each folder holds one symbology. Mixed symbologies are exported in",
            "separate folders because their module widths and quiet zones differ;",
            "combining them into one sheet needs a per-row layout decision.",
            "",
            "A report CSV with every row's status was downloaded separately.",
          ].join("\n"),
        ),
      });
      downloadBlob(
        new Blob([createZip(entries) as unknown as BlobPart], {
          type: "application/zip",
        }),
        `quickkit-batch-all-formats-${kind}.zip`,
      );
    } catch {
      setProblem(
        "The combined archive could not be built in this browser. Download the folders one at a time.",
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
              format: row.format ?? "",
            })),
          ),
        ],
        { type: "text/csv;charset=utf-8" },
      ),
      "quickkit-batch-report.csv",
    );
  };

  return (
    <div className={styles.workspace}>
      <div className={styles.heading}>
        <h2>Batch studio</h2>
        <p>
          Paste or upload a CSV and get one symbol per row, with the symbology
          taken from a column when you have one. Valid rows, duplicates and
          failures are listed separately, and a mixed sheet is exported as
          separate archives per format instead of one archive that pretends the
          formats are interchangeable.
        </p>
      </div>

      <section className={styles.card} aria-labelledby="batch-input-heading">
        <div className={styles.cardHead}>
          <FileSpreadsheet size={16} aria-hidden="true" />
          <h3 id="batch-input-heading">1 · Your rows</h3>
          <p>
            One header row, then one product per line. Data, label and format
            columns are detected from the header names and can be overridden
            below.
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
            style={{ minHeight: 150 }}
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
              setText(SAMPLE);
              setRows(null);
            }}
          >
            Load a mixed-format sample
          </button>
        </div>
        <p className={styles.hint}>
          Limits: {BARCODE_BULK_LIMITS.maxRows} rows,{" "}
          {Math.round(BARCODE_BULK_LIMITS.maxFileBytes / 1024 / 1024)} MB file,{" "}
          {BARCODE_BULK_LIMITS.maxColumns} columns. The file is read in this
          tab.
          {table?.notes.length ? ` ${table.notes[0]}` : ""}
        </p>
      </section>

      <section className={styles.card} aria-labelledby="batch-format-heading">
        <div className={styles.cardHead}>
          <h3 id="batch-format-heading">2 · Columns and fallback format</h3>
          <p>
            When a format column is used, each row&rsquo;s cell decides its
            symbology and an unrecognised cell is reported as invalid — the tool
            never substitutes a different symbology silently.
          </p>
        </div>
        <div className={styles.grid}>
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
          <label className={styles.field}>
            Format column
            <select
              className={styles.select}
              value={String(formatColumn)}
              onChange={(event) => {
                const value = event.target.value;
                setFormatColumn(
                  value === "auto" || value === "none" ? value : Number(value),
                );
                setRows(null);
              }}
            >
              <option value="auto">Auto (detect a format column)</option>
              <option value="none">None — one format for every row</option>
              {headers.map((header, index) => (
                <option key={`format-${index}`} value={index}>
                  {index + 1}. {header || "(no header)"}
                </option>
              ))}
            </select>
            <small>
              {resolved.format >= 0
                ? `Reading symbology from column ${resolved.format + 1}.`
                : "Every row uses the fallback format below."}
            </small>
          </label>
          <label className={styles.field}>
            Fallback / single format
            <select
              className={styles.select}
              value={fallback}
              onChange={(event) => {
                setFallback(event.target.value as MixedFormat);
                setRows(null);
              }}
              disabled={resolved.format >= 0}
            >
              {FORMAT_OPTIONS.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.name}
                </option>
              ))}
            </select>
            <small>
              {resolveMixedFormat(fallback)
                ? "Accepts ids, display names and loose spellings such as “EAN 13”."
                : "Unknown format."}
            </small>
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
                · {counts.formats} format{counts.formats === 1 ? "" : "s"}
              </p>
            )}
          </div>

          {groups.length > 0 && (
            <div
              style={{
                display: "grid",
                gap: 10,
                marginBottom: 14,
              }}
            >
              {groups.map((group) => (
                <div
                  key={group.format}
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 12px",
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    background: "#fbf9ff",
                  }}
                >
                  <strong style={{ fontSize: 12.5 }}>
                    {formatLabel(group.format)}
                  </strong>
                  <span className={styles.hint} style={{ margin: 0 }}>
                    {group.rows.length} symbol
                    {group.rows.length === 1 ? "" : "s"}
                    {isTwoDFormat(group.format) ? " · 2D" : " · linear"} ·{" "}
                    {group.format}
                  </span>
                  <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      className={styles.buttonGhost}
                      disabled={busy !== ""}
                      onClick={() =>
                        void downloadGroup(group.format, group.rows, "svg")
                      }
                    >
                      {busy === `${group.format}:svg` ? (
                        <Loader2 size={13} aria-hidden="true" />
                      ) : (
                        <Download size={13} aria-hidden="true" />
                      )}{" "}
                      SVG
                    </button>
                    <button
                      type="button"
                      className={styles.buttonGhost}
                      disabled={busy !== ""}
                      onClick={() =>
                        void downloadGroup(group.format, group.rows, "png")
                      }
                    >
                      {busy === `${group.format}:png` ? (
                        <Loader2 size={13} aria-hidden="true" />
                      ) : (
                        <Download size={13} aria-hidden="true" />
                      )}{" "}
                      PNG
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className={styles.actions} style={{ marginTop: 0 }}>
            <button
              type="button"
              className={styles.buttonSecondary}
              disabled={!printable.length || busy !== ""}
              onClick={() => void downloadAll("svg")}
            >
              {busy === "all:svg" ? (
                <Loader2 size={14} aria-hidden="true" />
              ) : (
                <Download size={14} aria-hidden="true" />
              )}
              All formats — SVG ({printable.length})
            </button>
            <button
              type="button"
              className={styles.buttonSecondary}
              disabled={!printable.length || busy !== ""}
              onClick={() => void downloadAll("png")}
            >
              {busy === "all:png" ? (
                <Loader2 size={14} aria-hidden="true" />
              ) : (
                <Download size={14} aria-hidden="true" />
              )}
              All formats — PNG ({printable.length})
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
                Every CSV row with its symbology and encoding status
              </caption>
              <thead>
                <tr>
                  <th scope="col">Row</th>
                  <th scope="col">Format</th>
                  <th scope="col">Status</th>
                  <th scope="col">Data</th>
                  <th scope="col">Detail</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={`${row.line}-${row.status}-${row.format}`}>
                    <td>{row.line}</td>
                    <td>
                      {row.format ? (
                        formatLabel(row.format)
                      ) : (
                        <span className={styles.bad}>
                          {row.requested || "unknown"}
                        </span>
                      )}
                    </td>
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
            Each format gets its own folder in the combined archive because
            module width, quiet zone and human-readable text differ per
            symbology. Example: {formatMeta("ean13").name} is 37.3 mm wide at
            100%, while a QR code is square and carries no caption.
          </p>
        </section>
      )}
    </div>
  );
}
