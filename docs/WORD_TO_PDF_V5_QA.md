# QUICKKIT Word to PDF — V5 Quality Assurance Report

Date: 4 November 2026
Branch: `arena/32354d68-quickkit` (not merged, not deployed)

> **Rendering quality is superseded by [`WORD_TO_PDF_V5_2_QA.md`](./WORD_TO_PDF_V5_2_QA.md)** — measured output metrics, the A–K corpus and the current blocker list live there.
> Scope: `/tools/word-to-pdf`, `app/api/word-to-pdf`, `lib/tools/word-to-pdf/**`,
> `components/tools/word-to-pdf/**`, tests, docs, fixtures, deployment config.

This report records work that was **implemented and executed**, not proposed. Every
number below comes from a command run in this workspace; every limitation is stated
with the reason it could not be executed here.

---

## 1. Headline result

| Question                                         | Answer                                                                                                                              | Evidence                                                                                         |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Does Word to PDF convert for real?               | **Yes.** A real DOCX package is parsed, laid out and written as a real PDF (valid `%PDF-` header, real page tree, real text layer). | `tests/word-to-pdf-render.test.ts`, live API run in §4                                           |
| Was the "engine disabled" defect fixed?          | **Yes.** The engine now resolves `auto → builtin` instead of failing closed.                                                        | `lib/tools/word-to-pdf/engine.ts` (`resolveEngine`), `GET /api/word-to-pdf` → `engine:"builtin"` |
| Are export settings applied to the actual PDF?   | **Yes**, verified by re-parsing the downloaded bytes (text extraction + metadata + page geometry).                                  | §4.3                                                                                             |
| Are 100–1000 page DOCX files actually supported? | **1000 pages converted successfully in the ladder test** (2.5 s convert, 367 MiB RSS). 1001 pages is rejected.                      | §5                                                                                               |
| Do all browser E2E journeys pass?                | **Not executed.** Playwright browser download is blocked in this sandbox. Specs were written and statically reviewed only.          | §7                                                                                               |
| Is LibreOffice available?                        | **No.** No `soffice` binary, no `deb.debian.org` access. The native path is implemented but unexecuted here.                        | §8                                                                                               |

**No PDF in this repository was fabricated.** Every PDF referenced is produced by the
shipped conversion code path from a DOCX fixture stored in the repository.

---

## 2. Bug list: symptoms, root causes, fixes

### B1 — "Conversion engine: unavailable" on a working installation

Symptom: `GET /api/word-to-pdf` returned `available:false`; the Convert button could
never enable, even though the app shipped a complete DOCX renderer.
Root cause: `engineAvailable()` required `WORD_TO_PDF_ENABLED === "true"` **and** a
native `soffice` binary or a healthy private worker. There was no fallback, so a stock
deployment reported "disabled" forever.
Fix: introduced `resolveEngine()` and a third backend `builtin`:
`WORD_TO_PDF_ENGINE=auto` (default) now resolves to `worker → libreoffice → builtin`;
`native` and `worker` still fail closed. `engineStatus()` returns
`{available, engine, label, native, fidelity, notes, maxPages}` and never throws on a
bad worker config (that used to block conversion before the credential check).

### B2 — `engineStatus()` threw on malformed worker configuration

Symptom: conversion failed with a config error instead of falling back.
Root cause: `engineStatus()` attempted to construct worker URLs eagerly.
Fix: the error is captured into `configError`; `auto` mode ignores an unhealthy worker
and continues down the ladder; explicit `worker` mode reports the error.

### B3 — Empty-string worker env vars counted as "configured"

Symptom: `WORD_TO_PDF_WORKER_URL=""` (common in `.env` templates) forced worker mode
and disabled conversion.
Root cause: `workerConfigured()` tested `!== undefined`.
Fix: it now requires a non-empty trimmed value.

### B4 — Page-size/margin settings applied twice (double shrink)

Symptom: choosing A5 with margins produced A5 pages whose _content_ was also scaled
by pdf-lib's post-pass, i.e. text far smaller than requested.
Root cause: the renderer applies paper size/margins during layout, and `processPdf`
also rewrote the geometry.
Fix: `processPdf` now detects pages that are already at the requested size and skips
the scale step (`alreadyApplied`). Verified by `does not shrink pages that the base
renderer already sized`.

### B5 — Header/footer overlay text rejected for typographic characters

Symptom: a footer like `Real conversion · 4 Nov 2026 — “QA”` was refused with a
"basic Latin" error, although the font used for overlays (a PDF standard font, WinAnsi)
can draw those characters.
Root cause: validation used `/[^\x20-\x7e]/` (printable ASCII only).
Fix: `overlayTextSupported()` accepts printable ASCII + Latin-1 + the WinAnsi
typographic extras (`— · ’ “ ” € …`), and still rejects what the font cannot encode
(e.g. `₹`). Error text now says what is allowed instead of "basic Latin".

### B6 — `PAGE` / `NUMPAGES` fields vanished from Word headers and footers

Symptom: a DOCX header reading "page 1 of 3" rendered as "page of".
Root cause: the OOXML reader only handled `<w:fldSimple>`. Word (and the `docx`
library) normally emit **complex fields**: `fldChar begin` → `instrText` → `separate`
→ cached result → `end` spread across several runs.
Fix: `collectRuns()` now tracks field state across runs, emits a live `PAGE`/
`NUMPAGES` token, and suppresses the stale cached text for those two fields while
keeping the cached result of every other field.

### B7 — Sections after the first lost their headers and footers

Symptom: a landscape appendix page had no header, no footer, no page number.
Root cause: OOXML inherits header/footer parts from the previous section when a
section declares none; the reader treated "no reference" as "no header".
Fix: `pushSection()` inherits `headers`/`footers` from the previous section.

### B8 — Vowel signs split from their base consonant in Indic text

Symptom: mixed-script runs could break a Devanagari/Gujarati cluster at a matra
because the "combining mark" test matched entire Indic blocks.
Root cause: `/[\u0300-\u036f\u0900-\u0dff]/` treats every character in the block as
combining.
Fix: segmentation now compares the Unicode script of each character; combining marks
share their base character's block, so clusters stay intact. Covered by
`tests/word-to-pdf-render.test.ts` → `script segmentation`.

### B9 — Password-protected `.docx` showed the wrong error

Symptom: an OLE-encrypted `.docx` said "not a DOCX document" instead of "password
protected or legacy binary".
Root cause: `inspectDocx` tested `/\.doc$/` against the filename, so `.docx` never
matched the OLE branch.
Fix: `/\.docx?$/i`.

### B10 — Engine status could hang on "Checking conversion engine…" forever

Symptom: a failed status request left the UI in an indefinite "checking" state with a
disabled Convert button and no explanation.
Fix: `use-studio` exposes `engineError` + `refreshEngine()`; the engine card shows the
failure with a "Retry engine check" button, and the export bar explains why Convert is
disabled (no engine / no consent / nothing ready).

### B11 — Status/help copy promised LibreOffice on installations without it

Symptom: the page description, catalog entry, and one settings note asserted
"self-hosted LibreOffice processing" regardless of the resolved engine.
Fix: copy now describes the actual contract — consent-gated server conversion with a
bundled renderer or a native engine — and the engine card states which one is live.

### B12 — Bundled fonts would disappear in a traced/standalone deployment

Symptom: `assets/noto/*.ttf` are read at runtime with `fs`; Next's output tracing has
no reason to copy them, so a `standalone` image would fail to find fonts.
Fix: `next.config.ts` sets
`outputFileTracingIncludes["/api/word-to-pdf"] = ["./assets/noto/**"]`; the rebuilt
`route.js.nft.json` lists **1,173 files**, including all 13 Noto TTFs plus the OFL licence.

### B13 — Non-deterministic "fake success" risk in tests

Historical V3/V4 tests asserted `/100-page/` caps, 3-stage arrays and
`WORD_TO_PDF_ENABLED`-only gating, which no longer reflected the product.
Fix: those assertions were corrected to the real contract (`MAX_PAGES = 1000`,
NDJSON stages, `auto → builtin`). No engine behaviour was weakened to satisfy a test.

---

## 3. What was built or rebuilt in V5

- **In-process DOCX → PDF renderer** (`lib/tools/word-to-pdf/render/`): ZIP/OPC reader,
  OOXML style resolution, paragraph/run/table layout, section geometry, images,
  hyperlinks, headers/footers with live page fields, list numbering, script-aware font
  selection with 13 bundled Noto fonts (Latin, Devanagari, Gujarati, Bengali, Tamil,
  Telugu, Kannada, Malayalam, Gurmukhi), fontkit subsetting, and fidelity warnings for
  features it cannot reproduce.
- **Engine resolution ladder** with fail-closed explicit modes and honest status.
- **Real-time NDJSON stages** end to end: `Validating → Reading → Laying out →
Preparing fonts and images → Rendering (per page) → Applying export settings →
Applying page settings (per page)`.
- **Hard limits**: `MAX_PAGES = 1000`, 50 MiB package cap, single conversion slot,
  170 s deadline, abort propagation from the client to the reader.
- **UI**: engine card (identity, capability badge, fidelity notes), drag-and-drop with
  `accept=".docx,.doc"`, per-row validation state, live stage + progress bar,
  collapsible warnings, sticky mobile export bar, three-panel desktop workspace,
  mobile tab navigation.
- **Settings**: page ranges/exclusions/order, numbering (template, style, start,
  skip-first), header/footer overlays, watermark (text/colour/opacity/angle/pages),
  page size/orientation/margins, background colour, metadata, rotation, per-page
  overrides, visual page plan (reorder/duplicate/delete/insert blank/rotate), ZIP and
  individual downloads.
- **Tests**: new `tests/word-to-pdf-render.test.ts`, `tests/word-to-pdf-v5-engine.test.ts`,
  `tests/word-to-pdf-v5-ui.test.tsx`, `tests/word-to-pdf-v5-stress.test.ts`,
  `tests/e2e/word-to-pdf-v5.spec.ts`.
- **Fixtures**: `docs/word-to-pdf/v5/fixtures/quality.docx`, regenerable with
  `npm run fixture:word-to-pdf`.

---

## 4. Executed evidence — real conversion

### 4.1 Engine status (production build, `next start`)

```
GET /api/word-to-pdf
{"available":true,"engine":"builtin","label":"QUICKKIT DOCX renderer (built-in)",
 "native":false,"fidelity":"quickkit-renderer","maxPages":1000, …}
```

### 4.2 A real conversion over HTTP

`POST /api/word-to-pdf` with `docs/word-to-pdf/v5/fixtures/quality.docx`
(consent header, octet-stream body, 3-section DOCX):

| Property                     | Value                                                                                                                                                                                           |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stages observed              | Validating DOCX package · Reading DOCX package · Laying out 19 paragraphs · Preparing fonts and images · Rendering document pages (×6) · Applying export settings · Applying page settings (×4) |
| Pages                        | 3 (A4 portrait, A4 portrait, A4 **landscape**)                                                                                                                                                  |
| `engine` / `native` / `base` | `builtin` / `false` / `false`                                                                                                                                                                   |
| Warnings                     | "Different odd/even headers are approximated."                                                                                                                                                  |
| Wall time                    | 0.75 s                                                                                                                                                                                          |

### 4.3 Every setting verified in the returned bytes

Same request plus `header`, `footer`, `numbering`, `watermarkText`, `title`, `author`,
`backgroundEnabled`. The returned PDF was re-parsed with PyMuPDF:

```
pages 3 [(595,842), (595,842), (842,595)]
metadata title 'Layout quality report' | author 'QUICKKIT QA'
page 1  header True  footer True  numbering 'Page 1 of 3' True  watermark True
page 2  header True  footer True  numbering 'Page 2 of 3' True  watermark True
page 3  header True  footer True  numbering 'Page 3 of 3' True  watermark True
```

Page-management settings, each re-parsed from the output:

| Setting sent                             | Result in the output PDF                                                    |
| ---------------------------------------- | --------------------------------------------------------------------------- |
| `rotation: 90`                           | every page `/Rotate 90`                                                     |
| `pages: "1-2"`                           | 2 pages: _Quarterly operations review_, _Second page_                       |
| `pageOrder: "3,1-2"`                     | 3 pages: _Landscape appendix_, _Quarterly operations review_, _Second page_ |
| `excludePages: "2"`                      | 2 pages: _Quarterly operations review_, _Landscape appendix_                |
| `startNumber: 5`, `numberStyle: "roman"` | first page footer shows **V**                                               |

Rendered proof (click to open):

- `docs/word-to-pdf/v5/evidence/engine-page1.png` — renderer output, no overlays
- `docs/word-to-pdf/v5/evidence/engine-page3-landscape.png` — inherited header/footer on a landscape section
- `docs/word-to-pdf/v5/evidence/api-export-page1.png` — the same document after the API applied header, footer, numbering, watermark and metadata
- `docs/word-to-pdf/v5/evidence/api-export-page3-landscape.png` — landscape page with inherited parts and the applied overlays

Text layer, table, hyperlink, list numbering, the embedded image and both Indic scripts
are present in the extracted text of the output.

### 4.4 Earlier regression document

`docs/word-to-pdf/v4/fixtures/complex.docx` → 5 pages / 79,903 B / 0.47 s default, and
5 pages / 83,934 B with overlays; every overlay string and the metadata were confirmed
in the output.

---

## 5. Stress ladder (real conversions, Node 22, linux x64)

`tests/word-to-pdf-v5-stress.test.ts` → `test-results/word-to-pdf-v5-stress.json`

| Pages | Convert  | Export (settings pass) | Final PDF   | RSS after | maxRSS    |
| ----- | -------- | ---------------------- | ----------- | --------- | --------- |
| 100   | 771 ms   | 151 ms                 | 367,840 B   | 168.0 MiB | 169.8 MiB |
| 250   | 881 ms   | 207 ms                 | 829,172 B   | 221.7 MiB | 221.7 MiB |
| 500   | 1,409 ms | 410 ms                 | 1,601,627 B | 277.5 MiB | 277.5 MiB |
| 750   | 2,031 ms | 598 ms                 | 2,373,179 B | 329.7 MiB | 332.1 MiB |
| 1000  | 2,528 ms | 798 ms                 | 3,147,207 B | 367.5 MiB | 367.5 MiB |

1001 pages → rejected with "more than 1000 pages". The advertised cap is therefore
**1000 pages**, and it is backed by executed conversions. Memory grows roughly linearly
(~0.35 MiB/page) with no leak across the ladder.

---

## 6. Unit, integration and static verification

| Check              | Command                                                      | Result                                       |
| ------------------ | ------------------------------------------------------------ | -------------------------------------------- |
| Unit + integration | `npx vitest run`                                             | **71 files / 1,159 tests passed** (~93 s)    |
| Types              | `npx tsc --noEmit`                                           | clean                                        |
| Lint               | `npm run lint`                                               | clean (0 errors, 0 warnings)                 |
| Formatting         | `npx prettier --check …`                                     | clean for all touched paths                  |
| Production build   | `npm run build`                                              | success (Next 16.4.3)                        |
| Font tracing       | inspect `.next/server/app/api/word-to-pdf/route.js.nft.json` | 1,173 files incl. all 13 `assets/noto/*.ttf` |
| Live API           | `next start` + `POST`                                        | real PDFs, §4                                |

New V5 suites specifically:

- `tests/word-to-pdf-render.test.ts` (7) — real PDF bytes, page geometry, style
  resolution, tables, lists, images, Indic scripts, live `PAGE`/`NUMPAGES` fields,
  section header inheritance, fidelity warnings, rejection of garbage/aborted/oversized
  input, script segmentation.
- `tests/word-to-pdf-v5-engine.test.ts` (6) — engine ladder, end-to-end convert, single
  application of page size/margins, cancellation, malformed packages.
- `tests/word-to-pdf-v5-ui.test.tsx` (5) — engine identity + locked convert, local
  validation, OLE/password rejection, live stage + warning + export unlock, server
  refusal surfaced verbatim.
- `tests/word-to-pdf-v5-stress.test.ts` (6) — the ladder in §5.

---

## 7. Browser E2E: written, not executed (blocker)

`npx playwright install chromium` fails in this sandbox:
`Failed to download Chrome for Testing 156.0.8078.4 (playwright chromium v1248), code=1`.
No system Chrome/Chromium exists either (`which chromium google-chrome` → nothing,
`~/.cache/ms-playwright` is empty), so attempting a run stops at launch:

```
Error: browserType.launch: Executable doesn't exist at
  /home/user/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell
```

No browser binary can be fetched, so **no Playwright test executed** and no browser
screenshot or axe scan could be produced. This is an environment limitation, not a
product result. What _was_ verified: `npx playwright test --list` collects all specs
successfully — **795 tests in 43 files**, including the three new
`word-to-pdf-v5.spec.ts` cases — so the specs compile, resolve their imports (pdf-lib,
pdfjs legacy, node fs) and satisfy the type checker.

What exists instead:

- `tests/e2e/word-to-pdf-v5.spec.ts` — a full real journey with **no network mocking**:
  reads engine status, uploads the real DOCX, asserts local validation, converts,
  asserts the PDF.js canvas exists, walks thumbnails/next-page/zoom/search, changes
  numbering + header, waits for "Export synchronized", downloads the PDF (asserting
  `%PDF-`, 5 pages, header and `Page n of 5` present in the text layer), downloads the
  ZIP (asserting the `PK` signature), then re-checks the mobile tab layout and that
  `scrollWidth <= innerWidth`. Two further tests cover invalid/encrypted documents
  (asserting **zero** POSTs) and the page editor duplicating a page of the real output.
- `tests/e2e/word-to-pdf.spec.ts`, `-v3.spec.ts`, `-v4.spec.ts` — updated for the new
  contract (unavailable state mocked per-route, current copy).

To execute them on a machine with browsers:

```bash
npx playwright install --with-deps chromium
npm run build && PORT=3001 npm start &
npx playwright test tests/e2e/word-to-pdf-v5.spec.ts
```

---

## 8. Remaining infrastructure blockers

1. **LibreOffice is absent** (`which soffice` empty, `/usr/lib/libreoffice` missing,
   `deb.debian.org` unreachable). The `libreoffice` and `worker` backends are
   implemented and unit-tested against fixtures, but never executed against a real
   `soffice` here. Deployments that need Word-grade pagination must install LibreOffice
   (see `docs/WORD_TO_PDF_V5_SETUP.md`) — until then `auto` uses the built-in renderer
   and says so in the UI.
2. **Playwright browsers cannot be installed** (see §7).
3. **No physical device / real-browser accessibility audit** could be run; the mobile
   behaviour was reviewed in CSS and jsdom only.
4. **Fidelity limits of the built-in renderer** — charts, SmartArt, text boxes,
   footnotes, floating shapes, and Word's exact line-breaking are approximated and are
   reported to the user as warnings rather than silently dropped. The UI never claims
   lossless Word fidelity.

---

## 9. Honest claims

Claimed: real DOCX → PDF conversion on this deployment, 1000-page cap with executed
evidence, applied-and-verified export settings, per-page editing of the real output,
consent-gated server processing, honest engine/fidelity reporting.

Not claimed: Word-identical pagination without LibreOffice, E2E pass (not executed),
accessibility certification, production deployment, merge.

---

## 10. Files touched in V5 (summary)

Engine/API: `lib/tools/word-to-pdf/engine.ts`, `page-limits.ts`, `client-convert.ts`,
`private-worker.ts`, `settings.ts`, `process-pdf.ts`, `page-plan.ts`, `docx.ts`,
`render/*.ts`, `app/api/word-to-pdf/route.ts`, `next.config.ts`.

UI: `components/tools/word-to-pdf/*` (index, settings-form, use-studio, studio-preview,
page-editor, page-appearance, preview-resources, watermark-settings, original-pane,
queue-thumbnail, module CSS), `app/tools/word-to-pdf/page.tsx`, `lib/catalog.ts`.

Tests/fixtures: `tests/word-to-pdf-*.test.ts(x)`, `tests/e2e/word-to-pdf*.spec.ts`,
`scripts/word-to-pdf-v5-fixture.mjs`, `docs/word-to-pdf/v5/**`.

Docs: this report, `docs/WORD_TO_PDF_V5_AUDIT.md`, `docs/WORD_TO_PDF_V5_SETUP.md`,
`docs/word-to-pdf/v5/README.md`, `TOOL_DEVELOPMENT_STATUS.md`.
