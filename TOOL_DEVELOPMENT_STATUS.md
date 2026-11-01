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
| 6 | Image & QR → **Image Tools** | Image Compressor | `/tools/image-compressor` | ✅ **Done (v2) — awaiting owner approval** | `feature/image-compressor` | Upgraded in place and passed the final real-image QA: quality + target size, batch, before/after, transparency, ZIP, naming, Stop/Retry. Reports: `docs/FEATURE_IMAGE_COMPRESSOR.md`, `docs/QA_IMAGE_COMPRESSOR_AUDIT.md` |
| 7 | **Image Tools** | **Image Resizer** | `/tools/image-resizer` | ✅ **Done — owner approved** | `feature/image-resizer` | New category. v1 shipped, v2 upgrade complete, **approved by the owner on 1 Nov 2026** (frozen) |
| — | Image Tools | Next image tool | — | ⬜ Planned | — | Not started; waits for the owner to choose it |
| — | PDF Tools | PDF Merger | — | ➖ Owned elsewhere | PDF workstream | **Not touched: no code, no status change, no shared files rewritten** |
| — | PDF Tools | PDF Splitter | — | ➖ Owned elsewhere | PDF workstream | **Not touched: no code, no status change, no shared files rewritten** |

Only these shared files gained additive entries for the image work: `lib/catalog.ts`
(tool records + `"Image Tools"` category), `components/catalog.tsx` and
`components/tool-icon.tsx` (icon map entries), `app/globals.css` (new `.resizer-*`,
`.sky` and `.compressor-*` blocks appended — no existing rule edited),
`tests/catalog.test.ts`, `tests/launch.test.ts`, `tests/e2e/foundation.spec.ts`,
`tests/e2e/quality.spec.ts` (tool-count and route-list expectations). The Image
Compressor moved from *Image & QR* to *Image Tools*; its route and features were kept
and extended. PDF routes and components are absent from this repository state and were
not created, edited or deleted.

## Image Resizer — ✅ complete (v2 premium editor)

**Branch:** `arena/82ce86c2-quickkit` (continues the v1 work from `feature/image-resizer`,
commit `e5ac3d5`) · **Route:** `/tools/image-resizer` · **Category:** `Image Tools`.
The v1 tool was **upgraded in place**: the route, design system, queue, ZIP writer and
privacy model are unchanged, and no v1 capability was removed.
**Hard rule respected:** the Image Resizer is frozen — the later Image Compressor work did not touch it.

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
| Control | **Audit pass:** determinate progress bar, `Stop` for a running batch (finished images kept), `Retry failed (n)`, `Match original`, fitted-then-zoomed scrollable preview with true pan |
| Naming | Rename outputs and filename suffixes, batch-wide or per image, reflected in the ZIP |
| History | Per-image undo/redo (40 steps), Ctrl/⌘+Z, Ctrl/⌘+Shift+Z, reset edits |
| Privacy | Metadata panel (EXIF/GPS/camera/date/ICC/XMP), explicit strip disclosure, EXIF auto-orient toggle |
| SEO/UX | 5-step HowTo, 7 FAQs, FAQPage/HowTo/WebApplication JSON-LD, clearer empty/loading/success/error states |

### Feature checklist — final audit status

Legend: **VERIFIED** = implemented and proven by an automated test (pixel/byte level where visual);
**NOT SUPPORTED** = impossible in-browser or in this sandbox and labelled as such in-product;
**NOT IMPLEMENTED** = deliberately absent (no dead control exists for it).
Full report with per-feature evidence: `docs/QA_IMAGE_RESIZER_AUDIT.md`.

| Area | Requirement | Status | Evidence |
| --- | --- | --- | --- |
| Crop | Freeform drag, keyboard nudge, numeric X/Y/W/H | **VERIFIED** | audit crop test (drag → X>0, `ArrowLeft` −2 px, reset) |
| Crop | Fixed ratios 1:1, 4:3, 3:2, 16:9, 9:16, 4:5 | **VERIFIED** | edits suite 1:1 → 600×600; screenshot 16:9 → 1,600×900 |
| Crop | Crop frame inside a rotated image | **NOT SUPPORTED** | rotation applies after the crop |
| Edit | Rotate 90/180/270 | **VERIFIED** | pixel-quadrant decode (600×800 from 800×600) |
| Edit | Custom angle with correct bounding box | **VERIFIED** | 400×300 @ 37° → 499×458 decoded |
| Edit | Flip H / V | **VERIFIED** | corner-colour swap test |
| Edit | Brightness / contrast / saturation | **VERIFIED** | live CSS filter + exported pixel tests |
| Edit | Grayscale, sepia, warm, cool, invert (baked in) | **VERIFIED** | 5 distinct downloaded-PNG samples |
| Edit | EXIF auto-orient toggle | **VERIFIED** | checkbox drives `imageOrientation` |
| Edit | Curves / masks / sharpening | **NOT IMPLEMENTED** | out of scope, no UI surface |
| History | Undo / Redo (40 steps, per image) + shortcuts | **VERIFIED** | edits suite undo/redo test |
| History | Reset edits / reset per-image settings | **VERIFIED** | edits + audit suites |
| Compare | Split slider with BEFORE/AFTER | **VERIFIED** | split line at 25 % asserted |
| Compare | Side-by-side with captions | **VERIFIED** | two captioned figures asserted |
| Compare | Original ⇄ Result toggle | **VERIFIED** | tag flips back to source size |
| Batch | Per-image size/lock/format/quality/name/suffix | **VERIFIED** | ZIP entry names decoded from the archive |
| Batch | Replace and remove a queued file | **VERIFIED** | replace keeps position, resets crop |
| Batch | Queue reordering | **NOT IMPLEMENTED** | upload order only, no drag handle shown |
| ZIP | Only finished images, final names, valid PNG/JPEG/WebP payloads | **VERIFIED** | mixed-batch ZIP: 2 entries, damaged file absent, PNG decoded |
| ZIP | Duplicate names de-duplicated | **VERIFIED** | `uniqueName` + zip unit tests |
| ZIP | Deflate compression | **NOT SUPPORTED** | stored method by design |
| Output | Dimensions equal the plan (PNG/JPEG/WebP) | **VERIFIED** | 6 decoded sizes across suites |
| Output | Transparency kept (PNG/WebP), flattened (JPEG) + background colour | **VERIFIED** | alpha matrix + red background decode |
| Output | Quality slider changes encoded size | **VERIFIED** | q20 < q95 bytes, both decodable |
| Output | AVIF | **NOT SUPPORTED** in this Chromium | option disabled and labelled; capability auto-detected |
| Progress | Determinate bar (n/total, %) | **VERIFIED** | added in audit pass, asserted visible then cleared |
| Progress | Stop a running batch, keep finished output | **VERIFIED** | added in audit pass, asserted end-to-end |
| Progress | Cancelling mid-encode | **NOT SUPPORTED** | encoders are not abortable; Stop applies after the in-flight image (tooltip says so) |
| Errors | Per-image error text, batch summary, retry failed | **VERIFIED** | corrupt-file test, `Retry failed (1)` |
| Errors | Wrong type/empty/oversized/limit rejections | **VERIFIED** | validation suites + unit tests |
| Mobile | Touch thumbnail, tabs, crop drag, no overflow | **VERIFIED** | touch pointer events + overflow checks at 390 px |
| Mobile | ≥ 40 px icon targets | **VERIFIED** | mobile CSS block + measured heights |
| A11y | Every visible control has an accessible name | **VERIFIED** | 0 unnamed across 4 states |
| A11y | axe WCAG 2.0/2.1/2.2 A+AA | **VERIFIED** | 0 violations, empty route and populated editor |
| A11y | Screen-reader narration of crop edges while dragging | **NOT IMPLEMENTED** | numeric crop fields are the accessible path |
| Preview | Zoom 25–400 % with pan + Fit to screen | **VERIFIED** | fitted preview stays inside the stage; zoom 150 % overflows and pans |
| Resize | Dimensions, percentage, longest/shortest side, presets (+custom), DPI/print | **VERIFIED** | edits + audit suites, print 10×15 cm @ 300 DPI → 1,181 × 1,772 px |
| SEO | Metadata + WebApplication/HowTo/FAQPage JSON-LD, 5 steps, 7 FAQs | **VERIFIED** | audit structured-data test |

### Verification (at the resizer sign-off)

```text
npx tsc --noEmit     ✅ 0 errors
npx eslint .         ✅ 0 problems
npx vitest run       ✅ 12 files, 193 tests passed
npm run build        ✅ 19 static routes, /tools/image-resizer prerendered
playwright chromium  ✅ 146 passed (1.9 m) — foundation/core/quality/browser-tools
                        + image-resizer (6) + image-resizer-edits (13)
                        + image-resizer-audit (16, added in the final audit)
log                  docs/verification/image-resizer-v2-checks.txt
report               docs/QA_IMAGE_RESIZER_AUDIT.md  (VERIFIED / NOT SUPPORTED / NOT IMPLEMENTED)
screenshots          docs/verification/image-resizer-v2-*.png and -v3-*.png
```

Cross-browser note: Playwright ran in Chromium in this sandbox (only one browser build could
be provisioned). Firefox/WebKit projects remain configured and are expected to run in CI.

### Known limits (documented in-product)

- AVIF encoding depends on the browser; unsupported options are disabled and explained.
- `Stop` halts the queue after the in-flight image settles — browser encoders are not abortable.
- Custom presets last for the browser session only (no storage, by design), max 8.
- A canvas encoder cannot write a DPI tag: the panel converts values, printers read pixels.
- Canvas re-encoding strips EXIF/GPS/XMP/ICC (privacy default); the original file is untouched.
- Animation collapses to one frame; HEIC, GIF and SVG inputs are rejected by design.
- Upscaling adds pixels, not detail. The ZIP uses the stored method (photos are compressed).

## Image Compressor — ✅ complete (v2) · awaiting owner approval

**Branch:** `feature/image-compressor` (work also committed on `arena/82ce86c2-quickkit`) ·
**Route:** `/tools/image-compressor` · **Category:** `Image Tools`.
The original single-image tool was **upgraded in place**; no existing capability was
removed and the Image Resizer was not modified. Full record:
`docs/FEATURE_IMAGE_COMPRESSOR.md`.

| Area | Delivered |
| --- | --- |
| Formats | JPEG, PNG, WebP, plus AVIF where the browser can encode it (disabled + labelled otherwise) |
| Size control | Quality mode 10–100 % **and** target mode in KB/MB with binary quality search and controlled downscaling |
| Batch | Up to 20 images, per-image overrides, per-image progress, errors and retry |
| Compare | Original ⇄ Result, Split slider, Side by side, BEFORE/AFTER captions |
| Numbers | Original vs compressed size, **% savings**, dimensions, quality used, target status |
| Transparency | Kept for PNG/WebP/AVIF; JPEG flattens onto a chosen background (default white) |
| Downloads | Individual files **and** a ZIP with final names |
| Naming | Rename outputs and filename suffixes, batch-wide or per image |
| Control | Determinate progress, Stop (finished images kept), Retry failed (n), Reset |
| Privacy | 100 % local; metadata panel explains EXIF/GPS/ICC stripping; URLs revoked on reset/unmount |
| SEO/UX | 5-step HowTo, 7 FAQs, `WebApplication`/`HowTo`/`FAQPage` JSON-LD, axe clean |
| Bug fixed | Large-image target search returned a full-quality blob when the budget ran out; now the smallest encode is returned with “not reachable” and a 3,600 × 2,400 PNG hits a 40 KB target |
| QA fixes | EXIF-rotated photos report the displayed dimensions; PNG target mode no longer claims “q100” and skips redundant encodes; the JPEG flatten colour is reachable for per-image overrides; target mode no longer advertises a fixed quality; cancelling a re-run keeps finished items “Done” |

### Final real-world QA (1 November 2026)

`docs/QA_IMAGE_COMPRESSOR_AUDIT.md` — verified with real photographs, a real transparent
PNG, decoded pixels, `unzip -t` CRC checks and byte-level savings maths. Six defects were
found and fixed (unreachable-target fallback, EXIF orientation, PNG target labelling,
per-image JPEG colour, target-mode footer, cancelled-item status).

```text
npx tsc --noEmit     ✅ 0 errors
npx eslint .         ✅ 0 errors, 0 warnings
npx vitest run       ✅ 13 files, 220 tests passed
npm run build        ✅ 19 static routes, /tools/image-compressor prerendered
playwright chromium  ✅ 181 passed — all specs
                       · image-compressor-audit.spec.ts 21 (final QA)
                       · image-compressor.spec.ts 14
                       · browser-tools.spec.ts 6 compressor scenarios
screenshots          docs/verification/image-compressor-*.png
```

## Next up (not started)

1. **Owner approval for the Image Compressor** — it is complete and awaiting sign-off; nothing new starts before that.
2. Image Tools category polish: shared image queue component, if a third image tool lands.

## PDF tools

PDF Merger and PDF Splitter are pending in a separate workstream. This branch adds no
PDF files, changes no PDF status, and does not touch any shared file that the PDF
workstream owns. When that work merges, the only likely conflict is the menu of tool
records in `lib/catalog.ts`, which appends cleanly.
