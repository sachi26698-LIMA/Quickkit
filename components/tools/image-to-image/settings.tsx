"use client";

import {
  ChevronDown,
  FlipHorizontal,
  FlipVertical,
  RotateCcw,
  RotateCw,
} from "lucide-react";
import { CanvasSupport } from "@/lib/tools/image-convert-runner";

import {
  OPTIMIZE_PRESETS,
  SIZE_PRESETS,
  assessTarget,
  estimateWithSpread,
  presetById,
  targetBytes,
  validateTarget,
  visuallyLossless,
  type OptimizePreset,
  type SizeUnit,
} from "@/lib/tools/image-size";
import {
  CONVERT_FORMATS,
  CONVERT_LIMITS,
  CROP_ASPECTS,
  IMAGE_FIT_MODES,
  MAX_STRAIGHTEN,
  RESIZE_DPI,
  RESIZE_PRESETS,
  printSummary,
  upscaleInfo,
  cropForAspect,
  cropIsWhole,
  describeImageEdits,
  describeImageSettings,
  editedSize,
  expandNameTemplate,
  formatById,
  keepsAlpha,
  planOutputSize,
  usesQuality,
  type ConvertSettings,
  type FormatKind,
  type ImageEditsSettings,
  type ImageFitMode,
  type RotateStep,
  type ResizeMode,
} from "@/lib/tools/image-convert";

type Props = {
  settings: ConvertSettings;
  onChange: (next: ConvertSettings) => void;
  support: CanvasSupport | null;
  disabled?: boolean;
  selectedSize?: { width?: number; height?: number };
  /** Content type of the selected source, used to estimate output size. */
  sourceKind?: FormatKind;
  /** Original file size, so a target can be compared against reality. */
  sourceBytes?: number;
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

export default function ImageToImageSettings({
  settings,
  onChange,
  support,
  disabled,
  selectedSize,
  sourceKind,
  sourceBytes,
}: Props) {
  const image = settings.image;
  const size = image.size;
  const lossy = usesQuality(image.format);
  const alphaCapable = keepsAlpha(image.format);

  const updateImage = (patch: Partial<ConvertSettings["image"]>) =>
    onChange({ ...settings, image: { ...image, ...patch } });
  const updateResize = (patch: Partial<ConvertSettings["image"]["resize"]>) =>
    updateImage({ resize: { ...image.resize, ...patch } });
  const updateSize = (patch: Partial<ConvertSettings["image"]["size"]>) =>
    updateImage({ size: { ...image.size, ...patch } });
  const updateEdits = (patch: Partial<ImageEditsSettings>) =>
    updateImage({ edits: { ...image.edits, ...patch } });

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

  const editList = describeImageEdits(image.edits);
  const activeAspect = CROP_ASPECTS.find(
    (aspect) =>
      aspect.ratio !== null &&
      selectedSize?.width &&
      selectedSize?.height &&
      (() => {
        const expected = cropForAspect(
          aspect.ratio,
          selectedSize.width ?? 1,
          selectedSize.height ?? 1,
        );
        const crop = image.edits.crop;
        return (
          expected !== null &&
          crop !== null &&
          Math.abs(expected.x - crop.x) < 0.01 &&
          Math.abs(expected.y - crop.y) < 0.01 &&
          Math.abs(expected.width - crop.width) < 0.01
        );
      })(),
  );
  const editedBox =
    selectedSize?.width && selectedSize?.height
      ? editedSize(image.edits, selectedSize.width, selectedSize.height)
      : null;
  const plannedSize =
    selectedSize?.width && selectedSize?.height
      ? (() => {
          try {
            return planOutputSize(
              selectedSize.width,
              selectedSize.height,
              image.resize,
            );
          } catch {
            return null;
          }
        })()
      : null;
  const upscale =
    plannedSize && selectedSize?.width && selectedSize?.height
      ? upscaleInfo(
          selectedSize.width,
          selectedSize.height,
          plannedSize.width,
          plannedSize.height,
        )
      : null;
  const activePreset = RESIZE_PRESETS.find(
    (preset) =>
      preset.width === image.resize.width &&
      preset.height === image.resize.height,
  );
  const templatePreview = (() => {
    const template = settings.nameTemplate.trim();
    if (!template) return "Blank — each file keeps its own name.";
    const sample = expandNameTemplate(template, {
      originalName: "Holiday Photo.jpg",
      extension: formatById(image.format).extension,
      index: 1,
    });
    return sample
      ? `First file becomes “${sample}”.`
      : "That template has no usable tokens — the default naming will be used.";
  })();

  const targetError = validateTarget(size.targetValue, size.targetUnit);
  const parsedTarget = targetError
    ? null
    : targetBytes(Number(size.targetValue), size.targetUnit);
  const estimate =
    selectedSize?.width && selectedSize?.height
      ? estimateWithSpread({
          width: selectedSize.width,
          height: selectedSize.height,
          format: image.format,
          quality: image.quality,
          kind: sourceKind ?? formatById(image.format).kind,
          compression: image.compression,
        })
      : null;
  const assessment =
    parsedTarget && selectedSize?.width && selectedSize?.height
      ? assessTarget({
          width: selectedSize.width,
          height: selectedSize.height,
          format: image.format,
          kind: sourceKind ?? formatById(image.format).kind,
          compression: image.compression,
          target: parsedTarget,
          preset: size.preset,
          allowDownscale: size.allowDownscale,
        })
      : null;
  const sizeBytesLabel = (bytes: number) =>
    bytes >= 1024 * 1024
      ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.round(bytes / 1024)} KB`;

  return (
    <div className="converter-settings" aria-label="Conversion settings">
      <>
        <details className="converter-block" open>
          <summary>
            <h3 id="settings-format">Output format &amp; quality</h3>
            <ChevronDown
              size={14}
              aria-hidden="true"
              className="converter-block-chevron"
            />
          </summary>
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
              label={
                size.mode === "target"
                  ? "Quality ceiling"
                  : `Quality${lossy ? "" : " (not used)"}`
              }
              hint={
                !lossy
                  ? `${formatById(image.format).label} is lossless, so quality does not apply.`
                  : size.mode === "target"
                    ? "The size engine never encodes above this quality."
                    : "Lower numbers shrink files; higher numbers keep detail."
              }
            >
              <div className="range-row">
                <input
                  id="converter-quality"
                  type="range"
                  aria-label="Image quality"
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
        </details>

        <details className="converter-block" open>
          <summary>
            <h3 id="settings-size">File size</h3>
            <ChevronDown
              size={14}
              aria-hidden="true"
              className="converter-block-chevron"
            />
          </summary>
          <div
            className="converter-size-modes"
            role="group"
            aria-label="How the output size is decided"
          >
            <button
              type="button"
              className={
                size.mode === "quality"
                  ? "converter-size-mode active"
                  : "converter-size-mode"
              }
              aria-pressed={size.mode === "quality"}
              disabled={disabled}
              onClick={() => updateSize({ mode: "quality" })}
            >
              <strong>Set quality</strong>
              <small>One encode at the quality you choose</small>
            </button>
            <button
              type="button"
              className={
                size.mode === "target"
                  ? "converter-size-mode active"
                  : "converter-size-mode"
              }
              aria-pressed={size.mode === "target"}
              disabled={disabled}
              onClick={() => updateSize({ mode: "target" })}
            >
              <strong>Target file size</strong>
              <small>Best quality that fits a size you set</small>
            </button>
          </div>

          {size.mode === "target" ? (
            <>
              <Field
                label="Quick targets"
                hint="Common limits for forms, portals and email."
                wide
              >
                <div className="converter-size-presets">
                  {SIZE_PRESETS.map((preset) => (
                    <button
                      key={preset.bytes}
                      type="button"
                      className={
                        parsedTarget === preset.bytes
                          ? "chip converter-size-preset active"
                          : "chip converter-size-preset"
                      }
                      aria-pressed={parsedTarget === preset.bytes}
                      disabled={disabled}
                      onClick={() =>
                        updateSize({
                          targetValue: String(
                            preset.bytes >= 1024 * 1024
                              ? preset.bytes / (1024 * 1024)
                              : preset.bytes / 1024,
                          ),
                          targetUnit: preset.bytes >= 1024 * 1024 ? "MB" : "KB",
                        })
                      }
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </Field>
              <div className="settings-grid converter-grid">
                <Field
                  label="Custom target"
                  hint={targetError || "Between 5 KB and 50 MB."}
                >
                  <div className="converter-target-row">
                    <input
                      id="converter-target"
                      type="number"
                      inputMode="decimal"
                      min={1}
                      step="any"
                      value={size.targetValue}
                      disabled={disabled}
                      aria-label="Target file size"
                      aria-invalid={targetError ? true : undefined}
                      onChange={(event) =>
                        updateSize({ targetValue: event.target.value })
                      }
                    />
                    <select
                      aria-label="Target size unit"
                      value={size.targetUnit}
                      disabled={disabled}
                      onChange={(event) =>
                        updateSize({
                          targetUnit: event.target.value as SizeUnit,
                        })
                      }
                    >
                      <option value="KB">KB</option>
                      <option value="MB">MB</option>
                    </select>
                  </div>
                </Field>
                <Field
                  label="Compression style"
                  hint={presetById(size.preset).note}
                >
                  <div
                    className="converter-optimize"
                    role="radiogroup"
                    aria-label="Compression style"
                  >
                    {OPTIMIZE_PRESETS.map((preset) => (
                      <label
                        key={preset.id}
                        className={
                          size.preset === preset.id
                            ? "converter-optimize-option active"
                            : "converter-optimize-option"
                        }
                      >
                        <input
                          type="radio"
                          name="converter-optimize"
                          value={preset.id}
                          checked={size.preset === preset.id}
                          disabled={disabled}
                          onChange={() =>
                            updateSize({
                              preset: preset.id as OptimizePreset,
                            })
                          }
                        />
                        {preset.label}
                      </label>
                    ))}
                  </div>
                </Field>
              </div>
              <div className="converter-size-toggles">
                <label className="converter-toggle">
                  <input
                    type="checkbox"
                    checked={size.losslessFirst}
                    disabled={disabled}
                    onChange={(event) =>
                      updateSize({ losslessFirst: event.target.checked })
                    }
                  />
                  <span>
                    Try lossless first
                    <small>
                      If a PNG already fits the target, nothing is recompressed
                      and no quality is lost.
                    </small>
                  </span>
                </label>
                <label className="converter-toggle">
                  <input
                    type="checkbox"
                    checked={size.autoFormat}
                    disabled={disabled}
                    onChange={(event) =>
                      updateSize({ autoFormat: event.target.checked })
                    }
                  />
                  <span>
                    Choose the format automatically
                    <small>
                      Switches to a smaller container when that clearly helps.
                      Transparency is never traded away, and any switch is
                      reported on the result.
                    </small>
                  </span>
                </label>
                <label className="converter-toggle">
                  <input
                    type="checkbox"
                    checked={size.allowDownscale}
                    disabled={disabled}
                    onChange={(event) =>
                      updateSize({ allowDownscale: event.target.checked })
                    }
                  />
                  <span>
                    Shrink pixels if that is the only way
                    <small>
                      Off means the tool keeps your dimensions and tells you the
                      target was not reached.
                    </small>
                  </span>
                </label>
              </div>
              {estimate && parsedTarget && assessment ? (
                <p
                  className={
                    assessment.feasibility === "unreachable" ||
                    assessment.feasibility === "downscale"
                      ? "converter-estimate warning"
                      : "converter-estimate"
                  }
                  role="status"
                  data-testid="converter-size-estimate"
                >
                  <strong>
                    {assessment.feasibility === "unreachable"
                      ? "Not reachable as set. "
                      : assessment.feasibility === "downscale"
                        ? "Needs smaller pixels. "
                        : ""}
                    Estimated {sizeBytesLabel(estimate.low)}–
                    {sizeBytesLabel(estimate.high)} at quality {image.quality}.
                  </strong>{" "}
                  {assessment.message}
                  {sourceBytes
                    ? ` Your file is ${sizeBytesLabel(sourceBytes)} now.`
                    : ""}
                </p>
              ) : (
                <p className="converter-estimate">
                  Add an image to see an estimated output size before you
                  convert. Estimates are a guide; the real encode decides.
                </p>
              )}
              {visuallyLossless(image.format) ? (
                <p className="converter-hint">
                  {formatById(image.format).label} is lossless: there is no
                  quality knob, so a target can only be met by reducing
                  dimensions.
                </p>
              ) : null}
            </>
          ) : (
            <p className="converter-hint">
              Fixed-quality mode encodes once at the quality above. Switch to a
              target file size when a form, portal or mailbox has a limit.
            </p>
          )}
        </details>

        <details className="converter-block" open>
          <summary>
            <h3 id="settings-alpha">Transparency &amp; background</h3>
            <ChevronDown
              size={14}
              aria-hidden="true"
              className="converter-block-chevron"
            />
          </summary>
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
                        background: value.startsWith("#") ? value : `#${value}`,
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
        </details>

        <details className="converter-block" open>
          <summary>
            <h3 id="settings-edit">Crop, rotate &amp; straighten</h3>
            <ChevronDown
              size={14}
              aria-hidden="true"
              className="converter-block-chevron"
            />
          </summary>
          <div className="converter-edit-actions">
            <div
              className="converter-edit-group"
              role="group"
              aria-label="Rotate and flip"
            >
              <button
                type="button"
                className="converter-edit-button"
                disabled={disabled}
                onClick={() =>
                  updateEdits({
                    rotate: ((image.edits.rotate + 270) % 360) as RotateStep,
                  })
                }
              >
                <RotateCcw size={15} aria-hidden="true" /> Rotate left
              </button>
              <button
                type="button"
                className="converter-edit-button"
                disabled={disabled}
                onClick={() =>
                  updateEdits({
                    rotate: ((image.edits.rotate + 90) % 360) as RotateStep,
                  })
                }
              >
                <RotateCw size={15} aria-hidden="true" /> Rotate right
              </button>
              <button
                type="button"
                className={
                  image.edits.flipH
                    ? "converter-edit-button active"
                    : "converter-edit-button"
                }
                aria-pressed={image.edits.flipH}
                disabled={disabled}
                onClick={() => updateEdits({ flipH: !image.edits.flipH })}
              >
                <FlipHorizontal size={15} aria-hidden="true" /> Flip horizontal
              </button>
              <button
                type="button"
                className={
                  image.edits.flipV
                    ? "converter-edit-button active"
                    : "converter-edit-button"
                }
                aria-pressed={image.edits.flipV}
                disabled={disabled}
                onClick={() => updateEdits({ flipV: !image.edits.flipV })}
              >
                <FlipVertical size={15} aria-hidden="true" /> Flip vertical
              </button>
            </div>
            <Field
              label={`Straighten${image.edits.straighten ? ` (${image.edits.straighten}°)` : ""}`}
              hint="Fine rotation for a tilted horizon. The frame grows to keep every corner."
              wide
            >
              <div className="range-row">
                <input
                  type="range"
                  min={-MAX_STRAIGHTEN}
                  max={MAX_STRAIGHTEN}
                  step={0.5}
                  value={image.edits.straighten}
                  disabled={disabled}
                  aria-label="Straighten angle in degrees"
                  onChange={(event) =>
                    updateEdits({ straighten: Number(event.target.value) })
                  }
                />
                <output>{image.edits.straighten}°</output>
                <button
                  type="button"
                  className="converter-edit-button"
                  disabled={disabled || image.edits.straighten === 0}
                  onClick={() => updateEdits({ straighten: 0 })}
                >
                  Reset
                </button>
              </div>
            </Field>
            <Field
              label="Crop"
              hint={
                selectedSize?.width
                  ? "A ratio crops the centre. Fine-tune the numbers below, or use the Image Cropper for a drag-and-drop crop."
                  : "Add an image to crop it."
              }
              wide
            >
              <div className="converter-size-presets">
                {CROP_ASPECTS.map((aspect) => (
                  <button
                    key={aspect.id}
                    type="button"
                    className={
                      (
                        aspect.ratio === null
                          ? cropIsWhole(image.edits.crop)
                          : activeAspect?.id === aspect.id
                      )
                        ? "chip converter-size-preset active"
                        : "chip converter-size-preset"
                    }
                    aria-pressed={
                      aspect.ratio === null
                        ? cropIsWhole(image.edits.crop)
                        : activeAspect?.id === aspect.id
                    }
                    disabled={disabled || !selectedSize?.width}
                    onClick={() =>
                      updateEdits({
                        crop:
                          aspect.ratio === null ||
                          !selectedSize?.width ||
                          !selectedSize?.height
                            ? null
                            : cropForAspect(
                                aspect.ratio,
                                selectedSize.width,
                                selectedSize.height,
                              ),
                      })
                    }
                  >
                    {aspect.label}
                  </button>
                ))}
              </div>
            </Field>
            {!cropIsWhole(image.edits.crop) ? (
              <div className="converter-crop-grid">
                {(
                  [
                    ["x", "Left offset %"],
                    ["y", "Top offset %"],
                    ["width", "Width %"],
                    ["height", "Height %"],
                  ] as const
                ).map(([key, label]) => (
                  <Field key={key} label={label}>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={Math.round((image.edits.crop?.[key] ?? 0) * 100)}
                      disabled={disabled}
                      aria-label={label}
                      onChange={(event) => {
                        const value =
                          Math.min(
                            100,
                            Math.max(0, Number(event.target.value)),
                          ) / 100;
                        const crop = image.edits.crop ?? {
                          x: 0,
                          y: 0,
                          width: 1,
                          height: 1,
                        };
                        const next = { ...crop, [key]: value };
                        // Keep the rectangle inside the frame.
                        if (key === "x" || key === "width")
                          next.width = Math.min(next.width, 1 - next.x);
                        else next.height = Math.min(next.height, 1 - next.y);
                        updateEdits({ crop: next });
                      }}
                    />
                  </Field>
                ))}
              </div>
            ) : null}
            <p className="converter-hint" data-testid="converter-edit-summary">
              {editList.length
                ? `Applied: ${editList.join(", ")}${
                    editedBox && selectedSize?.width
                      ? ` — ${editedBox.width} × ${editedBox.height} px before resize`
                      : ""
                  }.`
                : "No edits. Every file is converted exactly as uploaded."}
            </p>
          </div>
        </details>

        <details className="converter-block" open>
          <summary>
            <h3 id="settings-resize">Resize (optional)</h3>
            <ChevronDown
              size={14}
              aria-hidden="true"
              className="converter-block-chevron"
            />
          </summary>
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
                    max={800}
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
              <Field
                label="Preset dimensions"
                hint="One tap, then adjust the numbers below if you need to."
                wide
              >
                <div className="converter-size-presets">
                  {RESIZE_PRESETS.slice(0, 8).map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      className={
                        activePreset?.id === preset.id
                          ? "chip converter-size-preset active"
                          : "chip converter-size-preset"
                      }
                      aria-pressed={activePreset?.id === preset.id}
                      disabled={disabled}
                      title={`${preset.width} × ${preset.height} px — ${preset.note}`}
                      onClick={() =>
                        updateResize({
                          width: preset.width,
                          height: preset.height,
                        })
                      }
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
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
                <Field
                  label="Placement in the box"
                  hint={
                    IMAGE_FIT_MODES.find((mode) => mode.id === image.resize.fit)
                      ?.note
                  }
                >
                  <select
                    aria-label="Image placement"
                    value={image.resize.fit}
                    disabled={disabled}
                    onChange={(event) =>
                      updateResize({
                        fit: event.target.value as ImageFitMode,
                      })
                    }
                  >
                    {IMAGE_FIT_MODES.map((mode) => (
                      <option key={mode.id} value={mode.id}>
                        {mode.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </>
            ) : null}
            <Field
              label="Resolution (DPI)"
              hint={
                image.format === "tiff" ||
                image.format === "bmp" ||
                image.format === "gif"
                  ? "Stored in the file and used for the print size below."
                  : `${formatById(image.format).label} cannot store a density, so DPI drives the print calculation only.`
              }
            >
              <select
                aria-label="Resolution in DPI"
                value={
                  RESIZE_DPI.includes(image.resize.dpi)
                    ? String(image.resize.dpi)
                    : "custom"
                }
                disabled={disabled}
                onChange={(event) => {
                  const value = event.target.value;
                  if (value !== "custom") updateResize({ dpi: Number(value) });
                }}
              >
                {RESIZE_DPI.map((dpi) => (
                  <option key={dpi} value={dpi}>
                    {dpi} DPI
                  </option>
                ))}
                <option value="custom">Custom…</option>
              </select>
            </Field>
            {!RESIZE_DPI.includes(image.resize.dpi) ? (
              <Field label="Custom DPI" hint="36–1,200 DPI.">
                <input
                  type="number"
                  min={36}
                  max={1200}
                  value={image.resize.dpi}
                  disabled={disabled}
                  aria-label="Custom DPI"
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    if (value >= 36 && value <= 1200)
                      updateResize({ dpi: value });
                  }}
                />
              </Field>
            ) : null}
          </div>
          {plannedSize && plannedSize.resized ? (
            <p className="converter-hint" data-testid="converter-print-size">
              Prints at{" "}
              {printSummary(
                plannedSize.width,
                plannedSize.height,
                image.resize.dpi,
              )}
            </p>
          ) : null}
          {upscale?.warning ? (
            <p
              className="converter-estimate warning"
              role="status"
              data-testid="converter-upscale-warning"
            >
              <strong>Upscaling cannot restore detail.</strong>{" "}
              {upscale.warning}
            </p>
          ) : null}
        </details>

        <details className="converter-block" open>
          <summary>
            <h3 id="settings-meta">Metadata &amp; naming</h3>
            <ChevronDown
              size={14}
              aria-hidden="true"
              className="converter-block-chevron"
            />
          </summary>
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
              label="Metadata removal"
              hint="EXIF, GPS, XMP and ICC metadata are removed from every export. EXIF orientation is applied to the pixels before it is stripped."
            >
              <span className="converter-badge">Always stripped</span>
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
            <Field
              wide
              label="Name template"
              hint="Optional. Blank keeps the naming above. Tokens: {name} original name, {index} position in the batch, {date} today, {ext} output format."
            >
              <input
                type="text"
                aria-label="Output name template"
                value={settings.nameTemplate}
                disabled={disabled}
                placeholder="e.g. {name}-{index}.{ext}"
                spellCheck={false}
                onChange={(event) =>
                  onChange({ ...settings, nameTemplate: event.target.value })
                }
              />
              <p className="converter-estimate" aria-live="polite">
                {templatePreview}
              </p>
            </Field>
          </div>
        </details>
      </>

      <div className="converter-summary" aria-label="Current settings summary">
        {describeImageSettings(image).map((part) => (
          <span key={part} className="chip converter-chip">
            {part}
          </span>
        ))}
      </div>
    </div>
  );
}
