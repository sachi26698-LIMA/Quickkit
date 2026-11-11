"use client";
/**
 * Scanner Cryptographic Verification, Trusted Signer Pinning, Inline
 * AES-256-GCM Decryption & Forensic SHA-256 Digest.
 *
 * Shared between `ScanRedirectModal` (the immediate scan popup) and
 * `ResultsPanel` so every scanned QR code gets full Web Crypto verification
 * (`ECDSA P-256` signature check + `AES-256-GCM` decryption).
 */
import { useEffect, useState } from "react";
import {
  BookmarkCheck,
  Check,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Fingerprint,
  KeyRound,
  Lock,
  ShieldAlert,
  ShieldCheck,
  Unlock,
} from "lucide-react";
import QrDataTemplateCard from "@/components/qr-data-template/card";
import {
  DIRECT_ENCRYPTED_PREFIX,
  loadPinnedSigners,
  pinTrustedSigner,
  sha256Hex,
  unpinTrustedSigner,
} from "@/lib/tools/qr/crypto-security";
import {
  isQuickkitDataTemplateUrl,
  isQuickkitEncryptedTemplateUrl,
  verifyAndResolveQrPayload,
  type VerifiedQrResolution,
} from "@/lib/tools/qr/data-template";
import { recognize } from "@/lib/tools/qr-scanner/content";
import { resolveRedirectTarget } from "@/lib/tools/qr-scanner/redirect";

export type AsyncTamperState = {
  blocked: boolean;
  reason: string | null;
};

function isCryptoRelevantPayload(payload: string): boolean {
  const trimmed = payload.trim();
  return (
    trimmed.startsWith(DIRECT_ENCRYPTED_PREFIX) ||
    isQuickkitEncryptedTemplateUrl(trimmed) ||
    isQuickkitDataTemplateUrl(trimmed)
  );
}

export default function ScannerCryptoShield({
  payload,
  onTamperStateChange,
}: {
  payload: string;
  onTamperStateChange?: (state: AsyncTamperState) => void;
}) {
  const [digest, setDigest] = useState<string>("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [resolution, setResolution] = useState<{
    target: string;
    value: VerifiedQrResolution;
  } | null>(null);
  const [passphrase, setPassphrase] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [pinnedSet, setPinnedSet] = useState<Set<string>>(
    () => new Set(loadPinnedSigners().map((s) => s.fingerprint)),
  );

  const cryptoRelevant = isCryptoRelevantPayload(payload);

  useEffect(() => {
    let cancelled = false;
    void sha256Hex(payload)
      .then((hex) => {
        if (!cancelled) setDigest(hex);
      })
      .catch(() => {
        /* ignore */
      });
    return () => {
      cancelled = true;
    };
  }, [payload]);

  useEffect(() => {
    if (!cryptoRelevant) {
      onTamperStateChange?.({ blocked: false, reason: null });
      return;
    }
    let cancelled = false;
    void verifyAndResolveQrPayload(payload).then((res) => {
      if (cancelled) return;
      setResolution({ target: payload, value: res });
      if (res.state === "tampered" || res.state === "expired") {
        onTamperStateChange?.({
          blocked: true,
          reason: `${res.headline}: ${res.message}`,
        });
      } else {
        onTamperStateChange?.({ blocked: false, reason: null });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [cryptoRelevant, onTamperStateChange, payload]);

  const activeRes = resolution?.target === payload ? resolution.value : null;

  const copyText = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((c) => (c === key ? null : c)), 2000);
    } catch {
      /* ignore */
    }
  };

  const togglePinSigner = (fingerprint: string) => {
    if (pinnedSet.has(fingerprint)) {
      const next = unpinTrustedSigner(fingerprint);
      setPinnedSet(new Set(next.map((s) => s.fingerprint)));
    } else {
      const next = pinTrustedSigner(fingerprint);
      setPinnedSet(new Set(next.map((s) => s.fingerprint)));
    }
  };

  const handleDecrypt = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!passphrase.trim()) return;
    setUnlocking(true);
    try {
      const res = await verifyAndResolveQrPayload(payload, { passphrase });
      setResolution({ target: payload, value: res });
      if (res.state === "tampered" || res.state === "expired") {
        onTamperStateChange?.({
          blocked: true,
          reason: `${res.headline}: ${res.message}`,
        });
      } else {
        onTamperStateChange?.({ blocked: false, reason: null });
      }
    } finally {
      setUnlocking(false);
    }
  };

  return (
    <div className="scanner-crypto-wrap" data-testid="scanner-crypto-shield">
      {cryptoRelevant && activeRes ? (
        activeRes.state === "tampered" || activeRes.state === "expired" ? (
          <div
            className="scanner-crypto-banner danger"
            role="alert"
            data-crypto-verdict={activeRes.state}
          >
            <ShieldAlert size={16} aria-hidden="true" />
            <div>
              <strong>{activeRes.headline}</strong>
              <p>{activeRes.message}</p>
            </div>
          </div>
        ) : activeRes.state === "locked" ? (
          <div className="scanner-crypto-vault" data-crypto-verdict="locked">
            <div className="scanner-crypto-vault-head">
              <Lock size={15} aria-hidden="true" />
              <div>
                <strong>AES-256-GCM Encrypted QR Vault</strong>
                <span>
                  Protected with PBKDF2-SHA256 + 128-bit authentication tag.
                  Enter passphrase to decrypt &amp; verify inside the scanner.
                </span>
              </div>
            </div>
            {activeRes.signerFingerprint ? (
              <p className="scanner-crypto-signer-line">
                <ShieldCheck size={13} aria-hidden="true" />
                <span>
                  Outer ECDSA P-256 Seal Verified ·{" "}
                  <code>{activeRes.signerFingerprint}</code>
                </span>
              </p>
            ) : null}
            {activeRes.hint ? (
              <p className="scanner-crypto-hint">
                <KeyRound size={13} aria-hidden="true" /> Hint:{" "}
                <strong>{activeRes.hint}</strong>
              </p>
            ) : null}
            <form
              onSubmit={(e) => void handleDecrypt(e)}
              className="scanner-crypto-unlock-form"
            >
              <input
                type={showPass ? "text" : "password"}
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder="Enter passphrase / PIN to decrypt…"
                aria-label="QR decryption passphrase"
                autoComplete="off"
              />
              <button
                type="button"
                className="secondary"
                onClick={() => setShowPass((v) => !v)}
                aria-label={showPass ? "Hide passphrase" : "Show passphrase"}
              >
                {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
              <button
                type="submit"
                className="primary"
                disabled={unlocking || !passphrase.trim()}
              >
                <Unlock size={14} aria-hidden="true" />
                {unlocking ? "Decrypting…" : "Decrypt QR"}
              </button>
            </form>
            {activeRes.errorMessage ? (
              <p className="scanner-crypto-error" role="alert">
                <ShieldAlert size={13} aria-hidden="true" />
                <span>{activeRes.errorMessage}</span>
              </p>
            ) : null}
          </div>
        ) : activeRes.state === "decrypted-raw" ? (
          <DecryptedRawView
            plaintext={activeRes.plaintext}
            algorithm={activeRes.algorithm}
            copiedKey={copiedKey}
            onCopy={copyText}
          />
        ) : activeRes.state === "ready" ? (
          <div className="scanner-crypto-verified-stack">
            {activeRes.securityStatus !== "unsigned" ? (
              <div
                className="scanner-crypto-banner verified"
                data-crypto-verdict={activeRes.securityStatus}
              >
                <ShieldCheck size={16} aria-hidden="true" />
                <div className="scanner-crypto-verified-body">
                  <div>
                    <strong>
                      {activeRes.securityStatus === "encrypted-verified"
                        ? "Decrypted & Tamper-Verified (AES-256-GCM)"
                        : "Tamper-Proof Digital Signature Verified"}
                    </strong>
                    <span>
                      {activeRes.algorithm}
                      {activeRes.signerFingerprint
                        ? ` · Signer ${activeRes.signerFingerprint}`
                        : ""}
                    </span>
                  </div>
                  {activeRes.signerFingerprint ? (
                    <button
                      type="button"
                      className="secondary qr-mini-button"
                      onClick={() =>
                        togglePinSigner(activeRes.signerFingerprint!)
                      }
                    >
                      <BookmarkCheck size={13} aria-hidden="true" />
                      {pinnedSet.has(activeRes.signerFingerprint)
                        ? "Pinned Trusted Signer"
                        : "Pin Trusted Signer"}
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}

            {isQuickkitEncryptedTemplateUrl(payload) ? (
              <div className="scanner-crypto-inline-card">
                <QrDataTemplateCard
                  model={activeRes.model}
                  compact
                  securityBadge={{
                    status: activeRes.securityStatus,
                    algorithm: activeRes.algorithm,
                    signerFingerprint: activeRes.signerFingerprint,
                    expiresAtSec: activeRes.expiresAtSec,
                  }}
                />
              </div>
            ) : null}
          </div>
        ) : null
      ) : null}

      {digest ? (
        <div className="scanner-sha256-bar">
          <span className="scanner-sha256-label">
            <Fingerprint size={13} aria-hidden="true" /> SHA-256 Integrity
            Digest:
          </span>
          <code title={digest}>
            {digest.slice(0, 16)}…{digest.slice(-12)}
          </code>
          <button
            type="button"
            className="scanner-copy-sha"
            onClick={() => void copyText("sha", digest)}
            aria-label="Copy SHA-256 digest"
          >
            {copiedKey === "sha" ? <Check size={12} /> : <Copy size={12} />}
            {copiedKey === "sha" ? "Copied" : "Copy Hash"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function DecryptedRawView({
  plaintext,
  algorithm,
  copiedKey,
  onCopy,
}: {
  plaintext: string;
  algorithm: string;
  copiedKey: string | null;
  onCopy: (key: string, text: string) => Promise<void>;
}) {
  const innerRec = recognize(plaintext);
  const innerRedirect = resolveRedirectTarget(plaintext, innerRec);

  return (
    <div
      className="scanner-crypto-decrypted-box"
      data-crypto-verdict="decrypted-raw"
    >
      <div className="scanner-crypto-banner verified">
        <ShieldCheck size={16} aria-hidden="true" />
        <div>
          <strong>Vault Unlocked &amp; Authenticated ({innerRec.label})</strong>
          <span>{algorithm} — 128-bit GCM integrity tag verified</span>
        </div>
      </div>

      {innerRedirect && !innerRedirect.blocked ? (
        <div className="scanner-crypto-decrypted-redirect">
          <a
            href={innerRedirect.href}
            target={innerRedirect.opensInNewTab ? "_blank" : undefined}
            rel={
              innerRedirect.opensInNewTab
                ? "noopener noreferrer nofollow external"
                : undefined
            }
            className="primary scanner-redirect-cta"
          >
            <ExternalLink size={14} aria-hidden="true" />
            {innerRedirect.actionLabel}
          </a>
        </div>
      ) : null}

      <div className="scanner-crypto-decrypted-raw">
        <pre>{plaintext}</pre>
        <button
          type="button"
          className="secondary qr-mini-button"
          onClick={() => void onCopy("decrypted", plaintext)}
        >
          {copiedKey === "decrypted" ? <Check size={13} /> : <Copy size={13} />}
          {copiedKey === "decrypted"
            ? "Copied decrypted data"
            : "Copy decrypted data"}
        </button>
      </div>
    </div>
  );
}
