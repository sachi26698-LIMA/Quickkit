"use client";
import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import {
  CONVERT_LIMITS,
  PAGE_RENDER_DPI,
  clampDpi,
  estimatePdfImageBytes,
  formatById,
  parsePageRange,
  type ConvertSettings,
} from "@/lib/tools/image-convert";
import { formatBytes } from "@/lib/tools/download";
import type { CanvasSupport } from "@/lib/tools/image-convert-runner";

type Props = {
  settings: ConvertSettings;
  onChange: (next: ConvertSettings) => void;
  /** Encoder probe result; null until the browser has answered. */
  support: CanvasSupport | null;
  disabled?: boolean;
  /** Real page count of the queued PDF, so the range hint can be honest. */
  pageCount?: number;
  /** First page size in points, so output size can be estimated up front. */
  pageWidthPt?: number;
  pageHeightPt?: number;
};

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="converter-field">
      <span className="field-label">{label}</span>
      {children}
      {hint ? <p className="converter-hint">{hint}</p> : null}
    </div>
  );
}

/**
 * Settings for one job: a PDF in, rendered page images out. Extracted from the
 * combined converter panel with the other three modes' blocks removed.
 */
export default function PdfToImageSettings({
  settings,
  onChange,
  support,
  disabled,
  pageCount,
  pageWidthPt,
  pageHeightPt,
}: Props) {
  const pdfRender = settings.pdfRender;

  const updatePdfRender = (patch: Partial<ConvertSettings["pdfRender"]>) =>
    onChange({ ...settings, pdfRender: { ...pdfRender, ...patch } });

  /** Resolve the range against the real page count so errors surface early. */
  const rangeCheck = (() => {
    if (!pageCount) return null;
    try {
      const pages = parsePageRange(pdfRender.range, pageCount);
      return pages.length === pageCount
        ? `All ${pageCount} pages`
        : `${pages.length} of ${pageCount} pages selected`;
    } catch (error) {
      return error instanceof Error ? error.message : "Invalid page range.";
    }
  })();

  /**
   * Estimated encoded size of the pages that will actually be rendered.
   *
   * Labelled as an estimate everywhere it appears: a bytes-per-pixel model
   * cannot see page content, so the spread is shown rather than a single
   * number that would read as a promise.
   */
  const outputEstimate = (() => {
    if (!pageCount || !pageWidthPt || !pageHeightPt) return null;
    let selected = pageCount;
    try {
      selected = parsePageRange(pdfRender.range, pageCount).length;
    } catch {
      // An invalid range already surfaces its own error; do not estimate on
      // top of it.
      return null;
    }
    if (!selected) return null;
    return estimatePdfImageBytes({
      widthPt: pageWidthPt,
      heightPt: pageHeightPt,
      dpi: pdfRender.dpi,
      format: pdfRender.format,
      quality: pdfRender.quality,
      pageCount: selected,
    });
  })();

  const rangeIsInvalid = Boolean(
    pageCount &&
    rangeCheck &&
    !rangeCheck.includes("pages selected") &&
    !rangeCheck.startsWith("All"),
  );

  return (
    <div className="converter-settings" aria-label="PDF to image settings">
      <details className="converter-block" open>
        <summary>
          <h3 id="settings-render">Page rendering</h3>
          <ChevronDown
            size={14}
            aria-hidden="true"
            className="converter-block-chevron"
          />
        </summary>
        <div className="settings-grid converter-grid">
          <Field
            label="Image format"
            hint={
              pdfRender.format === "jpeg"
                ? "Smallest pages, no transparency."
                : "Lossless page rendering."
            }
          >
            <select
              aria-label="Page image format"
              value={pdfRender.format}
              disabled={disabled}
              onChange={(event) =>
                updatePdfRender({
                  format: event.target.value as "jpeg" | "png" | "webp",
                })
              }
            >
              <option value="jpeg">JPG</option>
              <option value="png">PNG</option>
              <option value="webp" disabled={support ? !support.webp : false}>
                WEBP
                {support && !support.webp
                  ? " — not supported in this browser"
                  : ""}
              </option>
            </select>
          </Field>
          <Field
            label={`Quality${pdfRender.format === "png" ? " (not used)" : ""}`}
            hint={
              pdfRender.format === "png"
                ? "PNG is lossless, so quality does not apply."
                : "Lower numbers shrink pages; higher numbers keep detail."
            }
          >
            <div className="range-row">
              <input
                type="range"
                min={CONVERT_LIMITS.minQuality}
                max={CONVERT_LIMITS.maxQuality}
                step={1}
                value={pdfRender.quality}
                disabled={disabled || pdfRender.format === "png"}
                aria-label="Page image quality"
                onChange={(event) =>
                  updatePdfRender({ quality: Number(event.target.value) })
                }
              />
              <output>
                {pdfRender.format === "png" ? "—" : `${pdfRender.quality}%`}
              </output>
            </div>
          </Field>
          <Field
            label="Resolution"
            hint={`${clampDpi(pdfRender.dpi)} DPI — higher values produce larger, sharper pages.`}
          >
            <div className="range-row">
              <input
                type="range"
                min={CONVERT_LIMITS.minDpi}
                max={CONVERT_LIMITS.maxDpi}
                step={2}
                value={clampDpi(pdfRender.dpi)}
                disabled={disabled}
                aria-label="Output resolution in DPI"
                onChange={(event) =>
                  updatePdfRender({ dpi: Number(event.target.value) })
                }
              />
              <output>{clampDpi(pdfRender.dpi)} DPI</output>
            </div>
            {outputEstimate ? (
              <p
                className="converter-estimate"
                data-testid="converter-output-estimate"
              >
                {`Each page renders at about ${outputEstimate.pixelsWide.toLocaleString(
                  "en-US",
                )} × ${outputEstimate.pixelsHigh.toLocaleString(
                  "en-US",
                )} px. Estimated total ${formatBytes(
                  outputEstimate.low,
                )}–${formatBytes(outputEstimate.high)} — an estimate, since real
                size depends on page content.`}
              </p>
            ) : null}
            <div
              className="converter-presets"
              role="group"
              aria-label="DPI presets"
            >
              {PAGE_RENDER_DPI.map((dpi) => (
                <button
                  key={dpi}
                  type="button"
                  className={
                    clampDpi(pdfRender.dpi) === dpi ? "chip active" : "chip"
                  }
                  disabled={disabled}
                  onClick={() => updatePdfRender({ dpi })}
                >
                  {dpi}
                </button>
              ))}
            </div>
          </Field>
          <Field
            label="Pages to export"
            hint={
              rangeCheck ??
              "Leave blank for every page. Ranges such as 1-3, 5 are supported."
            }
          >
            <input
              type="text"
              value={pdfRender.range}
              disabled={disabled}
              placeholder="All pages — e.g. 1-3, 5"
              aria-label="Pages to export"
              aria-invalid={rangeIsInvalid}
              onChange={(event) =>
                updatePdfRender({ range: event.target.value })
              }
            />
          </Field>
          <Field
            label="Page background"
            hint="Flattened behind page content before encoding."
          >
            <div className="converter-colour">
              <input
                type="color"
                value={pdfRender.background}
                disabled={disabled}
                aria-label="Page background colour"
                onChange={(event) =>
                  updatePdfRender({ background: event.target.value })
                }
              />
              <input
                type="text"
                aria-label="Page background hex value"
                value={pdfRender.background}
                disabled={disabled}
                maxLength={7}
                onChange={(event) => {
                  const value = event.target.value.trim();
                  if (/^#?[0-9a-f]{0,6}$/i.test(value))
                    updatePdfRender({
                      background: value.startsWith("#") ? value : `#${value}`,
                    });
                }}
              />
            </div>
          </Field>
          <Field label="Custom base name" hint="Blank keeps the PDF name.">
            <input
              type="text"
              aria-label="Custom base name for pages"
              value={settings.baseName}
              disabled={disabled}
              placeholder="e.g. brochure"
              onChange={(event) =>
                onChange({ ...settings, baseName: event.target.value })
              }
            />
          </Field>
          <Field label="Suffix" hint="Added before the page number.">
            <input
              type="text"
              aria-label="Page file name suffix"
              value={settings.suffix}
              disabled={disabled}
              placeholder="e.g. print"
              onChange={(event) =>
                onChange({ ...settings, suffix: event.target.value })
              }
            />
          </Field>
        </div>
      </details>

      <div className="converter-summary" aria-label="Current settings summary">
        {[
          formatById(pdfRender.format).label,
          `${clampDpi(pdfRender.dpi)} DPI`,
          pdfRender.format === "png" ? "lossless" : `q${pdfRender.quality}`,
          rangeCheck ?? "all pages",
        ].map((part) => (
          <span key={part} className="chip converter-chip">
            {part}
          </span>
        ))}
      </div>
    </div>
  );
}
