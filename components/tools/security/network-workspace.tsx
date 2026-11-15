"use client";
import { useEffect, useRef, useState } from "react";
import CopyButton from "@/components/tools/copy-button";
import { downloadText } from "@/lib/tools/download";
import {
  DNS_TYPES,
  lookupDns,
  lookupDnsBatch,
  lookupEmailRecord,
  type EmailDnsKind,
  lookupPublicIp,
  type DnsType,
} from "@/lib/tools/security/network";
export default function NetworkWorkspace({
  dnssec,
  publicIp,
}: {
  dnssec: boolean;
  publicIp: boolean;
}) {
  // CSP is attached to the loaded document, not a client-side route transition.
  // Load this exact route as a document so its narrowly scoped connect-src applies.
  useEffect(() => {
    const navigation = performance.getEntriesByType("navigation")[0];
    if (
      navigation &&
      new URL(navigation.name).pathname !== window.location.pathname
    ) {
      window.location.reload();
    }
  }, []);
  const batchAbort = useRef<AbortController | null>(null);
  useEffect(() => () => batchAbort.current?.abort(), []);
  const [domain, setDomain] = useState("");
  const [batch, setBatch] = useState(false);
  const [ipFamily, setIpFamily] = useState<"ipv4" | "any">("ipv4");
  const [type, setType] = useState<DnsType>("A");
  const [lookupMode, setLookupMode] = useState<"records" | EmailDnsKind>(
    "records",
  );
  const [selector, setSelector] = useState("");
  const [consent, setConsent] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function run() {
    setResult("");
    setError("");
    if (!consent) {
      setError(
        publicIp
          ? "Confirm that you agree to contact ipify."
          : "Confirm that you understand the DNS query is sent to Cloudflare.",
      );
      return;
    }
    setBusy(true);
    if (batch && !publicIp && lookupMode === "records")
      batchAbort.current = new AbortController();
    try {
      setResult(
        publicIp
          ? await lookupPublicIp(ipFamily)
          : lookupMode === "records"
            ? batch
              ? await lookupDnsBatch(domain, type, batchAbort.current?.signal)
              : await lookupDns(domain, type)
            : await lookupEmailRecord(domain, lookupMode, selector),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "DNS lookup failed.");
    } finally {
      batchAbort.current = null;
      setBusy(false);
    }
  }
  return (
    <fieldset
      className="workspace devtool-workspace"
      disabled={busy}
      aria-label={
        publicIp ? "Public IP lookup workspace" : "DNS lookup workspace"
      }
    >
      <div className="workspace-heading">
        <div>
          <h2>
            {publicIp
              ? "Check your public IP address"
              : "Query a public DNS resolver"}
          </h2>
          <p>
            {publicIp
              ? "This request reveals your IP address to the external ipify service."
              : "This sends the domain and your IP address to Cloudflare DNS. Never enter private or sensitive domain names."}
          </p>
        </div>
      </div>
      {publicIp && (
        <label>
          IP lookup mode
          <select
            value={ipFamily}
            onChange={(e) => {
              setIpFamily(e.target.value as "ipv4" | "any");
              setResult("");
              setError("");
            }}
          >
            <option value="ipv4">IPv4 only</option>
            <option value="any">IPv6 or IPv4 (dual-stack)</option>
          </select>
        </label>
      )}
      {!publicIp && (
        <>
          {lookupMode === "records" && (
            <label className="check-label">
              <input
                type="checkbox"
                checked={batch}
                onChange={(e) => {
                  setBatch(e.target.checked);
                  setConsent(false);
                  setDomain("");
                  setResult("");
                  setError("");
                }}
              />{" "}
              Batch DNS queries (up to 10 names)
            </label>
          )}
          <label>
            {batch && lookupMode === "records"
              ? "Public domain names (one per line)"
              : "Public domain name"}
            {batch && lookupMode === "records" ? (
              <textarea
                rows={4}
                maxLength={3000}
                value={domain}
                placeholder={"example.com\nexample.org"}
                onChange={(e) => {
                  setDomain(e.target.value);
                  setResult("");
                  setError("");
                }}
              />
            ) : (
              <input
                value={domain}
                placeholder="example.com"
                onChange={(e) => {
                  setDomain(e.target.value);
                  setResult("");
                  setError("");
                }}
              />
            )}
          </label>
          {!dnssec && (
            <label>
              Lookup mode
              <select
                value={lookupMode}
                onChange={(e) => {
                  setLookupMode(e.target.value as "records" | EmailDnsKind);
                  if (batch) setDomain("");
                  setBatch(false);
                  setConsent(false);
                  setResult("");
                  setError("");
                }}
              >
                <option value="records">DNS records</option>
                <option value="spf">SPF TXT review</option>
                <option value="dmarc">DMARC TXT review</option>
                <option value="dkim">DKIM selector TXT review</option>
              </select>
            </label>
          )}
          {lookupMode === "dkim" && !dnssec && (
            <label>
              DKIM selector (one DNS label)
              <input
                value={selector}
                placeholder="selector1"
                onChange={(e) => {
                  setSelector(e.target.value);
                  setResult("");
                  setError("");
                }}
              />
            </label>
          )}
          {lookupMode === "records" && (
            <label>
              Record type
              <select
                value={type}
                onChange={(e) => {
                  setType(e.target.value as DnsType);
                  setResult("");
                }}
              >
                {DNS_TYPES.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
          )}
          {lookupMode !== "records" && (
            <p className="help">
              Only the public TXT record returned by Cloudflare is reviewed.
              Email signatures, sender authorization and DMARC alignment are not
              verified. DNSSEC status relies on the resolver’s AD flag.
            </p>
          )}
        </>
      )}
      {dnssec && (
        <p className="help">
          The resolver’s AD flag is an indication of validation for its answer,
          not independent validation by this page. A missing flag is
          inconclusive.
        </p>
      )}
      <label className="check-label">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
        />{" "}
        {publicIp
          ? "I agree to contact ipify and reveal my IP address to it."
          : batch
            ? "I agree to send each listed query to Cloudflare DNS."
            : "I agree to send this query to Cloudflare DNS."}
      </label>
      <div className="action-row">
        <button type="button" className="primary" onClick={() => void run()}>
          {busy ? "Looking up…" : publicIp ? "Check public IP" : "Look up DNS"}
        </button>
        <button
          type="button"
          className="secondary"
          onClick={() => {
            setDomain("");
            setBatch(false);
            setIpFamily("ipv4");
            setType("A");
            setLookupMode("records");
            setSelector("");
            setConsent(false);
            setResult("");
            setError("");
          }}
        >
          Reset
        </button>
      </div>
      {busy && <p role="status">Contacting lookup service…</p>}
      {error && (
        <p role="alert" className="status error">
          {error}
        </p>
      )}
      <div className="result-panel">
        <label htmlFor="dns-result">Result</label>
        <textarea
          id="dns-result"
          readOnly
          rows={8}
          value={result}
          placeholder="Lookup result appears here…"
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
                publicIp ? "quickkit-public-ip.txt" : "quickkit-dns.txt",
              )
            }
          >
            Download result
          </button>
        </div>
      </div>
    </fieldset>
  );
}
