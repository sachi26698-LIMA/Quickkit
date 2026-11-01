# QUICKKIT Image Cropper — feature and UI record

Route `/tools/image-cropper` · category **Image Tools** · branch `feature/image-cropper`
(work also committed on `arena/82ce86c2-quickkit`).

The cropper is a **new tool** built on the shared QUICKKIT design system, the proven image
primitives (`lib/tools/image-input.ts`, `image-header.ts`, `exif.ts`, `zip.ts`) and the
existing Image Resizer geometry helpers. Nothing was rebuilt from scratch, the Image
Resizer and the **owner-approved Image Compressor were not modified**, and the PDF tools
were not touched. Every control described here is wired to real logic — no placeholders,
no fake buttons, no network calls.

> **Status: complete and verified.** Unit, browser, accessibility, type, lint and
> production-build gates pass; the real-image QA report is
> `docs/QA_IMAGE_CROPPER_AUDIT.md`. All processing is local to the browser tab.

---

## 1. Brief coverage

| #   | Requirement                                           | Where it lives                                                                                                       | Proof                                                                                               |
| --- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| 1   | Freeform crop and fixed aspect ratios                 | Ratio chips `Free · 1:1 · 4:3 · 3:2 · 16:9 · 9:16 · 4:5`; freeform drag + corner handles                             | `image-cropper-audit` crop + ratio tests, unit ratio maths                                          |
| 2   | Instagram, YouTube, Facebook and other social presets | Grouped preset select built from the resizer catalogue (7 platforms, 18 sizes)                                       | preset test (Instagram post 1080×1080, YouTube thumbnail 1600×900 crop / 1280×720 export)           |
| 3   | Custom width and height                               | `Width px` + `Height px` + **Set custom size** (ratio _and_ exact output)                                            | custom-size test (600×400 → 600×400 export)                                                         |
| 4   | Drag, resize and reposition the crop area             | Pointer drag inside the frame, four corner handles, arrow-key nudge, numeric crop hint                               | drag test (move + SE resize), keyboard nudge, unit `resizeCropByHandle`                             |
| 5   | Zoom in/out and pan                                   | 25–400 % stage zoom (buttons, presets), Fit, drag/scroll pan, **Crop to visible area**                               | zoom/pan test (150 % → scrollLeft > 0 → crop shrinks to view)                                       |
| 6   | Rotate and flip                                       | 90° left, 90° right, 180°, Flip H, Flip V (crop follows the content)                                                 | rotate/flip pixel test (300×400 quadrant order verified after decode)                               |
| 7   | Circle crop and square crop                           | Shape chips Rectangle / Square / Circle; circle = 1:1 + alpha mask                                                   | circle PNG alpha test (corner alpha 0, centre opaque), square 1:1 test, JPEG circle background test |
| 8   | Original image vs cropped preview comparison          | Preview tabs Crop · Original · Cropped · Compare; Compare offers Split slider and Side by side                       | compare test (split slider moves, both layers present)                                              |
| 9   | JPG, PNG and WebP export                              | Format chips with capability probe; PNG is lossless and says so                                                      | signature test (FFD8FF / 89504E47 / RIFF-WEBP)                                                      |
| 10  | Quality and output size controls                      | Quality slider 10–100 + 60/80/90/100 chips; size modes Crop pixels / Scale % / Custom px / Preset                    | quality + size test (bytes and pixel size change), unit `outputPlan`/`validateCropSettings`         |
| 11  | Batch cropping with individual crop settings          | Queue where **every item owns** its frame, ratio, shape, rotation, flips, size, format, quality and name             | batch test (three different crops in one run)                                                       |
| 12  | ZIP download and custom filenames                     | Base name + suffix + live name preview; individual downloads; `Download ZIP (n)` with unique entry names             | naming/ZIP test (`unzip`-style entry listing, unique names)                                         |
| 13  | EXIF orientation handling                             | Decoded with `imageOrientation: "from-image"`, header/orientation report in the source panel, "auto-corrected" badge | EXIF orientation-6 test (300×200 displayed, red band on the right)                                  |
| 14  | High-resolution export without unwanted quality loss  | Default `Crop pixels` = 1:1 crop pixels, no resampling; PNG lossless; upscaling is labelled                          | large-photo test (6000×4000 → 6000×3375 with 1:1 pixels), `resolutionNote()`                        |
| 15  | Undo/redo and reset                                   | Per-image 50-step history, toolbar counters, keyboard-safe buttons                                                   | undo/redo/reset test + unit history tests                                                           |
| 16  | Local browser processing only                         | Canvas + `createImageBitmap` + `toBlob`; ZIP built in memory                                                         | "no image data leaves the browser" test (no external requests)                                      |
| 17  | Responsive premium light-theme design                 | Reuses tokens, panels, chips, sliders and the tool shell; `.cropper-*` CSS only                                      | screenshots 1440/390/320, overflow tests at seven widths, axe AA clean                              |

---

## 2. Feature checklist

### 2.1 Inputs and validation

- [x] Drag-and-drop zone plus **Choose images**; both feed the same validator.
- [x] JPEG, PNG and WebP only; GIF, HEIC, SVG and PDF are rejected with a named reason.
- [x] 15 MB per file, 24 MP and 8,192 px per side, 20 files / 200 MP per batch.
- [x] Corrupt or truncated files fail per image with a clear message; the rest of the queue
      keeps working, and **Retry failed (n)** re-runs only those items.
- [x] Duplicate-safe queue IDs; the queue shows size, source dimensions, planned export and
      the exact output file name.

### 2.2 Crop geometry

- [x] Crop rectangle stored in **oriented image pixels** (after EXIF orientation), so the
      frame always matches what is on screen.
- [x] Freeform drag to move; four corner handles to resize; pointer capture so a drag that
      leaves the stage still tracks; minimum side 8 px; rectangle can never leave the image.
- [x] Ratio chips lock width ÷ height while dragging; **Free** unlocks without throwing the
      current frame away.
- [x] Arrow keys nudge the frame (2 px, Shift = 16 px); corner handles nudge their own edge
      (4 px, Shift = 16 px) — a keyboard path for every pointer action.
- [x] `Reset` restores the full frame, 0° rotation, no flips, Rectangle shape — keeping the
      format, quality and naming the user chose.
- [x] Rotating 90° rotates the crop **with the content** and swaps the working frame, so the
      same scene stays selected. 180° mirrors the rectangle inside the frame. Flips mirror
      the rectangle on the matching axis.
- [x] Unit-tested pure maths: `clampCrop`, `applyRatio`, `applyShape`, `applyPreset`,
      `applyCustomSize`, `rotateSettings`, `flipSettings`, `resizeCropByHandle`, `moveCrop`.

### 2.3 Ratios, shapes and social presets

- [x] Fixed ratios `1:1`, `4:3`, `3:2`, `16:9`, `9:16`, `4:5` plus free.
- [x] **Square** forces 1:1; **Circle** forces 1:1 and applies an alpha mask on export.
- [x] 18 social sizes from the resizer catalogue, grouped by Instagram, YouTube, Facebook,
      X, LinkedIn, Pinterest and WhatsApp. Choosing one sets the crop ratio **and** the
      export pixel size (for example Instagram post → 1080 × 1080).
- [x] Custom width/height validates 8–8,192 px, sets the ratio and the exact output size.
- [x] Every ratio/shape change is undoable.

### 2.4 Rotate, flip and the stage

- [x] 90° left / 90° right / 180°, Flip H, Flip V, with the live image and the crop overlay
      transformed in exactly the same order as the export canvas.
- [x] Stage zoom 25–400 % via buttons and Zoom presets, **Fit** to return to 100 %.
- [x] Panning by dragging the shaded area or via scrollbars once the stage overflows.
- [x] **Crop to visible area** converts the current viewport back into image pixels and sets
      the frame to exactly what is visible (with a status message naming the result).
- [x] Optional rule-of-thirds grid; a live crop-size badge follows the pointer.
- [x] Checkerboard stage behind transparent pixels.

### 2.5 Export

- [x] JPEG, PNG and WebP; formats the browser cannot encode are disabled and labelled.
- [x] Quality slider 10–100 with 60/80/90/100 chips; PNG disables the slider and explains
      that PNG is lossless instead of pretending to compress.
- [x] Output size modes: **Crop pixels** (default, 1:1, no resampling), **Scale %** (10–400),
      **Custom px** and **Preset** (the social size).
- [x] Circle crops keep transparent corners in PNG/WebP; JPEG fills the corners with a
      chosen background colour (default `#ffffff`).
- [x] Planned export size, estimated bytes and a resolution note (`1:1 · no resampling`,
      downscaled/upscaled) shown before cropping.
- [x] Output resolution validated against 24 MP and 8,192 px per side; invalid values show
      an inline error and block the run instead of failing mid-batch.
- [x] Exports are re-encoded from pixels only — EXIF, GPS, XMP and ICC are stripped.

### 2.6 Compare, batch, naming and downloads

- [x] **Crop / Original / Cropped / Compare** views. Compare offers a keyboard-accessible
      **Split** slider and a **Side by side** layout with ORIGINAL / CROPPED captions.
- [x] Live cropped preview rendered by the same pipeline as the export (debounced, capped in
      size so a 24 MP source stays responsive).
- [x] Batch queue: per-image settings, per-image status (`Ready`, `Cropping…`, `Done`,
      `Failed`), per-image output size, download and remove.
- [x] **Crop n images** runs the queue, **Stop** halts after the in-flight image and keeps
      finished output, **Retry failed (n)** re-runs errors only.
- [x] Deterministic progress bar (`n / total`) and a batch summary with total output bytes.
- [x] Base name + suffix fields with a live output-name preview
      (`photo-cropped-1080x1080.jpg` by default).
- [x] ZIP download (`quickkit-cropped-images.zip`) with unique entry names when two outputs
      would otherwise collide; individual downloads use the same names.

### 2.7 History and privacy

- [x] Per-image undo/redo (50 steps) covering crop, ratio, shape, rotation, flips, output
      size, format, quality and naming; counters show edits and redo depth.
- [x] Any settings change invalidates that item's previous export, so a stale file can never
      be downloaded as the current result.
- [x] Source & privacy panel: file type, byte size, EXIF orientation, metadata summary and a
      plain statement that decoding happens on the device.
- [x] No uploads, no storage, no analytics; object URLs are revoked on replace, remove,
      reset and unmount; ZIP is assembled in memory.

### 2.8 UX, accessibility and SEO

- [x] Premium QUICKKIT light theme with the existing tokens, panel/chip/slider language.
- [x] Sticky preview panel on desktop; **preview first, settings second** on ≤1024 px so the
      live frame is visible before the long control list.
- [x] No horizontal overflow at 320, 375, 390, 430, 768, 1366 and 1440 px.
- [x] Every visible control has an accessible name; the crop box is a focusable `group` with
      an instruction label and full keyboard support.
- [x] axe WCAG 2.0/2.1/2.2 A+AA: **0 violations** on the empty route and on the populated
      editor in all four preview views.
- [x] `WebApplication` + `HowTo` + `FAQPage` JSON-LD; five visible steps and seven FAQs.
- [x] Catalog entry in **Image Tools** with search keywords (crop, ratio, circle, square,
      social sizes, rotate, flip, batch, ZIP, EXIF, transparency).

---

## 3. Limits (documented in-product)

- Rotation is quarter-turn only (90°/180°/270°); arbitrary angles belong to the resizer's
  free-angle mode and would make a rectangular crop ambiguous.
- Inputs are JPEG, PNG and WebP; animation collapses to the first frame and GIF/HEIC/SVG are
  rejected by design.
- Upscaling (Scale or Custom px above the crop size) adds pixels, not detail. The resolution
  note names it.
- The canvas encoder cannot write DPI or metadata; exports are clean pixels (privacy default).
- `Stop` halts the queue after the in-flight image because browser encoders are not abortable.
- Very large batches are bounded (20 files / 200 MP) to keep mobile browsers responsive.

---

## 4. Verification at sign-off

```text
npx tsc --noEmit     ✅ 0 errors
npx eslint .         ✅ 0 problems
npx vitest run       ✅ 14 files, 249 tests passed (28 cropper)
npm run build        ✅ 20 static routes, /tools/image-cropper prerendered
playwright chromium  ✅ 210 passed — all specs (4.2 m)
                       · image-cropper-audit.spec.ts 21 tests
screenshots          docs/verification/image-cropper-*.png
report               docs/QA_IMAGE_CROPPER_AUDIT.md
```
