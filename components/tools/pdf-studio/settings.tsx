"use client";
import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import type { ConvertSettings } from "@/lib/tools/image-convert";
import {
  PAGE_NUMBER_FORMATS,
  PAGE_NUMBER_POSITIONS,
  PDF_STUDIO_ACTIONS,
  type PageNumberPosition,
  type PdfStudioAction,
} from "@/lib/tools/pdf-studio";
import { PDF_COMPRESSION_PRESETS } from "@/lib/tools/pdf/compress-pdf-logic";

type Props = {
  settings: ConvertSettings;
  onChange: (next: ConvertSettings) => void;
  disabled?: boolean;
  /** One line describing what the current plan will write. */
  studioSummary?: string | null;
  /** Why the plan cannot run yet, when it cannot. */
  studioProblem?: string | null;
};

function Field({
  label,
  hint,
  children,
  wide,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={`converter-field${wide ? " converter-field-wide" : ""}`}>
      <span className="field-label">{label}</span>
      {children}
      {hint ? <p className="converter-hint">{hint}</p> : null}
    </div>
  );
}

/**
 * Settings for PDF Studio: merge, extract, split or compress the pages of the
 * queued PDFs. Extracted from the combined converter panel with the other three
 * modes' blocks removed, so this page can never advertise a control that does
 * nothing.
 */
export default function PdfStudioSettings({
  settings,
  onChange,
  disabled,
  studioSummary,
  studioProblem,
}: Props) {
  const studio = settings.studio;

  const updateStudio = (patch: Partial<ConvertSettings["studio"]>) =>
    onChange({ ...settings, studio: { ...studio, ...patch } });

  const needsRanges = studio.action === "extract" || studio.action === "split";

  return (
    <>
      <details className="converter-block" open>
        <summary>
          <h3 id="settings-studio">PDF Studio</h3>
          <ChevronDown
            size={14}
            aria-hidden="true"
            className="converter-block-chevron"
          />
        </summary>
        <div className="settings-grid converter-grid">
          <Field
            label="What to write"
            hint={
              PDF_STUDIO_ACTIONS.find((action) => action.id === studio.action)
                ?.note
            }
            wide
          >
            <select
              aria-label="PDF studio action"
              value={studio.action}
              disabled={disabled}
              onChange={(event) =>
                updateStudio({
                  action: event.target.value as PdfStudioAction,
                })
              }
            >
              {PDF_STUDIO_ACTIONS.map((action) => (
                <option key={action.id} value={action.id}>
                  {action.label}
                </option>
              ))}
            </select>
          </Field>
          {needsRanges ? (
            <Field
              label="Page ranges"
              hint="For example 1-3, 7. Ranges apply to each file, so 1-2 across two PDFs means pages 1–2 of each."
            >
              <input
                type="text"
                aria-label="Page ranges"
                value={studio.ranges}
                disabled={disabled}
                placeholder="1-3, 7"
                onChange={(event) =>
                  updateStudio({ ranges: event.target.value })
                }
              />
            </Field>
          ) : null}
          {studio.action === "compress" ? (
            <Field
              label="Compression quality"
              hint="Image streams are recompressed at this setting; text stays crisp."
            >
              <select
                aria-label="PDF compression quality"
                value={studio.compressPresetId}
                disabled={disabled}
                onChange={(event) =>
                  updateStudio({ compressPresetId: event.target.value })
                }
              >
                {PDF_COMPRESSION_PRESETS.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}
          <Field
            label="Document title"
            hint="Written into the PDF metadata. Optional."
          >
            <input
              type="text"
              aria-label="PDF document title"
              value={studio.title}
              disabled={disabled}
              placeholder="Quarterly report"
              onChange={(event) => updateStudio({ title: event.target.value })}
            />
          </Field>
          <Field label="Author" hint="Written into the PDF metadata. Optional.">
            <input
              type="text"
              aria-label="PDF author"
              value={studio.author}
              disabled={disabled}
              placeholder="e.g. Finance team"
              onChange={(event) => updateStudio({ author: event.target.value })}
            />
          </Field>
          <Field
            label="Subject"
            hint="A short description, written into the PDF metadata. Optional."
          >
            <input
              type="text"
              aria-label="PDF subject"
              value={studio.subject}
              disabled={disabled}
              placeholder="e.g. Q3 results"
              onChange={(event) =>
                updateStudio({ subject: event.target.value })
              }
            />
          </Field>
          <Field
            label="Keywords"
            hint="Comma separated. Duplicates are dropped. Optional."
          >
            <input
              type="text"
              aria-label="PDF keywords"
              value={studio.keywords}
              disabled={disabled}
              placeholder="e.g. finance, q3, report"
              spellCheck={false}
              onChange={(event) =>
                updateStudio({ keywords: event.target.value })
              }
            />
          </Field>
          <Field
            label="Watermark"
            hint="Diagonal text drawn across every written page. Blank draws nothing."
          >
            <input
              type="text"
              aria-label="Watermark text"
              value={studio.watermarkText}
              disabled={disabled}
              placeholder="e.g. CONFIDENTIAL"
              onChange={(event) =>
                updateStudio({ watermarkText: event.target.value })
              }
            />
            {studio.watermarkText.trim() ? (
              <span className="converter-presets">
                <label className="converter-presets">
                  Opacity
                  <input
                    type="number"
                    aria-label="Watermark opacity percent"
                    min={1}
                    max={100}
                    step={1}
                    value={studio.watermarkOpacity}
                    disabled={disabled}
                    onChange={(event) =>
                      updateStudio({
                        watermarkOpacity: Math.min(
                          100,
                          Math.max(1, Number(event.target.value) || 18),
                        ),
                      })
                    }
                  />
                </label>
                <label className="converter-presets">
                  Size
                  <input
                    type="number"
                    aria-label="Watermark text size in points"
                    min={8}
                    max={200}
                    step={2}
                    value={studio.watermarkSize}
                    disabled={disabled}
                    onChange={(event) =>
                      updateStudio({
                        watermarkSize: Math.min(
                          200,
                          Math.max(8, Number(event.target.value) || 48),
                        ),
                      })
                    }
                  />
                </label>
                <label className="converter-presets">
                  Angle
                  <input
                    type="number"
                    aria-label="Watermark angle in degrees"
                    min={-90}
                    max={90}
                    step={5}
                    value={studio.watermarkAngle}
                    disabled={disabled}
                    onChange={(event) =>
                      updateStudio({
                        watermarkAngle: Math.min(
                          90,
                          Math.max(-90, Number(event.target.value) || 0),
                        ),
                      })
                    }
                  />
                </label>
              </span>
            ) : null}
          </Field>
          <Field
            label="Page numbers"
            hint="Stamped onto every written page after the pages are ordered, so numbering is always sequential in the output."
          >
            <label className="converter-check">
              <input
                type="checkbox"
                aria-label="Add page numbers"
                checked={studio.pageNumbers}
                disabled={disabled}
                onChange={(event) =>
                  updateStudio({ pageNumbers: event.target.checked })
                }
              />
              Add page numbers
            </label>
            {studio.pageNumbers ? (
              <span className="converter-presets">
                <select
                  aria-label="Page number format"
                  value={studio.pageNumberFormat}
                  disabled={disabled}
                  onChange={(event) =>
                    updateStudio({ pageNumberFormat: event.target.value })
                  }
                >
                  {PAGE_NUMBER_FORMATS.map((format) => (
                    <option key={format.id} value={format.id}>
                      {format.label}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Page number position"
                  value={studio.pageNumberPosition}
                  disabled={disabled}
                  onChange={(event) =>
                    updateStudio({
                      pageNumberPosition: event.target
                        .value as PageNumberPosition,
                    })
                  }
                >
                  {PAGE_NUMBER_POSITIONS.map((position) => (
                    <option key={position.id} value={position.id}>
                      {position.label}
                    </option>
                  ))}
                </select>
                <label className="converter-presets">
                  Size
                  <input
                    type="number"
                    aria-label="Page number text size in points"
                    min={6}
                    max={36}
                    step={1}
                    value={studio.pageNumberSize}
                    disabled={disabled}
                    onChange={(event) =>
                      updateStudio({
                        pageNumberSize: Math.min(
                          36,
                          Math.max(6, Number(event.target.value) || 10),
                        ),
                      })
                    }
                  />
                </label>
              </span>
            ) : null}
          </Field>
          <Field
            label="File name"
            hint="Saved as .pdf. Split parts get their range appended."
          >
            <input
              type="text"
              aria-label="PDF studio file name"
              value={studio.filename}
              disabled={disabled}
              placeholder="quickkit-pages.pdf"
              onChange={(event) =>
                updateStudio({ filename: event.target.value })
              }
            />
          </Field>
        </div>
        {studioSummary ? (
          <p className="converter-hint" data-testid="converter-studio-summary">
            {studioSummary}
          </p>
        ) : null}
        {studioProblem ? (
          <p
            className="converter-estimate warning"
            role="alert"
            data-testid="converter-studio-problem"
          >
            {studioProblem}
          </p>
        ) : null}
      </details>
    </>
  );
}
