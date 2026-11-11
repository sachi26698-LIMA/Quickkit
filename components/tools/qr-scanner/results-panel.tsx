"use client";
/**
 * Results.
 *
 * Every card here was produced by a decoder return, and the card says so: the
 * payload, the pass that read it, the corners it was found at and the time it
 * took are all shown, so a result can be audited rather than believed.
 *
 * When a payload resolves to a safe redirect destination, its full clickable
 * redirect link and direct open action are displayed alongside all decoded data,
 * while high-risk destinations remain blocked.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  Copy,
  Download,
  ExternalLink,
  Image as ImageIcon,
  Maximize2,
  Share2,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
  Trash2,
  Wand2,
  X,
} from "lucide-react";
import { downloadBlob, downloadText, formatBytes } from "@/lib/tools/download";
import {
  buildStudioCustomizeHref,
  recognize,
  type ContentTypeId,
} from "@/lib/tools/qr-scanner/content";
import ScannerCryptoShield, { type AsyncTamperState } from "./crypto-shield";
import {
  resolveRedirectTarget,
  safeWebHref,
} from "@/lib/tools/qr-scanner/redirect";
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
                onOpenPopup={() => api.openPopup(item)}
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
  onOpenPopup,
  flash,
}: {
  symbol: DecodedSymbol;
  index: number;
  total: number;
  sourceName: string;
  scannedAt: number;
  onOpenPopup: () => void;
  flash: (
    next: { kind: "info" | "error" | "success"; text: string } | null,
  ) => void;
}) {
  const [copied, setCopied] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [asyncTamper, setAsyncTamper] = useState<AsyncTamperState>({
    blocked: false,
    reason: null,
  });

  const recognition = useMemo(() => recognize(symbol.data), [symbol.data]);
  const inspection = useMemo(
    () => inspectPayload(symbol.data, recognition.type),
    [symbol.data, recognition.type],
  );
  const rawRedirect = useMemo(
    () => resolveRedirectTarget(symbol.data, recognition, inspection),
    [symbol.data, recognition, inspection],
  );
  const studioHref = useMemo(
    () => buildStudioCustomizeHref(symbol.data, recognition),
    [symbol.data, recognition],
  );

  const handleTamperChange = useCallback((state: AsyncTamperState) => {
    setAsyncTamper((prev) =>
      prev.blocked === state.blocked && prev.reason === state.reason
        ? prev
        : state,
    );
  }, []);

  const redirect = useMemo(() => {
    if (!rawRedirect) return null;
    if (asyncTamper.blocked) {
      return {
        ...rawRedirect,
        blocked: true,
        blockedReason:
          asyncTamper.reason ??
          "Blocked: Cryptographic anti-tamper verification failed.",
      };
    }
    return rawRedirect;
  }, [asyncTamper, rawRedirect]);

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

  const effectiveHighRisk = inspection.level === "high" || asyncTamper.blocked;
  const riskClass = effectiveHighRisk
    ? "risk-high"
    : inspection.level === "caution"
      ? "risk-caution"
      : inspection.level === "unverified"
        ? "risk-unverified"
        : "risk-clear";
  const effectiveHeadline = asyncTamper.blocked
    ? "High risk — Cryptographic seal failed"
    : inspection.headline;

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
          {effectiveHighRisk ? (
            <ShieldAlert size={13} aria-hidden="true" />
          ) : inspection.level === "caution" ? (
            <ShieldQuestion size={13} aria-hidden="true" />
          ) : (
            <ShieldCheck size={13} aria-hidden="true" />
          )}
          {effectiveHeadline}
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
          <p className="scanner-summary">
            {redirect && !redirect.blocked ? (
              <a
                href={redirect.href}
                target={redirect.opensInNewTab ? "_blank" : undefined}
                rel={
                  redirect.opensInNewTab
                    ? "noopener noreferrer nofollow external"
                    : undefined
                }
                className="scanner-summary-link"
              >
                {recognition.summary}{" "}
                <ExternalLink size={13} aria-hidden="true" />
              </a>
            ) : (
              recognition.summary
            )}
          </p>

          <pre className="scanner-payload" tabIndex={0}>
            {symbol.data}
          </pre>

          <ScannerCryptoShield
            payload={symbol.data}
            onTamperStateChange={handleTamperChange}
          />

          {redirect && !redirect.blocked && (
            <div className="scanner-redirect-box">
              <div className="scanner-redirect-head">
                <span className="scanner-redirect-label">
                  {redirect.lineLabel}
                </span>
                <span className="scanner-redirect-scheme">
                  {redirect.schemeLabel}
                </span>
              </div>
              <a
                href={redirect.href}
                target={redirect.opensInNewTab ? "_blank" : undefined}
                rel={
                  redirect.opensInNewTab
                    ? "noopener noreferrer nofollow external"
                    : undefined
                }
                className="scanner-redirect-line"
              >
                <ExternalLink size={14} aria-hidden="true" />
                <span>{redirect.displayUrl}</span>
              </a>
              <div className="scanner-redirect-actions">
                <a
                  href={redirect.href}
                  target={redirect.opensInNewTab ? "_blank" : undefined}
                  rel={
                    redirect.opensInNewTab
                      ? "noopener noreferrer nofollow external"
                      : undefined
                  }
                  className="primary scanner-redirect-cta"
                >
                  <ExternalLink size={15} aria-hidden="true" />
                  {redirect.actionLabel}
                </a>
                <button
                  type="button"
                  className="secondary"
                  onClick={onOpenPopup}
                >
                  <Maximize2 size={14} aria-hidden="true" /> Redirect popup
                </button>
              </div>
            </div>
          )}

          {recognition.fields.length > 0 && (
            <dl className="scanner-fields">
              {redirect && !redirect.blocked && (
                <div>
                  <dt>Source link</dt>
                  <dd>
                    <a
                      href={redirect.href}
                      target={redirect.opensInNewTab ? "_blank" : undefined}
                      rel={
                        redirect.opensInNewTab
                          ? "noopener noreferrer nofollow external"
                          : undefined
                      }
                      className="scanner-inline-source-link"
                    >
                      {redirect.displayUrl}{" "}
                      <ExternalLink size={12} aria-hidden="true" />
                    </a>
                  </dd>
                </div>
              )}
              {recognition.fields.map((field, fieldIndex) => {
                const fieldHref = !field.sensitive
                  ? safeWebHref(field.value)
                  : null;
                return (
                  <div key={`${field.label}-${fieldIndex}`}>
                    <dt>
                      {field.label}
                      {field.sensitive && (
                        <span className="scanner-secret-tag">sensitive</span>
                      )}
                    </dt>
                    <dd>
                      {field.sensitive ? (
                        mask(field.value)
                      ) : fieldHref ? (
                        <a
                          href={fieldHref}
                          target="_blank"
                          rel="noopener noreferrer nofollow external"
                          className="scanner-inline-source-link"
                        >
                          {field.value}{" "}
                          <ExternalLink size={12} aria-hidden="true" />
                        </a>
                      ) : (
                        field.value
                      )}
                    </dd>
                  </div>
                );
              })}
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
            {redirect && !redirect.blocked && (
              <button
                type="button"
                className="secondary"
                onClick={() => void copy(redirect.href, "url")}
              >
                {copied === "url" ? <Check size={15} /> : <Copy size={15} />}{" "}
                Copy URL
              </button>
            )}
            {(!redirect || redirect.blocked) && (
              <button type="button" className="secondary" onClick={onOpenPopup}>
                <Maximize2 size={15} aria-hidden="true" /> View popup
              </button>
            )}
            {studioHref && !effectiveHighRisk && (
              <a href={studioHref} className="secondary qr-mini-button">
                <Wand2 size={15} aria-hidden="true" /> Customize in QR Studio
              </a>
            )}
          </div>

          {effectiveHighRisk && (
            <div className="scanner-open">
              <button
                type="button"
                className="secondary"
                disabled
                title="This destination is flagged as high risk. Copy the address and inspect it elsewhere if you must."
              >
                <ExternalLink size={15} /> Open link…
              </button>
              <span className="scanner-open-blocked">
                Opening is blocked while this address is flagged as high risk.
              </span>
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
