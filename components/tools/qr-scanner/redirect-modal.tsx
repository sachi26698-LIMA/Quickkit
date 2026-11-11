"use client";
/**
 * Immediate post-scan popup modal.
 *
 * Opens as soon as a QR code is decoded from the camera or an uploaded image,
 * presenting all decoded data alongside a clickable redirect/source link and a
 * direct action button so the user can inspect everything and reach the source
 * in a single tap without scrolling down the page.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  QrCode,
  Share2,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
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
  exportFilename,
  toTxt,
  type ExportRow,
} from "@/lib/tools/qr-scanner/export";
import {
  resolveRedirectTarget,
  safeWebHref,
} from "@/lib/tools/qr-scanner/redirect";
import { inspectPayload } from "@/lib/tools/qr-scanner/security";
import type { Flash, ScanItem } from "./use-scanner";

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

export default function ScanRedirectModal({
  item,
  onClose,
  flash,
}: {
  item: ScanItem | null;
  onClose: () => void;
  flash: (next: Flash) => void;
}) {
  if (!item || item.symbols.length === 0) return null;
  return (
    <RedirectModalBody
      key={item.id}
      item={item}
      onClose={onClose}
      flash={flash}
    />
  );
}

function RedirectModalBody({
  item,
  onClose,
  flash,
}: {
  item: ScanItem;
  onClose: () => void;
  flash: (next: Flash) => void;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [copied, setCopied] = useState<string | null>(null);
  const [showSecrets, setShowSecrets] = useState(false);
  const [tamperByData, setTamperByData] = useState<
    Record<string, AsyncTamperState>
  >({});
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const primaryLinkRef = useRef<HTMLAnchorElement | null>(null);

  const symbol = item.symbols[activeIndex] ?? item.symbols[0];
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

  const handleTamperChange = useCallback(
    (state: AsyncTamperState) => {
      setTamperByData((prev) => {
        const cur = prev[symbol.data];
        if (
          cur &&
          cur.blocked === state.blocked &&
          cur.reason === state.reason
        ) {
          return prev;
        }
        return { ...prev, [symbol.data]: state };
      });
    },
    [symbol.data],
  );

  const asyncTamper = tamperByData[symbol.data];
  const redirect = useMemo(() => {
    if (!rawRedirect) return null;
    if (asyncTamper?.blocked) {
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
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (primaryLinkRef.current) {
      primaryLinkRef.current.focus();
    } else {
      closeBtnRef.current?.focus();
    }
  }, []);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(null), 2200);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = async (value: string, key: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
    } catch {
      flash({
        kind: "error",
        text: "The clipboard is blocked in this browser. Select the text and copy it manually.",
      });
    }
  };

  const downloadResult = () => {
    const row: ExportRow = {
      payload: symbol.data,
      type: recognition.type,
      typeLabel: recognition.label,
      sourceName: item.sourceName,
      scannedAt: item.scannedAt,
      status: "decoded",
      count: item.symbols.length,
      summary: recognition.summary,
    };
    downloadText(
      toTxt([row], {
        exportTimestamps: true,
        exportTypes: true,
        exportFilenames: true,
        exportStatus: true,
      }),
      exportFilename("result", "txt", item.sourceName),
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
        return;
      }
    }
    void copy(symbol.data, "share");
    flash({
      kind: "info",
      text: "Sharing is unavailable here, so the content was copied to your clipboard instead.",
    });
  };

  const effectiveHighRisk =
    inspection.level === "high" || Boolean(asyncTamper?.blocked);
  const riskClass = effectiveHighRisk
    ? "risk-high"
    : inspection.level === "caution"
      ? "risk-caution"
      : inspection.level === "unverified"
        ? "risk-unverified"
        : "risk-clear";
  const effectiveHeadline = asyncTamper?.blocked
    ? "High risk — Cryptographic seal failed"
    : inspection.headline;

  return (
    <div
      className="scanner-modal-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="scanner-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="scanner-popup-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="scanner-modal-head">
          <span className="scanner-card-icon" aria-hidden="true">
            <QrCode size={18} />
          </span>
          <div className="scanner-modal-title-wrap">
            <h2 id="scanner-popup-title">
              {redirect && !redirect.blocked
                ? "QR Code Scanned — Redirect Ready"
                : "QR Code Scanned — Complete Data"}
            </h2>
            <p>
              <strong>{item.sourceName}</strong> ·{" "}
              {new Date(item.scannedAt).toLocaleString()} · {item.durationMs} ms
              {item.sourceBytes ? ` · ${formatBytes(item.sourceBytes)}` : ""}
            </p>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            className="scanner-icon-button scanner-modal-close"
            onClick={onClose}
            aria-label="Close scan popup"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <div className="scanner-modal-body">
          {item.symbols.length > 1 && (
            <div
              className="scanner-modal-switcher"
              role="tablist"
              aria-label="Decoded QR codes in this scan"
            >
              {item.symbols.map((entry, idx) => {
                const entryType = recognize(entry.data);
                const isSelected = idx === activeIndex;
                return (
                  <button
                    key={`${item.id}-tab-${idx}`}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    className={
                      isSelected
                        ? "scanner-modal-pill active"
                        : "scanner-modal-pill"
                    }
                    onClick={() => setActiveIndex(idx)}
                  >
                    #{idx + 1} {entryType.label}
                  </button>
                );
              })}
            </div>
          )}

          <div className="scanner-modal-badges">
            <span
              className={`scanner-popup-type ${TYPE_TONE[recognition.type] ?? "tone-text"}`}
            >
              {recognition.label}
            </span>
            <span className={`scanner-popup-risk ${riskClass}`}>
              {effectiveHighRisk ? (
                <ShieldAlert size={13} aria-hidden="true" />
              ) : inspection.level === "caution" ? (
                <ShieldQuestion size={13} aria-hidden="true" />
              ) : (
                <ShieldCheck size={13} aria-hidden="true" />
              )}
              {effectiveHeadline}
            </span>
          </div>

          <ScannerCryptoShield
            payload={symbol.data}
            onTamperStateChange={handleTamperChange}
          />

          {redirect ? (
            <section
              className={
                redirect.blocked
                  ? "scanner-redirect-box is-blocked"
                  : "scanner-redirect-box"
              }
              aria-label="Redirect destination"
            >
              <div className="scanner-redirect-head">
                <span className="scanner-redirect-label">
                  {redirect.lineLabel}
                </span>
                <span className="scanner-redirect-scheme">
                  {redirect.schemeLabel}
                </span>
              </div>

              {redirect.blocked ? (
                <>
                  <code className="scanner-redirect-blocked-url">
                    {redirect.displayUrl}
                  </code>
                  <p className="scanner-redirect-blocked-note">
                    <ShieldAlert size={14} aria-hidden="true" />
                    <span>{redirect.blockedReason}</span>
                  </p>
                </>
              ) : (
                <>
                  <a
                    ref={primaryLinkRef}
                    href={redirect.href}
                    target={redirect.opensInNewTab ? "_blank" : undefined}
                    rel={
                      redirect.opensInNewTab
                        ? "noopener noreferrer nofollow external"
                        : undefined
                    }
                    className="scanner-redirect-line"
                  >
                    <ExternalLink size={15} aria-hidden="true" />
                    <span>{redirect.displayUrl}</span>
                  </a>
                  <p className="scanner-redirect-hint">
                    Click the redirect link above or the button below to go
                    straight to the source.
                  </p>
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
                      onClick={() => void copy(redirect.href, "redirect")}
                    >
                      {copied === "redirect" ? (
                        <Check size={15} />
                      ) : (
                        <Copy size={15} />
                      )}
                      {copied === "redirect" ? "Link copied" : "Copy link"}
                    </button>
                  </div>
                </>
              )}
            </section>
          ) : (
            <div className="scanner-popup-no-redirect">
              <p>
                This QR code contains{" "}
                <strong>{recognition.label.toLowerCase()}</strong> data rather
                than an external redirect URL. All decoded fields are listed
                below.
              </p>
            </div>
          )}

          <section
            className="scanner-popup-data"
            aria-label="All decoded QR data"
          >
            <div className="scanner-popup-section-head">
              <h3>Complete QR data</h3>
              {recognition.sensitive && (
                <button
                  type="button"
                  className="scanner-link-button"
                  onClick={() => setShowSecrets((value) => !value)}
                >
                  {showSecrets ? (
                    <>
                      <EyeOff size={13} /> Hide sensitive fields
                    </>
                  ) : (
                    <>
                      <Eye size={13} /> Show sensitive fields
                    </>
                  )}
                </button>
              )}
            </div>

            {item.imageUrl && (
              <div className="scanner-popup-preview">
                <Image
                  src={item.imageUrl}
                  alt={`Scanned QR from ${item.sourceName}`}
                  width={item.imageWidth}
                  height={item.imageHeight}
                  unoptimized
                  loading="eager"
                />
                <div>
                  <strong>{recognition.summary}</strong>
                  <span>
                    {item.imageWidth} × {item.imageHeight} px · QR version{" "}
                    {symbol.version || "auto"} · {symbol.bytes.length} bytes
                  </span>
                </div>
              </div>
            )}

            <dl className="scanner-popup-fields">
              <div>
                <dt>Content type</dt>
                <dd>{recognition.label}</dd>
              </div>
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
                      {field.sensitive && !showSecrets ? (
                        maskSecret(field.value)
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
              <div>
                <dt>Source</dt>
                <dd>
                  {item.sourceName} ({item.imageWidth} × {item.imageHeight} px)
                </dd>
              </div>
              <div>
                <dt>Payload size</dt>
                <dd>
                  {symbol.bytes.length} bytes · {symbol.data.length} characters
                </dd>
              </div>
            </dl>

            <div className="scanner-popup-raw">
              <div className="scanner-popup-raw-head">
                <span>Raw decoded content</span>
                <div className="scanner-popup-raw-actions">
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => void copy(symbol.data, "raw")}
                  >
                    {copied === "raw" ? (
                      <Check size={14} />
                    ) : (
                      <Copy size={14} />
                    )}
                    {copied === "raw" ? "Copied" : "Copy data"}
                  </button>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => void share()}
                  >
                    <Share2 size={14} /> Share
                  </button>
                  <button
                    type="button"
                    className="secondary"
                    onClick={downloadResult}
                  >
                    <Download size={14} /> Download
                  </button>
                  {recognition.type === "vcard" && (
                    <button
                      type="button"
                      className="secondary"
                      onClick={() =>
                        downloadBlob(
                          new Blob([symbol.data], {
                            type: "text/vcard;charset=utf-8",
                          }),
                          "scanned-contact.vcf",
                        )
                      }
                    >
                      <Download size={14} /> Save .vcf
                    </button>
                  )}
                  {recognition.type === "event" && (
                    <button
                      type="button"
                      className="secondary"
                      onClick={() =>
                        downloadBlob(
                          new Blob([symbol.data], {
                            type: "text/calendar;charset=utf-8",
                          }),
                          "scanned-event.ics",
                        )
                      }
                    >
                      <Download size={14} /> Save .ics
                    </button>
                  )}
                  {studioHref && !effectiveHighRisk && (
                    <a href={studioHref} className="secondary qr-mini-button">
                      <Wand2 size={14} aria-hidden="true" /> Customize QR
                    </a>
                  )}
                </div>
              </div>
              <pre className="scanner-popup-payload" tabIndex={0}>
                {symbol.data}
              </pre>
            </div>
          </section>

          <section
            className={`scanner-popup-security ${riskClass}`}
            aria-label="Destination security check"
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
            {inspection.findings.length > 0 ? (
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
                Local structure check found no plain HTTP, raw IP, known URL
                shortener, punycode, lookalike domain, embedded credentials or
                executable scheme. Nothing leaves your device, so external site
                reputation is not queried.
              </p>
            )}
          </section>
        </div>

        <footer className="scanner-modal-foot">
          {redirect && !redirect.blocked && (
            <a
              href={redirect.href}
              target={redirect.opensInNewTab ? "_blank" : undefined}
              rel={
                redirect.opensInNewTab
                  ? "noopener noreferrer nofollow external"
                  : undefined
              }
              className="primary scanner-modal-go"
            >
              <ExternalLink size={16} aria-hidden="true" />
              {redirect.actionLabel}
            </a>
          )}
          <button
            type="button"
            className="secondary scanner-modal-dismiss"
            onClick={onClose}
          >
            Close
          </button>
        </footer>
      </div>
    </div>
  );
}

function maskSecret(value: string) {
  if (value.length <= 2) return "••";
  return `${value.slice(0, 1)}${"•".repeat(Math.min(12, value.length - 2))}${value.slice(-1)}`;
}
