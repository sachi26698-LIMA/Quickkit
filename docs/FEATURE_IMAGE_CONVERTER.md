# Image & PDF Converter (Image Converter V1)

Route: `/tools/image-converter` · Categories: **Image Tools** and **PDF Tools** · Branch: `arena/fadc144f-quickkit`

Status: **implemented and under verification — awaiting owner approval. Not merged and not deployed.**
The existing Image Resizer, Image Compressor and Image Cropper code, routes and behaviour were not
modified. This work adds a new route, a new catalogue record and new modules only.

## What the tool does

Three independent modes share one queue, one settings panel and one preview workspace:

1. **Image to image** — convert JPG, PNG, WEBP, AVIF, GIF, BMP and TIFF files between formats, with
   quality, transparency/flattening, optional resize, EXIF orientation handling, per-file format
   overrides, batch progress, cancel/retry and individual or ZIP downloads.
2. **Images to PDF** — one image per page in queue order (Move earlier/later controls), with
   A4/A3/Letter/Legal/custom page sizes, portrait or landscape, 0–60 mm margins, contain/cover/fill
   placement, page background, embedded JPEG quality, document title and a configurable filename.
   Pages are raster; the tool never claims editable text.
3. **PDF to image** — render selected pages as JPG, PNG or WEBP at 72–600 DPI, with a page range
   (`1-3, 5`), page background, zero-padded filenames, page navigation, per-page downloads and a ZIP.
   PDF previews are rendered from the real uploaded PDF; source↔converted comparison is available.

## Discovery and categories

- The single catalogue record `image-converter` carries
  `categories: ["Image Tools", "PDF Tools"]`; `toolCategoriesOf()` powers category
  listings, counts, search and related tools. There is no duplicate record and no second route.
- `/category/image-tools` (4 tools) and `/category/pdf-tools` (3 tools) both list it, opening the
  same `/tools/image-converter` URL. All Tools, the category filter and the search find it once.
- Breadcrumbs now include the primary category, the tool header shows both categories and a
  "Filed under" nav links to each category page. Related tools are chosen round-robin from both
  categories, so the converter suggests image tools _and_ PDF tools.
- The sitemap still contains the route once (41 URLs: 10 static + 8 category + 23 tools).

## Format matrix

Input detection uses the filename extension and MIME type. A browser can be unable to decode or
encode a format; the interface probes real encoder support and disables options rather than writing a
broken file.

| Input | Read with                                                     | Output JPG | PNG | WEBP |         AVIF |          GIF |          BMP |         TIFF |
| ----- | ------------------------------------------------------------- | ---------: | --: | ---: | -----------: | -----------: | -----------: | -----------: |
| JPG   | browser decoder (EXIF orientation applied)                    |         ✅ |  ✅ |   ✅ |     ✅ probe |           ✅ |           ✅ |           ✅ |
| PNG   | browser decoder                                               |         ✅ |  ✅ |   ✅ |     ✅ probe |           ✅ |           ✅ |           ✅ |
| WEBP  | browser decoder                                               |         ✅ |  ✅ |   ✅ |     ✅ probe |           ✅ |           ✅ |           ✅ |
| AVIF  | browser decoder (Chrome/Edge/Firefox; probe + explicit error) |         ✅ |  ✅ |   ✅ |     ✅ probe |           ✅ |           ✅ |           ✅ |
| GIF   | browser decoder, first frame only                             |         ✅ |  ✅ |   ✅ |     ✅ probe |           ✅ |           ✅ |           ✅ |
| BMP   | browser decoder                                               |         ✅ |  ✅ |   ✅ |     ✅ probe |           ✅ |           ✅ |           ✅ |
| TIFF  | built-in baseline decoder                                     |         ✅ |  ✅ |   ✅ |     ✅ probe |           ✅ |           ✅ |           ✅ |
| PDF   | PDF.js 6.4.299                                                |         ✅ |  ✅ |   ✅ | ❌ by design | ❌ by design | ❌ by design | ❌ by design |

- Canvas encoders: JPG, PNG, WEBP, AVIF. `canvas.toBlob` is probed for each type and the returned
  Blob's MIME type is checked — a browser that silently falls back to PNG is treated as unsupported.
- Built-in encoders in a Web Worker: GIF (median-cut palette, optional transparency, single frame),
  BMP (24-bit bottom-up with row padding, alpha composited onto the background) and TIFF (baseline
  8-bit RGB/RGBA, LZW or uncompressed, resolution and software tags).
- Built-in TIFF decoder supports strips, 8-bit RGB/RGBA/grayscale/palette, none/LZW/PackBits and
  horizontal predictor 2. Tiled, 16-bit, planar, JPEG-compressed and deflate-compressed TIFFs are
  rejected with a specific message instead of producing wrong pixels.
- PDF to image deliberately offers only JPG, PNG and WEBP: GIF/BMP/TIFF page exports would either
  quantise pages heavily or produce outsized document files and are not part of V1.

## Limits (enforced, never "unlimited")

| Limit                     | Value                             |
| ------------------------- | --------------------------------- |
| Files per batch           | 20                                |
| Image size                | 15 MB                             |
| Image pixels              | 24 MP, neither side over 8,192 px |
| PDF size                  | 25 MB                             |
| PDF pages                 | 100                               |
| Batch size                | 150 MB                            |
| Rendered PDF page         | 36 MP cap                         |
| PDF render DPI            | 72–600                            |
| JPEG/WEBP/AVIF quality    | 10–100                            |
| PDF margin                | 0–60 mm                           |
| Custom page               | 20–2,000 mm per side              |
| One PDF per PDF→image run | enforced (mode uses one document) |

## Behaviour details

- **EXIF orientation** is applied to pixels by default (`createImageBitmap` with `from-image`);
  the setting can ignore it. Every output is re-encoded, so EXIF, GPS, XMP and ICC metadata are not
  carried over. This is stated in the settings and FAQ.
- **Transparency**: preserved for PNG/WEBP/AVIF/GIF/TIFF; flattened onto the chosen colour for
  JPG/BMP or when "flatten" is selected. The preview uses a checkerboard to show alpha.
- **Resize** is optional: keep pixels, percentage 1–800 %, exact width×height with an aspect lock, or
  fit the longest side. Output dimensions are validated against the 24 MP / 8,192 px limits.
- **Ordering**: the Images to PDF page order is the queue order; each row has Move earlier / Move later
  buttons (disabled at the ends) and the layout preview plus the exported PDF follow that order.
- **Supported vs unsupported** is visible in the tool itself under "Format & limitation notes":
  GIF first frame only, PDF→JPG/PNG/WEBP only, AVIF/WEBP probed, TIFF handled locally, no editable
  text in image-built PDFs.
- **Naming**: `<base or original>-converted.<ext>` for images; `<base>-page-001.<ext>` for PDF pages;
  a custom PDF filename (forced `.pdf`) for images→PDF. Duplicates inside ZIPs are suffixed.
- **Images→PDF** embeds each placed image as JPEG at up to 300 DPI of the placed size, capped at
  3,600 px on the longest side to keep files sane. Cover mode centre-crops in pixel space so page
  clipping never depends on the viewer. Layout preview uses the exact same geometry maths as export.
- **PDF→image** renders with PDF.js at `dpi / 72` scale, fills the chosen background before drawing,
  caps each page at 36 MP, and reports the cap. Page rotation (`/Rotate`) is applied by the PDF.js
  viewport, so rotated pages export at their displayed orientation. Password-protected PDFs and
  corrupt files are rejected during inspection with a specific message and never produce output.
- **Limits at inspection**: PDFs over 25 MB or 100 pages are rejected before conversion;
  `parsePageRange` independently enforces the 100-page ceiling. Exporting all pages of a hundred-page
  document is allowed; a 101-page document is not.
- **Large-document preview**: the thumbnail strip shows a moving window of six pages around the
  current page instead of only pages 1–6, and thumbnails render on demand.
- **Cancellation** aborts between files and between PDF pages; files finished before the cancel stay
  available for download. Per-file progress is real for page-based work (PDF→images and images→PDF
  report `done / total`), while single-image conversions show the per-file busy state.
- **Metadata** is always stripped from exports (EXIF, GPS, XMP, ICC) because every file is decoded to
  pixels and re-encoded; EXIF orientation is applied first so photos stay upright. The settings panel
  states this explicitly instead of offering a switch that would not work.
- **Worker usage**: GIF/BMP/TIFF encoding runs in `workers/image-encode.worker.ts`; if the worker
  cannot start or crashes, the same encoder retries on the main thread so a conversion is never lost
  to a worker failure. PDF parsing already uses pdf.js's own worker. Canvas-bound decode/draw and PDF
  page rendering happen on the main thread, one file or page at a time, yielding between steps.
- **Preview fit**: raster previews open in _Fit to panel_ so a tall page is visible in full; moving
  the zoom slider switches to free zoom (50–300 %) and the stage scrolls instead of cropping. PDF page
  and exported-page previews are capped to the stage height for the same reason.
- **Mobile layout**: below 1080 px a Files/Preview switch replaces the single long column. Both
  panels are real, the switch is `aria-pressed`/`aria-controls`, and a finished conversion moves the
  user to the preview. The tab controls are hidden on desktop where both panels are visible.
- **Object URLs** for original previews, converted outputs and PDF thumbnails are tracked and revoked
  when files are removed, results are replaced, the queue is cleared or the component unmounts.
- **No uploads**: no `fetch`/XHR of file data, no analytics on file contents, no logging of contents.

## Architecture

| File                                                  | Purpose                                                                                                                                                        |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/tools/image-convert.ts`                          | DOM-free model: formats, limits, modes, page sizes/geometry, fit placement, DPI→pixels, range parsing, defaults, resize planning, naming, summaries, estimates |
| `lib/tools/image-codec.ts`                            | BMP/GIF/TIFF encoders, median-cut palette, shared LZW, TIFF decoder, size/DPI inspection, colour helpers                                                       |
| `lib/tools/image-encode-client.ts`                    | Worker client for special encoders with a main-thread fallback                                                                                                 |
| `workers/image-encode.worker.ts`                      | Off-thread BMP/GIF/TIFF encoding                                                                                                                               |
| `lib/tools/image-convert-runner.ts`                   | Browser engine: inspect/decode, canvas composition, encode, images→PDF (pdf-lib), PDF→images and thumbnails (PDF.js), ZIP                                      |
| `components/tools/image-converter.tsx`                | Workspace state, queue, conversion orchestration, preview, results, downloads                                                                                  |
| `components/tools/image-converter/settings-panel.tsx` | Mode-specific settings with labelled controls                                                                                                                  |
| `components/tools/image-converter/types.ts`           | Queue/result types and display helpers                                                                                                                         |
| `app/tools/image-converter/page.tsx`                  | Route metadata, steps, FAQs and structured data                                                                                                                |

## Tests

Unit (`vitest`):

- `tests/image-convert.test.ts` — format catalogue, input detection, page geometry/orientation,
  contain/cover/fill placement, DPI → pixels and caps, page-range parsing/description, resize planning,
  naming/deduplication, defaults and summaries.
- `tests/image-codec.test.ts` — independent BMP reader and GIF LZW decoder, TIFF round-trips
  (uncompressed, LZW, noisy data that forces dictionary resets, RGBA), DPI/software tags, palette
  sizing for a flat 16-colour image, transparent GIF index reservation, malformed input.

Browser (`playwright`, chromium):

- `tests/e2e/image-converter.spec.ts` — dual-category discovery (Image Tools + PDF Tools + search +
  both category links on the tool page); password-protected and corrupt PDF rejection; rotated PDF
  page dimensions, order and ZIP integrity; mobile Files/Preview switch at 375/390/430/768 px; JPG→PNG
  with output reopened in Chromium; transparent PNG→JPG
  corner-pixel check; WEBP/GIF/BMP/TIFF/AVIF outputs; quality and resize effects; batch + ZIP contents;
  images→PDF page count/size/raster-only check and PDF preview navigation; PDF→PNG selected pages,
  dimensions, single download and ZIP; out-of-range rejection; cancellation of a 30-page render;
  invalid input; keyboard mode control; 375/390/430/768/1440 viewports with no horizontal overflow;
  axe audit of the empty workspace. `/tools/image-converter` was added to the accessibility route
  sweep in `tests/e2e/quality.spec.ts`.

## Known limitations (documented, not hidden)

- Animated GIFs export their first frame; animation is not preserved.
- PDFs created from images contain raster pages only — no text, no selectable text layer.
- GIF uses a 256-colour palette, so photographic conversions lose colour detail by design.
- BMP output is uncompressed 24-bit and therefore large; transparency is flattened.
- TIFF output is baseline 8-bit; 16-bit, CMYK, tiled and JPEG-in-TIFF inputs are rejected.
- AVIF/WEBP availability depends on the browser encoder; unsupported formats are disabled.
- TIFF previews are shown from the decoded canvas; browsers themselves cannot open `.tiff` files.
- Encrypted/password-protected PDFs are rejected (not decrypted) in V1.
- PDFs over 100 pages or 25 MB are rejected rather than truncated.
- PDF rendering is main-thread work; very large pages are capped at 36 MP and cancel applies between
  pages rather than mid-page.
- No OCR or text extraction; visible page content is rasterised.

## Verification checklist for the owner

1. `npm ci`, `npm run format:check`, `npm run lint`, `npm test`, `npm run build`, `npm run typecheck`.
2. `npx playwright install --with-deps chromium` then `npm run test:e2e -- image-converter`.
3. Manual: convert JPG→PNG, PNG→JPG with transparency, PNG→WEBP/GIF/BMP/TIFF, two images→PDF
   (A4 portrait, 20 mm margin), a 3-page PDF→PNG at 96 DPI with range `1,3`, ZIP download; confirm
   each downloaded file opens and that the previews match.
4. Mobile widths 375/390/430/768 and desktop 1440: no horizontal scroll, controls reachable, preview
   tabs usable with touch.
5. Screenshots: CI uploads `browser-screenshots` (375/390/430/768/1440 px full-page captures from
   the converter spec) so the owner can review the real rendered layout without a local browser.
6. Confirm no files were uploaded (Network panel) and that the Image Resizer/Compressor/Cropper pages
   are unchanged.

Sign-off and merge are owner decisions; this branch must not be merged or deployed without them.
