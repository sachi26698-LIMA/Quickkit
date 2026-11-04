"use client";
/**
 * Results.
 *
 * Every card here was produced by a decoder return, and the card says so: the
 * payload, the pass that read it, the corners it was found at and the time it
 * took are all shown, so a result can be audited rather than believed.
 *
 * Opening a link is deliberately a two-step, confirmable action that is only
 * offered for `http(s)` URLs that passed the security pass, and the destination
 * is printed in full before the button is enabled.
 */
import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  Copy,
  Download,
  ExternalLink,
  Image as ImageIcon,
  Share2,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
  Trash2,
  X,
} from "lucide-react";
import { downloadBlob, downloadText, formatBytes } from "@/lib/tools/download";
import { recognize, type ContentTypeId } from "@/lib/tools/qr-scanner/content";
import { inspectPayload } from "@/lib/tools/qr-scanner/security";
import {
  exportFilename,
  safeFilename,
  toCsv,
  toJson,
  toTxt,
  type ExportRow,
} from "@/lib/tools/qr-scanner/export";
import type { DecodedSymbol } from "@/lib/tools/qr-scanner/types";
import type { ScanItem, ScannerApi } from "./use-scanner";

const TYPE_TONE: Partial<Record<ContentTypeId, string>> = {
  url: "tone-url",
  email: "tone-contact",
  phone: "tone-contact",
  sms: "tone-contact",
  whatsapp: "tone-contact",
  vcard: "tone-contact",
  mecard: "tone-contact",
  wifi: "tone-secret",
  payment: "tone-money",
  crypto: "tone-money",
  event: "tone-event",
  geo: "tone-event",
  social: "tone-social",
  app: "tone-app",
  product: "tone-product",
  text: "tone-text",
  unknown: "tone-unknown",
};

export default function ResultsPanel({ api }: { api: ScannerApi }) {
  const [confirming, setConfirming] = useState<string | null>(null);

  const exportOptions = {
    exportTimestamps: api.settings.exportTimestamps,
    exportTypes: api.settings.exportTypes,
    exportFilenames: api.settings.exportFilenames,
    exportStatus: api.settings.exportStatus,
  };

  const allRows: ExportRow[] = useMemo(
    () => api.results.flatMap((item) => rowsForItem(item)),
    [api.results],
  );

  const selectedRows = useMemo(() => {
    if (!api.selected.size) return allRows;
    return api.results
      .filter((item) => api.selected.has(item.id))
      .flatMap((item) => rowsForItem(item));
  }, [allRows, api.results, api.selected]);

  if (!api.results.length)
    return (
      <div className="scanner-results-empty">
        <ScanPlaceholder />
        <p>
          No result yet. Scan a code with the camera, or drop an image into
          Upload Image. A result appears here only when a decoder has genuinely
          read a code.
        </p>
      </div>
    );

  return (
    <div className="scanner-results">
      <div className="scanner-results-head">
        <div>
          <h3>
            {api.results.length} scan{api.results.length === 1 ? "" : "s"}
            <span className="scanner-results-codes">
              {" "}
              ·{" "}
              {api.results.reduce(
                (total, item) => total + item.symbols.length,
                0,
              )}{" "}
              code
              {api.results.reduce(
                (total, item) => total + item.symbols.length,
                0,
              ) === 1
                ? ""
                : "s"}{" "}
              decoded
            </span>
          </h3>
          <p>
            Newest first. Select scans to narrow the export, or export
            everything that is listed.
          </p>
        </div>
        <div className="scanner-results-actions">
          <button
            type="button"
            className="secondary"
            onClick={() =>
              api.selectAll(api.selected.size !== api.results.length)
            }
          >
            {api.selected.size === api.results.length
              ? "Deselect all"
              : "Select all"}
          </button>
          <button
            type="button"
            className="secondary"
            onClick={api.clearResults}
          >
            <Trash2 size={15} /> Clear results
          </button>
        </div>
      </div>

      <div className="scanner-export">
        <strong>
          Export{" "}
          {api.selected.size
            ? `${selectedRows.length} selected`
            : `${allRows.length} listed`}{" "}
          result
          {selectedRows.length === 1 ? "" : "s"}
        </strong>
        <div className="scanner-export-actions">
          <button
            type="button"
            className="secondary"
            disabled={!selectedRows.length}
            onClick={() =>
              downloadText(
                toCsv(selectedRows, exportOptions),
                exportFilename("results", "csv"),
                "text/csv;charset=utf-8",
              )
            }
          >
            <Download size={15} /> CSV
          </button>
          <button
            type="button"
            className="secondary"
            disabled={!selectedRows.length}
            onClick={() =>
              downloadText(
                toJson(selectedRows, exportOptions),
                exportFilename("results", "json"),
                "application/json",
              )
            }
          >
            <Download size={15} /> JSON
          </button>
          <button
            type="button"
            className="secondary"
            disabled={!selectedRows.length}
            onClick={() =>
              downloadText(
                toTxt(selectedRows, exportOptions),
                exportFilename("results", "txt"),
              )
            }
          >
            <Download size={15} /> TXT
          </button>
        </div>
      </div>

      <ul className="scanner-result-list">
        {api.results.map((item) => (
          <li key={item.id} className="scanner-result">
            <div className="scanner-result-top">
              <label className="scanner-select">
                <input
                  type="checkbox"
                  checked={api.selected.has(item.id)}
                  onChange={() => api.toggleSelected(item.id)}
                  aria-label={`Select scan of ${item.sourceName}`}
                />
              </label>
              <div className="scanner-result-meta">
                <strong>{item.sourceName}</strong>
                <span>
                  {new Date(item.scannedAt).toLocaleString()} ·{" "}
                  {item.durationMs} ms
                  {item.sourceBytes
                    ? ` · ${formatBytes(item.sourceBytes)}`
                    : ""}
                </span>
              </div>
              <span
                className={
                  item.symbols.length
                    ? "scanner-detect ok"
                    : "scanner-detect none"
                }
              >
                {item.symbols.length
                  ? `${item.symbols.length} code${item.symbols.length === 1 ? "" : "s"}`
                  : "No code"}
              </span>
              <button
                type="button"
                className="scanner-icon-button"
                onClick={() => api.removeResult(item.id)}
                aria-label={`Remove scan of ${item.sourceName}`}
              >
                <X size={15} />
              </button>
            </div>

            {item.imageUrl && (
              <div className="scanner-result-image">
                <img
                  src={item.imageUrl}
                  alt={`Scanned source ${item.sourceName}`}
                />
                <div className="scanner-result-image-actions">
                  <span>
                    {item.imageWidth} × {item.imageHeight} px
                  </span>
                  <button
                    type="button"
                    className="scanner-link-button"
                    onClick={async () => {
                      try {
                        const response = await fetch(item.imageUrl!);
                        const blob = await response.blob();
                        downloadBlob(
                          blob,
                          `${safeFilename(item.sourceName, "scanned-image")}.${extensionFor(blob.type)}`,
                        );
                      } catch {
                        api.setFlash({
                          kind: "error",
                          text: "The original image could not be re-read for download.",
                        });
                      }
                    }}
                  >
                    <Download size={13} /> Original image
                  </button>
                </div>
              </div>
            )}

            {item.symbols.length === 0 && (
              <div className="scanner-result-failure">
                <ShieldAlert size={15} aria-hidden="true" />
                <div>
                  <strong>{item.failure}</strong>
                  <details>
                    <summary>
                      What was tried ({item.attempts.length} passes)
                    </summary>
                    <ul>
                      {item.attempts.map((attempt, index) => (
                        <li key={`${attempt}-${index}`}>{attempt}</li>
                      ))}
                    </ul>
                  </details>
                  <p>
                    Nothing was decoded, so there is nothing to show — this tool
                    will not guess at a payload. Try cropping closer to the
                    code, or rotating the image and scanning again.
                  </p>
                </div>
              </div>
            )}

            {item.symbols.map((symbol, index) => (
              <SymbolCard
                key={`${item.id}-${index}`}
                symbol={symbol}
                index={index}
                total={item.symbols.length}
                sourceName={item.sourceName}
                scannedAt={item.scannedAt}
                confirming={confirming === `${item.id}-${index}`}
                onConfirm={(open) =>
                  setConfirming(open ? `${item.id}-${index}` : null)
                }
                flash={api.setFlash}
              />
            ))}

            {item.symbols.length > 1 && (
              <p className="scanner-multi-note">
                {item.symbols.length} separate codes were decoded from this one
                image. Each has its own security result.
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function rowsForItem(item: ScanItem): ExportRow[] {
  if (!item.symbols.length)
    return [
      {
        payload: "(no code decoded)",
        type: "unknown",
        typeLabel: "No code found",
        sourceName: item.sourceName,
        scannedAt: item.scannedAt,
        status: "no code found",
        count: 0,
        summary: item.failure ?? "No QR code could be decoded in this image.",
      },
    ];
  return item.symbols.map((symbol) => {
    const recognition = recognize(symbol.data);
    return {
      payload: symbol.data,
      type: recognition.type,
      typeLabel: recognition.label,
      sourceName: item.sourceName,
      scannedAt: item.scannedAt,
      status: "decoded",
      count: item.symbols.length,
      summary: recognition.summary,
    };
  });
}

function SymbolCard({
  symbol,
  index,
  total,
  sourceName,
  scannedAt,
  confirming,
  onConfirm,
  flash,
}: {
  symbol: DecodedSymbol;
  index: number;
  total: number;
  sourceName: string;
  scannedAt: number;
  confirming: boolean;
  onConfirm: (open: boolean) => void;
  flash: (
    next: { kind: "info" | "error" | "success"; text: string } | null,
  ) => void;
}) {
  const [copied, setCopied] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);

  const recognition = useMemo(() => recognize(symbol.data), [symbol.data]);
  const inspection = useMemo(
    () => inspectPayload(symbol.data, recognition.type),
    [symbol.data, recognition.type],
  );

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(null), 2200);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
    } catch {
      flash({
        kind: "error",
        text: "The clipboard is blocked in this browser. Select the text and copy it manually.",
      });
    }
  };

  const downloadOnly = () => {
    const row: ExportRow = {
      payload: symbol.data,
      type: recognition.type,
      typeLabel: recognition.label,
      sourceName,
      scannedAt,
      status: "decoded",
      count: total,
      summary: recognition.summary,
    };
    downloadText(
      toTxt([row], {
        exportTimestamps: true,
        exportTypes: true,
        exportFilenames: true,
        exportStatus: true,
      }),
      exportFilename("result", "txt", sourceName),
    );
  };

  const share = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "Scanned QR content",
          text: symbol.data,
        });
        return;
      } catch {
        // A cancelled share sheet is not an error worth reporting.
        return;
      }
    }
    void copy(symbol.data, "share");
    flash({
      kind: "info",
      text: "Sharing is unavailable here, so the content was copied to your clipboard instead.",
    });
  };

  const riskClass =
    inspection.level === "high"
      ? "risk-high"
      : inspection.level === "caution"
        ? "risk-caution"
        : inspection.level === "unverified"
          ? "risk-unverified"
          : "risk-clear";

  return (
    <article
      className="scanner-symbol"
      aria-label={`Decoded result ${index + 1}`}
    >
      <header className="scanner-symbol-head">
        <span className="scanner-symbol-index">#{index + 1}</span>
        <span
          className={`scanner-type ${TYPE_TONE[recognition.type] ?? "tone-text"}`}
        >
          {recognition.label}
        </span>
        <span className={`scanner-risk ${riskClass}`}>
          {inspection.level === "high" ? (
            <ShieldAlert size={13} aria-hidden="true" />
          ) : inspection.level === "caution" ? (
            <ShieldQuestion size={13} aria-hidden="true" />
          ) : (
            <ShieldCheck size={13} aria-hidden="true" />
          )}
          {inspection.headline}
        </span>
        <button
          type="button"
          className="scanner-icon-button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          aria-label={expanded ? "Collapse this result" : "Expand this result"}
        >
          <ChevronDown size={16} className={expanded ? "chev open" : "chev"} />
        </button>
      </header>

      {expanded && (
        <>
          <p className="scanner-summary">{recognition.summary}</p>

          <pre className="scanner-payload" tabIndex={0}>
            {symbol.data}
          </pre>

          {recognition.fields.length > 0 && (
            <dl className="scanner-fields">
              {recognition.fields.map((field, fieldIndex) => (
                <div key={`${field.label}-${fieldIndex}`}>
                  <dt>
                    {field.label}
                    {field.sensitive && (
                      <span className="scanner-secret-tag">sensitive</span>
                    )}
                  </dt>
                  <dd>{field.sensitive ? mask(field.value) : field.value}</dd>
                </div>
              ))}
            </dl>
          )}

          <div className="scanner-symbol-actions">
            <button
              type="button"
              className="secondary"
              onClick={() => void copy(recognition.primary, "primary")}
            >
              {copied === "primary" ? <Check size={15} /> : <Copy size={15} />}
              {copied === "primary" ? "Copied" : "Copy content"}
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => void share()}
            >
              <Share2 size={15} /> Share
            </button>
            <button type="button" className="secondary" onClick={downloadOnly}>
              <Download size={15} /> Download result
            </button>
            {inspection.url && (
              <button
                type="button"
                className="secondary"
                onClick={() => void copy(inspection.url!, "url")}
              >
                {copied === "url" ? <Check size={15} /> : <Copy size={15} />}{" "}
                Copy URL
              </button>
            )}
          </div>

          {inspection.url && (
            <div className="scanner-open">
              {confirming ? (
                <div className="scanner-open-confirm">
                  <p>
                    This will open <code>{inspection.url}</code> in a new tab.
                    QUICKKIT cannot check whether that page is genuine — the
                    inspection below only describes the address itself.
                  </p>
                  <div className="scanner-open-actions">
                    <a
                      className="primary"
                      href={inspection.url}
                      target="_blank"
                      rel="noopener noreferrer nofollow external"
                      onClick={() => onConfirm(false)}
                    >
                      <ExternalLink size={15} /> Open in a new tab
                    </a>
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => onConfirm(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="secondary"
                  onClick={() => onConfirm(true)}
                  disabled={inspection.level === "high"}
                  title={
                    inspection.level === "high"
                      ? "This destination is flagged as high risk. Copy the address and inspect it elsewhere if you must."
                      : undefined
                  }
                >
                  <ExternalLink size={15} /> Open link…
                </button>
              )}
              {inspection.level === "high" && (
                <span className="scanner-open-blocked">
                  Opening is blocked while this address is flagged as high risk.
                </span>
              )}
            </div>
          )}

          <section
            className={`scanner-security ${riskClass}`}
            aria-label="Security inspection"
          >
            <h4>
              {inspection.level === "high" ? (
                <ShieldAlert size={15} aria-hidden="true" />
              ) : inspection.level === "caution" ? (
                <ShieldQuestion size={15} aria-hidden="true" />
              ) : (
                <ShieldCheck size={15} aria-hidden="true" />
              )}
              {inspection.headline}
            </h4>
            {inspection.host && (
              <p className="scanner-security-host">
                Destination host: <strong>{inspection.host}</strong>
                {inspection.scheme &&
                  ` · ${inspection.scheme.replace(":", "").toUpperCase()}`}
              </p>
            )}
            {inspection.findings.length ? (
              <ul>
                {inspection.findings.map((finding) => (
                  <li
                    key={finding.title}
                    className={`finding ${finding.level}`}
                  >
                    <strong>{finding.title}</strong>
                    <p>{finding.detail}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="scanner-security-note">
                Nothing in this payload matched a known warning pattern — plain
                HTTP, raw IP addresses, shorteners, lookalike domains, punycode,
                embedded credentials or dangerous schemes. That is not a
                guarantee: no reputation or malware data is consulted, because
                nothing leaves this device.
              </p>
            )}
            <details className="scanner-audit">
              <summary>Decode audit trail</summary>
              <dl>
                <div>
                  <dt>Decoded at</dt>
                  <dd>{new Date(scannedAt).toLocaleString()}</dd>
                </div>
                <div>
                  <dt>QR version</dt>
                  <dd>{symbol.version || "reported by decoder"}</dd>
                </div>
                <div>
                  <dt>Error correction</dt>
                  <dd>
                    {symbol.errorCorrection ?? "not reported by the decoder"}
                  </dd>
                </div>
                <div>
                  <dt>Payload bytes</dt>
                  <dd>{symbol.bytes.length}</dd>
                </div>
                <div>
                  <dt>Reading pass</dt>
                  <dd>{symbol.pass}</dd>
                </div>
                <div>
                  <dt>Inverted symbol</dt>
                  <dd>
                    {symbol.inverted ? "yes (light modules on dark)" : "no"}
                  </dd>
                </div>
              </dl>
            </details>
          </section>
        </>
      )}
    </article>
  );
}

/** Show that a secret exists without printing it. */
function mask(value: string) {
  if (value.length <= 2) return "••";
  return `${value.slice(0, 1)}${"•".repeat(Math.min(12, value.length - 2))}${value.slice(-1)}`;
}

function extensionFor(mime: string) {
  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("gif")) return "gif";
  if (mime.includes("bmp")) return "bmp";
  return "jpg";
}

function ScanPlaceholder() {
  return (
    <div className="scanner-empty-art" aria-hidden="true">
      <ImageIcon size={28} />
    </div>
  );
}
