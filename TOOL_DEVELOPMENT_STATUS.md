# QUICKKIT — Tool Development Status

Last updated: 1 November 2026 · maintained by the Image Tools workstream.
Statuses for the PDF tools belong to their own workstream and are recorded here only as
"owned elsewhere / untouched" so the two tracks never collide.

## How to read this file

| Symbol | Meaning |
| --- | --- |
| ✅ Done | Implemented, unit-tested, browser-tested, build-verified and documented |
| 🟡 Next | Approved to start after the current tool is signed off |
| ⬜ Planned | Scoped, not started |
| ➖ Owned elsewhere | Another workstream owns it; this branch does not modify it |

## Tool status board

| # | Category | Tool | Route | Status | Branch | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Text | Word Counter | `/tools/word-counter` | ✅ Done | `main` | Phase 2 baseline |
| 2 | Text | Case Converter | `/tools/case-converter` | ✅ Done | `main` | Phase 2 baseline |
| 3 | Developer | JSON Formatter | `/tools/json-formatter` | ✅ Done | `main` | Phase 2 baseline |
| 4 | Security | Password Generator | `/tools/password-generator` | ✅ Done | `main` | Phase 2 baseline |
| 5 | Image & QR | QR Code Generator | `/tools/qr-generator` | ✅ Done | `main` | Phase 3 baseline |
| 6 | Image & QR | Image Compressor | `/tools/image-compressor` | ✅ Done (existing) | `main` | **Not modified on this branch.** Next Image Tools candidate after Image Resizer sign-off |
| 7 | **Image Tools** | **Image Resizer** | `/tools/image-resizer` | ✅ **Done (v2 premium editor) — awaiting owner approval** | `feature/image-resizer` | New category. v1 shipped, v2 upgrade complete; checklist below |
| — | Image Tools | Image Compressor v2 (category migration) | — | 🟡 Next | — | Starts only after Image Resizer approval |
| — | PDF Tools | PDF Merger | — | ➖ Owned elsewhere | PDF workstream | **Not touched: no code, no status change, no shared files rewritten** |
| — | PDF Tools | PDF Splitter | — | ➖ Owned elsewhere | PDF workstream | **Not touched: no code, no status change, no shared files rewritten** |

Only these shared files gained additive entries for the new category: `lib/catalog.ts`
(new tool record + `"Image Tools"` category), `components/catalog.tsx` and
`components/tool-icon.tsx` (icon map entry), `app/globals.css` (new `.resizer-*` /
`.sky` blocks appended — no existing rule edited), `tests/catalog.test.ts`,
`tests/launch.test.ts`, `tests/e2e/foundation.spec.ts`, `tests/e2e/quality.spec.ts`
(tool-count and route-list expectations). PDF routes and components are absent from
this repository state and were not created, edited or deleted.

## Image Resizer — ✅ complete (v2 premium editor)

**Branch:** `arena/82ce86c2-quickkit` (continues the v1 work from `feature/image-resizer`,
commit `e5ac3d5`) · **Route:** `/tools/image-resizer` · **Category:** `Image Tools`.
The v1 tool was **upgraded in place**: the route, design system, queue, ZIP writer and
privacy model are unchanged, and no v1 capability was removed.
**Hard rule respected:** Image Compressor work has **not** started.

### v2 upgrade (what changed)

| Area | Added in v2 |
| --- | --- |
| Resize | Longest-side and shortest-side modes; custom presets (save/use/delete, session, max 8); 18 social presets grouped by Instagram, YouTube, Facebook, WhatsApp, X, LinkedIn and Pinterest |
| Editing | Crop (free + 1:1, 4:3, 3:2, 16:9, 9:16, 4:5, overlay handles, keyboard nudge); rotate 90/180/270 + any angle; flip H/V; brightness/contrast/saturation; grayscale, sepia, warm, cool, invert |
| Compare | Split slider and side-by-side original/result, above the existing Original/Result toggle |
| Preview | 25–400 % zoom, fit-to-screen, checkerboard stage with edited-size caption |
| Print | DPI (36–1,200) and print size in cm/inches, both directions, "use print size as pixels" |
| Format | AVIF output where supported (disabled + explained otherwise); quality 10–100 %; live estimate and real output size |
| Batch | Per-image overrides (size, lock, format incl. `Same as batch`, quality, base name, suffix), replace file in place, per-image progress and errors |
| Naming | Rename outputs and filename suffixes, batch-wide or per image, reflected in the ZIP |
| History | Per-image undo/redo (40 steps), Ctrl/⌘+Z, Ctrl/⌘+Shift+Z, reset edits |
| Privacy | Metadata panel (EXIF/GPS/camera/date/ICC/XMP), explicit strip disclosure, EXIF auto-orient toggle |
| SEO/UX | 5-step HowTo, 7 FAQs, FAQPage/HowTo/WebApplication JSON-LD, clearer empty/loading/success/error states |

### Feature checklist (v2 acceptance criteria)

| Area | Requirement | Status | Evidence |
| --- | --- | --- | --- |
| Resize | Exact width/height, whole pixels, 1–8,192 px | ✅ | `planResize` + unit tests |
| Resize | Percentage 5–400 % (slider, field, chips) | ✅ | unit + E2E |
| Resize | Aspect-ratio lock/unlock, swap, match original/edited | ✅ | component + E2E |
| Resize | Fit / Fill / Stretch / Contain modes | ✅ | `planResize` crop maths, pixel-verified E2E |
| Resize | Longest **and** shortest side modes | ✅ | `sideLength`, E2E longest/shortest outputs |
| Resize | Everyday + social presets, custom presets | ✅ | `PRESET_SIZES`, `SOCIAL_PRESETS`, E2E save/use/delete |
| Resize | DPI and print-size controls | ✅ | `validateDpi`, `printPixelSize`, E2E 10×15 cm @ 300 DPI |
| Edit | Crop freeform + fixed ratios, overlay handles, keyboard nudge | ✅ | `image-edits` tests, E2E crop flows |
| Edit | Rotate 90/180/270 + custom angle, flip H/V | ✅ | rotated/flipped pixel-quadrant E2E |
| Edit | Brightness/contrast/saturation, grayscale + filters | ✅ | E2E grayscale/brightness pixel checks |
| Edit | Before/after comparison | ✅ | single/split/side-by-side E2E |
| Format | JPEG, PNG, WebP, AVIF where supported | ✅ | `canEncode`/`formatSupport`, forced-format E2E |
| Format | Quality slider + estimated output size | ✅ | live estimate + real size stats |
| Format | Transparency preserved; JPEG flatten with background colour | ✅ | WebP-alpha vs JPEG E2E |
| Format | Compatibility warnings + metadata/privacy controls | ✅ | in-product notes, metadata panel, EXIF strip E2E |
| Batch | Multi-upload, per-image settings, remove/replace | ✅ | E2E replace + override flows |
| Batch | Bulk resize + bulk conversion, per-image progress/error | ✅ | sequential runner, status chips, batch summary |
| Batch | Individual or ZIP download, rename + suffixes | ✅ | ZIP entry-name E2E |
| UX | DnD upload, thumbnails + large preview, zoom/fit | ✅ | screenshots + E2E zoom/fit |
| UX | Undo/redo, clear empty/loading/success/error states | ✅ | E2E undo/redo/reset |
| UX | Polished desktop/tablet/mobile, QUICKKIT light theme | ✅ | 1440/768/430/390/375/320 screenshots + overflow suite |
| Reliability | Corrupt/unsupported/oversized/invalid files | ✅ | `preflightImage`, validation E2E |
| Reliability | Memory-safe batches, 100 % local processing | ✅ | 20-file cap, 24 MP cap, sequential queue, no-network test |
| A11y | Keyboard accessibility, tooltips, labels | ✅ | axe 0 violations empty **and** populated editor |
| SEO | Metadata + structured data | ✅ | `toolStructuredData`, `tests/seo.test.ts`, metadata suite |
| Docs | README, this file, `docs/FEATURE_IMAGE_RESIZER.md` | ✅ | — |

### Verification (this branch)

```text
npx tsc --noEmit     ✅ 0 errors
npx eslint .         ✅ 0 problems
npx vitest run       ✅ 12 files, 193 tests passed
npm run build        ✅ 19 static routes, /tools/image-resizer prerendered
playwright chromium  ✅ 130 passed — foundation/core/quality/browser-tools
                        + image-resizer (6) + image-resizer-edits (13)
log                  docs/verification/image-resizer-v2-checks.txt
screenshots          docs/verification/image-resizer-v2-*.png
```

Cross-browser note: Playwright ran in Chromium in this sandbox (only one browser build could
be provisioned). Firefox/WebKit projects remain configured and are expected to run in CI.

### Known limits (documented in-product)

- AVIF encoding depends on the browser; unsupported options are disabled and explained.
- Custom presets last for the browser session only (no storage, by design), max 8.
- A canvas encoder cannot write a DPI tag: the panel converts values, printers read pixels.
- Canvas re-encoding strips EXIF/GPS/XMP/ICC (privacy default); the original file is untouched.
- Animation collapses to one frame; HEIC, GIF and SVG inputs are rejected by design.
- Upscaling adds pixels, not detail. The ZIP uses the stored method (photos are compressed).

## Next up (not started)

1. **Image Compressor v2** — starts only after the Image Resizer is approved.
2. Image Tools category polish: shared image queue component, if a third image tool lands.

## PDF tools

PDF Merger and PDF Splitter are pending in a separate workstream. This branch adds no
PDF files, changes no PDF status, and does not touch any shared file that the PDF
workstream owns. When that work merges, the only likely conflict is the menu of tool
records in `lib/catalog.ts`, which appends cleanly.
