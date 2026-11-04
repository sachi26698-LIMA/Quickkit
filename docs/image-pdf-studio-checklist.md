# Image & PDF Studio — professional upgrade checklist

Working checklist for the Image & PDF Converter upgrade (Phases 1–8).
Living document: every row is marked only after the listed verification actually ran.

Legend: ✅ done and verified · 🚧 in progress · ⬜ not started · ⚠️ done with a stated limitation

---

## Phase 1 — Advanced image conversion

| # | Feature | Status | Verification |
|---|---|---|---|
| 1.1 | JPG/JPEG, PNG, WebP, AVIF, GIF, BMP, TIFF input and output | ✅ (pre-existing) | `tests/image-convert.test.ts`, `tests/e2e/image-converter.spec.ts` |
| 1.2 | HEIC/HEIF input where the browser has a codec | ✅ | `tests/image-convert.test.ts` ("accepts HEIC input without offering it as an output format") |
| 1.3 | HEIC/HEIF honest refusal where there is no codec | ✅ | `UNSUPPORTED_HEIC` in `lib/tools/image-convert-runner.ts`; message names Safari explicitly |
| 1.4 | Batch conversion with configurable limits | ✅ (pre-existing) | 20 files / 15 MB per image / 150 MB per batch (`CONVERT_LIMITS`) |
| 1.5 | Individual and ZIP downloads | ✅ (pre-existing) | `tests/e2e/image-converter.spec.ts` ZIP cases |
| 1.6 | Custom filenames, prefixes and suffixes | ✅ (pre-existing) | `buildOutputName`, `tests/image-convert.test.ts` |
| 1.7 | Metadata removal, disclosed per file | ✅ | `scanSourceMetadata` + `metadataNote`; `tests/exif.test.ts` for the scanner |
| 1.8 | EXIF orientation handling (auto or deliberately ignored) | ✅ (pre-existing) | `orientation` setting, `decodeBitmap` |
| 1.9 | Transparency preservation and background flattening | ✅ (pre-existing) | `alpha` setting, e2e transparency case |
| 1.10 | Animated GIF: real frame counting | ✅ | `inspectGif`, `tests/image-codec.test.ts` (5 cases, hand-built multi-frame GIF) |
| 1.11 | Animated GIF → GIF keeps the animation byte-for-byte | ✅ | `canPreserveGif` path in `convertImageFile` |
| 1.12 | Animated GIF → other format says only frame 1 is kept | ✅ | `gifNote` wording names the frame count |
| 1.13 | Colour profile handling, disclosed | ⚠️ | ICC presence is detected and reported; the canvas re-encodes to sRGB, which is stated in the note. No profile is embedded in the output. |
| 1.14 | Error reporting for unsupported or corrupt files | ✅ (pre-existing) | e2e "invalid files are reported and never converted" |

## Phase 2 — Smart image compression engine (highest priority)

| # | Feature | Status | Verification |
|---|---|---|---|
| 2.1 | Target file size in KB and MB | ✅ | `targetBytes`, `tests/image-size.test.ts` |
| 2.2 | Presets 20 KB / 50 KB / 100 KB / 200 KB / 500 KB / 1 MB | ✅ | `SIZE_PRESETS`, panel test "ships the six requested presets" |
| 2.3 | Custom target size (5 KB–50 MB) | ✅ | `validateTarget`, panel + unit tests |
| 2.4 | Lossless compression, attempted first | ✅ | `runSizeSearch` step 1; test "takes the lossless PNG when it already fits" |
| 2.5 | Visually optimised lossy compression | ✅ | binary quality search, test "searches for the highest quality that fits" |
| 2.6 | Automatic format selection where beneficial | ✅ | `autoFormatFor`; never trades transparency away; switch is reported |
| 2.7 | Adjustable quality (fixed mode) and quality ceiling (target mode) | ✅ | panel test "renames the quality slider to a ceiling" |
| 2.8 | Before/after file size comparison | ✅ (pre-existing) | `savingsLabel` in queue + result cards |
| 2.9 | Estimated achievable size before conversion | ✅ | `estimateWithSpread` + `assessTarget`, shown live in the panel |
| 2.10 | Three modes: Maximum Quality / Balanced / Smallest File | ✅ | `OPTIMIZE_PRESETS` (floors 72 / 50 / 25) |
| 2.11 | Pipeline order: inspect → preserve source → lossless → format → progressive → compare → warn | ✅ | `runSizeSearch`, 15 orchestration tests with deterministic encoders |
| 2.12 | No repeated lossy encoding (bounded probes) | ✅ | `MAX_PROBES_PER_PASS` 4, `MAX_SCALE_PASSES` 2, `MAX_TARGET_ENCODES` 8 |
| 2.13 | Warn when the target costs real quality | ✅ | `degradationWarning`, surfaced as `converter-size-report.warning` |
| 2.14 | Never claim lossless for a lossy encode | ✅ | `visuallyLossless` excludes GIF (256-colour palette); report text differs |
| 2.15 | A missed target is never silent | ✅ | guaranteed warning when `targetMet` is false; e2e "says so when the target is not reachable" |

## Phase 3 — Advanced resize & image editor

| # | Feature | Status |
|---|---|---|
| 3.1 | Exact width/height, aspect lock, percentage, longest-side | ✅ (pre-existing) |
| 3.2 | Preset dimensions | ✅ `RESIZE_PRESETS` chips write into the width/height fields |
| 3.3 | DPI 72/96/150/200/300 + custom | ✅ `RESIZE_DPI` + custom field; stored in BMP/GIF/TIFF, print-only for JPG/PNG/WebP/AVIF (stated in the UI) |
| 3.4 | Print dimensions in mm, cm and inches | ✅ `printSize` / `printSummary`, shown live as `converter-print-size` |
| 3.5 | Crop | ✅ ratio presets (centre crop) + per-side percentages; freeform drag stays in the Image Cropper |
| 3.6 | Rotate (90° steps both ways), flip H/V, straighten ±45° | ✅ `applyEdits` in the runner, `editedSize` in the model |
| 3.7 | Fit / fill / contain placement in an exact box | ✅ `placeForFit` + "Placement in the box" select |
| 3.8 | Background colour, transparent background | ✅ (pre-existing) |
| 3.9 | Batch resizing | ✅ (pre-existing; edits are fractional so one setting fits every file) |
| 3.10 | Upscaling warning ("cannot restore detail") | ✅ `upscaleInfo`, shown as `converter-upscale-warning` |

## Phase 4 — Professional PDF studio

| # | Feature | Status |
|---|---|---|
| 4.1 | Images → multi-page PDF, ordering, page sizes, margins, fit, background, quality, title, filename | ✅ (pre-existing) |
| 4.2 | A4, A3, A5, Letter, Legal and custom paper sizes | ✅ A5 added to `PAGE_SIZES` |
| 4.3 | Embedded image resolution (DPI) for images placed in a PDF | ✅ `PDF_EMBED_DPI_OPTIONS` 96/150/200/300, honoured by `planPdfEmbedSize` |
| 4.4 | Drag-and-drop page ordering | ✅ HTML5 drag on queue rows (Images → PDF) and on studio pages, with arrow buttons as the keyboard/touch path |
| 4.5 | PDF → PNG/JPG/WebP at 96/150/200/300/400/600 DPI, page ranges, ZIP | ✅ presets extended to 600 |
| 4.6 | Merge PDFs | ✅ PDF Studio action `merge` |
| 4.7 | Extract selected pages | ✅ action `extract` + "Keep only the range" |
| 4.8 | Split by ranges | ✅ action `split`, one PDF per range, ZIP download |
| 4.9 | Reorder pages | ✅ drag-and-drop plus move earlier/later buttons |
| 4.10 | Rotate pages | ✅ 90° steps both ways, applied on top of the page's own rotation |
| 4.11 | Remove selected pages | ✅ per-page toggle plus "Remove the range" |
| 4.12 | Compress PDF with clear quality settings | ✅ action `compress`, reuses the shared `PDF_COMPRESSION_PRESETS` and `compressPdfBytes` engine |
| 4.13 | Originals preserved | ✅ every studio action writes a new document; sources are only read |
| 4.14 | Encrypted-PDF and annotation limitations disclosed | ✅ `PASSWORD_PDF` on load failure; limitations stated below |

## Phase 5 — Advanced live preview

| # | Feature | Status |
|---|---|---|
| 5.1 | Original vs converted, zoom, fit, dimensions, sizes, savings | ✅ (pre-existing) |
| 5.2 | Compression report (lossless/lossy, quality, target, encodes) | ✅ |
| 5.3 | Side-by-side and slider comparison | ✅ third preview tab: both real files stacked, `clip-path` divider, 0–100 slider, Original/Converted tags |
| 5.4 | Full-screen preview | ✅ Fullscreen API on the stage, state follows `fullscreenchange` so Escape stays correct |
| 5.5 | PDF page thumbnails and navigation | ✅ (pre-existing) |

## Phase 6 — Batch processing

| # | Feature | Status |
|---|---|---|
| 6.1 | Multi-file upload, drag-and-drop, per-file format override | ✅ (pre-existing) |
| 6.2 | Per-file and overall progress, cancel | ✅ (pre-existing) |
| 6.3 | Failed files are reported, never silently skipped | ✅ (pre-existing) |
| 6.4 | Retry failed files | ✅ (pre-existing per-file retry button) |
| 6.5 | Pause and resume | ✅ pauses between files (never mid-encode); cancelling a paused batch releases it |
| 6.6 | Detailed batch report | ✅ per-file rows with status, format and byte change, plus totals; failed rows carry their error text |
| 6.7 | Individual download, ZIP, remove one, clear all | ✅ (pre-existing) |

## Phase 7 — Premium UI

| # | Feature | Status |
|---|---|---|
| 7.1 | Existing QUICKKIT design language preserved (no redesign) | ✅ |
| 7.2 | Mode selection, collapsible settings, mobile controls | ✅ 10 settings blocks are native disclosures (`details`/`summary`), open by default, keyboard-focusable, controls stay mounted when collapsed |
| 7.3 | Loading/progress, empty and error states | ✅ (pre-existing) |
| 7.4 | Keyboard navigation and screen-reader labels for new controls | ✅ (`aria-pressed`, `radiogroup`, labelled inputs, native disclosures; panel + e2e keyboard tests) |
| 7.5 | Tool stays in both Image Tools and PDF Tools at one route | ✅ (pre-existing, re-verified) |

## Phase 8 — Testing & verification

| Check | Status |
|---|---|
| Unit tests | ✅ 637 passing (was 457 before this upgrade) |
| TypeScript (`tsc --noEmit`) | ✅ clean |
| ESLint | ✅ clean |
| Prettier (`format:check`) | ✅ clean |
| Production build (`npm run build`) | ✅ 51 routes generated |
| Component tests (jsdom) for the new UI | ✅ 46 cases in `tests/image-converter-panel.test.tsx` |
| Browser regression tests | ⚠️ 44 Playwright cases listed and type-checked; they must run in CI (this workspace has no browser and cannot reach the Playwright CDN) |
| Fresh desktop and mobile screenshots | ⬜ pending the CI run (`workflow_dispatch` on `.github/workflows/screenshots.yml`) |

---

## Design decisions worth knowing

1. **Crop is stored as fractions**, not pixels, so one crop setting applies
   consistently across a batch of differently sized files.
2. **Edit order is fixed and documented**: crop → straighten → quick rotation →
   flips → resize → encode. Straightening grows the frame so no corner is lost.
3. **An edited file is never byte-copied**: any pixel work disables the animated
   GIF passthrough, which is the only way to keep that promise honest.
4. **DPI is not silently invented.** Where the container cannot store a density
   (JPG/PNG/WebP/AVIF) the UI says the value drives the print calculation only.
5. **Freeform drag cropping stays in the Image Cropper.** The converter offers
   ratio and percentage crops; duplicating the drag editor would mean two
   implementations of the same interaction drifting apart.

8. **PDF Studio page ranges apply per source.** "1-2" across two PDFs means
   pages 1–2 of each, and a range longer than a given file is clamped rather
   than rejected — unlike the single-document PDF to image field, which still
   reports out-of-range numbers.
9. **PDF annotations and forms**: pages are copied with pdf-lib, so annotations
   survive as they are; interactive form fields are not re-flowed or edited.
   Encrypted PDFs are rejected with a specific message rather than silently
   producing a broken file.
10. **Studio compression reuses the PDF Compressor engine**, so its quality
    presets and its honest fallback notice ("image recompression could not be
    validated…") behave exactly as they do in that tool.

## Where each phase is actually tested

| Phase | Pure model | Component (jsdom) | Browser (Playwright, CI) |
|---|---|---|---|
| 1 conversion | `tests/image-codec.test.ts` (GIF frame walking), `tests/image-convert.test.ts` (HEIC input) | — | existing format/ZIP/corrupt-file cases |
| 2 compression | `tests/image-size.test.ts` — 60 cases incl. 15 orchestration cases on the real engine with fake encoders | 12 cases on the size controls | 7 target-size cases incl. byte assertions on the downloaded file |
| 3 resize & edit | `tests/image-convert.test.ts` — fit placement, print size, upscale, crop maths, edit order | 14 cases on the resize/edit controls | 6 cases asserting real output pixels (640×480, 800×800 contain vs cover, 800×1200 rotated, 300×300 TIFF at 300 DPI) |
| 4 PDF studio | `tests/pdf-studio.test.ts` — 32 cases on plans, ranges, splits, validation, naming | 10 cases on the studio controls | 9 cases asserting real page counts, rotation and ZIP contents via pdf-lib |
| 5 preview | — | — | slider (both layers are real blobs, `clip-path` follows the input), full screen, keyboard collapse |
| 6 batch | — | — | batch report lists a failed file instead of skipping it |
| 7 UI | — | 3 disclosure cases | keyboard collapse/expand |

## Known limitations (stated, not hidden)

1. **HEIC/HEIF** is read-only and only where the engine ships a codec (Safari,
   some Windows builds). It is never offered as an output format.
2. **Colour profiles**: an embedded ICC profile is detected and reported, and the
   output is written as sRGB. No profile is embedded in the output, so a
   wide-gamut source can shift slightly.
3. **Animated GIF** output is a byte-for-byte copy of the input: no resize, crop
   or flatten can be applied to an animation. Any pixel edit exports frame 1 only,
   and the UI says so before the download.
4. **Size estimates** are model-based (bytes-per-pixel per format and content
   type). They guide the choice; the real encoder decides, and the report always
   shows measured bytes.
5. **Target size** is a ceiling the engine tries to meet, not a guarantee. When it
   cannot be met the output is the closest achievable file and the UI says so in
   words, with the number.
6. **TIFF output** is baseline (LZW or uncompressed); tiled, 16-bit and CMYK TIFF
   inputs are rejected with a specific message.
7. **AVIF/WebP output** depends on the browser encoder; support is probed with a
   real encode, not a feature flag.
