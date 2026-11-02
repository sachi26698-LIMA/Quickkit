# QUICKKIT Multiple Tools Expansion Roadmap

**Status:** Planning proposal — **Phase 5 not started; owner approval required**  
**Date:** 1 November 2026  
**Current live tools:** 6  
**Proposed net-new tools in Phases 5–12:** 84  
**Projected total after Phase 12:** 90 genuinely implemented tools

> Count clarification: 10 + 10 + 12 + 14 + 12 + 10 + 8 + 8 = **84**, not 94. Starting from six live tools, reaching a 100-tool platform requires 94 net-new tools; exceeding 100 requires at least 95 net-new tools. This roadmap therefore does not silently pad the list. It proposes the requested 84 and reserves a later evidence-led Phase 13 for at least 11 additional non-duplicate tools. The owner may instead approve a different redistribution, but quality and non-duplication take priority over the headline count.

## 1. Roadmap rules

- Build one phase at a time and one tool at a time within the phase.
- A named tool below is a **candidate**, not a promise, route or public card.
- Rename, merge or replace a candidate if technical, privacy, licensing or quality evidence shows it would be fake, unsafe or duplicative.
- Prefer browser processing. Any server/third-party step needs explicit phase approval and user-facing disclosure.
- Every live tool requires original content, SEO metadata, unit tests, browser tests, accessibility checks, responsive checks, privacy review and an updated status record.
- Preserve the six current tools and URLs.
- Keep ads, accounts and payments out of scope unless a separate business/legal phase approves them.
- Phase 4 launch gates remain closed until the verified domain, legal operator/contact, hosting/retention details and residual security decision are complete. Expansion does not imply deployment or indexing.

## 2. Portfolio at a glance

| Phase | Category | Net-new candidates | Cumulative live total if all pass | Primary risk |
|---:|---|---:|---:|---|
| Existing | Mixed | — | 6 | Preserve behavior and URLs |
| 5 | PDF Tools | 10 | 16 | Large/hostile files, memory, PDF fidelity |
| 6 | Image Tools | 10 | 26 | Canvas limits, metadata, color/alpha fidelity |
| 7 | Text & Writing Tools | 12 | 38 | Unicode, very large text, overlap with existing analyzers |
| 8 | Developer Tools | 14 | 52 | Parser safety, misleading security claims, dependency size |
| 9 | Calculators & Converters | 12 | 64 | Formula, timezone, financial/health interpretation |
| 10 | QR & Barcode Tools | 10 | 74 | Payload standards, camera permission, unsafe decoded links |
| 11 | Security & Privacy Tools | 8 | 82 | Sensitive inputs, cryptography correctness, false reassurance |
| 12 | AI-Powered Tools | 8 | 90 | Model quality, license, download size, cost and data transfer |
| 13 | Evidence-led expansion | 11+ | 101+ | Must be selected from real demand, not invented to inflate the count |

## 3. Foundation before Phase 5: Registry migration

Phase 5 should not begin by adding PDF cards. After approval, the first implementation milestone is the registry foundation described in `TOOL_REGISTRY_ARCHITECTURE.md`:

1. Introduce category/tool types and definitions for the six live tools.
2. Keep existing URLs and approved UI while moving metadata/search/sitemap selection to registry selectors.
3. Generate live tool routes and add route-parity tests.
4. Add `/tools`, generated category pages, upgraded search, relevant related tools, and honest featured/recent sections.
5. Add favorites only if the local-storage decision is approved.
6. Run full regression before the first PDF workspace is exposed.

This foundation is part of Phase 5 delivery sequencing, but Phase 5 is not “in progress” until the owner approves this roadmap.

---

## 4. Phase 5 — PDF Tools (10)

### Objective

Add a trustworthy local-first PDF suite for common page manipulation, conversion and annotation jobs. The first release should favor predictable `pdf-lib` operations and clearly bounded PDF.js rendering/text extraction over difficult claims such as universal compression, repair or password removal.

### Proposed tools

| # | Candidate | Proposed slug | Distinct user job | Proposed processing | Key gate |
|---:|---|---|---|---|---|
| 1 | Merge PDF | `merge-pdf` | Combine multiple PDFs in a chosen order into one file. | Browser | Preserve page order/count; atomic failure on corrupt input. |
| 2 | Split PDF | `split-pdf` | Extract ranges or every page into separate PDFs. | Browser | Unambiguous range grammar and output naming/ZIP behavior. |
| 3 | Organize PDF | `organize-pdf` | Reorder, duplicate and delete pages with thumbnails. | Browser | Keyboard-operable alternative to drag-and-drop. |
| 4 | Rotate PDF | `rotate-pdf` | Rotate selected or all pages by 90° increments. | Browser | Correctly combine new rotation with each page's existing rotation. |
| 5 | Images to PDF | `images-to-pdf` | Build one PDF from ordered JPEG/PNG/WebP images. | Browser | Orientation, page fit, margins and large-pixel bounds. |
| 6 | PDF to Images | `pdf-to-images` | Render selected pages as PNG/JPEG downloads. | Browser | Render scale/pixel cap, cancellation and ZIP size bounds. |
| 7 | Extract PDF Text | `extract-pdf-text` | Copy/download embedded text by page. | Browser | Explain scanned/image-only PDFs need OCR; do not invent text. |
| 8 | Add PDF Page Numbers | `add-pdf-page-numbers` | Stamp configurable page numbers. | Browser | Position, start number, skip-first-page and embedded-font limits. |
| 9 | Add PDF Watermark | `add-pdf-watermark` | Stamp repeated or centered text watermark with opacity/rotation. | Browser | Validate glyphs supported by embedded standard fonts. |
| 10 | PDF Metadata Editor | `pdf-metadata-editor` | View/edit title, author, subject and keywords. | Browser | Reopen output and assert fields; distinguish editable vs read-only metadata. |

### Intentionally deferred or gated alternates

- **Compress PDF:** High demand, but merely rewriting a file with a manipulation library may not meaningfully compress image-heavy PDFs. It requires an engine spike (for example qpdf/Ghostscript-class processing, WASM size/license review, or an approved server design) and before/after quality fixtures. It should replace a first-ten item only if the spike produces honest, repeatable savings.
- **Protect PDF:** Standard `pdf-lib` does not provide production encryption. A maintained fork or other engine would need compatibility, cryptography, license and password-handling review.
- **Unlock PDF:** Not proposed as password bypassing. Supporting a user-supplied password for an encrypted file is a separate security design.
- **Sign PDF:** Visual signature placement is feasible; cryptographic signing is a much larger trust/certificate project and must not be conflated with drawing a signature.

### Detailed Phase 5 implementation plan

#### 5.0 — Technical spike and shared PDF core

**Candidate dependencies to evaluate, not pre-approved:**

- `pdf-lib` for page copying, rotation, metadata and stamping.
- `pdfjs-dist` (PDF.js) for thumbnails, rendering and embedded-text extraction.
- `fflate` or an equivalent small ZIP library only if multi-file outputs justify it; otherwise sequential downloads may be simpler and more transparent.

For each dependency, record version, license, bundle/worker delivery, maintenance, known vulnerabilities and browser support in the implementation PR. Static/hosted worker assets must be same-origin; no document leaves the device.

**Spike questions:**

1. How are the PDF.js worker and WASM/assets emitted by Next/Turbopack, and do CSP/worker policies need a narrowly scoped change?
2. What practical per-file, aggregate-file, page-count and rendered-pixel limits keep low-memory mobile browsers responsive?
3. Which malformed, encrypted, linearized, form-heavy and annotation-heavy PDFs fail, and what exact user messages are honest?
4. What content is preserved or lost when copying pages (forms, annotations, bookmarks, layers, attachments, metadata)?
5. Can output PDFs be reopened and asserted in tests for page count, order, rotation, dimensions, text and metadata?

**Shared modules:**

- PDF loading/validation with user-safe errors.
- Page-range parser with exhaustive unit tests.
- File list/dropzone, page thumbnail, progress and output panels using existing QUICKKIT tool UI patterns.
- Blob/ZIP download and object-URL cleanup helpers.
- Synthetic PDF fixture builders for tests; no private user documents in the repo.

#### 5A — Page manipulation tranche

Build in this order: Merge PDF → Split PDF → Rotate PDF → Organize PDF.

- Start with Merge to prove multi-file ordering, output validation and resource cleanup.
- Reuse page selection/range logic in Split/Rotate.
- Add thumbnails only when Organize needs them; provide move up/down, duplicate and remove buttons so dragging is never the only interaction.
- Every output is reopened in tests; page count and representative page dimensions/content order are asserted.

#### 5B — Conversion and extraction tranche

Build Images to PDF → PDF to Images → Extract PDF Text.

- Reuse existing image validation concepts where appropriate, but define PDF-specific image/page limits rather than assuming the Image Compressor limits fit.
- PDF rendering must support cancellation/reset and revoke preview URLs.
- Text extraction preserves page boundaries and offers copy/download. Reading order limitations in multi-column documents must be disclosed.

#### 5C — Stamping and metadata tranche

Build Page Numbers → Watermark → Metadata Editor.

- Share stamp positioning/preview concepts without merging the user jobs.
- Detect unsupported watermark glyphs before generating a misleading output.
- Metadata edit tests reopen the generated document and compare fields.

#### Phase 5 non-goals

- Editing original PDF text/images in place.
- OCR for scanned documents (Phase 12 candidate).
- Password removal, legal/digital signatures or guaranteed compression.
- Cloud conversion, file retention, accounts or collaboration.
- Publishing any incomplete PDF card to show progress.

#### Phase 5 exit gate

- Ten tools individually pass unit/browser/accessibility/responsive tests.
- Outputs are independently reopened/decoded in automated tests.
- Encrypted, corrupt, oversized and unsupported files fail safely with no partial misleading success state.
- No PDF content is transmitted in browser-network assertions.
- Screenshots exist for desktop/mobile populated states.
- `TOOL_DEVELOPMENT_STATUS.md` is updated tool-by-tool with evidence.

---

## 5. Phase 6 — Image Tools (10)

Existing **Image Compressor** remains the canonical single-image compression tool. Candidates must add a different job or a clearly different output.

| Candidate | Proposed slug | Job / duplicate guard | Main technical notes |
|---|---|---|---|
| Crop Image | `crop-image` | Select an exact region/aspect ratio. | Accessible numeric crop controls in addition to pointer dragging. |
| Resize Image | `resize-image` | Exact dimensions, percentage and social-size presets; compressor remains quality/file-size focused. | Prevent accidental upscaling unless explicitly chosen. |
| Rotate & Flip Image | `rotate-flip-image` | 90° rotation and horizontal/vertical flips. | Correct EXIF orientation and alpha handling. |
| Image Filters & Adjustments | `image-filters` | Brightness, contrast, saturation, grayscale and similar adjustments. | Live preview must match encoded output pixels in tests. |
| Color Picker from Image | `color-picker-from-image` | Inspect pixel colors and copy HEX/RGB/HSL. | Keyboard/coordinate alternative to pointer-only picking. |
| Image Metadata Viewer | `image-metadata-viewer` | Read-only EXIF/file inspection. | Parse bounded headers; never execute embedded content. |
| Remove Image Metadata | `remove-image-metadata` | Produce a copy and report what metadata was removed. | Explain canvas re-encoding and possible color/profile changes. |
| Favicon Generator | `favicon-generator` | Create a small set of practical icon sizes from one image. | ICO generation requires a reviewed encoder or scoped PNG-only first version. |
| Watermark Image | `watermark-image` | Place text/logo watermark with opacity/position. | Text/logo inputs remain local; preview/output pixel checks. |
| Blur or Pixelate Image | `blur-pixelate-image` | Redact selected regions before sharing. | Irreversible export warning; region controls must be keyboard accessible. |

**Phase gate:** every export is decoded in tests for dimensions, format, alpha and representative pixels. Large-image and decompression limits are shared but configurable per operation.

## 6. Phase 7 — Text & Writing Tools (12)

Existing **Word Counter** and **Case Converter** remain canonical for counting/analysis and case styles.

| Candidate | Proposed slug | Distinct value |
|---|---|---|
| Remove Duplicate Lines | `remove-duplicate-lines` | Exact/case-insensitive de-duplication with order controls. |
| Sort Lines | `sort-lines` | Alphabetical, natural, numeric, length and reverse sorting. |
| Find and Replace Text | `find-and-replace-text` | Literal/whole-word/case options; regex only if safely bounded and clearly explained. |
| Text Diff Checker | `text-diff` | Line/word-level comparison with accessible change summary. |
| Remove Extra Spaces | `remove-extra-spaces` | Normalize spaces, tabs and blank lines with selectable rules. |
| Reverse Text | `reverse-text` | Reverse characters, words or lines without corrupting grapheme clusters. |
| Repeat Text | `repeat-text` | Repeat a phrase with separator and strict output-size cap. |
| Lorem Ipsum Generator | `lorem-ipsum-generator` | Deterministic placeholder paragraphs/sentences/words using bundled text. |
| Random Word Generator | `random-word-generator` | Cryptographically random selection from a licensed bundled word list. |
| Slug Generator | `slug-generator` | URL slugs with transliteration, separator, stop-word and length controls; broader than Case Converter's kebab mode. |
| Invisible Character Inspector | `invisible-character-inspector` | Reveal zero-width, control and unusual whitespace characters with code points. |
| Text to Speech | `text-to-speech` | Use the browser's available voices; disclose that some browser voices may use device/vendor services outside QUICKKIT's control. |

**Phase gate:** Unicode/grapheme, newline, 1M-character and output-explosion tests. No grammar, plagiarism, readability-score or AI-detection claims in this phase.

## 7. Phase 8 — Developer Tools (14)

Existing **JSON Formatter** remains canonical for JSON formatting/validation/minification.

| Candidate | Proposed slug | Safety/accuracy requirement |
|---|---|---|
| Base64 Encoder / Decoder | `base64-encoder-decoder` | UTF-8-safe text mode; binary/file mode only with strict size limits. |
| URL Encoder / Decoder | `url-encoder-decoder` | Distinguish component vs full-URL encoding. |
| JWT Decoder | `jwt-decoder` | Decode header/payload only; prominent “signature not verified” warning and no secret storage. |
| UUID Generator | `uuid-generator` | Use `crypto.randomUUID`/secure random fallback rules; bulk count cap. |
| Hash Generator | `hash-generator` | Web Crypto SHA family for text; do not present hashes as encryption. |
| Regex Tester | `regex-tester` | Timeout/size safeguards and clear JavaScript-flavor scope. |
| Timestamp Converter | `timestamp-converter` | Seconds/milliseconds detection is explicit; timezone and DST behavior tested. |
| Color Converter | `color-converter` | HEX/RGB/HSL/HSV conversions and contrast helpers with rounding rules. |
| CSS Gradient Generator | `css-gradient-generator` | Generated CSS is previewed exactly; copy-ready output. |
| SQL Formatter | `sql-formatter` | Select dialect dependency only after license/size review; formatting is not validation. |
| XML Formatter | `xml-formatter` | Safe parser settings; report errors without injecting XML as HTML. |
| YAML ↔ JSON Converter | `yaml-json-converter` | Disable custom tags/unsafe construction; document anchors and type-loss behavior. |
| CSV ↔ JSON Converter | `csv-json-converter` | RFC-style quoted fields, delimiter/header controls and spreadsheet formula-injection warning on export. |
| Cron Expression Parser | `cron-expression-parser` | State supported syntax/timezone; next-run calculations tested around DST. |

**Phase gate:** parser fixtures, malformed-input tests and dependency license/bundle review. No code execution tools in this phase.

## 8. Phase 9 — Calculators & Converters (12)

| Candidate | Proposed slug | Required explanation |
|---|---|---|
| Unit Converter | `unit-converter` | Length, mass, temperature, area, volume, time and data with exact conversion factors. |
| Percentage Calculator | `percentage-calculator` | Percentage of, increase/decrease and reverse percentage modes. |
| Loan Calculator | `loan-calculator` | Amortization estimate only; taxes/fees and lender rules excluded. |
| Compound Interest Calculator | `compound-interest-calculator` | Compounding/contribution assumptions shown with the result. |
| BMI Calculator | `bmi-calculator` | Adult screening estimate only; not medical diagnosis or advice. |
| Age Calculator | `age-calculator` | Calendar rules, leap years and future-date validation. |
| Date Difference Calculator | `date-difference-calculator` | Inclusive/exclusive day counting is explicit. |
| Time Duration Calculator | `time-duration-calculator` | Add/subtract durations and calculate elapsed time. |
| Tip & Bill Split Calculator | `tip-calculator` | Rounding behavior is visible and totals reconcile. |
| Discount & Tax Calculator | `discount-tax-calculator` | User supplies tax rate/order; no jurisdiction-specific tax advice. |
| Roman Numeral Converter | `roman-numeral-converter` | Supported numeric range and invalid numeral rules. |
| Number Base Converter | `number-base-converter` | Binary/octal/decimal/hex with `BigInt` boundaries. |

**Phase gate:** formula fixtures from independently calculated examples, boundary/rounding tests and plain-language limitations. Live currency conversion is excluded until a licensed rate source, update timestamp, caching and failure policy are approved.

## 9. Phase 10 — QR & Barcode Tools (10)

Existing **QR Code Generator** remains the general text/URL tool. Specialized generators share encoding infrastructure but have distinct payload schemas and forms.

| Candidate | Proposed slug | Distinct standard/job |
|---|---|---|
| Wi-Fi QR Generator | `wifi-qr-generator` | Correct SSID/security/hidden-network escaping; password never stored. |
| vCard QR Generator | `vcard-qr-generator` | Structured contact fields and vCard escaping/version choice. |
| Email QR Generator | `email-qr-generator` | `mailto:` recipient/subject/body encoding. |
| SMS QR Generator | `sms-qr-generator` | Phone/message URI encoding and validation. |
| Phone QR Generator | `phone-qr-generator` | International-format guidance without claiming number verification. |
| Location QR Generator | `location-qr-generator` | `geo:` coordinates/optional query with range validation. |
| Event QR Generator | `event-qr-generator` | Calendar event payload with timezone-aware date handling. |
| Batch QR Generator | `batch-qr-generator` | Generate multiple labeled codes from lines/CSV within strict count/size limits. |
| QR Code Scanner | `qr-code-scanner` | Decode from uploaded image and, only after user action, camera; decoded links are shown as text and never auto-opened. |
| Barcode Generator | `barcode-generator` | Code 128 plus checksum-validated EAN/UPC formats after library review. |

**Phase gate:** generated codes are decoded in tests and payloads match expected standards. Camera support requires a route-specific permission/header design because the current global Permissions-Policy blocks camera access. No URL-shortening, tracking redirect or remote QR API.

## 10. Phase 11 — Security & Privacy Tools (8)

Existing **Password Generator** remains canonical for character-set passwords.

| Candidate | Proposed slug | Security requirement |
|---|---|---|
| Password Strength Checker | `password-strength-checker` | Local analysis only; never store, log or transmit the entered password. Estimator limitations are explicit. |
| Passphrase Generator | `passphrase-generator` | Licensed word list, secure randomness and entropy based on actual wordlist size. |
| File Hash Verifier | `file-hash-verifier` | Stream/bound file reading where possible; compare pasted digest in constant-format normalized form. |
| Text Encryptor | `text-encryptor` | Versioned AES-GCM format, strong password KDF, unique salt/IV, test vectors and independent security review before live status. |
| Secure Random Number Generator | `secure-random-number-generator` | Rejection sampling; integer/range and duplicate rules tested. |
| Random Picker | `random-picker` | Secure shuffle of user list; no result persistence by default. |
| Sensitive Text Redactor | `sensitive-text-redactor` | Pattern-based detection for common emails/cards/keys with false-positive/negative warnings; not a compliance guarantee. |
| Browser Fingerprint Viewer | `browser-fingerprint-viewer` | Educational view of locally available browser signals; calculate locally and store/send nothing. |

**Phase gate:** threat model per tool, cryptography test vectors where applicable, no analytics around sensitive fields, and copy review to avoid “military-grade,” “unhackable” or breach-safe claims. Breach-database lookup and TOTP secret handling are excluded unless a later dedicated security design approves them.

## 11. Phase 12 — AI-Powered Tools (8)

Phase 12 is a research-and-evaluation phase, not a commitment to ship all eight regardless of quality. Each candidate requires a model/provider spike before it enters development.

| Candidate | Proposed slug | Preferred direction | Go/no-go evidence |
|---|---|---|---|
| Background Remover | `background-remover` | Browser segmentation model where practical. | License, model size, memory, edge/hair quality and low-end device behavior. |
| OCR Text Extractor | `ocr-text-extractor` | Local Tesseract/WebAssembly or equivalent. | Language-data size, accuracy fixtures and scanned-PDF workflow. |
| Image Caption Generator | `image-caption-generator` | Small local vision model if quality is adequate. | Caption relevance, bias/error examples and model download size. |
| Text Summarizer | `text-summarizer` | Local model first; server LLM only with explicit approval. | Faithfulness tests, length/language limits and hallucination warnings. |
| Grammar Checker | `grammar-checker` | Local linguistic engine such as a reviewed WASM grammar tool. | Correction precision/recall and dialect limitations; label technology accurately. |
| Paraphraser | `paraphraser` | Approved LLM provider or capable local model. | Meaning-preservation tests, plagiarism/academic-integrity guidance, cost and data retention. |
| Translator | `translator` | Browser translation capability, local language models or approved provider. | Per-language quality/support matrix; no universal-language claim. |
| Image Upscaler | `image-upscaler` | Local ONNX/WebGPU model if practical. | Model license, artifacting, face/text distortion and device memory. |

### AI-specific gates

- Record model name/version, provider, license, training/usage terms where relevant, asset size and update process.
- State whether content stays on-device, goes to a QUICKKIT server or goes to a named third party **before** the user submits it.
- Define retention, subprocessors, regional processing, abuse controls, rate limits, cost ceiling and failure behavior for any remote model.
- Use representative evaluation sets and publish limitations in the tool content. Do not use fake confidence scores.
- Large model downloads require explicit progress, cache behavior and a cancel path.
- If a candidate cannot meet quality/privacy/cost thresholds, replace or defer it; do not ship a template and call it AI.

## 12. Phase 13 — Evidence-led path beyond 100

Do not choose the final 11+ tools now. After launch readiness and real usage/search evidence exist, select candidates from:

- owner/user requests;
- Search Console queries that reveal unmet but relevant intent;
- high-exit or no-result on-site searches (only with approved privacy-respecting measurement);
- adjacent jobs discovered in support/feedback;
- gated alternates such as PDF compression/protection if their engines become trustworthy.

Each Phase 13 candidate must pass the same duplicate, privacy, dependency and quality gates. The goal is **100+ useful tools**, not 100 URLs.

## 13. Cross-phase delivery checklist

For every tool:

- [ ] Registry definition with unique ID/slug and `in-development` status.
- [ ] User job and duplicate review approved.
- [ ] Pure logic and browser/server adapter boundaries defined.
- [ ] Dependency and license review recorded.
- [ ] Limits and hostile-input behavior designed.
- [ ] Premium workspace using shared tool UI.
- [ ] Original intro, steps, FAQs and limitations.
- [ ] SEO title/description and social metadata.
- [ ] Unit tests and browser journey tests.
- [ ] Accessibility and responsive verification.
- [ ] Privacy/network verification matched to processing mode.
- [ ] Desktop/mobile screenshots.
- [ ] Status changed to `live` only after all evidence passes.
- [ ] `TOOL_DEVELOPMENT_STATUS.md` updated in the same change.

For every phase:

- [ ] Full lint, typecheck, format, unit, browser and production-build gates.
- [ ] Bundle and route-performance review.
- [ ] No regression in pre-existing tools.
- [ ] Category page contains only live tools.
- [ ] Sitemap includes only launch-approved live routes.
- [ ] Phase report distinguishes implemented, deferred and replaced candidates.

## 14. Approval requested

Please approve or revise:

1. The registry architecture and flat `/tools/{slug}` URL model.
2. The 84-tool Phase 5–12 scope, producing 90 total, with Phase 13 reserved for 100+.
3. The category taxonomy and existing-tool remapping.
4. The Phase 5 first-ten PDF list, including deferring Compress/Protect until an engine spike proves them.
5. Account-free favorites in local storage.
6. Keeping “Popular” hidden or labeled “Featured” until a real aggregate data source is approved.
7. Building the registry foundation before the first PDF tool.

**No Phase 5 implementation should begin until this approval is given.**
