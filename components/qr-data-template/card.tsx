"use client";
/**
 * Shared QR Data Template Card.
 *
 * Renders the structured, themed Data Template for any of QUICKKIT's 28 QR
 * content types — used both on the public `/qr?d=…` scanned page and inside
 * the live preview in the QR Code Generator studio.
 */
import { useState } from "react";
import {
  Calendar,
  Check,
  Copy,
  CreditCard,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  ShieldCheck,
  Wifi,
} from "lucide-react";
import { downloadBlob } from "@/lib/tools/download";
import type {
  DataTemplateAction,
  DataTemplateModel,
} from "@/lib/tools/qr/data-template";

export type QrCardSecurityBadge = {
  status: "verified" | "encrypted-verified" | "unsigned";
  algorithm: string;
  signerFingerprint?: string | null;
  expiresAtSec?: number | null;
};

export default function QrDataTemplateCard({
  model,
  compact = false,
  securityBadge,
}: {
  model: DataTemplateModel;
  /** Compact mode scales spacing slightly for the in-studio preview. */
  compact?: boolean;
  securityBadge?: QrCardSecurityBadge;
}) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showSecrets, setShowSecrets] = useState(false);
  const { theme } = model;

  const copyValue = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(
        () => setCopiedId((current) => (current === id ? null : current)),
        2000,
      );
    } catch {
      /* clipboard unavailable in restricted frames */
    }
  };

  const triggerDownload = (action: DataTemplateAction) => {
    if (!action.downloadContent || !action.downloadName) return;
    const blob = new Blob([action.downloadContent], {
      type: action.downloadMime ?? "text/plain;charset=utf-8",
    });
    downloadBlob(blob, action.downloadName);
  };

  const actionIcon = (action: DataTemplateAction) => {
    if (action.kind === "copy") {
      return copiedId === action.id ? <Check size={15} /> : <Copy size={15} />;
    }
    if (action.kind === "download") return <Download size={15} />;
    if (action.href?.startsWith("upi://")) return <CreditCard size={15} />;
    if (action.href?.startsWith("tel:")) return <Phone size={15} />;
    if (action.href?.startsWith("mailto:")) return <Mail size={15} />;
    if (action.href?.startsWith("sms:")) return <MessageSquare size={15} />;
    return <ExternalLink size={15} />;
  };

  return (
    <article
      className={
        compact
          ? `qr-dt-card compact${theme.dark ? " is-dark" : ""}`
          : `qr-dt-card${theme.dark ? " is-dark" : ""}`
      }
      data-qr-template-type={model.typeId}
      data-qr-template-theme={theme.id}
      style={
        {
          "--dt-card-bg": theme.cardBg,
          "--dt-card-border": theme.cardBorder,
          "--dt-ink": theme.ink,
          "--dt-muted": theme.muted,
          "--dt-accent": theme.accent,
          "--dt-accent-soft": theme.accentSoft,
        } as React.CSSProperties
      }
    >
      <header
        className="qr-dt-header"
        style={{ background: theme.headerBg, color: theme.headerText }}
      >
        <div className="qr-dt-header-top">
          <span className="qr-dt-badge">{model.badge}</span>
          {!model.hasNativeWebLink ? (
            <span className="qr-dt-badge subtle">Hosted Data Card</span>
          ) : null}
        </div>
        <div className="qr-dt-identity">
          <span className="qr-dt-avatar" aria-hidden="true">
            {model.avatarText}
          </span>
          <div className="qr-dt-titles">
            {compact ? (
              <strong className="qr-dt-headline">{model.headline}</strong>
            ) : (
              <h1 className="qr-dt-headline">{model.headline}</h1>
            )}
            {model.subheadline ? (
              <p className="qr-dt-subheadline">{model.subheadline}</p>
            ) : null}
          </div>
        </div>
      </header>

      <div className="qr-dt-body">
        {model.highlight?.kind === "payment" ? (
          <div className="qr-dt-highlight payment">
            <div className="qr-dt-pay-label">
              <CreditCard size={15} aria-hidden="true" /> Payment Request
            </div>
            <strong className="qr-dt-pay-amount">
              {model.highlight.amountDisplay}
            </strong>
            {model.highlight.upiId ? (
              <span className="qr-dt-pay-vpa">
                UPI ID: <code>{model.highlight.upiId}</code>
              </span>
            ) : null}
            {model.highlight.note ? (
              <p className="qr-dt-pay-note">“{model.highlight.note}”</p>
            ) : null}
          </div>
        ) : null}

        {model.highlight?.kind === "wifi" ? (
          <div className="qr-dt-highlight wifi">
            <div className="qr-dt-wifi-row">
              <Wifi size={16} aria-hidden="true" />
              <div>
                <small>Network (SSID)</small>
                <strong>{model.highlight.ssid}</strong>
              </div>
            </div>
            {model.highlight.password ? (
              <div className="qr-dt-wifi-secret">
                <div>
                  <small>Password</small>
                  <code>
                    {showSecrets
                      ? model.highlight.password
                      : "•".repeat(
                          Math.min(
                            14,
                            Math.max(8, model.highlight.password.length),
                          ),
                        )}
                  </code>
                </div>
                <button
                  type="button"
                  className="qr-dt-mini-btn"
                  onClick={() => setShowSecrets((v) => !v)}
                  aria-label={showSecrets ? "Hide password" : "Show password"}
                >
                  {showSecrets ? <EyeOff size={14} /> : <Eye size={14} />}
                  <span>{showSecrets ? "Hide" : "Show"}</span>
                </button>
              </div>
            ) : model.highlight.passwordOmitted ? (
              <p className="qr-dt-note-muted">
                Password was not included when this link was shared.
              </p>
            ) : null}
          </div>
        ) : null}

        {model.highlight?.kind === "note" ? (
          <div className="qr-dt-highlight note">
            <div className="qr-dt-note-head">
              <FileText size={14} aria-hidden="true" />
              <span>Decoded Text</span>
            </div>
            <pre className="qr-dt-note-text">{model.highlight.text}</pre>
          </div>
        ) : null}

        {model.highlight?.kind === "message" ? (
          <div className="qr-dt-highlight message">
            <div className="qr-dt-note-head">
              <MessageSquare size={14} aria-hidden="true" />
              <span>{model.highlight.channel}</span>
            </div>
            {model.highlight.subject ? (
              <strong className="qr-dt-msg-subject">
                {model.highlight.subject}
              </strong>
            ) : null}
            <p className="qr-dt-msg-body">{model.highlight.body}</p>
          </div>
        ) : null}

        {model.highlight?.kind === "event" ? (
          <div className="qr-dt-highlight event">
            <div className="qr-dt-event-line">
              <Calendar size={15} aria-hidden="true" />
              <strong>{model.highlight.when}</strong>
            </div>
            {model.highlight.where ? (
              <div className="qr-dt-event-line muted">
                <MapPin size={14} aria-hidden="true" />
                <span>{model.highlight.where}</span>
              </div>
            ) : null}
            {model.highlight.description ? (
              <p className="qr-dt-msg-body">{model.highlight.description}</p>
            ) : null}
          </div>
        ) : null}

        {model.highlight?.kind === "links" ? (
          <nav className="qr-dt-smart-links" aria-label="Smart links">
            {model.highlight.links.map((link, idx) => (
              <a
                key={`${link.url}-${idx}`}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="qr-dt-smart-link"
                style={{ background: theme.accent }}
              >
                <span>{link.label}</span>
                <ExternalLink size={14} aria-hidden="true" />
              </a>
            ))}
          </nav>
        ) : null}

        {model.actions.length > 0 ? (
          <div className="qr-dt-actions">
            {model.actions.map((action) => {
              const cls = action.primary
                ? "qr-dt-btn primary"
                : "qr-dt-btn secondary";
              if (action.kind === "link" && action.href) {
                return (
                  <a
                    key={action.id}
                    href={action.href}
                    className={cls}
                    target={action.external ? "_blank" : undefined}
                    rel={action.external ? "noopener noreferrer" : undefined}
                    style={
                      action.primary ? { background: theme.accent } : undefined
                    }
                  >
                    {actionIcon(action)}
                    <span>{action.label}</span>
                  </a>
                );
              }
              if (action.kind === "download") {
                return (
                  <button
                    key={action.id}
                    type="button"
                    className={cls}
                    onClick={() => triggerDownload(action)}
                    style={
                      action.primary ? { background: theme.accent } : undefined
                    }
                  >
                    {actionIcon(action)}
                    <span>{action.label}</span>
                  </button>
                );
              }
              return (
                <button
                  key={action.id}
                  type="button"
                  className={cls}
                  onClick={() =>
                    action.copyText &&
                    void copyValue(action.id, action.copyText)
                  }
                  style={
                    action.primary ? { background: theme.accent } : undefined
                  }
                >
                  {actionIcon(action)}
                  <span>
                    {copiedId === action.id ? "Copied" : action.label}
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}

        {model.fields.length > 0 ? (
          <dl className="qr-dt-fields" aria-label="Structured QR details">
            {model.fields.map((field) => {
              const displayText =
                field.secret && !showSecrets
                  ? "•".repeat(Math.min(14, Math.max(8, field.value.length)))
                  : field.value;
              const copyKey = `field-${field.key}`;
              return (
                <div key={field.key} className="qr-dt-field-row">
                  <dt>{field.label}</dt>
                  <dd>
                    <div className="qr-dt-field-val">
                      {field.href && !field.secret ? (
                        <a
                          href={field.href}
                          target={
                            /^https?:/i.test(field.href) ? "_blank" : undefined
                          }
                          rel={
                            /^https?:/i.test(field.href)
                              ? "noopener noreferrer"
                              : undefined
                          }
                          className={field.mono ? "mono" : undefined}
                        >
                          {displayText}
                        </a>
                      ) : (
                        <span className={field.mono ? "mono" : undefined}>
                          {displayText}
                        </span>
                      )}
                      {field.copyable ? (
                        <button
                          type="button"
                          className="qr-dt-copy-inline"
                          onClick={() => void copyValue(copyKey, field.value)}
                          aria-label={`Copy ${field.key} field`}
                          title={`Copy ${field.label}`}
                        >
                          {copiedId === copyKey ? (
                            <Check size={13} />
                          ) : (
                            <Copy size={13} />
                          )}
                        </button>
                      ) : null}
                    </div>
                  </dd>
                </div>
              );
            })}
          </dl>
        ) : null}

        <footer className="qr-dt-foot">
          <ShieldCheck size={13} aria-hidden="true" />
          <span>
            {securityBadge?.status === "encrypted-verified"
              ? `AES-256-GCM decrypted & authenticated locally${securityBadge.signerFingerprint ? ` · Signer ${securityBadge.signerFingerprint}` : ""}.`
              : securityBadge?.status === "verified"
                ? `Tamper-proof ECDSA P-256 signature verified${securityBadge.signerFingerprint ? ` · Signer ${securityBadge.signerFingerprint}` : ""}.`
                : "Decoded locally from this QR link — nothing is stored on a server."}
          </span>
        </footer>
      </div>
    </article>
  );
}
