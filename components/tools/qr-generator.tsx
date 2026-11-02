"use client";
/* User-generated PNG previews are local data URLs, not optimizable remote images. */
/* eslint-disable @next/next/no-img-element */
import { useHydrated } from "@/lib/use-hydrated";
import { useRef, useState } from "react";
import { Copy, Download, FileCode2, QrCode, RotateCcw } from "lucide-react";
import {
  contrastRatio,
  defaultQrOptions,
  qrByteLength,
  QR_SIZES,
  validateQr,
  validateQrOptions,
  MAX_QR_BYTES,
  type QrErrorLevel,
  type QrOptions,
} from "@/lib/tools/qr";
import { downloadText } from "@/lib/tools/download";
import { EmptyState, WorkspaceHeading } from "./tool-ui";

const LEVEL_HELP: Record<QrErrorLevel, string> = {
  L: "Low · ~7% damage tolerance, smallest code",
  M: "Medium · ~15% damage tolerance (recommended)",
  Q: "Quartile · ~25% damage tolerance",
  H: "High · ~30% damage tolerance, densest code",
};

export default function QrGenerator() {
  const ready = useHydrated();
  const [input, setInput] = useState("");
  const [options, setOptions] = useState<QrOptions>(defaultQrOptions);
  const [image, setImage] = useState("");
  const [svg, setSvg] = useState("");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const version = useRef(0);
  const bytes = qrByteLength(input);
  const contrast = contrastRatio(options.foreground, options.background);

  function invalidate() {
    version.current++;
    setImage("");
    setSvg("");
    setError("");
    setNote("");
    setBusy(false);
  }
  function updateOptions(next: QrOptions) {
    invalidate();
    setOptions(next);
  }

  async function generate() {
    const id = ++version.current;
    setImage("");
    setSvg("");
    setError("");
    setNote("");
    try {
      const text = validateQr(input);
      validateQrOptions(options);
      setBusy(true);
      const QRCode = await import("qrcode");
      const shared = {
        margin: 4,
        errorCorrectionLevel: options.errorLevel,
        color: { dark: options.foreground, light: options.background },
      };
      const [data, svgText] = await Promise.all([
        QRCode.toDataURL(text, { ...shared, width: options.size }),
        QRCode.toString(text, { ...shared, type: "svg" }),
      ]);
      if (id === version.current) {
        setImage(data);
        setSvg(svgText);
      }
    } catch (e) {
      if (id === version.current)
        setError(
          e instanceof Error
            ? e.message
            : "Unable to generate this QR code. Try shorter content.",
        );
    } finally {
      if (id === version.current) setBusy(false);
    }
  }

  async function copyImage() {
    try {
      if (!navigator.clipboard || typeof ClipboardItem === "undefined")
        throw new Error("unsupported");
      const blob = await (await fetch(image)).blob();
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      setNote("QR image copied — paste it anywhere.");
    } catch {
      setNote("Image copy is not available here. Use Download PNG instead.");
    }
  }

  return (
    <fieldset
      className="workspace"
      disabled={!ready}
      aria-label="Tool workspace"
    >
      <WorkspaceHeading
        title="A shortcut worth sharing"
        description="Turn text or a link into a printable QR code — generated entirely on your device."
      />
      <div className="tool-toolbar">
        <label htmlFor="qr-input">Text or URL</label>
        <span
          className={
            bytes > MAX_QR_BYTES ? "char-meter near-limit" : "char-meter"
          }
        >
          {bytes.toLocaleString()} / {MAX_QR_BYTES.toLocaleString()} bytes
        </span>
      </div>
      <textarea
        id="qr-input"
        maxLength={2000}
        value={input}
        onChange={(e) => {
          invalidate();
          setInput(e.target.value);
        }}
        rows={4}
        placeholder="https://example.com or a little text to share…"
        aria-describedby="qr-help"
      />
      <p id="qr-help" className="help">
        Limit: 2,000 UTF-8 bytes (non-Latin characters use more bytes). Content
        is encoded as text, never opened, fetched or sent to a server.
      </p>

      <div className="settings-grid qr-settings">
        <div>
          <label htmlFor="qr-size">PNG size</label>
          <select
            id="qr-size"
            value={options.size}
            onChange={(e) =>
              updateOptions({ ...options, size: Number(e.target.value) })
            }
          >
            {QR_SIZES.map((size) => (
              <option key={size} value={size}>
                {size} × {size} px
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="qr-level">Error correction</label>
          <select
            id="qr-level"
            value={options.errorLevel}
            onChange={(e) =>
              updateOptions({
                ...options,
                errorLevel: e.target.value as QrErrorLevel,
              })
            }
          >
            {(Object.keys(LEVEL_HELP) as QrErrorLevel[]).map((level) => (
              <option key={level} value={level}>
                {LEVEL_HELP[level]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="qr-fg">Code color</label>
          <div className="color-field">
            <input
              id="qr-fg"
              type="color"
              value={options.foreground}
              onChange={(e) =>
                updateOptions({ ...options, foreground: e.target.value })
              }
            />
            <code>{options.foreground}</code>
          </div>
        </div>
        <div>
          <label htmlFor="qr-bg">Background</label>
          <div className="color-field">
            <input
              id="qr-bg"
              type="color"
              value={options.background}
              onChange={(e) =>
                updateOptions({ ...options, background: e.target.value })
              }
            />
            <code>{options.background}</code>
          </div>
        </div>
      </div>
      <p className="help" role="status">
        Color contrast {contrast ? contrast.toFixed(1) : "—"}:1
        {contrast && contrast < 3
          ? " — too low for reliable scanning."
          : " — scannable contrast."}{" "}
        Dark-on-light codes scan most reliably.
      </p>

      <div className="action-row">
        <button className="primary" onClick={generate} disabled={busy}>
          <QrCode size={16} /> {busy ? "Generating…" : "Generate QR code"}
        </button>
        <button
          className="secondary"
          onClick={() => {
            invalidate();
            setInput("");
            setOptions(defaultQrOptions);
          }}
        >
          <RotateCcw size={15} /> Reset
        </button>
      </div>
      {error && (
        <p className="status error" role="alert">
          Error: {error}
        </p>
      )}
      {note && (
        <p className="status success" role="status">
          {note}
        </p>
      )}
      <div className="result-panel" aria-busy={busy}>
        {image ? (
          <div className="qr-result">
            <img
              src={image}
              width={220}
              height={220}
              alt="Generated QR code preview"
            />
            <div>
              <h3>Your code is ready.</h3>
              <p className="help">
                {options.size} × {options.size} PNG · error correction{" "}
                {options.errorLevel}.
                <br />
                Test it with your camera before printing or sharing.
              </p>
              <div className="action-row">
                <a
                  href={image}
                  download="quickkit-qr-code.png"
                  className="primary"
                >
                  <Download size={16} /> Download PNG
                </a>
                <button
                  type="button"
                  className="secondary"
                  disabled={!svg}
                  onClick={() =>
                    downloadText(
                      svg,
                      "quickkit-qr-code.svg",
                      "image/svg+xml;charset=utf-8",
                    )
                  }
                >
                  <FileCode2 size={15} /> Download SVG
                </button>
                <button type="button" className="secondary" onClick={copyImage}>
                  <Copy size={15} /> Copy image
                </button>
              </div>
            </div>
          </div>
        ) : (
          <EmptyState icon={<QrCode size={36} />}>
            {busy
              ? "Creating your QR code…"
              : "Your QR preview will appear here."}
          </EmptyState>
        )}
      </div>
      <p className="sr-only" role="status">
        {image
          ? "QR code generated. PNG download ready."
          : busy
            ? "Generating QR code."
            : ""}
      </p>
    </fieldset>
  );
}
