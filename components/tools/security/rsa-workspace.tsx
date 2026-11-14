"use client";
import { useState } from "react";
import CopyButton from "@/components/tools/copy-button";
import { downloadText } from "@/lib/tools/download";
import {
  generateRsaKeys,
  generateRsaSigningKeys,
  signRsaMessage,
  rsaEncrypt,
  rsaDecrypt,
  verifyRsaSignature,
} from "@/lib/tools/security/rsa";

type Mode =
  "generate" | "generate-sign" | "encrypt" | "decrypt" | "sign" | "verify";
export default function RsaWorkspace() {
  const [mode, setMode] = useState<Mode>("generate");
  const [bits, setBits] = useState(2048);
  const [key, setKey] = useState("");
  const [input, setInput] = useState("");
  const [signature, setSignature] = useState("");
  const [result, setResult] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [reveal, setReveal] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const clear = () => {
    setInput("");
    setKey("");
    setSignature("");
    setResult("");
    setPrivateKey("");
    setReveal(false);
    setError("");
  };
  const invalidate = () => {
    setResult("");
    setPrivateKey("");
    setReveal(false);
    setError("");
  };
  async function run() {
    invalidate();
    setBusy(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 0));
      if (mode === "generate" || mode === "generate-sign") {
        const pair =
          mode === "generate"
            ? await generateRsaKeys(bits)
            : await generateRsaSigningKeys(bits);
        setResult(pair.publicKey);
        setPrivateKey(pair.privateKey);
      } else if (mode === "encrypt") setResult(await rsaEncrypt(input, key));
      else if (mode === "decrypt")
        setResult(await rsaDecrypt(input.trim(), key));
      else if (mode === "sign") setResult(await signRsaMessage(input, key));
      else setResult(await verifyRsaSignature(input, signature.trim(), key));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Operation failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <fieldset
      className="workspace devtool-workspace"
      disabled={busy}
      aria-label="RSA workspace"
    >
      <div className="workspace-heading">
        <div>
          <h2>Local RSA cryptography</h2>
          <p>
            Web Crypto processes inputs locally; copying or downloading creates
            separate copies.
          </p>
        </div>
      </div>
      <label>
        Operation
        <select
          value={mode}
          onChange={(e) => {
            clear();
            setMode(e.target.value as Mode);
          }}
        >
          <option value="generate">Generate RSA-OAEP key pair</option>
          <option value="generate-sign">
            Generate separate RS256 signing key pair
          </option>
          <option value="encrypt">Encrypt short text with RSA-OAEP</option>
          <option value="decrypt">Decrypt RSA-OAEP ciphertext</option>
          <option value="sign">Sign message with RS256</option>
          <option value="verify">Verify RS256 signature</option>
        </select>
      </label>
      {mode === "generate" || mode === "generate-sign" ? (
        <label>
          Key size
          <select
            value={bits}
            onChange={(e) => {
              setBits(Number(e.target.value));
              invalidate();
            }}
          >
            <option value={2048}>2048 bits</option>
            <option value={3072}>3072 bits</option>
          </select>
        </label>
      ) : (
        <>
          <label>
            {mode === "decrypt" || mode === "sign"
              ? "Private RSA JWK (JSON)"
              : "Public RSA JWK (JSON)"}
            {mode === "decrypt" || mode === "sign" ? (
              <input
                type="password"
                autoComplete="off"
                value={key}
                onChange={(e) => {
                  setKey(e.target.value);
                  invalidate();
                }}
              />
            ) : (
              <textarea
                rows={4}
                value={key}
                onChange={(e) => {
                  setKey(e.target.value);
                  invalidate();
                }}
              />
            )}
          </label>
          <label>
            {mode === "decrypt"
              ? "Ciphertext (unpadded Base64URL)"
              : "Message (UTF-8)"}
            <textarea
              rows={5}
              value={input}
              maxLength={1_000_000}
              onChange={(e) => {
                setInput(e.target.value);
                invalidate();
              }}
            />
          </label>
          {mode === "verify" && (
            <label>
              Signature (hexadecimal)
              <input
                value={signature}
                onChange={(e) => {
                  setSignature(e.target.value);
                  invalidate();
                }}
              />
            </label>
          )}
        </>
      )}
      <p className="help">
        RSA-OAEP uses SHA-256 and is for short messages only; use authenticated
        AES-GCM for large content. RSA-OAEP encryption does not authenticate the
        sender. Signing and signature verification use RSASSA-PKCS1-v1_5 with
        SHA-256. Generate separate keys for signing and encryption; verify
        public key ownership independently. Generated private JWKs are
        unencrypted: store securely, never share, and do not use this page as a
        key vault.
      </p>
      <div className="action-row">
        <button type="button" className="primary" onClick={() => void run()}>
          {busy ? "Processing…" : "Process locally"}
        </button>
        <button
          type="button"
          className="secondary"
          onClick={() => {
            clear();
            setMode("generate");
            setBits(2048);
          }}
        >
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
        <label htmlFor="rsa-result">
          {mode === "generate" || mode === "generate-sign"
            ? "Public JWK"
            : "Result"}
        </label>
        <textarea
          id="rsa-result"
          rows={7}
          readOnly
          value={result}
          placeholder="Result appears here…"
        />
        <div className="workspace-foot">
          <CopyButton key={result} text={result} />
          <button
            type="button"
            className="secondary"
            disabled={!result}
            onClick={() =>
              downloadText(
                result,
                mode === "generate" || mode === "generate-sign"
                  ? "quickkit-rsa-public.jwk"
                  : "quickkit-rsa-result.txt",
              )
            }
          >
            Download result
          </button>
        </div>
      </div>
      {privateKey && (
        <div className="result-panel">
          <label className="check-label">
            <input
              type="checkbox"
              checked={reveal}
              onChange={(e) => setReveal(e.target.checked)}
            />{" "}
            Reveal the unencrypted private JWK
          </label>
          {reveal && (
            <>
              <label htmlFor="rsa-private">Private JWK — keep secret</label>
              <textarea id="rsa-private" readOnly rows={7} value={privateKey} />
              <div className="workspace-foot">
                <CopyButton text={privateKey} />
                <button
                  type="button"
                  className="secondary"
                  onClick={() =>
                    downloadText(privateKey, "quickkit-rsa-private.jwk")
                  }
                >
                  Download unencrypted private JWK
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </fieldset>
  );
}
