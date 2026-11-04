"use client";

import { ChevronDown, Info } from "lucide-react";

import {
  CONVERT_LIMITS,
  PDF_EMBED_DPI_OPTIONS,
  PAGE_SIZES,
  describePdfSettings,
  resolvePage,
  type ConvertSettings,
  type FitMode,
  type Orientation,
  type PageSizeId,
} from "@/lib/tools/image-convert";

type Props = {
  settings: ConvertSettings;
  onChange: (next: ConvertSettings) => void;
  disabled?: boolean;
};

function Field({
  label,
  hint,
  children,
  wide,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className={
        wide ? "converter-field converter-field-wide" : "converter-field"
      }
    >
      <span className="field-label">{label}</span>
      {children}
      {hint ? <p className="converter-hint">{hint}</p> : null}
    </div>
  );
}

const FIT_NOTES: Record<FitMode, string> = {
  contain: "Whole image visible, centred with equal margins.",
  cover: "Fills the page area and centre-crops any overflow.",
  fill: "Stretches to the page area; the aspect ratio changes.",
};

export default function ImagesToPdfSettings({
  settings,
  onChange,
  disabled,
}: Props) {
  const pdfMake = settings.pdfMake;
  const page = resolvePage(
    pdfMake.pageSize,
    pdfMake.orientation,
    pdfMake.customWidthMm,
    pdfMake.customHeightMm,
  );

  const updatePdfMake = (patch: Partial<ConvertSettings["pdfMake"]>) =>
    onChange({ ...settings, pdfMake: { ...pdfMake, ...patch } });

  return (
    <div className="converter-settings" aria-label="PDF settings">
      <>
        <details className="converter-block" open>
          <summary>
            <h3 id="settings-page">Page setup</h3>
            <ChevronDown
              size={14}
              aria-hidden="true"
              className="converter-block-chevron"
            />
          </summary>
          <div className="settings-grid converter-grid">
            <Field
              label="Page size"
              hint={`${page.widthMm} × ${page.heightMm} mm`}
            >
              <select
                aria-label="PDF page size"
                value={pdfMake.pageSize}
                disabled={disabled}
                onChange={(event) =>
                  updatePdfMake({
                    pageSize: event.target.value as PageSizeId,
                  })
                }
              >
                {PAGE_SIZES.map((size) => (
                  <option key={size.id} value={size.id}>
                    {size.label} — {size.note}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Orientation">
              <select
                aria-label="Page orientation"
                value={pdfMake.orientation}
                disabled={disabled}
                onChange={(event) =>
                  updatePdfMake({
                    orientation: event.target.value as Orientation,
                  })
                }
              >
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
              </select>
            </Field>
            {pdfMake.pageSize === "custom" ? (
              <>
                <Field label="Width (mm)" hint="20–2,000 mm.">
                  <input
                    type="number"
                    min={20}
                    max={2000}
                    value={pdfMake.customWidthMm}
                    disabled={disabled}
                    aria-label="Custom page width in millimetres"
                    onChange={(event) =>
                      updatePdfMake({
                        customWidthMm: Number(event.target.value),
                      })
                    }
                  />
                </Field>
                <Field label="Height (mm)" hint="20–2,000 mm.">
                  <input
                    type="number"
                    min={20}
                    max={2000}
                    value={pdfMake.customHeightMm}
                    disabled={disabled}
                    aria-label="Custom page height in millimetres"
                    onChange={(event) =>
                      updatePdfMake({
                        customHeightMm: Number(event.target.value),
                      })
                    }
                  />
                </Field>
              </>
            ) : null}
            <Field label="Margin" hint="Applied on every side of every page.">
              <div className="range-row">
                <input
                  type="range"
                  min={CONVERT_LIMITS.minMarginMm}
                  max={CONVERT_LIMITS.maxMarginMm}
                  step={1}
                  value={pdfMake.marginMm}
                  disabled={disabled}
                  aria-label="Page margin in millimetres"
                  onChange={(event) =>
                    updatePdfMake({ marginMm: Number(event.target.value) })
                  }
                />
                <output>{pdfMake.marginMm} mm</output>
              </div>
            </Field>
            <Field label="Image fit" hint={FIT_NOTES[pdfMake.fit]}>
              <select
                aria-label="Image fit on page"
                value={pdfMake.fit}
                disabled={disabled}
                onChange={(event) =>
                  updatePdfMake({ fit: event.target.value as FitMode })
                }
              >
                <option value="contain">Contain — whole image</option>
                <option value="cover">Cover — crop to fill</option>
                <option value="fill">Fill — stretch</option>
              </select>
            </Field>
          </div>
        </details>

        <details className="converter-block" open>
          <summary>
            <h3 id="settings-pdfout">PDF output</h3>
            <ChevronDown
              size={14}
              aria-hidden="true"
              className="converter-block-chevron"
            />
          </summary>
          <div className="settings-grid converter-grid">
            <Field label="Page background">
              <div className="converter-colour">
                <input
                  type="color"
                  value={pdfMake.background}
                  disabled={disabled}
                  aria-label="PDF page background colour"
                  onChange={(event) =>
                    updatePdfMake({ background: event.target.value })
                  }
                />
                <input
                  type="text"
                  aria-label="PDF background hex value"
                  value={pdfMake.background}
                  disabled={disabled}
                  maxLength={7}
                  onChange={(event) => {
                    const value = event.target.value.trim();
                    if (/^#?[0-9a-f]{0,6}$/i.test(value))
                      updatePdfMake({
                        background: value.startsWith("#") ? value : `#${value}`,
                      });
                  }}
                />
              </div>
            </Field>
            <Field
              label="Embedded image quality"
              hint="Applies to the pixels placed on each page."
            >
              <div className="range-row">
                <input
                  type="range"
                  min={CONVERT_LIMITS.minQuality}
                  max={CONVERT_LIMITS.maxQuality}
                  step={1}
                  value={pdfMake.imageQuality}
                  disabled={disabled}
                  aria-label="Embedded image quality"
                  onChange={(event) =>
                    updatePdfMake({
                      imageQuality: Number(event.target.value),
                    })
                  }
                />
                <output>{pdfMake.imageQuality}%</output>
              </div>
            </Field>
            <Field
              label="Embedded resolution (DPI)"
              hint="Images are resampled to this resolution before they are placed. 300 DPI is the print standard; lower makes a smaller file."
            >
              <select
                aria-label="Embedded image resolution in DPI"
                value={pdfMake.dpi}
                disabled={disabled}
                onChange={(event) =>
                  updatePdfMake({ dpi: Number(event.target.value) })
                }
              >
                {PDF_EMBED_DPI_OPTIONS.map((dpi) => (
                  <option key={dpi} value={dpi}>
                    {dpi} DPI
                  </option>
                ))}
              </select>
            </Field>
            <Field
              label="PDF file name"
              hint="Saved as .pdf. Blank uses the base name."
            >
              <input
                type="text"
                aria-label="PDF file name"
                value={pdfMake.filename}
                disabled={disabled}
                placeholder="quickkit-images.pdf"
                onChange={(event) =>
                  updatePdfMake({ filename: event.target.value })
                }
              />
            </Field>
            <Field
              label="Document title"
              hint="Stored in the PDF information dictionary."
            >
              <input
                type="text"
                aria-label="PDF document title"
                value={pdfMake.title}
                disabled={disabled}
                placeholder="Optional title"
                onChange={(event) =>
                  updatePdfMake({ title: event.target.value })
                }
              />
            </Field>
          </div>
          <p className="converter-note">
            <Info size={14} aria-hidden="true" />
            Each image becomes one page, in queue order. Pages contain raster
            images; PDFs created here have no editable text layer.
          </p>
        </details>
      </>

      <div className="converter-summary" aria-label="Current settings summary">
        {describePdfSettings(pdfMake).map((part) => (
          <span key={part} className="chip converter-chip">
            {part}
          </span>
        ))}
      </div>
    </div>
  );
}
