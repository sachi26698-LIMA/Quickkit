"use client";
import { useId, useState } from "react";
import {
  Activity,
  ChevronDown,
  Globe2,
  Languages,
  LayoutTemplate,
  ScanText,
  Settings2,
  Sparkles,
  Table2,
} from "lucide-react";
import {
  EXTRACTION_MODES,
  OCR_LANGUAGES,
  type AccuracyPreference,
  type ExtractionMode,
  type OcrLanguageCode,
  type OcrSettings,
  type SegmentationMode,
} from "@/lib/tools/image-to-text/types";
import {
  describeDetection,
  detectionQuality,
} from "@/lib/tools/image-to-text/language";

const MODE_ICONS: Record<ExtractionMode, typeof ScanText> = {
  plain: ScanText,
  layout: LayoutTemplate,
  formatted: Sparkles,
  table: Table2,
  structured: Globe2,
  smart: Sparkles,
};

const ACCURACY: { id: AccuracyPreference; label: string; hint: string }[] = [
  { id: "accuracy", label: "Accuracy", hint: "Bigger images, no shortcuts" },
  { id: "balanced", label: "Balanced", hint: "Default quality and speed" },
  { id: "speed", label: "Speed", hint: "Smaller images, faster reads" },
];

const SEGMENTATION: { id: SegmentationMode; label: string; hint: string }[] = [
  { id: "auto", label: "Automatic", hint: "Full page, any layout" },
  { id: "single-column", label: "Single column", hint: "Book page, article" },
  { id: "single-block", label: "Text block", hint: "One paragraph or label" },
  {
    id: "single-line",
    label: "Single line",
    hint: "A heading or a receipt line",
  },
  { id: "sparse", label: "Sparse text", hint: "Forms, signs, scattered text" },
];

export default function SettingsPanel({
  settings,
  onChange,
  disabled,
  detected,
}: {
  settings: OcrSettings;
  onChange: (patch: Partial<OcrSettings>) => void;
  disabled: boolean;
  detected: Array<{ code: OcrLanguageCode; confidence: number }>;
}) {
  const [openAdvanced, setOpenAdvanced] = useState(true);
  const languageHintId = useId();
  const enhancement = settings.enhancement;

  const toggleLanguage = (code: OcrLanguageCode) => {
    const has = settings.languages.includes(code);
    const next = has
      ? settings.languages.filter((language) => language !== code)
      : [...settings.languages, code];
    // At least one language must stay selected, otherwise the engine has
    // nothing to recognise with; block the deselect and keep the UI honest.
    if (!next.length) return;
    onChange({ languages: next });
  };

  return (
    <div className="i2t-settings">
      <fieldset disabled={disabled}>
        <legend className="sr-only">OCR settings</legend>

        <section className="i2t-card" aria-labelledby="i2t-lang-title">
          <div className="i2t-card-head">
            <h3 id="i2t-lang-title">
              <Languages size={16} aria-hidden="true" /> Languages
            </h3>
            <span className="i2t-badge">
              {settings.languages.length} selected
            </span>
          </div>
          <p className="i2t-help" id={languageHintId}>
            Pick every language that appears on the page. Multi-language reading
            is slower because more models are loaded, and all of them run on
            this device.
          </p>
          <div
            className="i2t-lang-grid"
            role="group"
            aria-describedby={languageHintId}
          >
            {OCR_LANGUAGES.map((language) => {
              const active = settings.languages.includes(language.code);
              return (
                <button
                  key={language.code}
                  type="button"
                  className={`i2t-lang${active ? " is-active" : ""}`}
                  aria-pressed={active}
                  onClick={() => toggleLanguage(language.code)}
                  title={language.note}
                >
                  <span className="i2t-lang-native" lang={language.tag}>
                    {language.native}
                  </span>
                  <span className="i2t-lang-name">
                    {language.name} · {language.quality}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="i2t-detect">
            <span className="i2t-detect-label">
              <Activity size={13} aria-hidden="true" /> Automatic detection
            </span>
            {detected.length === 0 ? (
              <p className="i2t-help">
                Run OCR once and the script found on the page will be offered
                here — nothing is guessed before there is text to look at.
              </p>
            ) : (
              <div className="i2t-detect-row">
                <p className="i2t-help">{describeDetection(detected)}</p>
                <button
                  type="button"
                  className="i2t-mini"
                  onClick={() =>
                    onChange({
                      languages: detected.map((entry) => entry.code),
                    })
                  }
                >
                  Use detected
                </button>
              </div>
            )}
          </div>
        </section>

        <section className="i2t-card" aria-labelledby="i2t-mode-title">
          <div className="i2t-card-head">
            <h3 id="i2t-mode-title">
              <ScanText size={16} aria-hidden="true" /> Extraction mode
            </h3>
          </div>
          <div
            className="i2t-modes"
            role="radiogroup"
            aria-labelledby="i2t-mode-title"
          >
            {EXTRACTION_MODES.map((mode) => {
              const Icon = MODE_ICONS[mode.id];
              return (
                <label
                  key={mode.id}
                  className={`i2t-mode${settings.mode === mode.id ? " is-active" : ""}`}
                  title={mode.description}
                >
                  <input
                    type="radio"
                    name="i2t-mode"
                    value={mode.id}
                    checked={settings.mode === mode.id}
                    onChange={() => onChange({ mode: mode.id })}
                  />
                  <Icon size={16} aria-hidden="true" />
                  <span>
                    <strong>{mode.label}</strong>
                    <small>{mode.hint}</small>
                  </span>
                </label>
              );
            })}
          </div>
          <p className="i2t-help">
            {
              EXTRACTION_MODES.find((mode) => mode.id === settings.mode)
                ?.description
            }
          </p>
        </section>

        <section className="i2t-card" aria-labelledby="i2t-quality-title">
          <div className="i2t-card-head">
            <h3 id="i2t-quality-title">
              <Settings2 size={16} aria-hidden="true" /> Accuracy and layout
            </h3>
          </div>
          <div className="i2t-field">
            <span className="i2t-label">Accuracy / speed</span>
            <div
              className="i2t-segmented"
              role="radiogroup"
              aria-label="Accuracy preference"
            >
              {ACCURACY.map((option) => (
                <label
                  key={option.id}
                  className={settings.accuracy === option.id ? "is-active" : ""}
                  title={option.hint}
                >
                  <input
                    type="radio"
                    name="i2t-accuracy"
                    checked={settings.accuracy === option.id}
                    onChange={() => onChange({ accuracy: option.id })}
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </div>

          <div className="i2t-field">
            <label className="i2t-label" htmlFor="i2t-segmentation">
              Page layout
            </label>
            <select
              id="i2t-segmentation"
              value={settings.segmentation}
              onChange={(event) =>
                onChange({
                  segmentation: event.target.value as SegmentationMode,
                })
              }
            >
              {SEGMENTATION.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label} — {option.hint}
                </option>
              ))}
            </select>
          </div>

          <div className="i2t-field">
            <label className="i2t-label" htmlFor="i2t-threshold">
              Confidence threshold{" "}
              <strong aria-hidden="true">
                {settings.confidenceThreshold}%
              </strong>
            </label>
            <input
              id="i2t-threshold"
              type="range"
              min={0}
              max={95}
              step={5}
              value={settings.confidenceThreshold}
              onChange={(event) =>
                onChange({ confidenceThreshold: Number(event.target.value) })
              }
              aria-valuetext={`${settings.confidenceThreshold} percent`}
            />
            <p className="i2t-help">
              Words below this score are highlighted in the editor so you know
              exactly what to proofread.
            </p>
          </div>

          <div className="i2t-checks">
            <label>
              <input
                type="checkbox"
                checked={settings.autoRotate}
                onChange={(event) =>
                  onChange({ autoRotate: event.target.checked })
                }
              />
              Auto-correct rotation and orientation
            </label>
            <label>
              <input
                type="checkbox"
                checked={settings.joinHyphenated}
                onChange={(event) =>
                  onChange({ joinHyphenated: event.target.checked })
                }
              />
              Re-join words split across lines
            </label>
            <label>
              <input
                type="checkbox"
                checked={settings.keepParagraphBreaks}
                onChange={(event) =>
                  onChange({ keepParagraphBreaks: event.target.checked })
                }
              />
              Keep paragraph breaks
            </label>
          </div>
        </section>

        <section className="i2t-card" aria-labelledby="i2t-advanced-title">
          <button
            type="button"
            className="i2t-card-head as-button"
            aria-expanded={openAdvanced}
            aria-controls="i2t-advanced-body"
            onClick={() => setOpenAdvanced((open) => !open)}
          >
            <h3 id="i2t-advanced-title">
              <Settings2 size={16} aria-hidden="true" /> Image enhancement
            </h3>
            <ChevronDown
              size={16}
              aria-hidden="true"
              className={openAdvanced ? "flip" : ""}
            />
          </button>
          {openAdvanced && (
            <div id="i2t-advanced-body" className="i2t-advanced-body">
              <div className="i2t-field">
                <label className="i2t-label" htmlFor="i2t-contrast">
                  Contrast <strong>{enhancement.contrast.toFixed(2)}×</strong>
                </label>
                <input
                  id="i2t-contrast"
                  type="range"
                  min={0.5}
                  max={2}
                  step={0.05}
                  value={enhancement.contrast}
                  onChange={(event) =>
                    onChange({
                      enhancement: {
                        ...enhancement,
                        contrast: Number(event.target.value),
                      },
                    })
                  }
                />
              </div>
              <div className="i2t-field">
                <label className="i2t-label" htmlFor="i2t-brightness">
                  Brightness{" "}
                  <strong>{enhancement.brightness.toFixed(2)}×</strong>
                </label>
                <input
                  id="i2t-brightness"
                  type="range"
                  min={0.5}
                  max={1.5}
                  step={0.05}
                  value={enhancement.brightness}
                  onChange={(event) =>
                    onChange({
                      enhancement: {
                        ...enhancement,
                        brightness: Number(event.target.value),
                      },
                    })
                  }
                />
              </div>
              <div className="i2t-checks">
                <label>
                  <input
                    type="checkbox"
                    checked={enhancement.grayscale}
                    onChange={(event) =>
                      onChange({
                        enhancement: {
                          ...enhancement,
                          grayscale: event.target.checked,
                        },
                      })
                    }
                  />
                  Grayscale (helps coloured scans)
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={enhancement.binarize}
                    onChange={(event) =>
                      onChange({
                        enhancement: {
                          ...enhancement,
                          binarize: event.target.checked,
                        },
                      })
                    }
                  />
                  Black &amp; white threshold (faded prints)
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={enhancement.denoise}
                    onChange={(event) =>
                      onChange({
                        enhancement: {
                          ...enhancement,
                          denoise: event.target.checked,
                        },
                      })
                    }
                  />
                  Remove speckle noise
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={enhancement.deskew}
                    onChange={(event) =>
                      onChange({
                        enhancement: {
                          ...enhancement,
                          deskew: event.target.checked,
                        },
                      })
                    }
                  />
                  Detect and fix skew
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={enhancement.supersample}
                    onChange={(event) =>
                      onChange({
                        enhancement: {
                          ...enhancement,
                          supersample: event.target.checked,
                        },
                      })
                    }
                  />
                  Upscale for small text (slower)
                </label>
              </div>
              <div className="i2t-field">
                <label className="i2t-label" htmlFor="i2t-pages">
                  PDF page range
                </label>
                <input
                  id="i2t-pages"
                  type="text"
                  inputMode="numeric"
                  placeholder="All pages — e.g. 1-3, 5"
                  value={settings.pageRange}
                  onChange={(event) =>
                    onChange({ pageRange: event.target.value })
                  }
                />
              </div>
              <div className="i2t-field">
                <label className="i2t-label" htmlFor="i2t-concurrency">
                  Batch concurrency
                </label>
                <select
                  id="i2t-concurrency"
                  value={settings.concurrency}
                  onChange={(event) =>
                    onChange({
                      concurrency: Number(event.target.value) as 1 | 2 | 3,
                    })
                  }
                >
                  <option value={1}>1 page at a time — lowest memory</option>
                  <option value={2}>2 pages at a time</option>
                  <option value={3}>3 pages at a time — fastest</option>
                </select>
              </div>
            </div>
          )}
        </section>

        {detected.length > 0 && (
          <p className="i2t-help i2t-detect-foot">
            Detection quality: {detectionQuality(detected[0].confidence)}.{" "}
            {detected[0].confidence < 0.7
              ? "Confirm the language above before relying on the result."
              : "You can still read a page in a language the detection missed."}
          </p>
        )}
      </fieldset>
    </div>
  );
}
