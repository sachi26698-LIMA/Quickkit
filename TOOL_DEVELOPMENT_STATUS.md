# QUICKKIT Tool Development Status

**Last updated:** 1 November 2026  
**Purpose:** Single status tracker for implemented tools, approved expansion candidates and deferred ideas.  
**Public launch state:** Not deployed or indexed by this roadmap work. “Live” below means implemented and verified in the repository; it does **not** mean publicly launched on a production domain.  
**Development policy:** Strictly one tool at a time. The owner explicitly directed this branch to complete the QR Code Generator (tool #1 in the approved 20-tool QR/barcode sequence); do not begin QR Scanner or any later roadmap tool until the QR Generator is presented and personally approved. PDF Merger remains separately **implemented — awaiting owner approval**; this QR task does not approve or supersede its review gate.

**Current active tool:** QR Code Generator — expanded implementation and QA are complete on `arena/9ad31977-quickkit`, pending owner review. The existing `qr-generator` route is already live in the mainline baseline; this branch adds the requested formats, customization, local scan checks and exports but is not released or owner-approved. No later roadmap routes or placeholders were added.

**Branch note:** Arena requires this session to remain on `arena/9ad31977-quickkit`; `main` was not modified. The originally requested `feature/qr-generator` branch was not created.

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
| Implemented in repository (`live` mainline baseline) | 6 | Existing tools listed in Section 4; the QR entry reflects the previously shipped baseline, not this branch's expanded implementation. |
| Implemented — awaiting owner approval | 1 | PDF Merger only; its independent review state is unchanged. |
| Current branch enhancement — awaiting owner review | 1 | Expanded QR Code Generator under the existing `qr-generator` ID/route; this is not an additional tool in portfolio totals. |
| In research/planning | 0 | No later roadmap tool may enter active work until the QR Code Generator is presented and approved. The PDF Merger gate remains separate. |
| Remaining proposed Phase 5–12 candidates (`planned`, pending approval) | 83 | The original 84-candidate list minus PDF Merger, which has moved to owner review. The QR enhancement reuses an existing tool ID and does not change this count. |
| Projected total after Phase 12 | 90 | Only if every candidate passes its individual quality gate. |
| Additional tools needed to exceed 100 | 11+ | Reserved for evidence-led Phase 13; candidates not selected yet. |

> Reaching exactly 100 from the current six would require 94 net-new tools. Exceeding 100 requires at least 95 net-new tools. The requested Phases 5–12 contain 84, so the honest projected total is 90—not 100+.

## 3. Platform foundation status

| Work item | Status | Evidence / next step |
|---|---|---|
| Current inline catalog | Implemented for seven repository tools | `lib/catalog.ts`; six previously implemented tools plus PDF Merger under the approved narrow integration. Suitable for the current homepage but not the 90-tool target. |
| Scalable tool registry | **Designed, not implemented** | Proposal in `TOOL_REGISTRY_ARCHITECTURE.md`; this remains a separate future migration and was not bundled into PDF Merger. |
| Generated tool routes | **Not started** | Current seven routes are maintained individually under `app/tools/*/page.tsx`. |
| `/tools` directory | **Not started** | Proposed as part of the registry foundation. |
| Generated category pages | **Not started** | Proposed route: `/tools/category/{categorySlug}`. |
| Global registry search | **Partial precursor only** | Current homepage search/filter works for seven repository tools; ranking, aliases and dedicated directory search are not implemented. |
| Functional category filters | **Partial precursor only** | Current category buttons work for the existing display categories; canonical category IDs/slugs are not implemented. |
| Featured tools | **Not started** | Must be labeled “Featured” until real popularity data exists. |
| Popular tools from real data | **Blocked by design decision** | No approved aggregate usage-data source currently exists; do not fabricate rankings. |
| Recently added | **Not started** | Requires a trustworthy `addedAt` policy in the registry migration. |
| Relevant related tools | **Partial precursor only** | Current shell lists other tools, but not the proposed curated/tag-scored relevance model. |
| Account-free favorites | **Not started** | Requires approval to store tool IDs only in browser local storage. |
| Per-tool privacy disclosure | **Partial precursor only** | Current tools are browser-processed; the shell must become per-tool before any server or AI tool. |

## 4. Implemented tools

The proposed IDs below use the existing slug values. During registry migration they must be frozen as immutable IDs; URLs must remain unchanged.

| ID | Tool | Current URL | Current category | Proposed category | Registry status | Verification state |
|---|---|---|---|---|---|---|
| `word-counter` | Word Counter | `/tools/word-counter` | Text | Text & Writing Tools | `live` | Implemented; included in existing unit/browser suites. |
| `case-converter` | Case Converter | `/tools/case-converter` | Text | Text & Writing Tools | `live` | Implemented; included in existing unit/browser suites. |
| `json-formatter` | JSON Formatter | `/tools/json-formatter` | Developer | Developer Tools | `live` | Implemented; included in existing unit/browser suites. |
| `password-generator` | Password Generator | `/tools/password-generator` | Security | Security & Privacy Tools | `live` | Implemented with cryptographically secure generation; included in existing tests. |
| `qr-generator` | QR Code Generator | `/tools/qr-generator` | Image & QR | QR & Barcode Tools | `live` (mainline baseline) | The existing text/URL QR route remains live. The expanded implementation on `arena/9ad31977-quickkit` is pending owner review; see the current branch QA evidence below. |
| `image-compressor` | Image Compressor | `/tools/image-compressor` | Image & QR | Image Tools | `live` | Implemented with bounded canvas processing; included in existing tests. |

### Implemented — awaiting owner approval

| ID | Tool | Current URL | Current category | Proposed category | Workflow status | Verification state |
|---|---|---|---|---|---|---|
| `merge-pdf` | PDF Merger | `/tools/merge-pdf` | PDF Tools | PDF Tools | **implemented — awaiting owner approval** | Browser-only implementation committed on `arena/eb17e485-quickkit`; final QA evidence is in `docs/pdf-merger/QA_REPORT.md`. Not owner-approved, live, deployed or indexed. |

### Current branch QA evidence — QR Code Generator

Production-quality verification for the expanded generator on `arena/9ad31977-quickkit` was rerun on 1 November 2026:

- Vitest: **126/126 passed** across 12 files.
- Chromium Playwright: **151/151 passed** against the production build using Chromium 153; includes the full suite for existing tools.
- QR-specific browser tests: **5/5 passed**. All 11 content types decode locally; PNG and SVG exports were decoded, and the PDF export was rendered with PDF.js then decoded. Batch ZIP entries independently decode. Gradient fill, all 9 dot/finder-style combinations, foreground/background colors, sizes, quiet zones, all error-correction levels, a centered logo and image-copy clipboard output were exercised.
- Accessibility and responsive QA: axe checks passed; QR overflow checks passed at 320, 360, 375, 390, 430, 768, 1024, 1366 and 1440 px.
- ESLint, Prettier format check and TypeScript typecheck: passed.
- Production dependency audit (`npm audit --omit=dev`): **0 vulnerabilities**.
- Production build: passed with seven tool routes and 19 static pages.
- Privacy check: browser interaction tests confirmed QR input is not transmitted.
- Screenshots: `docs/qr-generator/screenshots/qr-generator-desktop.png`, `qr-generator-mobile.png`, `qr-generator-batch.png` and `qr-generator-styles.png` (gradient, dot modules, circular finder corners, logo and local scan pass).
- Live local preview: `http://localhost:3001/tools/qr-generator`. It is not a public deployment.

The sandbox's checked-in Playwright browser was unavailable, so the Chromium suite used a temporary local Chromium 153 binary with Playwright 1.64.1; the custom test config and browser binary are not part of the repository. Firefox/WebKit execution is not claimed. This QA evidence applies to the current branch implementation, but the tool remains **pending owner approval** and must not be marked live, released or deployed from this work alone.

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

**Next gate:** Owner review of the preview, screenshots and `docs/pdf-merger/QA_REPORT.md`. Keep PDF Merger at **implemented — awaiting owner approval**; do not begin Split PDF or another Phase 5 candidate until the owner personally approves PDF Merger. The owner's separately directed QR Generator work does not change this PDF gate.

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

**Phase status:** The candidate inventory below remains planned. The owner has separately directed the existing QR Code Generator to be expanded as roadmap tool #1 on the active branch; its release is pending owner review, and no later QR/barcode tool may begin until it is approved. **Candidate count:** 10 unique Phase 10 candidates (unchanged). **Projected cumulative total:** 74.

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

### Owner-approved QR & Barcode 20-tool execution sequence

This ordered sequence is the owner's active prioritization for QR/barcode work and takes precedence over the older Phase 10 execution order above. It is **not additive** to Phase 5–12 candidate totals: several items overlap with the existing QR route or Phase 10 inventory. Features available inside tool #1 do not create separate routes or mark later standalone tools complete. Only #1 is active; #2–20 remain blocked until #1 is personally approved.

| # | Tool | Sequence state | Notes |
|---:|---|---|---|
| 1 | QR Code Generator | **Implemented on current branch — awaiting owner approval** | Existing `/tools/qr-generator` route, expanded for this task. |
| 2 | QR Code Scanner | `planned — blocked` | Do not start before #1 approval. |
| 3 | QR Code Decoder | `planned — blocked` | Generated-code verification in #1 is not a standalone decoder. |
| 4 | QR Code Customizer | `planned — blocked` | Customization is included within #1; no separate route was added. |
| 5 | Bulk QR Generator | `planned — blocked` | Batch ZIP is included within #1; no separate route was added. |
| 6 | Wi-Fi QR Generator | `planned — blocked` | Wi-Fi payloads are included within #1; no separate route was added. |
| 7 | vCard QR Generator | `planned — blocked` | vCard payloads are included within #1; no separate route was added. |
| 8 | WhatsApp QR Generator | `planned — blocked` | WhatsApp payloads are included within #1; no separate route was added. |
| 9 | Location QR Generator | `planned — blocked` | Location payloads are included within #1; no separate route was added. |
| 10 | Event QR Generator | `planned — blocked` | Calendar-event payloads are included within #1; no separate route was added. |
| 11 | Barcode Generator | `planned — blocked` | Not implemented. |
| 12 | Barcode Scanner | `planned — blocked` | Not implemented. |
| 13 | Barcode Decoder | `planned — blocked` | Not implemented. |
| 14 | Bulk Barcode Generator | `planned — blocked` | Not implemented. |
| 15 | Barcode Label Maker | `planned — blocked` | Not implemented. |
| 16 | QR Code with Logo | `planned — blocked` | Logo support is included within #1; no separate route was added. |
| 17 | Payment QR Generator | `planned — blocked` | Compatible UPI intent generation is included within #1; payment processing is not provided. |
| 18 | Restaurant Menu QR | `planned — blocked` | Not implemented. |
| 19 | Review & Feedback QR | `planned — blocked` | Not implemented. |
| 20 | QR Business Card Maker | `planned — blocked` | Not implemented. |

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

PDF Merger proceeded under the owner's explicit narrow-catalog integration decision; the full registry migration remains separate and does not block its owner review. The QR Generator expansion was separately directed on the current Arena branch. Its 20-step execution sequence is tracked above; only #1 has been built, and the next QR/barcode tool remains gated on the owner's approval of #1.

- [ ] Personally approve or request changes to the expanded QR Code Generator before QR/barcode tool #2 starts.
- [ ] Separately approve or request changes to PDF Merger before another Phase 5 PDF candidate starts; QR review does not change this gate.
- [ ] Approve the registry architecture and URL model.
- [ ] Approve the remaining candidate scope and the resulting 90-tool total, with Phase 13 reserved for 100+.
- [ ] Approve the eight-category taxonomy and remapping of the existing tools.
- [ ] Approve the remaining Phase 5 PDF list and deferral of Compress/Protect pending technical evidence.
- [ ] Decide whether account-free favorites may store tool IDs in local storage.
- [ ] Decide whether to show editorial “Featured” tools while keeping “Popular” hidden until real aggregate data exists.
- [ ] Decide whether to build the registry foundation before the next roadmap tool after the current QR and PDF owner-review gates are resolved.

## 17. Change log

| Date | Change |
|---|---|
| 1 November 2026 | Initial expansion tracker created. Six implemented tools recorded; 84 candidates marked `planned` pending approval; Phase 5 not started. |
| 1 November 2026 | Strict one-tool-at-a-time policy adopted. PDF Merger selected as the sole active tool; `PDF_MERGER_PLAN.md` completed. Status remains `planned` with workflow note “research/planning, awaiting approval”; no implementation started. |
| 1 November 2026 | Owner approved the PDF Merger plan with mandatory browser-only processing, explicit actionable errors/no silent skipping and a polished complete mobile workflow. PDF Merger became the sole active implementation. |
| 1 November 2026 | Local PDF Merger work was backed up, integrated directly onto pushed baseline `db4e906`, committed at `070bc77` and pushed to `arena/eb17e485-quickkit`/PR #2. No merge into `main` was performed. |
| 1 November 2026 | Final PDF Merger QA and owner-review handoff completed in `docs/pdf-merger/QA_REPORT.md`. Status set to **implemented — awaiting owner approval**; all other tools remain blocked. |
| 1 November 2026 | At the owner's separate direction, expanded the existing QR Code Generator as tool #1 of the 20-tool QR/barcode sequence on `arena/9ad31977-quickkit`. Full local QA and screenshots completed; pending owner approval. QR Scanner and later sequence tools remain blocked; PDF Merger's separate approval status is unchanged. |
| 1 November 2026 | Added contrast-checked gradient fill, circle-dot modules and customizable finder corners; validated all nine dot/finder combinations, logo add/remove, image clipboard content, and PNG/SVG/PDF decoding. Final result: 126/126 unit tests, 151/151 Chromium E2E tests, lint, typecheck, format check and production build passed. Updated four screenshots; QR work remains pending owner approval. |
