# QUICKKIT Tool Development Status

**Last updated:** 3 November 2026  
**Purpose:** Single status tracker for implemented tools, approved expansion candidates and deferred ideas.  
**Public launch state:** Not deployed or indexed by this roadmap work. “Live” below means implemented and verified in the repository; it does **not** mean publicly launched on a production domain.  
**Development policy:** Strictly one tool at a time. A tool must be researched, designed, implemented, tested, delivered with screenshots/demo and explicitly approved by the owner before the next tool begins.  
**Current active tool:** PDF to Word Converter — **V2 implemented — awaiting owner approval** (V1 delivered first, then upgraded in place on the same PR #6 branch at the owner's direction: live PDF/DOCX previews with side-by-side compare, page-range conversion, working preserve settings, batch dashboard, quality reports, opt-in local history). PDF Merger was merged into `main` by the owner (PR #4/#5 chain) and is now counted as implemented. PDF to Word was then built at the owner's direction with the same rules: 100% on-device processing, honest per-file errors, no silent skipping, genuine DOCX output. **Do not mark it live/complete and do not start another tool until the owner personally approves it.** It has not been deployed or indexed. Separately, PDF Merger and PDF Splitter were owner-approved on 1 November 2026; PDF Compressor is implemented and integrated on PR #11 but remains **awaiting owner approval**. The PR #11 integration note at the end of this file supersedes older PDF-specific rows that still list Split PDF as planned or omit PDF Compressor.

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
| Implemented — awaiting owner approval                                  |     1 | PDF to Word Converter; implemented and QA-complete for review, but not owner-approved, live, deployed or indexed.                                                                                                     |
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

| ID                   | Tool               | Current URL                 | Current category | Proposed category        | Registry status | Verification state                                                                                      |
| -------------------- | ------------------ | --------------------------- | ---------------- | ------------------------ | --------------- | ------------------------------------------------------------------------------------------------------- |
| `word-counter`       | Word Counter       | `/tools/word-counter`       | Text             | Text & Writing Tools     | `live`          | Implemented; included in existing unit/browser suites.                                                  |
| `case-converter`     | Case Converter     | `/tools/case-converter`     | Text             | Text & Writing Tools     | `live`          | Implemented; included in existing unit/browser suites.                                                  |
| `json-formatter`     | JSON Formatter     | `/tools/json-formatter`     | Developer        | Developer Tools          | `live`          | Implemented; included in existing unit/browser suites.                                                  |
| `password-generator` | Password Generator | `/tools/password-generator` | Security         | Security & Privacy Tools | `live`          | Implemented with cryptographically secure generation; included in existing tests.                       |
| `qr-generator`       | QR Code Generator  | `/tools/qr-generator`       | Image & QR       | QR & Barcode Tools       | `live`          | Implemented locally in the browser; included in existing tests.                                         |
| `image-compressor`   | Image Compressor   | `/tools/image-compressor`   | Image & QR       | Image Tools              | `live`          | Implemented with bounded canvas processing; included in existing tests.                                 |
| `merge-pdf`          | PDF Merger         | `/tools/merge-pdf`          | PDF Tools        | PDF Tools                | `live`          | Browser-only merger with page selection, previews and password unlock; owner-approved on 1 November 2026 after final real-file QA. |
| `split-pdf`          | PDF Splitter       | `/tools/split-pdf`          | PDF Tools        | PDF Tools                | `live`          | Browser-only splitter with custom ranges, visual extraction, every-N/per-page modes, named validated outputs and local ZIP; owner-approved on 1 November 2026 after final real-file QA. |

### Implemented — awaiting owner approval

| ID            | Tool                  | Current URL          | Current category | Proposed category | Workflow status                           | Verification state                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------- | --------------------- | -------------------- | ---------------- | ----------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pdf-to-word` | PDF to Word Converter | `/tools/pdf-to-word` | PDF Tools        | PDF Tools         | **implemented — awaiting owner approval** | 100% on-device conversion (PDF.js extraction → structure model → `docx` OOXML; optional self-hosted tesseract.js OCR in English/Hindi/Gujarati). Two modes, page ranges, preserve toggles (images/tables/headings+lists/hyperlinks/headers+footers), custom output filenames, live original-PDF preview + real generated-DOCX preview (`docx-preview`) with side-by-side compare, batch dashboard (retry failed, ZIP, batch report, clear completed), per-file quality reports (no accuracy percentages), opt-in browser-local history (IndexedDB; converted DOCX only). Implemented on `arena/dc1f7709-quickkit` for owner review. Not owner-approved, live, deployed or indexed. |
| `compress-pdf` | PDF Compressor | `/tools/compress-pdf` | PDF Tools | PDF Tools | **implemented — awaiting owner approval** | Browser-only batch compressor with Low/Medium/High/Maximum presets, custom image quality/resolution, optional grayscale, best-effort target size, previews/comparison, exact savings, validated individual/ZIP downloads, cancellation and retry. QA evidence is in `docs/pdf-compressor/QA_REPORT.md`. Not owner-approved, deployed or indexed. |
| `qr-generator` | QR Code Generator — **QR Code Studio** UI redesign | `/tools/qr-generator` | Image & QR       | QR & Barcode Tools | **redesign implemented — awaiting owner approval** (the tool itself is already `live` above) | Owner-supplied reference image implemented, not described: desktop two-column workspace (Content card + Design & Customize card with Colours/Pattern/Corners/Logo/Templates tabs on the left; Preview card with the live code, stage tools, independent-decoder verdict, Size/Correction/Contrast chips, computed metadata line and the Download block on the right), Create / Bulk (CSV) / History / Presets workspace tabs, Advanced Settings as a collapsed fold carrying a truthful summary chip, preview-first single column on phones, and the Bulk CSV, local History and Presets panels rebuilt as real tabs. `lib/tools/qr/**` (encoding, styling, decoding, exports, bulk, storage) is untouched — every prior feature remains reachable and was re-verified in a real browser. Implemented on `arena/8be11fd2-quickkit`; evidence and reference comparison in `docs/qr-studio/QA_REPORT.md` + 54 screenshots + a 30-check
interactive browser harness run against both `next dev` and `next start`. Eight defects found in that
pass are fixed with regression tests (export gating vs. the safety audit, template blending, inactive
tab panels still laid out, black empty-state artwork from over-eager CSS pruning, unstyled disabled
export tiles and flash button, validation on an untouched field, card-head a11y, 375 px head overflow), plus a site-wide dev-CSP change
so the dev preview hydrates. Not merged, not deployed, not owner-approved. |

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

|   # | Tool                  | Proposed ID             | Proposed slug           | Status    |
| --: | --------------------- | ----------------------- | ----------------------- | --------- |
|   1 | Wi-Fi QR Generator    | `wifi-qr-generator`     | `wifi-qr-generator`     | `planned` |
|   2 | vCard QR Generator    | `vcard-qr-generator`    | `vcard-qr-generator`    | `planned` |
|   3 | Email QR Generator    | `email-qr-generator`    | `email-qr-generator`    | `planned` |
|   4 | SMS QR Generator      | `sms-qr-generator`      | `sms-qr-generator`      | `planned` |
|   5 | Phone QR Generator    | `phone-qr-generator`    | `phone-qr-generator`    | `planned` |
|   6 | Location QR Generator | `location-qr-generator` | `location-qr-generator` | `planned` |
|   7 | Event QR Generator    | `event-qr-generator`    | `event-qr-generator`    | `planned` |
|   8 | Batch QR Generator    | `batch-qr-generator`    | `batch-qr-generator`    | `planned` |
|   9 | QR Code Scanner       | `qr-code-scanner`       | `qr-code-scanner`       | `planned` |
|  10 | Barcode Generator     | `barcode-generator`     | `barcode-generator`     | `planned` |

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

| Date            | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 November 2026 | Initial expansion tracker created. Six implemented tools recorded; 84 candidates marked `planned` pending approval; Phase 5 not started.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 1 November 2026 | Strict one-tool-at-a-time policy adopted. PDF Merger selected as the sole active tool; `PDF_MERGER_PLAN.md` completed. Status remains `planned` with workflow note “research/planning, awaiting approval”; no implementation started.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 1 November 2026 | Owner approved the PDF Merger plan with mandatory browser-only processing, explicit actionable errors/no silent skipping and a polished complete mobile workflow. PDF Merger became the sole active implementation.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 1 November 2026 | Local PDF Merger work was backed up, integrated directly onto pushed baseline `db4e906`, committed at `070bc77` and pushed to `arena/eb17e485-quickkit`/PR #2. No merge into `main` was performed.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 1 November 2026 | Final PDF Merger QA and owner-review handoff completed in `docs/pdf-merger/QA_REPORT.md`. Status set to **implemented — awaiting owner approval**; all other tools remain blocked.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 2 November 2026 | PDF Merger merged into `main` by the owner (via PR #4/#5) and moved to implemented (`live`). Portfolio now counts 7 implemented tools.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 2 November 2026 | PDF to Word Converter implemented at the owner's direction on `arena/dc1f7709-quickkit`: on-device PDF→DOCX with Original Layout + Clean Editable modes, batch queue with ZIP/batch report, optional self-hosted OCR for scanned pages, honest per-file errors (password/corrupt/limits), and conversion notes instead of silent loss. Added `'wasm-unsafe-eval'` to the CSP `script-src` (permits WebAssembly compilation for OCR; does not enable JS eval). Full gates green (129 unit, 253 Chromium e2e, build, audit). Status: **implemented — awaiting owner approval**; do not merge or start another tool until the owner approves.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 2 November 2026 | **PDF to Word V2** built on the same PR #6 branch at the owner's direction, preserving all V1 behaviour: original-PDF preview (lazy pdfjs pages/thumbnails, zoom stepped from effective on-screen zoom, rotate-for-view, fullscreen, keyboard), preview of the actual generated DOCX (`docx-preview`, lazy-loaded), desktop side-by-side compare + mobile tabs, page-range conversion, hyperlink extraction, preserve toggles, OCR languages (eng/hin/guj), custom output filenames, batch dashboard with counts/retry-failed/batch report/clear-completed/batch banner, per-file quality report (source/converted pages, extraction status, images/tables/links kept, OCR usage, honest content-loss verdict), and opt-in browser-local history (IndexedDB, session/24h/7d, DOCX only). Gates: 138 unit, 259 Chromium e2e, 34-page build, 0 audit findings. Still **awaiting owner approval** — not merged, live, deployed or indexed.                                                                                                                                                                                                            |
| 3 November 2026 | **QR Code Studio browser QA + eight fixes.** Built a 29-check interactive harness and ran it against both `next dev` (port 3001) and `next start` (3000): every control driven for real, all four exports downloaded and decoded back to the exact payload, all 12 content types filled and verified, bulk CSV → ZIP → report, error/loading/stale states, overflow at 1440/1280/768/430/390/375 — **30/30 checks passed, 0 console and page errors / 30/30 checks passed, 0 console and page errors**, zero console or page errors, and 54 re-captured screenshots, reviewed by eye afterwards (which is how the black empty-state square was caught at all). Fixed seven defects it exposed (export tiles ignoring the safety audit; templates blending with the previous template; `[hidden]` tab panels still laid out; black empty-state artwork from CSS pruning; unstyled disabled export tiles and flash button; stale copy in the QA doc) with unit + Playwright regressions, and fixed the site-wide dev-mode freeze by serving the CSP report-only outside production (`next.config.ts`, new `tests/next-headers.test.ts`, production unchanged). Gates: `tsc`/ESLint/Prettier clean, `npm run test` **555 passed / 33 files**, Playwright **259 passed / 0 failed**, production build clean with `/tools/qr-generator` static. Still **awaiting owner approval**; not merged, not deployed. |
| 2 November 2026 | **QR Code Studio premium UI redesign** implemented on `arena/8be11fd2-quickkit` from the owner's attached reference image: two-column desktop workspace, Create/Bulk/History/Presets tabs, preview-first mobile layout, Advanced Settings collapsed by default, Bulk CSV + local History + Presets panels as separate tabs, purple-lavender card system. No engine change (`lib/tools/qr/**` untouched); all 12 content types, colour/gradient, module/eye patterns, logo upload, templates, error correction, quiet zone, verification gate, exports (PNG, high-res PNG, SVG, PDF), copy/share, presets, history and bulk CSV remain real and working. Gates: `tsc`/ESLint/Prettier clean, 547 unit tests passed, production build clean, Playwright Chromium suite green against the production server (real PNG decode via jsQR, SVG/PDF/ZIP file checks, axe WCAG 2.2 AA, nine-width overflow sweep), 49 screenshots at 1440/768/430/390/375 with zero page-level horizontal overflow. Recorded in `docs/qr-studio/QA_REPORT.md`. Status: **redesign implemented — awaiting owner approval**; not merged, not deployed, no other tool touched. |

## Phase 9 V2 continuation — 2 November 2026

In progress, not released: see `PHASE_9_V2_CHECKLIST.md` for per-tool status, financial/calendar additions, independent sample calculations, production Chromium results and outstanding work. Full per-feature verification of all 12 remains pending. No merge or deployment.

### Phase 9 V2 populated preview checkpoint

All 12 calculator routes have populated mobile and desktop Chromium screenshots indexed in `docs/phase-9-v2-final-evidence/README.md`; 319 Chromium regression tests, 188 unit tests, lint, typecheck and production build passed on this application code. Feature and cross-browser coverage remain incomplete; see `PHASE_9_V2_CHECKLIST.md`. Not merged or deployed.

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

---

## QR Code Studio V3 — Advanced Design Studio upgrade (Stage 2 in progress: Phases B + C + D + F implemented)

Requested by the owner on 3 November 2026: upgrade the existing QR Generator V2 into a premium
creation/design studio (27 content types, ≥50 categorized templates, frames + labels, independent
eye colours, print layouts, DPI metadata, bulk retry/preview/per-row types, history/preset
rename/duplicate/export/import, static multi-link landing pages). Branch `arena/bc33caa6-quickkit`,
continuing the existing QR history — no rebuild. The owner chose a **staged** rollout: content types
+ templates first, then design/exports/bulk/history.

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
  custom-text frame. A rounded plum border + bottom call-to-action banner are drawn *outside* the
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

**Verification (Stage 2 so far):** `tsc`/ESLint/Prettier clean; unit suite **718 passed / 40 files**
(was 682/39 at Stage 1, 594/37 baseline); every content type, all 55 templates and the six framed /
eye-colour / logo designs decoded by jsQR to the exact payload; every print layout reloads as a valid
PDF at its promised millimetre size and DPI-stamped PNGs still decode; production build clean with
`/tools/qr-generator` static; dev preview live on port 3000; **44 decode-verified PNG artifacts** +
report in `docs/qr-studio-v3/evidence/` (regenerate: `QR_EVIDENCE=1 node node_modules/vitest/vitest.mjs
run tests/qr-v3-evidence.test.ts`). Full feature-by-feature report: `docs/qr-studio-v3/QA_REPORT.md`.

**Honest limitations this stage:** browser screenshots blocked by the sandbox network policy (Chromium
CDN + Debian repos unreachable) — live preview + engine-rendered QR evidence provided instead; Smart
Link remains static only (no backend, no dynamic editing/analytics claimed). The calendar-event sample
embeds a fresh `DTSTAMP`/`UID` per run, so its evidence PNG is regenerated each time (still decoded).

**Remaining:** G (bulk retry/preview/per-row type), H (history/preset rename/duplicate/export/import),
E (static landing-page builder), J (browser e2e + screenshots). **Not merged, not deployed — awaiting
owner approval.**

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
- the download row offered exports while the safety audit said *Not scannable* (a zero quiet zone
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
- a *disabled* primary PNG tile looked fully enabled (`.qr-format:disabled` had no styling) and the
  flash banner's dismiss button was unstyled — both now have proper disabled/ghost treatments,
  scoped to the QR blocks so no other tool's controls change.

**Site-wide change the owner should note:** `next.config.ts` now delivers the Content-Security-Policy
in **report-only mode when `NODE_ENV !== "production"`** (and allows loopback dev origins), because the
enforcing header stopped React's development build from hydrating, which made *every* client tool's
`next dev` preview look frozen. Production behaviour is byte-identical, the policy content is the
same in both modes, and `'unsafe-eval'` is not added anywhere; `tests/next-headers.test.ts` pins that
contract. Three checks in this workstream therefore touched files outside the QR tool:
`next.config.ts`, that test file, and one CSS block in `app/globals.css` (the QR block only).

**Owner gate.** Not merged, not deployed, not indexed. The owner must open the live preview, use
every feature, inspect the responsive layouts and approve the design before anything else happens.
