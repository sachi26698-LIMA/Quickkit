# QA report — Image to Text (OCR)

Branch: `arena/cac1764b-quickkit` · PR **#19** (open, **not merged, not deployed**) · Route: `/tools/image-to-text`
Engine: tesseract.js 7 (LSTM) in a Web Worker, language data served from this origin (`/ocr`).
Status: **fully verified in a real Chromium browser** — this revision replaces the earlier report, which
had to state that no browser evidence existed.

---

## 1. How the browser testing was possible this time

The earlier pass could not run Playwright: `cdn.playwright.dev` is unreachable from this sandbox
(`ECONNRESET`), and no system browser was installed. This time a real Chromium 153 was obtained from
the `@sparticuz/chromium` npm package, and the missing system libraries (NSS/NSPR) were built from the
NSS static archives in `@achingbrain/nss` with a version script matching the version nodes Chromium
imports. Playwright then drove that binary normally (headless, `--single-process`).

This is a **test-environment workaround only** — nothing about it ships in the repository, and no
application code depends on it. Images captured below are real screenshots of the running app.

---

## 2. Critical defect found and fixed in this pass

> **Browser OCR never worked.** `lib/tools/image-to-text/engine.ts` handed an `ImageData` object to
> `worker.recognize()`. tesseract.js 7 only understands encoded bytes (Blob/File/canvas/URL): its
> `loadImage` falls through to `new Uint8Array(imageData)`, producing a zero-byte file, so Leptonica
> aborted every page with `Image file /input cannot be read!` and the UI reported
> "OCR timed out on this page".

All Node-side accuracy tests passed because they encoded PNGs first — the exact path the browser did
not take. This is precisely the class of bug that only a browser run catches.

**Fix:** new `lib/tools/image-to-text/encode.ts` rasterises the prepared pixels through
`OffscreenCanvas` (canvas fallback) to PNG bytes; `recognizeImage` now sends those bytes. Verified: the
same page that previously failed now returns `QUICKKIT INVOICE / Invoice No: 4471 / …` in ~1.5 s.

## 3. Other genuine defects found and fixed

| # | Defect | Fix |
| --- | --- | --- |
| 1 | **OCR broken in browsers** (above) | encode `ImageData` → PNG before recognition |
| 2 | **Phone layout put the settings column before the upload area**, so *Start OCR* sat ~3 200 px down the page (CSS `order: -1` on ≤1080 px) | natural order ≤1080 px; explicit phone order: upload → run bar (sticky) → progress → results → export → settings |
| 3 | **After a read, the result was buried below the whole settings panel** on phones | results and export now precede settings in phone order |
| 4 | **Table detection never fired on real OCR output** — tesseract emits a whole row as one line, so every "row" had one cell and CSV export was empty | `splitLineIntoCells` + `cellRows` with a column-gap threshold derived from line height, plus a cross-row x-alignment check so prose is still not read as a table |
| 5 | **Skew estimation was off by ~1.5° and non-linear** (aspect-stretching downsample changed the apparent angle) | single isotropic downsample factor + coarse-to-fine search: `−5→5, −4→4, −2→2, −1→0.75, 0→0` |
| 6 | **`lowConfidenceShare` was hardcoded to `0`**, so "uncertain words" was always empty | computed from the page's words against the user's threshold (`buildPage` gained `threshold`, wired from settings) |
| 7 | **Indic fixtures were mis-shaped** (ImageMagick does no complex shaping: "हिंदी" rendered as "हदि") | fixtures regenerated with HarfBuzz + FreeType, so the Hindi/Gujarati accuracy numbers are meaningful |
| 8 | E2E spec itself: `__dirname` in ESM, wrong category URL (`/categories/` → `/category/`), ambiguous `getByRole('alert')`, wrong status locator | spec corrected; all 13 tests now pass |

## 4. Hindi and Gujarati PDF export — improved, Unicode preserved

**Before:** non-Latin pages were embedded as images of the *scanned photo*, so the PDF contained no text
at all, and the copy said the text was not selectable.

**Now** (`buildPdf`, `lib/tools/image-to-text/pdf-text.ts`):

1. The **browser's own shaper** draws the extracted text at 2× print resolution — this is the only way to
   get correct conjuncts and vowel signs without shipping an OpenType layout engine. (Embedding the raw
   Noto font was tested and rejected: PDF text operators place per-code-point glyphs, so ક્ષ came out as
   ક ્ ષ with a visible halant, and copying produced mojibake.)
2. Over **every rendered line** the PDF gets an invisible `/ActualText` span (`Tr 3` + marked content)
   carrying the true Unicode. This is the standard accessible-PDF technique for image text.
3. The export report states the split explicitly, e.g.
   `0 page(s) as real text, 2 shaped and embedded with 9 selectable Unicode line(s)`.

Verified on a real exported PDF (Hindi + Gujarati, 2 pages) with PyMuPDF:

```
--- page 1 (Hindi) ---            --- page 2 (Gujarati) ---
hindi-printed                     gujarati-printed
क्विककिट हिंदी दस्तावेज़            ક્વિકકિટ ગુજરાતી દસ્તાવેજ આ એક સરળ ગુજરાતી વાક્ય છે.
यह एक सरल हिंदी वाक्य है।           ગુજરાત ભારતનું એક રાજ્ય છે.
भारत एक विशाल देश है।              આજે હવામાન ખૂબ સરસ છે.
आज मौसम बहुत अच्छा है।             કૃપા કરીને આ પૃષ્ઠ વાંચો.
कृपया इस पृष्ठ को ध्यान से पढ़ें।
```

The rendered page images were inspected too: Gujarati conjuncts (`ક્વિકકિટ`), matras and the Devanagari
headline are drawn correctly.

**Two implementation traps found and fixed here:** (a) the font resource name must be the one pdf-lib
*returns* (`F-i2t-<id>`), not the requested name, or the invisible text resolves to nothing;
(b) exportors ignore `/ActualText` when the placeholder run is a single character — a lone `.` comes back
literally, so the layer now emits a run sized to the line width.

**Disclosure in the product:** the on-page FAQ now says exactly this, and the report in the export panel
counts the rendered pages and selectable lines. It no longer claims Indic PDF text is unavailable.

## 5. Test results

| Check | Command | Result |
| --- | --- | --- |
| Types | `npx tsc --noEmit` | **clean** |
| Lint | `npx eslint .` | **0 errors, 0 warnings** |
| Format | `npm run format:check` | **clean** |
| Unit / integration | `npx vitest run` | **57 files · 1081 tests · all passing** |
| Real OCR accuracy | `tests/image-to-text-accuracy.test.ts` | **16/16** (real engine, real fixtures) |
| Browser E2E | `npx playwright test --project=chromium tests/e2e/image-to-text.spec.ts` | **13/13 passing in Chromium 153** |
| Other tools (regression) | `core.spec.ts` + `premium-tools.spec.ts` | **14 passed, 1 failed** — the failure is pre-existing (see §9) |
| Production build | `npm run build` | **succeeds**, `/tools/image-to-text` prerendered static (○) |

### 5.1 Real OCR accuracy (measured, punctuation excluded)

| Fixture | Language | CER | Confidence |
| --- | --- | --- | --- |
| `english-printed.png` (invoice + prose) | eng | **0.0 %** | 95 |
| `hindi-printed.png` | hin | **3.1 %** | 93 |
| `gujarati-printed.png` | guj | **0.0 %** | 94 |
| `mixed-language.png` (Gujarati + English) | eng+guj | — | detector reports `guj, eng` |
| `table-receipt.png` | eng | — | rows `["Notebook","2","120","240"]`, `["Pen",…]`, `["Marker",…]` |
| `low-quality.jpg` (q35 blur) | eng | **0.7 %** | 91 |
| `handwritten-note.png` (italic, 2.5° tilt) | eng | **0.0 %** | 93 |
| `rotated-90.png` | eng | — | after the UI rotate step: `QUICKKIT INVOICE` |
| page rotated −4° | eng | — | estimator returns **+4.0°**, correction restores the text |
| `large-image.png` (12 MP) | eng | — | downscaled to 2 400 px, still reads |
| `blank.png` | eng | — | `""`, zero lines — nothing invented |
| batch of 3, one worker | eng | — | all three read |

### 5.2 Full browser E2E coverage (13 tests, all passing)

Catalogue/search/category listing · SEO title, description, JSON-LD (`WebApplication` + `HowTo` +
`FAQPage`) · English read into an editable text box + undo · Hindi **and** Gujarati Unicode in the editor
and in the TXT download · TXT/DOCX/JSON/PDF export with correct extensions and Hindi preserved inside the
JSON and the PDF's text layer · table → CSV with real columns · rotation of a sideways scan · multi-file
batch with per-file progress · find & replace · unsupported-file rejection with a reason · exactly the
eight advertised languages and no others · cancellation with recovery · 390 px mobile (no horizontal
overflow, Start OCR reachable).

### 5.3 Performance and memory (measured in Chromium, JS heap via CDP)

| Scenario | Time | Heap after |
| --- | --- | --- |
| Baseline (tool loaded, idle) | — | **13 MB** |
| 12-megapixel scan, single page | **2.29 s** | 13 MB |
| 4 files (invoice, small UI text, q35 JPEG, ruled table) | **2.47 s** | 13 MB |
| 6 pages queued, then **Cancel** | cancelled in 0.5 s | 13 MB |

The heap does not grow with batch size because pages are prepared and read one at a time and each page
image is dropped once its text exists. Cancellation is immediate and leaves the workspace ready.

## 6. Screenshots (real captures, `docs/screenshots/`)

| File | What it shows |
| --- | --- |
| `desktop-01-empty.png` | desktop 1440×900, empty workspace |
| `desktop-02-uploaded.png` | three files staged (Gujarati, English, table), gallery + settings |
| `desktop-03-result.png` | after **Start OCR**: per-file Done, batch progress, side-by-side, detected script 98 % |
| `desktop-04-full.png` | whole page: workspace, export panel, FAQ, related tools |
| `mobile-01-empty.png` | 390×844 phone, empty workspace (upload first) |
| `mobile-02-uploaded.png` | phone, files staged, sticky **Start OCR** bar |
| `mobile-03-result.png` | phone after a read: results appear before settings |
| `mobile-04-full.png` | whole phone page |

Note: the sandbox had no system fonts, so the Noto Devanagari/Gujarati fixtures were installed into the
test machine's font directory for the captures. Bengali/Tamil/Telugu labels appear as tofu boxes **in the
screenshots only** — that is the sandbox's missing fonts, not the app, which ships its stack and renders
those scripts normally on any device with their fonts.

## 7. Known limitations

- **Handwriting:** best-effort. Clean block capitals usually read; cursive, signatures and stamps often do
  not. The UI says so and highlights uncertain words instead of guessing.
- **Indic accuracy depends on print quality.** 0–3 % CER above is on clean 44 px renders; low-DPI phone
  photos are worse. Nothing in the UI promises otherwise.
- **Hidden text layer trade-offs in PDF.** Copying a rendered line yields the original text, but the
  invisible glyphs are Helvetica, so a PDF viewer's *selection* rectangles can differ slightly from the
  drawn script on reflowed lines. Screen readers, search and copy all get correct Unicode.
- **Language coverage is exactly the eight shipped packs** (eng, hin, guj, mar, ben, tam, tel, urd). No
  other language is advertised anywhere, and the E2E suite asserts Japanese/Korean/Arabic/Thai never appear.
- **Auto-rotation** is a deterministic quarter-turn control plus a post-OCR orientation hint, not magic.
- **Mixed-script pages** read best when every present script is selected; single-script selection can
  degrade the other script's text.

## 8. What could not be verified

- **Firefox and WebKit.** Only Chromium 153 was obtainable here. The Playwright config still defines both
  projects for CI.
- **Safari/iOS specifics** (e.g. `OffscreenCanvas` availability) — the encoder falls back to a regular
  canvas, but that fallback is not exercised by a real Safari run.
- **Real physical-scanner/phone-camera photographs.** All fixtures are synthetic renders; they cover
  rotation, skew, blur, JPEG artefacts and 12 MP size, but not lens distortion or paper texture.

## 9. Pre-existing failure, unrelated to this work

`premium-tools.spec.ts › keyboard-only journey: generate a password without a mouse` fails on
**unmodified `main`** too (verified by stashing every change and re-running): its Tab-order walk never
reaches the "Generate password" button. The Password Generator and its markup were not touched by this
branch. Left as-is and reported rather than silently changed.

## 10. Status

PR #19 remains **open**. Nothing was merged and nothing was deployed. `README.md`, the catalogue, the
sitemap, the FAQ copy and `docs/QA_IMAGE_TO_TEXT.md` all reflect the state described above. No existing
tool's behaviour was modified.
