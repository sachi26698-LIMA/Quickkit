# QUICKKIT Image Cropper — QA audit

Route `/tools/image-cropper` · branch `feature/image-cropper` · audit date **1 November
2026** · run in Chromium (production build, `next start` on port 3001).

Method: **real files, real pixels and real bytes.** Every claim below is produced by either a
unit test (`tests/image-crop.test.ts`, 28 tests), a browser test
(`tests/e2e/image-cropper-audit.spec.ts`, 21 tests) or a manual probe that decoded the
downloaded file and read pixel values. Nothing is asserted from the screen alone.

---

## 1. Fixtures

| Fixture                      | What it is                                                                          | Why it matters                                             |
| ---------------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `quadrants(400×300)`         | PNG split into red / green / blue / yellow quarters                                 | proves which pixels land where after crop, rotate and flip |
| `alphaPng(600×400)`          | transparent PNG with an opaque coloured square                                      | proves alpha survives crop and circle masking              |
| `gradientPhoto(3600×2400)`   | noisy gradient JPEG (~5 MB)                                                         | proves a large photo keeps 1:1 pixels and stays responsive |
| `exifOriented()`             | 200×300 JPEG with EXIF orientation **6** (stored landscape-ish, displayed portrait) | proves EXIF is applied before the frame is drawn           |
| real photograph (1264×848)   | mountain-lake JPEG                                                                  | visual screenshots, compare view, batch, ZIP               |
| real large photo (6000×4000) | 24 MP JPEG                                                                          | verification of the top limit and batch timing             |

Decoding in the audit uses `createImageBitmap` + `getImageData` on the downloaded blob, so a
file is only accepted when its **signature**, **dimensions** and **pixel colours** are right.

---

## 2. Per-feature evidence

| Feature             | Evidence                                                                                                                            |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Baseline crop       | Whole-frame export of a 400×300 PNG is `crop-cropped-400x300.png`; decoded 400×300, PNG signature                                   |
| Freeform drag       | Dragging the frame right/down moves X and Y; the crop label and export bounds follow                                                |
| Corner resize       | SE drag of (−120, −80) on a 1200×800 crop changes the frame and the exported pixel size; NW drag anchors the opposite corner        |
| Fixed ratios        | `1:1` on 1200×800 → 800×800 at x=200 (centred, largest); unit tests pin 4:3, 3:2, 16:9, 9:16, 4:5                                   |
| Instagram preset    | `Instagram post` → 1:1 frame, export name `…cropped-1080x1080.png`, planned size 1080×1080                                          |
| YouTube preset      | `YouTube thumbnail` → 16:9 frame, planned size 1280×720                                                                             |
| Custom size         | 600×400 → frame ratio 3:2, export exactly 600×400                                                                                   |
| Rotation            | 400×300 quadrants + 90° right → decoded 300×400 WebP with TL blue / TR red / BL yellow / BR green (a clockwise turn)                |
| Flip after rotation | Flip H → decoded 300×400 with red / blue / green / yellow (a true horizontal mirror of the rotated frame)                           |
| Rotate back         | 90° left then 180° returns the source to 400×300 and the export name to `…400x300`                                                  |
| Circle + PNG        | 300×300 square crop, corner alpha 0 at (2 %,2 %), opaque centre, corner handle still reachable                                      |
| Circle + JPEG       | Background colour `#000000` fills the corners; decoded corner is black, centre is image                                             |
| Formats             | Downloaded bytes start with `FFD8FF` (JPEG), `89504E47` (PNG) and `RIFF….WEBP` (WebP)                                               |
| Quality             | Slider 40 % vs 90 % changes encoded bytes and the visible quality; PNG disables the slider and reports “Lossless”                   |
| Output size         | Crop pixels / Scale % / Custom px / Preset each change the decoded output size; custom values are validated                         |
| Compare             | Split view has two layers and a divider that moves with the range input; side-by-side has ORIGINAL and CROPPED figures              |
| Batch               | Three images with three different settings (free, square PNG, circle + rotated) all finish `Done` with the expected names and sizes |
| Apply to all        | Ratio/shape and export settings copy to every item; frames stay untouched                                                           |
| Naming              | Base name + suffix produce `custom-ig-640x800.webp`; the ZIP lists the same names, de-duplicated when two outputs collide           |
| EXIF                | Orientation-6 JPEG reports `300 × 200` displayed, shows the “auto-corrected” orientation line, and exports landscape pixels         |
| Undo / redo / reset | Edits increment the counter; undo restores the earlier frame, redo re-applies it, reset returns to the full frame                   |
| Transparency        | Rectangle crop of a transparent PNG keeps alpha 0 outside the opaque square                                                         |
| Large photo         | 3600×2400 JPEG, crop 1:1 with PNG → decoded 3600×2400 (no resampling, byte-identical pixel dimensions)                              |
| Invalid sizes       | Width 0 / height 0 show an inline explanation and block the run (no download produced)                                              |
| Privacy             | Request listener sees no external image-bearing requests; only same-origin app assets                                               |

Manual probes (real photograph, 1264×848 and 6000×4000):

```text
load 3 files (two 24 MP + one 1.2 MP)   → 1.1 s
16:9 crop on 6000×4000                  → 6000 × 3375, 361.7 KB WebP, 1:1 pixels
free crop on 6000×4000                  → 6000 × 4000, 424.9 KB WebP
whole batch (3 images, 24 MP each)      → 3.9 s, 3/3 Done, ZIP downloaded
```

---

## 3. Defects found and fixed during this audit

Every defect below was found while testing the real build and is fixed in the same branch.
Product code was **not** softened to match a test; the test was only changed where the
expectation itself was wrong (for example, the rotation colour order).

| #   | Defect                                                                                                                                   | Cause                                                                              | Fix                                                                                                                                                |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | A flip applied after a 90° rotation mirrored the wrong axis in the export                                                                | The canvas applied `rotate → scale`, which mirrors in the pre-rotation space       | Flips now sit **outside** the rotation (`scale → rotate`), in the canvas **and** in the CSS preview, so the preview and the file always agree      |
| 2   | Choosing a ratio or preset after rotating used the unrotated frame, so a 1:1 crop of a rotated 400×300 became 400×300 instead of 300×300 | `applyRatio`/`applyShape`/`applyPreset`/`applyCustomSize` used source width/height | All four now size the crop inside the **oriented** frame; `rotateSettings` also rotates inside the current frame. Covered by new unit tests        |
| 3   | The circle/square shape change re-centred the largest square around the _previous_ crop instead of the frame                             | `squareAround()` kept the old centre and clipped asymmetrically                    | Shapes now use the largest centred 1:1 crop, matching the 1:1 ratio chip                                                                           |
| 4   | 12 colour-contrast failures in the populated editor (labels, hints, queue captions, footnote)                                            | Secondary text used light greys (`#7b7293`, `#8a7fa5`, `#837a9c`) at 9.5–10 px     | Moved to the design's `--secondary` token (`#62697e`) and raised the smallest label to 10.5 px; axe now reports **0 violations** in all four views |
| 5   | On phones the live stage sat below the entire settings column                                                                            | Grid source order                                                                  | The preview panel is ordered first at ≤1024 px, so the frame is visible before the controls; settings follow                                       |

Test-side corrections (expectations, not product changes):

- The rotation test's colour order assumed a counter-clockwise turn; the decoded file proves a
  clockwise 90° turn (BLUE / RED / YELLOW / GREEN), so the expectation was corrected.
- The circle-on-1200×675 case expects 675×675 (1:1 by the shorter side), not 800×800.
- The `1:1` JPEG-circle test sets the background colour to `#000000` first (the default is
  white).
- Slider helpers dispatch through the **native** value setter so React's controlled inputs
  actually receive the change.
- The “no external requests” assertion ignores `blob:` URLs (in-memory images, not network).

---

## 4. Accessibility and responsiveness

```text
axe (wcag2a, wcag2aa, wcag21aa, wcag22aa), populated editor
  · Crop view      0 violations
  · Original view  0 violations
  · Cropped view   0 violations
  · Compare view   0 violations
unnamed interactive controls   0
horizontal overflow at 320/375/430/768 px   0 px
```

The crop box is a focusable `role="group"` with an instruction label; arrow keys nudge the
frame (Shift = larger step) and corner handles nudge their edge. Every icon-only button has
an `aria-label`, sliders have visible labels, and status changes use `role="status"` /
`role="alert"`.

---

## 5. Gates

```text
npx tsc --noEmit     ✅ 0 errors
npx eslint .         ✅ 0 problems
npx vitest run       ✅ 25 files, 364 tests (28 in tests/image-crop.test.ts)
npm run build        ✅ /tools/image-cropper prerendered
playwright chromium  ✅ 210 passed (4.2 m; image-cropper-audit: 21 tests) — pre-merge tree
```

Post-merge (2 November 2026): the branch was integrated with the redesigned `main` shell.
Static gates and the unit suite were re-run green on the merged tree; the browser suites
could not be re-run here because the sandbox has no Chromium and the Playwright CDN is
unreachable. Re-run `npx playwright test` before release.

Screenshots: `docs/verification/image-cropper-empty-1440.png`,
`image-cropper-workspace-1440.png`, `image-cropper-preset-1440.png`,
`image-cropper-zoom-1440.png`, `image-cropper-compare-1440.png`,
`image-cropper-side-by-side-1440.png`, `image-cropper-circle-1440.png`,
`image-cropper-batch-full-1440.png`, `image-cropper-empty-390.png`,
`image-cropper-workspace-390.png`, `image-cropper-mobile-crop-390.png` and the catalog
entry in `image-cropper-catalog-1440.png`.
