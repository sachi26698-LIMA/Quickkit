# QUICKKIT Image Compressor — v2 feature and UI record

Route `/tools/image-compressor` · category **Image Tools** · branch
`arena/82ce86c2-quickkit` (feature branch `feature/image-compressor`).

The original single-image compressor was **extended in place**: same route, same design
language, same queue/ZIP/privacy model. Nothing was rebuilt from scratch, no existing
capability was removed, and the Image Resizer plus the PDF tools were not touched.
Every control described here is wired to real logic; there are no placeholders.

---

## 1. What v2 adds

| Area | Before | Now |
| --- | --- | --- |
| Formats | JPEG export only | **JPEG, PNG, WebP** + **AVIF where the browser can encode it** (options disabled and labelled otherwise) |
| Quality | single fixed pass | **Quality mode** 10–100 % with slider, numeric field and 40/60/80/100 chips |
| Target size | none | **Target mode**: exact KB **or** MB limit, searched by binary quality search and optional stepped downscaling |
| Batch | one image | **up to 20 images** per batch, per-image overrides, per-image progress and errors |
| Comparison | side-by-side thumbnails | **Original ⇄ Result** toggle, **Split** slider and **Side by side** view with BEFORE/AFTER captions |
| Numbers | original and output bytes | original/compressed size, **percentage savings**, dimensions, quality actually used and target status |
| Transparency | flattened | **preserved** for PNG/WebP/AVIF; JPEG flattens onto a chosen background colour (default white) |
| Downloads | one file | **individual download per image** + **Download ZIP (n)** with final filenames |
| Naming | fixed suffix | **rename outputs** and **filename suffixes** (batch-wide or per image) |
| Control | none | **determinate progress bar**, **Stop**, **Retry failed (n)**, **Reset** |
| Guidance | short copy | 5-step HowTo, 7 FAQs, `WebApplication` + `HowTo` + `FAQPage` JSON-LD |

---

## 2. Feature checklist

### 2.1 Inputs and validation
- [x] Drag-and-drop zone plus “Choose files”; both feed the same validator.
- [x] JPEG, PNG, WebP and AVIF accepted; SVG, GIF, HEIC and PDF rejected with a named reason.
- [x] 15 MB per file, 24 MP and 8,192 px per side, 20 files / 200 MP per batch.
- [x] Corrupt or truncated files fail with a per-image error, never a blank screen.
- [x] Duplicate-safe queue IDs; replacing a file keeps the queue position.

### 2.2 Compression
- [x] **Quality mode** — canvas re-encode at the chosen level; PNG is lossless and the
      slider is disabled with an explanation instead of pretending to work.
- [x] **Target mode** — sample at q100, then a bounded binary search for the highest
      quality that fits, per downscale pass.
- [x] **Controlled downscaling** when the target is unreachable at the lowest quality:
      ratio estimated from the smallest sample, min edge 64 px, at most 4 passes and a
      hard ceiling of 26 encodes per image so a phone browser stays responsive.
- [x] **Honest fallback** — when the target cannot be met, the smallest encode found is
      returned and the UI says “not reachable” instead of shipping a full-quality blob.
- [x] Quality range clamped to 10–100; target range 5 KB – 50 MB with inline validation.
- [x] Cancellation checked before every encode; stopping keeps finished images.

### 2.3 Results
- [x] Before/after **Split** slider with BEFORE / AFTER captions and keyboard-accessible range.
- [x] **Side by side** view and a single-pane Original/Result toggle.
- [x] Live preview of the queued image with its real pixel dimensions.
- [x] Stats: original size + type, compressed size + type, savings %, dimensions
      (% or “unchanged”), quality or “met at qNN”, or “not reachable”.
- [x] Per-image download plus a ZIP whose entries carry the final output names.
- [x] Total batch summary: “n of n compressed · X MB from Y MB (−Z%)”.

### 2.4 Transparency and privacy
- [x] Transparent PNG → WebP keeps its alpha channel (pixel-verified in Chromium).
- [x] JPEG export flattens onto a configurable background colour (default `#ffffff`).
- [x] Metadata & privacy panel scans EXIF/GPS/camera/date/ICC/XMP and states exactly
      what a canvas re-encode strips; the original file on disk is never modified.
- [x] All decoding, encoding and ZIP building happens in the tab — no network calls.
- [x] Object URLs are revoked on replacement, reset, removal and unmount.

### 2.5 UX, accessibility and SEO
- [x] Premium QUICKKIT light theme reusing the existing design tokens and `ToolShell`.
- [x] Responsive at 320–1440 px; ≥ 40 px touch targets on mobile; no horizontal overflow.
- [x] Every visible control has an accessible name (0 unnamed in axe runs).
- [x] axe WCAG 2.0/2.1/2.2 A + AA: 0 violations on the empty route and the populated editor.
- [x] JSON-LD `WebApplication`, `HowTo` and `FAQPage`; visible 5 steps and 7 FAQs.
- [x] Catalog entry: **Image Tools**, with keywords for KB target, transparency, batch,
      zip and avif.

---

## 3. How target search works

1. Encode once at quality 100 to measure the ceiling (and to prove the format works).
2. Binary search quality 10–100 (at most 8 probes per pass) keeping the highest quality
   that fits the byte limit.
3. If nothing fits at the current dimensions and downscaling is allowed, estimate the
   linear ratio `sqrt(target / smallestSample) × 0.96`, clamp it to 0.2–0.95, and repeat
   from step 1 on the smaller canvas (4 passes, 26 encodes total).
4. If it still does not fit, return the smallest blob produced so far and mark
   `targetMet: false` so the UI can say “not reachable”.

The fallback in step 4 was the one real defect found by the large-image browser test:
the first implementation returned the last pass’s q100 sample (a 1.5 MB WebP when 40 KB
was requested). The regression test now proves a 3,600 × 2,400 PNG reaches a 40 KB
target at 2,708 × 1,805 px in under 20 s.

---

## 4. Verification (this branch)

```text
npx tsc --noEmit     ✅ 0 errors
npx eslint .         ✅ 0 problems
npx vitest run       ✅ 13 files, 220 tests passed
npm run build        ✅ 19 static routes, /tools/image-compressor prerendered
playwright chromium  ✅ 160 passed (2.7 m) across all specs, including
                        image-compressor.spec.ts (14: quality matrix, target KB,
                        unreachable target + downscale, transparency vs JPEG flatten,
                        batch + per-image overrides + ZIP names, rename/suffix,
                        before/after views, stats accuracy, progress/Stop/Retry,
                        axe + accessible names, JSON-LD, large 3,600×2,400 image,
                        mobile touch flow, mobile target flow)
screenshots          docs/verification/image-compressor-{empty,settings,compare,target,full}-1440.png
                     docs/verification/image-compressor-mobile-{390,full-390,320}.png
```

Vitest coverage for this tool:

- `tests/image-compress.test.ts` — 21 tests of naming, validation, target parsing,
  format capabilities, quality clamping, downscale maths and attempt summaries.
- `tests/components.test.tsx` — 5 jsdom tests of the client component (empty state,
  settings wiring, unsupported AVIF, error copy).
- `tests/catalog.test.ts` — Image Tools now owns both compressor and resizer.

Cross-browser note: Playwright ran in Chromium in this sandbox (only one browser build
could be provisioned). Firefox/WebKit projects remain configured for CI; AVIF capability
is detected at runtime and the option is disabled when the browser cannot encode it.

---

## 5. Known limits (stated in-product)

- AVIF encoding depends on the browser; unsupported options are disabled and explained.
- PNG is lossless — the quality slider is disabled and the file can grow.
- Re-encoding strips EXIF/GPS/XMP/ICC; the original file is never modified.
- `Stop` halts the queue after the in-flight encode settles (browser encoders are not
  abortable); the tooltip says so.
- A byte target can be impossible for tiny sizes; the app says “not reachable” and
  returns the smallest result it found.
- Animation collapses to one frame; GIF, SVG and HEIC inputs are rejected by design.
- Preview URLs are revoked on replacement, reset, removal and unmount.
