"use client";
/** ADVANCED — robustness, geometry and the honest limits each control has. Folded by default. */
import { Gauge, Lock, SlidersHorizontal } from "lucide-react";
import { ERROR_LEVELS } from "@/lib/tools/qr/style";
import {
  MAX_QR_PAYLOAD_BYTES,
  byteCapacity,
  fitQr,
} from "@/lib/tools/qr/capacity";
import {
  QR_MARGIN_MAX,
  QR_MARGIN_MIN,
  QR_SIZES,
  type QrErrorLevel,
} from "@/lib/tools/qr/types";
import { QrDisclosure, QrRange, QrToggle } from "./shared";
import type { QrStudio } from "./use-qr-studio";

export default function AdvancedPanel({ studio }: { studio: QrStudio }) {
  const { design, patchDesign, payloadResult } = studio;
  const fit = payloadResult.ok
    ? fitQr(payloadResult.bytes, design.errorLevel)
    : null;
  const capacity = fit?.ok ? byteCapacity(fit.version, design.errorLevel) : 0;

  return (
    <QrDisclosure
      id="qr-advanced"
      title="Advanced Settings"
      hint="Error correction, quiet zone, export size, transparency and inversion."
      icon={<SlidersHorizontal size={17} />}
      action={
        <span className="qr-badge">
          {design.errorLevel} · {design.margin}-module border · {design.size} px
        </span>
      }
    >
      <div
        className="qr-choice"
        role="group"
        aria-label="Error correction level"
      >
        <span className="field-label">Error correction</span>
        <div className="qr-level-grid">
          {ERROR_LEVELS.map((level) => (
            <button
              key={level.id}
              type="button"
              className={
                design.errorLevel === level.id ? "qr-level active" : "qr-level"
              }
              aria-pressed={design.errorLevel === level.id}
              onClick={() =>
                patchDesign({ errorLevel: level.id as QrErrorLevel })
              }
            >
              <strong>{level.label}</strong>
              <small>{level.help}</small>
            </button>
          ))}
        </div>
      </div>

      <QrToggle
        id="qr-boost"
        label="Use the strongest level that costs no extra version"
        hint="Free robustness: if the payload already fits a higher level in the same symbol size, use it."
        checked={design.boost}
        onChange={(boost) => patchDesign({ boost })}
      />

      <div className="qr-range-pair">
        <QrRange
          id="qr-margin"
          label="Quiet zone (margin)"
          value={design.margin}
          min={QR_MARGIN_MIN}
          max={QR_MARGIN_MAX}
          suffix=" modules"
          onChange={(margin) => patchDesign({ margin })}
        />
        <QrRange
          id="qr-size"
          label="Export size"
          value={design.size}
          min={128}
          max={2048}
          step={64}
          suffix=" px"
          onChange={(size) => patchDesign({ size })}
        />
      </div>

      <div
        className="qr-size-chips"
        role="group"
        aria-label="Preset export sizes"
      >
        {QR_SIZES.map((size) => (
          <button
            key={size}
            type="button"
            className={design.size === size ? "qr-chip active" : "qr-chip"}
            aria-pressed={design.size === size}
            onClick={() => patchDesign({ size })}
          >
            {size} px
          </button>
        ))}
      </div>

      <div className="qr-toggle-pair">
        <QrToggle
          id="qr-transparent"
          label="Transparent background"
          hint="PNG and SVG only — a PDF needs a page behind it."
          checked={design.transparent}
          onChange={(transparent) => patchDesign({ transparent })}
        />
        <QrToggle
          id="qr-invert"
          label="Invert (light modules on a dark field)"
          hint="Designers love it, kiosks often do not. Re-tested on every change."
          checked={design.invert}
          onChange={(invert) => patchDesign({ invert })}
        />
      </div>

      <div className="qr-capacity">
        <p className="help">
          <Gauge size={13} aria-hidden="true" />{" "}
          {payloadResult.ok && fit?.ok
            ? `${payloadResult.bytes.toLocaleString()} of ${capacity.toLocaleString()} bytes used at level ${design.errorLevel} — version ${fit.version}. Room for ${(capacity - payloadResult.bytes).toLocaleString()} more before the symbol grows a version.`
            : `Payload budget for this tool: ${MAX_QR_PAYLOAD_BYTES.toLocaleString()} bytes (a version-40 code at level L holds 2,953, but that dense a symbol is unpleasant to scan).`}
        </p>
        <p className="help">
          <Lock size={13} aria-hidden="true" /> Micro QR, RM-QR, GS1, HANUKIN,
          dot-code and custom masks are not supported — this tool writes
          standard model-2 QR symbols only.
        </p>
      </div>
    </QrDisclosure>
  );
}
