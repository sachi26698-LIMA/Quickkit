# QA report — Image to Text (OCR)

Branch: `arena/cac1764b-quickkit` · Route: `/tools/image-to-text` · Category: Text & Writing (also an image tool)
Engine: tesseract.js 6 (LSTM) in a Web Worker, language data served from this origin (`/ocr`).

---

## 1. What shipped

A complete, working OCR workspace — not a mockup — plus catalogue/SEO integration:

| Area | Delivered |
| --- | --- |
| Upload | drag-and-drop or file picker, multi-file batch, per-image thumbnail gallery, per-image preview, remove, reorder, retry, rotate (±90°), crop dialog, select all / deselect all / invert |
| Accepted input | JPG, PNG, WEBP, BMP, TIFF, AVIF, GIF + **scanned PDF** (rendered page-by-page at ~300 DPI, page-range setting, per-PDF page cap) |
| OCR engine | tesseract.js worker, 8 shipped languages (`eng, hin, guj, mar, ben, tam, tel, urd`), multi-language selection, post-OCR script detection with one-click confirmation, auto-orientation assist, grayscale / contrast / brightness / noise removal / deskew before reading |
| Extraction modes | Plain Text, Original Layout, Formatted Text, Table Extraction, Structured Data (key/value), Smart OCR (auto-select with a stated reason) |
| Editor | side-by-side page + text, per-page tabs, editable textarea, undo/redo, find & replace (match case, whole word, replace one / all), copy selection / copy all, low-confidence highlighting, page-wise navigation, re-run OCR on one page or a selection |
| Export | TXT, DOCX, PDF, CSV, JSON, clipboard; combined / this page / selected pages / one file per page; ZIP for multi-file batches; JSON word geometry optional; Unicode preserved; CSV table structure preserved |
| Settings | language, accuracy preference (max side 1600–3200 px), page segmentation, enhancement toggles, extraction mode, page range, batch concurrency, confidence threshold, layout preservation, output formatting |
| Privacy | 100 % on-device: no upload endpoint exists, no fallback to a server renderer, nothing persisted (no `localStorage`/IndexedDB of images or text), engine assets cached only as compiled wasm |
| UI | existing QUICKKIT design system, brand palette (`#3B1B4F`, `#D6598F`, `#FF6B6B`, `#1A0F2E`, `#F4D7D4`), responsive grid that collapses to a single column with a sticky run bar on phones |
| Integration | catalogue record, search ranking, category page, `/tools` count (29), sitemap (47 routes), related tools, breadcrumbs, JSON-LD (`WebApplication` + `HowTo` + `FAQPage`), 8 FAQs, 6-step guide |

## 2. Verification actually run

| Check | Command | Result |
| --- | --- | --- |
| Types | `npx tsc --noEmit` | **clean**, exit 0 |
| Lint | `npx eslint .` | **0 errors, 0 warnings** |
| Format | `npm run format:check` | "All matched files use Prettier code style!" |
| Unit / integration | `npx vitest run` | **57 files, 1079 tests, all passing** |
| Real OCR accuracy | `npx vitest run tests/image-to-text-accuracy.test.ts` | **16/16 passing** (real engine, real fixtures) |
| Production build | `npm run build` | **succeeds**; `/tools/image-to-text` prerendered as static (○) |
| Browser E2E | `npx playwright test tests/e2e/image-to-text.spec.ts` | **written, not executed** — see §5 |

### 2.1 Real OCR accuracy — measured, not claimed

`tests/image-to-text-accuracy.test.ts` runs the same `tesseract.js` build the app ships, over
fixtures that were rendered with HarfBuzz (correct Indic shaping — ImageMagick alone mangles
Devanagari), then pushes the output through this tool's own `buildPage` / `extractPage` pipeline.
Character error rate (CER) ignores punctuation, which legitimately differs between fonts
(`।` vs `.`).

| Fixture | Language(s) | CER | Mean confidence | Notes |
| --- | --- | --- | --- | --- |
| `english-printed.png` (invoice + prose) | eng | **0.0 %** | 95 | every character correct, incl. `4471`, `Ahmedabad` |
| `hindi-printed.png` | hin | **3.1 %** | 93 | one conjunct slip; Devanagari fully preserved |
| `gujarati-printed.png` | guj | **0.0 %** | 94 | zero character errors on a 44 px print page |
| `mixed-language.png` (Gujarati + English) | eng+guj | — | — | both scripts read in one pass; detector reports `guj, eng` |
| `table-receipt.png` (ruled table) | eng | — | — | rows recovered as `["Notebook","2","120","240"]`, `["Pen",…]`, `["Marker",…]` |
| `low-quality.jpg` (35-quality, blurred) | eng | **0.7 %** | 91 | one glyph slip ("Helle"), full sentence recovered |
| `small-text.png` (small UI text) | eng | — | — | `Settings > Privacy > On-device processing` etc. |
| `handwritten-note.png` (italic, tilted 2.5°) | eng | **0.0 %** | 93 | italic print, **not** cursive — handwriting is not claimed |
| `rotated-90.png` | eng | — | — | after the UI's rotate step: `QUICKKIT INVOICE / Invoice No: 4471` |
| skew: page rotated −4° | eng | — | — | estimator returns **+4.0°**, correction restores `QUICKKIT` |
| `large-image.png` (12 MP) | eng | — | — | downscaled to 2400 px wide, still reads `Large scanned page` |
| `blank.png` | eng | — | — | returns `""` and **no** lines — no invented text |
| batch of 3 files, one worker | eng | — | — | all three read with a single engine instance |

Structured-data extraction on the invoice fixture produced
`Invoice No=4471 | Date=12 March 2026 | Customer=Riya Patel | Address=12 MG Road, Ahmedabad`.

### 2.2 Bugs found and fixed during this QA pass

1. **Table detection never fired on real OCR output.** Tesseract emits a whole table row as one
   `line` ("Notebook 2 120 240"), so every "row" had one cell. Added `splitLineIntoCells` +
   `cellRows`, with the column-gap threshold derived from line height, and an x-alignment check
   across rows so prose is still not mistaken for a table. CSV export of tables now works.
2. **Skew estimation was wrong by ~1.5° and badly non-linear** because the internal downsample
   stretched the aspect ratio. Now uses one isotropic factor, plus a coarse-to-fine search:
   `−5→5, −4→4, −2→2, −1→0.75, 0→0` degrees.
3. **`lowConfidenceShare` was hardcoded to `0`** on every page, so the "uncertain words" report
   was always empty. Now computed from the page's words against the user's confidence threshold
   (`buildPage` gained the `threshold` parameter, wired from settings in `runner.ts`).
4. **Indic fixtures were mis-shaped** (ImageMagick does no complex shaping, so "हिंदी" rendered as
   "हदि"). Fixtures are now generated with HarfBuzz + FreeType, which is why the Hindi/Gujarati CER
   numbers above are meaningful.

## 3. Files

- `app/tools/image-to-text/page.tsx` — server page, metadata, JSON-LD, guide, 8 FAQs
- `components/tools/image-to-text/{index,upload-panel,crop-dialog,settings-panel,editor-pane,preview-pane,export-panel,shared}.tsx`
- `lib/tools/image-to-text/{types,geometry,extract,language,preprocess,engine,prepare,export,editor,runner}.ts`
- `scripts/copy-ocr-assets.mjs` — copies 8 trained-data packs + wasm core to `public/ocr` (gitignored, `npm run prepare:ocr`)
- `app/globals.css` — `i2t-*` styles, `.rose` icon accent
- Catalogue: `lib/catalog.ts`, `components/tool-icon.tsx`
- Tests: `tests/image-to-text-{geometry,extract,preprocess,editor,export,runner,catalog,accuracy}`,
  `tests/e2e/image-to-text.spec.ts`, fixtures under `tests/fixtures/image-to-text/`

## 4. Honest limitations

- **Handwriting**: best-effort only. Clean block capitals usually read; joined-up script, signatures
  and stamps frequently do not. The UI says so and highlights uncertain words instead of guessing.
- **Indic accuracy depends on print quality.** The measured 0–3 % CER above is on clean 44 px renders;
  low-DPI phone photos are worse. Nothing in the UI promises otherwise.
- **PDF export is not selectable for Indic scripts.** Standard PDF base fonts cannot encode
  Devanagari/Gujarati/Bengali/Tamil/Telugu/Urdu, so those pages are embedded as high-resolution
  images inside the PDF and the export report says so. TXT/DOCX/JSON keep full Unicode text.
- **Language coverage is exactly the eight shipped packs.** No other language is advertised
  anywhere; the E2E suite asserts that Japanese/Korean/Arabic/Thai never appear.
- **Auto-rotation** is a deterministic quarter-turn control plus a post-OCR orientation hint, not
  magic: pages that are 180° off still need one click.

## 5. What could not be verified here

- **No browser screenshots and no executed E2E.** This environment could not download Playwright
  browsers (`cdn.playwright.dev` → `ECONNRESET`, retried and abandoned) and has no system Chromium.
  `tests/e2e/image-to-text.spec.ts` (12 flows: catalogue/search/category, SEO + JSON-LD, English read,
  Hindi+Gujarati Unicode + TXT export, table→CSV, rotation, batch progress, find & replace, unsupported
  file, language honesty, 390 px mobile overflow) is written and type-checked but **has never run**.
  Consequently **no UI screenshots are attached to this report** — I will not present images I did
  not produce. Running `npm run prebuild && npm run test:e2e` on a machine with Chromium will produce
  both the pass/fail evidence and the screenshots.
- OCR was validated in Node against the identical engine build and asset set; the browser path
  differs only in the worker transport, which the unit tests cover, but that gap is real until the
  E2E suite runs.

## 6. Status

Nothing was merged and nothing was deployed. The branch is left ready for review.
