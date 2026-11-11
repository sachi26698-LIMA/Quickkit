"use client";
/**
 * DATA TEMPLATE, ORIGINAL LINK & HIGH-SECURITY SHIELD PANEL — embedded inside
 * the Content card.
 *
 * Gives every QR content type a hosted QUICKKIT Data Template (`/qr?d=…` or
 * `/qr?e=…`) encoded directly inside the QR symbol, protected by ECDSA P-256
 * anti-tamper digital signatures and AES-256-GCM authenticated encryption.
 */
import { useRef, useState } from "react";
import {
  Copy,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  LayoutTemplate,
  Link2,
  Lock,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Upload,
} from "lucide-react";
import QrDataTemplateCard from "@/components/qr-data-template/card";
import {
  evaluatePassphraseStrength,
  type QrExpiryOption,
} from "@/lib/tools/qr/crypto-security";
import { hasDirectWebLink, redactForDisplay } from "@/lib/tools/qr/payload";
import type { QrSecurityMode } from "@/lib/tools/qr/types";
import { QrDisclosure } from "./shared";
import type { QrStudio } from "./use-qr-studio";

const SECURITY_MODES: {
  id: QrSecurityMode;
  title: string;
  subtitle: string;
}[] = [
  {
    id: "signed",
    title: "Tamper-Proof Signed",
    subtitle: "ECDSA P-256 seal blocks any data edit",
  },
  {
    id: "auto-aes",
    title: "AES-256 Auto-Key",
    subtitle: "Zero-knowledge #k= key · 0-click scan",
  },
  {
    id: "password-aes",
    title: "Password Vault",
    subtitle: "AES-256-GCM + PBKDF2 passphrase lock",
  },
  {
    id: "none",
    title: "Standard Unsigned",
    subtitle: "Compact link without crypto seal",
  },
];

export default function DataTemplatePanel({ studio }: { studio: QrStudio }) {
  const {
    typeId,
    def,
    values,
    encodingMode,
    setEncodingMode,
    securityMode,
    setSecurityMode,
    encryptionPassphrase,
    setEncryptionPassphrase,
    encryptionHint,
    setEncryptionHint,
    expiryPreset,
    setExpiryPreset,
    customExpiry,
    setCustomExpiry,
    signerFingerprint,
    rotateSignerKey,
    exportSignerKey,
    importSignerKey,
    dataTemplateTheme,
    setDataTemplateTheme,
    dataTemplateTitle,
    setDataTemplateTitle,
    dataTemplates,
    originalLink,
    dataTemplateModel,
    copyOriginalLink,
  } = studio;

  const [showPass, setShowPass] = useState(false);
  const keyFileInputRef = useRef<HTMLInputElement | null>(null);

  const nativeWebLink = hasDirectWebLink(typeId, dataTemplateModel?.rawPayload);
  const activeTheme =
    dataTemplates.find((theme) => theme.id === dataTemplateTheme) ??
    dataTemplates[0];
  const displayLink = originalLink
    ? redactForDisplay(originalLink, typeId, values)
    : "";
  const passStrength = evaluatePassphraseStrength(encryptionPassphrase);

  const securityHintLabel =
    securityMode === "password-aes"
      ? "AES-256-GCM Password Vault"
      : encodingMode === "raw"
        ? "Direct Raw Mode (use Password Vault to encrypt)"
        : securityMode === "auto-aes"
          ? "AES-256-GCM Zero-Knowledge + ECDSA"
          : securityMode === "signed"
            ? `ECDSA P-256 Tamper Seal${signerFingerprint ? ` · ${signerFingerprint}` : ""}`
            : "Unsealed Link";

  return (
    <div className="qr-dt-studio-box" id="qr-data-template-box">
      <div className="qr-dt-mode-head">
        <div>
          <span className="qr-block-label">QR scan destination & link</span>
          <p className="qr-dt-mode-hint">
            {!nativeWebLink
              ? `${def.label} has no web page of its own — Data Template mode creates an original link inside the QR so any scanner opens a formatted card.`
              : "Data Template mode wraps your content in a styled card with an original link inside the QR, or switch to Direct Raw Content."}
          </p>
        </div>
        {!nativeWebLink ? (
          <span className="qr-dt-pill">Auto link for {def.label}</span>
        ) : null}
      </div>

      <div className="qr-dt-mode-switch" role="group" aria-label="QR scan mode">
        <button
          type="button"
          className={
            encodingMode === "template"
              ? "qr-dt-mode-btn active"
              : "qr-dt-mode-btn"
          }
          aria-pressed={encodingMode === "template"}
          onClick={() => setEncodingMode("template")}
        >
          <LayoutTemplate size={15} aria-hidden="true" />
          <span>
            <strong>Data Template + Link</strong>
            <small>
              Encodes original{" "}
              <code>
                {securityMode === "auto-aes" || securityMode === "password-aes"
                  ? "/qr?e=…"
                  : "/qr?d=…"}
              </code>{" "}
              link inside QR
            </small>
          </span>
        </button>
        <button
          type="button"
          className={
            encodingMode === "raw" ? "qr-dt-mode-btn active" : "qr-dt-mode-btn"
          }
          aria-pressed={encodingMode === "raw"}
          onClick={() => setEncodingMode("raw")}
        >
          <Link2 size={15} aria-hidden="true" />
          <span>
            <strong>Direct Raw Content</strong>
            <small>
              {securityMode === "password-aes"
                ? "Encodes offline QKE1 AES-256-GCM vault"
                : `Encodes standard ${def.label} string only`}
            </small>
          </span>
        </button>
      </div>

      <div className="qr-dt-link-bar" id="qr-original-link">
        <div className="qr-dt-link-meta">
          <span className="qr-dt-link-title">
            <Link2 size={13} aria-hidden="true" /> Original QR Data Template
            Link
          </span>
          <div className="qr-dt-link-badges">
            {securityMode !== "none" &&
            (encodingMode === "template" || securityMode === "password-aes") ? (
              <span className="qr-dt-crypto-pill">
                <ShieldCheck size={11} aria-hidden="true" />
                {securityMode === "password-aes"
                  ? "AES-256-GCM Locked"
                  : securityMode === "auto-aes"
                    ? "AES-256-GCM + ECDSA"
                    : "ECDSA Tamper-Sealed"}
              </span>
            ) : null}
            <span
              className={
                originalLink && encodingMode === "template"
                  ? "qr-dt-status active"
                  : "qr-dt-status"
              }
            >
              {!originalLink
                ? securityMode === "password-aes" &&
                  encryptionPassphrase.trim().length < 4
                  ? "set passphrase to generate"
                  : "fill fields to generate"
                : encodingMode === "template"
                  ? "encoded inside QR"
                  : "ready (raw mode active)"}
            </span>
          </div>
        </div>

        {originalLink ? (
          <>
            <a
              href={originalLink}
              target="_blank"
              rel="noopener noreferrer"
              className="qr-dt-link-url"
              title="Open the live Data Template page in a new tab"
            >
              {displayLink}
            </a>
            <div className="qr-dt-link-actions">
              <button
                type="button"
                className="secondary qr-mini-button"
                onClick={() => void copyOriginalLink()}
              >
                <Copy size={13} aria-hidden="true" /> Copy Original Link
              </button>
              <a
                href={originalLink}
                target="_blank"
                rel="noopener noreferrer"
                className="primary qr-mini-button qr-dt-open-btn"
              >
                <ExternalLink size={13} aria-hidden="true" /> Open Data Template
              </a>
            </div>
          </>
        ) : (
          <p className="qr-dt-link-placeholder">
            {securityMode === "password-aes" &&
            encryptionPassphrase.trim().length < 4
              ? "Enter a passphrase (4+ characters) in High-Security Encryption below to generate your locked QR link."
              : `Complete the ${def.label} fields above to create your original scannable Data Template link.`}
          </p>
        )}
      </div>

      <QrDisclosure
        id="qr-security-shield"
        level="sub"
        title="High-Security Encryption & Anti-Tamper"
        hint={securityHintLabel}
        icon={<ShieldCheck size={14} />}
      >
        <span className="qr-block-label">Cryptographic protection level</span>
        <div
          className="qr-dt-security-grid"
          role="group"
          aria-label="QR security level"
        >
          {SECURITY_MODES.map((option) => {
            const active = securityMode === option.id;
            const disabledInRaw =
              encodingMode === "raw" &&
              (option.id === "signed" || option.id === "auto-aes");
            return (
              <button
                key={option.id}
                type="button"
                className={
                  active ? "qr-dt-theme-item active" : "qr-dt-theme-item"
                }
                aria-pressed={active}
                disabled={disabledInRaw}
                onClick={() => setSecurityMode(option.id)}
              >
                <strong>{option.title}</strong>
                <small>
                  {disabledInRaw
                    ? "Switch to Data Template + Link to use"
                    : option.subtitle}
                </small>
              </button>
            );
          })}
        </div>

        {securityMode === "password-aes" ? (
          <div className="qr-dt-pass-box">
            <div className="qr-field">
              <div className="qr-dt-pass-label-row">
                <label htmlFor="qr-security-passphrase">
                  Encryption Passphrase / PIN{" "}
                  <span className="qr-req">required</span>
                </label>
                <span
                  className={`qr-dt-strength score-${passStrength.score}`}
                  aria-live="polite"
                >
                  <Lock size={11} aria-hidden="true" /> {passStrength.label}
                </span>
              </div>
              <div className="qr-dt-pass-input-row">
                <input
                  id="qr-security-passphrase"
                  type={showPass ? "text" : "password"}
                  className="qr-input"
                  maxLength={128}
                  value={encryptionPassphrase}
                  placeholder="Min 4 characters — encrypts with AES-256-GCM + PBKDF2"
                  autoComplete="new-password"
                  onChange={(event) =>
                    setEncryptionPassphrase(event.target.value)
                  }
                />
                <button
                  type="button"
                  className="secondary qr-mini-button"
                  onClick={() => setShowPass((v) => !v)}
                  aria-label={
                    showPass
                      ? "Hide encryption passphrase"
                      : "Show encryption passphrase"
                  }
                >
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <p className="help">
                Uses 210,000 PBKDF2-HMAC-SHA256 iterations + AES-256-GCM
                (128-bit auth tag). Nobody can read or tamper with the QR
                without this passphrase.
              </p>
            </div>

            <div className="qr-field">
              <label htmlFor="qr-security-hint">
                Passphrase hint (optional, tamper-authenticated)
              </label>
              <input
                id="qr-security-hint"
                type="text"
                className="qr-input"
                maxLength={60}
                value={encryptionHint}
                placeholder="e.g. Last 4 digits of invoice number"
                onChange={(event) => setEncryptionHint(event.target.value)}
              />
            </div>
          </div>
        ) : null}

        <div className="qr-field">
          <label htmlFor="qr-security-expiry">
            Cryptographic QR expiry (tamper-locked)
          </label>
          <select
            id="qr-security-expiry"
            className="qr-input"
            value={expiryPreset}
            onChange={(event) =>
              setExpiryPreset(event.target.value as QrExpiryOption)
            }
          >
            <option value="none">Never expires</option>
            <option value="1h">Expires in 1 hour</option>
            <option value="24h">Expires in 24 hours</option>
            <option value="7d">Expires in 7 days</option>
            <option value="30d">Expires in 30 days</option>
            <option value="custom">Custom expiration date & time</option>
          </select>
        </div>

        {expiryPreset === "custom" ? (
          <div className="qr-field">
            <label htmlFor="qr-security-custom-expiry">
              Valid until (date & time)
            </label>
            <input
              id="qr-security-custom-expiry"
              type="datetime-local"
              className="qr-input"
              value={customExpiry}
              onChange={(event) => setCustomExpiry(event.target.value)}
            />
          </div>
        ) : null}

        <div className="qr-dt-signer-box">
          <div className="qr-dt-signer-info">
            <KeyRound size={14} aria-hidden="true" />
            <div>
              <strong>
                Creator ECDSA P-256 Key:{" "}
                <code>{signerFingerprint ?? "generating…"}</code>
              </strong>
              <small>
                Signs your QR links locally so scanners can detect any tampering
                or sticker swap.
              </small>
            </div>
          </div>
          <div className="qr-dt-signer-actions">
            <button
              type="button"
              className="secondary qr-mini-button"
              onClick={() => void exportSignerKey()}
            >
              <Download size={12} aria-hidden="true" /> Backup Key
            </button>
            <button
              type="button"
              className="secondary qr-mini-button"
              onClick={() => keyFileInputRef.current?.click()}
            >
              <Upload size={12} aria-hidden="true" /> Import Key
            </button>
            <button
              type="button"
              className="secondary qr-mini-button"
              onClick={() => void rotateSignerKey()}
            >
              <RefreshCw size={12} aria-hidden="true" /> Rotate Key
            </button>
            <input
              ref={keyFileInputRef}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              aria-label="Import signing key JSON"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void importSignerKey(file);
                event.target.value = "";
              }}
            />
          </div>
        </div>
      </QrDisclosure>

      <QrDisclosure
        id="qr-data-template-picker"
        level="sub"
        title="Customize Data Template & Preview"
        hint={`Theme: ${activeTheme.name}`}
        icon={<Sparkles size={14} />}
      >
        <span className="qr-block-label">Data Template theme</span>
        <div
          className="qr-dt-theme-grid"
          role="group"
          aria-label="Data Template theme"
        >
          {dataTemplates.map((theme) => {
            const active = theme.id === dataTemplateTheme;
            return (
              <button
                key={theme.id}
                type="button"
                className={
                  active ? "qr-dt-theme-item active" : "qr-dt-theme-item"
                }
                aria-pressed={active}
                aria-label={`Use ${theme.name} data template`}
                onClick={() => setDataTemplateTheme(theme.id)}
              >
                <span
                  className="qr-dt-theme-swatch"
                  style={{ background: theme.headerBg }}
                  aria-hidden="true"
                />
                <strong>{theme.name}</strong>
                <small>{theme.blurb}</small>
              </button>
            );
          })}
        </div>

        <div className="qr-field">
          <label htmlFor="qr-dt-custom-title">
            Custom card heading (optional)
          </label>
          <input
            id="qr-dt-custom-title"
            type="text"
            className="qr-input"
            maxLength={80}
            value={dataTemplateTitle}
            placeholder="Leave blank to use the smart title from your fields"
            onChange={(event) => setDataTemplateTitle(event.target.value)}
          />
        </div>

        <span className="qr-block-label">
          Live Scanned Data Template Preview
        </span>
        {dataTemplateModel ? (
          <div className="qr-dt-live-wrap">
            <QrDataTemplateCard
              model={dataTemplateModel}
              compact
              securityBadge={{
                status:
                  securityMode === "auto-aes" || securityMode === "password-aes"
                    ? "encrypted-verified"
                    : securityMode === "signed"
                      ? "verified"
                      : "unsigned",
                algorithm:
                  securityMode === "password-aes"
                    ? "AES-256-GCM + PBKDF2-SHA256"
                    : securityMode === "auto-aes"
                      ? "AES-256-GCM + ECDSA P-256"
                      : "ECDSA P-256",
                signerFingerprint,
              }}
            />
          </div>
        ) : (
          <p className="help">
            Fill in the {def.label} fields above (or click{" "}
            <strong>Try sample</strong>) to preview how scanners will display
            your Data Card.
          </p>
        )}
      </QrDisclosure>
    </div>
  );
}
