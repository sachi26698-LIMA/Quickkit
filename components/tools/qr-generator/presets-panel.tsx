"use client";
/**
 * PRESETS — design combinations kept in this browser. A preset stores colours,
 * shapes, margins, size and error correction only: never a logo image, never a
 * field value. Each card shows the real code its design would render.
 */
import { useState } from "react";
import { Bookmark, Lock, Save, Star, Trash } from "lucide-react";
import { QrSection } from "./shared";
import { QrThumb } from "./thumb";
import type { QrStudio } from "./use-qr-studio";

export default function PresetsPanel({ studio }: { studio: QrStudio }) {
  const { presets, savePreset, deletePreset, applyPreset, def } = studio;
  const [name, setName] = useState("");

  return (
    <QrSection
      id="qr-presets"
      title="Presets"
      hint="Saved looks for this device. Apply one to any content — the code itself is never stored here."
      icon={<Bookmark size={17} />}
      action={
        <span className="qr-badge">
          {presets.length} saved
          {presets.length >= 24 ? " (limit)" : ""}
        </span>
      }
    >
      <div className="qr-preset-save">
        <label htmlFor="qr-preset-name" className="qr-block-label">
          Save the design you have now
        </label>
        <div className="qr-preset-save-row">
          <input
            id="qr-preset-name"
            type="text"
            className="qr-input"
            value={name}
            maxLength={40}
            placeholder="Café menu purple, Invoice labels…"
            onChange={(event) => setName(event.target.value)}
          />
          <button
            type="button"
            className="primary"
            onClick={() => {
              savePreset(name || `${def.label} design`);
              setName("");
            }}
          >
            <Save size={15} /> Save design
          </button>
        </div>
        <p className="help">
          <Lock size={13} aria-hidden="true" /> Colours, shapes, margins, export
          size and error correction — that is all a preset keeps. No logo, no
          field text, no password.
        </p>
      </div>

      {presets.length ? (
        <ul className="qr-preset-grid">
          {presets.map((preset) => (
            <li key={preset.id}>
              <QrThumb
                design={preset.design}
                label={`Preview of the ${preset.name} design`}
              />
              <strong>{preset.name}</strong>
              <small>
                {preset.design.dotStyle} · {preset.design.eyeStyle} ·{" "}
                {preset.design.errorLevel} · {preset.design.size}px
              </small>
              <div>
                <button
                  type="button"
                  className="secondary qr-mini-button"
                  onClick={() => applyPreset(preset)}
                >
                  <Star size={13} /> Apply
                </button>
                <button
                  type="button"
                  className="qr-icon-button"
                  onClick={() => deletePreset(preset.id)}
                  aria-label={`Delete the ${preset.name} preset`}
                >
                  <Trash size={14} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="qr-tab-empty">
          <Star size={22} aria-hidden="true" />
          <strong>No presets yet</strong>
          <p>
            Style a code on the Create tab, then save it here — the next event,
            menu or label starts from the same colours and shapes instead of a
            blank form.
          </p>
        </div>
      )}
    </QrSection>
  );
}
