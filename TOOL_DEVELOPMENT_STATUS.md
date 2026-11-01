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
| 7 | **Image Tools** | **Image Resizer** | `/tools/image-resizer` | ✅ **Done — awaiting owner approval** | `feature/image-resizer` | New category. Feature checklist below |
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

## Image Resizer — ✅ complete

**Branch:** `feature/image-resizer` · **Route:** `/tools/image-resizer` ·
**Category:** `Image Tools` (new) · **Approval:** pending owner sign-off.
**Hard rule respected:** Image Compressor work has **not** started.

### Feature checklist

| Area | Requirement | Status | Evidence |
| --- | --- | --- | --- |
| Dimensions | Custom width + height, whole pixels, 1–8,192 px | ✅ | `planResize` + 52 unit tests |
| Dimensions | 24 MP output ceiling with a plain-language error | ✅ | unit + E2E guard test |
| Aspect ratio | Lock → second side follows the source ratio | ✅ | `linkedHeight` / `linkedWidth`, E2E |
| Aspect ratio | Unlock → free stretch, explicit warning copy | ✅ | E2E "unlocked dimensions" test |
| Aspect ratio | Swap width ↔ height, match original | ✅ | component wiring |
| Percentage | 5–400% slider + numeric input + 25/50/75/100 chips | ✅ | `validatePercentage`, E2E |
| Percentage | Live target calculation, zero-pixel clamp, per-side guard | ✅ | unit tests |
| Presets | 8 everyday sizes (HD, Full HD, 4K, square, portrait, compact, thumbnail, 3:2) | ✅ | `PRESET_SIZES` |
| Social | Instagram post/portrait/story, Facebook, X, LinkedIn, YouTube, Pinterest | ✅ | `SOCIAL_PRESETS` |
| Social | Fill & crop (centred), Fit inside, Stretch | ✅ | `planResize` crop maths, pixel-verified E2E |
| Preview | Original/resized toggle, checkerboard stage, live target badge | ✅ | screenshots |
| Preview | Per-file stats: source size/format, target, output size, scale %, MP | ✅ | `resizer-stats` |
| Batch | Up to 20 files, sequential queue, per-file status + progress | ✅ | `resizeAll`, E2E 2-file batch |
| Batch | Per-file remove, per-file download, batch-limit notice | ✅ | E2E remove test |
| Formats | JPEG, PNG, WebP output; JPEG background colour picker | ✅ | E2E decode of JPEG/PNG/WebP bytes |
| Quality | 10–100% for JPEG/WebP, disabled for lossless PNG | ✅ | E2E |
| ZIP | Real stored-method ZIP written in-browser, unique names | ✅ | `lib/tools/zip.ts` + E2E ZIP byte inspection |
| Privacy | No network: decode, resize, encode, ZIP all client-side | ✅ | existing "no input is transmitted" suite |
| Validation | Empty batch, wrong type, empty file, >15 MB, corrupt bytes, invalid size | ✅ | `validateImage`, `preflightImage`, E2E |
| Errors | Per-file error rows, batch summary, stale-output invalidation | ✅ | E2E |
| Accessibility | Radio groups, labels, `aria-pressed` locks, `aria-invalid`, roles, focus-visible, 44 px targets | ✅ | axe (WCAG 2.2 AA) on route |
| Responsive | 320–1440 px, no horizontal overflow, mobile control order | ✅ | 7 widths in `quality.spec.ts` |
| SEO | Title, description, canonical/OG/Twitter via `pageMetadata`, sitemap entry | ✅ | `tests/launch.test.ts`, metadata suite |
| Docs | Usage steps + 6 FAQs on-page, README, this file | ✅ | — |

### Verification (this branch)

```text
npm run lint        ✅ 0 problems
npm run typecheck   ✅ 0 errors
npm test            ✅ 134 passed (10 files) — 52 new resizer maths, 9 new ZIP,
                       4 new component tests, catalog/launch expectations updated
npm run build       ✅ 17 routes static, /tools/image-resizer prerendered
npm run test:e2e    ✅ 117 passed (chromium) — quality/a11y/overflow + 7 resizer flows
Screenshots         docs/verification/image-resizer-{top-1440,1440,375,top-375,catalog-1440}.png
```

Cross-browser note: `playwright test` was executed in Chromium in this environment
(the Linux sandbox could only provision one browser build). Firefox/WebKit projects
remain configured and are expected to run in CI, where the full browser set installs.

### Known limits (documented in-product)

- Canvas re-encoding removes EXIF/GPS/colour profiles; the original is never modified.
- Animation collapses to one frame; HEIC, GIF and SVG inputs are rejected by design.
- Upscaling adds pixels, not detail.
- Full rotations are not applied; camera orientation from `createImageBitmap` is honoured
  when the browser supports it.
- The ZIP uses the stored (uncompressed) method because photos are already compressed.

## Next up (not started)

1. **Image Compressor v2** — starts only after the Image Resizer is approved.
2. Image Tools category polish: shared image queue component, if a third image tool lands.

## PDF tools

PDF Merger and PDF Splitter are pending in a separate workstream. This branch adds no
PDF files, changes no PDF status, and does not touch any shared file that the PDF
workstream owns. When that work merges, the only likely conflict is the menu of tool
records in `lib/catalog.ts`, which appends cleanly.
