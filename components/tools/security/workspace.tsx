"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { WorkspaceHeading } from "@/components/tools/tool-ui";
import CopyButton from "@/components/tools/copy-button";
import { downloadBlob, downloadText } from "@/lib/tools/download";
import {
  generateCsp,
  generatePermissionsPolicy,
  validateSecurityTxt,
  reviewCsp,
  reviewCookies,
  reviewFrameOptions,
  reviewHeaders,
  reviewHsts,
  reviewRobots,
  securityTxt,
} from "@/lib/tools/security/review";
import {
  cleanImage,
  cleanPdfDocumentMetadata,
  inspectImage,
  inspectPdf,
  inspectDocx,
} from "@/lib/tools/security/metadata";
import {
  analyzeEmailHeaders,
  inspectDkimPublicKey,
  reviewSpf,
  reviewDkim,
  reviewDmarc,
} from "@/lib/tools/security/email";
import {
  hmac,
  type HmacHash,
  type HmacKeyFormat,
} from "@/lib/tools/security/hmac";
import { inspectFileSignature } from "@/lib/tools/security/file-signature";
import { analyzeUrl, analyzeUrlBatch } from "@/lib/tools/security/url-review";
import { inspectCertificate } from "@/lib/tools/security/certificate";
import { verifyJwt } from "@/lib/tools/security/jwt-verify";
import { MAX_IMAGE_BYTES } from "@/lib/tools/image-input";
import { legalDraft } from "@/lib/tools/security/legal";
import type { SecurityMode } from "@/lib/tools/security/catalog";
import {
  assessPassword,
  passwordPolicy,
  type PasswordPolicyRequirements,
  entropy,
  MAX_TEXT_ENVELOPE_CHARS,
  randomString,
  passphrase,
  textCrypto,
  encryptBytes,
  decryptBytes,
  generateKey,
  base64url,
  compareHashes,
  decodeJwt,
  signJwt,
  sensitiveInfo,
  analyzeHeaders,
  MAX_SECURITY_FILE_BYTES,
} from "@/lib/tools/security/logic";

export default function SecurityWorkspace({
  mode,
  example,
}: {
  mode: SecurityMode;
  example: string;
}) {
  const [input, setInput] = useState("");
  const [second, setSecond] = useState("");
  const [number, setNumber] = useState(
    mode === "passphrase"
      ? 8
      : mode === "entropy"
        ? 20
        : mode === "policy"
          ? 15
          : 32,
  );
  const [batch, setBatch] = useState(1);
  const [urlBatch, setUrlBatch] = useState(false);
  const [policyRequirements, setPolicyRequirements] =
    useState<PasswordPolicyRequirements>({
      uppercase: false,
      lowercase: false,
      digit: false,
      symbol: false,
    });
  const [pool, setPool] = useState(94);
  const [separator, setSeparator] = useState("-");
  const [capitalize, setCapitalize] = useState(false);
  const [decode, setDecode] = useState(false);
  const [format, setFormat] = useState("url");
  const [jwtVerify, setJwtVerify] = useState(false);
  const [jwtAlgorithm, setJwtAlgorithm] = useState<"HS256" | "RS256">("HS256");
  const [issuer, setIssuer] = useState("");
  const [audience, setAudience] = useState("");
  const [cspFrame, setCspFrame] = useState<"none" | "self">("none");
  const [cspData, setCspData] = useState(false);
  const [connectOrigin, setConnectOrigin] = useState("");
  const [permissions, setPermissions] = useState<
    Record<string, "none" | "self">
  >({
    camera: "none",
    microphone: "none",
    geolocation: "none",
    payment: "none",
  });
  const [validateTxt, setValidateTxt] = useState(false);
  const [cleanPdf, setCleanPdf] = useState(false);
  const [hmacHash, setHmacHash] = useState<HmacHash>("SHA-256");
  const [hmacFormat, setHmacFormat] = useState<HmacKeyFormat>("utf8");
  const [hmacVerify, setHmacVerify] = useState(false);
  const [hmacTag, setHmacTag] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState("");
  const [fileResult, setFileResult] = useState<Blob | null>(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const noInput = [
    "passphrase",
    "entropy",
    "policy",
    "key",
    "file-crypto",
    "csp-generate",
    "permissions-policy",
    "referrer-policy",
    "browser-privacy",
    "browser-permissions",
    "third-party-cookies",
    "tracking-guide",
    "fingerprint-guide",
    "privacy-checklist",
    "gdpr",
    "image-metadata",
    "image-clean",
    "pdf-metadata",
    "file-privacy",
    "document-metadata",
  ].includes(mode);
  const inputLabel =
    mode === "hmac"
      ? "Message (UTF-8, may be empty)"
      : mode === "certificate-inspect"
        ? "Public PEM certificate (never a private key)"
        : mode === "strength"
          ? "Password to assess"
          : mode === "random"
            ? "Distinct characters to choose from"
            : mode === "compare"
              ? "First hexadecimal digest"
              : mode === "jwt-decode"
                ? "JWT to decode (use test tokens only)"
                : mode === "jwt-sign"
                  ? "Claims JSON"
                  : mode === "api-key"
                    ? "Key to check (use a test key)"
                    : mode === "headers"
                      ? "Request headers"
                      : mode === "bearer"
                        ? "Token (use a test token)"
                        : mode === "redact"
                          ? "Text to redact"
                          : "Input";
  const clearResult = () => {
    setResult("");
    setFileResult(null);
    setError("");
  };
  function reset() {
    setInput("");
    setSecond("");
    setNumber(
      mode === "passphrase"
        ? 8
        : mode === "entropy"
          ? 20
          : mode === "policy"
            ? 15
            : 32,
    );
    setBatch(1);
    setUrlBatch(false);
    setPolicyRequirements({
      uppercase: false,
      lowercase: false,
      digit: false,
      symbol: false,
    });
    setPool(94);
    setSeparator("-");
    setCapitalize(false);
    setDecode(false);
    setFormat("url");
    setJwtVerify(false);
    setJwtAlgorithm("HS256");
    setIssuer("");
    setAudience("");
    setCspFrame("none");
    setCspData(false);
    setConnectOrigin("");
    setPermissions({
      camera: "none",
      microphone: "none",
      geolocation: "none",
      payment: "none",
    });
    setValidateTxt(false);
    setHmacHash("SHA-256");
    setHmacFormat("utf8");
    setHmacVerify(false);
    setHmacTag("");
    setCleanPdf(false);
    setFile(null);
    if (fileRef.current) fileRef.current.value = "";
    clearResult();
  }
  async function run() {
    clearResult();
    setBusy(true);
    try {
      // Allow the pending indicator to paint before key derivation.
      await new Promise((resolve) => setTimeout(resolve, 0));
      let out = "";
      switch (mode) {
        case "document-metadata":
          if (!file) throw new Error("Choose a PDF or DOCX first.");
          out = file.name.toLowerCase().endsWith(".docx")
            ? await inspectDocx(file)
            : await inspectPdf(file);
          break;
        case "file-privacy": {
          if (!file) throw new Error("Choose a local file first.");
          out = await inspectFileSignature(file);
          let metadata =
            "Metadata inspection is unavailable for this file type.";
          try {
            if (file.name.toLowerCase().endsWith(".docx"))
              metadata = await inspectDocx(file);
            else if (
              file.type === "application/pdf" ||
              file.name.toLowerCase().endsWith(".pdf")
            )
              metadata = await inspectPdf(file);
            else if (
              ["image/jpeg", "image/png", "image/webp"].includes(file.type)
            )
              metadata = await inspectImage(file);
          } catch (err) {
            metadata = `Metadata inspection failed: ${err instanceof Error ? err.message : "unsupported or malformed file."}`;
          }
          out += `\n\n${metadata}\n\nReview visible content and other metadata manually; this limited check cannot guarantee privacy or safety.`;
          break;
        }
        case "url-review":
          out = urlBatch ? analyzeUrlBatch(input) : analyzeUrl(input);
          break;
        case "website-privacy":
          out = reviewHeaders(input);
          break;
        case "email-headers":
          out = analyzeEmailHeaders(input);
          break;
        case "spf":
          out = reviewSpf(input);
          break;
        case "dkim":
          out = `${reviewDkim(input)}\n\n${await inspectDkimPublicKey(input)}`;
          break;
        case "dmarc":
          out = reviewDmarc(input);
          break;
        case "image-metadata":
          if (!file) throw new Error("Choose a JPEG, PNG or WebP image first.");
          out = await inspectImage(file);
          break;
        case "pdf-metadata":
          if (!file) throw new Error("Choose a PDF first.");
          if (cleanPdf) {
            const before = await inspectPdf(file);
            const cleaned = await cleanPdfDocumentMetadata(file);
            const after = await inspectPdf(
              new File([cleaned], "cleaned.pdf", { type: "application/pdf" }),
            );
            setFileResult(cleaned);
            setFileName("quickkit-document-metadata-removed.pdf");
            out = `BEFORE\n${before}\n\nAFTER\n${after}\n\nDocument Info and catalog/page metadata references were removed. Unshared referenced objects are removed; shared and orphan objects may remain. This is not PDF sanitization: other metadata, embedded files, annotations, hidden content, old orphan objects, and visible text may still expose data. Rewriting may invalidate signatures or change features. Inspect independently before sharing.`;
          } else out = await inspectPdf(file);
          break;
        case "image-clean":
          if (!file) throw new Error("Choose a JPEG, PNG or WebP image first.");
          {
            const before = await inspectImage(file);
            const cleaned = await cleanImage(file);
            const after =
              cleaned.size <= MAX_IMAGE_BYTES
                ? await inspectImage(
                    new File([cleaned], "cleaned.png", { type: "image/png" }),
                  )
                : "Output exceeds the 15 MiB inspection limit; output metadata could not be checked here.";
            setFileResult(cleaned);
            setFileName("quickkit-image.png");
            out = `BEFORE\n${before}\n\nAFTER\n${after}\n\nImage was re-encoded as PNG. This comparison is limited to selected metadata; it cannot identify all information and visible content can still be sensitive. Inspect output independently before sharing.`;
          }
          break;
        case "privacy-policy":
        case "cookie-policy":
        case "retention-policy":
        case "consent-notice":
        case "dpa":
          out = legalDraft(mode, input);
          break;
        case "gdpr":
          out =
            "GDPR REVIEW CHECKLIST — NOT A COMPLIANCE DETERMINATION\n□ Map personal data, sources, purposes and recipients.\n□ Identify and document a lawful basis for each purpose.\n□ Provide accurate privacy notices and support applicable individual rights.\n□ Review processor contracts and international transfers.\n□ Define retention and deletion schedules.\n□ Assess appropriate security and incident response.\n□ Determine whether a DPIA, DPO or representative is required.\n□ Document decisions and seek qualified legal advice.";
          break;
        case "response-headers":
          out = reviewHeaders(input);
          break;
        case "csp-generate":
          out = generateCsp(cspFrame, cspData, connectOrigin);
          break;
        case "certificate-inspect":
          out = await inspectCertificate(input, Date.now(), second);
          break;
        case "csp-analyze":
          out = reviewCsp(
            input.replace(/^content-security-policy\s*:\s*/i, ""),
          );
          break;
        case "cookies":
          out = reviewCookies(input);
          break;
        case "hsts":
          out = reviewHsts(
            input.replace(/^strict-transport-security\s*:\s*/i, ""),
          );
          break;
        case "permissions-policy":
          out = generatePermissionsPolicy(permissions);
          break;
        case "referrer-policy":
          out =
            format === "none"
              ? "Referrer-Policy: no-referrer\n\nNo referrer information is sent. Test integrations that rely on referrer data."
              : "Referrer-Policy: strict-origin-when-cross-origin\n\nSends full referrer for same-origin requests and only the origin cross-origin over HTTPS; no referrer on HTTPS-to-HTTP downgrade.";
          break;
        case "frame":
          out = reviewFrameOptions(
            input.replace(/^x-frame-options\s*:\s*/i, ""),
          );
          break;
        case "robots":
          out = reviewRobots(input);
          break;
        case "security-txt":
          out = validateTxt
            ? validateSecurityTxt(input)
            : securityTxt(input, second);
          break;
        case "browser-privacy": {
          const nav = navigator as Navigator & {
            globalPrivacyControl?: boolean;
            doNotTrack?: string | null;
          };
          out = `Secure context: ${window.isSecureContext ? "yes" : "no"}\nBrowser reports cookies enabled: ${nav.cookieEnabled ? "yes" : "no"} (does not establish third-party cookie availability).\nDo Not Track signal: ${nav.doNotTrack ?? "not exposed"}.\nGlobal Privacy Control signal: ${nav.globalPrivacyControl === undefined ? "not exposed" : nav.globalPrivacyControl ? "enabled" : "disabled"}.\nA website cannot inspect all browser privacy settings, installed extensions or tracking protection.`;
          break;
        }
        case "browser-permissions": {
          if (!navigator.permissions?.query)
            throw new Error(
              "The Permissions API is not available in this browser.",
            );
          const checks = await Promise.all(
            (
              [
                "geolocation",
                "notifications",
                "camera",
                "microphone",
              ] as PermissionName[]
            ).map(async (name) => {
              try {
                const result = await navigator.permissions.query({ name });
                return `${name}: ${result.state}`;
              } catch {
                return `${name}: not exposed by this browser`;
              }
            }),
          );
          out = `${checks.join("\n")}\nThese are browser-exposed states for this origin, not a complete list of permissions. No access was requested.`;
          break;
        }
        case "third-party-cookies":
          out =
            "Third-party cookies are set or read in a cross-site context and may be restricted by browser settings or privacy features. This page cannot reliably determine your global third-party cookie setting. Open your browser's privacy settings to review or block third-party cookies; test specific sites separately because browser behavior varies.";
          break;
        case "tracking-guide":
          out =
            "Tracking protection checklist\n1. Enable your browser's built-in tracking protection.\n2. Review third-party cookie settings.\n3. Remove unneeded extensions and review their permissions.\n4. Use separate browser profiles for different activities.\n5. Review site permissions regularly.\nThese steps reduce some tracking but cannot guarantee anonymity.";
          break;
        case "fingerprint-guide":
          out =
            "Browser fingerprinting combines observable properties such as rendering behavior, platform capabilities and settings to distinguish devices. Blocking cookies alone does not stop fingerprinting. Consider a browser with built-in fingerprinting protection and keep it updated. This tool does not collect, calculate or transmit a fingerprint and cannot certify anonymity.";
          break;
        case "privacy-checklist":
          out =
            "Browser privacy checklist\n□ Review tracking protection and third-party cookie controls.\n□ Audit location, camera and microphone permissions.\n□ Remove unnecessary extensions.\n□ Enable automatic browser and operating-system updates.\n□ Use a password manager and multi-factor authentication.\n□ Review sync, search, and history retention settings.\nSettings vary by browser; this tool cannot change them for you.";
          break;
        case "strength":
          out = assessPassword(input);
          break;
        case "passphrase":
          if (!Number.isInteger(batch) || batch < 1 || batch > 50)
            throw new Error("Choose 1–50 passphrases.");
          out = Array.from({ length: batch }, () =>
            passphrase(number, separator, capitalize),
          ).join("\n");
          break;
        case "entropy":
          out = entropy(number, pool);
          break;
        case "policy":
          out = passwordPolicy(number, policyRequirements, second);
          break;
        case "random":
          out = randomString(input, number);
          break;
        case "text-crypto":
          out = await textCrypto(input, second, decode);
          break;
        case "file-crypto": {
          if (!file) throw new Error("Choose a file first.");
          if (file.size > MAX_SECURITY_FILE_BYTES + 50)
            throw new Error("File exceeds the 25 MiB limit.");
          const bytes = new Uint8Array(await file.arrayBuffer());
          const transformed = decode
            ? await decryptBytes(bytes, second)
            : await encryptBytes(bytes, second);
          setFileResult(
            new Blob([transformed], { type: "application/octet-stream" }),
          );
          setFileName(
            decode
              ? file.name.endsWith(".qkenc")
                ? file.name.slice(0, -6) + ".decrypted"
                : file.name + ".decrypted"
              : file.name + ".qkenc",
          );
          out = decode
            ? "Decryption succeeded. Download the decrypted file and handle it securely."
            : "Encryption succeeded. Download the encrypted file and retain the password.";
          break;
        }
        case "key":
          out = generateKey();
          break;
        case "base64url":
          out = base64url(input, decode);
          break;
        case "hmac":
          out = await hmac(
            input,
            second,
            hmacFormat,
            hmacHash,
            hmacVerify ? hmacTag : undefined,
          );
          break;
        case "compare":
          out = compareHashes(input, second);
          break;
        case "jwt-decode":
          out = jwtVerify
            ? await verifyJwt(
                input,
                jwtAlgorithm,
                second,
                issuer.trim(),
                audience.trim(),
              )
            : decodeJwt(input);
          break;
        case "jwt-sign":
          out = await signJwt(input, second);
          break;
        case "api-key": {
          const key = input.trim();
          if (!key || key.length > 4096)
            throw new Error("Enter a test key up to 4096 characters.");
          const valid =
            format === "hex"
              ? /^[a-fA-F0-9]+$/.test(key) && key.length % 2 === 0
              : /^[A-Za-z0-9_-]+$/.test(key);
          out = `Format ${valid ? "matches" : "does not match"} the selected ${format === "hex" ? "even-length hexadecimal" : "URL-safe alphanumeric, underscore and hyphen"} pattern. This does not validate the key, provider, permissions or security.`;
          break;
        }
        case "headers":
          out = analyzeHeaders(input);
          break;
        case "bearer": {
          const token = input.trim().replace(/^Bearer\s+/i, "");
          if (
            !token ||
            token.length > 10000 ||
            !/^[A-Za-z0-9._~+\/-]+=*$/.test(token)
          )
            throw new Error(
              "Enter a valid Bearer token without whitespace or line breaks.",
            );
          out = `Authorization: Bearer ${token}`;
          break;
        }
        case "detect":
          out = sensitiveInfo(input, false);
          break;
        case "mask":
          out = sensitiveInfo(input, true);
          break;
        case "redact":
          if (!input || !second)
            throw new Error("Enter text and a phrase to redact.");
          if (input.length > 1_000_000 || second.length > 1000)
            throw new Error("Input or phrase is too large.");
          out = input.split(second).join("[REDACTED]");
          break;
      }
      setResult(out);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Processing failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <fieldset
      className="workspace devtool-workspace"
      disabled={busy}
      aria-label="Security tool workspace"
    >
      <WorkspaceHeading
        title="Private by design"
        description="Your input is processed in this browser. Copying or downloading creates a separate local copy."
      />
      {(mode === "text-crypto" ||
        mode === "file-crypto" ||
        mode === "base64url") && (
        <label>
          Operation{" "}
          <select
            value={decode ? "decode" : "encode"}
            onChange={(e) => {
              setDecode(e.target.value === "decode");
              clearResult();
            }}
          >
            <option value="encode">
              {mode === "base64url" ? "Encode" : "Encrypt"}
            </option>
            <option value="decode">
              {mode === "base64url" ? "Decode" : "Decrypt"}
            </option>
          </select>
        </label>
      )}
      {mode === "url-review" && (
        <label className="check-label">
          <input
            type="checkbox"
            checked={urlBatch}
            onChange={(event) => {
              setUrlBatch(event.target.checked);
              clearResult();
            }}
          />{" "}
          Review up to 25 URLs (one per line)
        </label>
      )}
      {!noInput && (
        <div className="devtool-editor">
          <label htmlFor="security-input">
            {mode === "url-review" && urlBatch
              ? "URLs (one per line)"
              : inputLabel}
          </label>
          <textarea
            id="security-input"
            rows={6}
            value={input}
            maxLength={
              mode === "text-crypto" && decode
                ? MAX_TEXT_ENVELOPE_CHARS
                : 1_000_000
            }
            onChange={(e) => {
              setInput(e.target.value);
              clearResult();
            }}
            placeholder="Enter input here…"
          />
          {example && (
            <button
              type="button"
              className="secondary"
              onClick={() => {
                setInput(example);
                clearResult();
              }}
            >
              Load example
            </button>
          )}
        </div>
      )}
      {[
        "image-metadata",
        "image-clean",
        "pdf-metadata",
        "file-privacy",
        "document-metadata",
      ].includes(mode) && (
        <label>
          Choose a local file
          <input
            ref={fileRef}
            type="file"
            accept={
              mode === "pdf-metadata"
                ? "application/pdf,.pdf"
                : mode === "document-metadata"
                  ? "application/pdf,.pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  : mode === "file-privacy"
                    ? undefined
                    : "image/jpeg,image/png,image/webp"
            }
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              clearResult();
            }}
          />
        </label>
      )}
      {mode === "pdf-metadata" && (
        <>
          <label className="check-label">
            <input
              type="checkbox"
              checked={cleanPdf}
              onChange={(e) => {
                setCleanPdf(e.target.checked);
                clearResult();
              }}
            />{" "}
            Remove document Info and catalog/page metadata references and
            download a rewritten PDF
          </label>
          <p className="help">
            This is not full sanitization. Page metadata, embedded files,
            comments, hidden content, orphan objects and visible text may
            remain. Rewriting may invalidate signatures or alter document
            features. Verify before sharing.
          </p>
        </>
      )}
      {mode === "image-clean" && (
        <p className="help">
          Images are decoded and re-encoded as PNG, which can change colors,
          discard animation and increase file size. Source EXIF is not copied;
          inspect output and visible content independently. Maximum 15 MiB and
          24 megapixels.
        </p>
      )}
      {mode === "file-crypto" && (
        <label>
          Choose a file (up to 25 MiB)
          <input
            ref={fileRef}
            type="file"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              clearResult();
            }}
          />
        </label>
      )}
      {(mode === "text-crypto" ||
        mode === "file-crypto" ||
        mode === "jwt-sign") && (
        <label>
          {mode === "jwt-sign"
            ? "Test signing key (at least 32 UTF-8 bytes)"
            : "Encryption password"}
          <input
            type="password"
            autoComplete="off"
            value={second}
            onChange={(e) => {
              setSecond(e.target.value);
              clearResult();
            }}
          />
        </label>
      )}
      {mode === "jwt-decode" && (
        <>
          <label className="check-label">
            <input
              type="checkbox"
              checked={jwtVerify}
              onChange={(e) => {
                setJwtVerify(e.target.checked);
                setSecond("");
                clearResult();
              }}
            />{" "}
            Verify signature with a supplied key
          </label>
          {jwtVerify && (
            <>
              <label>
                Expected algorithm{" "}
                <select
                  value={jwtAlgorithm}
                  onChange={(e) => {
                    setJwtAlgorithm(e.target.value as "HS256" | "RS256");
                    setSecond("");
                    clearResult();
                  }}
                >
                  <option value="HS256">HS256 — shared secret</option>
                  <option value="RS256">RS256 — public RSA JWK</option>
                </select>
              </label>
              <label>
                {jwtAlgorithm === "HS256"
                  ? "Shared secret (at least 32 UTF-8 bytes)"
                  : "Public RSA JWK (JSON; no private parameters)"}
                {jwtAlgorithm === "HS256" ? (
                  <input
                    type="password"
                    value={second}
                    autoComplete="off"
                    onChange={(e) => {
                      setSecond(e.target.value);
                      clearResult();
                    }}
                  />
                ) : (
                  <textarea
                    rows={3}
                    value={second}
                    autoComplete="off"
                    onChange={(e) => {
                      setSecond(e.target.value);
                      clearResult();
                    }}
                  />
                )}
              </label>
              <label>
                Expected issuer (optional)
                <input
                  value={issuer}
                  onChange={(e) => {
                    setIssuer(e.target.value);
                    clearResult();
                  }}
                />
              </label>
              <label>
                Expected audience (optional)
                <input
                  value={audience}
                  onChange={(e) => {
                    setAudience(e.target.value);
                    clearResult();
                  }}
                />
              </label>
              <p className="help">
                Select the algorithm independently of the token. Verify key
                ownership through a trusted channel. Verification and optional
                claim checks do not grant authorization. Use test data when
                possible.
              </p>
            </>
          )}
        </>
      )}
      {mode === "url-review" && (
        <p className="help">
          This is a limited syntax review only. It does not open the URL, check
          reputation, detect every phishing attempt or establish destination
          safety. Do not enter credentials.
        </p>
      )}
      {mode === "hmac" && (
        <>
          <label>
            HMAC hash
            <select
              value={hmacHash}
              onChange={(e) => {
                setHmacHash(e.target.value as HmacHash);
                clearResult();
              }}
            >
              <option>SHA-256</option>
              <option>SHA-384</option>
              <option>SHA-512</option>
            </select>
          </label>
          <label>
            Key encoding
            <select
              value={hmacFormat}
              onChange={(e) => {
                setHmacFormat(e.target.value as HmacKeyFormat);
                setSecond("");
                clearResult();
              }}
            >
              <option value="utf8">UTF-8</option>
              <option value="hex">Hexadecimal</option>
            </select>
          </label>
          <label>
            Secret key (16–4096 bytes)
            <input
              type="password"
              autoComplete="off"
              value={second}
              onChange={(e) => {
                setSecond(e.target.value);
                clearResult();
              }}
            />
          </label>
          <label className="check-label">
            <input
              type="checkbox"
              checked={hmacVerify}
              onChange={(e) => {
                setHmacVerify(e.target.checked);
                clearResult();
              }}
            />{" "}
            Verify an existing hexadecimal tag
          </label>
          {hmacVerify && (
            <label>
              Expected tag (hexadecimal)
              <input
                value={hmacTag}
                autoComplete="off"
                onChange={(e) => {
                  setHmacTag(e.target.value);
                  clearResult();
                }}
              />
            </label>
          )}
          <p className="help">
            HMAC authenticates data between parties sharing a secret; it is not
            a digital signature. Use a randomly generated key and a secure
            channel. Inputs and key are processed locally; do not share the key
            or store it in the report.
          </p>
        </>
      )}
      {mode === "certificate-inspect" && (
        <label>
          DNS hostname for SAN comparison (optional)
          <input
            value={second}
            placeholder="example.com"
            onChange={(e) => {
              setSecond(e.target.value);
              clearResult();
            }}
          />
        </label>
      )}
      {mode === "certificate-inspect" && (
        <p className="help">
          Paste one public PEM certificate obtained through a trusted channel.
          This offline tool does not contact the server or check its TLS
          configuration, trust chain, signature or revocation. Optional hostname
          comparison checks DNS SAN entries only. Never paste private keys.
        </p>
      )}
      {mode === "csp-generate" && (
        <>
          <label>
            Framing{" "}
            <select
              value={cspFrame}
              onChange={(e) => {
                setCspFrame(e.target.value as "none" | "self");
                clearResult();
              }}
            >
              <option value="none">Block framing</option>
              <option value="self">Allow same-origin framing</option>
            </select>
          </label>
          <label className="check-label">
            <input
              type="checkbox"
              checked={cspData}
              onChange={(e) => {
                setCspData(e.target.checked);
                clearResult();
              }}
            />{" "}
            Allow data: images
          </label>
          <label>
            Additional HTTPS connection origin (optional)
            <input
              value={connectOrigin}
              placeholder="https://api.example.com"
              onChange={(e) => {
                setConnectOrigin(e.target.value);
                clearResult();
              }}
            />
          </label>
        </>
      )}
      {mode === "permissions-policy" && (
        <div className="devtool-options">
          {Object.keys(permissions).map((feature) => (
            <label key={feature}>
              {feature}
              <select
                value={permissions[feature]}
                onChange={(e) => {
                  setPermissions({
                    ...permissions,
                    [feature]: e.target.value as "none" | "self",
                  });
                  clearResult();
                }}
              >
                <option value="none">Disable</option>
                <option value="self">Allow same origin</option>
              </select>
            </label>
          ))}
        </div>
      )}
      {mode === "security-txt" && (
        <label className="check-label">
          <input
            type="checkbox"
            checked={validateTxt}
            onChange={(e) => {
              setValidateTxt(e.target.checked);
              setInput("");
              clearResult();
            }}
          />{" "}
          Review pasted security.txt instead of generating
        </label>
      )}
      {mode === "security-txt" && !validateTxt && (
        <label>
          Expiration date (future UTC date)
          <input
            type="date"
            value={second}
            onChange={(e) => {
              setSecond(e.target.value);
              clearResult();
            }}
          />
        </label>
      )}
      {mode === "referrer-policy" && (
        <label>
          Policy
          <select
            value={format}
            onChange={(e) => {
              setFormat(e.target.value);
              clearResult();
            }}
          >
            <option value="url">strict-origin-when-cross-origin</option>
            <option value="none">no-referrer</option>
          </select>
        </label>
      )}
      {[
        "response-headers",
        "website-privacy",
        "cookies",
        "hsts",
        "frame",
        "robots",
        "csp-analyze",
      ].includes(mode) && (
        <p className="help">
          Paste only publicly available configuration. This tool does not fetch
          or scan a website; the review is limited to the supplied text.
        </p>
      )}
      {(mode === "compare" || mode === "redact") && (
        <label>
          {mode === "compare"
            ? "Second hexadecimal digest"
            : "Exact phrase to redact (case-sensitive)"}
          <input
            value={second}
            onChange={(e) => {
              setSecond(e.target.value);
              clearResult();
            }}
          />
        </label>
      )}
      {["passphrase", "entropy", "policy", "random"].includes(mode) && (
        <label>
          {mode === "passphrase"
            ? "Number of words (4–20)"
            : mode === "policy"
              ? "Minimum password length (8–128)"
              : "Length"}
          <input
            type="number"
            value={Number.isNaN(number) ? "" : number}
            onChange={(e) => {
              setNumber(e.currentTarget.valueAsNumber);
              clearResult();
            }}
          />
        </label>
      )}
      {mode === "passphrase" && (
        <label>
          Number of passphrases (1–50)
          <input
            type="number"
            min={1}
            max={50}
            value={Number.isNaN(batch) ? "" : batch}
            onChange={(e) => {
              setBatch(e.currentTarget.valueAsNumber);
              clearResult();
            }}
          />
        </label>
      )}
      {mode === "policy" && (
        <>
          <p className="help">
            Optional composition requirements may reduce usability and are not
            universally recommended. Check current guidance for your use case.
          </p>
          <div className="settings-grid">
            {(
              [
                ["uppercase", "Require uppercase letter"],
                ["lowercase", "Require lowercase letter"],
                ["digit", "Require decimal digit"],
                ["symbol", "Require non-letter, non-number character"],
              ] as const
            ).map(([key, label]) => (
              <label className="check-label" key={key}>
                <input
                  type="checkbox"
                  checked={policyRequirements[key]}
                  onChange={(e) => {
                    setPolicyRequirements({
                      ...policyRequirements,
                      [key]: e.target.checked,
                    });
                    clearResult();
                  }}
                />{" "}
                {label}
              </label>
            ))}
          </div>
          <label>
            Optional password to check against minimum length
            <input
              type="password"
              maxLength={10000}
              autoComplete="off"
              value={second}
              onChange={(e) => {
                setSecond(e.target.value);
                clearResult();
              }}
            />
          </label>
        </>
      )}
      {mode === "entropy" && (
        <label>
          Alphabet size
          <input
            type="number"
            value={Number.isNaN(pool) ? "" : pool}
            onChange={(e) => {
              setPool(e.currentTarget.valueAsNumber);
              clearResult();
            }}
          />
        </label>
      )}
      {mode === "passphrase" && (
        <>
          <label>
            Separator
            <input
              value={separator}
              maxLength={10}
              onChange={(e) => {
                setSeparator(e.target.value);
                clearResult();
              }}
            />
          </label>
          <label className="check-label">
            <input
              type="checkbox"
              checked={capitalize}
              onChange={(e) => {
                setCapitalize(e.target.checked);
                clearResult();
              }}
            />{" "}
            Capitalize each word
          </label>
          <p className="help">
            Words are selected independently from a small local list. Use at
            least eight words for important accounts; capitalization and
            separators do not add randomness.
          </p>
        </>
      )}
      {mode === "api-key" && (
        <label>
          Expected format
          <select
            value={format}
            onChange={(e) => {
              setFormat(e.target.value);
              clearResult();
            }}
          >
            <option value="url">URL-safe characters</option>
            <option value="hex">Even-length hexadecimal</option>
          </select>
        </label>
      )}
      {(mode === "text-crypto" || mode === "file-crypto") && (
        <p className="help">
          AES-256-GCM with a fresh random salt and IV and PBKDF2-SHA-256
          (600,000 iterations). Keep your password: it cannot be recovered. The
          QUICKKIT QKENC1 format is not interoperable with other encryption
          tools. Original file names are not preserved inside the encrypted
          file.
        </p>
      )}
      {(mode === "jwt-decode" || mode === "jwt-sign") && (
        <p className="help">
          Decoding alone does not verify signatures. Optional verification uses
          only the key and algorithm you supply. Signed test tokens are not
          suitable for production; never share a signing key.
        </p>
      )}
      {[
        "privacy-policy",
        "cookie-policy",
        "retention-policy",
        "consent-notice",
        "dpa",
        "gdpr",
      ].includes(mode) && (
        <p className="help">
          Templates and checklists are not legal advice or a compliance
          determination. Qualified legal review and tailoring to actual
          practices and applicable jurisdictions are required. For draft
          generators, provide a JSON object with organization, contact and
          details fields.
        </p>
      )}
      {["email-headers", "spf", "dkim", "dmarc"].includes(mode) && (
        <p className="help">
          Only the pasted text is reviewed; DNS records and authentication
          signatures are not verified. Headers may contain personal or sensitive
          information. To review a public DNS record instead, use the{" "}
          <Link href="/tools/dns-lookup">DNS lookup workspace</Link> and select
          an email record mode; that separate tool requires consent to contact
          Cloudflare.
        </p>
      )}
      {(mode === "detect" || mode === "mask" || mode === "redact") && (
        <p className="help">
          Detection is incomplete; review results manually. Text redaction does
          not remove metadata or redact embedded files.
        </p>
      )}
      <div className="action-row">
        <button type="button" className="primary" onClick={() => void run()}>
          {busy ? "Processing…" : "Process locally"}
        </button>
        <button type="button" className="secondary" onClick={reset}>
          Reset
        </button>
      </div>
      {busy && <p role="status">Processing locally…</p>}
      {error && (
        <p className="status error" role="alert">
          {error}
        </p>
      )}
      <div className="result-panel">
        <label htmlFor="security-output">Result</label>
        <textarea
          id="security-output"
          rows={7}
          value={result}
          readOnly
          placeholder="Your result appears here…"
        />
        <div className="workspace-foot">
          <CopyButton key={result} text={result} />
          <button
            type="button"
            className="secondary"
            disabled={!result}
            onClick={() =>
              fileResult
                ? downloadBlob(fileResult, fileName)
                : downloadText(result, "quickkit-result.txt")
            }
          >
            {fileResult ? "Download file" : "Download result"}
          </button>
          {fileResult && result && (
            <button
              type="button"
              className="secondary"
              onClick={() => downloadText(result, "quickkit-report.txt")}
            >
              Download report
            </button>
          )}
        </div>
      </div>
    </fieldset>
  );
}
