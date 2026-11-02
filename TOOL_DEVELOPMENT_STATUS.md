# QUICKKIT Tool Development Status

**Last updated:** 2 November 2026  
**Purpose:** Single status tracker for implemented tools, approved expansion candidates and deferred ideas.  
**Public launch state:** Not deployed or indexed by this roadmap work. “Live” below means implemented and verified in the repository; it does **not** mean publicly launched on a production domain.  
**Development policy:** Strictly one tool at a time. A tool must be researched, designed, implemented, tested, delivered with screenshots/demo and explicitly approved by the owner before the next tool begins.  
**Current active tool:** PDF to Word Converter — **V2 implemented — awaiting owner approval** (V1 delivered first, then upgraded in place on the same PR #6 branch at the owner's direction: live PDF/DOCX previews with side-by-side compare, page-range conversion, working preserve settings, batch dashboard, quality reports, opt-in local history). PDF Merger was merged into `main` by the owner (PR #4/#5 chain) and is now counted as implemented. PDF to Word was then built at the owner's direction with the same rules: 100% on-device processing, honest per-file errors, no silent skipping, genuine DOCX output. **Do not mark it live/complete and do not start another tool until the owner personally approves it.** It has not been deployed or indexed.

## Percentage Calculator focused verification

Percentage Calculator was reviewed and tested in isolation. The feature checklist, exact expected/actual results and Chromium UI/accessibility evidence are recorded in `PERCENTAGE_CALCULATOR_QA.md`. Firefox, WebKit and manual screen-reader verification remain outstanding; no broader Phase 9 completion or deployment is implied.

## Phase 9 V2 checkpoint (owner-directed)

**In Progress — not accepted or verified.** V2 work has continued in place across the suite, including advanced percentage and multi-item GST workflows; substantial requested features and verification remain. See `PHASE_9_V2_CHECKLIST.md` for feature-level status, test scope, browser evidence, screenshots and next steps. No merge or deployment. The Phase 9 checkpoint below describes V1 and is historical.

## Phase 9 checkpoint (owner-directed, 2 November 2026)

The current owner request supersedes the historical one-tool-at-a-time restriction for this phase. Phase 9 is **Testing / In Progress**, not complete or approved for launch. All 12 calculator routes now have initial implementations and representative passing tests. Chromium browser checks and genuine desktop/mobile screenshots are available, but broader formula, keyboard, visual and cross-browser verification remains. See `PHASE_9_FEATURE_CHECKLIST.md` for per-feature status, test evidence, limitations and continuation steps; see `PHASE_9_CALCULATOR_PLAN.md` for the audit and plan. The older portfolio figures below are historical and do not account for this in-progress work.

## 1. Status definitions

These statuses match the proposed registry model in `TOOL_REGISTRY_ARCHITECTURE.md`.

| Status | Meaning | Public card/route? |
|---|---|---:|
| `live` | Fully implemented, content-complete and verified against the tool exit gate. | Yes, subject to the separate site launch/indexing gate |
| `in-development` | Approved and actively being built; not yet releasable. | No |
| `planned` | Candidate recorded for a future phase. It is not implemented and must not be advertised as available. | No |
| `deprecated` | Still controlled temporarily but replaced or scheduled for retirement. | Only under an explicit migration plan |
| `retired` | Historical record retained so its ID and slug are never reused. | No |

Additional labels such as **research/planning**, **pending approval**, **implemented — awaiting owner approval**, **deferred** and **gated** are workflow notes, not registry statuses. In particular, a tool in research/planning remains `planned` and must not receive a public card or route.

## 2. Portfolio summary

| Group | Count | Notes |
|---|---:|---|
| Implemented in repository (`live`) | 7 | Tools listed in Section 4 (now including PDF Merger, merged by the owner). |
| Implemented — awaiting owner approval | 1 | PDF to Word Converter; implemented and QA-complete for review, but not owner-approved, live, deployed or indexed. |
| In research/planning | 0 | No next tool may enter research/planning as active work until the owner approves PDF to Word. (A PDF Translator architecture plan was delivered in chat on 2 November 2026; it remains unimplemented and unapproved.) |
| Remaining proposed Phase 5–12 candidates (`planned`, pending approval) | 83 | The original 84-candidate list minus PDF Merger (implemented). PDF to Word is an owner-directed addition beyond that list. |
| Projected total after Phase 12 | 91 | Only if every candidate passes its individual quality gate (7 implemented + PDF to Word if approved + 83 remaining). |
| Additional tools needed to exceed 100 | 11+ | Reserved for evidence-led Phase 13; candidates not selected yet. |

> Reaching exactly 100 from the current six would require 94 net-new tools. Exceeding 100 requires at least 95 net-new tools. The requested Phases 5–12 contain 84, so the honest projected total is 90—not 100+.

## 3. Platform foundation status

| Work item | Status | Evidence / next step |
|---|---|---|
| Current inline catalog | Implemented for eight repository tools | `lib/catalog.ts`; seven implemented tools plus PDF to Word under the approved narrow integration. Suitable for the current homepage but not the 90-tool target. |
| Scalable tool registry | **Designed, not implemented** | Proposal in `TOOL_REGISTRY_ARCHITECTURE.md`; this remains a separate future migration and was not bundled into PDF Merger. |
| Generated tool routes | **Not started** | Current eight routes are maintained individually under `app/tools/*/page.tsx`. |
| `/tools` directory | Implemented (Phase 2) | Explorer with search and category filters lives at `/tools`; registry-driven generation is still future work. |
| Generated category pages | Implemented (Phase 2, different route) | Category pages live at `/category/{categorySlug}`; the proposed `/tools/category/...` shape was not adopted. |
| Global registry search | **Partial precursor only** | Current homepage search/filter works for eight repository tools; ranking, aliases and dedicated directory search are not implemented. |
| Functional category filters | **Partial precursor only** | Current category buttons work for the existing display categories; canonical category IDs/slugs are not implemented. |
| Featured tools | **Not started** | Must be labeled “Featured” until real popularity data exists. |
| Popular tools from real data | **Blocked by design decision** | No approved aggregate usage-data source currently exists; do not fabricate rankings. |
| Recently added | **Not started** | Requires a trustworthy `addedAt` policy in the registry migration. |
| Relevant related tools | **Partial precursor only** | Current shell lists other tools, but not the proposed curated/tag-scored relevance model. |
| Account-free favorites | Implemented (Phase 2) | “Saved tools” stores tool slugs in browser local storage only. |
| Per-tool privacy disclosure | **Partial precursor only** | Current tools are browser-processed; the shell must become per-tool before any server or AI tool. |

## 4. Implemented tools

The proposed IDs below use the existing slug values. During registry migration they must be frozen as immutable IDs; URLs must remain unchanged.

| ID | Tool | Current URL | Current category | Proposed category | Registry status | Verification state |
|---|---|---|---|---|---|---|
| `word-counter` | Word Counter | `/tools/word-counter` | Text | Text & Writing Tools | `live` | Implemented; included in existing unit/browser suites. |
| `case-converter` | Case Converter | `/tools/case-converter` | Text | Text & Writing Tools | `live` | Implemented; included in existing unit/browser suites. |
| `json-formatter` | JSON Formatter | `/tools/json-formatter` | Developer | Developer Tools | `live` | Implemented; included in existing unit/browser suites. |
| `password-generator` | Password Generator | `/tools/password-generator` | Security | Security & Privacy Tools | `live` | Implemented with cryptographically secure generation; included in existing tests. |
| `qr-generator` | QR Code Generator | `/tools/qr-generator` | Image & QR | QR & Barcode Tools | `live` | Implemented locally in the browser; included in existing tests. |
| `image-compressor` | Image Compressor | `/tools/image-compressor` | Image & QR | Image Tools | `live` | Implemented with bounded canvas processing; included in existing tests. |
| `merge-pdf` | PDF Merger | `/tools/merge-pdf` | PDF Tools | PDF Tools | `live` | Browser-only merger with page selection, previews and password unlock; merged into `main` by the owner. |

### Implemented — awaiting owner approval

| ID | Tool | Current URL | Current category | Proposed category | Workflow status | Verification state |
|---|---|---|---|---|---|---|
| `pdf-to-word` | PDF to Word Converter | `/tools/pdf-to-word` | PDF Tools | PDF Tools | **implemented — awaiting owner approval** | 100% on-device conversion (PDF.js extraction → structure model → `docx` OOXML; optional self-hosted tesseract.js OCR in English/Hindi/Gujarati). Two modes, page ranges, preserve toggles (images/tables/headings+lists/hyperlinks/headers+footers), custom output filenames, live original-PDF preview + real generated-DOCX preview (`docx-preview`) with side-by-side compare, batch dashboard (retry failed, ZIP, batch report, clear completed), per-file quality reports (no accuracy percentages), opt-in browser-local history (IndexedDB; converted DOCX only). Implemented on `arena/dc1f7709-quickkit` for owner review. Not owner-approved, live, deployed or indexed. |

### Current regression evidence

The most recent full run, recorded for the PDF to Word V2 owner review on 2 November 2026, is:

- Vitest: **138/138 passed** (including DOCX generation/structure tests that unzip and verify the OOXML output, page-range/filename parsers, preserve-option structuring, and real DOCX hyperlink relationships).
- Chromium Playwright suite: **259/259 passed** in the sandbox browser environment — the tool's own spec has 11 tests (inspection honesty, clean/layout conversion, on-device OCR, ZIP, live PDF+DOCX preview with compare/zoom/keyboard + axe inside the dialog, page-range conversion, hyperlink round-trip, batch dashboard actions, IndexedDB history across reload, mobile tabbed preview) plus site-wide axe/overflow sweeps at 9 widths.
- Production build: passed with eight repository tool routes and 34 static pages.
- Format check, ESLint and TypeScript: passed.
- Production dependency audit: **0 vulnerabilities**.

Firefox/WebKit execution is not claimed for that sandbox run; the Playwright config covers the PDF tool specs there in CI (the OCR test is Chromium-only). Any later code change requires a fresh full run; these numbers must not be copied forward as evidence for new work.

## 5. Proposed Phase 5 — PDF Tools

**Phase status:** One tool is at owner review — **PDF Merger is implemented — awaiting owner approval. Every other Phase 5 tool is blocked until the owner personally approves PDF Merger.**
**Candidate count:** 10  
**Projected cumulative total:** 16

| # | Tool | Proposed ID | Proposed slug | Status |
|---:|---|---|---|---|
| 1 | PDF Merger | `merge-pdf` | `merge-pdf` | **implemented — awaiting owner approval** |
| 2 | Split PDF | `split-pdf` | `split-pdf` | `planned` |
| 3 | Organize PDF | `organize-pdf` | `organize-pdf` | `planned` |
| 4 | Rotate PDF | `rotate-pdf` | `rotate-pdf` | `planned` |
| 5 | Images to PDF | `images-to-pdf` | `images-to-pdf` | `planned` |
| 6 | PDF to Images | `pdf-to-images` | `pdf-to-images` | `planned` |
| 7 | Extract PDF Text | `extract-pdf-text` | `extract-pdf-text` | `planned` |
| 8 | Add PDF Page Numbers | `add-pdf-page-numbers` | `add-pdf-page-numbers` | `planned` |
| 9 | Add PDF Watermark | `add-pdf-watermark` | `add-pdf-watermark` | `planned` |
| 10 | PDF Metadata Editor | `pdf-metadata-editor` | `pdf-metadata-editor` | `planned` |

**Next gate:** Owner review of the preview, screenshots and `docs/pdf-merger/QA_REPORT.md`. Keep PDF Merger at **implemented — awaiting owner approval** and stop; do not begin Split PDF or any other tool until the owner personally approves PDF Merger.

## 6. Proposed Phase 6 — Image Tools

**Phase status:** Planned — pending approval and completion of earlier phases  
**Candidate count:** 10  
**Projected cumulative total:** 26

| # | Tool | Proposed ID | Proposed slug | Status |
|---:|---|---|---|---|
| 1 | Crop Image | `crop-image` | `crop-image` | `planned` |
| 2 | Resize Image | `resize-image` | `resize-image` | `planned` |
| 3 | Rotate & Flip Image | `rotate-flip-image` | `rotate-flip-image` | `planned` |
| 4 | Image Filters & Adjustments | `image-filters` | `image-filters` | `planned` |
| 5 | Color Picker from Image | `color-picker-from-image` | `color-picker-from-image` | `planned` |
| 6 | Image Metadata Viewer | `image-metadata-viewer` | `image-metadata-viewer` | `planned` |
| 7 | Remove Image Metadata | `remove-image-metadata` | `remove-image-metadata` | `planned` |
| 8 | Favicon Generator | `favicon-generator` | `favicon-generator` | `planned` |
| 9 | Watermark Image | `watermark-image` | `watermark-image` | `planned` |
| 10 | Blur or Pixelate Image | `blur-pixelate-image` | `blur-pixelate-image` | `planned` |

## 7. Proposed Phase 7 — Text & Writing Tools

**Phase status:** Planned — pending approval and completion of earlier phases  
**Candidate count:** 12  
**Projected cumulative total:** 38

| # | Tool | Proposed ID | Proposed slug | Status |
|---:|---|---|---|---|
| 1 | Remove Duplicate Lines | `remove-duplicate-lines` | `remove-duplicate-lines` | `planned` |
| 2 | Sort Lines | `sort-lines` | `sort-lines` | `planned` |
| 3 | Find and Replace Text | `find-and-replace-text` | `find-and-replace-text` | `planned` |
| 4 | Text Diff Checker | `text-diff` | `text-diff` | `planned` |
| 5 | Remove Extra Spaces | `remove-extra-spaces` | `remove-extra-spaces` | `planned` |
| 6 | Reverse Text | `reverse-text` | `reverse-text` | `planned` |
| 7 | Repeat Text | `repeat-text` | `repeat-text` | `planned` |
| 8 | Lorem Ipsum Generator | `lorem-ipsum-generator` | `lorem-ipsum-generator` | `planned` |
| 9 | Random Word Generator | `random-word-generator` | `random-word-generator` | `planned` |
| 10 | Slug Generator | `slug-generator` | `slug-generator` | `planned` |
| 11 | Invisible Character Inspector | `invisible-character-inspector` | `invisible-character-inspector` | `planned` |
| 12 | Text to Speech | `text-to-speech` | `text-to-speech` | `planned` |

## 8. Proposed Phase 8 — Developer Tools

**Phase status:** Planned — pending approval and completion of earlier phases  
**Candidate count:** 14  
**Projected cumulative total:** 52

| # | Tool | Proposed ID | Proposed slug | Status |
|---:|---|---|---|---|
| 1 | Base64 Encoder / Decoder | `base64-encoder-decoder` | `base64-encoder-decoder` | `planned` |
| 2 | URL Encoder / Decoder | `url-encoder-decoder` | `url-encoder-decoder` | `planned` |
| 3 | JWT Decoder | `jwt-decoder` | `jwt-decoder` | `planned` |
| 4 | UUID Generator | `uuid-generator` | `uuid-generator` | `planned` |
| 5 | Hash Generator | `hash-generator` | `hash-generator` | `planned` |
| 6 | Regex Tester | `regex-tester` | `regex-tester` | `planned` |
| 7 | Timestamp Converter | `timestamp-converter` | `timestamp-converter` | `planned` |
| 8 | Color Converter | `color-converter` | `color-converter` | `planned` |
| 9 | CSS Gradient Generator | `css-gradient-generator` | `css-gradient-generator` | `planned` |
| 10 | SQL Formatter | `sql-formatter` | `sql-formatter` | `planned` |
| 11 | XML Formatter | `xml-formatter` | `xml-formatter` | `planned` |
| 12 | YAML ↔ JSON Converter | `yaml-json-converter` | `yaml-json-converter` | `planned` |
| 13 | CSV ↔ JSON Converter | `csv-json-converter` | `csv-json-converter` | `planned` |
| 14 | Cron Expression Parser | `cron-expression-parser` | `cron-expression-parser` | `planned` |

## 9. Proposed Phase 9 — Calculators & Converters

**Phase status:** Planned — pending approval and completion of earlier phases  
**Candidate count:** 12  
**Projected cumulative total:** 64

| # | Tool | Proposed ID | Proposed slug | Status |
|---:|---|---|---|---|
| 1 | Unit Converter | `unit-converter` | `unit-converter` | `planned` |
| 2 | Percentage Calculator | `percentage-calculator` | `percentage-calculator` | `planned` |
| 3 | Loan Calculator | `loan-calculator` | `loan-calculator` | `planned` |
| 4 | Compound Interest Calculator | `compound-interest-calculator` | `compound-interest-calculator` | `planned` |
| 5 | BMI Calculator | `bmi-calculator` | `bmi-calculator` | `planned` |
| 6 | Age Calculator | `age-calculator` | `age-calculator` | `planned` |
| 7 | Date Difference Calculator | `date-difference-calculator` | `date-difference-calculator` | `planned` |
| 8 | Time Duration Calculator | `time-duration-calculator` | `time-duration-calculator` | `planned` |
| 9 | Tip & Bill Split Calculator | `tip-calculator` | `tip-calculator` | `planned` |
| 10 | Discount & Tax Calculator | `discount-tax-calculator` | `discount-tax-calculator` | `planned` |
| 11 | Roman Numeral Converter | `roman-numeral-converter` | `roman-numeral-converter` | `planned` |
| 12 | Number Base Converter | `number-base-converter` | `number-base-converter` | `planned` |

## 10. Proposed Phase 10 — QR & Barcode Tools

**Phase status:** Planned — pending approval and completion of earlier phases  
**Candidate count:** 10  
**Projected cumulative total:** 74

| # | Tool | Proposed ID | Proposed slug | Status |
|---:|---|---|---|---|
| 1 | Wi-Fi QR Generator | `wifi-qr-generator` | `wifi-qr-generator` | `planned` |
| 2 | vCard QR Generator | `vcard-qr-generator` | `vcard-qr-generator` | `planned` |
| 3 | Email QR Generator | `email-qr-generator` | `email-qr-generator` | `planned` |
| 4 | SMS QR Generator | `sms-qr-generator` | `sms-qr-generator` | `planned` |
| 5 | Phone QR Generator | `phone-qr-generator` | `phone-qr-generator` | `planned` |
| 6 | Location QR Generator | `location-qr-generator` | `location-qr-generator` | `planned` |
| 7 | Event QR Generator | `event-qr-generator` | `event-qr-generator` | `planned` |
| 8 | Batch QR Generator | `batch-qr-generator` | `batch-qr-generator` | `planned` |
| 9 | QR Code Scanner | `qr-code-scanner` | `qr-code-scanner` | `planned` |
| 10 | Barcode Generator | `barcode-generator` | `barcode-generator` | `planned` |

## 11. Proposed Phase 11 — Security & Privacy Tools

**Phase status:** Planned — pending approval, threat modeling and completion of earlier phases  
**Candidate count:** 8  
**Projected cumulative total:** 82

| # | Tool | Proposed ID | Proposed slug | Status |
|---:|---|---|---|---|
| 1 | Password Strength Checker | `password-strength-checker` | `password-strength-checker` | `planned` |
| 2 | Passphrase Generator | `passphrase-generator` | `passphrase-generator` | `planned` |
| 3 | File Hash Verifier | `file-hash-verifier` | `file-hash-verifier` | `planned` |
| 4 | Text Encryptor | `text-encryptor` | `text-encryptor` | `planned` |
| 5 | Secure Random Number Generator | `secure-random-number-generator` | `secure-random-number-generator` | `planned` |
| 6 | Random Picker | `random-picker` | `random-picker` | `planned` |
| 7 | Sensitive Text Redactor | `sensitive-text-redactor` | `sensitive-text-redactor` | `planned` |
| 8 | Browser Fingerprint Viewer | `browser-fingerprint-viewer` | `browser-fingerprint-viewer` | `planned` |

## 12. Proposed Phase 12 — AI-Powered Tools

**Phase status:** Planned — each candidate requires a separate model, privacy, quality, license and cost go/no-go review  
**Candidate count:** 8  
**Projected cumulative total:** 90

| # | Tool | Proposed ID | Proposed slug | Status |
|---:|---|---|---|---|
| 1 | Background Remover | `background-remover` | `background-remover` | `planned` |
| 2 | OCR Text Extractor | `ocr-text-extractor` | `ocr-text-extractor` | `planned` |
| 3 | Image Caption Generator | `image-caption-generator` | `image-caption-generator` | `planned` |
| 4 | Text Summarizer | `text-summarizer` | `text-summarizer` | `planned` |
| 5 | Grammar Checker | `grammar-checker` | `grammar-checker` | `planned` |
| 6 | Paraphraser | `paraphraser` | `paraphraser` | `planned` |
| 7 | Translator | `translator` | `translator` | `planned` |
| 8 | Image Upscaler | `image-upscaler` | `image-upscaler` | `planned` |

## 13. Deferred or specially gated ideas — not counted

These are **not** part of the 84-candidate count and must not receive public cards.

| Idea | Planning state | Reason |
|---|---|---|
| Compress PDF | Deferred pending engine spike | A trustworthy browser implementation must demonstrate meaningful size reduction and acceptable quality loss. |
| Protect PDF | Deferred pending engine/security review | Standard browser PDF manipulation alone does not provide production encryption. |
| Unlock/password-bypass PDF | Not proposed | QUICKKIT should not present password bypassing as a feature. Handling a user-supplied password would need a separate security design. |
| Cryptographic PDF signing | Deferred | Certificate trust and signature validity are separate from placing a visual signature. |
| Live currency converter | Deferred | Requires a licensed rate source, timestamps, caching, availability and financial-disclaimer policy. |
| Breach/password exposure lookup | Deferred | Requires a dedicated privacy/security design and approved data source. |
| TOTP/authenticator secret tools | Deferred | Secret handling creates account-compromise risk and needs a dedicated security review. |

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

| Date | Change |
|---|---|
| 1 November 2026 | Initial expansion tracker created. Six implemented tools recorded; 84 candidates marked `planned` pending approval; Phase 5 not started. |
| 1 November 2026 | Strict one-tool-at-a-time policy adopted. PDF Merger selected as the sole active tool; `PDF_MERGER_PLAN.md` completed. Status remains `planned` with workflow note “research/planning, awaiting approval”; no implementation started. |
| 1 November 2026 | Owner approved the PDF Merger plan with mandatory browser-only processing, explicit actionable errors/no silent skipping and a polished complete mobile workflow. PDF Merger became the sole active implementation. |
| 1 November 2026 | Local PDF Merger work was backed up, integrated directly onto pushed baseline `db4e906`, committed at `070bc77` and pushed to `arena/eb17e485-quickkit`/PR #2. No merge into `main` was performed. |
| 1 November 2026 | Final PDF Merger QA and owner-review handoff completed in `docs/pdf-merger/QA_REPORT.md`. Status set to **implemented — awaiting owner approval**; all other tools remain blocked. |
| 2 November 2026 | PDF Merger merged into `main` by the owner (via PR #4/#5) and moved to implemented (`live`). Portfolio now counts 7 implemented tools. |
| 2 November 2026 | PDF to Word Converter implemented at the owner's direction on `arena/dc1f7709-quickkit`: on-device PDF→DOCX with Original Layout + Clean Editable modes, batch queue with ZIP/batch report, optional self-hosted OCR for scanned pages, honest per-file errors (password/corrupt/limits), and conversion notes instead of silent loss. Added `'wasm-unsafe-eval'` to the CSP `script-src` (permits WebAssembly compilation for OCR; does not enable JS eval). Full gates green (129 unit, 253 Chromium e2e, build, audit). Status: **implemented — awaiting owner approval**; do not merge or start another tool until the owner approves. |
| 2 November 2026 | **PDF to Word V2** built on the same PR #6 branch at the owner's direction, preserving all V1 behaviour: original-PDF preview (lazy pdfjs pages/thumbnails, zoom stepped from effective on-screen zoom, rotate-for-view, fullscreen, keyboard), preview of the actual generated DOCX (`docx-preview`, lazy-loaded), desktop side-by-side compare + mobile tabs, page-range conversion, hyperlink extraction, preserve toggles, OCR languages (eng/hin/guj), custom output filenames, batch dashboard with counts/retry-failed/batch report/clear-completed/batch banner, per-file quality report (source/converted pages, extraction status, images/tables/links kept, OCR usage, honest content-loss verdict), and opt-in browser-local history (IndexedDB, session/24h/7d, DOCX only). Gates: 138 unit, 259 Chromium e2e, 34-page build, 0 audit findings. Still **awaiting owner approval** — not merged, live, deployed or indexed. |

## Phase 9 V2 continuation — 2 November 2026

In progress, not released: see `PHASE_9_V2_CHECKLIST.md` for per-tool status, financial/calendar additions, independent sample calculations, production Chromium results and outstanding work. Full per-feature verification of all 12 remains pending. No merge or deployment.

### Phase 9 V2 populated preview checkpoint

All 12 calculator routes have populated mobile and desktop Chromium screenshots indexed in `docs/phase-9-v2-final-evidence/README.md`; 319 Chromium regression tests, 188 unit tests, lint, typecheck and production build passed on this application code. Feature and cross-browser coverage remain incomplete; see `PHASE_9_V2_CHECKLIST.md`. Not merged or deployed.

---

## Image Tools workstream (separate branch, merged into the shared tree on 2 November 2026)

This section records the Image Tools workstream on `arena/82ce86c2-quickkit` / PR #8.
It is **append-only**: nothing above (PDF Merger, PDF to Word, Phase 9, the portfolio
counts and the change log) was edited, re-scored or re-dated by this workstream.

| # | Tool | Route | Status | Branch | Notes |
|---|---|---|---|---|---|
| 1 | **Image Resizer** | `/tools/image-resizer` | ✅ **Done — owner approved 1 Nov 2026** (frozen) | `feature/image-resizer` | Full local editor: exact/percentage/longest-side sizing, 26 presets, crop, free-angle rotation, flips, colour adjustments, compare, DPI/print, per-image undo/redo, batch + ZIP, metadata panel. `docs/FEATURE_IMAGE_RESIZER.md`, `docs/QA_IMAGE_RESIZER_AUDIT.md` |
| 2 | **Image Compressor** | `/tools/image-compressor` | ✅ **Done (v2) — owner approved 1 Nov 2026** (frozen) | `feature/image-compressor` | Quality **and** exact KB/MB target modes, JPEG/PNG/WebP (+AVIF where supported), per-image overrides, split/side-by-side compare, transparency handling, batch + ZIP, Stop/Retry. `docs/FEATURE_IMAGE_COMPRESSOR.md`, `docs/QA_IMAGE_COMPRESSOR_AUDIT.md` |
| 3 | **Image Cropper** | `/tools/image-cropper` | ✅ **Done — verified, awaiting owner sign-off** | `feature/image-cropper` | New tool: freeform + fixed ratios, 18 social presets, custom width/height, circle and square masks, rotate/flip, 25–400 % zoom with pan and “crop to visible area”, 1:1 crop-pixel export, JPEG/PNG/WebP with quality, per-image batch crops + ZIP, EXIF auto-correction, 50-step undo/redo. `docs/FEATURE_IMAGE_CROPPER.md`, `docs/QA_IMAGE_CROPPER_AUDIT.md` |

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

| # | Tool | Route | Status | Branch | Notes |
|---|---|---|---|---|---|
| 1 | **Image & PDF Converter** | `/tools/image-converter` | 🟡 **Implemented, awaiting owner approval** | `feature/image-converter` | Three modes in one tool: image→image (JPG, PNG, WEBP, AVIF, GIF, BMP, TIFF), images→PDF (single/multi, A4/A3/Letter/Legal/custom, portrait/landscape, margins, contain/cover/fill, page background, live layout preview) and PDF→image (JPG/PNG/WEBP, page ranges, 72–300 DPI, page thumbnails, individual downloads, ZIP). Advanced settings: quality (lossy only), transparency keep/flatten with background, resize by percentage/exact/longest side, EXIF orientation handling, TIFF LZW/uncompressed, per-file format override, filename suffix, real before/after preview. Batch queue with real dimensions, page counts, per-file status, retry, cancel, clear, per-file and ZIP downloads. `docs/FEATURE_IMAGE_CONVERTER.md` |

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
