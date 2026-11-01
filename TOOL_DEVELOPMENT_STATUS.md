# QUICKKIT Tool Development Status

**Last updated:** 1 November 2026  
**Purpose:** Single status tracker for implemented tools, approved expansion candidates and deferred ideas.  
**Public launch state:** Not deployed or indexed by this roadmap work. “Live” below means implemented and verified in the repository; it does **not** mean publicly launched on a production domain.  
**Development policy:** PDF Merger and PDF Splitter were owner-approved on 1 November 2026 after final real-file QA. The owner then authorized PDF Compressor as the third PDF tool and the sole active implementation; **no fourth PDF tool may start until PDF Compressor is completed and reviewed**. Each tool still requires implementation, tests, screenshots/demo and explicit owner approval before it can be marked live/complete.
**Current active tool:** PDF Compressor — **in development**. PDF Merger and PDF Splitter are now **owner-approved**; that approval is not a deployment or indexing approval, and neither tool has been deployed or indexed by this work. The owner requested a separate `feature/pdf-compressor` branch, but this Arena session is fixed to `arena/fe1f419c-quickkit` and cannot create, switch to or push another branch. PDF Compressor will therefore be isolated in tool-specific commits on `arena/fe1f419c-quickkit` and must not be merged into `main`.

## 1. Status definitions

These statuses match the proposed registry model in `TOOL_REGISTRY_ARCHITECTURE.md`.

| Status | Meaning | Public card/route? |
| ---------------- | ----------------------------------------------------------------------------------------------------- | -----------------------------------------------------: |
| `live` | Fully implemented, content-complete and verified against the tool exit gate. | Yes, subject to the separate site launch/indexing gate |
| `in-development` | Approved and actively being built; not yet releasable. | No |
| `planned` | Candidate recorded for a future phase. It is not implemented and must not be advertised as available. | No |
| `deprecated` | Still controlled temporarily but replaced or scheduled for retirement. | Only under an explicit migration plan |
| `retired` | Historical record retained so its ID and slug are never reused. | No |

Additional labels such as **research/planning**, **pending approval**, **implemented — awaiting owner approval**, **deferred** and **gated** are workflow notes, not registry statuses. In particular, a tool in research/planning remains `planned` and must not receive a public card or route.

## 2. Portfolio summary

| Group | Count | Notes |
| ---------------------------------------------------------------------- | ----: | ----------------------------------------------------------------------------------------------------------------------- |
| Implemented and owner-approved in repository (`live`) | 8 | Six original tools plus PDF Merger and PDF Splitter. “Live” here means repository-complete under this tracker, not publicly deployed or indexed. |
| In development                                  |     1 | PDF Compressor, explicitly authorized as the third PDF tool after Merger/Splitter approval. |
| In research/planning                                                   |     0 | No fourth PDF tool or other next tool is authorized until PDF Compressor is completed and reviewed.                             |
| Remaining proposed Phase 5–12 candidates (`planned`, pending approval) |    82 | The original 84-candidate list minus PDF Merger and PDF Splitter. PDF Compressor was previously a deferred, uncounted idea and is now an owner-authorized additional active tool. |
| Projected total after Phase 12 | 91 | Only if PDF Compressor and every remaining candidate pass their individual quality gates. |
| Additional tools needed to exceed 100 | 10+ | Reserved for evidence-led Phase 13; candidates not selected yet. |

> Reaching exactly 100 from the current eight owner-approved repository tools would require 92 net-new tools. Exceeding 100 requires at least 93 net-new tools. The remaining roadmap contains 82 planned candidates plus the now-active PDF Compressor, so the honest projected total is 91—not 100+.

## 3. Platform foundation status

| Work item | Status | Evidence / next step |
| ---------------------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Current inline catalog       | Implemented for eight repository tools | `lib/catalog.ts`; six previously implemented tools plus PDF Merger and PDF Splitter under the approved narrow integrations. Suitable for the current homepage but not the 90-tool target. |
| Scalable tool registry | **Designed, not implemented** | Proposal in `TOOL_REGISTRY_ARCHITECTURE.md`; this remains a separate future migration and was not bundled into PDF Merger. |
| Generated tool routes        | **Not started**                        | Current eight routes are maintained individually under `app/tools/*/page.tsx`.                                                                                                            |
| `/tools` directory | **Not started** | Proposed as part of the registry foundation. |
| Generated category pages | **Not started** | Proposed route: `/tools/category/{categorySlug}`. |
| Global registry search       | **Partial precursor only**             | Current homepage search/filter works for eight repository tools; ranking, aliases and dedicated directory search are not implemented.                                                     |
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
| -------------------- | ------------------ | --------------------------- | ---------------- | ------------------------ | --------------- | --------------------------------------------------------------------------------- |
| `word-counter` | Word Counter | `/tools/word-counter` | Text | Text & Writing Tools | `live` | Implemented; included in existing unit/browser suites. |
| `case-converter` | Case Converter | `/tools/case-converter` | Text | Text & Writing Tools | `live` | Implemented; included in existing unit/browser suites. |
| `json-formatter` | JSON Formatter | `/tools/json-formatter` | Developer | Developer Tools | `live` | Implemented; included in existing unit/browser suites. |
| `password-generator` | Password Generator | `/tools/password-generator` | Security | Security & Privacy Tools | `live` | Implemented with cryptographically secure generation; included in existing tests. |
| `qr-generator` | QR Code Generator | `/tools/qr-generator` | Image & QR | QR & Barcode Tools | `live` | Implemented locally in the browser; included in existing tests. |
| `image-compressor` | Image Compressor | `/tools/image-compressor` | Image & QR | Image Tools | `live` | Implemented with bounded canvas processing; included in existing tests. |

### Implemented and owner-approved PDF tools

| ID | Tool | Current URL | Current category | Proposed category | Workflow status | Verification state |
| ----------- | ------------ | ------------------ | ---------------- | ----------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `merge-pdf` | PDF Merger   | `/tools/merge-pdf` | PDF Tools        | PDF Tools         | **owner-approved** | Browser-only implementation reached `main` through the owner-requested PR #2 merge at `58a81ed`, then was re-verified post-merge and exercised with multiple genuine Mozilla PDF.js corpus PDFs, reorder/page selection, download and output reopening. The owner approved it on 1 November 2026 after reviewing `docs/pdf-merger/QA_REPORT.md`, including Section 12. Approval does not authorize deployment or indexing. |
| `split-pdf` | PDF Splitter | `/tools/split-pdf` | PDF Tools        | PDF Tools         | **owner-approved** | Browser-only implementation on fixed session branch `arena/fe1f419c-quickkit` with custom ranges, visual extraction, every-N/per-page modes, named validated PDFs and local ZIP. Final real-file QA found and fixed a source-thumbnail alternative-text and reset-focus defect; permanent regression assertions now cover both. The owner approved it on 1 November 2026 after reviewing `docs/pdf-splitter/QA_REPORT.md`, including Section 12. It has not been merged into `main` by the PDF workstream, deployed or indexed. |

### Current regression evidence

The most recent full run was recorded after final real-file QA and the Splitter accessibility/focus fix:

- Temporary genuine-PDF browser QA harness: **7/7 passed**; it was removed after execution because its corpus lives outside the repository, and the durable regression assertions were folded into the permanent PDF browser specs.
- Vitest: **131/131 passed**.
- Chromium Playwright suite: **161/161 passed** in the sandbox browser environment (including Merger 5/5 and Splitter 5/5).
- Production build: passed with eight repository tool routes and 20 static pages.
- Targeted format check, ESLint and TypeScript: passed.
- Production dependency audit: **0 vulnerabilities**.

Firefox/WebKit execution is not claimed for that sandbox run. Any registry migration or later code change requires a fresh full run; these numbers must not be copied forward as evidence for new work.

## 5. Proposed Phase 5 — PDF Tools

**Phase status:** PDF Merger and PDF Splitter are **owner-approved**. PDF Compressor was moved from the deferred list by explicit owner instruction and is the sole active Phase 5 implementation. Every other Phase 5 tool remains blocked until PDF Compressor is finished and reviewed.
**Candidate count:** 10 original Phase 5 candidates, plus owner-authorized PDF Compressor from the deferred list
**Projected cumulative total:** 17 if all 11 pass their individual gates

| # | Tool | Proposed ID | Proposed slug | Status |
| --: | ------------------------ | ---------------------- | ---------------------- | ----------------------------------------- |
| 1 | PDF Merger | `merge-pdf` | `merge-pdf` | **owner-approved** |
|   2 | PDF Splitter (Split PDF) | `split-pdf`            | `split-pdf`            | **owner-approved** |
| 3 | PDF Compressor (Compress PDF) | `compress-pdf` | `compress-pdf` | **`in-development`** |
| 4 | Organize PDF | `organize-pdf` | `organize-pdf` | `planned` |
| 5 | Rotate PDF | `rotate-pdf` | `rotate-pdf` | `planned` |
| 6 | Images to PDF | `images-to-pdf` | `images-to-pdf` | `planned` |
| 7 | PDF to Images | `pdf-to-images` | `pdf-to-images` | `planned` |
| 8 | Extract PDF Text | `extract-pdf-text` | `extract-pdf-text` | `planned` |
| 9 | Add PDF Page Numbers | `add-pdf-page-numbers` | `add-pdf-page-numbers` | `planned` |
| 10 | Add PDF Watermark | `add-pdf-watermark` | `add-pdf-watermark` | `planned` |
| 11 | PDF Metadata Editor | `pdf-metadata-editor` | `pdf-metadata-editor` | `planned` |

**Next gate:** Complete PDF Compressor with real-file QA, screenshots/demo and `docs/pdf-compressor/QA_REPORT.md`, then stop for owner review. Do not merge this work into `main`, deploy/index, or begin a fourth PDF tool.

## 6. Proposed Phase 6 — Image Tools

**Phase status:** Planned — pending approval and completion of earlier phases  
**Candidate count:** 10  
**Projected cumulative total:** 26

| # | Tool | Proposed ID | Proposed slug | Status |
| --: | --------------------------- | ------------------------- | ------------------------- | --------- |
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
| --: | ----------------------------- | ------------------------------- | ------------------------------- | --------- |
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
| --: | ------------------------ | ------------------------ | ------------------------ | --------- |
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
| --: | ---------------------------- | ------------------------------ | ------------------------------ | --------- |
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
| --: | --------------------- | ----------------------- | ----------------------- | --------- |
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
| --: | ------------------------------ | -------------------------------- | -------------------------------- | --------- |
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
| --: | ----------------------- | ------------------------- | ------------------------- | --------- |
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
| ------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Compress PDF | **Moved to active Phase 5 work on 1 November 2026** | The owner explicitly authorized PDF Compressor after approving PDF Merger and PDF Splitter. It remains gated on a trustworthy browser engine demonstrating meaningful size reduction, valid reopened output and acceptable rendering quality. |
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

PDF Merger and PDF Splitter proceeded under explicit narrow-catalog integration decisions and are now owner-approved. PDF Compressor proceeds under the owner's later explicit authorization; the full registry migration remains separate.

- [x] Personally approve or request changes to PDF Merger and PDF Splitter before any next tool starts. **Approved by the owner on 1 November 2026.**
- [ ] Approve the registry architecture and URL model.
- [ ] Approve the remaining candidate scope and the resulting 90-tool total, with Phase 13 reserved for 100+.
- [ ] Approve the eight-category taxonomy and remapping of the existing tools.
- [ ] Approve the remaining Phase 5 PDF list and continued deferral of Protect PDF pending technical evidence. PDF Compressor was separately authorized by the owner on 1 November 2026.
- [ ] Decide whether account-free favorites may store tool IDs in local storage.
- [ ] Decide whether to show editorial “Featured” tools while keeping “Popular” hidden until real aggregate data exists.
- [ ] Decide whether to build the registry foundation before the next tool after PDF Merger/PDF Splitter approval.

## 17. Change log

| Date | Change |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1 November 2026 | Initial expansion tracker created. Six implemented tools recorded; 84 candidates marked `planned` pending approval; Phase 5 not started. |
| 1 November 2026 | Strict one-tool-at-a-time policy adopted. PDF Merger selected as the sole active tool; `PDF_MERGER_PLAN.md` completed. Status remains `planned` with workflow note “research/planning, awaiting approval”; no implementation started. |
| 1 November 2026 | Owner approved the PDF Merger plan with mandatory browser-only processing, explicit actionable errors/no silent skipping and a polished complete mobile workflow. PDF Merger became the sole active implementation. |
| 1 November 2026 | Local PDF Merger work was backed up, integrated directly onto pushed baseline `db4e906`, committed at `070bc77` and pushed to `arena/eb17e485-quickkit`/PR #2. No merge into `main` was performed. |
| 1 November 2026 | Final PDF Merger QA and owner-review handoff completed in `docs/pdf-merger/QA_REPORT.md`. Status set to **implemented — awaiting owner approval**; all other tools remain blocked. |
| 1 November 2026 | At the owner’s separate explicit request, PR #2 was merged into `main` at `58a81ed`. That merge is not recorded as product approval, deployment or indexing; PDF Merger remains **implemented — awaiting owner approval**.                                                                                                                 |
| 1 November 2026 | Owner explicitly superseded the one-tool gate for this workstream: PDF Merger verification and PDF Splitter development were authorized in parallel, with no third PDF tool. A clean-worktree backup was created before Splitter coding.                                                                                                   |
| 1 November 2026 | PDF Merger post-merge re-verification passed with no Merger defect found. PDF Splitter was implemented on `arena/fe1f419c-quickkit` (requested feature branches are unavailable in this fixed session), with QA in `docs/pdf-splitter/QA_REPORT.md`; both PDF tools now await owner approval and Splitter has not been merged into `main`. |
| 1 November 2026 | Final real-file QA used genuine Mozilla PDF.js corpus files for both PDF tools. The temporary seven-scenario browser harness passed 7/7 after a genuine Splitter source-thumbnail alternative-text/reset-focus defect was fixed and permanent regression assertions were added. Both PDF tools remain **implemented — awaiting owner approval**; no third PDF tool was started and no merge/deploy/index action was taken. |
| 1 November 2026 | Owner reviewed the final QA reports and approved PDF Merger and PDF Splitter. Their workflow status is now **owner-approved** without deployment/indexing authorization. The owner authorized PDF Compressor as the third and sole active PDF tool; the requested `feature/pdf-compressor` branch is unavailable in this fixed session, so work remains isolated by commits on `arena/fe1f419c-quickkit` and must not merge into `main`. |
