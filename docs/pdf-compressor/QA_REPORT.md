# PDF Compressor — QA and Owner-Review Handoff

**Tool:** PDF Compressor (`compress-pdf`)
**Route:** `/tools/compress-pdf`
**Status:** **implemented — awaiting owner approval**
**Date:** 2 November 2026
**Working branch:** `arena/fe1f419c-quickkit`
**Development transition:** `825bc3e810dd2ae86b78190b9c01441dd4384a62` (`docs(pdf): mark merger and splitter owner-approved`)

> This is an owner-review handoff, not a launch record. PDF Compressor has not been owner-approved, merged into `main`, deployed or indexed. No fourth PDF tool has been started.

## 1. Branch, approval and preservation note

The owner requested a separate `feature/pdf-compressor` branch. This Arena session is fixed to `arena/fe1f419c-quickkit` and cannot create, switch to or push another branch. That deviation is disclosed rather than hidden. PDF Compressor is isolated in tool-specific route, component, logic, engine, worker, test, screenshot and documentation files on the fixed session branch. PDF Merger and PDF Splitter were preserved and their permanent browser suites were rerun with the Compressor suite.

Before Compressor coding, the worktree was backed up at:

- `/home/user/quickkit-backups/pdf-compressor-20261101-124020/`
- Source tarball SHA-256: `19e1492ed878424ca65f7b662acb6c47e16a12edb4549c939b16c805ff9ad4f9`
- Git bundle SHA-256: `abecd145edc6b5007a821a5e15646305fbb4594541c58c87e138224c7cbb4ac4`

PDF Merger and PDF Splitter are recorded as **owner-approved** in `TOOL_DEVELOPMENT_STATUS.md`. That approval did not authorize deployment or indexing. PDF Compressor must receive its own explicit owner decision before it can be called live/complete.

## 2. Implemented workflow

PDF Compressor includes:

- Multi-file picker and drag/drop intake for a batch of PDFs.
- Sequential local inspection with file name, exact byte size, page count, first-page dimensions/rotation, embedded-image count/bytes, supported-image count and first-page thumbnail.
- Exact-duplicate detection by content hash with a visible “Duplicate of PDF n” badge; duplicates are not silently discarded.
- Password-required and wrong-password states. A user-supplied open password stays in tab/worker memory only and is cleared after a validated unencrypted rewrite.
- Four presets:
  - **Low:** 88% image quality, maximum image side 3,200 px.
  - **Medium:** 78% image quality, maximum image side 2,400 px.
  - **High:** 64% image quality, maximum image side 1,800 px.
  - **Maximum:** 50% image quality, maximum image side 1,300 px.
- Custom image quality (normalized to 28–95%) and maximum embedded-image dimension (500–6,000 px in the logic layer; the workspace slider is 600–6,000 px).
- Optional supported-image grayscale conversion with an explicit color-loss warning.
- Optional best-effort target size per PDF in KiB or MiB. Target mode tries the selected settings first, then a bounded ladder of lower image quality/resolution. Every result states **target reached** or **target not reached** with exact sizes.
- A visible warning when the current settings can soften scans, screenshots, fine lines or photo detail. ICC-based JPEG conversion and grayscale color loss are also disclosed.
- Custom output filename per PDF, batch-unique final filenames and a custom ZIP filename.
- Dedicated Web Worker processing with overall/file progress, elapsed time and termination-based cancellation. Completed files remain downloadable after cancellation or a later file failure.
- Per-entry compression errors with “Retry this PDF”; one failed ready file does not erase successful results.
- Original size, compressed size, exact saved bytes through the UI size display and savings percentage for each PDF and for completed batch totals.
- Reopen-validation before download, followed by individual PDF downloads and a locally created stored ZIP for two or more successful results.
- Selected-file original vs compressed first-page preview comparison.
- Result invalidation when compression settings materially change, so an old output is not presented as though it used the new settings.
- A complete mobile workflow with a sticky Compress/Cancel/View-results action.

Configured local safety limits:

| Limit                            |       Value |
| -------------------------------- | ----------: |
| Files per batch                  |          20 |
| Size per PDF                     |      50 MiB |
| Total batch input                |     100 MiB |
| Pages per PDF                    |       1,000 |
| Ready pages per batch            |       2,000 |
| Generated PDF bytes retained     |     128 MiB |
| Decoded stream cap               |      64 MiB |
| Embedded-image side cap          |  12,000 px  |
| Embedded-image pixel cap         | 24,000,000  |
| Target-size minimum / maximum    | 1 KiB / 50 MiB |

## 3. Compression engine and fidelity model

The engine deliberately compresses a document **in place** instead of copying selected pages into a new document or turning pages into flattened page images.

Implemented transformations:

1. **Supported embedded-image recompression**
   - 8-bit DCTDecode JPEGs in DeviceRGB, DeviceGray, CalRGB, CalGray and ICCBased color spaces with a verified 1- or 3-component profile.
   - 8-bit unfiltered or single-filter FlateDecode DeviceRGB/DeviceGray raster samples.
   - PNG/TIFF Flate predictors 1, 2 and 10–15 are explicitly reversed before samples reach the image codec.
   - A JPEG replacement is accepted only when the encoded image pair saves more than `max(128 bytes, 2%)`.
   - JPEG SOF markers are parsed and validated before dimensions/color space are written back.
   - A single-owner, equal-dimension grayscale `SMask` is resized with its base image when dimensions change.
   - ICC-based JPEGs become standard DeviceRGB/DeviceGray JPEGs after browser decoding/re-encoding; color-critical work must be reviewed.

2. **Conservative skipping**
   - Unsupported filters, custom Decode arrays, alternate/OPI images, color-key masks, stencil masks, shared masks, `Matte`, unsupported bit depths/color spaces, tiny images and images outside the pixel/dimension caps stay unchanged.
   - CMYK JPEG image data, JPX/JBIG2/CCITT data and raw ICCBased raster samples are not lossy-converted by this engine.

3. **Lossless stream recompression**
   - Unfiltered and single-filter FlateDecode streams may be deflated again only when they save more than `max(64 bytes, 0.5%)`.
   - XRef/object streams, external streams and DCT/JPX/JBIG2/CCITT streams are excluded.
   - Other filter chains are left alone rather than decoded through an unbounded path.
   - Result PDFs are saved with object streams enabled.

4. **Target-size attempts**
   - Without a target, one attempt uses the selected settings.
   - With a target, up to five bounded attempts use image-dimension factors `1`, `0.82`, `0.64`, `0.48`, `0.34` and quality reductions `0`, `0.08`, `0.17`, `0.27`, `0.38`, floored at 28% quality and 700 px.
   - The smallest valid candidate is retained. `stats.attempts` reports the actual number tried.

5. **Validation and no-growth rule**
   - Each candidate is reopened and checked for a PDF signature, unencrypted state, identical page count and identical page width/height/rotation for every page.
   - Detected attachment, form, outline and layer presence must not disappear during validation.
   - If an image attempt fails validation, a structural-only attempt is tried.
   - The original bytes are returned unchanged unless the best validated rewrite saves at least `max(128 bytes, 0.2%)`.
   - Page order is never rearranged, and text/vector content is not rasterized.

Digitally signed PDFs and dynamic XFA forms are blocked rather than silently rewritten.

## 4. Privacy and memory safety

- File bytes are read through the browser File API and transferred to a dedicated module Web Worker. No PDF, file name, password, setting or result is sent to QUICKKIT or a third party by the tool implementation.
- Previews use the existing local PDF.js canvas path and same-origin generated PDF.js assets.
- Object URLs for thumbnails, result previews, PDFs and ZIPs are tracked and revoked when replaced, removed, reset or unmounted.
- Worker cancellation terminates the active worker; a new worker is created lazily for later work.
- Flate decoding for image samples and lossless stream recompression uses a capped streaming `DecompressionStream` path. Image decoding is capped from expected dimensions, and generic stream decoding is capped at 64 MiB before concatenation completes.
- The real 12,608 × 16,806 px (about 212-megapixel) corpus case is outside the supported-image caps and is preserved rather than decoded as an unbounded raster.

## 5. Error handling covered

Clear paths are implemented and tested for:

- Empty, non-PDF, renamed/non-PDF-signature, corrupt and unsupported files, with rejected files named.
- Files over 50 MiB and batches over count, total-byte or page limits.
- Exact duplicate PDFs.
- Password-required, wrong-password and unsupported-encryption failures.
- Digitally signed PDFs and dynamic XFA forms.
- Invalid quality, image-dimension and target-size settings.
- Browser image-codec or stream-compression unavailability.
- Per-file engine failure with retry while preserving other successful results.
- Cancellation during a multi-file run.
- Results becoming stale after compression settings change.
- A target size that cannot be reached without unsafe or non-image transformations.

## 6. Automated coverage added

Unit and engine tests:

- `tests/pdf-compress-logic.test.ts` — presets, custom-setting normalization/rejection, binary target parsing, target ladder, queue limits, filename sanitization/uniqueness, savings formatting, signed/XFA blockers, fidelity warnings and the 24-megapixel cap.
- `tests/pdf-compress-engine.test.ts` — JPEG SOF parsing, capped Flate inflation, predictor reversal, source-nonmutating analysis, raster recompression with text/order/geometry/rotation preservation, ICC-based JPEG support, structural fallback, impossible target, encrypted input to unencrypted output, signed/XFA rejection and invalid bytes.
- `tests/tools/pdf-compress-fixtures.ts` — deterministic noise-PNG, image-heavy and repeated-text PDF fixtures.
- Catalog and launch-gate tests now expect nine tools, three PDF Tools and 13 launch-gated sitemap routes.

Permanent browser tests in `tests/e2e/pdf-compressor.spec.ts` verify:

1. Batch compression with previews, custom settings/names, exact savings, validated individual PDF and ZIP downloads, geometry/rotation/text checks, comparison preview, Axe and no non-GET interaction requests.
2. Wrong/correct password handling and a smaller validated unencrypted download.
3. An impossible 1 KiB target, honest “target not reached” reporting and stale-result clearing after a setting change.
4. Corrupt/non-PDF naming, exact-duplicate marking and preservation of valid queued PDFs.
5. Signed-like and XFA-like fixture blocking.
6. A complete 390 px mobile workflow with sticky action and no horizontal overflow.
7. Cancellation of a large batch with unfinished PDFs left ready to retry.

## 7. Tests actually executed

The sandbox browser used the locally extracted Sparticuz Chromium at `/tmp/chromium`, `LD_LIBRARY_PATH=/tmp/al2023/lib` and a temporary `playwright.local.config.ts`. The temporary browser config and temporary real-corpus/debug/capture specs were removed after execution; they are not part of the committed suite.

| Command | Result |
| --- | ---: |
| `npx vitest run tests/pdf-compress-logic.test.ts tests/pdf-compress-engine.test.ts --reporter=dot` | **21 passed** in the final Compressor test files |
| `LD_LIBRARY_PATH=/tmp/al2023/lib npx playwright test --config=playwright.local.config.ts tests/e2e/pdf-compressor.spec.ts tests/e2e/pdf-merger.spec.ts tests/e2e/pdf-splitter.spec.ts --reporter=list` | **17 passed** |
| Temporary real-corpus Chromium harness | **10 passed** |
| `npm test -- --reporter=dot` | **153 passed** |
| `LD_LIBRARY_PATH=/tmp/al2023/lib npx playwright test --config=playwright.local.config.ts --reporter=list` | **178 passed** |
| `npm run build` | Passed; 21 static pages including `/tools/compress-pdf` |
| `npm run format:check` | Passed |
| `npm run lint` | Passed with no warnings |
| `npm run typecheck` | Passed |
| `npm audit --omit=dev` | **0 vulnerabilities** |
| `git diff --check` | Passed |

The full Chromium suite increase from the previous 161 tests is exact: 7 new PDF Compressor workflows plus 10 quality/overflow cases for the new route. Firefox and WebKit include `pdf-compressor.spec.ts` in `playwright.config.ts`, but those browser binaries were unavailable in this sandbox and are **not claimed as executed**.

## 8. Real-file Chromium QA

### Corpus

Inputs came from Mozilla's PDF.js test corpus, sparse-checkout commit `0a4153349dc473ba950fc17941c5ca7eda43c1de`. They were kept outside this repository under `/tmp/quickkit-compressor-qa/inputs/`; no third-party PDF is committed.

Each case was uploaded through the production Compressor UI in Chromium. The downloaded output was independently reopened with `@cantoo/pdf-lib`; page count and every page's width, height and rotation matched the input, the output was unencrypted, and output bytes were never greater than input bytes. Elapsed time is the browser workflow time recorded by the temporary harness, not a promise of device performance.

| Input | Preset | Pages | Input bytes | Output bytes | Saving | Browser workflow |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| `images.pdf` | Medium | 1 | 1,494,439 | 298,325 | 80.038% | 2,509 ms |
| `issue3188.pdf` | High | 1 | 8,125,374 | 2,299,952 | 71.694% | 2,436 ms |
| `freeculture.pdf` | Medium | 352 | 2,598,727 | 2,490,732 | 4.156% | 3,026 ms |
| `22060_A1_01_Plans.pdf` | High | 1 | 6,264,322 | 3,176,792 | 49.288% | 3,519 ms |
| `issue12841_reduced.pdf` | Maximum | 1 | 5,852,805 | 5,852,805 | 0% — original retained | 1,324 ms |
| `S2.pdf` | Medium | 1 | 478,490 | 395,011 | 17.446% | 1,236 ms |
| `cmykjpeg.pdf` | Maximum | 1 | 374,080 | 298,050 | 20.325% | 1,121 ms |
| `colorkeymask.pdf` | Maximum | 1 | 161,533 | 3,188 | 98.026% | 1,006 ms |
| `canvas.pdf` | Medium | 2 | 150,904 | 102,822 | 31.863% | 1,333 ms |
| `issue19517.pdf` | Maximum | 1 | 6,262,577 | 6,262,577 | 0% — original retained | 1,527 ms |

### Corpus input hashes

| Input | SHA-256 |
| --- | --- |
| `22060_A1_01_Plans.pdf` | `bd0203ede39cfe101c7d1ea6555e1c9fc408247627a47de549ebf2590f1b887b` |
| `S2.pdf` | `57d874f2760ded2b70eb58b7b5e31df407d5641b7225576b77458b5dc5009543` |
| `canvas.pdf` | `3548b2605bef8ff9656efe8ef8fd94814dfbcf94f547c7d1ff8603e8a46cef6b` |
| `cmykjpeg.pdf` | `659d6b19912f63db988b0b26b9bde0e6d8100667ef162051a4a84ea8e5b90272` |
| `colorkeymask.pdf` | `655a470881a3bc4fac682abe88522c86c11ff41d08ecf94fae2f53ecd0c2d27c` |
| `freeculture.pdf` | `753441c619c529c8d0fc3e7e470f07c9547838fc7229bea8c1dcf854acee03b4` |
| `images.pdf` | `f7a44ca650d951cfea007440cda297dabbf2cf0c8f77a948a580cc0e99496725` |
| `issue12841_reduced.pdf` | `0edad3c5bafa7f778580d838385830610423845ae26d4a93c1ef15dd60b6edcb` |
| `issue19517.pdf` | `908c133880c7148864102eab517224d524cdd32769d2ae0f1e6d69e75a0471d6` |
| `issue3188.pdf` | `6245a949d6d7418620b0683e2ff44852628d51d484598baaa677839f0172d27b` |

### Real-file observations

- `images.pdf`: 2 of 5 structurally supported base images were recompressed. The other supported graphics were already smaller as lossless Flate data than the proposed JPEG replacements, so they were correctly kept.
- `issue3188.pdf`: 78 images were recompressed and 4 streams were losslessly recompressed, reducing a 224-image scanned/image-heavy page by 71.694%.
- `freeculture.pdf`: 352 pages stayed in order and at the same geometry. One ICC-based JPEG and 34 lossless streams produced a modest 4.156% saving; many small grayscale JPEGs were already below the proposed Medium-quality replacement size.
- `22060_A1_01_Plans.pdf`: 6 images were recompressed and 2 streams were losslessly recompressed. An extracted original plan image was 2,480 × 2,630 px; the High output was 1,697 × 1,800 px. Visually inspected linework and annotations remained aligned and readable at QA viewing scale, subject to the product warning to proof drawings at 100–200%.
- `issue12841_reduced.pdf`: its reduced embedded JPEG has invalid SOS/premature-end characteristics. Chromium's image decoder rejects it, so the engine safely retained the exact original bytes. This is intentional conservative behavior for a deliberately reduced regression fixture.
- `S2.pdf` and `cmykjpeg.pdf`: no image was lossy-recompressed, but lossless stream recompression produced 17.446% and 20.325% savings without converting CMYK image data.
- `colorkeymask.pdf`: color-key image data stayed losslessly represented; deflating its large uncompressed stream produced the 98.026% saving.
- `issue19517.pdf`: JPX/RunLength image data and dimensions beyond the safety caps were not decoded for lossy compression. The exact original was retained.

The Firefox logo image extracted from the `images.pdf` output was visually clean, with smooth gradients and no obvious block corruption at QA viewing scale. This visual check is not a print-proof claim; the UI and FAQs instruct users to inspect important results at reading zoom.

## 9. Issues found and fixed during QA

1. **Private pdf-lib field:** initial TypeScript compilation exposed use of private `PDFBool.value`; the engine now uses `PDFBool.asBoolean()`.
2. **Target attempt count:** an impossible-target test found `stats.attempts` reporting the winning attempt instead of attempts actually run. The engine now tracks `attemptsRun`.
3. **Tool icon integration:** adding `pdfCompress` exposed the separate `ToolIcon` map; `Shrink` is now registered there as well as in the homepage catalog.
4. **ZIP Blob typing:** stored-ZIP bytes are copied into a standalone `ArrayBuffer` before Blob creation.
5. **Catalog search:** the compressor keywords now contain the contiguous phrase “shrink target size,” matching the existing phrase-search behavior.
6. **Axe contrast:** persistent Compressor preview placeholders failed `color-contrast` at `#7c739f`. Compressor placeholders now use `#5d5485` without changing Merger/Splitter styling.
7. **Password-clear notice:** the notice was stored on an entry but rendered only inside the password form, so it disappeared after a successful result. It is now rendered for non-password states too.
8. **Flate memory safety:** generic stream and raster-sample decoding no longer use unbounded `decodePDFRawStream` for Flate data. Capped streaming inflation and filter restrictions were added, with a unit test for exact-cap and over-cap behavior.
9. **Real-photo pixel cap:** a genuine 5,280 × 3,792 px (20.02-megapixel) JPEG fell just over the initial cap. The PDF image cap now matches QUICKKIT's existing 24-megapixel image limit.
10. **ICC-based JPEGs:** the first real run left the Ghostscript/ICC plan PDF unchanged. Verified 1-/3-component ICCBased **DCTDecode** images are now supported through the browser JPEG codec; raw ICC raster samples remain skipped. The plan case improved from 0% to 49.288% saving.
11. **Image-byte accounting:** analysis initially excluded mask-stream bytes while the UI count included mask image objects. Analysis now counts all image-object bytes, and result-stat accounting includes resized-mask deltas.
12. **Test-only corrections:** a Compressor browser assertion initially expected badge text “Custom settings” instead of the actual “Custom”; an ICC fixture initially looked up an embedded image before `await image.embed()`. No product behavior was weakened for either test correction.

## 10. Bundle measurements

Measured from the production build used for QA. Turbopack chunk boundaries are generated; labels identify the principal chunks by their Compressor/UI/engine string markers rather than claiming an exact module-to-chunk accounting.

| Asset | Raw | Gzip |
| --- | ---: | ---: |
| Compressor workspace-associated chunk | 44,914 bytes | 12,661 bytes |
| Compressor engine-associated chunk | 45,433 bytes | 15,068 bytes |
| Worker hook-associated chunk | 30,819 bytes | 10,948 bytes |
| Compressor worker bootstrap media | 3,950 bytes | 1,434 bytes |
| Shared PDF/pdf-lib chunk | 606,512 bytes | 255,415 bytes |
| Lazy PDF.js main chunk | 455,544 bytes | 135,240 bytes |
| PDF.js worker | 1,264,342 bytes | 375,847 bytes |

The heavy PDF engine and PDF.js preview code remain route/worker-lazy rather than part of the ordinary text-tool workflow.

## 11. Visual and accessibility review

Screenshots in this directory were captured from the production build with deterministic generated PDFs:

- `01-empty-desktop.png` — 1440 × 1000 empty state, privacy banner and dropzone.
- `02-queue-settings-desktop.png` — full desktop queue, previews, presets, custom controls, target/ZIP settings and warnings.
- `03-results-compare-desktop.png` — full desktop results, exact savings, comparison preview, ZIP and individual downloads.
- `04-queue-mobile.png` — 390 × 844 queue entry, output name, result summary and sticky action.
- `05-compare-mobile.png` — 390 × 844 original/compressed preview comparison and sticky action.

Automated quality coverage includes Axe WCAG 2 A/AA, 2.1 AA and 2.2 AA checks on empty and populated Compressor states, route overflow checks from 320 px through 1440 px, the complete 390 px sticky-action workflow and keyboard-visible controls supplied by native inputs/buttons.

## 12. Known fidelity limits

PDF Compressor does not promise:

- A smaller result for every PDF. Efficient text/vector files, already-optimized JPEGs and unsupported image encodings may retain the original.
- Recovery of quality already lost in the source or print-perfect quality after lower JPEG quality/resolution.
- Preservation of a source ICC profile after a supported ICC-based JPEG is converted to DeviceRGB/DeviceGray.
- Lossy conversion of CMYK JPEGs, JPX/JBIG2/CCITT images, raw ICCBased samples or unsafe transparency models.
- PDF/A, PDF/UA or tagged-PDF conformance after rewriting.
- Digital-signature validity; signed files are blocked.
- Dynamic XFA behavior; XFA files are blocked.
- Perfect preservation of every script/action, layer state, attachment behavior, form calculation/appearance, annotation, bookmark destination, XMP field or other advanced PDF feature after an in-place rewrite. The UI and FAQs tell users to check important outputs and keep originals.
- Re-encryption of a smaller result. A validated rewrite of an encrypted input is unencrypted; if the exact original is retained, the UI says so and its protection remains.
- Support for every malformed embedded JPEG that a tolerant PDF renderer may display but the browser image decoder rejects.

## 13. Owner-review decision required

Please review the live preview, screenshots and this report. Until explicit owner approval is recorded:

- Status remains **implemented — awaiting owner approval**.
- Do not merge PDF Compressor into `main`.
- Do not deploy or index it.
- Do not start a fourth PDF tool.
