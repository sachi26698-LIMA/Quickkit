"use client";
/**
 * GS1 Intelligence workspace.
 *
 * Reads an element string, an HRI string or a Digital Link and explains every
 * application identifier. The parser lives in `lib/tools/gs1/engine.ts`; this
 * file only renders what the parser proved. When the parser refuses, the page
 * shows the refusal — it never fills in a plausible GTIN.
 */
import { useCallback, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCopy,
  Link2,
  QrCode,
  ScanBarcode,
  XCircle,
} from "lucide-react";
import {
  buildDigitalLink,
  parseGs1Input,
  toGtin14,
  type ParsedGs1,
} from "@/lib/tools/gs1/engine";
import { gtinCheckDigit } from "@/lib/tools/barcode/checksums";
import styles from "@/components/tools/barcode-suite/suite.module.css";

const SAMPLES: { label: string; value: string }[] = [
  {
    label: "Retail GTIN + batch + expiry",
    value: "(01)09506000134352(10)LOT-42(17)251231",
  },
  { label: "Serialised item", value: "(01)09506000134352(21)SN-000001" },
  {
    label: "Digital Link",
    value: "https://id.example.com/01/09506000134352/10/LOT-42?17=251231",
  },
  { label: "Wrong check digit", value: "(01)09506000134351" },
];

function displayEncoded(encoded: string) {
  return encoded.replace(/\u001d/g, "<GS>");
}

export default function Gs1Intelligence() {
  const [input, setInput] = useState(SAMPLES[0].value);
  const [parsed, setParsed] = useState<ParsedGs1 | null>(null);
  const [copied, setCopied] = useState("");
  const [qr, setQr] = useState<{ svg: string; url: string } | null>(null);
  const [qrError, setQrError] = useState("");

  const [origin, setOrigin] = useState("https://id.example.com");
  const [gtin, setGtin] = useState("09506000134352");
  const [batch, setBatch] = useState("LOT-42");
  const [serial, setSerial] = useState("");
  const [expiry, setExpiry] = useState("2025-12-31");

  const link = useMemo(
    () =>
      buildDigitalLink(
        {
          gtin,
          batch: batch || undefined,
          serial: serial || undefined,
          expiry: expiry || undefined,
        },
        { origin: origin || undefined },
      ),
    [gtin, batch, serial, expiry, origin],
  );

  const copy = useCallback(async (label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      window.setTimeout(() => setCopied(""), 1600);
    } catch {
      setCopied("");
    }
  }, []);

  const run = () => {
    setQr(null);
    setQrError("");
    setParsed(parseGs1Input(input));
  };

  const showQr = async () => {
    if (!link.ok) return;
    setQrError("");
    try {
      const { buildTwoD } = await import("@/lib/tools/barcode/twod");
      const result = buildTwoD("qrcode", link.url, { ecLevel: "M", scale: 4 });
      if (!result.ok) {
        setQr(null);
        setQrError(
          result.problems[0]?.message ?? "The QR symbol could not be built.",
        );
        return;
      }
      setQr({ svg: result.svg, url: link.url });
    } catch {
      setQr(null);
      setQrError("The QR renderer could not be loaded in this browser.");
    }
  };

  const gtin14 = useMemo(
    () => (gtin.length >= 8 ? toGtin14(gtin.trim()) : null),
    [gtin],
  );
  const expectedCheck = useMemo(() => {
    const digits = gtin.replace(/\D/g, "");
    if (digits.length !== 14) return null;
    return gtinCheckDigit(digits.slice(0, 13));
  }, [gtin]);

  return (
    <div className={styles.workspace}>
      <div className={styles.heading}>
        <h2>GS1 Intelligence</h2>
        <p>
          Paste a GS1 element string, an HRI string with parentheses, or a GS1
          Digital Link. Every application identifier is explained with its data
          title, its length rule and, for dates, the calendar date it encodes. A
          GTIN that passes its check digit is well-formed — that is not the same
          as being a licensed GS1 number.
        </p>
      </div>

      <section className={styles.card} aria-labelledby="gs1-parse-heading">
        <div className={styles.cardHead}>
          <ScanBarcode size={16} aria-hidden="true" />
          <h3 id="gs1-parse-heading">Parse an element string</h3>
          <p>Nothing is sent anywhere: the parse runs in this tab.</p>
        </div>
        <label className={styles.field} htmlFor="gs1-input">
          Element string, HRI string or Digital Link
          <textarea
            id="gs1-input"
            className={styles.textarea}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            spellCheck={false}
            placeholder="(01)09506000134352(10)LOT-42(17)251231"
          />
          <small>
            FNC1 / GS separators may be pasted as the real control character or
            omitted when the string is unambiguous.
          </small>
        </label>
        <div className={styles.actions}>
          <button type="button" className={styles.button} onClick={run}>
            Parse
          </button>
          {SAMPLES.map((sample) => (
            <button
              key={sample.label}
              type="button"
              className={styles.buttonGhost}
              onClick={() => {
                setInput(sample.value);
                setParsed(parseGs1Input(sample.value));
              }}
            >
              {sample.label}
            </button>
          ))}
        </div>

        {parsed && !parsed.ok && (
          <p className={styles.error} role="alert">
            <strong>Not parsed.</strong> {parsed.message}
            {parsed.hint ? ` ${parsed.hint}` : ""} (code:{" "}
            <code>{parsed.code}</code>)
          </p>
        )}

        {parsed?.ok && (
          <div style={{ marginTop: 14 }}>
            <dl className={styles.kv}>
              <dt>Input kind</dt>
              <dd>
                {parsed.kind === "hri"
                  ? "HRI string (parenthesised)"
                  : parsed.kind === "digital-link"
                    ? "GS1 Digital Link"
                    : "Element string with FNC1/GS"}
              </dd>
              <dt>Fields</dt>
              <dd>{parsed.fields.length}</dd>
              <dt>HRI</dt>
              <dd className={styles.mono}>{parsed.hri}</dd>
              <dt>Scanned data</dt>
              <dd className={styles.mono}>{displayEncoded(parsed.encoded)}</dd>
              {parsed.link && (
                <>
                  <dt>Link origin</dt>
                  <dd className={styles.mono}>{parsed.link.origin}</dd>
                </>
              )}
            </dl>

            <div className={styles.actions}>
              <button
                type="button"
                className={styles.buttonGhost}
                onClick={() => copy("hri", parsed.hri)}
              >
                <ClipboardCopy size={13} aria-hidden="true" />
                {copied === "hri" ? "Copied HRI" : "Copy HRI"}
              </button>
              <button
                type="button"
                className={styles.buttonGhost}
                onClick={() => copy("encoded", parsed.encoded)}
              >
                <ClipboardCopy size={13} aria-hidden="true" />
                {copied === "encoded" ? "Copied data" : "Copy scanned data"}
              </button>
            </div>

            <div className={styles.scroll} style={{ marginTop: 12 }}>
              <table className={styles.table}>
                <caption className={styles.srOnly}>
                  Application identifiers in this input
                </caption>
                <thead>
                  <tr>
                    <th scope="col">AI</th>
                    <th scope="col">Data title</th>
                    <th scope="col">Value</th>
                    <th scope="col">Interpretation</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.fields.map((field) => (
                    <tr key={`${field.ai}-${field.value}`}>
                      <td>
                        <code>({field.ai})</code>
                      </td>
                      <td>
                        <strong>{field.title}</strong>
                        <div className={styles.hint}>{field.explanation}</div>
                      </td>
                      <td className={styles.mono}>{field.value}</td>
                      <td>
                        {field.date ? (
                          <>
                            <strong>{field.date.human}</strong>
                            <div className={styles.hint}>
                              {field.date.iso}
                              {field.date.note ? ` — ${field.date.note}` : ""}
                            </div>
                          </>
                        ) : field.ai === "01" ||
                          field.ai === "8006" ||
                          field.ai === "00" ? (
                          <span className={styles.ok}>
                            <CheckCircle2 size={13} aria-hidden="true" /> check
                            digit valid
                          </span>
                        ) : (
                          <span className={styles.hint}>
                            {field.kind === "batch"
                              ? "Batch/lot: free text, not a date and not an authenticity proof."
                              : field.kind === "serial"
                                ? "Serial: uniquely identifies this item."
                                : "Carried as-is."}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {parsed.warnings.length > 0 && (
              <ul className={styles.chips} style={{ marginTop: 10 }}>
                {parsed.warnings.map((warning) => (
                  <li key={warning} className={styles.chip}>
                    <AlertTriangle size={12} aria-hidden="true" /> {warning}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      <section className={styles.card} aria-labelledby="gs1-link-heading">
        <div className={styles.cardHead}>
          <Link2 size={16} aria-hidden="true" />
          <h3 id="gs1-link-heading">Build a GS1 Digital Link</h3>
          <p>
            Primary key and identifying attributes go in the path; dates go in
            the query, in ascending AI order. Your GTIN is padded to 14 digits
            and must pass its check digit.
          </p>
        </div>
        <div className={styles.grid}>
          <label className={styles.field}>
            Resolver origin
            <input
              className={styles.input}
              value={origin}
              onChange={(event) => setOrigin(event.target.value)}
              placeholder="https://id.example.com"
            />
          </label>
          <label className={styles.field}>
            GTIN
            <input
              className={styles.input}
              value={gtin}
              onChange={(event) => setGtin(event.target.value)}
              inputMode="numeric"
              aria-invalid={gtin14 ? "false" : "true"}
            />
            <small>
              {gtin14
                ? `GTIN-14: ${gtin14}`
                : expectedCheck !== null
                  ? `Check digit should be ${expectedCheck}.`
                  : "8, 12, 13 or 14 digits."}
            </small>
          </label>
          <label className={styles.field}>
            Batch / lot (10)
            <input
              className={styles.input}
              value={batch}
              onChange={(event) => setBatch(event.target.value)}
              maxLength={20}
            />
          </label>
          <label className={styles.field}>
            Serial (21)
            <input
              className={styles.input}
              value={serial}
              onChange={(event) => setSerial(event.target.value)}
              maxLength={20}
            />
          </label>
          <label className={styles.field}>
            Expiry (17)
            <input
              className={styles.input}
              value={expiry}
              onChange={(event) => setExpiry(event.target.value)}
              placeholder="2025-12-31 or 251231"
            />
            <small>
              Written as YYMMDD; day 00 means the last day of the month.
            </small>
          </label>
        </div>

        {link.ok ? (
          <>
            <dl className={styles.kv} style={{ marginTop: 14 }}>
              <dt>URL</dt>
              <dd className={styles.mono}>{link.url}</dd>
              <dt>HRI</dt>
              <dd className={styles.mono}>{link.hri}</dd>
            </dl>
            {link.notes.length > 0 && (
              <ul className={styles.chips} style={{ marginTop: 10 }}>
                {link.notes.map((note) => (
                  <li key={note} className={styles.chip}>
                    {note}
                  </li>
                ))}
              </ul>
            )}
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.buttonGhost}
                onClick={() => copy("link", link.url)}
              >
                <ClipboardCopy size={13} aria-hidden="true" />
                {copied === "link" ? "Copied URL" : "Copy URL"}
              </button>
              <button
                type="button"
                className={styles.buttonGhost}
                onClick={showQr}
              >
                <QrCode size={13} aria-hidden="true" />
                Show QR
              </button>
            </div>
            {qrError && <p className={styles.error}>{qrError}</p>}
            {qr && (
              <div className={styles.previewBox} style={{ marginTop: 12 }}>
                <div dangerouslySetInnerHTML={{ __html: qr.svg }} />
              </div>
            )}
          </>
        ) : (
          <p className={styles.error} role="alert">
            <XCircle size={13} aria-hidden="true" /> {link.message}
          </p>
        )}
      </section>
    </div>
  );
}
