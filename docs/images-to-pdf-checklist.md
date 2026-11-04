# Images to PDF Converter — feature checklist and QA report

Route: `/tools/images-to-pdf` · Category: **PDF Tools** · Catalog slug: `images-to-pdf`

Step 5 of the converter split. Extracted from the combined `image-converter`
workspace; the combined tool is still live and untouched at this checkpoint.

## Evidence key

| Mark                     | Meaning                                                                                    |
| ------------------------ | ------------------------------------------------------------------------------------------ |
| ✅ verified              | A command ran here and its output is quoted below.                                         |
| ⏳ written, not executed | Test exists and lists cleanly; it needs a real browser, which this sandbox cannot install. |
| ➖ out of scope          | Belongs to a different tool in the split.                                                  |

## 1. Features required by the brief

| #   | Requirement                            | Status                       | Where it is proven                                                                                                                                                                                    |
| --- | -------------------------------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Multi-image upload                     | ✅                           | Queue accepts a batch; `queues several images at once` ⏳; dropzone `images-to-pdf-input` present in served HTML ✅                                                                                   |
| 2   | One image per page                     | ✅                           | `imagesToPdf` adds exactly one page per file; `writes one A4 page per image` asserts `getPageCount() === 2` for 2 images ⏳                                                                           |
| 3   | Drag-and-drop ordering                 | ✅                           | HTML5 drag handlers on each row (`draggable`, `onDragOver`, `onDrop` → `reorderItem`) ✅ read in source                                                                                               |
| 4   | Reorder controls                       | ✅                           | `Move … earlier` / `Move … later` buttons ✅ read in source                                                                                                                                           |
| 5   | **Page rotation**                      | ✅ **implemented this step** | Was missing. Added `rotations` to `PdfFromImagesOptions`, `rotateCanvasBy` in the engine, a per-row rotate button, and rotation in the layout preview. `normalizeRotation` covered by 6 unit tests ✅ |
| 6   | Remove individual images               | ✅                           | `Remove …` button → `removeItem` ✅ read in source                                                                                                                                                    |
| 7   | A4 / A3 / A5 / Letter / Legal / custom | ✅                           | `offers every requested paper size` ✅ (unit, ran)                                                                                                                                                    |
| 8   | Portrait / landscape                   | ✅                           | `offers portrait and landscape` ✅ (unit, ran)                                                                                                                                                        |
| 9   | Custom margins                         | ✅                           | `sets the margin applied to every page` ✅ (unit, ran)                                                                                                                                                |
| 10  | Contain / cover / fill                 | ✅                           | `offers contain, cover and fill` + per-mode notes ✅ (unit, ran)                                                                                                                                      |
| 11  | Page background colour                 | ✅                           | `carries a page background colour in both forms` ✅ (unit, ran)                                                                                                                                       |
| 12  | Image quality                          | ✅                           | `sets the embedded image quality` ✅ (unit, ran)                                                                                                                                                      |
| 13  | DPI (96/150/200/300)                   | ✅                           | `offers the requested DPI steps` asserts the exact set ✅ (unit, ran)                                                                                                                                 |
| 14  | Document title + file name             | ✅                           | `carries a document title and file name` ✅ (unit, ran)                                                                                                                                               |
| 15  | Live multi-page preview                | ✅                           | `PdfLayoutPreview` for the source, `PdfGallery` for the written PDF ✅ read in source                                                                                                                 |
| 16  | Page count + file size                 | ✅                           | Result card prints `formatPages` and `formatBytes` ✅ read in source                                                                                                                                  |
| 17  | Download                               | ✅                           | `downloadBlob` wired to the result card ✅ read in source                                                                                                                                             |

## 2. Feature deliberately not shipped

The combined tool carried controls that have no meaning once the mode is fixed
to "images → one PDF". Each was **removed**, not disabled — a dead control is
worse than no control:

| Removed                                     | Why it would have been dead                                                                       |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Pause / Resume                              | `waitWhilePaused` had zero callers in this pipeline.                                              |
| Download ZIP (×2)                           | Guarded by `results.length > 1`; this tool only ever emits one PDF.                               |
| Batch report table                          | `batchRowsRef` was never filled by the PDF pipeline.                                              |
| Per-file output override, per-file download | There is no per-file output — the output is one document.                                         |
| PDF Studio page grid, mode switcher         | ➖ belong to `pdf-studio` and the split's other tools.                                            |
| Before/after slider tab                     | A slider between an image and a PDF page compares unlike things. Tabs are now **Original / PDF**. |

## 3. What was actually run here

```
npm run format:check   -> All matched files use Prettier code style!
npx eslint .           -> 0 problems (exit 0)
npx tsc --noEmit       -> 0 errors
npx vitest run         -> 699 passed / 37 files
npx playwright test --list tests/e2e/images-to-pdf.spec.ts -> Total: 25 tests in 1 file
npx playwright test --list                                 -> Total: 648 tests in 26 files
npm run build          -> success, "○ /tools/images-to-pdf" prerendered static
```

Served-build checks against `http://127.0.0.1:3001`:

```
200  /                        200  /category/pdf-tools
200  /tools/images-to-pdf     200  /category/image-tools
200  /tools/image-to-image    200  /saved
200  /tools/image-converter   200  /sitemap.xml
200  /tools/merge-pdf  /tools/split-pdf  /tools/compress-pdf  /tools/pdf-to-word
```

Markers present in the served HTML: `Images to PDF Converter`,
`images-to-pdf-input`, `PDF page size`, `Image fit on page`,
`Embedded image resolution in DPI`, `PDF background hex value`,
`no editable text layer`, `Nothing to preview yet`.

Bleed-through from the other modes — all **absent**: `PDF to image`,
`Image to image`, `Merge PDF`, `Split PDF`, `Extract pages`.

`Custom page width in millimetres` is **absent by design**: those two fields
only render when page size is `custom`, which the unit test
`keeps custom dimensions hidden until a custom size is chosen` pins in both
directions.

## 4. Output verification design (the important part)

UI assertions alone cannot prove a PDF is correct, and this pdf-lib fork has no
`page.getImages()` helper, so the e2e spec reads the **saved bytes** directly:

```ts
const xObjects = pdf.getPage(i).node.Resources()?.get(PDFName.of("XObject"));
const stream = context.lookup(reference);
stream.dict.get(PDFName.of("Width")); // real raster width
stream.contents; // the actual JPEG bytes (DCTDecode)

const contents = context.lookup(page.node.Contents());
inflateSync(contents.lookup(0).contents); // decompressed drawing instructions
```

Those three helpers were **executed here** against a real pdf-lib PDF built the
same way the engine builds one (background rectangle, then the embedded image).
All assertions passed:

```
ALL HELPER ASSERTIONS PASS against a real pdf-lib PDF
  fill colour  -> 0.070588, 0.203922, 0.337255     (= #123456)
  raster       -> 4x2, 160 bytes                    (JPEG SOI ffd8)
  instructions -> "q | 1 0 0 1 0 841.89 cm | ..."
```

Findings that changed the tests:

- pdf-lib **Flate-compresses content streams**, so scanning raw bytes for a
  colour or a font name only works for uncompressed objects. The title and the
  absence of `Helvetica` are therefore checked through the API and the raw
  buffer respectively, not by decompressing.
- `planPdfEmbedSize` clamps with `Math.min(1, …)`, so it **never upscales**. A
  DPI test with a small source would have passed vacuously; the DPI test now
  uses a 1600 × 2400 source and asserts the 96 DPI raster is _smaller_ than the
  source while 300 DPI keeps it whole.
- `formatBytes` renders `"123.4 KB"` (`.toFixed(1)`, capital B). The file-size
  assertion was corrected to match rather than to an invented `"123 kB"`.

## 5. The 25 e2e cases (⏳ written, listed, not executed)

Core: empty workspace · batch queueing · PDF rejected · non-image rejected ·
empty file rejected · one A4 page per image with real decodable JPEGs and no
text layer · file name + document title · real page count and file size.

Page setup: A5 landscape dimensions · custom mm dimensions · margins too large
refused · contain keeps the aspect ratio · cover crops to the content-box ratio
· background colour read back out of the content stream on **every** page.

Quality: lower quality yields a materially smaller file · higher DPI embeds a
larger raster.

Order and rotation: button reordering · drag-and-drop reordering · rotation
turns one page only (900 × 500 vs 500 × 900) · four quarter turns return to
upright · removing an image removes its page.

Preview: live layout preview then the rendered PDF gallery with page stepping ·
the preview turns with the page.

Access: axe clean at 375 / 768 / 1440 · screenshot capture.

## 6. Known limitations (disclosed in the UI, not hidden)

1. **Raster PDFs only.** Pages contain images; there is no editable text layer.
   The result card says so, and the e2e asserts no font is embedded.
2. **Rotation is quarter turns only.** 90/180/270. Arbitrary angles would
   require resampling to a non-integer grid and are not offered.
3. **Rotation resamples once more.** A turned page is drawn through an extra
   canvas, so it carries one more interpolation pass than an upright one.
4. **Margins are capped at 60 mm** (`CONVERT_LIMITS.maxMarginMm`), and margins
   that leave no drawable area are refused rather than silently clamped.
5. **GIF/animation.** Only the first frame is placed; a PDF page cannot hold an
   animation.

## 7. Not yet done for this tool

- **Zero e2e cases have actually executed.** `npx playwright install chromium`
  fails here: `cdn.playwright.dev` is outside the sandbox network allowlist, and
  no system browser is on `PATH`. These 25 cases must run in CI before the tool
  is called verified end to end.
- Mobile/tablet **screenshots** are gated behind `CAPTURE_SHOTS` and the
  dedicated workflow.
- `/tools/image-converter` still serves the combined tool. The 301 redirect to
  `/tools/image-to-image` and removal of the combined UI are Step 8.

## Phase 7 Phase B addendum (2026-11-04)

### Duplicate page — implemented

Brief §4 asks for "delete and duplicate pages". Delete already existed;
duplicate did not.

- `duplicateItem` inserts the copy directly after its source.
- The copy gets its own object URL. `removeItem` revokes whichever URL it is
  handed, so two rows sharing one URL would lose their preview when either was
  removed.
- The copy is marked `ready`, not `inspecting` — it inherits dimensions and
  format the source already had.
- Per-page rotation carries over.
- `maxFiles` and `maxBatchBytes` are enforced with explicit messages rather
  than silently exceeded.

Verified: tsc 0, eslint 0, vitest green, 3 e2e cases collected (copy position,
removing a duplicate leaves the original preview intact, rotation carries
across). Browser execution is blocked in this sandbox, so the e2e cases are
CI-verified, not locally run.
