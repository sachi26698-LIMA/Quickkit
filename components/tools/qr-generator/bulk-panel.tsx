"use client";
/* eslint-disable @next/next/no-img-element */
/**
 * BULK — CSV in, mapped, validated, rendered one row at a time, zipped.
 * The row preview is an object URL from a Blob we made, so <img> is the right
 * element here (next/image has nothing to optimise and cannot read blob:).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CircleAlert,
  CircleCheck,
  Download,
  FileArchive,
  FileCode,
  LoaderCircle,
  Play,
  Rows3,
  ScanLine,
  TableProperties,
  Trash,
  TriangleAlert,
  Upload,
} from "lucide-react";
import {
  BULK_LIMITS,
  BULK_TEMPLATE,
  buildRowPayload,
  guessMapping,
  parseCsvFile,
  type ColumnMapping,
  type CsvTable,
} from "@/lib/tools/qr/bulk";
import { QR_CONTENT_TYPES, contentTypeDef } from "@/lib/tools/qr/payload";
import { renderQrPng } from "@/lib/tools/qr/render";
import { createZip } from "@/lib/tools/zip";
import {
  csvDocument,
  pngBlob,
  qrFilename,
  safeFilenamePart,
} from "@/lib/tools/qr/export";
import { downloadBlob, formatBytes } from "@/lib/tools/download";
import type { QrContentTypeId } from "@/lib/tools/qr/types";
import { QrSection, QrToggle } from "./shared";
import type { QrStudio } from "./use-qr-studio";

type BulkStatus =
  "queued" | "ok" | "verified" | "invalid" | "render-failed" | "duplicate";

type BulkRow = {
  index: number;
  cells: string[];
  status: BulkStatus;
  payload: string | null;
  label: string;
  message: string;
  blob: Blob | null;
  name: string;
  bytes: number;
};

const STATUS_LABEL: Record<BulkStatus, string> = {
  queued: "queued",
  ok: "rendered",
  verified: "rendered + decoded",
  invalid: "invalid row",
  "render-failed": "render failed",
  duplicate: "duplicate payload",
};

export default function BulkPanel({ studio }: { studio: QrStudio }) {
  const [typeId, setTypeId] = useState<QrContentTypeId>("url");
  const [table, setTable] = useState<CsvTable | null>(null);
  const [fileName, setFileName] = useState("");
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [rows, setRows] = useState<BulkRow[]>([]);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [running, setRunning] = useState(false);
  const [limit, setLimit] = useState(BULK_LIMITS.defaultRows);
  const [verifyEach, setVerifyEach] = useState(true);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [bulkSize, setBulkSize] = useState(512);
  const [selected, setSelected] = useState<number | null>(null);
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const cancelled = useRef(false);
  const fileInput = useRef<HTMLInputElement | null>(null);
  const def = contentTypeDef(typeId);

  const previewUrl = useRef<string | null>(null);
  const clearPreview = useCallback(() => {
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    previewUrl.current = null;
    setSelected(null);
    setSelectedUrl(null);
  }, []);
  /* Object URLs are revoked on replace, on re-run and on unmount — the row
   * blobs are the big ones, and a leaked URL would pin them. */
  const showPreview = useCallback(
    (row: BulkRow) => {
      if (selected === row.index) {
        clearPreview();
        return;
      }
      clearPreview();
      if (!row.blob) return;
      const url = URL.createObjectURL(row.blob);
      previewUrl.current = url;
      setSelected(row.index);
      setSelectedUrl(url);
    },
    [clearPreview, selected],
  );
  useEffect(
    () => () => {
      if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
      previewUrl.current = null;
    },
    [],
  );

  const loadFile = useCallback(
    async (file: File | undefined | null) => {
      if (!file) return;
      setError(null);
      try {
        const parsed = await parseCsvFile(file, { maxRows: limit });
        setTable(parsed);
        setFileName(file.name);
        setMapping(guessMapping(parsed.headers, def.fields));
        setRows([]);
        setProgress({ done: 0, total: 0 });
        if (parsed.truncated)
          setError(
            `The file has more rows than the ${limit}-row batch limit, so the extras were ignored. Raise the limit and re-load if you need them.`,
          );
      } catch (problem) {
        setError(
          problem instanceof Error
            ? problem.message
            : "That CSV could not be read.",
        );
        setTable(null);
      }
    },
    [def.fields, limit],
  );

  const loadSample = useCallback(() => {
    const parsed = {
      headers: ["name", "url", "label"],
      rows: BULK_TEMPLATE.split("\n")
        .slice(1)
        .map((line) => line.split(",")),
      delimiter: ",",
      notes: [],
      truncated: false,
    } satisfies CsvTable;
    setTable(parsed);
    setFileName("sample-quickkit.csv");
    setMapping(guessMapping(parsed.headers, def.fields));
    setRows([]);
    setError(null);
  }, [def.fields]);

  const summary = useMemo(() => {
    const counts = {
      total: rows.length,
      ok: 0,
      failed: 0,
      duplicates: 0,
      bytes: 0,
    };
    for (const row of rows) {
      if (row.status === "ok" || row.status === "verified") {
        counts.ok += 1;
        counts.bytes += row.bytes;
      } else if (row.status === "duplicate") counts.duplicates += 1;
      else if (row.status !== "queued") counts.failed += 1;
    }
    return counts;
  }, [rows]);

  const generate = useCallback(async () => {
    if (!table) return;
    cancelled.current = false;
    clearPreview();
    setRunning(true);
    const prepared: BulkRow[] = table.rows.map((cells, index) => {
      const outcome = buildRowPayload(
        typeId,
        mapping,
        cells,
        studio.design.errorLevel,
        studio.values,
      );
      return {
        index: index + 1,
        cells,
        status: outcome.ok ? "queued" : "invalid",
        payload: outcome.payload ?? null,
        label: outcome.label ?? `Row ${index + 1}`,
        message: outcome.error ?? "",
        blob: null,
        name: "",
        bytes: 0,
      };
    });
    const firstOf = new Map<string, number>();
    const isDuplicate: boolean[] = [];
    prepared.forEach((row, index) => {
      if (!row.payload) {
        isDuplicate[index] = false;
        return;
      }
      const original = firstOf.get(row.payload);
      if (original === undefined) {
        firstOf.set(row.payload, row.index);
        isDuplicate[index] = false;
        return;
      }
      isDuplicate[index] = true;
      if (row.status === "queued") {
        row.status = "duplicate";
        row.message = `Identical payload to row ${original}.`;
      }
    });
    setRows(prepared);
    setProgress({ done: 0, total: prepared.length });

    const design = { ...studio.design, size: bulkSize };
    const next = [...prepared];
    let done = 0;
    for (let index = 0; index < next.length; index += 1) {
      if (cancelled.current) break;
      const row = next[index];
      if (row.status !== "queued" || !row.payload) {
        done += 1;
        continue;
      }
      if (isDuplicate[index] && skipDuplicates) {
        done += 1;
        continue;
      }
      try {
        const shouldVerify = verifyEach && next.length <= 120;
        const result = await renderQrPng(row.payload, design, null, {
          verify: shouldVerify,
        });
        if (shouldVerify && !result.verification?.ok) {
          row.status = "render-failed";
          row.message = result.verification?.message ?? "decode failed";
        } else {
          const blob = pngBlob(result.png);
          row.blob = blob;
          row.bytes = blob.size;
          row.status = shouldVerify ? "verified" : "ok";
          row.name = qrFilename({
            label: row.label,
            typeId,
            ext: "png",
            size: bulkSize,
            suffix: `row-${String(row.index).padStart(3, "0")}`,
          });
        }
      } catch (problem) {
        row.status = "render-failed";
        row.message =
          problem instanceof Error ? problem.message : "rendering failed";
      }
      done += 1;
      // Publish in chunks so a 300-row batch does not thrash React.
      if (done % 8 === 0 || done === next.length) {
        setRows([...next]);
        setProgress({ done, total: next.length });
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }
    setRows([...next]);
    setProgress({ done, total: next.length });
    setRunning(false);
  }, [
    bulkSize,
    clearPreview,
    mapping,
    skipDuplicates,
    studio.design,
    studio.values,
    table,
    typeId,
    verifyEach,
  ]);

  const renderable = rows.filter((row) => row.blob);

  const downloadZip = useCallback(async () => {
    if (!renderable.length) return;
    const entries = await Promise.all(
      renderable.map(async (row) => ({
        name: `qr-codes/${row.name}`,
        data: new Uint8Array(await row.blob!.arrayBuffer()),
      })),
    );
    entries.push({
      name: "qr-codes/manifest.csv",
      data: new TextEncoder().encode(
        csvDocument([
          ["row", "label", "file", "bytes", "status", "payload"],
          ...rows.map((row) => [
            row.index,
            row.label,
            row.name || "",
            row.bytes,
            STATUS_LABEL[row.status] + (row.message ? ` — ${row.message}` : ""),
            row.payload ?? "",
          ]),
        ]),
      ),
    });
    entries.push({
      name: "qr-codes/README.txt",
      data: new TextEncoder().encode(
        `QUICKKIT QR batch\n\n${renderable.length} PNG file(s), ${bulkSize}×${bulkSize} px, generated ${new Date().toISOString()}.\nContent type: ${def.label}. Each code was rendered in your browser; nothing was uploaded.\n${verifyEach && rows.length <= 120 ? "Every code in this batch was decoded after rendering." : "Decode verification was not run for this batch."}\n`,
      ),
    });
    downloadBlob(
      new Blob([createZip(entries) as unknown as BlobPart], {
        type: "application/zip",
      }),
      qrFilename({
        label: safeFilenamePart(fileName || "batch"),
        typeId,
        ext: "zip",
      }),
    );
  }, [bulkSize, def.label, fileName, rows, renderable, typeId, verifyEach]);

  const downloadReport = useCallback(() => {
    const header = [
      ...(table?.headers ?? []),
      "status",
      "message",
      "file",
      "bytes",
    ];
    const body = rows.map((row) => [
      ...row.cells,
      STATUS_LABEL[row.status],
      row.message,
      row.name,
      row.bytes || 0,
    ]);
    downloadBlob(
      new Blob([csvDocument([header, ...body])], {
        type: "text/csv;charset=utf-8",
      }),
      qrFilename({
        label: `${safeFilenamePart(fileName || "batch")}-report`,
        typeId,
        ext: "csv",
      }),
    );
  }, [fileName, rows, table?.headers, typeId]);

  const clear = () => {
    setRows([]);
    setTable(null);
    setFileName("");
    setProgress({ done: 0, total: 0 });
    setError(null);
    clearPreview();
  };

  return (
    <QrSection
      id="qr-bulk"
      title="Bulk QR generator"
      hint="One CSV, many unique codes. Every row is validated and rendered on its own, so one bad line never spoils the batch."
      icon={<Rows3 size={17} />}
      action={
        table ? (
          <span className="qr-badge idle">
            <TableProperties size={13} /> {table.rows.length} rows ·{" "}
            {table.headers.length} columns
          </span>
        ) : null
      }
    >
      <div className="qr-bulk-grid">
        <div className="qr-field half">
          <label htmlFor="qr-bulk-type">Content type for every row</label>
          <select
            id="qr-bulk-type"
            value={typeId}
            onChange={(event) => {
              const next = event.target.value as QrContentTypeId;
              setTypeId(next);
              if (table)
                setMapping(
                  guessMapping(table.headers, contentTypeDef(next).fields),
                );
            }}
          >
            {QR_CONTENT_TYPES.map((type) => (
              <option key={type.id} value={type.id}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
        <div className="qr-field half">
          <label htmlFor="qr-bulk-limit">Batch size limit</label>
          <select
            id="qr-bulk-limit"
            value={limit}
            onChange={(event) => setLimit(Number(event.target.value))}
          >
            {[25, 50, 100, BULK_LIMITS.defaultRows, BULK_LIMITS.maxRows].map(
              (size) => (
                <option key={size} value={size}>
                  {size} rows {size === BULK_LIMITS.maxRows ? "(maximum)" : ""}
                </option>
              ),
            )}
          </select>
        </div>
        <div className="qr-field half">
          <label htmlFor="qr-bulk-size">Render size per code</label>
          <select
            id="qr-bulk-size"
            value={bulkSize}
            onChange={(event) => setBulkSize(Number(event.target.value))}
          >
            {[256, 512, 768, 1024].map((size) => (
              <option key={size} value={size}>
                {size} px {size === 512 ? "(recommended)" : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="qr-field half qr-bulk-toggles">
          <QrToggle
            id="qr-bulk-verify"
            label="Decode-verify every code"
            hint={
              verifyEach
                ? rows.length > 120
                  ? `Skipped for this batch — ${rows.length} rows is past the 120-code verification ceiling, which keeps the tab responsive.`
                  : "On: each PNG is decoded back before it counts as done."
                : "Off: rows are encoded and rendered, but not decoded back."
            }
            checked={verifyEach}
            onChange={setVerifyEach}
          />
          <QrToggle
            id="qr-bulk-dedupe"
            label="Skip duplicate payloads"
            hint="Rows that would produce an identical code are reported, not rendered twice."
            checked={skipDuplicates}
            onChange={setSkipDuplicates}
          />
        </div>
      </div>

      {!table ? (
        <label
          className={`qr-dropzone ${dragOver ? "over" : ""}`}
          htmlFor="qr-bulk-file"
          onDragOver={(event) => {
            event.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragOver(false);
            void loadFile(event.dataTransfer.files?.[0]);
          }}
        >
          <Upload size={20} aria-hidden="true" />
          <span>
            Drop a CSV (or TXT) file here
            <small>
              Comma, semicolon, tab or pipe · quoted cells allowed · header row
              required · up to {BULK_LIMITS.maxFileBytes / 1024 / 1024} MB.{" "}
              <button
                type="button"
                className="qr-inline-button"
                onClick={(event) => {
                  event.preventDefault();
                  loadSample();
                }}
              >
                Load the sample file
              </button>
            </small>
          </span>
          <input
            id="qr-bulk-file"
            ref={fileInput}
            type="file"
            accept=".csv,text/csv,text/plain"
            onChange={(event) => void loadFile(event.target.files?.[0])}
          />
        </label>
      ) : (
        <div className="qr-bulk-setup">
          <div className="qr-bulk-file">
            <strong>{fileName}</strong>
            <small>
              delimiter “{table.delimiter}” · first row used as headers
              {table.notes.length ? ` · ${table.notes.length} note(s)` : ""}
            </small>
            <button type="button" className="qr-link-button" onClick={clear}>
              <Trash size={13} /> Change file
            </button>
          </div>

          <div className="qr-mapping">
            <span className="field-label">Column mapping</span>
            <div className="qr-mapping-grid">
              {def.fields.map((field) => (
                <div key={field.key} className="qr-map-row">
                  <label htmlFor={`qr-map-${field.key}`}>
                    {field.label}
                    {field.required ? (
                      <span className="qr-required"> required</span>
                    ) : null}
                  </label>
                  <select
                    id={`qr-map-${field.key}`}
                    value={mapping[field.key] ?? -1}
                    onChange={(event) =>
                      setMapping({
                        ...mapping,
                        [field.key]: Number(event.target.value),
                      })
                    }
                  >
                    <option value={-1}>— not mapped —</option>
                    {table.headers.map((header, index) => (
                      <option key={`${header}-${index}`} value={index}>
                        {header}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            <p className="help">
              Any field you leave unmapped takes its value from the Content tab,
              so a whole batch can share one Wi-Fi password, one event title or
              one store link.
            </p>
          </div>

          {error ? (
            <p className="status error" role="alert">
              <CircleAlert size={14} aria-hidden="true" /> {error}
            </p>
          ) : null}

          <div className="qr-bulk-actions">
            <button
              type="button"
              className="primary"
              onClick={() => void generate()}
              disabled={running || !table.rows.length}
            >
              {running ? (
                <>
                  <LoaderCircle size={15} className="qr-spin" /> Rendering{" "}
                  {progress.done}/{progress.total}
                </>
              ) : (
                <>
                  <Play size={15} /> Generate{" "}
                  {Math.min(table.rows.length, limit)} code
                  {Math.min(table.rows.length, limit) === 1 ? "" : "s"}
                </>
              )}
            </button>
            {running ? (
              <button
                type="button"
                className="secondary"
                onClick={() => (cancelled.current = true)}
              >
                Stop after this row
              </button>
            ) : null}
            <progress
              className="qr-progress"
              value={progress.done}
              max={Math.max(1, progress.total)}
              aria-label={`${progress.done} of ${progress.total} rows rendered`}
            />
          </div>

          {rows.length ? (
            <>
              <div className="qr-bulk-summary">
                <span className="qr-badge good">
                  <CircleCheck size={13} /> {summary.ok} rendered
                </span>
                <span
                  className={summary.failed ? "qr-badge bad" : "qr-badge idle"}
                >
                  <TriangleAlert size={13} /> {summary.failed} failed
                </span>
                <span className="qr-badge idle">
                  <FileArchive size={13} /> {formatBytes(summary.bytes)} in
                  memory
                </span>
                {summary.duplicates ? (
                  <span className="qr-badge idle">
                    <FileCode size={13} /> {summary.duplicates} duplicates
                  </span>
                ) : null}
                <button
                  type="button"
                  className="primary qr-mini-button"
                  onClick={() => void downloadZip()}
                  disabled={!renderable.length}
                >
                  <FileArchive size={14} /> Download ZIP ({renderable.length})
                </button>
                <button
                  type="button"
                  className="secondary qr-mini-button"
                  onClick={downloadReport}
                >
                  <Download size={14} /> CSV result report
                </button>
              </div>

              {selected !== null && selectedUrl ? (
                <figure className="qr-bulk-preview">
                  <img
                    src={selectedUrl}
                    alt={`Row ${selected} QR code preview`}
                    width={220}
                    height={220}
                  />
                  <figcaption>
                    Row {selected} ·{" "}
                    {rows.find((row) => row.index === selected)?.label} ·
                    decoded payload{" "}
                    {rows.find((row) => row.index === selected)?.payload
                      ?.length ?? 0}{" "}
                    characters
                  </figcaption>
                </figure>
              ) : null}

              <div className="qr-bulk-rows-wrap">
                <table className="qr-bulk-rows">
                  <caption className="sr-only">
                    Per-row result of the bulk run, with status, message and
                    download.
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Row</th>
                      <th scope="col">Label</th>
                      <th scope="col">Status</th>
                      <th scope="col">Message</th>
                      <th scope="col">File</th>
                      <th scope="col">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 200).map((row) => (
                      <tr
                        key={row.index}
                        className={row.status === "invalid" ? "fail" : ""}
                      >
                        <th scope="row">{row.index}</th>
                        <td>{row.label}</td>
                        <td>
                          <span className={`qr-row-status ${row.status}`}>
                            {STATUS_LABEL[row.status]}
                          </span>
                        </td>
                        <td className="qr-row-message">{row.message || "—"}</td>
                        <td>{row.blob ? formatBytes(row.bytes) : "—"}</td>
                        <td className="qr-row-actions">
                          <button
                            type="button"
                            className="qr-link-button"
                            onClick={() => showPreview(row)}
                            disabled={!row.blob}
                          >
                            <ScanLine size={13} />{" "}
                            {selected === row.index ? "Hide" : "Preview"}
                          </button>
                          <button
                            type="button"
                            className="qr-link-button"
                            onClick={() =>
                              row.blob && downloadBlob(row.blob, row.name)
                            }
                            disabled={!row.blob}
                          >
                            <Download size={13} /> PNG
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rows.length > 200 ? (
                  <p className="help">
                    The table lists the first 200 rows to keep the page light;
                    the ZIP and CSV report cover all {rows.length}.
                  </p>
                ) : null}
              </div>
            </>
          ) : null}
        </div>
      )}
      <p className="help">
        <Upload size={13} aria-hidden="true" /> Rows are read as text only —
        nothing in a CSV can run in this tool, cells are capped at{" "}
        {BULK_LIMITS.maxCellChars.toLocaleString()} characters and{" "}
        {BULK_LIMITS.maxColumns} columns, and every generated PNG is dropped
        from memory when you change the file.
      </p>
    </QrSection>
  );
}
