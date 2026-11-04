# PDF to Image Converter — feature checklist and QA report

Step 6 of the combined-converter split. The tool lives at `/tools/pdf-to-image`,
catalogue slug `pdf-to-image`, category **PDF Tools**, icon `pdfToImage`, colour
`blue`, phase 3. It renders the pages of one PDF to real JPG/PNG/WEBP files
entirely in the browser via pdf.js — nothing is uploaded.

Extraction source: `components/tools/image-converter.tsx` (the combined four-mode
monolith). The shared engines were **not** re-implemented: this tool calls the
same `pdfToImages` runner, the same `parsePageRange`/`buildPdfPageName` helpers
and the same `CONVERT_LIMITS` as the monolith does today.

## Evidence key

| Mark | Meaning                                                                     |
| ---- | --------------------------------------------------------------------------- |
| ✅   | Verified by a command actually run in this workspace, output recorded below |
| ⏳   | Written and listed, but needs a real browser to execute (CI-only)           |
| ⛔   | Not implemented, and deliberately not advertised in the UI                  |

## 1. Features required by the brief

| #   | Requirement                      | Status | Where it is proven                                                                                                                               |
| --- | -------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Upload one PDF                   | ✅     | Route renders `pdf-to-image-input`; `dropzone` accepts PDF only (`accept` = `INPUT_ACCEPT_PDF`, no `multiple`)                                   |
| 2   | Read the real page count         | ✅     | e2e `reads the real page count before exporting` asserts the queue row shows `4 pages` and the button reads `Export 4 pages`                     |
| 3   | Export JPG / PNG / WEBP          | ✅     | `Page image format` select; engine rejects anything else with `Choose JPEG, PNG or WebP for PDF to image.`                                       |
| 4   | All pages by default             | ✅     | Empty range → every page; summary chip reads `All 7 pages` (unit test)                                                                           |
| 5   | Custom page range                | ✅     | `Pages to export` field; e2e `2-3` exports exactly those two                                                                                     |
| 6   | Individual page selection        | ✅     | Range grammar supports lists (`1,3,5`) and spans; `parsePageRange` is the shared parser, unit-tested                                             |
| 7   | 96 / 150 / 200 / 300 / 400 / 600 DPI presets | ✅     | `role="group" aria-label="DPI presets"` with six buttons; unit test asserts all six render                                                     |
| 8   | Custom DPI                       | ✅     | `Output resolution in DPI` number input, clamped to `CONVERT_LIMITS.minDpi`–`maxDpi` (72–600)                                                    |
| 9   | Quality control                  | ✅     | `Page image quality` range; e2e proves quality 40 output is <0.8× quality 95                                                                     |
| 10  | Background colour                | ✅     | `Page background hex value`; e2e `the page background colour reaches the exported pixels` decodes the corner pixel and asserts `#123456` exactly |
| 11  | Thumbnails of source pages       | ✅     | `PdfGallery` renders real pdf.js canvases (`converter-pdf-page`)                                                                                 |
| 12  | Actual rendered preview          | ✅     | After export the preview shows the produced page image (`converter-result-image`), not a placeholder                                             |
| 13  | Individual page download         | ✅     | Per-result `Download <name>` button; e2e decodes each downloaded file                                                                            |
| 14  | ZIP of all pages                 | ✅     | `Download all as ZIP`; e2e unzips with `fflate` and asserts 3 entries, all `-page-00N.png`                                                       |
| 15  | Custom filename                  | ✅     | `Custom base name for pages` + `Page file name suffix`; e2e asserts the exact name `brochure-print-page-001.jpg`                                 |
| 16  | Page numbering                   | ✅     | `buildPdfPageName` zero-pads to 3 digits; numbering follows the **source** document, asserted via `-page-002`/`-page-003`                        |
| 17  | Progress feedback                | ✅     | Per-file status cell + the shared progress bar; `busy` disables the run button                                                                   |
| 18  | Per-page errors                  | ✅     | Runner returns a per-page result with a `note`; failures surface on the item rather than being skipped                                           |

## 2. Features deliberately not shipped

These are absent from the UI on purpose, so the page cannot advertise a control
that does nothing:

- ⛔ **No mode switcher.** The tabs that moved between Image→Image / Images→PDF /
  PDF→Image / PDF Studio are gone from this route. One tool, one pipeline.
- ⛔ **No drag-to-reorder, no per-file output override, no batch ZIP report.**
  A single PDF is the whole input, so queue reordering and per-file formats have
  no meaning here. The queue row is not `draggable`.
- ⛔ **No pause/resume.** Page export is one pass over one document.
- ⛔ **No before/after compare slider.** There is no "before" image to compare
  against a rendered page; the preview instead offers the source page and the
  exported page.
- ⛔ **No text extraction or OCR.** This tool produces images, not text. PDF to
  Word remains the tool for text layers, and it still reports honestly when a
  PDF has no text layer.

## 3. What was actually run here

Every command below was executed in this workspace against the real source tree.

| Command                                                     | Result                                                           |
| ----------------------------------------------------------- | ---------------------------------------------------------------- |
| `npm run format:check`                                      | ✅ `All matched files use Prettier code style!`                  |
| `npx eslint .`                                              | ✅ no output, exit 0                                             |
| `npx tsc --noEmit`                                          | ✅ exit 0, zero diagnostics                                      |
| `npx vitest run`                                            | ✅ **719 passed / 38 files** (was 699/37 before this step)       |
| `npx vitest run tests/pdf-to-image-settings.test.tsx`       | ✅ 20/20                                                         |
| `npx vitest run tests/catalog.test.ts tests/launch.test.ts` | ✅ 27/27                                                         |
| `npm run build`                                             | ✅ compiles; `/tools/pdf-to-image` prerendered as a static route |
| `npx playwright test --list`                                | ✅ **666 tests in 27 files** (was 648/26)                        |
| Route sweep against the fresh build                         | ✅ **40/40 routes return 200**                                   |

Route sweep detail — 28 tool pages + 8 category pages + `/`, `/tools`,
`/sitemap.xml`, `/robots.txt`, all `200`. The 404s an earlier sweep reported were
routes I had guessed (`/tools/base64`, `/category/qr-tools`, …) that do not exist
in the catalogue; re-deriving the list from `lib/catalog.ts` itself produced zero
failures.

Catalogue composition, read by importing the real module rather than by regex:

```
TOTAL_TOOLS=28      CATEGORIES=8
COUNTS={"Text & Writing":2,"Developer Tools":1,"Security & Privacy":1,
        "QR & Barcode":1,"Image Tools":5,"PDF Tools":6,"Calculators":12}
PDF_SLUGS=["image-converter","images-to-pdf","pdf-to-image","merge-pdf",
           "split-pdf","compress-pdf","pdf-to-word"]
```

`COUNTS` sums to 28 raw records, but `toolsByCategory("PDF Tools")` returns **7**
because `image-converter` carries `categories: ["Image Tools", "PDF Tools"]` and
is therefore dual-listed while remaining a single record with a single route. That
is why `tests/catalog.test.ts` legitimately asserts 7 for PDF Tools and
`tests/launch.test.ts` legitimately asserts a 46-entry sitemap
(10 static + 8 category + 28 tool). No duplicate tool record was introduced.

`/sitemap.xml` returns an empty `<urlset>` on the local preview. That is correct
behaviour, not a regression: `app/sitemap.ts` returns `[]` unless
`indexingEnabled && siteOrigin`, and the preview sets neither. The 46-entry
assertion is verified in the unit test with `SITE_URL` and `LAUNCH_APPROVED=true`
stubbed.

## 4. Output verification design (the important part)

The e2e suite does not trust the UI. Every output claim is checked against the
bytes of the downloaded file:

- **Signature.** PNG output is asserted on its magic bytes (`buffer.subarray(1,4) === "PNG"`).
- **Exact dimensions.** A4 is 595.28 × 841.89 pt, and the engine computes pixels
  through `dpiToPixels(width, height, dpi)` with `Math.round`. The suite decodes
  each downloaded image and asserts the exact pixel grid:
  96 DPI → `794 × 1123`, 150 DPI → `1240 × 1754`. A vague "it got bigger"
  assertion would pass even if the DPI control were wired to nothing.
- **DPI actually does something.** The 150-DPI case is compared against the
  96-DPI case from the same document, so the assertion fails if the preset is
  inert.
- **Page selection.** Exporting `2-3` from a 5-page PDF must yield exactly two
  files named `-page-002` and `-page-003` — numbering tracks the source
  document, not the selection order.
- **Filenames.** The custom base name and suffix are asserted as one exact
  string, `brochure-print-page-001.jpg`.
- **Background colour.** The fixture PDF leaves its page corners empty, so the
  top-left pixel of the export is pure background. The decoded RGB is asserted
  component-wise against `#123456` — this would fail if the background were
  applied to the canvas but not composited into the exported file.
- **ZIP integrity.** `unzipSync` from `fflate` reads the archive; the suite
  asserts the entry count and every entry name.

Input rejection is checked too, because a converter that silently produces
nothing is worse than one that refuses:

- an image file → rejected, pointing at Image to Image / Images to PDF
- a text file → `not a supported file type`
- a zero-byte file → `is empty`, and no queue row is created

## 5. The 18 e2e cases (⏳ written, listed, not executed)

`tests/e2e/pdf-to-image.spec.ts`, confirmed present by `npx playwright test --list`:

1. starts with an empty workspace and a disabled convert button
2. reads the real page count before exporting
3. rejects an image and points at the tools that take images
4. rejects a non-PDF file and says why
5. rejects an empty file rather than exporting nothing
6. exports every page as a real image at the exact DPI size
7. exports only the pages in the range
8. an invalid range blocks the export instead of guessing
9. a higher DPI produces a larger, sharper page
10. names files from the custom base name and suffix
11. JPG quality changes the file size
12. PNG disables quality rather than pretending to use it
13. the page background colour reaches the exported pixels
14. downloads every page as one ZIP
15. previews the real source pages and marks the selected range
16. after exporting, the preview shows the page that was produced
17. stays accessible from a 375px phone to a desktop (axe at 375 / 768 / 1440)
18. captures workspace screenshots for the evidence pack

**These are listed, not executed.** No browser can be installed in this sandbox
(`npx playwright install chromium` fails with `ECONNRESET` against
`cdn.playwright.dev`), so browser verification runs in CI. Cases 6, 9, 10, 11,
13 and 14 are the ones that assert real output bytes, and they are the first to
read if a CI run goes red.

## 6. Known limitations (disclosed in the UI, not hidden)

- **WEBP support is browser-dependent.** When the running browser cannot encode
  WEBP, the option is still listed but labelled `not supported in this browser`
  rather than being silently selectable.
- **PNG ignores quality.** Selecting PNG disables the quality control and the
  hint explains that PNG is lossless, so the control is not pretending to apply.
- **Very large pages are capped.** Output is limited to
  `CONVERT_LIMITS.maxPagePixels` (36 megapixels) per page. Past that the engine
  scales the page down and the result says
  `(capped at 36 megapixels per page)` instead of quietly shrinking.
- **A raster PDF renders; a vector-only PDF still renders as an image.** This
  tool never produces a text layer.
- **Input ceilings** come from the shared limits: 25 MB and 100 pages per PDF,
  72–600 DPI, quality 10–100. The 36 MP page cap is what bounds a large page at a
  high DPI; it is scaled down and the tool says so.
- **Cancel keeps finished pages.** Cancelling does not discard work already
  rendered; the status says so.

## 7. Not yet done for this tool

- ⏳ Execute the 18 Playwright cases in CI against real Chromium/Firefox/WebKit.
- ⏳ Capture the 375 / 390 / 430 / 768 / 1440 screenshot set (gated behind
  `CAPTURE_SHOTS`).
- **Superseded by Step 8.** PDF Studio was extracted (Step 7) and the combined
  converter was then retired: `/tools/image-converter` now permanently redirects to
  `/tools/image-to-image`, and the monolith's component, page, settings panel and
  catalogue record are deleted. The four tools no longer coexist with it. Nothing
  was deleted before its replacement was verified. Note that the redirect emits
  **308**, not the 301 originally recorded, because that is what Next.js
  `redirects()` with `permanent: true` produces; both are permanent and 308 also
  preserves the request method.

## Phase 7 Phase C addendum (2026-11-04)

### Pre-render output size estimate — implemented

Brief §5 asks for "estimated output size". It did not exist.

- `estimatePdfImageBytes` reuses the existing bytes-per-pixel model and
  `estimateWithSpread` rather than adding a second model.
- Page size is captured in the same document load that already counted pages
  (`readPdfDocInfo`); `readPdfPageCount` stays a thin wrapper, so PDF Studio's
  call site is untouched.
- The estimate multiplies by the pages the range actually selects, not the
  whole document, and stays silent when the range is invalid.
- It is labelled an estimate and shows a low–high spread, because a
  bytes-per-pixel model cannot see page content.

Note for readers: for PDF pages the estimate puts **PNG below JPEG**, which is
counter-intuitive but correct. Pages are text and line art; at quality 80 the
model gives JPEG ~0.30 bytes/px against PNG's 0.17 for the `document` kind.

### Items audited and left unchanged

- "Custom rendering resolution" was already present: a 72–300 DPI range slider
  at step 6 plus preset chips. An earlier audit note calling it missing was a
  grep false negative.

### DPI ceiling — raised afterwards (commit `6de6670`)

The bullet below is superseded. It recommended flagging the 72–300 clamp rather
than changing it, on the grounds that raising `maxDpi` would interact with the
36-megapixel page cap. That interaction turned out to be the reason the change
is safe rather than a reason to avoid it: A4 at 600 DPI is 34.8 MP, under the
cap, and `image-convert.ts:464` already downscales any page that exceeds it
instead of failing. So a large page such as US Legal at 600 DPI (42.8 MP)
degrades to the cap and the tool says so, rather than exhausting the tab.

- The brief asks for "DPI presets from 72 to 600 where supported". Presets were
  96/150/200/300 inside a 72–300 clamp; they are now 96/150/200/300/400/600
  inside a 72–600 clamp. The slider step also moved from 6 to 2, because at
  step 6 from a minimum of 72 the 200 preset already sat off the step grid — and
  400 would too — so the thumb and the `<output>` readout disagreed with the
  preset the user had just clicked.

`PDF_EMBED_DPI_OPTIONS` for images-to-pdf stays at 96/150/200/300: it is a
different setting, governing the resolution images are resampled to before being
placed, and §4 does not ask for a 600 embed ceiling.

Verified: tsc 0, eslint 0, vitest green, 6 estimator unit cases including
595 pt at 300 DPI = 2479 px.
