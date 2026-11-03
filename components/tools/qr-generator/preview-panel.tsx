"use client";
/**
 * PREVIEW — the live code, the proof it decodes, what it looks like printed
 * small, and the download row. One card on the right so the code, its verdict
 * and its files are never in different places. The empty state offers a real
 * sample instead of a mock-up, and no badge here is ever decorative.
 */
import { useState } from "react";
import {
  CircleAlert,
  CircleCheck,
  Contrast,
  Copy,
  Download,
  Grid3x3,
  Image as ImageIcon,
  LoaderCircle,
  Maximize2,
  RefreshCw,
  ScanLine,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  WandSparkles,
} from "lucide-react";
import { MIN_CONTRAST } from "@/lib/tools/qr/style";
import { QrCanvas, QrSection } from "./shared";
import { QrPlaceholder } from "./empty-state";
import { QR_SAMPLE_URL } from "./use-qr-studio";
import ExportPanel from "./export-panel";
import type { QrStudio } from "./use-qr-studio";

export default function PreviewPanel({ studio }: { studio: QrStudio }) {
  const {
    preview,
    output,
    status,
    design,
    notes,
    formError,
    def,
    payloadResult,
  } = studio;
  const [showSizeTest, setShowSizeTest] = useState(false);
  const safety = output?.safety ?? null;
  const verification = output?.verification ?? null;
  const matrix = output?.matrix ?? null;
  const verified = Boolean(verification?.ok);
  const blocked = Boolean(
    safety?.level === "blocked" ||
    (output !== null && verification && !verified),
  );
  const broken = status === "invalid" || status === "failed";
  const state = blocked
    ? {
        icon: <CircleAlert size={15} />,
        text: "Not scannable — export is blocked",
        tone: "bad",
      }
    : verified && safety?.level === "good"
      ? {
          icon: <CircleCheck size={15} />,
          text: "Verified by an independent decoder",
          tone: "good",
        }
      : verified
        ? {
            icon: <ShieldCheck size={15} />,
            text: "Decoded — with notes below",
            tone: "warn",
          }
        : status === "rendering"
          ? {
              icon: <LoaderCircle size={15} className="qr-spin" />,
              text: "Rendering and checking…",
              tone: "idle",
            }
          : broken
            ? {
                icon: <CircleAlert size={15} />,
                text: formError?.message ?? "Could not render",
                tone: "bad",
              }
            : {
                icon: <ScanLine size={15} />,
                text: "Waiting for valid content",
                tone: "idle",
              };

  const modulePx = safety?.modulePx ?? 0;
  const contrast = safety?.contrast ?? 0;
  const contrastOk = contrast >= MIN_CONTRAST;

  return (
    <QrSection
      id="qr-preview"
      title="Preview"
      hint="The same pixels as the file you download — decoded by a second reader before export opens."
      icon={<ScanLine size={17} />}
      action={
        <button
          type="button"
          className="secondary qr-mini-button"
          onClick={studio.regenerate}
        >
          <RefreshCw size={14} /> Re-render
        </button>
      }
    >
      <div className="qr-preview-stage">
        {preview ? (
          <QrCanvas
            bitmap={preview}
            size={320}
            label={`Live QR code preview for ${def.label}, ${matrix ? `${matrix.size} by ${matrix.size} modules` : "not yet measured"}`}
            transparent={design.transparent}
          />
        ) : (
          <div className="qr-preview-empty">
            <QrPlaceholder />
            <strong>
              {broken
                ? (formError?.message ??
                  "Fix the highlighted field to see the code.")
                : "Your QR code will appear here"}
            </strong>
            <p>
              {broken
                ? "The outline is a placeholder: nothing is claimed to be scannable until a real code has been rendered and decoded."
                : `Fill the ${def.label.toLowerCase()} fields and a live ${design.size}×${design.size} px code is drawn here, then decoded by a second reader.`}
            </p>
            <div className="qr-empty-actions">
              <button
                type="button"
                className="primary"
                onClick={studio.loadSample}
              >
                <Sparkles size={15} /> Try sample
              </button>
              <span className="qr-empty-hint">
                uses <code>{QR_SAMPLE_URL}</code>
              </span>
            </div>
          </div>
        )}

        <div className="qr-stage-tools">
          <button
            type="button"
            className="qr-icon-button"
            onClick={() => {
              setShowSizeTest((current) => !current);
              if (!showSizeTest && !studio.sizeTests) void studio.testSizes();
            }}
            disabled={!payloadResult.ok}
            aria-expanded={showSizeTest}
            aria-controls="qr-size-test-body"
            title="Preview and test this code at print sizes"
          >
            <Maximize2 size={15} />
            <span className="sr-only">
              Preview and test this code at print sizes
            </span>
          </button>
          <button
            type="button"
            className="qr-icon-button"
            onClick={() => void studio.exportPng()}
            disabled={!verified}
            title={
              verified
                ? "Download the verified PNG"
                : "Download unlocks after this code has been decoded"
            }
          >
            <Download size={15} />
            <span className="sr-only">Download the verified PNG</span>
          </button>
          <button
            type="button"
            className="qr-icon-button"
            onClick={() => void studio.copyImage()}
            disabled={!verified}
            title={
              verified
                ? "Copy the PNG to the clipboard"
                : "Copying unlocks after this code has been decoded"
            }
          >
            <Copy size={15} />
            <span className="sr-only">Copy the PNG to the clipboard</span>
          </button>
        </div>
      </div>

      <div
        className={`qr-verdict ${state.tone}`}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <span className="qr-verdict-icon" aria-hidden="true">
          {state.icon}
        </span>
        <div className="qr-verdict-text">
          <strong>{state.text}</strong>
          {verification ? <p>{verification.message}</p> : null}
          {blocked && verification && !verification.ok ? (
            <p className="qr-verdict-hint">
              Decoder attempts: {verification.attempts.join(" · ")}.
            </p>
          ) : null}
        </div>
        {blocked && safety ? (
          <button type="button" className="secondary" onClick={studio.makeSafe}>
            <WandSparkles size={14} /> Make it safe
          </button>
        ) : null}
      </div>

      <div className="qr-chips">
        <div className="qr-chip">
          <span className="qr-chip-icon" aria-hidden="true">
            <ImageIcon size={14} />
          </span>
          <span>
            <small>Size</small>
            <strong>{design.size} px</strong>
          </span>
        </div>
        <div className="qr-chip">
          <span className="qr-chip-icon" aria-hidden="true">
            <ShieldCheck size={14} />
          </span>
          <span>
            <small>Correction</small>
            <strong>
              {matrix
                ? `${matrix.level}${output?.design.boost ? " · auto" : ""}`
                : design.errorLevel}
            </strong>
          </span>
        </div>
        <div className="qr-chip">
          <span className="qr-chip-icon" aria-hidden="true">
            <Contrast size={14} />
          </span>
          <span>
            <small>Contrast</small>
            <strong className={contrastOk ? "" : "bad"}>
              {safety ? `${contrast.toFixed(1)}:1` : "—"}
            </strong>
          </span>
        </div>
      </div>

      <p className="qr-facts">
        {matrix
          ? `Symbol v${matrix.version} · ${matrix.size}×${matrix.size} modules · `
          : "Symbol not measured yet · "}
        {output ? `${output.bytes.toLocaleString()} byte payload · ` : ""}
        {design.margin}-module quiet zone
        {modulePx ? ` · ${modulePx.toFixed(1)} px per module` : ""}
        {design.transparent ? " · transparent field" : ""}
      </p>

      {notes.length || (safety && safety.findings.length) ? (
        <details className="qr-findings" open={blocked}>
          <summary>
            <TriangleAlert size={14} aria-hidden="true" /> Design notes and
            adjustments ({(safety?.findings.length ?? 0) + notes.length})
          </summary>
          <ul>
            {safety?.findings.map((finding) => (
              <li key={`${finding.field}-${finding.message.slice(0, 24)}`}>
                <span className={`qr-pill ${finding.level}`}>
                  {finding.level === "blocked" ? "blocked" : "caution"}
                </span>
                {finding.message}
              </li>
            ))}
            {notes.map((note) => (
              <li key={note.slice(0, 32)}>
                <span className="qr-pill note">adjusted</span>
                {note}
              </li>
            ))}
          </ul>
          {safety?.findings.some((finding) => finding.fix) ? (
            <button
              type="button"
              className="secondary"
              onClick={studio.makeSafe}
            >
              <WandSparkles size={14} /> Apply the safe settings
            </button>
          ) : null}
        </details>
      ) : null}

      {showSizeTest ? (
        <div id="qr-size-test-body" className="qr-size-body">
          <div className="qr-size-previews">
            {[220, 120, 64].map((px) => (
              <figure key={px}>
                <QrCanvas
                  bitmap={preview}
                  size={px}
                  label={`Preview scaled to ${px} pixels`}
                  transparent={design.transparent}
                />
                <figcaption>
                  {px}px · {(modulePx * (px / 320)).toFixed(1)} px/module
                </figcaption>
              </figure>
            ))}
          </div>
          <p className="help">
            These three are the same rendered image scaled by the browser, so
            they show how the styling holds up when small. The decode test below
            re-renders at each size — a real reader never sees more detail than
            the pixels it has.
          </p>
          {studio.testing ? (
            <p className="qr-size-running">
              <LoaderCircle size={14} className="qr-spin" /> Rendering and
              decoding 128, 256, 512 and {design.size} px…
            </p>
          ) : studio.sizeTests ? (
            <ul className="qr-size-results">
              {studio.sizeTests.map((test) => (
                <li key={test.size} className={test.ok ? "pass" : "fail"}>
                  <strong>{test.size} px</strong>
                  <span>{test.ok ? "decoded" : "failed"}</span>
                  <small>{test.message}</small>
                </li>
              ))}
            </ul>
          ) : null}
          <button
            type="button"
            className="secondary"
            onClick={() => void studio.testSizes()}
            disabled={studio.testing || !payloadResult.ok}
          >
            <Grid3x3 size={14} /> Run decode test again
          </button>
        </div>
      ) : null}

      <ExportPanel studio={studio} />
    </QrSection>
  );
}
