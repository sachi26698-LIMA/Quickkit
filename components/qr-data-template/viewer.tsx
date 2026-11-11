"use client";
/**
 * Client viewer for `/qr?d=<token>[&sg=<proof>]` and `/qr?e=<encrypted>[#k=<key>]`.
 *
 * Verifies ECDSA P-256 anti-tamper digital signatures and decrypts AES-256-GCM
 * vaults 100% locally in the browser using Web Crypto (`crypto.subtle`).
 */
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Clock,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  QrCode,
  ScanLine,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import {
  DATA_TEMPLATE_PARAM,
  DEFAULT_PUBLIC_ORIGIN,
  decodeDataTemplate,
  inspectQrPayloadSecuritySync,
  verifyAndResolveQrPayload,
  type VerifiedQrResolution,
} from "@/lib/tools/qr/data-template";
import {
  ENCRYPTED_QUERY_PARAM,
  SIGNATURE_QUERY_PARAM,
} from "@/lib/tools/qr/crypto-security";
import QrDataTemplateCard from "./card";

function buildSyntheticHref(
  dToken: string | null,
  eToken: string | null,
  sgToken: string | null,
  hash: string,
): string {
  const params = new URLSearchParams();
  if (dToken) params.set(DATA_TEMPLATE_PARAM, dToken);
  if (eToken) params.set(ENCRYPTED_QUERY_PARAM, eToken);
  if (sgToken) params.set(SIGNATURE_QUERY_PARAM, sgToken);
  const qs = params.toString();
  if (!qs && !hash) return "";
  const cleanHash = hash ? (hash.startsWith("#") ? hash : `#${hash}`) : "";
  return `${DEFAULT_PUBLIC_ORIGIN}/qr${qs ? `?${qs}` : ""}${cleanHash}`;
}

function initialSyncResolution(
  dToken: string | null,
  eToken: string | null,
  sgToken: string | null,
  hash: string,
): VerifiedQrResolution | null {
  const fullHref = buildSyntheticHref(dToken, eToken, sgToken, hash);
  if (!fullHref) {
    return {
      state: "empty",
      headline: "QUICKKIT QR Data Card",
      message: "No QR data template was found in this link.",
      signerFingerprint: null,
    };
  }
  const syncCheck = inspectQrPayloadSecuritySync(fullHref, hash);
  if (syncCheck.kind === "tampered" || syncCheck.kind === "expired") {
    return {
      state: syncCheck.kind,
      headline: syncCheck.headline,
      message: syncCheck.detail,
      signerFingerprint: syncCheck.signerFingerprint,
    };
  }
  if (syncCheck.kind === "encrypted-passphrase") {
    return {
      state: "locked",
      hint: syncCheck.hint,
      signerFingerprint: syncCheck.signerFingerprint,
      issuedAtSec: syncCheck.issuedAtSec,
      expiresAtSec: syncCheck.expiresAtSec,
    };
  }
  // Unsealed plain `?d=` links can render synchronously on the very first paint.
  if (dToken && !sgToken && !eToken) {
    const decoded = decodeDataTemplate(dToken, hash);
    if (decoded.ok && !decoded.config.sealed) {
      return {
        state: "ready",
        securityStatus: "unsigned",
        algorithm: "Unsealed Data Template",
        signerFingerprint: null,
        issuedAtSec: null,
        expiresAtSec: decoded.config.expiresAtSec ?? null,
        model: decoded.model,
        config: decoded.config,
      };
    }
  }
  return null;
}

export default function QrDataTemplateViewer() {
  const searchParams = useSearchParams();
  const dToken = searchParams.get(DATA_TEMPLATE_PARAM);
  const eToken = searchParams.get(ENCRYPTED_QUERY_PARAM);
  const sgToken = searchParams.get(SIGNATURE_QUERY_PARAM);

  const [hash, setHash] = useState<string>(() =>
    typeof window !== "undefined" ? window.location.hash || "" : "",
  );
  const [asyncRes, setAsyncRes] = useState<{
    key: string;
    value: VerifiedQrResolution;
  } | null>(null);
  const [passphrase, setPassphrase] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [cooldownUntil, setCooldownUntil] = useState(0);

  useEffect(() => {
    const sync = () => setHash(window.location.hash || "");
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  const currentKey = `${dToken ?? ""}|${eToken ?? ""}|${sgToken ?? ""}|${hash}`;

  useEffect(() => {
    const fullHref = buildSyntheticHref(dToken, eToken, sgToken, hash);
    if (!fullHref) return;
    let cancelled = false;
    void verifyAndResolveQrPayload(fullHref, { explicitHash: hash }).then(
      (res) => {
        if (!cancelled) {
          setAsyncRes({ key: currentKey, value: res });
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [currentKey, dToken, eToken, sgToken, hash]);

  const resolved: VerifiedQrResolution | null =
    asyncRes?.key === currentKey
      ? asyncRes.value
      : initialSyncResolution(dToken, eToken, sgToken, hash);

  const handleUnlock = async (event: React.FormEvent) => {
    event.preventDefault();
    const now = Date.now();
    if (now < cooldownUntil) return;
    const fullHref = buildSyntheticHref(dToken, eToken, sgToken, hash);
    if (!fullHref || !passphrase.trim()) return;
    setUnlocking(true);
    try {
      const res = await verifyAndResolveQrPayload(fullHref, {
        explicitHash: hash,
        passphrase,
      });
      setAsyncRes({ key: currentKey, value: res });
      if (res.state === "locked" && res.errorMessage) {
        const nextFails = failedAttempts + 1;
        setFailedAttempts(nextFails);
        if (nextFails >= 5) {
          setCooldownUntil(Date.now() + 5000);
        }
      } else {
        setFailedAttempts(0);
      }
    } finally {
      setUnlocking(false);
    }
  };

  return (
    <div className="qr-dt-page">
      <div className="qr-dt-shell">
        {!resolved ? (
          <section className="qr-dt-empty-card" aria-busy="true">
            <span className="qr-dt-empty-icon">
              <ShieldCheck size={24} aria-hidden="true" />
            </span>
            <h1>Verifying Cryptographic Seal…</h1>
            <p>
              Checking ECDSA P-256 signature and AES-256-GCM integrity locally
              on your device.
            </p>
          </section>
        ) : resolved.state === "empty" ? (
          <section className="qr-dt-empty-card">
            <span className="qr-dt-empty-icon">
              <QrCode size={24} aria-hidden="true" />
            </span>
            <h1>QUICKKIT QR Data Card</h1>
            <p>
              Scan any QUICKKIT Data Template QR code to view its contact card,
              UPI payment details, Wi‑Fi credentials, event invite or encrypted
              vault here.
            </p>
            <div className="qr-dt-empty-actions">
              <Link href="/tools/qr-generator" className="primary">
                <QrCode size={15} aria-hidden="true" />
                Create a QR Code
              </Link>
              <Link href="/tools/qr-code-scanner" className="secondary">
                <ScanLine size={15} aria-hidden="true" />
                Open QR Scanner
              </Link>
            </div>
          </section>
        ) : resolved.state === "tampered" || resolved.state === "invalid" ? (
          <section
            className="qr-dt-empty-card qr-dt-tamper-card"
            role="alert"
            data-qr-security-state="tampered"
          >
            <span className="qr-dt-empty-icon error">
              <ShieldAlert size={26} aria-hidden="true" />
            </span>
            <h1>{resolved.headline}</h1>
            <p>{resolved.message}</p>
            <p className="qr-dt-security-warning-note">
              For your protection, QUICKKIT blocked all payment links, downloads
              and redirects because this QR code failed cryptographic
              anti-tamper verification. Do not send money or enter credentials
              from an altered QR code.
            </p>
            <div className="qr-dt-empty-actions">
              <Link href="/tools/qr-code-scanner" className="secondary">
                <ScanLine size={15} aria-hidden="true" />
                Inspect in QR Scanner
              </Link>
              <Link href="/tools/qr-generator" className="primary">
                <QrCode size={15} aria-hidden="true" />
                Generate a Fresh QR
              </Link>
            </div>
          </section>
        ) : resolved.state === "expired" ? (
          <section
            className="qr-dt-empty-card qr-dt-expired-card"
            role="alert"
            data-qr-security-state="expired"
          >
            <span className="qr-dt-empty-icon warn">
              <Clock size={24} aria-hidden="true" />
            </span>
            <h1>{resolved.headline}</h1>
            <p>{resolved.message}</p>
            <div className="qr-dt-empty-actions">
              <Link href="/tools/qr-generator" className="primary">
                <QrCode size={15} aria-hidden="true" />
                Create a New QR Code
              </Link>
            </div>
          </section>
        ) : resolved.state === "locked" ? (
          <section
            className="qr-dt-vault-card"
            data-qr-security-state="locked"
            aria-label="Encrypted QR Vault"
          >
            <div className="qr-dt-vault-head">
              <span className="qr-dt-vault-icon">
                <Lock size={22} aria-hidden="true" />
              </span>
              <div>
                <span className="qr-dt-vault-pill">
                  AES-256-GCM · PBKDF2-SHA256 · 128-bit Auth Tag
                </span>
                <h1>Encrypted QR Vault</h1>
              </div>
            </div>
            <p className="qr-dt-vault-desc">
              This QR code is end-to-end encrypted and tamper-sealed. Enter the
              passphrase to decrypt and verify the content locally in your
              browser.
            </p>
            {resolved.signerFingerprint ? (
              <p className="qr-dt-vault-meta">
                <ShieldCheck size={14} aria-hidden="true" />
                <span>
                  Outer ECDSA P-256 Seal Verified · Signer{" "}
                  <code>{resolved.signerFingerprint}</code>
                </span>
              </p>
            ) : null}
            {resolved.hint ? (
              <p className="qr-dt-vault-hint">
                <KeyRound size={14} aria-hidden="true" />
                <span>
                  Passphrase hint: <strong>{resolved.hint}</strong>
                </span>
              </p>
            ) : null}

            <form
              onSubmit={(e) => void handleUnlock(e)}
              className="qr-dt-vault-form"
            >
              <label
                htmlFor="qr-vault-passphrase"
                className="qr-dt-vault-label"
              >
                Decryption Passphrase / PIN
              </label>
              <div className="qr-dt-vault-input-row">
                <input
                  id="qr-vault-passphrase"
                  type={showPass ? "text" : "password"}
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  placeholder="Enter passphrase to unlock…"
                  autoComplete="off"
                  required
                />
                <button
                  type="button"
                  className="secondary qr-dt-vault-eye"
                  onClick={() => setShowPass((s) => !s)}
                  aria-label={showPass ? "Hide passphrase" : "Show passphrase"}
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {resolved.errorMessage ? (
                <p className="qr-dt-vault-error" role="alert">
                  <ShieldAlert size={14} aria-hidden="true" />
                  <span>{resolved.errorMessage}</span>
                </p>
              ) : null}
              <button
                type="submit"
                className="primary qr-dt-vault-submit"
                disabled={unlocking || !passphrase.trim()}
              >
                <Lock size={15} aria-hidden="true" />
                {unlocking ? "Decrypting & Verifying…" : "Unlock & Verify QR"}
              </button>
            </form>
          </section>
        ) : resolved.state === "decrypted-raw" ? (
          <section
            className="qr-dt-empty-card"
            data-qr-security-state="decrypted"
          >
            <span className="qr-dt-empty-icon">
              <ShieldCheck size={24} aria-hidden="true" />
            </span>
            <h1>Decrypted QR Payload</h1>
            <p className="qr-dt-security-verified-banner">
              <ShieldCheck size={14} aria-hidden="true" />
              <span>Authenticated via {resolved.algorithm}</span>
            </p>
            <pre className="qr-dt-raw-pre">{resolved.plaintext}</pre>
          </section>
        ) : resolved.state === "ready" ? (
          <>
            {resolved.securityStatus !== "unsigned" ? (
              <div
                className="qr-dt-security-verified-banner"
                data-qr-security-state={resolved.securityStatus}
              >
                <ShieldCheck size={15} aria-hidden="true" />
                <div>
                  <strong>
                    {resolved.securityStatus === "encrypted-verified"
                      ? "End-to-End Encrypted & Tamper-Verified"
                      : "Tamper-Proof Digital Signature Verified"}
                  </strong>
                  <span>
                    {resolved.algorithm}
                    {resolved.signerFingerprint
                      ? ` · Signer ${resolved.signerFingerprint}`
                      : ""}
                  </span>
                </div>
              </div>
            ) : null}

            <QrDataTemplateCard
              model={resolved.model}
              securityBadge={{
                status: resolved.securityStatus,
                algorithm: resolved.algorithm,
                signerFingerprint: resolved.signerFingerprint,
                expiresAtSec: resolved.expiresAtSec,
              }}
            />

            <div className="qr-dt-brand-bar">
              <Link href="/tools/qr-code-scanner">
                <ScanLine size={13} aria-hidden="true" />
                Scan another QR
              </Link>
              <span aria-hidden="true">·</span>
              <Link href="/tools/qr-generator">
                <QrCode size={13} aria-hidden="true" />
                Create your own QR
              </Link>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
