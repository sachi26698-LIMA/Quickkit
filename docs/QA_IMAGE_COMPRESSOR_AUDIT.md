# QUICKKIT Image Compressor — final real-world QA report

**Route:** `/tools/image-compressor` · **Category:** Image Tools
**Branch:** `arena/82ce86c2-quickkit` (mirror `feature/image-compressor`)
**Date:** 1 November 2026 · **Status:** complete, **awaiting owner approval**

Scope: verify every promised capability with real image files, exercise every visible
control, fix whatever the audit exposed, and re-run the whole quality gate. The Image
Resizer and the PDF tools were **not modified** and no other tool was started.

Environment: Next.js 16.4.3 (production build, `next start` on port 3001), React 19,
Node 22.22.3, Chromium 153.0.8010.0 (Playwright), Linux sandbox, 390/1440 px viewports.

---

## 1. How the verification was done

Everything below is evidence from **decoded files**, not from UI text alone:

- Each download is read from disk, its magic bytes are checked, and it is decoded in a
  browser canvas to confirm dimensions and pixel values (alpha, flatten colour, contrast).
- The ZIP is written to disk and validated with **Info-ZIP** (`unzip -t` checks every CRC,
  `unzip -Z1` lists the entries, `unzip -p` extracts payloads that are then decoded).
- Savings percentages are recomputed from the real byte counts and compared to the UI.
- Real photographs and a real transparent PNG (downloaded stock/product images) were run
  through the same flow as the synthetic fixtures in the automated suite.
- Every button, input, select, checkbox and slider was operated and its effect asserted.
- axe (`wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`) runs on the empty route,
  a populated editor, after compression and on mobile: **0 violations**.

The automated form of this audit lives in `tests/e2e/image-compressor-audit.spec.ts`
(21 tests), on top of the existing `tests/e2e/image-compressor.spec.ts` (14 tests) and
`tests/e2e/browser-tools.spec.ts` (6 compressor/validation tests).

---

## 2. Requirement checklist

Legend: **VERIFIED** = proven by an automated browser/unit test (and, where visual, by
decoded pixels); **NOT SUPPORTED** = impossible in this browser and labelled in-product;
**NOT IMPLEMENTED** = deliberately absent, with no dead control in the UI.

| # | Requirement | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Quality-based compression | **VERIFIED** | q30 file < q95 file for JPEG and WebP, both decode at the source size; chips, slider and summary stay in sync |
| 1 | Exact target size (KB) | **VERIFIED** | 90 KB target → 90 KB limit honoured, "met at qNN" shown; real photo 15 KB target → 15,348 bytes at q19 |
| 1 | Exact target size (MB) | **VERIFIED** | 0.5 MB target → output ≤ 512 KB and reported as "512 KB · met at qNN"; unit switch updates the summary |
| 1 | Target validation | **VERIFIED** | 0 → "greater than zero", 0.001 MB → "at least 5 KB", > 50 MB rejected; Compress disabled while invalid |
| 1 | Unreachable target | **VERIFIED** | With downscaling off the dimensions stay identical, the row says "not reachable", and the smallest encode is returned (never a full-quality blob) |
| 1 | Downscaling when allowed | **VERIFIED** | 3,600 × 2,400 → 2,708 × 1,805 to hit 40 KB; dimensions caption says "(scaled)" |
| 2 | Transparent PNG preserved (PNG) | **VERIFIED** | Alpha 0 corners and the exact `[0,128,255,128]` half-transparent band survive a lossless round-trip |
| 2 | Transparent PNG preserved (WebP) | **VERIFIED** | Corner alpha 0, band alpha ≈128, red square intact after lossy WebP |
| 2 | JPEG flattening | **VERIFIED** | Transparent areas filled with the chosen `#00ff00` / `#123456`; a black/white default is avoidable |
| 2 | Real transparent PNG | **VERIFIED** | 350 × 350 palette logo (74.2 % transparent): WebP 10,014 B and PNG 52,036 B both keep 74.2 % transparency; JPEG corners are pure green |
| 3 | JPG output validity | **VERIFIED** | `FF D8` signature, decodes, expected dimensions, 8-bit RGB, no alpha |
| 3 | PNG output validity | **VERIFIED** | `89 50 4E 47` signature, decodes at source size, lossless pixels |
| 3 | WebP output validity | **VERIFIED** | `RIFF … WEBP` signature, decodes at source size, transparency supported |
| 3 | Format switch invalidates stale results | **VERIFIED** | Changing format/quality/target clears results and re-enables Compress |
| 4 | Before/after comparison | **VERIFIED** | Original/Result toggle swaps the preview source; Split slider moves the clip path (25/50/70 %) with BEFORE/AFTER; Side by side renders two real 1100 × 800 images with captions |
| 4 | Accurate savings | **VERIFIED** | Displayed percentage equals `(1 − downloadedBytes / originalBytes) × 100` to one decimal; negative savings shown as "X % larger" (a real PNG round-trip reported 1230.1 % larger) |
| 4 | Sizes and dimensions | **VERIFIED** | "Original 64.7 KB · JPG", "Compressed 15.0 KB · WebP", "800 × 800 px · unchanged" match the files |
| 5 | Batch compression | **VERIFIED** | 20 images compressed in one run (20 JSON-verified entries); 21st rejected with the stated batch limit |
| 5 | Per-image overrides | **VERIFIED** | Image 2 → JPEG q35 "hero-social-700x500.jpg", image 3 → PNG "third-lossless-800x800.png", image 1 → batch WebP; each download matches its signature and name |
| 5 | Per-image target override | **VERIFIED** | Batch 100 KB, image 2 → 25 KB: 24.8 KB output (≤ 25 KB) while image 1 stayed at 49.7 KB (≤ 100 KB) |
| 5 | Per-image JPEG colour | **VERIFIED** | With a WebP batch, a per-image JPEG override reveals the Background control and applies the chosen flatten colour |
| 5 | Reset per-image settings | **VERIFIED** | Removes the override, hides the panel and restores the batch name/format |
| 6 | ZIP download | **VERIFIED** | `quickkit-compressed-images.zip`, `unzip -t` → "No errors detected", entries listed and extracted |
| 6 | ZIP contents | **VERIFIED** | Every finished image present, none of the failed ones; extracted WebP/JPEG/PNG decode with the expected dimensions |
| 6 | ZIP naming | **VERIFIED** | Final names include rename/suffix and dimensions; duplicate names become "… (2).webp" instead of overwriting |
| 6 | ZIP guard | **VERIFIED** | Disabled until at least one image finishes; only finished images are archived |
| 7 | Large image handling | **VERIFIED** | 20 MP (5000 × 4000) and exactly 24 MP (6000 × 4000) compress in ~1.5–1.9 s with no page errors; 8192 × 400 accepted; 8,200 px side rejected with the stated rule |
| 7 | Memory discipline | **VERIFIED** | 20 × 3 MP batch finished in 6.9 s (~343 ms/image) with JS heap ≤ 7.9 MB; canvases are zeroed after every pass, images processed one at a time |
| 7 | Cancellation | **VERIFIED** | Stop mid-batch keeps finished images downloadable, leaves the rest "Ready", and a re-run completes all 20; stopping before the first image gives the "stopped before any image finished" notice with a clean queue |
| 7 | Error recovery | **VERIFIED** | A corrupt file fails alone, the healthy result survives byte-for-byte, "Retry failed (1)" re-runs only it, and replacing the file recovers |
| 8 | Desktop workflow | **VERIFIED** | 1440 px: drag-and-drop, browse, keyboard slider, all views, downloads, ZIP, Reset |
| 8 | Mobile workflow | **VERIFIED** | 390 px touch: chip tap, format select, Compress, thumbnail switch, Side by side, real download; no horizontal overflow at 320/390 px; controls ≥ 40 px |
| — | Every visible control | **VERIFIED** | 21 audit tests operate each button/input/select/checkbox/slider; each changes real state (see § 4) |
| — | Metadata disclosure | **VERIFIED** | Panel reports EXIF/GPS/camera/ICC/XMP and states exactly what re-encoding strips |
| — | EXIF-rotated phone photos | **VERIFIED** | A 900 × 600 pixel JPEG with orientation 6 is listed as 600 × 900, compressed at 600 × 900 and labelled "unchanged" (fixed in this audit) |
| — | AVIF output | **NOT SUPPORTED** in Chromium 153 | Option disabled and labelled "unsupported here"; capability detected at runtime (`canvas.toBlob` probe) |
| — | AVIF input | **NOT SUPPORTED** without a decoder | Accepted by the picker; a browser without an AVIF decoder reports a decode error rather than failing silently |
| — | Animated inputs | **NOT IMPLEMENTED** | GIF is rejected by design; animation is never silently flattened |
| — | HEIC/HEIF, SVG, RAW | **NOT IMPLEMENTED** | Not in the accepted type list; plain-language rejection |
| — | Server upload / cloud processing | **NOT IMPLEMENTED** | No network call in the pipeline; decode, encode and ZIP run in the tab |

---

## 3. Real-image results

Stock photographs and a transparent product PNG were pushed through the UI exactly as a
user would (files downloaded from the web, then uploaded through the file input):

| Run | Output | Bytes | Dimensions | Contrast (0–255) | Notes |
| --- | --- | --- | --- | --- | --- |
| Source photo | `mountain-lake.jpg` | 66,206 | 800 × 800 | 203.4 | already-compressed stock JPEG |
| WebP q80 | `mountain-lake-compressed-800x800.webp` | 52,950 | 800 × 800 | 202.8 | 20.0 % smaller, no visible loss |
| JPEG q55 | `mountain-lake-compressed-800x800.jpg` | 51,170 | 800 × 800 | 203.4 | 22.7 % smaller |
| PNG lossless | `mountain-lake-compressed-800x800.png` | 880,573 | 800 × 800 | 202.1 | 1230.1 % **larger** — flagged honestly |
| Target 15 KB | `mountain-lake-compressed-800x800.webp` | 15,348 | 800 × 800 | 202.0 | met at q19, dimensions unchanged |
| Logo source | `brand-logo.png` (transparent) | 17,000 | 350 × 350 | — | 74.2 % transparent pixels |
| Logo WebP | `brand-logo-compressed-350x350.webp` | 10,014 | 350 × 350 | — | alpha kept, 74.2 % transparent |
| Logo PNG | `brand-logo-compressed-350x350.png` | 52,036 | 350 × 350 | — | alpha kept exactly |
| Logo JPEG (#00ff00) | `brand-logo-compressed-350x350.jpg` | 9,781 | 350 × 350 | — | corner `[0,255,1]`, no alpha |
| ZIP | 3 entries | — | — | — | `unzip -t` → No errors detected |

Performance / memory (production build, Chromium, CDP `Performance.getMetrics`):

| Workload | Time | JS heap after | Notes |
| --- | --- | --- | --- |
| 20 MP JPEG → WebP q80 | 1.5 s | 4.8 MB | 5000 × 4000, dimensions kept |
| 20 MP JPEG → 30 KB target | 1.0 s | 6.5 MB | q100 already fit, met at q100 |
| 24 MP JPEG → WebP q80 | 1.9 s | — | 6000 × 4000 |
| 20 × 3 MP PNG batch | 6.9 s (343 ms/image) | 7.9 MB | no page errors, all 20 downloadable |

---

## 4. Defects found and fixed in this audit

| Severity | Defect | Fix | Regression test |
| --- | --- | --- | --- |
| High | **Unreachable target returned the q100 blob** (1.5 MB WebP when 40 KB was asked) once the shared encode budget starved later downscale passes | Per-pass probe budget, global 26-encode ceiling, and a global smallest-result fallback | `large images compress locally…`, `unreachable target without downscaling…` |
| Medium | **EXIF-rotated phone photos contradicted themselves**: queue said 900 × 600, result said 600 × 900 "unchanged" | `inspectCompressFile` reads the EXIF orientation (5–8) and reports the displayed dimensions; metadata panel shows the tag | `EXIF-rotated phone photos report the orientation users see` |
| Medium | **PNG target mode claimed "met at q100"** and burned eight identical encodes per pass | Lossless formats now take a single probe per pass and report "met by resizing"/"met" | `PNG target mode resizes honestly…` |
| Low | **Per-image JPEG transparency colour was unreachable** when the batch format was not JPEG (Background control hidden) | Background control appears whenever any image resolves to JPEG | `per-image JPEG override exposes the flatten colour…` |
| Low | **Footer advertised a fixed quality in target mode** ("WebP · 55% quality" while searching) | Footer reads "target search" in target mode | `target mode: KB and MB limits…` |
| Low | **Stopping a re-run left the item "Ready" while its old result stayed downloadable** | Cancelled items keep "Done" when a result exists | `Stop halts a long batch…`, `stopping before the first image…` |

No other mismatch was found: every control was operated, every download decoded, and
every computed number matched the file on disk.

---

## 5. Quality gate (final tree)

```text
npx tsc --noEmit    ✅ 0 errors
npx eslint .        ✅ 0 errors, 0 warnings
npx vitest run      ✅ 13 files, 220 tests
npm run build       ✅ compiled, 19 static routes, /tools/image-compressor prerendered
playwright chromium ✅ 181 passed (≈4 min) — all specs
                       · image-compressor-audit.spec.ts 21 (this report)
                       · image-compressor.spec.ts 14
                       · browser-tools.spec.ts 6 compressor scenarios
```

Cross-browser note: only Chromium could be provisioned in this sandbox. Firefox/WebKit
projects stay configured for CI; AVIF and format support are capability-detected at
runtime instead of assumed.

---

## 6. Screenshots (`docs/verification/`)

| File | Shows |
| --- | --- |
| `image-compressor-empty-1440.png` | Empty state, drop zone and settings |
| `image-compressor-settings-1440.png` | Two-image batch before compression |
| `image-compressor-compare-1440.png` | Split comparison after compression |
| `image-compressor-target-1440.png` | Target mode, queue summary and ZIP action |
| `image-compressor-full-1440.png` | Whole page, desktop |
| `image-compressor-qa-real-photos-1440.png` | **Real photograph**, 64.7 KB → 15.0 KB at a 15 KB target |
| `image-compressor-qa-real-photos-split-1440.png` | Real photograph, BEFORE/AFTER split |
| `image-compressor-qa-real-photos-full-1440.png` | Real-photo session, full page |
| `image-compressor-mobile-{390,full-390,320}.png` | Touch layout, readable queue |

---

## 7. Known limits (all stated in-product)

- AVIF output depends on the browser; the option is disabled and explained when absent.
- PNG is lossless: the quality control is disabled and a PNG can be larger than a JPEG
  source — the savings row says so in plain language.
- `Stop` halts the queue after the in-flight encode settles (browser encoders are not
  abortable); the button tooltip says so.
- A byte target can be impossible for very small limits; the app returns the smallest
  encode it found and marks the target "not reachable".
- Re-encoding strips EXIF/GPS/XMP/ICC (privacy default); the original file is untouched.
- EXIF rotation is auto-corrected on decode; the orientation tag is shown in the
  metadata panel.
- The ZIP uses the stored method (files are already compressed), so the archive ≈ the sum
  of its members.
- Animation collapses to one frame; GIF/HEIC/SVG inputs are rejected by design.

---

## 8. Sign-off

The Image Compressor is functionally complete and passes the full gate above. Status in
`TOOL_DEVELOPMENT_STATUS.md`: **✅ Done — awaiting owner approval**. The Image Resizer
remains owner-approved and untouched; the PDF tools remain owned by their own workstream.
