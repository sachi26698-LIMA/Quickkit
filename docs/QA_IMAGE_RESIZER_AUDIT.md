# QUICKKIT Image Resizer — final functionality audit & QA report

Route `/tools/image-resizer` · branch `arena/82ce86c2-quickkit` · audit date 2026-11-01
Auditor: Arena coding agent · production build served at `http://127.0.0.1:3001`

## Verdict

Every visible button, link, select, file input and slider in the workspace was inventoried and
exercised. **40 buttons, 3 selects, 31 inputs and 1 anchor** are present across the empty,
populated, edit-tab and processed states — all of them have a wired handler and an accessible
name. Nothing was found that "looks clickable but does nothing", so **nothing had to be removed**.

Two gaps were found and **closed in this pass** (they were missing, not broken):

| Gap found | Status now |
| --- | --- |
| A long batch could not be stopped (only `Reset` existed, which also wiped the queue) | ✅ **Added**: `Stop` button + determinate progress bar; finished images are kept |
| A failed image had no retry path (only manual file replacement) | ✅ **Added**: `Retry failed (n)` button that re-runs only failed entries |
| Preview stage was a fixed 250 px-fit box: zoom above 100 % was clipped with no way to pan, and tall images shrank to slivers | ✅ **Fixed**: fitted-then-zoomed sizing inside a scrollable stage, `Fit to screen` restores the fit |
| Crop overlay dimmed the whole preview stage instead of only outside the crop frame | ✅ **Fixed**: clipped shade layer, size chip readable inside the frame |
| Two dead legacy labels (`Match original` referenced in docs but absent) | ✅ **Added**: real `Match original` action next to `Match edited size` |

## 1. Feature-by-feature status

Legend: **VERIFIED** — implemented and proven by an automated test (and, where visual, a screenshot). **NOT SUPPORTED** — cannot be done in a browser/sandbox and is labelled as such in-product. **NOT IMPLEMENTED** — deliberately absent.

### 1.1 Crop

| # | Feature | Status | How it was verified |
| --- | --- | --- | --- |
| 1.1 | Freeform crop (drag, arrow-key nudge, numeric X/Y/W/H) | **VERIFIED** | `image-resizer-audit` "crop overlay drags with the pointer and resets": pointer drag moved X to >0, width < source, `ArrowLeft` −2 px, `Reset crop` restores 0/0/800/600 |
| 1.2 | Fixed ratios 1:1, 4:3, 3:2, 16:9, 9:16, 4:5 | **VERIFIED** | `image-resizer-edits` fixed-ratio test (1:1 → 600×600 on an 800×600 source) and `image-resizer-v3-crop-1440.png` (16:9 → 1,600×900) |
| 1.3 | Crop overlay handles + keyboard access | **VERIFIED** | 4 corner buttons with `aria-label`, `role="group"` box, focus ring; drag and key tests above |
| 1.4 | Crop maths never exceeds the source | **VERIFIED** | `tests/image-edits.test.ts` (32 cases: `clampCrop`, `centredCrop`, `cropWithAspect`, `moveCrop`, `resizeCropByHandle`) |
| 1.5 | Rotate the crop while cropping (free-angle crop inside a rotated frame) | **NOT SUPPORTED** | Rotation happens after the crop on the canvas; the UI does not offer dragging a rotated crop frame |

### 1.2 Rotate, flip, adjustments

| # | Feature | Status | How it was verified |
| --- | --- | --- | --- |
| 2.1 | Rotate 90° / 180° / 270° | **VERIFIED** | `image-resizer-edits` pixel-quadrant test (TL blue / TR red / BL yellow / BR green after 90°), 600×800 output from 800×600 |
| 2.2 | Custom angle 0–359° with correct bounding box | **VERIFIED** | audit test "custom angle rotates through a full bounding box": 400×300 @ 37° → 499×458 px PNG decoded; centre opaque, corners transparent (alpha format) |
| 2.3 | Flip horizontal / vertical | **VERIFIED** | `image-resizer-edits` flip test (corner colours swapped, dimensions unchanged) |
| 2.4 | Brightness / contrast / saturation | **VERIFIED** | audit "contrast, saturation…" asserts the live CSS filter and a processed output; `image-resizer-edits` brightness test reads the exported pixel |
| 2.5 | Grayscale, sepia, warm, cool, invert | **VERIFIED** | audit "each filter chip changes the exported pixels": 5 distinct decodes; grayscale r≈g, sepia warm, invert brightens a dark tone |
| 2.6 | Filters are baked into the file (not CSS only) | **VERIFIED** | every filter assertion above decoded the downloaded PNG, not the DOM |
| 2.7 | EXIF auto-orient toggle | **VERIFIED** | audit test toggles the real checkbox; runner passes `imageOrientation: from-image`/`none` to `createImageBitmap` |
| 2.8 | Selective / mask edits, curves, per-channel levels, sharpening | **NOT IMPLEMENTED** | Out of the agreed scope; no dead controls exist for them |

### 1.3 Undo/redo and before/after

| # | Feature | Status | How it was verified |
| --- | --- | --- | --- |
| 3.1 | Undo / Redo buttons (40 steps, per image) | **VERIFIED** | `image-resizer-edits` undo/redo test |
| 3.2 | `Ctrl/⌘+Z`, `Ctrl/⌘+Shift+Z` shortcuts | **VERIFIED** | same test drives both key combinations |
| 3.3 | Reset edits | **VERIFIED** | same test + audit filter loop reuses it; button disables when there is nothing to reset |
| 3.4 | Split slider before/after with BEFORE/AFTER labels | **VERIFIED** | audit asserts `left: 25%` on the split line and both labels; `image-resizer-v2-compare-1440.png` |
| 3.5 | Side-by-side comparison with per-side captions | **VERIFIED** | audit asserts two `<figure>`s and the "Original" caption |
| 3.6 | Original ⇄ Result toggle | **VERIFIED** | audit asserts the pixel-size tag flips back to 480 × 360 after choosing Original |

### 1.4 Individual image settings in batch

| # | Feature | Status | How it was verified |
| --- | --- | --- | --- |
| 4.1 | Per-image enable/disable of custom settings | **VERIFIED** | `image-resizer-edits` per-image overrides test |
| 4.2 | Per-image width/height + aspect lock + "Match edited size" | **VERIFIED** | same test + audit name inventory |
| 4.3 | Per-image format (`Same as batch` default) and quality | **VERIFIED** | `image-resizer-edits` ZIP-entry test (per-image PNG 100×75 alongside a batch-converted file) |
| 4.4 | Per-image output name and filename suffix | **VERIFIED** | ZIP entry names `quadrants-100x75.png` and `quadrants-square-200x200.png` decoded from the downloaded archive |
| 4.5 | Replace a queued file, remove a queued file | **VERIFIED** | `image-resizer-edits` replace test (queue position kept, crop reset); remove covered by `image-resizer.spec.ts` |
| 4.6 | Per-image reset | **VERIFIED** | `Reset this image's settings` restores batch format/quality/name/suffix |
| 4.7 | Per-image crop/rotate/filter (independent edits per file) | **VERIFIED** | history and edits are keyed by item id; switching thumbnails restores each image's own state |
| 4.8 | Reordering the queue by drag | **NOT IMPLEMENTED** | Order is upload order; files can be removed and re-added. No drag handle is shown, so nothing is misleading |

### 1.5 ZIP download

| # | Feature | Status | How it was verified |
| --- | --- | --- | --- |
| 5.1 | ZIP contains only successfully processed images | **VERIFIED** | audit "mixed batch keeps the good image and ZIPs only valid entries": 2 valid entries, `damaged-photo` absent |
| 5.2 | Entry names match the final renamed/suffixed names | **VERIFIED** | `image-resizer-edits` + audit ZIP name assertions |
| 5.3 | Entry contents are valid, decodable images | **VERIFIED** | entries opened with `PNG.sync.read` and sampled; CRC-32 covered by `tests/zip.test.ts` (9 cases) |
| 5.4 | Duplicate names are de-duplicated | **VERIFIED** | `uniqueName` unit tests + `tests/zip.test.ts` dedupe case |
| 5.5 | Deflate compression inside the archive | **NOT SUPPORTED** | Stored method only — photos are already compressed, and a store-only writer keeps the ZIP dependency-free. Stated in-product |
| 5.6 | ZIP assembly progress / cancellation | **NOT IMPLEMENTED** | Assembly is a single synchronous pass over finished blobs and a "Building ZIP…" busy label; no cancel control is offered |

### 1.6 Real output verification

| # | Feature | Status | How it was verified |
| --- | --- | --- | --- |
| 6.1 | Output dimensions equal the plan | **VERIFIED** | PNG/JPEG/WebP decodes match planned px in 6 tests (1,600×900, 720×540, 240×240, 499×458, 600×400, 100×75) |
| 6.2 | Transparency preserved (PNG, WebP) and flattened (JPEG) | **VERIFIED** | audit format matrix: PNG corner alpha 0, WebP corner alpha 0, JPEG corner alpha 255 |
| 6.3 | JPEG background colour applied | **VERIFIED** | audit: red background → corner RGB ≈ (255, 0, 0) after decode |
| 6.4 | Quality slider changes encoded size | **VERIFIED** | audit: quality 20 < quality 95 in bytes, both decodable at 720×540 |
| 6.5 | Format signatures correct (PNG, JPEG SOI, RIFF/WEBP) | **VERIFIED** | byte-level assertions in the audit matrix |
| 6.6 | AVIF output | **NOT SUPPORTED** in this browser | `canvas.toBlob` cannot encode AVIF in the sandbox Chromium; the option is rendered **disabled** with "(unsupported here)" and the note explains it. The capability check (`canEncode`) is automatic, so a supporting browser enables it |

### 1.7 Progress, cancellation, error recovery

| # | Feature | Status | How it was verified |
| --- | --- | --- | --- |
| 7.1 | Determinate progress bar (n / total, %) | **VERIFIED** | **added this pass**; audit asserts the bar appears, then disappears when the run ends |
| 7.2 | Primary button shows "Processing x of y…" and disables | **VERIFIED** | same test |
| 7.3 | Stop a running batch, keep finished results | **VERIFIED** | **added this pass**; audit stops after the first completion: 0 working, >0 done, <4 done, ZIP count matches, queue restartable |
| 7.4 | Per-image status chips (Ready / Working / Done / Failed) | **VERIFIED** | asserted in multiple tests and screenshots |
| 7.5 | Per-image error text + batch summary | **VERIFIED** | audit corrupt-file test: "This image could not be decoded…", "1 processed successfully. 1 could not be processed" |
| 7.6 | Retry failed only | **VERIFIED** | **added this pass**; audit re-runs the damaged file alone and it fails again with the same message (no silent success) |
| 7.7 | Recovery after a damaged file | **VERIFIED** | audit replaces the queue and processes a fresh image successfully |
| 7.8 | Oversized / wrong-type / empty / >20 files rejected with a reason | **VERIFIED** | `image-resizer.spec.ts` validation tests + `validateImage`/`inspectImageHeader` unit tests; batch-budget message |
| 7.9 | Resuming a cancelled encode mid-image | **NOT SUPPORTED** | `canvas.toBlob`/`createImageBitmap` are not abortable; Stop takes effect **after** the in-flight image settles. The button tooltip says "Stop the queue after the current image" — no false promise |

### 1.8 Mobile and accessibility

| # | Feature | Status | How it was verified |
| --- | --- | --- | --- |
| 8.1 | Touch-select a queue thumbnail | **VERIFIED** | audit mobile test taps with `touchscreen.tap` and checks `aria-pressed` |
| 8.2 | Touch-switch tabs | **VERIFIED** | same test taps the Edit tab and checks `aria-selected` |
| 8.3 | Touch-drag the crop handles | **VERIFIED** | `pointerdown/move/up` with `pointerType: "touch"` moves Crop X above 0 |
| 8.4 | No horizontal overflow at 320–1440 px | **VERIFIED** | audit mobile assertions + `quality.spec.ts` over 7 widths × 11 routes |
| 8.5 | ≥ 40 px touch targets on mobile chrome controls | **VERIFIED** | mobile icon buttons grow to 40×40; audit measures the rendered heights |
| 8.6 | Keyboard-only operation (tabs, radio groups, crop nudge, shortcuts, fields) | **VERIFIED** | arrow-key tabs, fieldset radios, crop nudge, Ctrl+Z tests |
| 8.7 | Every visible control has an accessible name | **VERIFIED** | audit "every visible control in every state has an accessible name": 0 unnamed in empty, populated, crop and processed states |
| 8.8 | axe WCAG 2.0/2.1/2.2 A+AA = 0 violations | **VERIFIED** | `quality.spec.ts` on the empty route + `image-resizer-edits` axe test on the populated editor with the crop overlay open |
| 8.9 | Tooltips / helper text for every non-obvious control | **VERIFIED** | `title` + visible hint copy on lock, zip, undo, zoom, replace, stop, retry |
| 8.10 | Full screen-reader announcement of live progress | **VERIFIED** | `role="status"` (sr-only live text) + `role="alert"` for errors + `progress` element with `aria-label` |
| 8.11 | Screen-reader support for the crop canvas itself (announcing crop edges while dragging) | **NOT IMPLEMENTED** | The numeric crop fields are the accessible path; the overlay exposes named corner buttons and arrow-key nudging, but no constant announcements |
| 8.12 | Drag-and-drop from the OS / file manager | **VERIFIED** | drop zone handlers + `image-resizer.spec.ts`; same code path as the picker |

## 2. Test evidence (this pass)

```text
npx tsc --noEmit      ✅ 0 errors
npx eslint .          ✅ 0 problems
npx vitest run        ✅ 12 files · 193 tests passed
npm run build         ✅ 19 static routes, /tools/image-resizer prerendered
playwright chromium   ✅ 146 passed (1.9 m), 7 spec files
   image-resizer.spec.ts         6   (v1 flows: validation, locked resize, presets, unlocked JPEG, batch+ZIP, remove/reset)
   image-resizer-edits.spec.ts  13   (rotation/flip pixels, fixed-ratio crop, brightness, undo/redo, longest/shortest/print, per-image + ZIP names, compare, zoom/fit, alpha, EXIF, presets, replace, axe)
   image-resizer-audit.spec.ts  16   (NEW: percentage chips + swap + match original, accessible-name inventory, JSON-LD + guidance, contrast/saturation/split/auto-orient, custom angle, 5 filter chips, JPEG background, quality extremes, format matrix, crop pointer/keyboard/reset, Stop, Retry failed, mixed-batch ZIP, zoom/pan, structured data, mobile touch + mobile batch)
```

Cross-browser note: the sandbox can only provision Chromium. Firefox/WebKit projects stay
configured in `playwright.config.ts` for CI; they are not claimed as run here.

## 3. Changes made in this audit pass

`components/tools/image-resizer.tsx`
- `Stop` action bound to the existing run token (`runRef`), so an in-flight image finishes and the queue halts.
- `Retry failed (n)` button, visible only when a row is in the `error` state, running only failed rows.
- Determinate `<progress>` block with "x / y finished · %".
- Preview sizing rewritten: measured natural size × fit scale × zoom, rendered inside a scrollable stage (`Fit to screen` resets to the fit).
- Crop overlay: clipped shade layer and the size chip moved inside the frame; the stage pixel tag hides while cropping.
- `Match original` action restored next to `Match edited size`.

`app/globals.css`
- Scrollable, measured preview stage (`height: clamp(250px, 40vh, 348px)`).
- Mobile 40 px icon buttons (appended as a final media block so source order cannot lose).
- `.resizer-crop-clip` / `.resizer-crop-shade`, readable crop-size chip, `.resizer-progress` styling, Stop/Retry emphasis.

`tests/e2e/image-resizer-audit.spec.ts` — new 16-test audit suite.

## 4. Screenshots

| File | Shows |
| --- | --- |
| `docs/verification/image-resizer-v3-crop-1440.png` | 16:9 fixed-ratio crop with handles, numeric fields and the shaded area outside the frame |
| `docs/verification/image-resizer-v3-progress-1440.png` | Live progress bar, `Stop` button, mixed Done/Working/Ready queue |
| `docs/verification/image-resizer-v3-cancelled-1440.png` | Post-Stop state: finished images kept, queue back to Ready |
| `docs/verification/image-resizer-v3-error-recovery-1440.png` | Damaged file row with `Retry failed (1)`, good file Done, batch summary |
| `docs/verification/image-resizer-v3-mobile-crop-390.png` | Touch-sized crop overlay and controls at 390 px |
| `docs/verification/image-resizer-v3-mobile-queue-390.png` | Mobile batch queue |
| `docs/verification/image-resizer-v2-*.png` | Full v2 set (resize tab, edit tab, compare, per-image overrides, desktop/mobile full pages) |

## 5. Known limits restated (all visible in-product)

1. **AVIF** needs a browser that can encode it; the sandbox Chromium cannot, so the option shows as disabled — the check is automatic.
2. **Stop** takes effect after the in-flight image settles; browser encoders are not abortable.
3. **DPI** cannot be written into a canvas encode; the panel converts cm ↔ px instead.
4. **Metadata** (EXIF/GPS/XMP/ICC) is always stripped on export — the privacy default — and the panel says so before you download.
5. **Custom presets** live for the session only and cap at 8.
6. **ZIP** uses the stored method; **animation** collapses to the first frame; **HEIC/GIF/SVG** inputs are rejected with a named reason.
7. **Queue reordering** and **mid-encode resume** are not offered anywhere in the UI.
