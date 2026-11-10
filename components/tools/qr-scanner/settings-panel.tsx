"use client";
/**
 * Advanced settings.
 *
 * Every control maps to behaviour that exists. Nothing here is a silent no-op:
 * the duplicates window, the auto-clear timer, the preprocessing presets and the
 * history privacy switch all change what the scanner actually does, and the copy
 * next to each one says what that change is.
 */
import { RotateCcw, Settings2 } from "lucide-react";
import {
  defaultSettings,
  type CameraResolution,
  type Preprocessing,
  type Sensitivity,
  type ScannerSettings,
} from "@/lib/tools/qr-scanner/settings";
import type { ScannerApi } from "./use-scanner";

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="scanner-toggle">
      <span className="scanner-toggle-text">
        <strong>{label}</strong>
        <small>{description}</small>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        role="switch"
        aria-checked={checked}
      />
    </label>
  );
}

function Select<T extends string>({
  label,
  description,
  value,
  options,
  onChange,
}: {
  label: string;
  description: string;
  value: T;
  options: { id: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <label className="scanner-setting-select">
      <span className="scanner-toggle-text">
        <strong>{label}</strong>
        <small>{description}</small>
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
      >
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function SettingsPanel({
  api,
  open,
  onToggle,
}: {
  api: ScannerApi;
  open: boolean;
  onToggle: () => void;
}) {
  const update = (patch: Partial<ScannerSettings>) => api.updateSettings(patch);

  return (
    <section className="scanner-settings">
      <button
        type="button"
        className="scanner-settings-head"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls="scanner-settings-body"
      >
        <Settings2 size={17} aria-hidden="true" />
        <span>
          <strong>Advanced settings</strong>
          <small>
            Behaviour, feedback, preprocessing and what history is allowed to
            keep.
          </small>
        </span>
        <span
          className={open ? "scanner-chev open" : "scanner-chev"}
          aria-hidden="true"
        >
          ▾
        </span>
      </button>

      {open && (
        <div className="scanner-settings-body" id="scanner-settings-body">
          <fieldset>
            <legend>Scanning</legend>
            <Toggle
              label="Continuous scanning"
              description="Keep reading new codes from the camera without pressing anything, instead of pausing after each result."
              checked={api.settings.continuous}
              onChange={(value) => update({ continuous: value })}
            />
            <Toggle
              label="Duplicate detection"
              description="Ignore the same payload when it is read again within a few seconds, so holding one code still does not fill the list. Scanning it again later still works."
              checked={api.settings.duplicateDetection}
              onChange={(value) => update({ duplicateDetection: value })}
            />
            <Select<Sensitivity>
              label="Scan sensitivity"
              description="Controls how long an identical code is treated as a duplicate — aggressive re-reads sooner."
              value={api.settings.sensitivity}
              options={[
                { id: "strict", label: "Strict — 6 s window" },
                { id: "balanced", label: "Balanced — 3 s window" },
                { id: "aggressive", label: "Aggressive — 1.2 s window" },
              ]}
              onChange={(value) => update({ sensitivity: value })}
            />
            <Select<Preprocessing>
              label="Image preprocessing"
              description="How hard the decoder works on a difficult image. Stronger passes take longer but rescue faint or blurry codes."
              value={api.settings.preprocessing}
              options={[
                { id: "off", label: "Off — single pass" },
                { id: "light", label: "Light — threshold + contrast" },
                {
                  id: "strong",
                  label: "Strong — adds sharpening and rotations",
                },
              ]}
              onChange={(value) => update({ preprocessing: value })}
            />
            <Select<CameraResolution>
              label="Camera resolution"
              description="Requested capture height. Higher frames are not read any more accurately, just slower."
              value={api.settings.cameraResolution}
              options={[
                { id: "auto", label: "Auto (1080p)" },
                { id: "720", label: "720p" },
                { id: "1080", label: "1080p" },
                { id: "1440", label: "1440p" },
              ]}
              onChange={(value) => update({ cameraResolution: value })}
            />
          </fieldset>

          <fieldset>
            <legend>Feedback</legend>
            <Toggle
              label="Open redirect popup on scan"
              description="Immediately open a popup with all decoded QR data and a clickable redirect link whenever a code is scanned."
              checked={api.settings.popupOnScan}
              onChange={(value) => update({ popupOnScan: value })}
            />
            <Toggle
              label="Sound"
              description="A short confirmation tone when a code is decoded. Uses the Web Audio API in this tab only."
              checked={api.settings.sound}
              onChange={(value) => update({ sound: value })}
            />
            <Toggle
              label="Vibration"
              description="A brief vibration on phones that support the Vibration API."
              checked={api.settings.vibration}
              onChange={(value) => update({ vibration: value })}
            />
            <Toggle
              label="Auto-copy decoded content"
              description="Copy the decoded payload to the clipboard as soon as it is read."
              checked={api.settings.autoCopy}
              onChange={(value) => update({ autoCopy: value })}
            />
            <label className="scanner-toggle">
              <span className="scanner-toggle-text">
                <strong>Auto-clear results</strong>
                <small>
                  Remove the results list after a delay. Off means results stay
                  until you clear them.
                </small>
              </span>
              <select
                value={api.settings.autoClearSeconds}
                onChange={(event) =>
                  update({ autoClearSeconds: Number(event.target.value) })
                }
                aria-label="Auto-clear results after"
              >
                <option value={0}>Never</option>
                <option value={15}>15 seconds</option>
                <option value={30}>30 seconds</option>
                <option value={60}>1 minute</option>
                <option value={120}>2 minutes</option>
              </select>
            </label>
          </fieldset>

          <fieldset>
            <legend>History &amp; privacy</legend>
            <Toggle
              label="Save scan history"
              description="Keep recent scans in this browser only. Turning it off deletes everything already stored."
              checked={api.settings.history}
              onChange={(value) => update({ history: value })}
            />
            <Toggle
              label="Store sensitive payloads"
              description="Off by default: Wi-Fi passwords and similar secrets are stored as a redacted line. Turning this on writes them to local storage in plain text."
              checked={api.settings.storeSensitive}
              onChange={(value) => update({ storeSensitive: value })}
            />
            <p className="scanner-settings-note">
              History never stores image files, only file names. There is no
              server copy of anything, so clearing the list here clears it
              everywhere.
            </p>
          </fieldset>

          <fieldset>
            <legend>Export</legend>
            <Toggle
              label="Include timestamps"
              description="Add the scan time to CSV, JSON and TXT exports."
              checked={api.settings.exportTimestamps}
              onChange={(value) => update({ exportTimestamps: value })}
            />
            <Toggle
              label="Include content types"
              description="Add the recognised content type to each exported row."
              checked={api.settings.exportTypes}
              onChange={(value) => update({ exportTypes: value })}
            />
            <Toggle
              label="Include file names"
              description="Add the source image name to each exported row."
              checked={api.settings.exportFilenames}
              onChange={(value) => update({ exportFilenames: value })}
            />
            <Toggle
              label="Include scan status"
              description="Add the decode status and the number of codes found."
              checked={api.settings.exportStatus}
              onChange={(value) => update({ exportStatus: value })}
            />
          </fieldset>

          <div className="scanner-settings-footer">
            <button
              type="button"
              className="secondary"
              onClick={() => {
                api.updateSettings(defaultSettings);
                api.setFlash({
                  kind: "info",
                  text: "All scanner settings were reset to their defaults.",
                });
              }}
            >
              <RotateCcw size={15} /> Reset settings
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
