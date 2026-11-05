# Word to PDF Converter — QA report

> V1 historical record. The same-route V2 upgrade is documented in [V2 QA](WORD_TO_PDF_V2_QA.md) and [V2 operator instructions](WORD_TO_PDF_V2_OPERATIONS.md); V2 browser retention/preview details supersede V1 values. Native production approval remains blocked.

**Date:** 4 November 2026  
**Branch:** `arena/15621ae8-quickkit`  
**Disposition:** Implemented workspace and opt-in native adapter, **not production-approved**. Real native rendering accuracy, isolated hosting and long-document stress QA remain blocked. Nothing was merged or deployed.

## Delivered

Route `/tools/word-to-pdf`, PDF Tools catalog entry, QUICKKIT light responsive styling; DOCX batch queue; global and individual settings; A4/A3/A5/Letter/Legal/custom dimensions; portrait/landscape; margins; quality presets; page selection; custom output names; PDF header/footer and numbering overlays with position/alignment/font/size/colour; actual stage reporting; cancellation/retry; page-by-page PDF.js preview; individual PDF and shared ZIP download.

Native LibreOffice is selected after the feasibility audit, **not installed or enabled in this sandbox**. The real preview reports the engine as unavailable and prevents upload. It does not silently substitute HTML printing or send documents to a hosted API. An explicitly labelled mocked transport test exercises the success UI with known real PDF bytes; that is not DOCX conversion evidence.

## Checks run

| Check | Result |
| --- | --- |
| `npm run test` (final isolated run) | **954 passed, 51 files** |
| New settings/package/server-gate tests | **23 passed** |
| New adapter tests using a fake executable | **4 passed**; actual process spawning, cancellation and temp cleanup, real PDF post-processing; no native rendering claim |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed |
| `npm run build` | Passed; new page and API included; final build has no tracing warning |
| Chromium E2E: core, PDF merger/splitter/compressor/PDF-to-Word and new Word-to-PDF | **37 passed** in final isolated run |
| New tool Chromium E2E | **4 passed** within that selection |
| axe accessibility on real unavailable-engine/queued-files state | Zero violations |
| Mobile overflow at 390 × 844 | Passed |
| `git diff --check` | Passed after removing Markdown trailing spaces |

Commands for the final browser regression selection:

```sh
LD_LIBRARY_PATH=/tmp/lib PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/tmp/chromium \
  npm run test:e2e -- tests/e2e/core.spec.ts tests/e2e/pdf-merger.spec.ts \
  tests/e2e/pdf-splitter.spec.ts tests/e2e/pdf-compressor.spec.ts \
  tests/e2e/pdf-to-word.spec.ts tests/e2e/word-to-pdf.spec.ts \
  --project=chromium --workers=2
```

The sandbox lacked browser binaries and NSS libraries initially. A Chromium binary and runtime libraries were unpacked from `@sparticuz/chromium` via npm **outside the repository**, with no product dependency added. The standard Playwright configuration's executable override was reused. Firefox/WebKit and the full 672-case multi-browser suite were **not run**. No claim of complete cross-browser certification.

One simultaneous run of lint, unit tests and browser tests caused an existing QR rendering unit timeout and an existing PDF Splitter 5-second assertion timeout under resource contention. Neither existing tool was modified. Re-running the complete unit suite and the same 37-case E2E selection separately passed. Initial new E2E iterations also exposed an Escape-close problem after the last preview page disabled the focused button; document-level Escape handling, focus restoration and scroll cleanup were added and verified.

## Test coverage and limits

| Requested document scenario | What was actually verified | Native visual fidelity |
| --- | --- | --- |
| Tables / complex formatting | Genuine generated DOCX: table, bold/italic text, package parts preserved through inspection | **Pending** |
| Images | Genuine generated DOCX image part remains byte-identical through package preparation | **Pending** |
| Charts | No native chart rendering performed | **Pending** |
| Headers / footers | Genuine generated DOCX original header/footer parts preserved; real PDF overlay pipeline exercised using fake engine output | **Pending** |
| Different fonts | Original named font retained in DOCX XML; PDF overlay fonts selectable | Native substitution/embedding/licensing **pending** |
| Multiple page sizes | Two-section DOCX original settings retained; section-wide page-size/orientation/margin overrides asserted | Native reflow **pending** |
| Long documents | Fake native 101-page PDF rejected and temporary files removed; selected ranges validated | Actual long DOCX and 1,000-page stress tests **not run** |
| Corrupted / unsupported | Invalid bytes, missing DOCX parts, ZIP expansion limits, XML entity declarations, macro/OLE parts and linked resources rejected; UI error/retry paths tested | Broader native parser corpus **pending** |

New E2E coverage: no upload without consent/available engine, unsupported DOC errors, sequential two-file requests, global versus file settings, real PDF canvas pagination, ZIP download event, clear files, server error visibility/retry, and cancellation preventing the next upload. Three success/error/cancel tests intercept the API intentionally; one uses the actual unavailable endpoint. The fake executable unit tests validate adapter arguments, PDF selection/overlays, native process-group cancellation, preflight before process launch, 101-page rejection and private temporary-directory cleanup.

The browser queue limit is 10 files / 20 MiB each / 80 MiB combined. Expanded ZIP limit is 100 MiB / 2,000 parts, with 40 MiB per part. Converted PDF limit is 50 MiB each / 100 MiB retained batch output. Native conversion has a 120-second deadline; whole request has 150 seconds; server accepts one active request per process. These are defensive limits, **not benchmark-backed throughput guarantees**. Native page count is checked after rendering; OS quotas are still mandatory.

## Screenshots / working preview

The running local production-build preview is on port 3001. Open `/tools/word-to-pdf` in the live preview. This is a sandbox preview, not a deployment.

- [Desktop workspace](word-to-pdf/screenshots/desktop.png): actual installation, two queued selections, engine unavailable, no uploads.
- [Mobile workspace](word-to-pdf/screenshots/mobile.png): same real state, 390-pixel viewport, no horizontal overflow.
- [PDF preview — mocked transport](word-to-pdf/screenshots/preview-mocked-transport.png): actual PDF.js canvas rendering of a generated synthetic two-page PDF supplied by a test-intercepted response. **Not a LibreOffice-produced DOCX conversion.**

## Privacy / scope

Existing tool conversion implementations were untouched. Shared catalog and count assertions were updated for one added tool. Minimal category/about/help/privacy/footer copy was updated because the previous universal “all inputs stay on-device” claim would become false when an operator enables this server tool. This is a necessary disclosure correction, not a change to existing tools' local processing.

No secrets or conversion API credentials were introduced. No user documents were uploaded during development. Temporary files are deleted by the adapter after normal success/error/cancel; crash cleanup depends on host expiry policy. No lossless, exact Word fidelity, certified print-ready or 1,000-page capability is advertised. The print preset uses high-quality native image export settings, not PDF/X or CMYK certification. Subsetting may lose PDF outlines and links to omitted pages. Custom header/footer/numbering are overlays and can overlap existing content unless margins are reserved.

`npm ci` reported 15 moderate vulnerabilities before adding the XML parser, and npm reported the same count afterward. No broad dependency upgrades or forced audit fixes were applied. Deployment requires a separate dependency/security review.

## Release blockers

1. Install and isolate an approved LibreOffice version with licensed fonts on the actual persistent Node host.
2. Enforce network, filesystem, memory/CPU/temp-storage/process and rate limits; verify crash retention and proxy cancellation behavior.
3. Run actual native visual/reference-PDF QA for every document scenario above, including charts and scripts/fonts beyond basic Latin. Existing document text is unrestricted; custom overlay text is deliberately basic Latin only.
4. Run long-document and memory stress tests before increasing the provisional 100-page cap. **1,000-page support stays disabled.**
5. Run unmocked native E2E, Firefox/WebKit, assistive-technology review and owner acceptance.

See [feasibility audit](WORD_TO_PDF_AUDIT.md) and [operator/release checklist](WORD_TO_PDF_OPERATIONS.md). Do not mark this production-ready merely because the unit/UI suite passes.
