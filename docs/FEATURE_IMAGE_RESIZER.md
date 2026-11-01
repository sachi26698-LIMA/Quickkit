# QUICKKIT Image Resizer — v2 feature and UI record

Route `/tools/image-resizer` · category **Image Tools** · branch `arena/82ce86c2-quickkit`
(upgrade of the v1 tool committed as `e5ac3d5` on `feature/image-resizer`).

The v1 resizer was kept and extended **in place**: same route, same design language, same
queue/ZIP/privacy model. Nothing was rebuilt from scratch and no existing capability was
removed. Every control described here is wired to real logic; there are no placeholders.

---

## 1. What v2 adds

| Area | v1 | v2 |
| --- | --- | --- |
| Resize modes | Dimensions, percentage, presets | **+ Longest side**, **+ Shortest side**, **+ custom presets** saved in the session |
| Presets | 8 everyday + 8 social | 8 everyday + **18 social**, grouped by **Instagram, YouTube, Facebook, WhatsApp, X, LinkedIn, Pinterest** |
| Editing | none | **Crop** (free + 6 fixed ratios, pointer handles, keyboard nudge), **rotate** 90/180/270 + any angle, **flip H/V**, **brightness / contrast / saturation**, **grayscale, sepia, warm, cool, invert** |
| Comparison | Original ⇄ resized toggle | Original/Result toggle **plus Split slider and Side-by-side** after processing |
| Preview | fit to stage | **25–400 % zoom**, fit-to-screen, pan-scroll, checkerboard stage |
| Output formats | JPEG, PNG, WebP | **+ AVIF** where the browser can encode it (unsupported options are disabled and labelled) |
| Output size | estimate from the plan | estimate updates for every edit, plus the real byte size after processing |
| DPI / print | none | **DPI & print size** panel: px ⇄ inch/cm both directions, "use print size" applies exact pixels |
| Batch | global settings + remove | **per-image overrides** (size, lock, format, quality, base name, suffix), replace file, keep queue |
| Naming | `name-WxH.ext` | **rename outputs** + **filename suffixes** (batch and per image), `Same as batch` format inheritance |
| History | none | **Undo / Redo** per image (40 steps) with Ctrl/⌘+Z, Ctrl/⌘+Shift+Z and a Reset edits action |
| Metadata | implied by re-encode | **Metadata & privacy** panel scans EXIF/GPS/camera/date/ICC/XMP and states exactly what is stripped |
| Guidance | 4 FAQs | 5-step HowTo, **7 FAQs**, `WebApplication` + `HowTo` + `FAQPage` JSON-LD |

---

## 2. Feature checklist

### 2.1 Advanced resize
- [x] Exact width × height with 1–8,192 px and 24 MP guards; inline, named errors.
- [x] Percentage mode 5–400 % with slider, number field and 25/50/75/100 chips.
- [x] Aspect-ratio lock (padlock, `aria-pressed`) that follows the **edited** image ratio; unlock to stretch.
- [x] Swap width ↔ height, match original, match edited size.
- [x] Fit modes for presets: **Fill & crop** (centred), **Fit inside (contain)**, **Stretch**.
- [x] Resize by **longest side** or **shortest side**, keeping the ratio and the fill/contain rule.
- [x] 8 everyday presets, 18 social presets across 7 platforms, every card showing px + ratio.
- [x] **Custom presets**: "Save current size" stores up to 8 presets for the session, each can be selected or deleted.
- [x] DPI and print size: 36–1,200 DPI validation, cm/inch conversion both ways, one-click "Use print size as pixels" (e.g. 10 × 15 cm @ 300 DPI → 1,181 × 1,772 px).

### 2.2 Editing
- [x] Crop with a freeform selection or fixed ratios (1:1, 4:3, 3:2, 16:9, 9:16, 4:5); numeric X/Y/width/height fields stay in sync.
- [x] Crop overlay on the preview with four corner handles, drag-to-move, arrow-key nudge (Shift = larger step) and a live ratio label.
- [x] Rotate 90°, 180°, 270°, plus **any custom angle** 0–359° (canvas-aware bounding box, no clipping).
- [x] Flip horizontal and vertical independently.
- [x] Brightness, contrast and saturation sliders (0–200 %, 100 % = neutral) rendered through canvas filters.
- [x] Filters: Grayscale, Sepia, Warm, Cool, Invert (baked into the exported pixels, not CSS-only).
- [x] Before/after: Single preview, **Split** slider (BEFORE / AFTER labels) and **Side-by-side**.
- [x] Undo/redo per image (40 entries), Ctrl/⌘+Z and Ctrl/⌘+Shift+Z, Reset edits; edits are stored per file.

### 2.3 Format and compression
- [x] JPEG, PNG, WebP and **AVIF** output; AVIF is offered only when `canvas.toBlob` can encode it.
- [x] Quality slider 10–100 % for lossy formats, disabled and labelled for lossless PNG.
- [x] Estimated output size before processing and the real size after, with the delta versus the source.
- [x] Transparency preserved in PNG/WebP/AVIF; JPEG (and any format that needs it) is flattened onto a chosen background colour.
- [x] Compatibility notes explain that AVIF needs a newer browser and that JPEG is the most compatible choice.
- [x] Metadata panel lists EXIF, GPS, camera, capture date, ICC and XMP; every export is re-encoded so they are **stripped automatically** (privacy default), and the EXIF orientation flag can be honoured while editing.

### 2.4 Batch
- [x] Multiple upload via picker or drag-and-drop, up to 20 files, 15 MB / 24 MP / 8,192 px each.
- [x] Per-image overrides: enable "Custom size and format", then set size, lock, format (`Same as batch` by default), quality, base name and suffix.
- [x] Replace a file in place (keeps its queue position, resets its crop/edits) or remove it.
- [x] Bulk processing with a single action; per-file status (Ready / Working… / Done / Failed), per-file error text and a batch summary.
- [x] Download an individual result (correct extension and dimensions) or every finished image as a **ZIP built in the browser** (stored method, CRC-32, UTF-8 names, duplicate-safe).
- [x] Rename outputs and append filename suffixes (batch-wide or per image); the ZIP uses the final names.

### 2.5 Premium UI/UX
- [x] Professional drag-and-drop zone with keyboard-accessible “Choose files” fallback and explicit limits.
- [x] Thumbnail queue plus a large preview stage; click a thumbnail to preview that image.
- [x] Zoom 25–400 % in 25 % steps with a zoom readout and **Fit to screen**.
- [x] Side-by-side / split original-versus-result comparison after processing.
- [x] Undo/redo, reset edits, reset workspace.
- [x] Clear empty state, working state, success state (`role="status"`) and error states (`role="alert"` with naming).
- [x] Responsive at 320/375/390/430/768/1366/1440 px: stacked single-column workspace, wrapping toolbars, no horizontal overflow.
- [x] QUICKKIT light theme only: existing tokens, lavender tints, Geist, Lucide, checkerboard stage.

### 2.6 Quality, reliability and accessibility
- [x] Corrupt, empty, wrong-type, oversized (> 15 MB), too-large (> 24 MP / 8,192 px) and duplicate-name files are handled per file without losing the rest of the batch.
- [x] Memory stays flat: files are decoded one at a time, canvases are released, object URLs are revoked on invalidation/removal/unmount, batch capped at 20 and 24 MP per side.
- [x] 100 % local: decode, crop, rotate, filter, resize, encode and ZIP all run in the tab; no upload, storage or analytics.
- [x] Keyboard accessible: real tabs (arrow-key switching), radio groups in fieldsets, crop-nudge keys, undo/redo shortcuts, visible focus rings, ≥ 44 px targets, tooltips via `title` + visible helper text.
- [x] axe (WCAG 2.0/2.1/2.2 A+AA) reports **zero violations** on the empty route **and** on the populated editor with the crop overlay open.
- [x] Page guidance: 5-step HowTo, 7 FAQs, in-product tips, format compatibility notes and print/DPI explanations.
- [x] SEO: title/description/canonical/OpenGraph/Twitter, sitemap entry, breadcrumbs and `WebApplication` + `HowTo` + `FAQPage` structured data from `toolStructuredData`.

### 2.7 QA performed
- [x] Real generated sample images (gradient/quadrant/transparent) exercised through every flow in Chromium.
- [x] Outputs decoded after download: PNG/WebP/JPEG signatures, pixel dimensions, rotation/flip corner colours, transparency vs JPEG flatten, ZIP entry names and CRC-safe structure.
- [x] Desktop (1440), tablet/mobile (390/375/320) layouts verified and screenshotted.
- [x] Unit, component, browser (129 → **130** after the populated-axe test), lint, typecheck and production build all green (see §5).

---

## 3. Architecture

| File | Responsibility |
| --- | --- |
| `lib/tools/image-resize.ts` | Resize modes, validation, presets + platform grouping, `planResize` (cover/contain/stretch, longest/shortest), naming helpers, AVIF in `OUTPUT_FORMATS`. |
| `lib/tools/image-edits.ts` | Edit model (crop, rotation, flip, filters, auto-orient), crop maths (`clampCrop`, `centredCrop`, `cropWithAspect`, handles), DPI/print conversion, size estimation, output-name building. |
| `lib/tools/exif.ts` | Bounded (256 KB) EXIF/XMP/ICC/GPS scanner for the metadata panel. |
| `lib/tools/image-resize-runner.ts` | DOM pipeline: header preflight → honour orientation → `renderEdited` (crop/rotate/flip/filter) → progressive-halving resize → encode (with `canEncode`/`formatSupport`). |
| `lib/tools/zip.ts` | In-browser stored-method ZIP writer (unchanged, still verified). |
| `components/tools/image-resizer.tsx` | v2 workspace: tabs, crop overlay, per-image history, compare/zoom, overrides, metadata, DPI, notices, queue, ZIP. |
| `lib/seo.ts` `toolStructuredData` | Shared `@graph` JSON-LD builder (WebApplication + HowTo + FAQPage). |
| `app/tools/image-resizer/page.tsx` | Metadata, 5 steps, 7 FAQs and JSON-LD for the route. |
| `app/globals.css` | Additive `resizer-*` v2 blocks (tabs, crop overlay/handles/label, compare, split stage, zoom, per-image grid, print/metadata, responsive ≤ 600 px). |

---

## 4. UI / UX notes

- **Layout** — drop zone → *Resize & edit* (left) + *Preview & output* (right) → action row → batch queue. The left panel keeps a tablist (Resize / Edit) so the tool never becomes an endless scroll; the Edit tab carries an "edited" dot.
- **Resize tab** — mode radio cards (Dimensions, Percentage, Presets, Longest side, Shortest side), then the matching controls; presets are grouped by platform with a compact 2-column card grid; DPI & print is a collapsible `<details>`.
- **Edit tab** — Undo / Redo / Reset edits, Crop (ratio, numeric fields, reset, overlay toggle), Rotate & flip (90/180/270, custom angle slider, H/V), Light & colour (three sliders + filter chips) and a note that filters are baked into the output.
- **Preview & output** — Original/Result toggle appears after processing; Single / Split / Side by side; zoom group with −, %, + and Fit; checkerboard stage with the pixel-size caption; stats (original, edited source, target, estimate/real size, scale, megapixels); format + quality; rename and suffix; compatibility notes.
- **Batch rows** — 44 px thumbnail button, name, `source → target · format · custom` line, size delta or error, status chip, Download, Custom settings/log toggle, Replace, Remove.
- **Motion** — only hover/focus elevation and the crop drag; honours `prefers-reduced-motion`.

---

## 5. Evidence

### Commands (all run on this branch, production build)

```text
npx tsc --noEmit      ✅ 0 errors
npx eslint .          ✅ 0 problems
npx vitest run        ✅ 12 files, 193 tests passed
npm run build         ✅ 19 static routes, /tools/image-resizer prerendered
playwright (chromium) ✅ 130 passed — foundation/core/quality/browser-tools
                          + image-resizer (6) + image-resizer-edits (13)
log: docs/verification/image-resizer-v2-checks.txt
```

The new browser file `tests/e2e/image-resizer-edits.spec.ts` covers: 90/180° rotation and
flip pixel quadrants, fixed-ratio crop (drag, keyboard, numeric fields), grayscale +
brightness output, undo/redo + shortcut + reset, longest/shortest/print-size targets,
per-image overrides + suffix + ZIP entry names, split and side-by-side compare, zoom/fit,
WebP alpha versus JPEG flatten, EXIF panel + stripped export, custom preset save/use/delete,
file replacement, and axe WCAG 2.2 AA on the populated editor.

### Screenshots (`docs/verification/`)

| File | Shows |
| --- | --- |
| `image-resizer-v2-top-1440.png` | Desktop first view with the v2 header and drop zone |
| `image-resizer-v2-resize-1440.png` | Resize tab: mode cards, platform presets, target stats, format/quality, rename/suffix |
| `image-resizer-v2-edit-1440.png` | Edit tab: crop ratios + numeric crop, rotate/flip, light & colour controls |
| `image-resizer-v2-compare-1440.png` | Split before/after comparison with the real output size |
| `image-resizer-v2-per-image-1440.png` | Per-image overrides: size, `Same as batch` format, quality, output name, suffix and the resulting file name |
| `image-resizer-v2-full-1440.png` | Whole desktop page incl. metadata, tips, steps and FAQs |
| `image-resizer-v2-mobile-390.png` | Mobile workspace with percentage mode |
| `image-resizer-v2-mobile-edit-390.png` | Mobile Edit tab |
| `image-resizer-v2-mobile-full-390.png` | Full mobile page |
| `image-resizer-catalog-1440.png` | Home catalog filtered to Image Tools (v1 evidence, still current) |

---

## 6. Known limits (documented in-product)

- **AVIF** encoding depends on the browser; unsupported options are disabled and explained. Chromium in this sandbox cannot encode AVIF, which is exactly the state the UI demonstrates.
- **Custom presets** live for the browser session only (no storage by design) and are capped at 8.
- A canvas encoder cannot write a **DPI tag**, so the DPI panel converts values but printers read pixel dimensions.
- Every export is re-encoded from pixels: EXIF/GPS/XMP/ICC are **removed** (the privacy default). The original file is never modified.
- Animation collapses to the first frame; HEIC, GIF and SVG inputs are rejected with a clear message.
- Upscaling adds pixels, not detail.
- The ZIP uses the stored method because photos are already compressed.

## 7. Out of scope

- Image Compressor and any other new tool — explicitly not started.
- PDF Merger / PDF Splitter — owned by another workstream; no files touched.
- Server-side rendering of pixels, HEIC decoding, GIF animation, background removal, EXIF editing.
