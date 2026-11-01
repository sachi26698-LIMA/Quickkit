# QUICKKIT Image Resizer — feature and UI record

Branch `feature/image-resizer` · route `/tools/image-resizer` · category **Image Tools**.
Everything below was implemented, tested and screenshotted on this branch.

## 1. Feature checklist

### Input and validation
- [x] Multi-file picker **and** drag-and-drop onto one drop zone (accessible `<label>` wrapper).
- [x] Accepts JPEG, PNG and WebP; rejects anything else with a named, actionable error.
- [x] Per-file header preflight before decode: magic bytes, IHDR/SOF/VP8X parsing, 15 MB limit, 24 MP limit, 8,192 px per side.
- [x] Empty, corrupt and mismatched files produce their own messages; good files still load.
- [x] Batch cap of 20 with an explicit "only N more could be added" notice.
- [x] Duplicate and unicode filenames handled (`uniqueName`, `sanitizeBaseName`).

### Resizing
- [x] **Custom dimensions** with whole-pixel, 1–8,192 px and 24 MP validation.
- [x] **Aspect-ratio lock** (padlock, `aria-pressed`) — the other side follows the active image's ratio.
- [x] **Unlock** for free width/height (stretch), with inline copy explaining the distortion.
- [x] **Swap** width ↔ height and **Match original**.
- [x] **Percentage resize** 5–400% via slider, numeric field and 25/50/75/100 chips.
- [x] **Preset sizes**: HD, Full HD, 4K UHD, Square, Portrait, Compact, Thumbnail, 3:2 photo.
- [x] **Social presets**: Instagram post/portrait/story, Facebook post, X post, LinkedIn banner, YouTube thumbnail, Pinterest pin.
- [x] **Fit modes** in preset mode: Fill & crop (centred, never distorted), Fit inside, Stretch.
- [x] High-quality resampling with progressive halving (no aliasing on big reductions).
- [x] Camera orientation honoured through `createImageBitmap({ imageOrientation: "from-image" })` with `<img>` fallback.

### Preview and output
- [x] Original ⇄ Resized preview toggle on a checkerboard stage (transparency visible).
- [x] Live target badge, plus a stats panel: source size/format, target box/format/quality, output size with "N% smaller", scale %, megapixels, centre-crop note.
- [x] **Format conversion** JPEG / PNG / WebP with per-option notes.
- [x] **Quality slider** 10–100% for JPEG and WebP, disabled and labelled for lossless PNG.
- [x] **Background colour picker** for JPEG (flattens transparency).
- [x] Per-file download links with predictable names (`name-1080x1080.webp`).
- [x] **ZIP download** built in-browser (stored method, CRC-32, UTF-8 names) for every finished image.

### Batch behaviour
- [x] Sequential queue with per-file status chips (Ready / Working… / Done / Failed).
- [x] Batch progress in the primary button and an `aria-live` status line.
- [x] Remove single files, reset the entire workspace.
- [x] Changing any setting invalidates finished outputs, so a download can never be stale.
- [x] Object URLs are revoked on invalidation, removal, reset and unmount.

### Privacy
- [x] No upload: decode, crop, resize, encode and ZIP all run on the device; no analytics, no storage, no network calls from the workspace.
- [x] Covered by the existing "no tool input is transmitted by interactions" browser test.

### Accessibility
- [x] Every control labelled; mode/preset/fit are real radio groups in fieldsets (arrow-key navigable).
- [x] `aria-pressed` for lock and preview toggles, `aria-invalid` + described-by error wiring, `role="alert"` for errors, `role="status"` for results.
- [x] Focus-visible outlines, ≥44 px targets, no colour-only meaning, 16 px mobile inputs (no iOS zoom).
- [x] axe (wcag2a/2aa/21aa/22aa) reports **0 violations** on the route.

### Responsive and SEO
- [x] 320/375/390/430/768/1366/1440 px with zero horizontal overflow.
- [x] Two-column workspace ≥1000 px, stacked mobile layout with re-ordered dimension controls.
- [x] Title, description, canonical/OG/Twitter metadata, sitemap entry, breadcrumbs, on-page steps + FAQs.

### Testing
- [x] 52 unit tests for resize maths, presets, naming and size labels.
- [x] 9 unit tests for the ZIP writer (EOCD, central directory, CRC-32 vectors, timestamps, dedupe).
- [x] 4 component tests (empty state, mode switching, presets, lock, PNG quality).
- [x] 7 browser flows: validation, locked resize, percentage + social crop/fit, unlocked JPEG, batch + ZIP byte inspection, remove/reset/invalidation, invalid-target guard.
- [x] Every download decoded and measured (PNG/JPEG/WebP dimensions, RIFF/WEBP signature, JPEG SOI).

## 2. UI / UX proposal (as built)

### Layout
- Same premium light shell as every QUICKKIT tool: breadcrumbs → tool icon + eyebrow → H1 → description → white workspace card.
- Workspace order: drop zone → **Resize settings** (left, 1.28fr) + **Preview & output** (right, 1fr) → action row → status → batch queue.
- The action row keeps one primary action (Resize), with ZIP download and Reset as secondaries; the output format/quality reminder sits on the right.

### Visual system
- Reuses the design tokens only: `--purple #6657e8`, lavender tints, `--border`, `--radius`, `--shadow`, 10–16 px radii, Geist, Lucide 1.6–1.7 px strokes.
- New category colour `sky` (`#e8f2ff` / `#4b76ad`) for the Image Tools icon, next to the existing purple/blue/mint/peach set.
- Translucent purple drop zone with a soft focus ring; selected mode = white "pill" inside a lavender trough; selected preset = lavender tint with inset ring; status chips use muted semantic green/amber/red.
- Checkerboard preview stage so transparency is obvious; the preview shows the exact output pixels and, after a run, a 1:1 "Resized" view.

### Interaction details
- Aspect lock is a single 44 px padlock between the two numeric fields (`aria-pressed`, tooltip explains the consequence).
- Preset browsing is grouped: **Everyday sizes** and **Social media**, each a 2-column card grid with pixel dimensions and a short ratio note.
- Fit mode is a compact segmented control (Fill & crop / Fit inside / Stretch) with the crop result spelled out under it ("centred crop of 1,200 × 1,200 px").
- Batch rows: 44 px thumbnail (also the "select for preview" button), name, `source → target` line, size delta or error, status chip, download and remove icon buttons.
- Motion is limited to hover/focus elevation and honours `prefers-reduced-motion` via the global reset.

### Mobile
- Drop zone collapses to a full-width "Choose files" button.
- Dimensions become a 2-column grid with the lock and swap on their own full-width row.
- Presets drop the ratio note to stay compact; action buttons stretch to full width.

## 3. Evidence

| File | What it shows |
| --- | --- |
| `docs/verification/image-resizer-top-1440.png` | Desktop first view: drop zone, settings, live preview |
| `docs/verification/image-resizer-1440.png` | Completed 2-file batch with social preset, crop note and queue |
| `docs/verification/image-resizer-1440-full.png` | Full desktop page including guidance and FAQs |
| `docs/verification/image-resizer-top-375.png` / `image-resizer-375.png` | Mobile first view and completed single-file percentage resize |
| `docs/verification/image-resizer-375-full.png` | Full mobile page |
| `docs/verification/image-resizer-catalog-1440.png` | Home catalog filtered to the new Image Tools category |

## 4. Out of scope (deliberate)

- Image Compressor changes — a separate, later task.
- PDF Merger / PDF Splitter — a separate workstream, untouched here.
- Server rendering of pixels, HEIC decoding, GIF animation, background removal, EXIF editing: would need new dependencies or a server, which contradicts the local-first rule.
