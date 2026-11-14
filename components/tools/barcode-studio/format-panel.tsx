"use client";
/**
 * Format picker + data input.
 *
 * The validation message sits directly under the field it belongs to, states
 * what the format needs, and offers an example — the three things a person
 * actually needs when a barcode will not build.
 */
import { AlertCircle, Check, Info, Sparkles } from "lucide-react";
import {
  BARCODE_FORMATS,
  FORMAT_GROUPS,
  formatMeta,
} from "@/lib/tools/barcode/formats";
import { detectBarcodeFormat } from "@/lib/tools/barcode/detect";
import type { BarcodeFormatId } from "@/lib/tools/barcode/types";
import type { useBarcodeStudio } from "./use-barcode-studio";

type Studio = ReturnType<typeof useBarcodeStudio>;

const NUMERIC: BarcodeFormatId[] = [
  "ean13",
  "ean8",
  "upca",
  "upce",
  "itf14",
  "msi",
  "pharmacode",
];
const CHECKSUM_FORMATS: BarcodeFormatId[] = ["code39", "msi"];
const NUMBER_SYSTEM_FORMATS: BarcodeFormatId[] = ["upce"];
const GUARD_FORMATS: BarcodeFormatId[] = ["ean13", "ean8", "upca", "upce"];

export default function FormatPanel({ studio }: { studio: Studio }) {
  const { settings, update, result } = studio;
  const meta = formatMeta(settings.format);
  const problems = result.ok ? [] : result.problems;
  const notes = result.ok ? result.spec.notes : [];
  const inputId = "bc-data-input";
  // Detection is a suggestion, never an automatic switch: changing the format
  // under someone's cursor while they type would rebuild the symbol mid-edit.
  const detection = settings.data.trim()
    ? detectBarcodeFormat(settings.data)
    : null;
  const describedBy = problems.length ? "bc-data-error" : "bc-data-help";

  return (
    <section className="qr-card" aria-labelledby="bc-format-heading">
      <div className="qr-card-head">
        <div>
          <h3 id="bc-format-heading">Choose a format and enter data</h3>
          <p>
            Eleven symbologies with the rules and check digits enforced before
            anything is drawn.
          </p>
        </div>
        <span className="qr-badge">{meta.group}</span>
      </div>

      <span className="qr-block-label" id="bc-format-label">
        Barcode format
      </span>
      <div
        className="bc-format-grid"
        role="radiogroup"
        aria-labelledby="bc-format-label"
      >
        {BARCODE_FORMATS.map((entry) => {
          const active = entry.id === settings.format;
          return (
            <button
              key={entry.id}
              type="button"
              role="radio"
              aria-checked={active}
              className={active ? "bc-format-card active" : "bc-format-card"}
              onClick={() => studio.chooseFormat(entry.id)}
              title={entry.blurb}
            >
              <span className="bc-format-name">
                {active ? <Check size={12} aria-hidden="true" /> : null}
                {entry.name}
              </span>
              <span className="bc-format-group">{entry.group}</span>
            </button>
          );
        })}
      </div>

      <p className="qr-field-hint">{meta.blurb}</p>

      <div className="qr-field">
        <label htmlFor={inputId}>
          {settings.format === "gs1-128"
            ? "GS1 element string"
            : "Barcode data"}
        </label>
        <textarea
          id={inputId}
          className="qr-input"
          value={settings.data}
          onChange={(event) => update("data", event.target.value)}
          placeholder={meta.placeholder}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          inputMode={NUMERIC.includes(settings.format) ? "numeric" : "text"}
          rows={settings.format === "gs1-128" ? 3 : 2}
          aria-invalid={problems.length > 0}
          aria-describedby={describedBy}
        />
        {problems.length ? (
          <p className="qr-field-error" id="bc-data-error" role="alert">
            <AlertCircle size={13} aria-hidden="true" /> {problems[0].message}
          </p>
        ) : (
          <p className="help" id="bc-data-help">
            {meta.rules[0]}
          </p>
        )}
      </div>

      <div className="bc-example-row">
        <button
          type="button"
          className="qr-chip"
          onClick={() => update("data", meta.example)}
        >
          <Sparkles size={12} aria-hidden="true" /> Try {meta.example}
        </button>
        {detection?.best && detection.best.format !== settings.format ? (
          <button
            type="button"
            className="qr-chip"
            onClick={() => update("format", detection.best!.format)}
            title={detection.best.reason}
          >
            Use detected {formatMeta(detection.best.format).name}
          </button>
        ) : null}
        <span className="bc-dim">
          {settings.data.length.toLocaleString()} characters
        </span>
      </div>
      {detection && (
        <p className="qr-field-hint">
          {detection.best
            ? `Looks like ${formatMeta(detection.best.format).name}: ${detection.best.reason}`
            : detection.note}
        </p>
      )}

      {notes.length ? (
        <ul className="bc-notes">
          {notes.map((note) => (
            <li key={note}>
              <Info size={12} aria-hidden="true" /> {note}
            </li>
          ))}
        </ul>
      ) : null}

      {CHECKSUM_FORMATS.includes(settings.format) ||
      NUMBER_SYSTEM_FORMATS.includes(settings.format) ||
      GUARD_FORMATS.includes(settings.format) ? (
        <div className="bc-options">
          {CHECKSUM_FORMATS.includes(settings.format) ? (
            <div className="qr-field">
              <label htmlFor="bc-checksum">Check digit</label>
              <select
                id="bc-checksum"
                className="qr-input"
                value={settings.checksum}
                onChange={(event) =>
                  update(
                    "checksum",
                    event.target.value as typeof settings.checksum,
                  )
                }
              >
                <option value="none">None (plain data)</option>
                {settings.format === "code39" ? (
                  <option value="mod43">Code 39 mod-43</option>
                ) : (
                  <>
                    <option value="mod10">MSI mod-10</option>
                    <option value="mod11">MSI mod-11</option>
                  </>
                )}
              </select>
              <p className="help">
                {settings.format === "code39"
                  ? "Mod-43 appends one character; many Code 39 readers verify it."
                  : "MSI shelf labels usually carry a mod-10 check digit."}
              </p>
            </div>
          ) : null}

          {NUMBER_SYSTEM_FORMATS.includes(settings.format) ? (
            <div className="qr-field">
              <label htmlFor="bc-numbersystem">UPC-E number system</label>
              <select
                id="bc-numbersystem"
                className="qr-input"
                value={settings.numberSystem}
                onChange={(event) =>
                  update("numberSystem", event.target.value === "1" ? 1 : 0)
                }
              >
                <option value="0">0 — standard retail</option>
                <option value="1">1 — reserved</option>
              </select>
              <p className="help">
                Only used when you enter 6 digits; 7 or 8 digits carry their
                own.
              </p>
            </div>
          ) : null}

          {GUARD_FORMATS.includes(settings.format) ? (
            <label className="checkbox qr-toggle">
              <input
                type="checkbox"
                checked={settings.guardBars}
                onChange={(event) => update("guardBars", event.target.checked)}
              />
              <span>
                Extend guard bars into the digit line
                <small>
                  The standard EAN/UPC look. Turning it off keeps the same
                  symbol, just without the longer guard bars.
                </small>
              </span>
            </label>
          ) : null}
        </div>
      ) : null}

      <details className="bc-rules">
        <summary>All rules for {meta.name}</summary>
        <ul>
          {meta.rules.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
          <li>Typical use: {meta.usedFor}</li>
          <li>
            {meta.scannable
              ? "QUICKKIT’s scanner can read this format back."
              : "Generation only — no open-source reader for this format is bundled, so the scanner cannot read it back."}
          </li>
        </ul>
      </details>

      <span className="sr-only">
        Formats available:{" "}
        {FORMAT_GROUPS.map(
          (group) =>
            `${group}: ${BARCODE_FORMATS.filter(
              (entry) => entry.group === group,
            )
              .map((entry) => entry.name)
              .join(", ")}`,
        ).join(". ")}
      </span>
    </section>
  );
}
