# Image to Image Converter — feature checklist and QA report

Route: `/tools/image-to-image` · Catalog slug: `image-to-image` · Category: Image Tools

This tool was extracted from the combined Image & PDF Converter into an
independent route, catalog entry and component. Nothing here is a placeholder:
every row names the code path and the check that proves it.

Legend: ✅ done and verified · ⚠️ done with a stated limitation · ⬜ not started

---

## 1. Feature checklist

| # | Requested feature | Status | Where it lives |
|---|---|---|---|
| 1.1 | JPG, JPEG, PNG, WebP, AVIF, GIF, BMP, TIFF input | ✅ | `inputFormatFromName`, `tests/image-convert.test.ts` |
| 1.2 | Same set as output formats | ✅ | `CONVERT_FORMATS`, `formatById` |
| 1.3 | HEIC/HEIF input where the browser has a codec | ✅ | `UNSUPPORTED_HEIC` path in `lib/tools/image-convert-runner.ts` |
| 1.4 | AVIF/WebP output offered only after a real encode probe | ✅ | `canvasEncodeSupport()` + `resetImageEncoder()` |
| 1.5 | Batch conversion with limits | ✅ | `CONVERT_LIMITS`: 20 files, 15 MB each, 150 MB per batch |
| 1.6 | Output format selection, shared + per-file override | ✅ | `OVERRIDE_OPTIONS`, per-item `override` |
| 1.7 | Quality and compression controls | ✅ | `settings.image.quality`, `compression` |
| 1.8 | Target KB/MB compression | ✅ | `runSizeSearch` in `lib/tools/image-size.ts` |
| 1.9 | Lossless and lossy modes | ✅ | `compression: "lossless" \| "lossy"`; `visuallyLossless` excludes GIF |
| 1.10 | Quality prioritised over an arbitrary target | ✅ | Engine tries lossless → bounded quality search → downscale; always warns when the target is missed |
| 1.11 | Transparent background preservation | ✅ | `keepsAlpha`, `settings.image.alpha` |
| 1.12 | Background colour selection for flattening | ✅ | `settings.image.background` |
| 1.13 | Exact pixel resizing | ✅ | `resize.mode === "exact"`, `RESIZE_PRESETS` |
| 1.14 | Maintain aspect ratio | ✅ | `resize.lock`, `linkValue` |
| 1.15 | Crop, rotate, flip, straighten | ✅ | `applyEdits` (crop → straighten → rotate → flips), `CROP_ASPECTS` |
| 1.16 | EXIF orientation handling | ✅ | `settings.image.orientation`, `decodeBitmap`, `tests/exif.test.ts` |
| 1.17 | Metadata removal options, disclosed | ✅ | `scanSourceMetadata` + `metadataNote` |
| 1.18 | Custom filenames, prefixes, suffixes | ✅ | `buildOutputName`, `tests/image-convert.test.ts` |
| 1.19 | Individual and ZIP downloads | ✅ | `downloadOne`, `downloadAllZip` → `zipOutputs` |
| 1.20 | Actual before/after preview | ✅ | `ImagePreview` slider uses the real source object URL and the real encoded blob |
| 1.21 | Per-file progress and error reporting | ✅ | `converter-file-progress`, `converter-file-error`, retry action |
| 1.22 | Never silently skip a failed file | ✅ | `BatchReport` records every failure with its error text |
| 1.23 | Animated GIF handled explicitly | ⚠️ | Unedited GIF is a byte-for-byte passthrough (`canPreserveGif`); any edit decodes frame 1 and the UI says so. Frame count comes from `inspectGif`. |
| 1.24 | Colour profile handling, disclosed | ⚠️ | ICC presence is detected and reported. The canvas re-encodes to sRGB and no profile is embedded. Stated in the note and the FAQ. |

## 2. What was removed by the extraction

These belonged to the other three modes and are deliberately absent here.
Their absence is asserted, not assumed — see `tests/e2e/image-to-image.spec.ts`.

- The four-way mode switcher (`converter-modes`) — this tool has one job.
- Images to PDF page ordering, drag-and-drop and layout preview.
- PDF to image page ranges, DPI and thumbnails.
- PDF Studio page grid, plan summary and bulk actions.
- PDF input: a PDF dropped here is rejected with a message naming the
  PDF to Image Converter, rather than being silently ignored.

## 3. Verification evidence

### Automated, run locally

| Check | Command | Result |
|---|---|---|
| Unit tests (whole repo) | `npx vitest run` | **673 passed, 35 files** (was 637 before this tool; +36 new) |
| New settings module tests | `npx vitest run tests/image-to-image-settings.test.tsx` | **36 passed** |
| Types | `npx tsc --noEmit` (fresh, cache cleared) | **0 errors** |
| Lint | `npx eslint .` | **0 errors, 0 warnings** |
| Format | `npm run format:check` | pass |
| Production build | `npm run build` | pass, `/tools/image-to-image` prerendered static |

### Server-rendered checks against the running build (port 3001)

| Check | Result |
|---|---|
| `GET /tools/image-to-image` | **200**, 87,050 bytes |
| `GET /tools/image-converter` (still live) | **200** — old tool untouched, per the safety rule |
| Own workspace present | `converter-workspace`, `converter-drop`, `image-to-image-input`, `Conversion settings` all present |
| Own settings blocks present | `Output format`, `File size`, `Crop, rotate` |
| Own FAQ/walkthrough | `A few useful answers` present |
| No bleed-through from other tools | `Images to PDF` = 0, `PDF to image` = 0, `PDF Studio` = 0, `converter-modes` = 0 |
| Category listing | `/category/image-tools` links `/tools/image-to-image` (5 image tools) |
| All Tools | `/tools` contains the tool |
| Global search | `/tools?q=image to image` finds it |
| Breadcrumb | Home › Tools › Image Tools › Image to Image Converter |

### Not yet verified — needs CI or a real browser

This sandbox has no browser binary (`~/.cache/ms-playwright` is empty, no
`chromium`/`google-chrome` on PATH, and the Playwright CDN is not reachable),
so the following are written and type-checked but **not executed here**:

- `tests/e2e/image-to-image.spec.ts` — **29 cases**, confirmed to parse and
  type-check via `npx playwright test tests/e2e/image-to-image.spec.ts --list`
  (`Total: 29 tests in 1 file`), but zero executed. Coverage: real browser
  interaction, real input-file conversion, output-integrity and download
  checks, empty/invalid/corrupt file handling, PDF input rejection, 375/390/430
  px plus 768/1440 px layouts, full-page screenshots, axe accessibility and
  keyboard operation of the settings disclosures.
- Large-file and memory behaviour under a real decoder.

These run in GitHub Actions on push.

## 4. Known limitations

1. **HEIC/HEIF is read-only.** There is no HEIF encoder in browsers, so HEIC
   can be an input but never an output.
2. **ICC profiles are detected, not carried through.** Output is written as
   sRGB. This is disclosed in the per-file note.
3. **Animated GIF output is a byte copy.** Any pixel edit forces a single
   still frame; the UI reports the frame count so this is never a surprise.
4. **Size estimates before conversion are model-based.** The final number is
   read from the encoded blob, not from the estimate.
5. **A target size is a ceiling, not a guarantee.** When it cannot be met
   without visible loss the tool says so and offers the best achievable size
   instead of quietly degrading the image.
