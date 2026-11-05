# QUICKKIT Tool Development Status

**Last updated:** 4 November 2026
**Purpose:** Single status tracker for implemented tools, approved expansion candidates and deferred ideas.  
**Public launch state:** Not deployed or indexed by this roadmap work. “Live” below means implemented and verified in the repository; it does **not** mean publicly launched on a production domain.  
**Development policy:** Strictly one tool at a time. A tool must be researched, designed, implemented, tested, delivered with screenshots/demo and explicitly approved by the owner before the next tool begins.  
**Current active tool:** Word to PDF Converter V5 — production-completion continuation from V4 `7d760e8`, 4 November 2026. **Hosting audit started; native deployment/access/approval BLOCKED.** No production provider/approved private-worker endpoint was supplied; local LibreOffice/Docker/socket/cached packages are unavailable. Existing V3/V4 tool and 100-page cap are preserved. Native 100/250/500/750/1000 evidence, fidelity, real conversion demo, workspace improvements and final V5 QA remain outstanding. No production deployment was attempted and no 1000-page/readiness claim is made. See `docs/WORD_TO_PDF_V5_AUDIT.md`. V4 test counts below remain historical, not fresh V5 results.

**Previous V4 checkpoint (historical):** Word to PDF Converter V4 — native-engine / production-readiness continuation of the completed V3 editor at `/tools/word-to-pdf` (4 November 2026). **Private-worker infrastructure implemented for review; native execution/fidelity/production acceptance BLOCKED, NOT production-ready.** Same V3 editor and 100-page cap preserved. Added fail-closed private transport, container-per-job broker/recipe, bounded resource/cancellation/cleanup policy, real engine version probes, synthetic source fixtures and operator benchmark/setup tooling. LibreOffice and Docker are absent; approved native repository/artifact access is unavailable under this session's outbound policy (namespace isolation itself works). No genuine native demo or native 100/500/1000 metrics exists; no 1000-page editing claim. Final checks: 1057 unit tests, type/lint/build PASS; Word Chromium 17 PASS; selected wider Chromium 39 PASS. See `docs/WORD_TO_PDF_V4_QA.md`, setup, fidelity and benchmark reports. No merge/deployment or approval-state change for other tools.

**Previous active-tool record (historical):** PDF to Word Converter — **V2 implemented — awaiting owner approval** (V1 delivered first, then upgraded in place on the same PR #6 branch at the owner's direction: live PDF/DOCX previews with side-by-side compare, page-range conversion, working preserve settings, batch dashboard, quality reports, opt-in local history). PDF Merger was merged into `main` by the owner (PR #4/#5 chain) and is now counted as implemented. PDF to Word was then built at the owner's direction with the same rules: 100% on-device processing, honest per-file errors, no silent skipping, genuine DOCX output. **Do not mark it live/complete and do not start another tool until the owner personally approves it.** It has not been deployed or indexed. Separately, PDF Merger and PDF Splitter were owner-approved on 1 November 2026; PDF Compressor is implemented and integrated on PR #11 but remains **awaiting owner approval**. The PR #11 integration note at the end of this file supersedes older PDF-specific rows that still list Split PDF as planned or omit PDF Compressor.

## QR Code Scanner (phase 14) — implemented, awaiting owner approval

**Status:** `in-development` → implemented in the repository on the
`arena/f627dabe-quickkit` branch; **not merged, not deployed, not indexed and not
owner-approved.**

A new, separate tool at **`/tools/qr-code-scanner`** in the **QR & Barcode**
category. The existing QR Code Generator at `/tools/qr-generator` is unchanged and
remains listed separately.

| Area          | Delivered                                                                                                                                                                                                                                                                                                                               |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Modes         | Live camera (camera picker, resolution, torch/zoom where reported, continuous, pause/resume), image upload (drag-drop, browse, clipboard paste, rotate, crop, contrast/sharpen, rescan), screenshot scanning, batch (≤120 files, bounded concurrency 1–6, cancel, retry-failed, export)                                                 |
| Decoding      | jsQR pass ladder: original → Otsu → contrast → sharpen → inverted → rotations → width ladder → overlapping tile sweep for multiple codes → finder-pattern regions. Every pass is named in a per-result audit trail.                                                                                                                     |
| Content types | 16, each a real parser: URL, text, email, phone, SMS, WhatsApp, Wi-Fi, vCard, MECARD, geo, calendar, social, app, payment (UPI), crypto, product (GTIN with check digit), unknown                                                                                                                                                       |
| Security      | Local structural inspection only: HTTP, raw IP, punycode, deep subdomains, `@` authority, embedded credentials, unusual port, shorteners, lookalike/typosquat domains, dangerous schemes, control characters, executable markup. Verdicts: no obvious warning / caution / high risk / unable to verify. HTTPS is never treated as safe. |
| Privacy       | All decoding on-device; no upload, no third party, no analytics. History is local, capped, searchable, deletable, and stores secrets **redacted** unless the owner-copy switch is enabled. Image files are never stored.                                                                                                                |
| Export        | CSV (BOM, CRLF, RFC-4180 quoting, spreadsheet-formula neutralisation), JSON, TXT — for results, selection, batch and history                                                                                                                                                                                                            |
| Settings      | Continuous, duplicate detection, auto-copy, sound, vibration, auto-clear, resolution, preprocessing, sensitivity, history, sensitive storage, default mode, four export toggles, reset — all clamped                                                                                                                                    |

**Verification actually run:** 1086 unit/integration tests across 63 files
(`npx vitest run`), `tsc --noEmit` clean, `eslint` 0 errors, `prettier --check`
clean on every touched file, `next build` success, 10/10 Playwright cases
(`tests/e2e/qr-scanner.spec.ts`), **23/23 cases in the purpose-built
device-verification suite** (`tests/e2e/qr-scanner-verification.spec.ts`) and
355/355 in the site-wide `core` + `quality` suites. Full report, screenshots and
limitations: **`docs/qr-scanner/README.md`**.

**Defects found and fixed during device verification** (code, not tests): a
production `Permissions-Policy: camera=()` that would have blocked the live
camera on the deployed site (now scoped to `camera=(self)` for this one route);
MECARD payloads labelled as plain "Contact card"; history switched off left an
empty `[]` behind instead of removing the key; redacted history entries lost
their non-secret identifier and became unsearchable; Wi-Fi detail ordering.

**Not verified — blocked by this environment, never claimed:** a physical
Android/iOS device, a real camera sensor, printed paper, a real torch/LED, a real
front/rear lens switch, iOS Safari and Firefox (no binaries available). Camera
capture is exercised through a canvas stream, which covers constraints, frame
grabbing, the worker, duplicate suppression, track release and result rendering,
but not optics.

**Known limitations:** QR only (no 1D barcodes); perspective correction not
implemented; multi-symbol extraction bounded by the tile grid; error-correction
level not reported by the decoder and therefore never shown; HEIC only in Safari.

## Percentage Calculator focused verification

Percentage Calculator was reviewed and tested in isolation. The feature checklist, exact expected/actual results and Chromium UI/accessibility evidence are recorded in `PERCENTAGE_CALCULATOR_QA.md`. Firefox, WebKit and manual screen-reader verification remain outstanding; no broader Phase 9 completion or deployment is implied.

## Phase 9 V2 checkpoint (owner-directed)

**In Progress — not accepted or verified.** V2 work has continued in place across the suite, including advanced percentage and multi-item GST workflows; substantial requested features and verification remain. See `PHASE_9_V2_CHECKLIST.md` for feature-level status, test scope, browser evidence, screenshots and next steps. No merge or deployment. The Phase 9 checkpoint below describes V1 and is historical.

## Phase 9 checkpoint (owner-directed, 2 November 2026)

The current owner request supersedes the historical one-tool-at-a-time restriction for this phase. Phase 9 is **Testing / In Progress**, not complete or approved for launch. All 12 calculator routes now have initial implementations and representative passing tests. Chromium browser checks and genuine desktop/mobile screenshots are available, but broader formula, keyboard, visual and cross-browser verification remains. See `PHASE_9_FEATURE_CHECKLIST.md` for per-feature status, test evidence, limitations and continuation steps; see `PHASE_9_CALCULATOR_PLAN.md` for the audit and plan. The older portfolio figures below are historical and do not account for this in-progress work.

## 1. Status definitions

These statuses match the proposed registry model in `TOOL_REGISTRY_ARCHITECTURE.md`.

| Status           | Meaning                                                                                               |                                     Public card/route? |
| ---------------- | ----------------------------------------------------------------------------------------------------- | -----------------------------------------------------: |
| `live`           | Fully implemented, content-complete and verified against the tool exit gate.                          | Yes, subject to the separate site launch/indexing gate |
| `in-development` | Approved and actively being built; not yet releasable.                                                |                                                     No |
| `planned`        | Candidate recorded for a future phase. It is not implemented and must not be advertised as available. |                                                     No |
| `deprecated`     | Still controlled temporarily but replaced or scheduled for retirement.                                |                  Only under an explicit migration plan |
| `retired`        | Historical record retained so its ID and slug are never reused.                                       |                                                     No |

Additional labels such as **research/planning**, **pending approval**, **implemented — awaiting owner approval**, **deferred** and **gated** are workflow notes, not registry statuses. In particular, a tool in research/planning remains `planned` and must not receive a public card or route.

## 2. Portfolio summary

| Group                                                                  | Count | Notes                                                                                                                                                                                                                 |
| ---------------------------------------------------------------------- | ----: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Implemented in repository (`live`)                                     |     7 | Tools listed in Section 4 (now including PDF Merger, merged by the owner).                                                                                                                                            |
| Implemented — awaiting owner approval                                  |     2 | QR Code Scanner (phase 14) and PDF to Word Converter; implemented and QA-complete for review, but not owner-approved, live, deployed or indexed.                                                                      |
| In research/planning                                                   |     0 | No next tool may enter research/planning as active work until the owner approves PDF to Word. (A PDF Translator architecture plan was delivered in chat on 2 November 2026; it remains unimplemented and unapproved.) |
| Remaining proposed Phase 5–12 candidates (`planned`, pending approval) |    83 | The original 84-candidate list minus PDF Merger (implemented). PDF to Word is an owner-directed addition beyond that list.                                                                                            |
| Projected total after Phase 12                                         |    91 | Only if every candidate passes its individual quality gate (7 implemented + PDF to Word if approved + 83 remaining).                                                                                                  |
| Additional tools needed to exceed 100                                  |   11+ | Reserved for evidence-led Phase 13; candidates not selected yet.                                                                                                                                                      |

> Reaching exactly 100 from the current six would require 94 net-new tools. Exceeding 100 requires at least 95 net-new tools. The requested Phases 5–12 contain 84, so the honest projected total is 90—not 100+.

## 3. Platform foundation status

| Work item                    | Status                                 | Evidence / next step                                                                                                                                            |
| ---------------------------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Current inline catalog       | Implemented for eight repository tools | `lib/catalog.ts`; seven implemented tools plus PDF to Word under the approved narrow integration. Suitable for the current homepage but not the 90-tool target. |
| Scalable tool registry       | **Designed, not implemented**          | Proposal in `TOOL_REGISTRY_ARCHITECTURE.md`; this remains a separate future migration and was not bundled into PDF Merger.                                      |
| Generated tool routes        | **Not started**                        | Current eight routes are maintained individually under `app/tools/*/page.tsx`.                                                                                  |
| `/tools` directory           | Implemented (Phase 2)                  | Explorer with search and category filters lives at `/tools`; registry-driven generation is still future work.                                                   |
| Generated category pages     | Implemented (Phase 2, different route) | Category pages live at `/category/{categorySlug}`; the proposed `/tools/category/...` shape was not adopted.                                                    |
| Global registry search       | **Partial precursor only**             | Current homepage search/filter works for eight repository tools; ranking, aliases and dedicated directory search are not implemented.                           |
| Functional category filters  | **Partial precursor only**             | Current category buttons work for the existing display categories; canonical category IDs/slugs are not implemented.                                            |
| Featured tools               | **Not started**                        | Must be labeled “Featured” until real popularity data exists.                                                                                                   |
| Popular tools from real data | **Blocked by design decision**         | No approved aggregate usage-data source currently exists; do not fabricate rankings.                                                                            |
| Recently added               | **Not started**                        | Requires a trustworthy `addedAt` policy in the registry migration.                                                                                              |
| Relevant related tools       | **Partial precursor only**             | Current shell lists other tools, but not the proposed curated/tag-scored relevance model.                                                                       |
| Account-free favorites       | Implemented (Phase 2)                  | “Saved tools” stores tool slugs in browser local storage only.                                                                                                  |
| Per-tool privacy disclosure  | **Partial precursor only**             | Current tools are browser-processed; the shell must become per-tool before any server or AI tool.                                                               |

## 4. Implemented tools

The proposed IDs below use the existing slug values. During registry migration they must be frozen as immutable IDs; URLs must remain unchanged.

| ID                   | Tool               | Current URL                 | Current category | Proposed category        | Registry status  | Verification state                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| -------------------- | ------------------ | --------------------------- | ---------------- | ------------------------ | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `word-counter`       | Word Counter       | `/tools/word-counter`       | Text             | Text & Writing Tools     | `live`           | Implemented; included in existing unit/browser suites.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `case-converter`     | Case Converter     | `/tools/case-converter`     | Text             | Text & Writing Tools     | `live`           | Implemented; included in existing unit/browser suites.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `json-formatter`     | JSON Formatter     | `/tools/json-formatter`     | Developer        | Developer Tools          | `live`           | Implemented; included in existing unit/browser suites.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `password-generator` | Password Generator | `/tools/password-generator` | Security         | Security & Privacy Tools | `live`           | Implemented with cryptographically secure generation; included in existing tests.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `qr-generator`       | QR Code Generator  | `/tools/qr-generator`       | Image & QR       | QR & Barcode Tools       | `live`           | Implemented locally in the browser; included in existing tests.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `qr-code-scanner`    | QR Code Scanner    | `/tools/qr-code-scanner`    | QR & Barcode     | QR & Barcode Tools       | `in-development` | Phase 14. Camera, upload, screenshot and batch scanning with multi-code extraction, 16 content types, local security inspection, history, CSV/JSON/TXT export. 1086 tests, 10 E2E cases + a 23-case device-verification suite (23/23) and the site-wide 355-case core/quality suite, build and lint clean. Five real defects found and fixed during device verification (incl. a production `Permissions-Policy` that would have blocked the camera). Physical camera/hardware/iOS rows remain unverified by environment. Awaiting owner approval; see `docs/qr-scanner/README.md`. |
| `image-compressor`   | Image Compressor   | `/tools/image-compressor`   | Image & QR       | Image Tools              | `live`           | Implemented with bounded canvas processing; included in existing tests.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `merge-pdf`          | PDF Merger         | `/tools/merge-pdf`          | PDF Tools        | PDF Tools                | `live`           | Browser-only merger with page selection, previews and password unlock; owner-approved on 1 November 2026 after final real-file QA.                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `split-pdf`          | PDF Splitter       | `/tools/split-pdf`          | PDF Tools        | PDF Tools                | `live`           | Browser-only splitter with custom ranges, visual extraction, every-N/per-page modes, named validated outputs and local ZIP; owner-approved on 1 November 2026 after final real-file QA.                                                                                                                                                                                                                                                                                                                                                                                             |

### Implemented — awaiting owner approval

| ID                                                                                                                                      | Tool                                               | Current URL           | Current category | Proposed category  | Workflow status                                                                              | Verification state                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | --------------------- | ---------------- | ------------------ | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pdf-to-word`                                                                                                                           | PDF to Word Converter                              | `/tools/pdf-to-word`  | PDF Tools        | PDF Tools          | **implemented — awaiting owner approval**                                                    | 100% on-device conversion (PDF.js extraction → structure model → `docx` OOXML; optional self-hosted tesseract.js OCR in English/Hindi/Gujarati). Two modes, page ranges, preserve toggles (images/tables/headings+lists/hyperlinks/headers+footers), custom output filenames, live original-PDF preview + real generated-DOCX preview (`docx-preview`) with side-by-side compare, batch dashboard (retry failed, ZIP, batch report, clear completed), per-file quality reports (no accuracy percentages), opt-in browser-local history (IndexedDB; converted DOCX only). Implemented on `arena/dc1f7709-quickkit` for owner review. Not owner-approved, live, deployed or indexed.                                                                                                                                                                                                                                                   |
| `compress-pdf`                                                                                                                          | PDF Compressor                                     | `/tools/compress-pdf` | PDF Tools        | PDF Tools          | **implemented — awaiting owner approval**                                                    | Browser-only batch compressor with Low/Medium/High/Maximum presets, custom image quality/resolution, optional grayscale, best-effort target size, previews/comparison, exact savings, validated individual/ZIP downloads, cancellation and retry. QA evidence is in `docs/pdf-compressor/QA_REPORT.md`. Not owner-approved, deployed or indexed.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `qr-generator`                                                                                                                          | QR Code Generator — **QR Code Studio** UI redesign | `/tools/qr-generator` | Image & QR       | QR & Barcode Tools | **redesign implemented — awaiting owner approval** (the tool itself is already `live` above) | Owner-supplied reference image implemented, not described: desktop two-column workspace (Content card + Design & Customize card with Colours/Pattern/Corners/Logo/Templates tabs on the left; Preview card with the live code, stage tools, independent-decoder verdict, Size/Correction/Contrast chips, computed metadata line and the Download block on the right), Create / Bulk (CSV) / History / Presets workspace tabs, Advanced Settings as a collapsed fold carrying a truthful summary chip, preview-first single column on phones, and the Bulk CSV, local History and Presets panels rebuilt as real tabs. `lib/tools/qr/**` (encoding, styling, decoding, exports, bulk, storage) is untouched — every prior feature remains reachable and was re-verified in a real browser. Implemented on `arena/8be11fd2-quickkit`; evidence and reference comparison in `docs/qr-studio/QA_REPORT.md` + 54 screenshots + a 30-check |
| interactive browser harness run against both `next dev` and `next start`. Eight defects found in that                                   |
| pass are fixed with regression tests (export gating vs. the safety audit, template blending, inactive                                   |
| tab panels still laid out, black empty-state artwork from over-eager CSS pruning, unstyled disabled                                     |
| export tiles and flash button, validation on an untouched field, card-head a11y, 375 px head overflow), plus a site-wide dev-CSP change |
| so the dev preview hydrates. Not merged, not deployed, not owner-approved.                                                              |

### Current regression evidence

The most recent full run, recorded for the PDF to Word V2 owner review on 2 November 2026, is:

- Vitest: **138/138 passed** (including DOCX generation/structure tests that unzip and verify the OOXML output, page-range/filename parsers, preserve-option structuring, and real DOCX hyperlink relationships).
- Chromium Playwright suite: **259/259 passed** in the sandbox browser environment — the tool's own spec has 11 tests (inspection honesty, clean/layout conversion, on-device OCR, ZIP, live PDF+DOCX preview with compare/zoom/keyboard + axe inside the dialog, page-range conversion, hyperlink round-trip, batch dashboard actions, IndexedDB history across reload, mobile tabbed preview) plus site-wide axe/overflow sweeps at 9 widths.
- Production build: passed with eight repository tool routes and 34 static pages.
- Format check, ESLint and TypeScript: passed.
- Production dependency audit: **0 vulnerabilities**.

Firefox/WebKit execution is not claimed for that sandbox run; the Playwright config covers the PDF tool specs there in CI (the OCR test is Chromium-only). Any later code change requires a fresh full run; these numbers must not be copied forward as evidence for new work.

## 5. Proposed Phase 5 — PDF Tools

**Phase status:** PDF Merger and PDF Splitter are **owner-approved**. PDF Compressor was moved from the deferred list by explicit owner instruction, has been implemented as the third dedicated PDF-operations tool in this workstream and is **awaiting owner approval**. Every other Phase 5 tool remains blocked until the owner reviews PDF Compressor.
**Candidate count:** 10 original Phase 5 candidates, plus owner-authorized PDF Compressor from the deferred list.
**Projected cumulative total:** 17

|   # | Tool                          | Proposed ID            | Proposed slug          | Status                                    |
| --: | ----------------------------- | ---------------------- | ---------------------- | ----------------------------------------- |
|   1 | PDF Merger                    | `merge-pdf`            | `merge-pdf`            | **owner-approved**                        |
|   2 | PDF Splitter (Split PDF)      | `split-pdf`            | `split-pdf`            | **owner-approved**                        |
|   3 | PDF Compressor (Compress PDF) | `compress-pdf`         | `compress-pdf`         | **implemented — awaiting owner approval** |
|   4 | Organize PDF                  | `organize-pdf`         | `organize-pdf`         | `planned`                                 |
|   5 | Rotate PDF                    | `rotate-pdf`           | `rotate-pdf`           | `planned`                                 |
|   6 | Images to PDF                 | `images-to-pdf`        | `images-to-pdf`        | `planned`                                 |
|   7 | PDF to Images                 | `pdf-to-images`        | `pdf-to-images`        | `planned`                                 |
|   8 | Extract PDF Text              | `extract-pdf-text`     | `extract-pdf-text`     | `planned`                                 |
|   9 | Add PDF Page Numbers          | `add-pdf-page-numbers` | `add-pdf-page-numbers` | `planned`                                 |
|  10 | Add PDF Watermark             | `add-pdf-watermark`    | `add-pdf-watermark`    | `planned`                                 |
|  11 | PDF Metadata Editor           | `pdf-metadata-editor`  | `pdf-metadata-editor`  | `planned`                                 |

**Next gate:** Owner review of the PDF Compressor demo, screenshots and `docs/pdf-compressor/QA_REPORT.md`. Do not deploy/index it or begin another Phase 5 PDF tool before that explicit decision.

## 6. Proposed Phase 6 — Image Tools

**Phase status:** Planned — pending approval and completion of earlier phases  
**Candidate count:** 10  
**Projected cumulative total:** 26

|   # | Tool                        | Proposed ID               | Proposed slug             | Status    |
| --: | --------------------------- | ------------------------- | ------------------------- | --------- |
|   1 | Crop Image                  | `crop-image`              | `crop-image`              | `planned` |
|   2 | Resize Image                | `resize-image`            | `resize-image`            | `planned` |
|   3 | Rotate & Flip Image         | `rotate-flip-image`       | `rotate-flip-image`       | `planned` |
|   4 | Image Filters & Adjustments | `image-filters`           | `image-filters`           | `planned` |
|   5 | Color Picker from Image     | `color-picker-from-image` | `color-picker-from-image` | `planned` |
|   6 | Image Metadata Viewer       | `image-metadata-viewer`   | `image-metadata-viewer`   | `planned` |
|   7 | Remove Image Metadata       | `remove-image-metadata`   | `remove-image-metadata`   | `planned` |
|   8 | Favicon Generator           | `favicon-generator`       | `favicon-generator`       | `planned` |
|   9 | Watermark Image             | `watermark-image`         | `watermark-image`         | `planned` |
|  10 | Blur or Pixelate Image      | `blur-pixelate-image`     | `blur-pixelate-image`     | `planned` |

## 7. Proposed Phase 7 — Text & Writing Tools

**Phase status:** Planned — pending approval and completion of earlier phases  
**Candidate count:** 12  
**Projected cumulative total:** 38

|   # | Tool                          | Proposed ID                     | Proposed slug                   | Status    |
| --: | ----------------------------- | ------------------------------- | ------------------------------- | --------- |
|   1 | Remove Duplicate Lines        | `remove-duplicate-lines`        | `remove-duplicate-lines`        | `planned` |
|   2 | Sort Lines                    | `sort-lines`                    | `sort-lines`                    | `planned` |
|   3 | Find and Replace Text         | `find-and-replace-text`         | `find-and-replace-text`         | `planned` |
|   4 | Text Diff Checker             | `text-diff`                     | `text-diff`                     | `planned` |
|   5 | Remove Extra Spaces           | `remove-extra-spaces`           | `remove-extra-spaces`           | `planned` |
|   6 | Reverse Text                  | `reverse-text`                  | `reverse-text`                  | `planned` |
|   7 | Repeat Text                   | `repeat-text`                   | `repeat-text`                   | `planned` |
|   8 | Lorem Ipsum Generator         | `lorem-ipsum-generator`         | `lorem-ipsum-generator`         | `planned` |
|   9 | Random Word Generator         | `random-word-generator`         | `random-word-generator`         | `planned` |
|  10 | Slug Generator                | `slug-generator`                | `slug-generator`                | `planned` |
|  11 | Invisible Character Inspector | `invisible-character-inspector` | `invisible-character-inspector` | `planned` |
|  12 | Text to Speech                | `text-to-speech`                | `text-to-speech`                | `planned` |

## 8. Proposed Phase 8 — Developer Tools

**Phase status:** Planned — pending approval and completion of earlier phases  
**Candidate count:** 14  
**Projected cumulative total:** 52

|   # | Tool                     | Proposed ID              | Proposed slug            | Status    |
| --: | ------------------------ | ------------------------ | ------------------------ | --------- |
|   1 | Base64 Encoder / Decoder | `base64-encoder-decoder` | `base64-encoder-decoder` | `planned` |
|   2 | URL Encoder / Decoder    | `url-encoder-decoder`    | `url-encoder-decoder`    | `planned` |
|   3 | JWT Decoder              | `jwt-decoder`            | `jwt-decoder`            | `planned` |
|   4 | UUID Generator           | `uuid-generator`         | `uuid-generator`         | `planned` |
|   5 | Hash Generator           | `hash-generator`         | `hash-generator`         | `planned` |
|   6 | Regex Tester             | `regex-tester`           | `regex-tester`           | `planned` |
|   7 | Timestamp Converter      | `timestamp-converter`    | `timestamp-converter`    | `planned` |
|   8 | Color Converter          | `color-converter`        | `color-converter`        | `planned` |
|   9 | CSS Gradient Generator   | `css-gradient-generator` | `css-gradient-generator` | `planned` |
|  10 | SQL Formatter            | `sql-formatter`          | `sql-formatter`          | `planned` |
|  11 | XML Formatter            | `xml-formatter`          | `xml-formatter`          | `planned` |
|  12 | YAML ↔ JSON Converter    | `yaml-json-converter`    | `yaml-json-converter`    | `planned` |
|  13 | CSV ↔ JSON Converter     | `csv-json-converter`     | `csv-json-converter`     | `planned` |
|  14 | Cron Expression Parser   | `cron-expression-parser` | `cron-expression-parser` | `planned` |

## 9. Proposed Phase 9 — Calculators & Converters

**Phase status:** Planned — pending approval and completion of earlier phases  
**Candidate count:** 12  
**Projected cumulative total:** 64

|   # | Tool                         | Proposed ID                    | Proposed slug                  | Status    |
| --: | ---------------------------- | ------------------------------ | ------------------------------ | --------- |
|   1 | Unit Converter               | `unit-converter`               | `unit-converter`               | `planned` |
|   2 | Percentage Calculator        | `percentage-calculator`        | `percentage-calculator`        | `planned` |
|   3 | Loan Calculator              | `loan-calculator`              | `loan-calculator`              | `planned` |
|   4 | Compound Interest Calculator | `compound-interest-calculator` | `compound-interest-calculator` | `planned` |
|   5 | BMI Calculator               | `bmi-calculator`               | `bmi-calculator`               | `planned` |
|   6 | Age Calculator               | `age-calculator`               | `age-calculator`               | `planned` |
|   7 | Date Difference Calculator   | `date-difference-calculator`   | `date-difference-calculator`   | `planned` |
|   8 | Time Duration Calculator     | `time-duration-calculator`     | `time-duration-calculator`     | `planned` |
|   9 | Tip & Bill Split Calculator  | `tip-calculator`               | `tip-calculator`               | `planned` |
|  10 | Discount & Tax Calculator    | `discount-tax-calculator`      | `discount-tax-calculator`      | `planned` |
|  11 | Roman Numeral Converter      | `roman-numeral-converter`      | `roman-numeral-converter`      | `planned` |
|  12 | Number Base Converter        | `number-base-converter`        | `number-base-converter`        | `planned` |

## 10. Proposed Phase 10 — QR & Barcode Tools

**Phase status:** Planned — pending approval and completion of earlier phases  
**Candidate count:** 10  
**Projected cumulative total:** 74

|   # | Tool                  | Proposed ID             | Proposed slug           | Status                                                                                                          |
| --: | --------------------- | ----------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------- |
|   1 | Wi-Fi QR Generator    | `wifi-qr-generator`     | `wifi-qr-generator`     | `planned`                                                                                                       |
|   2 | vCard QR Generator    | `vcard-qr-generator`    | `vcard-qr-generator`    | `planned`                                                                                                       |
|   3 | Email QR Generator    | `email-qr-generator`    | `email-qr-generator`    | `planned`                                                                                                       |
|   4 | SMS QR Generator      | `sms-qr-generator`      | `sms-qr-generator`      | `planned`                                                                                                       |
|   5 | Phone QR Generator    | `phone-qr-generator`    | `phone-qr-generator`    | `planned`                                                                                                       |
|   6 | Location QR Generator | `location-qr-generator` | `location-qr-generator` | `planned`                                                                                                       |
|   7 | Event QR Generator    | `event-qr-generator`    | `event-qr-generator`    | `planned`                                                                                                       |
|   8 | Batch QR Generator    | `batch-qr-generator`    | `batch-qr-generator`    | `planned`                                                                                                       |
|   9 | QR Code Scanner       | `qr-code-scanner`       | `qr-code-scanner`       | `in-development` — implemented in phase 14, awaiting owner approval (see the section near the top of this file) |
|  10 | Barcode Generator     | `barcode-generator`     | `barcode-generator`     | `planned`                                                                                                       |

## 11. Proposed Phase 11 — Security & Privacy Tools

**Phase status:** Planned — pending approval, threat modeling and completion of earlier phases  
**Candidate count:** 8  
**Projected cumulative total:** 82

|   # | Tool                           | Proposed ID                      | Proposed slug                    | Status    |
| --: | ------------------------------ | -------------------------------- | -------------------------------- | --------- |
|   1 | Password Strength Checker      | `password-strength-checker`      | `password-strength-checker`      | `planned` |
|   2 | Passphrase Generator           | `passphrase-generator`           | `passphrase-generator`           | `planned` |
|   3 | File Hash Verifier             | `file-hash-verifier`             | `file-hash-verifier`             | `planned` |
|   4 | Text Encryptor                 | `text-encryptor`                 | `text-encryptor`                 | `planned` |
|   5 | Secure Random Number Generator | `secure-random-number-generator` | `secure-random-number-generator` | `planned` |
|   6 | Random Picker                  | `random-picker`                  | `random-picker`                  | `planned` |
|   7 | Sensitive Text Redactor        | `sensitive-text-redactor`        | `sensitive-text-redactor`        | `planned` |
|   8 | Browser Fingerprint Viewer     | `browser-fingerprint-viewer`     | `browser-fingerprint-viewer`     | `planned` |

## 12. Proposed Phase 12 — AI-Powered Tools

**Phase status:** Planned — each candidate requires a separate model, privacy, quality, license and cost go/no-go review  
**Candidate count:** 8  
**Projected cumulative total:** 90

|   # | Tool                    | Proposed ID               | Proposed slug             | Status    |
| --: | ----------------------- | ------------------------- | ------------------------- | --------- |
|   1 | Background Remover      | `background-remover`      | `background-remover`      | `planned` |
|   2 | OCR Text Extractor      | `ocr-text-extractor`      | `ocr-text-extractor`      | `planned` |
|   3 | Image Caption Generator | `image-caption-generator` | `image-caption-generator` | `planned` |
|   4 | Text Summarizer         | `text-summarizer`         | `text-summarizer`         | `planned` |
|   5 | Grammar Checker         | `grammar-checker`         | `grammar-checker`         | `planned` |
|   6 | Paraphraser             | `paraphraser`             | `paraphraser`             | `planned` |
|   7 | Translator              | `translator`              | `translator`              | `planned` |
|   8 | Image Upscaler          | `image-upscaler`          | `image-upscaler`          | `planned` |

## 13. Deferred or specially gated ideas — not counted

These are **not** part of the 84-candidate count and must not receive public cards.

| Idea                            | Planning state                          | Reason                                                                                                                                |
| ------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Compress PDF                    | Deferred pending engine spike           | A trustworthy browser implementation must demonstrate meaningful size reduction and acceptable quality loss.                          |
| Protect PDF                     | Deferred pending engine/security review | Standard browser PDF manipulation alone does not provide production encryption.                                                       |
| Unlock/password-bypass PDF      | Not proposed                            | QUICKKIT should not present password bypassing as a feature. Handling a user-supplied password would need a separate security design. |
| Cryptographic PDF signing       | Deferred                                | Certificate trust and signature validity are separate from placing a visual signature.                                                |
| Live currency converter         | Deferred                                | Requires a licensed rate source, timestamps, caching, availability and financial-disclaimer policy.                                   |
| Breach/password exposure lookup | Deferred                                | Requires a dedicated privacy/security design and approved data source.                                                                |
| TOTP/authenticator secret tools | Deferred                                | Secret handling creates account-compromise risk and needs a dedicated security review.                                                |

## 14. Tool completion gate

A candidate may move from `planned` to `live` only when all items below are evidenced:

- [ ] Non-duplicate user job approved.
- [ ] Registry ID, slug, category, icon, keywords and processing/privacy mode finalized.
- [ ] Dependencies, licenses, bundle impact and third parties reviewed.
- [ ] Functional implementation complete; no placeholder or simulated result.
- [ ] Input limits and hostile/malformed-input behavior implemented.
- [ ] Original page content, steps, FAQs and limitations written.
- [ ] Unique SEO title and description added.
- [ ] Unit tests cover core logic and edge cases.
- [ ] Browser tests cover the successful journey and important failures.
- [ ] Accessibility, keyboard and responsive behavior verified.
- [ ] Network/privacy behavior matches the user-facing disclosure.
- [ ] Desktop/mobile screenshots captured.
- [ ] This status file updated in the same change.

## 15. Update protocol

1. Change a tool to `in-development` only when its phase and design are approved.
2. Record replacements rather than silently deleting a candidate; explain the duplicate/quality/privacy reason.
3. Never reuse a retired ID or slug.
4. Update counts whenever a status changes.
5. Link phase evidence from the phase report rather than copying stale pass counts.
6. Keep planned tools out of public navigation, search, sitemap and category counts.

## 16. Decisions for future expansion

PDF Merger proceeded under the owner's explicit narrow-catalog integration decision; the full registry migration remains separate and does not block owner review of PDF Merger.

- [ ] Personally approve or request changes to PDF Merger before any next tool starts.
- [ ] Approve the registry architecture and URL model.
- [ ] Approve the remaining candidate scope and the resulting 90-tool total, with Phase 13 reserved for 100+.
- [ ] Approve the eight-category taxonomy and remapping of the existing tools.
- [ ] Approve the remaining Phase 5 PDF list and deferral of Compress/Protect pending technical evidence.
- [ ] Decide whether account-free favorites may store tool IDs in local storage.
- [ ] Decide whether to show editorial “Featured” tools while keeping “Popular” hidden until real aggregate data exists.
- [ ] Decide whether to build the registry foundation before the next tool after PDF Merger approval.

## 17. Change log

| Date            | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 November 2026 | Initial expansion tracker created. Six implemented tools recorded; 84 candidates marked `planned` pending approval; Phase 5 not started.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 1 November 2026 | Strict one-tool-at-a-time policy adopted. PDF Merger selected as the sole active tool; `PDF_MERGER_PLAN.md` completed. Status remains `planned` with workflow note “research/planning, awaiting approval”; no implementation started.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 1 November 2026 | Owner approved the PDF Merger plan with mandatory browser-only processing, explicit actionable errors/no silent skipping and a polished complete mobile workflow. PDF Merger became the sole active implementation.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 1 November 2026 | Local PDF Merger work was backed up, integrated directly onto pushed baseline `db4e906`, committed at `070bc77` and pushed to `arena/eb17e485-quickkit`/PR #2. No merge into `main` was performed.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 1 November 2026 | Final PDF Merger QA and owner-review handoff completed in `docs/pdf-merger/QA_REPORT.md`. Status set to **implemented — awaiting owner approval**; all other tools remain blocked.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 2 November 2026 | PDF Merger merged into `main` by the owner (via PR #4/#5) and moved to implemented (`live`). Portfolio now counts 7 implemented tools.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 2 November 2026 | PDF to Word Converter implemented at the owner's direction on `arena/dc1f7709-quickkit`: on-device PDF→DOCX with Original Layout + Clean Editable modes, batch queue with ZIP/batch report, optional self-hosted OCR for scanned pages, honest per-file errors (password/corrupt/limits), and conversion notes instead of silent loss. Added `'wasm-unsafe-eval'` to the CSP `script-src` (permits WebAssembly compilation for OCR; does not enable JS eval). Full gates green (129 unit, 253 Chromium e2e, build, audit). Status: **implemented — awaiting owner approval**; do not merge or start another tool until the owner approves.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 2 November 2026 | **PDF to Word V2** built on the same PR #6 branch at the owner's direction, preserving all V1 behaviour: original-PDF preview (lazy pdfjs pages/thumbnails, zoom stepped from effective on-screen zoom, rotate-for-view, fullscreen, keyboard), preview of the actual generated DOCX (`docx-preview`, lazy-loaded), desktop side-by-side compare + mobile tabs, page-range conversion, hyperlink extraction, preserve toggles, OCR languages (eng/hin/guj), custom output filenames, batch dashboard with counts/retry-failed/batch report/clear-completed/batch banner, per-file quality report (source/converted pages, extraction status, images/tables/links kept, OCR usage, honest content-loss verdict), and opt-in browser-local history (IndexedDB, session/24h/7d, DOCX only). Gates: 138 unit, 259 Chromium e2e, 34-page build, 0 audit findings. Still **awaiting owner approval** — not merged, live, deployed or indexed.                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 3 November 2026 | **QR Code Studio browser QA + eight fixes.** Built a 29-check interactive harness and ran it against both `next dev` (port 3001) and `next start` (3000): every control driven for real, all four exports downloaded and decoded back to the exact payload, all 12 content types filled and verified, bulk CSV → ZIP → report, error/loading/stale states, overflow at 1440/1280/768/430/390/375 — **30/30 checks passed, 0 console and page errors / 30/30 checks passed, 0 console and page errors**, zero console or page errors, and 54 re-captured screenshots, reviewed by eye afterwards (which is how the black empty-state square was caught at all). Fixed seven defects it exposed (export tiles ignoring the safety audit; templates blending with the previous template; `[hidden]` tab panels still laid out; black empty-state artwork from CSS pruning; unstyled disabled export tiles and flash button; stale copy in the QA doc) with unit + Playwright regressions, and fixed the site-wide dev-mode freeze by serving the CSP report-only outside production (`next.config.ts`, new `tests/next-headers.test.ts`, production unchanged). Gates: `tsc`/ESLint/Prettier clean, `npm run test` **555 passed / 33 files**, Playwright **259 passed / 0 failed**, production build clean with `/tools/qr-generator` static. Still **awaiting owner approval**; not merged, not deployed. |
| 2 November 2026 | **QR Code Studio premium UI redesign** implemented on `arena/8be11fd2-quickkit` from the owner's attached reference image: two-column desktop workspace, Create/Bulk/History/Presets tabs, preview-first mobile layout, Advanced Settings collapsed by default, Bulk CSV + local History + Presets panels as separate tabs, purple-lavender card system. No engine change (`lib/tools/qr/**` untouched); all 12 content types, colour/gradient, module/eye patterns, logo upload, templates, error correction, quiet zone, verification gate, exports (PNG, high-res PNG, SVG, PDF), copy/share, presets, history and bulk CSV remain real and working. Gates: `tsc`/ESLint/Prettier clean, 547 unit tests passed, production build clean, Playwright Chromium suite green against the production server (real PNG decode via jsQR, SVG/PDF/ZIP file checks, axe WCAG 2.2 AA, nine-width overflow sweep), 49 screenshots at 1440/768/430/390/375 with zero page-level horizontal overflow. Recorded in `docs/qr-studio/QA_REPORT.md`. Status: **redesign implemented — awaiting owner approval**; not merged, not deployed, no other tool touched.                                                                                                                                                                                                                                                      |

## Phase 9 V2 continuation — 2 November 2026

In progress, not released: see `PHASE_9_V2_CHECKLIST.md` for per-tool status, financial/calendar additions, independent sample calculations, production Chromium results and outstanding work. Full per-feature verification of all 12 remains pending. No merge or deployment.

### Phase 9 V2 populated preview checkpoint

All 12 calculator routes have populated mobile and desktop Chromium screenshots indexed in `docs/phase-9-v2-final-evidence/README.md`; 319 Chromium regression tests, 188 unit tests, lint, typecheck and production build passed on this application code. Feature and cross-browser coverage remain incomplete; see `PHASE_9_V2_CHECKLIST.md`. Not merged or deployed.

### Advanced Calculators V2 — audit on `arena/b46b2680-quickkit`

**Status: In progress; currency conversion blocked.** `PHASE_9_ADVANCED_V2_AUDIT.md` records the 12-tool feature matrix, risks, tests and outstanding work. Live currency conversion has no approved/configured rate source accessible to this environment; the owner approved deferring it while other work continues; no rates are fabricated. BMI adult-category age gating is an identified high-priority safety gap. No code changes or new test runs are claimed for this audit; no merge or deployment.

### BMI safety batch

Adult BMI interpretation is gated on explicit age-group selection; unknown/under-20 inputs receive only numerical BMI and pediatric guidance. Targeted unit and Chromium tests passed; remaining BMI features and comprehensive verification remain open in `PHASE_9_ADVANCED_V2_AUDIT.md`.

### Advanced V2 financial and converter batch

Testing: profit/margin/markup, loan-to-value and maximum affordable loan estimates, acceleration/milliseconds, Rankine, a temperature category and searchable/filterable calculator catalog added. See `PHASE_9_ADVANCED_V2_AUDIT.md` for test evidence, corrections and remaining gaps. Live currency conversion remains **BLOCKED — awaiting an approved live exchange-rate provider**. No push, merge or deployment.

### Advanced V2 time-zone batch

Testing: local IANA meeting planner supports multiple zones, explicit DST overlap selection, gap rejection, 12/24-hour display and CSV. Targeted unit and Chromium tests passed; see `PHASE_9_ADVANCED_V2_AUDIT.md` for supported range and outstanding verification. Currency conversion remains blocked pending an approved live provider.

### Advanced V2 current regression checkpoint

On `arena/b46b2680-quickkit`, production build, formatting, lint, typecheck, 196 unit tests and 325 Chromium E2E tests passed. Feature work remains **In Progress** across the calculators; see the current per-tool checklist in `PHASE_9_V2_CHECKLIST.md`. The approved currency deferral remains **Blocked — awaiting an approved live exchange-rate provider**. No push, merge or deployment.

### Discount calculator focused continuation

In progress: strict discount inputs and numeric guards, session-history controls and focused unit/Chromium testing. Details and limitations: `docs/phase-9-discount-qa/README.md`. The overall 12-calculator upgrade remains incomplete; no push, merge or deployment.

### Accelerated Phase 9 batch 1

Testing: Discount PDF export, Percentage advanced PDF export and BMI multiple-person comparison with per-person age gating added. Targeted unit and Chromium evidence, including an initial selector failure and successful correction, is in `PHASE_9_V2_CHECKLIST.md`. Batch and overall project remain incomplete; currency conversion stays blocked. No push, merge or deployment.

### Accelerated Phase 9 batch 2

Testing: multi-item GST PDF, optional age zodiac, and complete date-result CSV added. Focused unit/browser checks passed; see `PHASE_9_V2_CHECKLIST.md` for limitations and remaining checks. Currency conversion remains blocked. No push, merge or deployment.

### Accelerated Phase 9 batch 3

Testing: monthly EMI/loan PDF schedules, scientific expression-history CSV and conversion comparison CSV; converter session-snapshot precision/settings restore and favorites added. Six focused Chromium tests passed. See `PHASE_9_V2_CHECKLIST.md` for omissions and limitations. Currency conversion remains blocked; no push, merge or deployment.

### Accelerated V2 regression checkpoint

In progress, not accepted or deployed: 202 unit tests, 339 Chromium tests, lint, formatting, typecheck and production build passed. See `PHASE_9_ACCELERATED_REPORT.md` for all 12 tool statuses and remaining limitations. Currency conversion is blocked pending an approved live provider. No push, merge or deployment.

---

## Image Tools workstream (separate branch, merged into the shared tree on 2 November 2026)

This section records the Image Tools workstream on `arena/82ce86c2-quickkit` / PR #8.
It is **append-only**: nothing above (PDF Merger, PDF to Word, Phase 9, the portfolio
counts and the change log) was edited, re-scored or re-dated by this workstream.

| #   | Tool                 | Route                     | Status                                                | Branch                     | Notes                                                                                                                                                                                                                                                                                                                                                          |
| --- | -------------------- | ------------------------- | ----------------------------------------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Image Resizer**    | `/tools/image-resizer`    | ✅ **Done — owner approved 1 Nov 2026** (frozen)      | `feature/image-resizer`    | Full local editor: exact/percentage/longest-side sizing, 26 presets, crop, free-angle rotation, flips, colour adjustments, compare, DPI/print, per-image undo/redo, batch + ZIP, metadata panel. `docs/FEATURE_IMAGE_RESIZER.md`, `docs/QA_IMAGE_RESIZER_AUDIT.md`                                                                                             |
| 2   | **Image Compressor** | `/tools/image-compressor` | ✅ **Done (v2) — owner approved 1 Nov 2026** (frozen) | `feature/image-compressor` | Quality **and** exact KB/MB target modes, JPEG/PNG/WebP (+AVIF where supported), per-image overrides, split/side-by-side compare, transparency handling, batch + ZIP, Stop/Retry. `docs/FEATURE_IMAGE_COMPRESSOR.md`, `docs/QA_IMAGE_COMPRESSOR_AUDIT.md`                                                                                                      |
| 3   | **Image Cropper**    | `/tools/image-cropper`    | ✅ **Done — verified, awaiting owner sign-off**       | `feature/image-cropper`    | New tool: freeform + fixed ratios, 18 social presets, custom width/height, circle and square masks, rotate/flip, 25–400 % zoom with pan and “crop to visible area”, 1:1 crop-pixel export, JPEG/PNG/WebP with quality, per-image batch crops + ZIP, EXIF auto-correction, 50-step undo/redo. `docs/FEATURE_IMAGE_CROPPER.md`, `docs/QA_IMAGE_CROPPER_AUDIT.md` |

Integration notes:

- The three tools are ordinary additive entries in `lib/catalog.ts` (Image Tools category)
  plus their icon keys (`resize`, `crop`) in `components/tool-icon.tsx`; the Image Tools
  category therefore lists three tools on `/tools` and `/category/image-tools`.
- Their CSS is appended to `app/globals.css` under `.resizer-*`, `.compressor-*`,
  `.cropper-*` and a `.sky` icon tint. No existing rule was edited or removed.
- Tests added: `tests/image-resize.test.ts`, `tests/image-edits.test.ts`,
  `tests/image-compress.test.ts`, `tests/image-crop.test.ts`, `tests/zip.test.ts`,
  `tests/exif.test.ts`, `tests/image-header.test.ts`, plus the browser suites
  `image-resizer.spec.ts`, `image-resizer-edits.spec.ts`, `image-resizer-audit.spec.ts`,
  `image-compressor.spec.ts`, `image-compressor-audit.spec.ts` and
  `image-cropper-audit.spec.ts`.
- No PDF file, PDF route, PDF component or PDF status above was modified by this workstream.

**Merge record (2 November 2026).** `main` had advanced 36 commits (PRs #4–#7: premium
redesign, 8 categories, saved tools, QR expansion, PDF to Word, calculator suite) after this
branch was cut from `35f957b`. The image work was integrated by merging `main` into
`arena/82ce86c2-quickkit` and resolving 16 conflicting shared files: the new catalogue,
category metadata and icon map were kept, the three image tool records and icon keys were
re-added, the `.resizer-*` / `.compressor-*` / `.cropper-*` / `.sky` CSS blocks were appended
to the redesigned `globals.css`, and the route-count expectations were re-based on the new
catalogue (22 tools, 40 sitemap routes). The owner-approved components themselves were not
changed.

---

## Image & PDF Converter workstream (feature branch, pending owner approval)

This section is appended after the merged Image Tools record above. It records the
Image & PDF Converter built on `feature/image-converter` from `main` at `2ed5bdc`
(PR #8 merge). Nothing above was edited, re-scored or re-dated. **Not merged and not
deployed; owner approval is required first.**

| #   | Tool                      | Route                    | Status                                      | Branch                    | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| --- | ------------------------- | ------------------------ | ------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | **Image & PDF Converter** | `/tools/image-converter` | 🟡 **Implemented, awaiting owner approval** | `feature/image-converter` | Three modes in one tool: image→image (JPG, PNG, WEBP, AVIF, GIF, BMP, TIFF), images→PDF (single/multi, A4/A3/Letter/Legal/custom, portrait/landscape, margins, contain/cover/fill, page background, live layout preview) and PDF→image (JPG/PNG/WEBP, page ranges, 72–300 DPI, page thumbnails, individual downloads, ZIP). Advanced settings: quality (lossy only), transparency keep/flatten with background, resize by percentage/exact/longest side, EXIF orientation handling, TIFF LZW/uncompressed, per-file format override, filename suffix, real before/after preview. Batch queue with real dimensions, page counts, per-file status, retry, cancel, clear, per-file and ZIP downloads. `docs/FEATURE_IMAGE_CONVERTER.md` |

Supported matrix and honest limits:

- Image→image outputs: JPG, PNG, WEBP, AVIF, GIF, BMP, TIFF. AVIF and WEBP output are
  offered **only after a real encoder probe succeeds** in the current browser; a format
  the browser cannot write is disabled instead of emitting a broken file.
- TIFF is read by a built-in decoder (browsers cannot open TIFF) and written by the
  built-in encoder; BMP and GIF are also written by built-in encoders. GIF input uses its
  first frame only — animation is **not** preserved and the interface says so.
- PDF→image exports **JPG, PNG and WEBP only**. GIF/BMP/TIFF from PDF is intentionally
  unsupported and never shown as available.
- Images placed into a PDF are embedded as JPEG pixels. Exported PDFs contain **no
  editable text layer**, no font objects and no claimed text fidelity.
- Limits (configurable in `lib/tools/image-convert.ts`): 20 files, 15 MB per image,
  25 MB / 100 pages per PDF, 150 MB per batch, 24 MP per image, 8,192 px per side,
  36 MP per rendered PDF page, 72–300 DPI, quality 10–100, margins 0–60 mm. There is no
  "unlimited" path.

Integration notes (additive only):

- New route `app/tools/image-converter/page.tsx` (static, SEO metadata, breadcrumbs,
  FAQs, HowTo/FAQ JSON-LD); new catalogue record `image-converter` in `lib/catalog.ts`
  (Image Tools category, `convert` icon, purple tint, phase 3); new `convert` key in
  `components/tool-icon.tsx`. The sitemap derives the new URL from the catalogue.
- New CSS is appended to `app/globals.css` under the `.converter-*` namespace only.
  No existing rule was edited. The frozen Image Resizer, Image Compressor and Image
  Cropper libraries, components, routes and CSS were not modified.
- New engine files: `lib/tools/image-convert.ts` (DOM-free model: formats, support
  matrix, page geometry, page ranges, naming), `lib/tools/image-codec.ts` (BMP/GIF/TIFF
  codecs, TIFF decoder), `lib/tools/image-encode-client.ts` +
  `workers/image-encode.worker.ts` (off-thread encoders with main-thread fallback),
  `lib/tools/image-convert-runner.ts` (canvas conversion, PDF build/render, ZIP).
- New UI: `components/tools/image-converter.tsx`,
  `components/tools/image-converter/settings-panel.tsx`,
  `components/tools/image-converter/types.ts`. Reuses the shared `ToolShell`, catalogue,
  design tokens, `downloadBlob`, `zip` and PDF.js assets already in the repo.
- Tests added: `tests/image-convert.test.ts` (model, page ranges, naming, PDF geometry,
  format matrix), `tests/image-codec.test.ts` (BMP/GIF/TIFF encoders, TIFF round-trip),
  `tests/e2e/image-converter.spec.ts` (empty state + axe, JPG→PNG, transparent PNG→JPG,
  WEBP/AVIF/GIF/BMP/TIFF, quality and resize, batch + ZIP, images→PDF page sizes and
  raster-only check, PDF→PNG range + ZIP, out-of-range rejection, cancel of a 30-page
  300-DPI render, corrupt file, 375/390/430/768/1440 overflow, keyboard and mobile
  Files/Preview switch). `tests/catalog.test.ts`, `tests/launch.test.ts` and
  `tests/e2e/quality.spec.ts` were extended for the new route. No existing test
  expectation was deleted or re-scored.
- No PDF Merger, PDF Splitter, PDF to Word, Image Resizer, Image Compressor or Image
  Cropper file, route, status or score above was changed.

Verification record (branch tip at the time of this entry): `npm run format:check` pass,
`npm run lint` 0 errors, `npm test` 27 files / 414 tests pass, `npm run build` compiles
with `/tools/image-converter` emitted as a static route, and the browser suite runs in CI
(`.github/workflows/ci.yml`) because this sandbox has no browser binaries. Local browser
verification is therefore CI-only; desktop and mobile screenshots come from the CI
Playwright run. Known limitations are listed in `docs/FEATURE_IMAGE_CONVERTER.md`.

### Image & PDF Converter — verification pass addendum (2 November 2026)

Appended after the record above; nothing above was edited. First CI run on `1149448` exposed four
browser-test issues that this pass fixed:

- the quality range input had no accessible name (axe `label`) — it now has one;
- the resize sub-check re-read a WEBP with a PNG decoder — it now converts to PNG for that check;
- pdf-lib always writes an empty `/Font` resource dictionary, so the "raster-only" assertion was
  wrong — it now checks for real font objects (`/Type1`, `/Type0`, `Helvetica`) instead;
- controlled range inputs were being changed through `element.value`, which React's tracker
  swallows; the browser tests now use the native value setter.

Also added in this pass: a mobile Files/Preview switch (aria-pressed + aria-controls, real panels,
auto-switch after a finished conversion), Move earlier/later ordering for Images to PDF, a visible
"Format & limitation notes" panel, an 800 % resize ceiling matching the documented range, a
main-thread retry if the encoder worker fails, exported-page navigation for PDF→image results, and a
CI artifact (`browser-screenshots`) that keeps the 375/390/430/768/1440 captures from the converter
spec so the owner can review the real layout. Full suite: 27 unit files / 414 tests, lint,
format:check, typecheck and production build pass. Browser results are recorded in the pull request;
the two pre-existing webkit pdf-merger failures are unchanged and out of scope. Not merged.

### Image & PDF Converter — browser verification result (2 November 2026)

Appended record of the green browser run on `0e19d01` (CI run `41423465939`): **500 passed,
4 skipped, 2 failed**. Both failures are the pre-existing WebKit PDF Merger tests
(`Combined_report.pdf` filename and the page-picker contrast audit) that also fail on `main`
and are out of scope for this workstream; no PDF Merger file was touched. The converter spec
itself passed every case: empty state + axe, JPG→PNG byte-integrity, transparent PNG→JPG,
WEBP/AVIF/GIF/BMP/TIFF outputs, quality and resize, batch + ZIP, Images to PDF page count,
A4 geometry and raster-only check, queue ordering, PDF→PNG page range + ZIP, out-of-range
rejection, cancellation, corrupt input, mobile Files/Preview switch and the
375/390/430/768/1440 overflow/keyboard sweep. Format check, lint, typecheck, 414 unit tests
and the production build all passed on the same commit. The 375/390/430/768/1440 full-page
captures are in the `browser-screenshots` CI artifact. **Not merged; owner approval pending.**

---

## Image & PDF Converter — dual-category integration and final upgrade (2 November 2026)

Appended after the records above; nothing above was edited, re-scored or re-dated. Branch
`arena/fadc144f-quickkit` (PR open, **not merged or deployed**).

**Category integration (mandatory).** The existing `image-converter` catalogue record now carries
`categories: ["Image Tools", "PDF Tools"]`; `toolCategoriesOf()` resolves membership and
`toolsByCategory()` / `filterTools()` honour every category. One record, one route
(`/tools/image-converter`), no duplicate tool. Category counts are computed from that function, so
`/category/image-tools` shows **4 tools** and `/category/pdf-tools` shows **3 tools**, each with a
single card for the converter. The All Tools explorer, search, category filter, sitemap (still 41
URLs), breadcrumbs (now Home → Tools → Category → Tool), a "Filed under" nav on the tool page and
round-robin related tools from both categories all reflect the same record. Existing PDF Merger,
PDF to Word, Image Resizer, Image Compressor and Image Cropper records, routes and files are
unchanged.

**Functional audit and fixes in this pass.**

- PDF uploads over 100 pages are rejected at inspection (`readPdfPageCount`) and `parsePageRange`
  independently enforces the 100-page ceiling; 25 MB remains the size limit.
- Password-protected and corrupt PDFs surface a specific error and disable Convert instead of
  offering a confusing "page count not loaded" message.
- Rotated PDF pages (`/Rotate`) export at their displayed orientation, verified by a browser test
  that checks rotated and upright page dimensions plus ZIP integrity.
- Per-file progress now reflects real page progress for PDF→images and images→PDF; the queue shows a
  determinate bar for the converting file and the overall bar/counters remain.
- Large PDF previews use a six-page sliding thumbnail window instead of a fixed pages 1–6 strip.
- Result cards show `original size → output size` plus a savings chip; PDF results state they are
  raster-only.
- The settings panel states that metadata is always stripped (EXIF orientation applied first)
  rather than offering a control that cannot be honoured; the file picker `accept` value changes per
  mode (images vs `application/pdf`).
- Duplicate `alt` attribute in the PDF preview was removed.

**Tests added.** Unit: dual membership, category counts, dual-category search, related-tool
round-robin, 100-page range ceiling (418 unit tests total). Browser: category discovery at
`/category/image-tools` and `/category/pdf-tools` plus search-to-tool navigation, password-protected
PDF rejection, corrupt PDF rejection, rotated-page dimensions/order/ZIP, existing conversion, batch,
PDF page, cancel, axe and 375/390/430/768/1440 coverage. Format check, lint, typecheck and production
build pass locally; browser results are recorded on the pull request.

## Image & PDF Converter — final verification and evidence refresh (2 November 2026)

Appended after the record above; nothing above was edited or re-dated. Branch
`arena/fadc144f-quickkit` (PR open, **not merged or deployed**).

**Preview refinement.** Raster previews now open in _Fit to panel_ so a portrait page is visible in
full instead of being cropped at the top of the stage; moving the zoom slider switches to free zoom
(50–300 %) and the stage scrolls. PDF page and exported-page previews are capped to the stage height
for the same reason. The full-page capture helper pins sticky chrome while screenshotting, which
confirmed the header seen mid-page in the first evidence image was a full-page-screenshot artefact of
the sticky header, not a layout overlap.

**Verification on `1971ef4` (CI run `41433639482`).** Browser: **504 passed, 5 skipped, 2 failed**.
The only two failures are the pre-existing WebKit PDF Merger tests (download filename normalisation
and page-picker contrast); `main` at `2ed5bdc` fails the same two tests in run `41412528307`
(478 passed). No PDF Merger, Splitter, PDF to Word, Image Resizer, Compressor or Cropper file is
touched by this branch. Unit: 27 files / 418 tests; format, lint, typecheck and production build pass.

**Evidence.** `docs/verification/` holds CI-captured category listings (`category-image-tools.png`,
`category-pdf-tools.png`), the three converter modes (`converter-desktop.png`,
`converter-images-to-pdf.png`, `converter-pdf-to-image.png`), responsive captures at
375/390/430/768/1440 and real outputs in `examples/` (`image-to-image.jpg`, `images-to-pdf.pdf`,
`pdf-to-image.png`). The capture workflow commits its own output to the branch and is green.

**Still owner-gated.** Merge and deploy remain blocked on explicit owner approval; "PDF to Word"
remains awaiting approval and was not modified.

Addendum (same day, branch head `c73803e`, CI run `41436170818`): **505 passed, 5 skipped, 2 failed** —
the same two pre-existing WebKit PDF Merger failures, now with one added browser test covering the
Fit-to-panel default and zoom unlock. No application code changed after the evidence capture in
`docs/verification`.

Final addendum (branch head `2888180`): push run `41440266635` and PR run `41440274038` both report
**505 passed, 5 skipped, 2 failed**, and the two failures are again the pre-existing WebKit PDF Merger
tests (filename normalisation, page-picker contrast) that also fail on `main` at `2ed5bdc`
(run `41412528307`, 478 passed). Evidence refreshed from CI at this head: readable page labels in the
`examples/` PDF and page image, fit-to-panel preview captures, and one added browser test for the
fit/zoom behaviour. Merge and deploy remain blocked on explicit owner approval.

## Repository cleanup (2 November 2026)

Housekeeping only — no tool code, route, limit, catalogue entry or test was changed, and nothing
above this line was edited, re-scored or re-dated.

**Removed as finished-phase material** (content remains in Git history): `PHASE_9_CALCULATOR_PLAN.md`,
`PHASE_9_FEATURE_CHECKLIST.md`, `PHASE_9_V2_CHECKLIST.md` and `PERCENTAGE_CALCULATOR_QA.md`. Phase 9
shipped; these files still described the calculators as "Testing / In Progress" and duplicated what
this status file records. Their evidence folders under `docs/phase-9-*` are untouched.

**Removed the screenshot-trigger marker** (`.github/screenshot-trigger`) and its `push` path trigger in
`.github/workflows/screenshots.yml`. It existed only because `workflow_dispatch` is not registered
from a feature branch; with the workflow on the default branch it can be started manually, so the
marker is no longer needed and no longer commits evidence to `main` on unrelated pushes.

**Removed an unused direct dependency**: `html-entities` was declared in `package.json` but never
imported by application code (it remains present transitively through `node-html-better-parser`).

**Deliberately kept** and still authoritative: `TOOL_DEVELOPMENT_STATUS.md`,
`QUICKKIT_AGENT_BRAIN_FINAL.md` (the superseded `QUICKKIT_AGENT_BRAIN.md` is preserved as the README
promises), `TOOL_REGISTRY_ARCHITECTURE.md`, `PDF_MERGER_PLAN.md`, `MULTIPLE_TOOLS_ROADMAP.md`,
`RELEASE_CHECKLIST.md` with its `docs/RELEASE_CHECKLIST.md` pointer, all feature docs under `docs/`
and every screenshot under `docs/verification` and `docs/phase-*`.

## Site-wide brand update (3 November 2026, PR #13 — awaiting owner approval)

The plum/rose/coral brand palette (Deep Plum `#3B1B4F`, Rose Pink `#D6598F`,
Coral `#FF6B6B`, Midnight `#1A0F2E`, Soft Blush `#F4D7D4`) is implemented
centrally in `app/globals.css :root` on branch `arena/cdece415-quickkit`,
with legacy token names kept as aliases so all pages and tool workspaces
follow from one place. Homepage benefits were consolidated into the single
Why-QUICKKIT section (the old trust strip's inaccurate "100+ Tools" claim
and the duplicated privacy banner were removed), footer links deduplicated,
and heading/spacing scales tightened. Integrated with the Phase-5–9 tool
expansion from PR #12 by merging `main` in and sweeping the new tools'
violet accents onto the same tokens. No tool logic changed. Known remaining
items: binary favicons still carry the old violet (SVG favicon updated);
two pre-existing PDF Merger WebKit e2e failures in CI (also red on `main`)
await their own follow-up PR. Do not treat the brand update as live until
the owner approves and merges PR #13.

## PDF Splitter and PDF Compressor integration (PR #11, 3 November 2026)

PR #11 integrates the browser-local PDF Splitter and PDF Compressor from
`arena/fe1f419c-quickkit` with the current `main` catalog, shell and brand
system. PDF Merger and PDF Splitter were owner-approved on 1 November 2026.
PDF Compressor remains **implemented — awaiting owner approval**; merging the
integration PR does not by itself mark it live/complete, deployed or indexed.
Detailed evidence remains in `docs/pdf-splitter/QA_REPORT.md` and
`docs/pdf-compressor/QA_REPORT.md`. After this integration the catalog has 25
tools, including five PDF Tools entries when the dual-category Image & PDF
Converter is counted in that category. Any older PDF-specific count or row in
this historical tracker that omits these tools is superseded by this note and
the updated Sections 4–5 above.

## Image & PDF Studio upgrade — Phase 1 and Phase 2 (3 November 2026)

Work on branch `arena/162f8b83-quickkit`, continuing the existing
`/tools/image-converter` route, component and settings architecture. No route,
catalog record or tool entry was added or duplicated: the tool still appears
under both Image Tools and PDF Tools from the same `categories` array.

**Phase 1 — advanced conversion.** HEIC/HEIF is now recognised as an input
(read-only, only where the engine ships a codec) and refused with a message
that names a way forward instead of a generic decode error. Animated GIFs are
no longer guessed at: `inspectGif` walks the block stream and counts real
frames, so a GIF→GIF conversion with no pixel work copies the file
byte-for-byte and keeps every frame, delay and loop, while any other target
states the frame count and that only frame 1 is exported. Source metadata
(EXIF, GPS, XMP) and embedded ICC profiles are scanned and disclosed on the
result; output is always written clean, as sRGB.

**Phase 2 — smart compression engine.** New pure model in
`lib/tools/image-size.ts` plus a "File size" settings section. Two ways to
decide the output size: the existing fixed quality, or a target file size
(5 KB–50 MB) with the six requested presets (20 KB, 50 KB, 100 KB, 200 KB,
500 KB, 1 MB) and three styles — Maximum Quality (floor 72%, never shrinks
pixels), Balanced (floor 50%), Smallest File (floor 25%). The engine tries a
lossless encode first, then searches quality top-down in bounded binary steps
(4 probes per pass, 2 downscale passes, 8 encodes hard ceiling), reduces
pixels only when the style and the user both allow it, and reports what it
actually did: lossless vs lossy with the quality used, whether the target was
met, whether dimensions were reduced, and a warning whenever the target cost
real detail. A target that cannot be met is never silent — the output is the
closest achievable file and the message says so in words and numbers.
Estimates (bytes-per-pixel per format and content type) are shown before
converting so an impossible target is flagged before the user waits for it.

Honesty rules enforced in code: `visuallyLossless` excludes GIF because its
256-colour palette is a lossy quantisation, so no GIF result is ever labelled
lossless; the search never silently switches format (auto selection is opt-in,
preserves transparency, and is reported); originals are only read, never
written.

**Verification.** 539 unit tests pass (457 before this work): 60 in the new
`tests/image-size.test.ts` covering targets, presets, estimates, the search
and 15 orchestration cases driven by deterministic fake encoders; 5 new GIF
frame-walking cases in `tests/image-codec.test.ts`; 16 new component cases in
`tests/image-converter-panel.test.tsx` rendering the real settings panel in
jsdom. `tsc --noEmit`, ESLint, `format:check` and `npm run build` (51 routes)
are all clean. Seven Playwright cases were added to
`tests/e2e/image-converter.spec.ts` (25 in that file) — they are listed and
type-checked here but **not executed in this workspace**, which has no browser
and cannot reach the Playwright CDN; they must be run in CI before this is
called browser-verified.

Checklist, known limitations and per-phase status:
`docs/image-pdf-studio-checklist.md`. Phases 3–8 are not started; nothing here
has been pushed, merged or deployed.

## Image & PDF Studio upgrade — Phases 3 to 8 (3 November 2026)

Continuation of the same branch, same route (`/tools/image-converter`), same
component and catalog entry. No new route, no duplicate tool record: the tool
still appears under both Image Tools and PDF Tools through its existing
`categories` array, and Image Resizer / Image Compressor / Image Cropper /
PDF Merger / Splitter / Compressor were not modified.

**Phase 3 — resize and editing.** Preset dimension chips, resolution control
(72/96/150/200/300 plus custom), live print size in inches, centimetres and
millimetres, and three placement modes for an exact box (stretch, contain,
cover) implemented in the pure `placeForFit`. Crop by ratio or percentage
(stored as fractions so one setting works across a batch), rotate in 90°
steps, flip both axes, and straighten within ±45°. Edits are applied in a
fixed order before any resize, every intermediate canvas is released, and any
pixel edit disables the animated-GIF byte-copy so that promise stays true.
Upscaling now warns that interpolation cannot restore detail that was never
captured. DPI is only claimed where it is real: stored for BMP/GIF/TIFF,
print-calculation-only for JPG/PNG/WebP/AVIF, and the UI says which.

**Phase 4 — PDF studio.** A5 joins the paper sizes and images placed into a
PDF now honour an embedded-resolution setting. Images → PDF page order is
drag-and-drop, with arrows kept for keyboard and touch. A fourth mode, PDF
Studio, rebuilds documents from an explicit page plan: merge, extract, split
by ranges, and compress through the shared `PDF_COMPRESSION_PRESETS` and
`compressPdfBytes` engine, with per-page rotate, remove and reorder, bulk
keep/remove-the-range, and a plan summary that blocks a run which cannot work
and explains why. Sources are only read; encrypted PDFs are refused with the
existing specific message.

**Phase 5 — preview.** A third preview tab stacks the original and the real
converted file with a `clip-path` divider driven by a 0–100 slider, plus
Original/Converted tags. Full-screen preview uses the Fullscreen API and its
button state follows `fullscreenchange`, so Escape cannot leave the UI lying.

**Phase 6 — batch.** Pause and resume during an image batch (checked between
files, never mid-encode; cancelling a paused batch releases it), and a batch
report listing every file with status, format and byte change plus totals.
Failed rows carry their real error text, so nothing is silently skipped.

**Phase 7 — UI.** All ten settings blocks became native disclosures
(`details`/`summary`): open by default, one tap or Enter to collapse,
focusable with a visible ring, controls stay mounted when closed. Existing
QUICKKIT typography, spacing, colours and headings unchanged.

**Verification.** 637 unit tests pass (457 before this work): 60 for the
compression engine including 15 orchestration cases that drive the real
`runSizeSearch` with deterministic fake encoders, 32 for the PDF studio plan
model, 46 component cases rendering the actual settings panel in jsdom.
`tsc --noEmit`, ESLint, `format:check` and `npm run build` (51 routes) are
clean. 44 Playwright cases are listed and type-checked in
`tests/e2e/image-converter.spec.ts`, including byte-level assertions on
downloaded files (exact pixel sizes, contain vs cover, rotated page angles,
split ZIP contents, target-size ceilings). **Those browser cases have not been
executed here**: this workspace has no browser and cannot reach the Playwright
CDN, so CI must run them before this is called browser-verified. Screenshots
likewise await a CI `workflow_dispatch` run.

Checklist, per-phase test map and known limitations:
`docs/image-pdf-studio-checklist.md`. Nothing has been pushed, merged or
deployed; all work is local on `arena/162f8b83-quickkit` pending owner review.

## Converter split — Step 3, Image to Image Converter (3 November 2026)

Owner-approved architecture decision: the four modes of the combined Image &
PDF Converter become four independent tools. `/tools/image-converter` will
301-redirect to Image to Image once all four are verified; the stored
`quickkit:saved-tools` slug `image-converter` migrates to `image-to-image` on
read; PDF Merger, PDF Splitter and PDF Compressor stay as separate cards and
PDF Studio reuses their proven engines.

**Extraction, not a rewrite.** The combined component was copied and the other
three modes were surgically removed, so every verified behaviour of the image
pipeline (GIF byte-copy passthrough, HEIC read-only handling, metadata notes,
the `runSizeSearch` size engine, pause/resume/cancel, retry, ZIP, batch report)
is carried across unchanged rather than re-implemented. Shared primitives —
`ImagePreview`, `PdfGallery`, `PageNav`, `ExportedPageNav`, `PdfLayoutPreview`,
queue/result types and the batch-report helpers — moved to
`components/tools/convert-shared/` so the remaining three tools reuse them
instead of duplicating them.

**New files.** `components/tools/image-to-image.tsx`,
`components/tools/image-to-image/settings.tsx` (the six image settings blocks
only), `components/tools/convert-shared/{preview,types,report}.ts`,
`app/tools/image-to-image/page.tsx`, `tests/image-to-image-settings.test.tsx`
(36 cases), `tests/e2e/image-to-image.spec.ts` (29 cases),
`docs/image-to-image-checklist.md`.

**Deliberate removals.** The mode switcher, Images to PDF ordering and layout
preview, PDF to image ranges and thumbnails, and the PDF Studio page grid are
absent — asserted by the e2e "single-purpose" case rather than assumed. A PDF
dropped here is rejected with a message naming the PDF to Image Converter.

**Verification.** 673 unit tests pass across 35 files (637 before this step;
+36). `tsc --noEmit` clean with the incremental cache cleared, `eslint .` 0
problems, `format:check` clean, `npm run build` succeeds with
`/tools/image-to-image` prerendered static. Against the running build on port
3001 the route returns 200 with its own workspace, settings blocks and FAQ,
zero bleed-through of the other tools' markup, and it is reachable from
`/category/image-tools`, `/tools`, global search and the breadcrumb. The 29
Playwright cases parse and type-check (`--list` reports 29) but **were not
executed**: no browser binary exists in this workspace and the Playwright CDN
is unreachable, so CI must run them. `/tools/image-converter` remains live and
untouched, per the safety rule that old functionality is not removed before its
replacement is verified.

Nothing has been pushed, merged or deployed; all work is local on
`arena/162f8b83-quickkit` pending owner review.

---

## Step 5 — Images to PDF Converter extracted (2026-11-03)

**Status: code complete and locally green. E2E cases written but not executed.**

`images-to-pdf` is now its own tool at `/tools/images-to-pdf`, filed under
**PDF Tools**. The combined `image-converter` workspace is still live and
untouched, per the rule that old functionality is not removed before its
replacement is verified.

**New files.** `components/tools/images-to-pdf.tsx`,
`components/tools/images-to-pdf/settings.tsx` (page setup, placement and
document blocks only), `app/tools/images-to-pdf/page.tsx` (6 steps, 8 FAQs,
JSON-LD), `tests/images-to-pdf-settings.test.tsx` (20 cases),
`tests/e2e/images-to-pdf.spec.ts` (25 cases),
`tests/image-convert-runner.test.ts` (6 cases),
`docs/images-to-pdf-checklist.md`.

**Page rotation was missing and is now implemented.** The brief lists page
rotation, but `PdfFromImagesOptions` carried only `{ signal, onPage }`,
`PdfMakeSettings` had no rotation field, and `grep rotate` over the new
component returned nothing. Added an optional per-page `rotations` array to the
engine, a `rotateCanvasBy` quarter-turn helper, `normalizeRotation` (snaps any
angle, wraps 360 to 0, treats junk as 0), a per-row rotate button that shows
the current angle, and rotation in the layout preview so the preview cannot
disagree with the written PDF. The parameter is optional, so the still-live
combined tool is unaffected.

**Deliberate removals.** Pause/resume (no callers), both ZIP buttons (guarded
by `results.length > 1`, impossible with a single PDF out), the batch report
table (never populated by this pipeline), per-file output override and per-file
download (there is no per-file output), the PDF Studio grid, the mode switcher,
and the before/after slider tab — a slider between an image and a PDF page
compares unlike things. Tabs are now **Original / PDF**. Each was deleted
rather than disabled.

**Verification actually run here.** `format:check` clean; `eslint .` 0
problems; `tsc --noEmit` 0 errors; `npx vitest run` **699 passed / 37 files**
(673 before, +26); `npm run build` succeeds with `○ /tools/images-to-pdf`
prerendered static. `playwright test --list` reports **25 tests** for the new
spec and **648 across 26 files** overall. Against the rebuilt server on port
3001, all routes return 200 (`/`, both new tools, `image-converter`,
`merge-pdf`, `split-pdf`, `compress-pdf`, `pdf-to-word`, both category pages,
`/saved`, `/sitemap.xml`), the new page carries its own workspace and settings
markers, and there is zero bleed-through of `PDF to image`, `Image to image`,
`Merge PDF`, `Split PDF` or `Extract pages`.

**Output verification.** UI assertions cannot prove a PDF is right, and this
pdf-lib fork has no `page.getImages()`, so the spec reads the saved bytes: the
image XObject dictionary for real raster dimensions, `stream.contents` for the
actual JPEG, and `inflateSync` over the content stream for the background fill
colour. Those three helpers were executed against a real pdf-lib PDF built the
way the engine builds one and all assertions passed. Three findings changed the
tests: content streams are Flate-compressed (so byte-scanning only works for
uncompressed objects); `planPdfEmbedSize` never upscales, so a DPI test needs a
source larger than the 96 DPI target or it passes vacuously; and `formatBytes`
renders `"123.4 KB"`, not an invented `"123 kB"`.

**Deliberate test-count changes.** `tests/launch.test.ts` sitemap 44 → 45;
`tests/catalog.test.ts` PDF Tools 5 → 6, the exact slug list gains
`images-to-pdf`, and `relatedTools(image-converter)` now returns
`image-compressor, images-to-pdf, image-resizer`. All five failures this
introduced were the new tool's own doing; none were regressions.

**Outstanding.** The 25 e2e cases have **not executed** —
`npx playwright install chromium` fails because `cdn.playwright.dev` is outside
the sandbox network allowlist and no system browser is on `PATH`, so CI must
run them. Mobile screenshots remain gated behind `CAPTURE_SHOTS`. The 301
redirect of `/tools/image-converter` and removal of the combined UI stay in
Step 8.

Nothing has been pushed, merged or deployed; all work is local on
`arena/162f8b83-quickkit` pending owner review.

---

## Step 6 — PDF to Image Converter extracted (2026-11-03)

Third of the four tools in the combined-converter split. PDF to Image Converter
now exists as its own tool at `/tools/pdf-to-image` (catalogue slug
`pdf-to-image`, category **PDF Tools**, icon `pdfToImage`, colour `blue`,
phase 3, inserted after `images-to-pdf`). Full QA record:
`docs/pdf-to-image-checklist.md`.

### What was built

- `components/tools/pdf-to-image.tsx` — extracted from the combined monolith by
  copying `image-converter.tsx` and trimming the three pipelines that do not
  belong here. The shared engines were **not** re-implemented: the tool calls the
  same `pdfToImages` runner, the same `parsePageRange` / `buildPdfPageName`
  helpers and the same `CONVERT_LIMITS`.
- `components/tools/pdf-to-image/settings.tsx` — `PdfToImageSettings`, props
  `{ settings, onChange, support, disabled, pageCount }`.
- `app/tools/pdf-to-image/page.tsx` — metadata, JSON-LD, 6-step walkthrough,
  8 FAQs, `ToolShell slug="pdf-to-image"`.
- `tests/pdf-to-image-settings.test.tsx` — 20 unit cases.
- `tests/e2e/pdf-to-image.spec.ts` — 18 Playwright cases.

Deliberately removed from this route, so nothing advertises a control that does
not work: the mode switcher, the other three pipelines and their dispatch, the
PDF Studio grid and drag handling, the batch report table, pause/resume, the
before/after compare slider, drag-to-reorder, per-file output override and
per-file download. A single PDF is the whole input, so queue reordering and
per-file formats have no meaning here.

### Verified results (commands actually run)

| Check                        | Result                                          |
| ---------------------------- | ----------------------------------------------- |
| `npm run format:check`       | clean                                           |
| `npx eslint .`               | clean, exit 0                                   |
| `npx tsc --noEmit`           | 0 diagnostics                                   |
| `npx vitest run`             | **719 passed / 38 files** (was 699/37)          |
| `npm run build`              | clean; `/tools/pdf-to-image` prerendered static |
| `npx playwright test --list` | **666 tests / 27 files** (was 648/26)           |
| Route sweep vs fresh build   | **40/40 → 200**                                 |

Catalogue tests updated for the new record: `tests/catalog.test.ts` (both PDF
Tools slug lists gain `pdf-to-image`, `toolsByCategory("PDF Tools")` 6→7, the
`filterTools("pdf to image", …)` assertion now expects two matches) and
`tests/launch.test.ts` (sitemap 45→46). Both files pass at 27/27.

Two things worth recording because they looked like failures and were not:

- A first route sweep reported 15 routes returning 404. Those were routes I had
  guessed (`/tools/base64`, `/category/qr-tools`, …) that do not exist. Re-deriving
  the sweep from `lib/catalog.ts` itself gave 40/40 with zero failures.
- `/sitemap.xml` returns an empty `<urlset>` on the local preview. That is correct:
  `app/sitemap.ts` returns `[]` unless `indexingEnabled && siteOrigin`, and the
  preview sets neither. The 46-entry assertion is verified in the unit test with
  `SITE_URL` and `LAUNCH_APPROVED=true` stubbed.

Catalogue composition, read by importing the real module:

```
TOTAL_TOOLS=28      CATEGORIES=8
COUNTS={"Text & Writing":2,"Developer Tools":1,"Security & Privacy":1,
        "QR & Barcode":1,"Image Tools":5,"PDF Tools":6,"Calculators":12}
PDF_SLUGS=["image-converter","images-to-pdf","pdf-to-image","merge-pdf",
           "split-pdf","compress-pdf","pdf-to-word"]
```

`COUNTS` sums to 28 raw records while `toolsByCategory("PDF Tools")` returns 7,
because `image-converter` carries `categories: ["Image Tools","PDF Tools"]` and is
dual-listed while remaining one record with one route. That is why PDF Tools is
legitimately 7 and the sitemap is legitimately 46 (10 static + 8 category + 28
tool). No duplicate tool record was introduced.

### Output verification design

The e2e suite asserts real output bytes, not UI text: PNG magic bytes; exact pixel
dimensions per DPI (A4 → `794 × 1123` at 96 DPI, `1240 × 1754` at 150 DPI, from
`dpiToPixels` with `Math.round`); 150 DPI compared against 96 DPI from the same
document so an inert preset fails; a `2-3` range yielding exactly
`-page-002`/`-page-003`; the exact filename `brochure-print-page-001.jpg`; the
decoded corner pixel matching `#123456` component-wise (the fixture leaves its
corners empty so the corner is pure background); and the ZIP read back through
`fflate`'s `unzipSync` with every entry name asserted. Rejection cases cover an
image file, a text file and a zero-byte file.

The 18 Playwright cases are written and confirmed listed, but **not executed** —
no browser can be installed in this sandbox (`npx playwright install chromium`
fails with `ECONNRESET` against `cdn.playwright.dev`), so browser verification is
CI-only. Mobile screenshots remain gated behind `CAPTURE_SHOTS`.

### Still open

Step 7 extracts PDF Studio from `components/settings-panel.tsx` (L1213–1338) and
the monolith's studio grid. Step 8 retires `/tools/image-converter` behind a 301
to `/tools/image-to-image`, removes the combined UI and its catalogue record, and
migrates the stored favourite slug on load. Step 8 will also move the expected
counts again: Image Tools 5→4, PDF Tools 7→7 (the dual-listed converter leaves
both, `pdf-studio` joins PDF Tools), sitemap 46→47.

Nothing has been pushed, merged or deployed; all work is local on
`arena/162f8b83-quickkit` pending owner review.

---

## Step 7 — PDF Studio extracted (2026-11-03)

Fourth and last of the four tools in the combined-converter split. PDF Studio now
exists as its own tool at `/tools/pdf-studio` (catalogue slug `pdf-studio`,
category **PDF Tools**, icon `pdfStudio`, colour `purple`, phase 3, inserted after
`pdf-to-image`). Committed as `0641245`. Full QA record:
`docs/pdf-studio-checklist.md`.

It is the only one of the four that works at page level across **several** PDFs:
merge, extract, split and compress, plus per-page rotate, reorder and remove.

### Engines reused, not re-implemented

Per the owner's decision, PDF Studio is additive to the standalone Merger,
Splitter and Compressor rather than a replacement, and calls the same code they
call:

- `runPdfStudio` from `lib/tools/image-convert-runner.ts`
- the plan helpers from `lib/tools/pdf-studio.ts` — `buildPageList`, `rotatePage`,
  `movePage`, `dropPage`, `toggleRemoved`, `setRemoved`, `keepOnlyRanges`,
  `dropRanges`, `splitGroups`, `keptPages`, `summarisePlan`, `describePlan`,
  `planProblem`, `studioOutputName`
- `PDF_COMPRESSION_PRESETS` from `lib/tools/pdf/compress-pdf-logic.ts`

A fix to any of those reaches all four tools.

### What was built

- `components/tools/pdf-studio.tsx` — extracted from the monolith by copying
  `image-converter.tsx` and trimming the three pipelines that do not belong here.
- `components/tools/pdf-studio/settings.tsx` — `PdfStudioSettings`, props
  `{ settings, onChange, disabled, studioSummary, studioProblem }`.
- `app/tools/pdf-studio/page.tsx` — metadata, JSON-LD, 6-step walkthrough, 8 FAQs.
- `lib/catalog.ts` record.
- `tests/pdf-studio-settings.test.tsx` — 14 unit cases.

Deliberately removed from this route, so nothing advertises a control that does
not work: the mode switcher, the image / images-to-pdf / pdf-to-image pipelines
and their dispatch, the before/after compare slider, the per-file output override
and per-file download, pause/resume, the batch report table, and the now-dead
`isPdfMode` / `pdfItem` / `parsedRange` branches. The dropzone is PDF-only with
multi-select, since the studio works across several documents.

Extraction notes worth keeping: two automated cutters ate adjacent declarations as
collateral (`studioSources`; then `abortRef`, `filesInputRef`, `commitItems`) and
one left `PageNav`'s body orphaned after removing its header. Each was restored by
re-extracting the block from the monolith with brace matching, not by reassembly
from line slices.

### Verified results (commands actually run)

| Check                                               | Result                                        |
| --------------------------------------------------- | --------------------------------------------- |
| `npm run format:check`                              | clean                                         |
| `npx eslint .`                                      | clean, exit 0                                 |
| `npx tsc --noEmit`                                  | 0 diagnostics                                 |
| `npx vitest run`                                    | **733 passed / 39 files** (was 719/38)        |
| `npx vitest run tests/pdf-studio-settings.test.tsx` | 14/14                                         |
| `npm run build`                                     | clean; `/tools/pdf-studio` prerendered static |
| Route sweep vs fresh build                          | **39/39 → 200**                               |
| `npx playwright test --list`                        | 666 / 27 — **unchanged, no studio spec yet**  |

Catalogue counts were probed by importing the real module rather than assumed:

```
PDF_EMPTY   = ["image-converter","images-to-pdf","pdf-to-image","pdf-studio",
               "merge-pdf","split-pdf","compress-pdf","pdf-to-word"]
PDF_EXTRACT = ["split-pdf"]     (unchanged by the new record)
PDF_COUNT   = 8
```

`tests/catalog.test.ts` and `tests/launch.test.ts` were updated from those values
(both empty-filter PDF slug lists gain `pdf-studio`; PDF Tools 7→8; sitemap
46→47 = 10 static + 8 category + 29 tool). All 4 previously failing assertions
now pass.

### Open gap — no e2e coverage for this tool

`tests/e2e/pdf-studio.spec.ts` does **not** exist, and the unchanged Playwright
manifest (666/27, identical to the post-Step-6 count) is the evidence of that.

This gap matters more here than for the other three tools, because PDF Studio is
the only one whose output is a **rebuilt PDF** rather than an image or a straight
byte copy. The assertions still missing are the ones that would prove the engine
did the work: merged page count equals the sum of the sources; extracting `2-3`
yields exactly those pages; splitting `1-2, 5` yields two correctly named files; a
rotated page really carries `/Rotate 90` in the written PDF; a reordered document
really writes pages in the new order; a removed page really is absent; a
compressed document really is smaller than its source; and non-PDF, empty and
corrupt inputs are each rejected.

Until those run in CI, merge / split / extract / compress is verified only at the
plan level (`summarisePlan`, `planProblem`, `describePlan` — all unit-tested) and
at the UI level, **not against output bytes**. The shared engines are already
exercised by the shipped Merger, Splitter and Compressor, which reduces but does
not remove the risk. Also still open: the screenshot set and axe at 375 / 768 /
1440 for this route.

Mobile screenshots remain gated behind `CAPTURE_SHOTS`, and no browser can be
installed in this sandbox, so all browser verification is CI-only.

### Still open

Step 8 retires `/tools/image-converter` behind a 301 to `/tools/image-to-image`,
removes the combined UI and its catalogue record, and migrates the stored
favourite slug on load. Step 8 will move the counts again: Image Tools 5→4,
PDF Tools 8→7 (the dual-listed converter leaves both categories), sitemap 47→46.

Nothing has been pushed, merged or deployed; all work is local on
`arena/162f8b83-quickkit` pending owner review.

---

## Step 8 — combined converter retired (2026-11-03)

Final step of the split. `/tools/image-converter` is now a permanent redirect to
`/tools/image-to-image`, and the combined four-mode UI, its page, its settings
panel and its catalogue record are removed. All four replacements were verified
before anything was deleted.

### Removed

- `components/tools/image-converter.tsx`
- `components/tools/image-converter/` (settings-panel.tsx, types.ts)
- `app/tools/image-converter/page.tsx`
- the `image-converter` catalogue record (29 → 28 records)
- `tests/e2e/image-converter.spec.ts` (44 cases) and
  `tests/image-converter-panel.test.tsx`

`components/tools/pdf-studio.tsx` was the one remaining importer of
`image-converter/types`; it was repointed to `components/tools/convert-shared/types`,
which already exported every symbol it used. Verified by `tsc` before deleting.

### Coverage preserved, not dropped

The deleted spec contained a "PDF Studio" block that was the **only** e2e coverage
of studio behaviour — the gap recorded in Step 7. Its 9 cases were ported to
`tests/e2e/pdf-studio.spec.ts`, retargeted to the new route and input, and they
assert real output bytes: merged page count, reorder, removed pages, `/Rotate 90`,
extract, split into a ZIP, compress, an unrunnable plan, and an encrypted PDF.
The encrypted-PDF fixture was recovered from git history rather than rewritten.

### The redirect is 308, not 301

The owner's decision was recorded as "301". Next.js `redirects()` with
`permanent: true` emits **308 Permanent Redirect**, verified live:

```
GET /tools/image-converter -> 308, location /tools/image-to-image
following it -> 200 at /tools/image-to-image
```

308 is the modern equivalent of 301: both are permanent, and 308 additionally
preserves the request method. Bookmarks, saved cards and inbound links resolve
correctly. A literal 301 would require middleware instead of the config redirect.

### Counts after the split

Probed by importing the real catalogue, not assumed:

```
TOTAL=28   Image Tools=4   PDF Tools=7   dual-category tools=[]
IMG=["image-compressor","image-resizer","image-cropper","image-to-image"]
PDF=["images-to-pdf","pdf-to-image","pdf-studio","merge-pdf","split-pdf",
     "compress-pdf","pdf-to-word"]
```

Sitemap is 46 (10 static + 8 category + 28 tool). `image-converter` is no longer
a catalogue slug, so the favourites migration in `lib/use-favorites.ts` is now the
only thing that resolves it — and its test was inverted to assert the old slug is
absent.

### Verified

| Check                        | Result                                            |
| ---------------------------- | ------------------------------------------------- |
| `npm run format:check`       | clean                                             |
| `npx eslint .`               | clean                                             |
| `npx tsc --noEmit`           | 0 diagnostics                                     |
| `npx vitest run`             | **694 passed / 39 files**                         |
| `npm run build`              | clean; `/tools/image-converter` no longer a route |
| `npx playwright test --list` | **661 tests / 27 files**                          |
| Live route sweep             | **41/41 → 200**                                   |
| Live redirect                | 308 → 200 at `/tools/image-to-image`              |

Playwright moved 666 → 661: −44 for the deleted combined spec, +9 for the ported
studio spec, +30 because `tests/e2e/quality.spec.ts` generates 10 tests per route
and its route list gained 3 net entries.

Nothing has been pushed, merged or deployed; all work is local on
`arena/162f8b83-quickkit` pending owner review.

## Step 8 addendum — post-retirement fixes (2026-11-03, not pushed)

Two follow-ups landed after the Step 8 record above was written. The Step 8
counts there (`vitest 694 passed / 39`) were accurate at the time and are left
as written; the figures below supersede them.

### 1. Search reachability regression (commit `5a66e62`)

`filterTools` matches a single contiguous substring against
`"name description keywords"`. The combined converter's description began
"Convert JPG, PNG, WEBP, AVIF, GIF, BMP and TIFF", so `convert jpg` was
contiguous and resolved. The extracted `image-to-image` record was written as
"Convert **between** JPG, …", breaking that phrase so the query returned
nothing. Dropping "between" restores it.

Measured against the base commit rather than assumed. The retired record
matched `convert jpg` (True) and none of `convert png`, `convert webp`,
`convert avif`, `convert gif`, `convert bmp`, `convert tiff` — the current
record behaves identically for those six. They are pre-existing traits of the
substring matcher, not split damage, and were deliberately left alone.

### 2. Cross-tool regression suite (commit `6ea2083`)

The brief required a passing cross-tool regression suite. Per-tool tests and
`quality.spec.ts`'s route sweep existed, but nothing asserted the four tools
behave as one coherent catalogue. `tests/split-regression.test.tsx` (12 cases)
spans several modules deliberately: unique records, no duplicates, one category
each with nothing dual-listed, no retired-slug trace in any category listing,
counts agreeing across every view (28 records, Image Tools 4, PDF Tools 7,
per-category counts summing to the total), search reaching all four plus the
terms the combined tool used to own, related-tools integrity, sitemap contents,
and favourites surviving the rename including de-duplication.

**One false pass was found and fixed while writing it.** The sitemap assertion
was guarded by `if (routes.length)`; `sitemap()` returns 0 entries unless
indexing is approved, so the body never ran and the test passed without testing
anything. It now stubs `SITE_URL` and `LAUNCH_APPROVED` the way `launch.test.ts`
does and asserts the 46 routes directly, so it fails if the stub stops taking
effect.

### Gate after both changes

- `npm run format:check` → clean
- `npx eslint .` → clean, 0 problems
- `npx tsc --noEmit` → **0 diagnostics**
- `npx vitest run` → **706 passed / 40 files** (was 694 / 39 before the new suite)
- `npm run build` → clean; preview restarted on the fresh build and verified to
  serve the corrected description (the old build predating the `lib/catalog.ts`
  edit was still being served and was rebuilt)
- Route sweep: 4 static + 28 tool routes = **32/32 → 200**; the redirect stays
  **308**

## Phase 7 — premium upgrade (2026-11-04, in progress, not pushed)

Branch `arena/162f8b83-quickkit`. Three commits on top of `dba91d9`.

### Recovered from a second workspace re-clone

The sandbox was re-cloned from `origin/main` (`012f03c` -> `dba91d9`), which
destroyed the six Phase 6 commits (`c214a5c`, `8498cc3`, `4c11cf2`, `5a66e62`,
`6ea2083`, `4375167`) while leaving the working tree intact. All six are absent
from the object store and the remote branch does not exist, so they are
unrecoverable; `node_modules` was wiped by the same event. Recovered as
`6112512` after `npm ci` and a full gate: format clean, eslint 0, tsc 0,
vitest 706/40 — matching the pre-clone state exactly.

### Audit of the four tools (before any change)

The brief describes the current interfaces as "still basic". The functional
surface is not: verified in source, Image to Image already had 7 formats,
batch, the iterative target-size engine with _measured_ degradation
(`degradationLevel`/`degradationWarning`), `losslessFirst`/`autoFormat`/
`allowDownscale`, exact resize with aspect lock, before/after preview, the
file-size report, alpha keep/flatten, EXIF removal, rotation/flip, ZIP and
individual download, a **pre-flight** `assessTarget` feasibility assessment
(`settings.tsx:509`), and post-conversion warnings wired into `report.warning`
-> `preview.tsx:225`.

Two genuine functional gaps were found, both now closed.

### Phase A: Image to Image Converter

- `8f26f40` **Output name templates.** `{name}`, `{index}`, `{date}`, `{ext}`,
  expanded by `expandNameTemplate()` through the existing `sanitizeFragment`
  so a template cannot inject a path separator. Empty template reproduces the
  historical naming exactly. `{index}` is threaded from the component's batch
  loop to all three `buildOutputName` call sites so it is the real 1-based
  position, not always 1. Live preview of the first output name in the panel.
- `eabc8e0` **Device-local conversion history.** IndexedDB, opt-in, ArrayBuffer
  storage for Safari compatibility, "session"/24h/7d retention, 20-item and
  10 MB caps. Records real dimensions, format, quality and the engine's
  quality warning. Download, per-row remove, clear-all all functional.

### Three false passes caught while writing these tests

1. The sitemap assertion was guarded by `if (routes.length)`; `sitemap()`
   returns 0 entries unless indexing is approved, so the body never ran. Now
   stubs the environment and asserts 46 routes.
2. `vi.spyOn` on a temporary object literal cannot affect a module constant —
   the size-cap test passed only because IndexedDB is absent in jsdom. The
   rules are now a pure predicate, `skipReason()`, tested directly.
3. `sanitizeFragment` strips a trailing extension, which destroyed the `{ext}`
   token the template had just produced. Real bug, fixed.

Also corrected: two of my own test expectations (`../../etc/passwd` sanitises
to `etcpasswd` because `sanitizeFragment` deletes `/`; `toLocaleString` yields
`1,600 × 1,200`, not `1600 × 1200`). In both cases the code was right.

### Gate after Phase A

format:check clean · eslint 0 · tsc 0 · **vitest 732/41** · production build
clean. Live preview confirms the name-template field, retention select and
session copy render; four routes 200; redirect 308.

### NOT DONE — remaining Phase 7 scope

- **The premium UI redesign (§2) has not been started.** This is the
  centerpiece of the brief and none of it exists yet. The two items above are
  functional gaps, not the redesign.
- Phases B, C and D (Images to PDF, PDF to Image, PDF Studio) untouched.
- Phase E shared consistency and regression not run.
- No desktop/mobile screenshots: Playwright cannot execute in this sandbox
  (no browser binary; `npx playwright install chromium` fails with
  `ECONNRESET`). 661 cases collect but do not run. Responsive and axe claims
  remain CI-only.

No merge, deploy or push has been performed.

## Phase 7 Phases B–E (2026-11-04, not pushed)

Phases B, C and D each began with an audit of the brief's feature list against
the tool, because several items described as missing turned out to exist. Four
audit false negatives were caught this way and are recorded so they are not
re-reported:

- Images to PDF: 15 of 16 §4 items already present; only duplicate page was
  missing.
- PDF to Image: "custom rendering resolution" is present (72–300 DPI range
  slider at step 6 plus preset chips). An initial grep for customDpi /
  dpiValue identifiers reported it absent.
- PDF Studio: the "duplicate" grep hit was an unrelated "de-duplicated"
  comment, and the "metadata" hit was a hint string for the document title
  only — so duplicate was genuinely absent while metadata is partial.
- All four tools already render feature intro, walkthrough steps and FAQs,
  but from app/tools/*/page.tsx through ToolShell, not from the tool
  component. Grepping the component alone reports them missing.

### Committed

- `3f04fae` **Phase B** — duplicate page for Images to PDF. The copy gets its
  own object URL because removeItem revokes whichever URL it is handed; two
  rows sharing one would lose their preview when either was removed.
- `0c0e513` **Phase C** — pre-render output size estimate for PDF to Image,
  reusing the existing bytes-per-pixel model. Page size is captured in the same
  document load that already counted pages.
- `faa5ea6` **Phase D** — duplicate page for PDF Studio, as pure plan logic so
  it is testable without a browser.

### Three of my own test expectations were wrong, not the code

1. `sanitizeFragment` deletes `/` rather than replacing it, so
   `../../etc/passwd` becomes `etcpasswd`, not `etc-passwd`.
2. `toLocaleString` renders `1,600 × 1,200`, not `1600 × 1200`.
3. For the `document` kind the size model puts **JPEG above PNG** (~0.30 vs
   0.17 bytes/px at quality 80), because PDF pages are text and line art that
   deflate compresses better than DCT. I had asserted the usual "lossy is
   smaller" intuition.

A fourth was a wrong test setup: `setRemoved` takes an array of ids, and
passing a string made `new Set("page-0-1-1")` a set of characters that matched
nothing. Vitest transpiles without typechecking so it passed silently; `tsc`
catches it.

### Gate after Phase D

format:check clean · eslint 0 · tsc 0 · **vitest 746/41** · production build
clean · **playwright --list 666 tests / 27 files** (was 661 at Phase 6 close).
Live preview: four routes 200, redirect 308, each new control confirmed present
in the shipped bundle.

### NOT DONE

- **The premium UI redesign (§2) has still not been started.** Phases A–D
  closed functional gaps; none of them is the redesign.
- PDF Studio: add page numbers, text watermarks, full metadata editing, and
  password protection/unlocking are unimplemented and disclosed as such rather
  than stubbed.
- PDF to Image: DPI ceiling stays at 300 against the brief's 600, because
  raising it changes rendering behaviour and interacts with the 36-megapixel
  page cap.
- No desktop/mobile screenshots: Playwright cannot execute in this sandbox (no
  browser binary; `npx playwright install chromium` fails with `ECONNRESET`).
  The 666 cases collect but do not run, so responsive and axe claims remain
  CI-only.

No merge, deploy or push has been performed.

## Phase 7 §7 audit — advanced workspace behaviour (2026-11-04)

Audited the brief's §7 checklist across all four tools. No gaps found, so no
code changed in this pass.

All ten behaviours are present in every tool: file validation, accurate
file-size reporting, progress indicators, cancel, retry, individual error
messages, clear/reset, mobile file selection, and empty/loading/error/success
states.

Cancellation was checked rather than assumed, because the raw grep counts
looked uneven (image-to-image and pdf-studio mention it ~30 and ~25 times
against 3 for the other two). The counts are vocabulary, not capability: all
four hold an `AbortController` in `abortRef`, and each has exactly one
`abort()` call plus a cancel control. Two of the four simply name the concept
less often.

Two apparent inconsistencies from the §2 consistency audit were also checked
and are deliberate, not defects:

- Images to PDF has no `converter-estimate` because it reports real sizes
  read from the PDF it wrote, and says so at images-to-pdf.tsx:1084.
- PDF Studio does not use the shared `converter-settings` /
  `converter-summary` classes; it uses its own richer set
  (`converter-files`, `converter-detail-grid`, `converter-edit-button`).

Note on method: two earlier greps in this phase produced false negatives by
searching only a tool's main component and missing its `settings.tsx`. The
audits above were re-run across both files.

## Phase 7 §6 continuation — page numbers and metadata (2026-11-04)

Two PDF Studio items the previous entry listed as unimplemented were built
afterwards. The earlier entry is left as written; this supersedes it.

- `3481ccd` **Add page numbers.** Stamped in `buildDocument` after every page
  is placed, so the total is known and numbering is sequential in the written
  document regardless of the source page numbers — which matters because the
  studio reorders and drops pages. Uses pdf-lib's built-in Helvetica, so no
  font file is fetched or bundled. Six positions, four layouts, 6–36 pt, with a
  fixed 24 pt margin. `pageNumberLabel` and `pageNumberPlacement` are pure so
  they are testable without a browser. No new CSS: the control group reuses the
  existing `.converter-presets` and `.converter-check` classes.
- `ccb5582` **Metadata editing.** Author, subject and keywords added alongside
  the existing title. The setters were verified against the installed
  `@cantoo/pdf-lib` at runtime rather than assumed. Empty fields are skipped so
  an unfilled form does not overwrite anything the source carried.

One real defect was found and fixed rather than papered over:
`pageNumberLabel` left unknown tokens in place, so a custom format would have
stamped a literal `{bogus}` onto every page. Unknown braces are now dropped,
matching `expandNameTemplate`.

Also corrected: `docs/pdf-studio-checklist.md` still described both items as
not implemented. That text was written before the work landed, so it was
rewritten in place with the superseded wording preserved rather than silently
deleted.

### Gate

format:check clean · eslint 0 · tsc 0 · **vitest 756/41** · production build
clean · playwright --list 666 tests / 27 files. Live preview: four routes 200,
redirect 308, and all six new controls (page numbers ×3, metadata ×3) confirmed
present in the shipped pdf-studio bundle.

### Still not done

- **Text watermarks** (brief §6) remain unimplemented and are disclosed as such.
- **Password protection / unlocking** remains unsupported and refused with an
  explicit message; the brief scopes it to "only where supported and
  authorized".
- PDF to Image DPI ceiling stays at 300 against the brief's 600.
- **The premium UI redesign (§2) has still not been started.**
- No screenshots: Playwright cannot execute in this sandbox, so the 666 cases
  collect but do not run. Responsive and axe claims remain CI-only.

No merge, deploy or push has been performed.

## Phase 7 §6 completion — text watermarks (2026-11-04)

`a2141c4` **Text watermarks.** The previous entry listed this as unimplemented;
it was built afterwards, so that entry is superseded. Reuses the text-stamping
plumbing added for page numbering rather than introducing a second path, and
uses pdf-lib's built-in HelveticaBold, so no font file is fetched or bundled.
Drawn after page numbers so it sits on top, and only when the field is
non-empty.

`watermarkPlacement` is pure geometry. The draw origin is offset by half the
rotated text box because pdf-lib rotates about the draw origin; without that
offset a 45 degree watermark drifts off centre and clips on narrow pages. The
test reconstructs the rotated box centre from the returned origin at
0/15/45/-45/90 degrees and asserts it lands on the page centre, so a
regression in the trigonometry fails instead of silently producing off-centre
watermarks.

With this, every brief §6 feature is either implemented or an explicitly
disclosed limitation. The only remaining §6 item is password protection and
unlocking, which stays unsupported and refused with an explicit message; the
brief scopes it to "only where supported and authorized".

### Gate

format:check clean · eslint 0 · tsc 0 · **vitest 760/41** · production build
clean · playwright --list 666 tests / 27 files. Live preview: four routes 200,
redirect 308, and the watermark text, opacity and angle controls confirmed
present in the shipped pdf-studio bundle.

### Still not done

- **The premium UI redesign (§2) has still not been started.** Every item
  completed so far in Phase 7 is a functional gap, not the redesign.
- PDF to Image DPI ceiling stays at 300 against the brief's 600.
- No screenshots: Playwright cannot execute in this sandbox, so the 666 cases
  collect but do not run. Responsive and axe claims remain CI-only.

No merge, deploy or push has been performed.

## Phase 7 §5 completion — DPI ceiling raised to 600 (2026-11-04)

`6de6670` **DPI ceiling.** Brief §5 asks for "DPI presets from 72 to 600 where
supported"; the app clamped at 300. An earlier addendum in
`docs/pdf-to-image-checklist.md` recommended flagging this rather than changing
it, on the grounds that raising `maxDpi` would interact with the 36-megapixel
page cap. That interaction is the reason the change is safe, not a reason to
avoid it: A4 at 600 DPI is 34.8 MP, under the cap, and `image-convert.ts:464`
already downscales any page exceeding it instead of failing. A large page such
as US Legal at 600 DPI (42.8 MP) therefore degrades to the cap and the tool
says so, rather than exhausting the tab. That addendum has been corrected in
place with its original wording preserved.

Presets are now 96/150/200/300/400/600. The custom-DPI slider step also moved
from 6 to 2: at step 6 from a minimum of 72 the 200 preset already sat off the
step grid, and 400 would too, so the slider thumb and the `<output>` readout
disagreed with the preset the user had just clicked. Step 2 puts every preset
on the grid.

Two stale test assertions were updated rather than deleted. The clamp test
hardcoded `dpi: 300` as "the max", so it now reads `CONVERT_LIMITS.maxDpi` and
cannot go stale on a future ceiling change; it also now asserts the clamped
width is under a quarter of an unclamped 5000 DPI render, so a clamp that
silently became a no-op fails instead of merely matching itself. The
preset-list assertion now includes 400 and 600.

`e0c21e1` **Copy correction.** Raising the ceiling left the surrounding copy
contradicting the UI: the slider reached 600 while the feature intro, the FAQ,
the page description, the meta description and the limits badge all still said
"72 to 300 DPI". A user reading the FAQ would conclude 600 was unavailable, or
that the slider was broken. The FAQ now also explains what 600 DPI is for —
archival scans — and notes that a large page at a high DPI is the case that
reaches the 36 MP cap, since that combination is now reachable.

`PDF_EMBED_DPI_OPTIONS` for images-to-pdf deliberately stays at 96/150/200/300.
It is a separate setting governing the resolution images are resampled to before
being placed, §4 does not ask for a 600 embed ceiling, and its test comment
about those four values refers to that setting, not the render DPI changed here.

### Gate

format:check clean · eslint 0 · tsc 0 · **vitest 760/41** · production build
clean · playwright --list 666 tests / 27 files. Live preview: four routes 200,
redirect 308; the shipped bundle carries `maxDpi:600`, `minDpi:72` and `step:2`;
the pdf-to-image page renders "72 to 600 DPI" and "72–600 DPI" with zero stale
300 DPI strings remaining.

### Still not done

- **The premium UI redesign (§2) has still not been started.** Every item
  completed so far in Phase 7 is a functional gap, not the redesign.
- No screenshots: Playwright cannot execute in this sandbox, so the 666 cases
  collect but do not run. Responsive and axe claims remain CI-only.

No merge, deploy or push has been performed.

## Phase 7 §6 — password handling investigated; corrupt-file misdiagnosis fixed (2026-11-04)

`f9390f1` **Two findings from probing password support at runtime** rather than
assuming it was unsupported.

**1. `pdf-lib`'s encryption is a silent no-op — password protection must stay
unimplemented.** `PDFDocument.save({ userPassword, ownerPassword })` accepts the
options without complaint and returns an **unencrypted** file: the document
reloads successfully with no password at all. Wiring a "protect" button to that
API would tell users their file was password-protected when it was not — a
security claim the tool could not honour. Refusing to offer protection is
therefore the correct behaviour, not a gap to close. Anyone tempted to close it
should re-run this probe first. Note the brief scopes this feature to "only
where supported and authorized"; it is not supported here.

Unlocking is a separate matter and _is_ handled, but only in
`lib/tools/pdf/compress-engine.ts`, which accepts an open password to inspect
and compress a protected PDF. PDF Studio does not route through that path.

**2. A real defect: corrupt PDFs were misdiagnosed as password-protected.**
`runPdfStudio`'s catch around `PDFDocument.load` reported every failure as
"Password-protected PDFs are not supported yet. Remove the password and try
again." A corrupt or truncated PDF throws `MissingPDFHeaderError`, so a user
with a merely damaged file was told to remove a password that was never there.

Measured behaviour of `@cantoo/pdf-lib`:

| input                        | throws                  |
| ---------------------------- | ----------------------- |
| garbage bytes                | `MissingPDFHeaderError` |
| genuinely encrypted document | `EncryptedPDFError`     |

Both report `.name === "Error"`, so the name check already used in this file for
pdf.js (line 1218) cannot be reused — `instanceof pdfLib.EncryptedPDFError` is
required. The fix mirrors the honest pattern at line 1218: only a genuine
encryption failure gets the password message; anything else now names the file
and says it may be corrupt or truncated.

### A testing lesson worth keeping

The first version of the regression test imported a non-existent
`DEFAULT_PDF_STUDIO_SETTINGS` (the real export is the function
`defaultPdfStudioSettings()`). **Vitest passed it anyway**, because it
transpiles without typechecking, leaving `settings` undefined at runtime.
`tsc --noEmit` caught it. The test was then re-verified to bind by temporarily
restoring the old catch and confirming it fails with the exact misleading
message.

### Gate

format:check clean · eslint 0 · tsc 0 · **vitest 761/41** · production build
clean. Live preview: four routes 200, redirect 308, corrected message present in
the shipped pdf-studio bundle.

### Still not done

- **The premium UI redesign (§2) has still not been started.** Every item
  completed so far in Phase 7 is a functional gap, not the redesign.
- No screenshots: Playwright cannot execute in this sandbox, so the 666 cases
  collect but do not run. Responsive and axe claims remain CI-only.

No merge, deploy or push has been performed.
---

## QR Code Studio V3 — Advanced Design Studio upgrade (Stage 2 complete: Phases B + C + D + F + G + H + E + I + J implemented and verified)

Requested by the owner on 3 November 2026: upgrade the existing QR Generator V2 into a premium
creation/design studio (27 content types, ≥50 categorized templates, frames + labels, independent
eye colours, print layouts, DPI metadata, bulk retry/preview/per-row types, history/preset
rename/duplicate/export/import, static multi-link landing pages). Branch `arena/bc33caa6-quickkit`,
continuing the existing QR history — no rebuild. The owner chose a **staged** rollout: content types

- templates first, then design/exports/bulk/history.

**Phase A (audit) complete** — inventory, gap analysis and plan in `docs/qr-studio-v3/AUDIT_AND_PLAN.md`.
**Stage 1 (Phases B + C) implemented and verified:**

- **27 content types** (12 preserved + 15 new: Instagram, Facebook page, YouTube channel,
  Spotify/music, Google Maps, Google Review, business website+contact vCard, product, booking,
  event/ticket, PDF/document, gallery, video, multi-social, multi-link landing). Each has validated
  fields and a real payload builder; destination types encode user-provided https URLs only.
- **55 templates across 11 categories** with a real gallery: search, category filter, rendered
  previews, one-click Apply, customize-after, save-custom, duplicate, delete, reset. Templates carry
  colour/pattern/eye/logo-position + caption + print layout/size metadata that pre-fill the real PDF
  options. Custom templates persist under a new localStorage key; presets/history untouched.
- Brand palette (Deep Plum / Rose / Coral / Midnight / Blush) applied to templates + gallery on the
  existing light theme; page structure unchanged.

**Stage 2 — Phase D (frames, labels, eye colours, brand palettes, logo background) implemented and verified:**

- **Frames + stroke-font labels:** six presets (Scan Me / Menu / Follow Us / Contact / Visit) plus a
  custom-text frame. A rounded plum border + bottom call-to-action banner are drawn _outside_ the
  symbol's quiet zone; the label uses a new built-in single-stroke font (`lib/tools/qr/font.ts`, pure
  polyline geometry shared by the rasterizer, SVG and tests — no canvas, no network font), uppercased
  and auto-fitted to the banner. The square symbol shrinks into a code region above the banner and the
  logo re-centres on it. New `line` shape rendered analytically in the rasterizer and as round-cap
  `<line>` strokes in SVG. Every framed design is decode-verified before export.
- **Independent finder colours:** optional `eyeFrame` / `eyeBall` fill overrides (ring + centre) with
  toggles + HEX pickers in the Colours fold; the safety audit blocks/cautions a finder colour that
  loses contrast against the field, since scanners lock onto the finders first.
- **Brand palette quick-picks:** Deep Plum / Rose on blush / Coral on cream / Midnight / Plum→rose
  gradient swatches in the Colours fold (Phase I palette applied to the studio, not just templates).
- **Logo background colour:** optional halo-colour override (`logo.bg`) with a toggle + HEX picker in
  the Logo fold; defaults to the field colour as before.
- Frame / eye / logo-bg state is clamped from untrusted input (`readFrame`, `readOptionalFill`),
  carried in share links, and preserved by presets/history. The design card now has six folds
  (Colours / Pattern / Corners / Logo / Frame / Templates).

**Stage 2 — Phase F (exports: DPI, custom size, print layouts, A4 sheet) implemented and verified:**

- **PNG DPI metadata:** a standard `pHYs` chunk stamps the chosen print resolution (72/150/300/600 DPI)
  into every PNG export. It is metadata only — the verified pixels are untouched, so the file still
  decodes exactly as checked (`withPngDpi`/`readPngDpi` in `png.ts`, round-trip + decode tested).
- **Custom-size export:** a 64–4096 px input in the Download fold re-renders at the requested size and
  re-verifies before saving (the high-res button now also carries the chosen DPI).
- **Print layouts (`lib/tools/qr/layouts.ts`):** real physical PDFs built with pdf-lib from the same
  verified PNG — Business card (85×55 mm), Sticker (50×50 mm), Product label (70×40 mm), Poster (A4,
  130 mm code), Table tent (A4 landscape, fold guide, one face printed inverted so both read upright),
  plus the original Single-on-paper. A layout selector + caption toggle drive the PDF button.
- **A4 cut sheet:** a cols×rows grid of identical codes with light cut guides, clamped to fit A4 with a
  margin (`clampSheet`); columns/rows/code-width/gap controls appear when the sheet layout is chosen.

**Stage 2 — Phase G (bulk CSV: preview, per-row type, retry-failed) implemented and verified:**

- **Pre-generation preview:** a "Preview rows" button validates every row's payload and flags
  duplicates _without rendering pixels_, so you can fix the column mapping before generating.
- **Per-row content type:** an optional "type" column lets one CSV mix types (url / wifi / email …);
  each row resolves its own type and re-guesses its field mapping. The type column is excluded from
  field guessing (a "type" header is also a Wi-Fi-encryption synonym, so it must not map onto a field).
  Unknown/empty cells fall back to the batch default; the results table and ZIP manifest show per-row
  types.
- **Retry-failed:** re-validates and re-renders only the failed rows, keeping the successful codes
  (carried over by matching payload). Also fixed a latent V2 issue where the "skip duplicates" toggle
  had no effect — duplicates now render when the toggle is off.
- Column mapping, per-item errors, progress, cancel, dedup, decode-verify and ZIP are preserved.

**Stage 2 — Phase H (history/presets: rename, duplicate, export/import) implemented and verified:**

- **Rename + duplicate** for both presets and history (inline rename with Enter/Escape; duplicate
  makes an editable "… copy" with a new id). Restore/apply already existed and is preserved.
- **Config export/import:** "Export config" downloads presets + history as a portable JSON file
  (secrets stripped); "Import config" validates the file (app marker + version), then **merges** it
  into existing data — items already present (by id) are skipped, invalid rows are skipped and
  counted, and storage caps are respected. **Existing data is never cleared or overwritten.** Loading
  existing storage stays lenient so a legacy row is never silently dropped.

**Stage 2 — Phase E (static Smart Link landing-page builder) implemented and verified:**

- A "Build a Smart Link page" fold appears for the **Multi-link landing page** and **Multi-social
  links** types: title, optional bio, accent colour and up to **8 links**, with a live preview.
- **Download HTML** produces one self-contained file — inline CSS, system fonts, **no JavaScript, no
  external requests, no tracking**. Every text field is HTML-escaped and every link is run through the
  same http(s)-only validator the QR payloads use (javascript:/data: refused).
- **Static by design, stated plainly:** the user hosts the file themselves (GitHub Pages, Netlify,
  their server) and then encodes its public URL. QUICKKIT hosts nothing, has no analytics, and the
  printed QR cannot be edited later — there is no dynamic redirect. No backend was added.

**Stage 2 — Phase I (brand-colour preset retune) implemented and verified:**

- The six off-brand quick presets (purple/ink/lavender/teal/crimson/amber) were replaced with six
  drawn from the **exact brand palette** — Deep Plum `#3B1B4F`, Rose Pink `#D6598F`, Coral `#FF6B6B`,
  Midnight `#1A0F2E`, Soft Blush `#F4D7D4`. Palette data now lives in `lib/tools/qr/palette.ts`.
- **Every preset clears the "strong" contrast bar (≥ 4.5:1)**, so applying one never triggers a
  contrast warning. Rose and Coral are mid-tones that cannot reach 4.5:1 on a light field, so they
  are paired with Midnight (light-on-dark) where they scan cleanly; the four plum/midnight presets
  stay dark-on-light for the premium light theme. The Phase D brand-swatch row is kept for tinted /
  gradient variations. Premium light theme and page structure are unchanged.

**Stage 2 — Phase J (final browser E2E + visual verification) implemented and verified:**

- A **real Chromium** was provisioned in this restricted sandbox via `@sparticuz/chromium` from the npm
  registry (the Playwright CDN and Debian repos are unreachable). `scripts/setup-e2e-browser.mjs`
  reproduces this; in an unrestricted environment `npx playwright install chromium` works instead.
- **66 Playwright E2E tests pass (0 failed, 0 flaky)** in `tests/e2e/qr-studio-v3.spec.ts` +
  `qr-studio-v3-visual.spec.ts`, run against a production `next start` build:
  - all **27 content types** export a PNG that an **independent jsQR decode** reads back to the exact
    payload (calendar event asserted structurally, its UID/DTSTAMP being time-stamped);
  - all **55 templates** (11 categories × 5) apply through the real gallery and decode;
  - colours/gradients, transparency, frames, every eye style, a logo overlay and all six brand presets
    stay scannable;
  - **PNG, high-res PNG (2048px), SVG and PDF** exports each decode independently (SVG rasterised by
    Chromium, PDF rasterised by pdf.js + @napi-rs/canvas, then jsQR);
  - **bulk CSV → ZIP** (mixed url + Wi-Fi rows) unzips and every PNG decodes, README present;
  - **history** restore and **preset** save/rename/duplicate + config export/import round-trip work;
  - **responsive screenshots** captured at 1440 / 1280 / 768 / 430 / 375 px with **no horizontal
    overflow** and no clipped primary control; **zero console errors, zero uncaught page errors, zero
    hydration errors, zero genuine network failures** (only benign Next.js RSC prefetch aborts);
  - **11 routes** return HTTP 200.
- The independent decoder resamples to scanner-like module sizes (as any camera pipeline does) before
  jsQR, so large/gradient exports are judged the way a phone would judge them — never trusting the
  app's own badge.

**Verification (Stage 2 final):** `tsc`/ESLint/Prettier clean; unit suite **754 passed / 42 files**;
**Playwright Chromium E2E 66 passed / 0 failed**; production build clean (51 pages,
`/tools/qr-generator` static); dev preview live on port 3000. Deliverables:
`docs/qr-studio-v3/screenshots/` (6 genuine captures), `docs/qr-studio-v3/e2e-results.json`
(66 expected / 0 unexpected / 0 flaky), plus the earlier **44 decode-verified PNG artifacts** in
`docs/qr-studio-v3/evidence/`. Full feature-by-feature report: `docs/qr-studio-v3/QA_REPORT.md`.

**Honest limitations:** Smart Link remains static only (no backend, no dynamic editing/analytics
claimed). The calendar-event sample embeds a fresh `DTSTAMP`/`UID` per run, so its evidence PNG is
regenerated each time (still decoded). Firefox/WebKit E2E projects were not run (only Chromium was
provisioned); the Chromium project covers the full QR surface.

**Remaining:** none — all V3 phases (B, C, D, F, G, H, E, I, J) are implemented and verified.
**Not merged, not deployed — awaiting owner approval.**

## QR Code Studio — premium UI redesign workstream (session branch, pending owner approval)

Requested directly by the owner on 2 November 2026 with an attached reference image; it does not
change the phase status recorded above, and no other tool or route was touched. Branch
`arena/8be11fd2-quickkit`, built on top of the three existing QR commits (`79505a9`, `b7625c0`,
`c5d1b17`) — the tool was redesigned in place, never recreated.

**What changed.** The whole presentation layer of `/tools/qr-generator`:
`components/tools/qr-generator/*` (studio shell with four workspace tabs, content picker, design
card with five tabs, preview stage, download block, advanced fold, history/presets/bulk panels,
empty state, thumbnail helper) and the QR block of `app/globals.css`. Four new components
(`empty-state.tsx`, `thumb.tsx`, `history-panel.tsx`, `presets-panel.tsx`) replace the deleted
`library-panel.tsx`. `lib/tools/qr/**` — payload building, capacity, colour maths, styling engine,
scene/raster/SVG/PNG/PDF rendering, decoding, safety, bulk, storage, share — is byte-for-byte
unchanged by this pass, which is why the encode/decode guarantees carried over.

**Verification.** `tsc`, ESLint and Prettier clean; `npm run test` **555 passed /
33 files** with `tests/qr-studio.test.tsx` rewritten for the new DOM contract (21
tests, including the regressions below); `npm run build` clean with the route prerendered
static; Playwright (Chromium, against the production build) **259 passed / 0 failed**, now
including real downloads of the 256 px PNG, the 2,048 px high-res PNG, the SVG, the PDF, the bulk
ZIP and a workspace tab-swap test, each download checked by content (jsQR decode, `<svg`,
`%PDF-`/`%%EOF`, `PK`); **30/30 checks passed with 0 console and page errors on both `next dev` and `next start`**, on a 30-check interactive browser
harness that drives every control (each export decoded back to the exact payload, all 12 content
types filled, tabs/accordions/keyboard, error and loading states, overflow at six widths, zero
console/page errors); 54 real-browser screenshots at 1440 × 900, 1280 × 900, 768 × 1024,
430 × 932, 390 × 844 and 375 × 812 with zero page-level horizontal overflow and zero console
errors. Full evidence, the point-by-point comparison against the reference image, the honest
difference list and the known gaps (Firefox/WebKit not executed here, no manual screen-reader pass,
sandbox font substitution) are in **`docs/qr-studio/QA_REPORT.md`**.

**Eight product fixes came out of the redesign and its browser QA:**

- an axe WCAG 2.2 `nested-interactive` violation — the Design card's Reset button lived inside
  `<summary>`; a card head may now carry only non-interactive pills and that button sits at the top
  of the card body beside the design tab strip (`<details>` keeps its default layout);
- the 375 px card-head badge pushed past the viewport — the action row takes its own flex line below
  560 px (`.qr-card-head > .qr-card-action`, a specificity trap fixed on the way);
- the download row offered exports while the safety audit said _Not scannable_ (a zero quiet zone
  decodes here but not in the field) — `#qr-export` now honours `safety.level === "blocked"` for all
  four tiles and its alert names the reason;
- premium templates blended with the previously applied template (`invert` survived a swap into an
  unverifiable hybrid) — applying a template now starts from `defaultDesign()` and keeps only the
  user's logo and export size;
- the workspace tabs never hid inactive panels (`display: grid` beat the browser's
  `[hidden] { display: none }`, so Bulk/History/Presets stacked under the editor) — fixed with a
  scoped `.qr-layout[hidden], .qr-panel-solo[hidden] { display: none }`;
- the preview empty state rendered as a **solid black square** because the `QrPlaceholder` artwork
  classes had been pruned from `globals.css` along with genuinely dead rules (SVG's default fill is
  black) — restyled, and the empty-state copy no longer lowercases the type label or pluralises
  “field” wrongly; the harness now asserts the artwork's computed fills;
- a pristine Content card opened with a red “Web address is required.” before the user had typed
  anything — inline validation now waits for `hasContent`, the same flag the status machine uses to
  tell `empty` from `invalid`, so the form and the preview verdict agree;
- a _disabled_ primary PNG tile looked fully enabled (`.qr-format:disabled` had no styling) and the
  flash banner's dismiss button was unstyled — both now have proper disabled/ghost treatments,
  scoped to the QR blocks so no other tool's controls change.

**Site-wide change the owner should note:** `next.config.ts` now delivers the Content-Security-Policy
in **report-only mode when `NODE_ENV !== "production"`** (and allows loopback dev origins), because the
enforcing header stopped React's development build from hydrating, which made _every_ client tool's
`next dev` preview look frozen. Production behaviour is byte-identical, the policy content is the
same in both modes, and `'unsafe-eval'` is not added anywhere; `tests/next-headers.test.ts` pins that
contract. Three checks in this workstream therefore touched files outside the QR tool:
`next.config.ts`, that test file, and one CSS block in `app/globals.css` (the QR block only).

**Owner gate.** Not merged, not deployed, not indexed. The owner must open the live preview, use
every feature, inspect the responsive layouts and approve the design before anything else happens.


## 4 November 2026 — Word to PDF Converter (owner-directed)

**State: implementation for review / gated — not production-ready, live-approved, merged or deployed.** Earlier tool approval notes remain historical and unchanged.

- Added `/tools/word-to-pdf` and PDF Tools catalog discovery, responsive QUICKKIT light workspace, multi-file queue, global/file page settings, consent, stage progress, cancellation/retry, custom names, page preview and ZIP exports.
- Reused existing PDF.js preview, PDF-lib editing, ZIP and download utilities. Existing PDF-to-Word batch code is feature-specific; new sequential orchestration follows its bounded approach rather than coupling the two engines. Existing tool implementations were not modified.
- Native self-hosted LibreOffice chosen after audit. No false browser-only converter or third-party upload fallback. Requires explicit operator opt-in and user consent. Engine is unavailable in this sandbox and the preview accurately reports that.
- Settings include native DOCX section page-size/orientation/margin overrides, native quality options, PDF page selection and custom PDF header/footer/number overlays. Print preset is not certified print-ready output; font/complex Word fidelity requires inspection.
- Conservative cap: 100 rendered pages, not 1,000. Native stress/fidelity tests are outstanding; no unsupported performance guarantee.
- Minimal shared copy changes were necessary to remove site-wide “all inputs stay local” claims after introducing the explicit server-processing exception. Catalog/sitemap count assertions updated for exactly one added tool; no existing conversion logic changed.
- Evidence: `docs/WORD_TO_PDF_AUDIT.md`, `docs/WORD_TO_PDF_OPERATIONS.md`, `docs/WORD_TO_PDF_QA.md`, screenshots under `docs/word-to-pdf/screenshots/`.
- Release blockers: native rendering corpus (including charts and long documents), container/network/resource isolation verification, actual-host cancellation/crash retention tests, Firefox/WebKit and owner review. Do not mark production-ready based on mocked tests.


## 4 November 2026 — Word to PDF Converter V2 (same route, owner-directed upgrade)

**State: UI / local PDF studio implemented for review; native rendering release gate blocked. Not merged, deployed or production-approved.** Existing `/tools/word-to-pdf`, PDF Tools listing, API, native engine opt-in and previous tool functionality remain intact.

- Replaced the V1 form/modal with a premium three-panel studio: branded/status toolbar, bounded undo/reset, file queue/reorder/replace/custom names, collapsible/resizable sidebars, inline actual PDF canvas, lazy page thumbnails, navigation/zoom/fit/rotation, text-layer search, original DOCX and native-versus-final PDF comparisons, help and full-viewport preview.
- Added organized Page Setup / Page Management / Appearance / Quality / Metadata panels, global and file scopes, selected-page geometry, include/exclude/order, Arabic/Roman numbering and first-page omission, shared overlay styling, backgrounds, native compression/resolution/tagging requests, metadata and completion reports.
- Shared `process-pdf.ts` drives native export and serialized debounced local updates. Native-affecting changes mark output stale and block export. Refresh is explicit; automatic native re-upload requires separate, revocable opt-in. No upload on file selection. Preview and downloads use the same retained final bytes.
- Mobile Files/Preview/Settings tabs, overflow checks, sticky export and full-viewport preview included. No simulated PDF pages or runtime fake demo document. Successful screenshots are explicitly labelled mocked-native-response evidence; actual installation screenshots show engine unavailable.
- New V2 unit coverage: 32 tests. Final full unit suite **986 passed / 52 files**. Final tool Chromium E2E **8 passed**. TypeScript, lint and production build passed. Wider 41-case Chromium selection had an earlier 41/41 pass, but final attempts were **40 passed / 1 unchanged PDF Splitter synthetic-drop-before-hydration assertion failure**. A hydration-ready diagnostic confirmed the Splitter rejection flow works; no unrelated source/test was modified to hide it. See QA for exact scope.
- Native engine remains absent; complex DOCX fidelity, fonts/charts/structure, isolated-host security/retention and long-document stress tests remain outstanding. 1,000-page capability stays disabled. Numeric pre-render size estimation and forced text outlines/font-substitution editing are not implemented or faked; embedding remains automatic/capability-dependent.
- Source queue remains 80 MiB; native + edited PDF retention is bounded to 120 MiB combined. Canvas area/edge bounds, serialized transforms/thumbnails, cancellation and resource cleanup are implemented; no peak-RSS guarantee.
- Evidence: `docs/WORD_TO_PDF_V2_AUDIT.md`, `docs/WORD_TO_PDF_V2_QA.md`, `docs/WORD_TO_PDF_V2_OPERATIONS.md`, screenshots in `docs/word-to-pdf/v2/`. Existing operator container/network/quota and privacy release gates still apply.


## Word to PDF V3 — owner-directed visual editor upgrade (4 November 2026)

**Implemented for owner review — NOT native/production-approved.** Continues V2 on `/tools/word-to-pdf`; does not create a separate tool. Existing uncommitted V2 work was preserved first in checkpoint `1807951`; V3 implementation checkpoints `3abf9e1`, `e1a86e8`, `c10e848`, `ec1e3aa` preserve the audited plan/model, integrated studio and resource/export hardening. All work stays on `arena/15621ae8-quickkit`; no reset, branch switch, push, merge or deployment.

- Real exported PDF operations: stable identities, drag/drop + touch move buttons, reorder/delete/duplicate/blank/individual rotation, multiselect/all/ranges, output editor sections, undo/redo, selected-final-page extraction. Per-page backgrounds/header/footer/fonts/numbering/text+image watermark/PDF scaling coexist with global/file scopes. All transformations start from retained native bytes and export the same final bytes previewed.
- Existing PDF.js controls/search/full-viewport mode, consented batch/native refresh, quality presets/metadata/custom names/reports preserved. Mobile Files / Preview / Edit, windowed thumbnails, linked approximate DOCX page/zoom/count comparison; no fake pages or fidelity score. Native pagination changes block old plans with local reset recovery.
- Bounded page/image/history/canvas limits; shared immutable image/font assets prevent exponential duplicate output. One ZIP worker uses 1 MiB copies, actual byte/entry progress, cancel/retry/custom names and unchanged PDF entry bytes. Retained 120 MiB is not peak-memory certification.
- Final QA: **1,021 unit tests / 54 files PASS; 15 Word Chromium E2E PASS; TypeScript, ESLint, production build and diff-check PASS.** Desktop/mobile axe zero violations; 390 px no overflow. Latest wider selected Chromium run **47 PASS / 1 unchanged Splitter hydration/drop timing failure**; readiness-gated diagnostic passes all three original rejection assertions. Unrelated tool source/tests unchanged.
- Actual authored PDF stress: 100-page edit PASS; actual 500/1,000-page PDFs parsed and rejected by retained cap. Actual 100-page browser window/URL cleanup verified. **These are not successful large DOCX/native conversion tests.** Real native availability probe records all 100/500/1,000 DOCX cases BLOCKED, no uploads or simulated success.
- Native engine still absent/disabled. Native Word fonts, tables/charts/images, headers/footer/page breaks and real 100-page peak memory/cancellation/fidelity remain release gates, as do physical devices/cross-browser/manual assistive-technology QA. Comparison warnings are honest review indicators, not automatic substitution/layout-difference detection.

Delivery: `docs/WORD_TO_PDF_V3_QA.md`, `WORD_TO_PDF_V3_EDITOR_REPORT.md`, `WORD_TO_PDF_V3_ENGINE_STATUS.md`, `WORD_TO_PDF_V3_CHANGED_FILES.md`; screenshots, clearly labelled actual edited PDF demonstration and measured/blocked stress reports in `docs/word-to-pdf/v3/`. The original V1/V2 reports remain historical. No other tool approval state is changed.


## Word to PDF V4 — 4 November 2026, owner-directed continuation

Infrastructure reviewed/tested in place on `arena/15621ae8-quickkit`, preserving V3. Private native worker is an **unbuilt/unexecuted operator deployment recipe**, not a deployed or validated native engine. Auth/TLS/configuration, bounded broker admission, immutable image/OS policy, cancellation/deadline daemon cleanup and fail-closed quarantine are implemented and mock-tested; direct local compatibility mode is environment-sanitized but still not an OS sandbox. Actual native checks remain open.

- Final unit: **1057 PASS / 56 files** (36 additions); targeted native-orchestration/transport subset **40 PASS**, not native fidelity.
- Type/lint/build/whitespace PASS; production dependency audit reports zero known vulnerabilities at this run (not native image security certification).
- Final-build Word Chromium **17 PASS**; selected core/browser/Merger/Splitter/Compressor/PDF-to-Word Chromium **39 PASS**. Prior unchanged Splitter hydration race passed this run without a Splitter fix; historical V3 result is retained.
- Genuine unavailable-state desktop/mobile screenshots and four synthetic validated DOCX inputs archived. No uploads in the unavailable-state screenshot tests. No output PDF is presented as a native demo.
- Real native complex/100/500/1000 conversion, font/chart/layout fidelity, aggregate peak RAM/CPU/output, real native browser preview/edit performance and real-host sandbox/failure/retention operations **BLOCKED / NOT RUN**. Cap stays **100**. Fonts/OLE-workbook limitations disclosed; no 1000-page production support claim.
- Delivery: `docs/WORD_TO_PDF_V4_{AUDIT,SETUP,QA,FIDELITY,BENCHMARK,CHANGED_FILES}.md` and `docs/word-to-pdf/v4/README.md`. Full operator release gates remain mandatory; no merge, deployment or owner-approval claim.

---

## Legal & information architecture upgrade (4 November 2026, branch `arena/90233e12-quickkit`)

**Owner gate:** not merged, not deployed, not indexed. Branch status `active`.

### What changed

The site previously had three legal pages (`/terms`, `/privacy`, `/cookies`), all plain `prose`
articles with no breadcrumbs, no table of contents, no related-page links and no back-to-top, and a
footer whose "Legal" column listed only those three. Nine required information routes did not exist.

Now there are **twelve independently routable legal and information pages**, each with its own
metadata, canonical, Open Graph data, breadcrumbs, table of contents, related-page list,
back-to-top control and feedback link:

| Route                    | Page                                     | State                                                  |
| ------------------------ | ---------------------------------------- | ------------------------------------------------------ |
| `/terms`                 | Terms and Conditions                     | Rewritten, 15 sections, 2 legal-review flags           |
| `/privacy`               | Privacy Policy                           | Rewritten, 14 sections, evidence-based                 |
| `/cookies`               | Cookie Policy                            | Rewritten, full storage inventory table                |
| `/disclaimer`            | Disclaimer                               | **New**, 13 sections incl. estimate-vs-guarantee table |
| `/about`                 | About QUICKKIT                           | Rebuilt with policy cross-links and roadmap            |
| `/contact`               | Contact Us                               | Rebuilt with five routed request types                 |
| `/faq`                   | Frequently Asked Questions               | **New**, 25 answers in 6 groups                        |
| `/copyright`             | Copyright and DMCA Policy                | **New**, 9 sections incl. counter-notification         |
| `/accessibility`         | Accessibility Statement                  | **New**, 12 sections incl. known limitations           |
| `/security`              | Security Policy                          | **New**, 11 sections, no certification claims          |
| `/file-handling`         | Data Processing and File Handling Policy | **New**, 20 sections, tool-by-tool                     |
| `/intellectual-property` | Intellectual Property Policy             | **New**, 9 sections incl. licence table                |

### Architecture

- `lib/legal.ts` — one registry (route, nav label, title, description, group, section anchors,
  indexability) that drives the footer, the sitemap page, the XML sitemap and the page shell.
- `components/legal-page-shell.tsx` — shared server-rendered shell: breadcrumbs, hero, `<time>`
  last-updated, sticky table of contents, owner-input notice, related pages, back-to-top, feedback,
  legal-review note. Content remains per page — this is a design system, not a text template.
- `lib/site.ts` — `ownerDetails` block plus `contactChannels` resolvers. Empty fields render a
  visible _Owner to supply_ marker; no entity, address, jurisdiction or inbox is invented.
- `components/footer.tsx` — four generated groups (Tools, Company, Legal, Trust & Security),
  21 links, zero duplicates, zero `#` hrefs.
- `components/header.tsx` — legal routes now set `aria-current` on "About"; `/faq` sets it on "Help".
- `app/sitemap/page.tsx` and `app/sitemap.ts` — derived from the registry; empty categories excluded;
  XML sitemap still gated on `indexingEnabled`.
- `app/globals.css` — scoped `.legal-*` design system (white/soft-lavender surfaces, purple accents,
  78ch measure, responsive tables, reduced-motion respected) appended without touching tool styles.
- `scripts/check-site-links.mjs` — dependency-free crawler for status, `<h1>` count, titles,
  descriptions, canonical presence, `#` hrefs, in-page anchors and every internal link.

### Content accuracy (checked against code, not assumed)

Claims on `/file-handling` and `/privacy` were verified in the source before being written: PDF and
image work happens in `workers/pdf-*.worker.ts` and `workers/image-encode.worker.ts`; pdf.js is served
from `/pdfjs` and tesseract.js plus eng/hin/guj data from `/ocr` (self-hosted, no CDN); there are no
`route.ts` API endpoints; the CSP sets `connect-src 'self'` and `frame-src 'none'`; the only
`fetch()` in the codebase is the contact form, whose endpoint is unset. Storage keys were read from
`lib/use-favorites.ts`, `lib/tools/qr/storage.ts`, `lib/tools/image-history.ts` and
`lib/tools/pdf-to-word/history.ts`. The page states that files are **not** transmitted for processing,
because that is what the implementation proves, and separately documents the hosting metadata that
does leave the device.

### Verification actually run

- `npx tsc --noEmit` — pass.
- `npx eslint .` — pass.
- `prettier --check` — pass.
- `npm test` — **942 passed / 50 files**, including the new `tests/legal-pages.test.tsx` (15 tests).
- `npm run build` — pass; all twelve routes prerendered static.
- `node scripts/check-site-links.mjs` — **53 routes crawled, 53 returned 200, 0 dead links,
  0 placeholder hrefs**. Six external (demo social) links were not fetched, by design.
- Scratch build with `SITE_URL` + `LAUNCH_APPROVED` — canonical and `og:url` verified on 14 routes,
  `robots` became `index, follow`, `robots.txt` emitted `Allow: /`, all 52 sitemap URLs returned 200,
  then the artefacts were rebuilt with indexing disabled again.
- `npm run test:e2e` — **not executed here**: Playwright browser binaries cannot be downloaded in this
  sandbox (every Playwright CDN is blocked and no system browser is installed). The suites were
  extended — `tests/e2e/quality.spec.ts` now sweeps all twelve routes for axe and overflow at nine
  widths, and `tests/e2e/legal-pages.spec.ts` adds per-route metadata, breadcrumb, ToC, related-link,
  footer, skip-link and active-state coverage. They must be run in CI or locally before merge.

### Two pre-existing defects found and fixed

- `lib/calculator-info.ts` — six calculator meta descriptions were 60–69 characters, below a useful
  snippet length. Rewritten; no behaviour change.
- `tests/launch.test.ts` / `tests/split-regression.test.tsx` — sitemap length was hard-coded at 46.
  Both now derive the expectation from `legalPages` + `tools`, so a new page cannot silently miss the
  sitemap.

### Phase 2 — final compliance audit and polish (same branch, in progress)

Phase 2 audited the twelve pages against the running production build instead of rebuilding them.

**Contact address withdrawn.** `hello@quickkit.in` could not be confirmed as an owner-approved,
monitored inbox, so it is no longer published anywhere. `lib/site.ts` types `contactEmail` as
`string | null` (derived from `ownerDetails.publicEmail`) and every page branches on it — the old
code interpolated the address into a template literal, where a `null` renders as the literal text
`mailto:null` and `tsc` does not object. `components/contact-link.tsx` now centralises rendering, and
the contact form disables itself with an explicit notice when no channel exists rather than composing
a dead address. Supplying one field restores the whole surface.

**`/file-handling` was incomplete.** The tool-by-tool audit found that Image Compressor, Image Resizer
and Image Cropper are live but had **no section** on a page that claims to cover every file-handling
tool. Three sections were added (§12–§14, everything after renumbered to §23) using the enforced
constants in `lib/tools/image-compress.ts`, `image-resize.ts` and `image-crop.ts`. All three were
verified to write **no** persistent storage — page memory and blob URLs only.

**Everything else checked against the build:** all 6 `localStorage` keys and both IndexedDB databases
named in `/cookies` and `/privacy` exist with the documented caps; `document.cookie` appears nowhere;
the only `fetch` in application code is the optional contact-form POST; fonts are `next/font/local`;
no `<iframe>`, external script or third-party asset. The Cookie Policy describes no consent banner,
analytics or ad feature, because none is implemented. `/contact` gained the table of contents it was
missing (it inherited a different layout), and four anchor ids moved from `<p>` elements onto the
`<h3>` headings that label them. All twelve routes now emit a valid lowercase `<time datetime>` —
Next 16 serialises a JSX `dateTime` prop as `dateTime="…"`, so dates are rendered through a
`isoDatetime()` spread.

### Verification actually run (Phase 2)

- `npx tsc --noEmit`, `npx eslint .`, `prettier --check` — pass.
- `npm test` — **942 passed / 50 files** (15 in `tests/legal-pages.test.tsx`).
- `npm run build` — pass.
- `node scripts/check-site-links.mjs` — 53 routes, 53 × 200, 0 dead links.
- `node scripts/audit-legal-pages.mjs` — **0 problems** across the 12 routes.
- Ad-hoc anchor sweep — 383 distinct internal links across the 12 routes, target page **and** fragment
  checked, **0 broken**.
- Static a11y/heading sweep — one `<h1>` per page in `<main>`, no heading-level skips, no empty links,
  every table captioned with column headers, no duplicate ids, `lang="en"` and a skip link present.
- `SITE_URL` + `LAUNCH_APPROVED` scratch build — canonicals, `index, follow`, 52-URL sitemap
  (all 12 legal routes present) and `Allow: /` robots.txt; rebuilt without them afterwards and
  confirmed back to `noindex, nofollow`.
- **`npm run test:e2e` — not executed. Playwright browser binaries cannot be installed in this
  sandbox (CDN blocked, no system Chrome). No claim is made that the pages were rendered at 375, 390
  or 430 px, or that keyboard traversal was exercised in a real browser.** Those must be run before
  approval.

### Still open (owner decisions, not code work)

**A verified monitored contact address** (nothing is published until one is supplied), operator legal
name, jurisdiction, postal address/registration (if required), four dedicated inboxes or acceptance of
one, minimum age, hosting log retention and subprocessors, source licensing decision,
independent accessibility and security review, and legal review of liability, governing law, consumer
carve-outs and the DMCA position. None of these are invented on any page; each appears as a marked
placeholder or a flagged provision. Full checklist: `docs/LEGAL_PAGES.md` §7 and
`docs/OWNER_INPUTS.md`.
