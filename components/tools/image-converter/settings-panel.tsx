"use client";

import { Info } from "lucide-react";
import type { CanvasSupport } from "@/lib/tools/image-convert-runner";
import {
  CONVERT_FORMATS,
  CONVERT_LIMITS,
  PAGE_RENDER_DPI,
  PAGE_SIZES,
  clampDpi,
  describeImageSettings,
  describePdfSettings,
  formatById,
  keepsAlpha,
  parsePageRange,
  resolvePage,
  usesQuality,
  type ConvertMode,
  type ConvertSettings,
  type FitMode,
  type Orientation,
  type PageSizeId,
  type ResizeMode,
} from "@/lib/tools/image-convert";

type Props = {
  mode: ConvertMode;
  settings: ConvertSettings;
  onChange: (next: ConvertSettings) => void;
  support: CanvasSupport | null;
  disabled?: boolean;
  selectedSize?: { width?: number; height?: number };
  pageCount?: number;
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

function formatAvailable(
  id: (typeof CONVERT_FORMATS)[number]["id"],
  support: CanvasSupport | null,
) {
  const def = formatById(id);
  if (!def.canvas) return true;
  return support ? support[def.id as keyof CanvasSupport] : true;
}

const FIT_NOTES: Record<FitMode, string> = {
  contain: "Whole image visible, centred with equal margins.",
  cover: "Fills the page area and centre-crops any overflow.",
  fill: "Stretches to the page area; the aspect ratio changes.",
};

export default function ConverterSettings({
  mode,
  settings,
  onChange,
  support,
  disabled,
  selectedSize,
  pageCount,
}: Props) {
  const image = settings.image;
  const pdfMake = settings.pdfMake;
  const pdfRender = settings.pdfRender;
  const lossy = usesQuality(image.format);
  const alphaCapable = keepsAlpha(image.format);
  const page = resolvePage(
    pdfMake.pageSize,
    pdfMake.orientation,
    pdfMake.customWidthMm,
    pdfMake.customHeightMm,
  );

  const updateImage = (patch: Partial<ConvertSettings["image"]>) =>
    onChange({ ...settings, image: { ...image, ...patch } });
  const updateResize = (patch: Partial<ConvertSettings["image"]["resize"]>) =>
    updateImage({ resize: { ...image.resize, ...patch } });
  const updatePdfMake = (patch: Partial<ConvertSettings["pdfMake"]>) =>
    onChange({ ...settings, pdfMake: { ...pdfMake, ...patch } });
  const updatePdfRender = (patch: Partial<ConvertSettings["pdfRender"]>) =>
    onChange({ ...settings, pdfRender: { ...pdfRender, ...patch } });

  const linkValue = (field: "width" | "height", value: number) => {
    const sourceWidth = selectedSize?.width || image.resize.width || 1;
    const sourceHeight = selectedSize?.height || image.resize.height || 1;
    if (!image.resize.lock) {
      updateResize({ [field]: value });
      return;
    }
    if (field === "width") {
      updateResize({
        width: value,
        height: Math.max(1, Math.round((value * sourceHeight) / sourceWidth)),
      });
    } else {
      updateResize({
        height: value,
        width: Math.max(1, Math.round((value * sourceWidth) / sourceHeight)),
      });
    }
  };

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

  return (
    <div className="converter-settings" aria-label="Conversion settings">
      {mode === "image" ? (
        <>
          <section
            className="converter-block"
            aria-labelledby="settings-format"
          >
            <h3 id="settings-format">Output format &amp; quality</h3>
            <div className="settings-grid converter-grid">
              <Field label="Output format" hint={formatById(image.format).note}>
                <select
                  id="converter-format"
                  aria-label="Output format"
                  value={image.format}
                  disabled={disabled}
                  onChange={(event) =>
                    updateImage({
                      format: event.target.value as typeof image.format,
                    })
                  }
                >
                  {CONVERT_FORMATS.map((format) => {
                    const available = formatAvailable(format.id, support);
                    return (
                      <option
                        key={format.id}
                        value={format.id}
                        disabled={!available}
                      >
                        {format.label}
                        {available ? "" : " — not supported in this browser"}
                      </option>
                    );
                  })}
                </select>
              </Field>
              <Field
                label={`Quality${lossy ? "" : " (not used)"}`}
                hint={
                  lossy
                    ? "Lower numbers shrink files; higher numbers keep detail."
                    : `${formatById(image.format).label} is lossless, so quality does not apply.`
                }
              >
                <div className="range-row">
                  <input
                    id="converter-quality"
                    type="range"
                    min={CONVERT_LIMITS.minQuality}
                    max={CONVERT_LIMITS.maxQuality}
                    step={1}
                    value={image.quality}
                    disabled={disabled || !lossy}
                    onChange={(event) =>
                      updateImage({ quality: Number(event.target.value) })
                    }
                  />
                  <output htmlFor="converter-quality">
                    {lossy ? `${image.quality}%` : "—"}
                  </output>
                </div>
              </Field>
            </div>
          </section>

          <section className="converter-block" aria-labelledby="settings-alpha">
            <h3 id="settings-alpha">Transparency &amp; background</h3>
            <div className="settings-grid converter-grid">
              <Field
                label="Transparent pixels"
                hint={
                  alphaCapable
                    ? "Keep alpha, or flatten onto the colour below."
                    : `${formatById(image.format).label} has no alpha channel, so transparency is always flattened.`
                }
              >
                <select
                  id="converter-alpha"
                  aria-label="Transparency handling"
                  value={alphaCapable ? image.alpha : "background"}
                  disabled={disabled || !alphaCapable}
                  onChange={(event) =>
                    updateImage({
                      alpha: event.target.value as "keep" | "background",
                    })
                  }
                >
                  <option value="keep">Keep transparency</option>
                  <option value="background">Flatten onto background</option>
                </select>
              </Field>
              <Field
                label="Background colour"
                hint={
                  !alphaCapable || image.alpha === "background"
                    ? "Used for transparent pixels and JPEG edges."
                    : "Only used if you choose to flatten."
                }
              >
                <div className="converter-colour">
                  <input
                    id="converter-background"
                    type="color"
                    value={image.background}
                    disabled={disabled}
                    aria-label="Background colour"
                    onChange={(event) =>
                      updateImage({ background: event.target.value })
                    }
                  />
                  <input
                    type="text"
                    aria-label="Background hex value"
                    value={image.background}
                    disabled={disabled}
                    maxLength={7}
                    onChange={(event) => {
                      const value = event.target.value.trim();
                      if (/^#?[0-9a-f]{0,6}$/i.test(value))
                        updateImage({
                          background: value.startsWith("#")
                            ? value
                            : `#${value}`,
                        });
                    }}
                  />
                </div>
              </Field>
            </div>
            {image.format === "tiff" ? (
              <Field
                label="TIFF compression"
                hint="LZW is lossless and usually smaller; uncompressed is the most compatible."
                wide
              >
                <select
                  aria-label="TIFF compression"
                  value={image.compression}
                  disabled={disabled}
                  onChange={(event) =>
                    updateImage({
                      compression: event.target.value as "lzw" | "none",
                    })
                  }
                >
                  <option value="lzw">LZW (lossless)</option>
                  <option value="none">Uncompressed</option>
                </select>
              </Field>
            ) : null}
          </section>

          <section
            className="converter-block"
            aria-labelledby="settings-resize"
          >
            <h3 id="settings-resize">Resize (optional)</h3>
            <div className="settings-grid converter-grid">
              <Field
                label="Resize mode"
                hint={
                  selectedSize?.width
                    ? `Source: ${selectedSize.width} × ${selectedSize.height} px.`
                    : "Select an image to see its source size."
                }
              >
                <select
                  aria-label="Resize mode"
                  value={image.resize.mode}
                  disabled={disabled}
                  onChange={(event) =>
                    updateResize({ mode: event.target.value as ResizeMode })
                  }
                >
                  <option value="none">Keep original pixels</option>
                  <option value="percent">Scale by percentage</option>
                  <option value="exact">Exact width × height</option>
                  <option value="longest">Fit longest side</option>
                </select>
              </Field>
              {image.resize.mode === "percent" ? (
                <Field label="Scale" hint="1–800%. Values above 100% upscale.">
                  <div className="range-row">
                    <input
                      type="range"
                      min={1}
                      max={400}
                      step={1}
                      value={image.resize.percent}
                      disabled={disabled}
                      aria-label="Resize percentage"
                      onChange={(event) =>
                        updateResize({ percent: Number(event.target.value) })
                      }
                    />
                    <output>{image.resize.percent}%</output>
                  </div>
                </Field>
              ) : null}
              {image.resize.mode === "longest" ? (
                <Field label="Longest side" hint="16–8,192 pixels.">
                  <input
                    type="number"
                    min={16}
                    max={8192}
                    value={image.resize.longest}
                    disabled={disabled}
                    aria-label="Longest side in pixels"
                    onChange={(event) =>
                      updateResize({ longest: Number(event.target.value) })
                    }
                  />
                </Field>
              ) : null}
              {image.resize.mode === "exact" ? (
                <>
                  <Field label="Width (px)" hint="1–8,192 pixels.">
                    <input
                      type="number"
                      min={1}
                      max={8192}
                      value={image.resize.width}
                      disabled={disabled}
                      aria-label="Output width in pixels"
                      onChange={(event) =>
                        linkValue("width", Number(event.target.value))
                      }
                    />
                  </Field>
                  <Field label="Height (px)" hint="1–8,192 pixels.">
                    <input
                      type="number"
                      min={1}
                      max={8192}
                      value={image.resize.height}
                      disabled={disabled}
                      aria-label="Output height in pixels"
                      onChange={(event) =>
                        linkValue("height", Number(event.target.value))
                      }
                    />
                  </Field>
                  <label className="check-label converter-check">
                    <input
                      type="checkbox"
                      checked={image.resize.lock}
                      disabled={disabled}
                      onChange={(event) =>
                        updateResize({ lock: event.target.checked })
                      }
                    />
                    Lock aspect ratio
                  </label>
                </>
              ) : null}
            </div>
          </section>

          <section className="converter-block" aria-labelledby="settings-meta">
            <h3 id="settings-meta">Metadata &amp; naming</h3>
            <div className="settings-grid converter-grid">
              <Field
                label="EXIF orientation"
                hint="Every export is re-encoded, which removes EXIF, GPS and ICC metadata."
              >
                <select
                  aria-label="EXIF orientation handling"
                  value={image.orientation}
                  disabled={disabled}
                  onChange={(event) =>
                    updateImage({
                      orientation: event.target.value as "auto" | "ignore",
                    })
                  }
                >
                  <option value="auto">Apply rotation to pixels</option>
                  <option value="ignore">Ignore EXIF rotation</option>
                </select>
              </Field>
              <Field
                label="Custom base name"
                hint="Blank keeps each original name."
              >
                <input
                  type="text"
                  aria-label="Custom base name"
                  value={settings.baseName}
                  disabled={disabled}
                  placeholder="e.g. holiday"
                  onChange={(event) =>
                    onChange({ ...settings, baseName: event.target.value })
                  }
                />
              </Field>
              <Field label="Suffix" hint="Added after the base name.">
                <input
                  type="text"
                  aria-label="File name suffix"
                  value={settings.suffix}
                  disabled={disabled}
                  placeholder="e.g. web"
                  onChange={(event) =>
                    onChange({ ...settings, suffix: event.target.value })
                  }
                />
              </Field>
            </div>
          </section>
        </>
      ) : null}

      {mode === "images-to-pdf" ? (
        <>
          <section className="converter-block" aria-labelledby="settings-page">
            <h3 id="settings-page">Page setup</h3>
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
          </section>

          <section
            className="converter-block"
            aria-labelledby="settings-pdfout"
          >
            <h3 id="settings-pdfout">PDF output</h3>
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
                          background: value.startsWith("#")
                            ? value
                            : `#${value}`,
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
          </section>
        </>
      ) : null}

      {mode === "pdf-to-image" ? (
        <>
          <section
            className="converter-block"
            aria-labelledby="settings-render"
          >
            <h3 id="settings-render">Page rendering</h3>
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
                  <option
                    value="webp"
                    disabled={support ? !support.webp : false}
                  >
                    WEBP
                    {support && !support.webp
                      ? " — not supported in this browser"
                      : ""}
                  </option>
                </select>
              </Field>
              <Field
                label={`Quality${
                  pdfRender.format === "png" ? " (not used)" : ""
                }`}
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
                    step={6}
                    value={clampDpi(pdfRender.dpi)}
                    disabled={disabled}
                    aria-label="Output resolution in DPI"
                    onChange={(event) =>
                      updatePdfRender({ dpi: Number(event.target.value) })
                    }
                  />
                  <output>{clampDpi(pdfRender.dpi)} DPI</output>
                </div>
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
                  aria-invalid={Boolean(
                    pageCount &&
                    rangeCheck &&
                    !rangeCheck.includes("pages selected") &&
                    !rangeCheck.startsWith("All"),
                  )}
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
                          background: value.startsWith("#")
                            ? value
                            : `#${value}`,
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
          </section>
        </>
      ) : null}

      <div className="converter-summary" aria-label="Current settings summary">
        {(mode === "image"
          ? describeImageSettings(image)
          : mode === "images-to-pdf"
            ? describePdfSettings(pdfMake)
            : [
                formatById(pdfRender.format).label,
                `${clampDpi(pdfRender.dpi)} DPI`,
                pdfRender.format === "png"
                  ? "lossless"
                  : `q${pdfRender.quality}`,
                rangeCheck ?? "all pages",
              ]
        ).map((part) => (
          <span key={part} className="chip converter-chip">
            {part}
          </span>
        ))}
      </div>
    </div>
  );
}
