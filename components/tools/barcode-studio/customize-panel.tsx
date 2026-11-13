"use client";
/**
 * Customisation, folded into collapsible groups so a first-time visitor sees
 * the barcode and one button, while a packaging designer can reach every
 * control without leaving the page.
 */
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Palette,
  RotateCcw,
  Ruler,
  Type,
} from "lucide-react";
import { contrastRatio, hexToRgb } from "@/lib/tools/qr/colour";
import { FONT_CHOICES, FORMAT_PRESETS } from "@/lib/tools/barcode/settings";
import { formatMeta } from "@/lib/tools/barcode/formats";
import type { BarcodeTextAlign } from "@/lib/tools/barcode/layout";
import type { useBarcodeStudio } from "./use-barcode-studio";

type Studio = ReturnType<typeof useBarcodeStudio>;

function luminance(hex: string) {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const [r, g, b] = rgb.map((channel) => {
    const s = channel / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const ALIGNMENTS: { id: BarcodeTextAlign; label: string; icon: typeof AlignLeft }[] = [
  { id: "left", label: "Left", icon: AlignLeft },
  { id: "center", label: "Centre", icon: AlignCenter },
  { id: "right", label: "Right", icon: AlignRight },
];

export default function CustomizePanel({ studio }: { studio: Studio }) {
  const { settings, update, reset } = studio;
  const meta = formatMeta(settings.format);
  const minimumQuiet = meta.quietZone;
  const ratio = contrastRatio(settings.foreground, settings.background);
  const inverted = luminance(settings.foreground) > luminance(settings.background);

  return (
    <section className="qr-card" aria-labelledby="bc-customise-heading">
      <div className="qr-card-head">
        <div>
          <h3 id="bc-customise-heading">Customise the label</h3>
          <p>
            Bars are drawn from geometry, never stretched — the quiet zone and
            module width always stay proportional.
          </p>
        </div>
        <button type="button" className="qr-mini-button" onClick={reset}>
          <RotateCcw size={13} aria-hidden="true" /> Reset
        </button>
      </div>

      <details open>
        <summary>
          <Ruler size={14} aria-hidden="true" /> Size and scale
        </summary>
        <div className="bc-grid">
          <div className="qr-field">
            <label htmlFor="bc-module">
              Bar width — {settings.moduleWidth.toFixed(2)} px per module
            </label>
            <input
              id="bc-module"
              aria-describedby="bc-module-help"
              type="range"
              min={0.75}
              max={8}
              step={0.05}
              value={settings.moduleWidth}
              onChange={(event) => update("moduleWidth", Number(event.target.value))}
            />
            <p className="help" id="bc-module-help">
              One narrow bar. 2 px is a screen size; 3–6 px is comfortable for
              print at 300 dpi.
            </p>
          </div>
          <div className="qr-field">
            <label htmlFor="bc-height">Symbol height — {settings.barHeight} px</label>
            <input
              id="bc-height"
              aria-describedby="bc-height-help"
              type="range"
              min={24}
              max={320}
              step={2}
              value={settings.barHeight}
              onChange={(event) => update("barHeight", Number(event.target.value))}
            />
            <p className="help" id="bc-height-help">
              Height never affects decoding, but a taller symbol is easier to
              find with a handheld scanner.
            </p>
          </div>
          <div className="qr-field">
            <label htmlFor="bc-scale">Export scale — {settings.scale}×</label>
            <input
              id="bc-scale"
              aria-describedby="bc-scale-help"
              type="range"
              min={1}
              max={6}
              step={1}
              value={settings.scale}
              onChange={(event) => update("scale", Number(event.target.value))}
            />
            <p className="help" id="bc-scale-help">
              Multiplies PNG pixels only. SVG and PDF stay vector.
            </p>
          </div>
        </div>
      </details>

      <details>
        <summary>
          <Palette size={14} aria-hidden="true" /> Colours
        </summary>
        <div className="bc-grid">
          <div className="qr-field">
            <label htmlFor="bc-fg">Bar colour</label>
            <div className="bc-color-row">
              <input
                id="bc-fg"
                type="color"
                value={settings.foreground}
                onChange={(event) => update("foreground", event.target.value)}
                aria-label="Bar colour picker"
              />
              <input
                className="qr-input"
                value={settings.foreground}
                onChange={(event) => update("foreground", event.target.value)}
                aria-label="Bar colour hex value"
                spellCheck={false}
              />
            </div>
          </div>
          <div className="qr-field">
            <label htmlFor="bc-bg">Background colour</label>
            <div className="bc-color-row">
              <input
                id="bc-bg"
                type="color"
                value={settings.background}
                onChange={(event) => update("background", event.target.value)}
                aria-label="Background colour picker"
              />
              <input
                className="qr-input"
                value={settings.background}
                onChange={(event) => update("background", event.target.value)}
                aria-label="Background colour hex value"
                spellCheck={false}
              />
            </div>
          </div>
        </div>
        <label className="checkbox qr-toggle">
          <input
            type="checkbox"
            checked={settings.transparent}
            onChange={(event) => update("transparent", event.target.checked)}
          />
          <span>
            Transparent background
            <small>
              PNG and SVG keep the background clear. Scanners need a light field
              behind the bars, so test before printing on dark stock.
            </small>
          </span>
        </label>
        <p className={ratio >= 4.5 && !inverted ? "bc-contrast good" : "bc-contrast bad"}>
          Contrast {ratio.toFixed(1)}:1 —{" "}
          {inverted
            ? "light bars on a dark background: many scanners reject an inverted symbol."
            : ratio >= 4.5
              ? "comfortably above the 4.5:1 a scanner needs."
              : "below 4.5:1; darken the bars or lighten the background."}
        </p>
      </details>

      <details>
        <summary>
          <Type size={14} aria-hidden="true" /> Human-readable text
        </summary>
        <label className="checkbox qr-toggle">
          <input
            type="checkbox"
            checked={settings.showText}
            onChange={(event) => update("showText", event.target.checked)}
          />
          <span>
            Show the digits under the bars
            <small>
              Recommended: a scanner can still read the symbol, and a person can
              still key the number in.
            </small>
          </span>
        </label>
        <div className="bc-grid">
          <div className="qr-field">
            <label htmlFor="bc-font">Font</label>
            <select
              id="bc-font"
              className="qr-input"
              value={settings.fontFamily}
              onChange={(event) => update("fontFamily", event.target.value)}
            >
              {FONT_CHOICES.map((choice) => (
                <option key={choice.id} value={choice.stack}>
                  {choice.label}
                </option>
              ))}
            </select>
          </div>
          <div className="qr-field">
            <label htmlFor="bc-fontsize">Font size — {settings.fontSize} px</label>
            <input
              id="bc-fontsize"
              type="range"
              min={7}
              max={28}
              step={1}
              value={settings.fontSize}
              onChange={(event) => update("fontSize", Number(event.target.value))}
            />
          </div>
        </div>
        <div className="qr-field">
          <span className="field-label" id="bc-align-label">
            Text alignment
          </span>
          <div
            className="bc-seg"
            role="group"
            aria-labelledby="bc-align-label"
            aria-describedby="bc-align-help"
          >
            {ALIGNMENTS.map((entry) => {
              const Icon = entry.icon;
              const active = settings.textAlign === entry.id;
              return (
                <button
                  key={entry.id}
                  type="button"
                  className={active ? "qr-seg-tab active" : "qr-seg-tab"}
                  aria-pressed={active}
                  onClick={() => update("textAlign", entry.id)}
                >
                  <Icon size={14} aria-hidden="true" /> {entry.label}
                </button>
              );
            })}
          </div>
          <p className="help" id="bc-align-help">
            Aligns the title and description, and the digit line on formats that
            print one block of text.
          </p>
        </div>
      </details>

      <details>
        <summary>Label text and spacing</summary>
        <div className="bc-grid">
          <div className="qr-field">
            <label htmlFor="bc-title">Label title (optional)</label>
            <input
              id="bc-title"
              className="qr-input"
              value={settings.title}
              maxLength={80}
              placeholder="e.g. Order 2481"
              onChange={(event) => update("title", event.target.value)}
            />
          </div>
          <div className="qr-field">
            <label htmlFor="bc-description">Description (optional)</label>
            <input
              id="bc-description"
              className="qr-input"
              value={settings.description}
              maxLength={160}
              placeholder="e.g. Packed 12 Nov 2026"
              onChange={(event) => update("description", event.target.value)}
            />
          </div>
          <div className="qr-field">
            <label htmlFor="bc-quiet">
              Quiet zone — {Math.max(settings.quietZone, minimumQuiet)} modules
            </label>
            <input
              id="bc-quiet"
              aria-describedby="bc-quiet-help"
              type="range"
              min={0}
              max={30}
              step={1}
              value={settings.quietZone}
              onChange={(event) => update("quietZone", Number(event.target.value))}
            />
            <p className="help" id="bc-quiet-help">
              {meta.name} needs at least {minimumQuiet} modules of clear space on
              each side, so a smaller value is raised to {minimumQuiet}.
            </p>
          </div>
          <div className="qr-field">
            <label htmlFor="bc-margin">Outer margin — {settings.margin} px</label>
            <input
              id="bc-margin"
              aria-describedby="bc-margin-help"
              type="range"
              min={0}
              max={64}
              step={2}
              value={settings.margin}
              onChange={(event) => update("margin", Number(event.target.value))}
            />
            <p className="help" id="bc-margin-help">
              Padding around the whole label, on top of the quiet zone.
            </p>
          </div>
        </div>
      </details>

      <details>
        <summary>Format defaults</summary>
        <p className="help">
          {meta.name} starts at {FORMAT_PRESETS[settings.format].moduleWidth} px per
          module and a {FORMAT_PRESETS[settings.format].barHeight} px symbol.
          Switching format applies its preset again.
        </p>
        <p className="help">
          {meta.scannable
            ? "A decode check is available in the preview column."
            : "This format cannot be decoded by the bundled reader, so no scan check is offered — the encoder still follows the published symbology tables."}
        </p>
      </details>
    </section>
  );
}
