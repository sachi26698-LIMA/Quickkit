"use client";
/**
 * PRESETS — design combinations kept in this browser. A preset stores colours,
 * shapes, margins, size and error correction only: never a logo image, never a
 * field value. Each card shows the real code its design would render. Presets
 * can be renamed, duplicated, and exported/imported as a validated JSON config
 * that merges with — never clears — what is already saved.
 */
import { useRef, useState } from "react";
import {
  Bookmark,
  Check,
  Copy,
  Download,
  Lock,
  Pencil,
  Save,
  Star,
  Trash,
  Upload,
  X,
} from "lucide-react";
import { QrSection } from "./shared";
import { QrThumb } from "./thumb";
import type { QrStudio } from "./use-qr-studio";

export default function PresetsPanel({ studio }: { studio: QrStudio }) {
  const {
    presets,
    savePreset,
    deletePreset,
    applyPreset,
    renamePreset,
    duplicatePreset,
    exportConfigFile,
    importConfigFile,
    def,
  } = studio;
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const fileRef = useRef<HTMLInputElement | null>(null);

  const startRename = (id: string, current: string) => {
    setEditingId(id);
    setEditName(current);
  };
  const commitRename = () => {
    if (editingId) renamePreset(editingId, editName);
    setEditingId(null);
    setEditName("");
  };

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

      <div className="qr-config-bar">
        <button
          type="button"
          className="secondary qr-mini-button"
          onClick={exportConfigFile}
          title="Download presets and history as a JSON file"
        >
          <Download size={14} /> Export config
        </button>
        <button
          type="button"
          className="secondary qr-mini-button"
          onClick={() => fileRef.current?.click()}
          title="Merge a config file into your saved presets and history"
        >
          <Upload size={14} /> Import config
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          className="sr-only"
          aria-label="Import a QUICKKIT QR config file"
          onChange={(event) => {
            void importConfigFile(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
        <span className="qr-config-note">
          Import merges and validates — your existing data is kept.
        </span>
      </div>

      {presets.length ? (
        <ul className="qr-preset-grid">
          {presets.map((preset) => (
            <li key={preset.id}>
              <QrThumb
                design={preset.design}
                label={`Preview of the ${preset.name} design`}
              />
              {editingId === preset.id ? (
                <div className="qr-rename-row">
                  <input
                    type="text"
                    className="qr-input"
                    value={editName}
                    maxLength={40}
                    aria-label={`Rename the ${preset.name} preset`}
                    onChange={(event) => setEditName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") commitRename();
                      if (event.key === "Escape") setEditingId(null);
                    }}
                  />
                  <button
                    type="button"
                    className="qr-icon-button"
                    onClick={commitRename}
                    aria-label="Save the new name"
                  >
                    <Check size={14} />
                  </button>
                  <button
                    type="button"
                    className="qr-icon-button"
                    onClick={() => setEditingId(null)}
                    aria-label="Cancel renaming"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <strong>{preset.name}</strong>
              )}
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
                  onClick={() => startRename(preset.id, preset.name)}
                  aria-label={`Rename the ${preset.name} preset`}
                >
                  <Pencil size={14} />
                </button>
                <button
                  type="button"
                  className="qr-icon-button"
                  onClick={() => duplicatePreset(preset.id)}
                  aria-label={`Duplicate the ${preset.name} preset`}
                >
                  <Copy size={14} />
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
