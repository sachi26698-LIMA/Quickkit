# Word to PDF Converter V2 — QA and delivery report

**Date:** 4 November 2026  
**Route:** `/tools/word-to-pdf` (existing tool, not a separate converter)  
**Branch:** `arena/15621ae8-quickkit`  
**Disposition:** V2 workspace and live PDF editing/preview implemented for review. **Native conversion remains unavailable in this sandbox and is not production-approved.** No merge, deployment, reset or discarded prior work.

## Architecture / engine audit

[Pre-change V2 audit](WORD_TO_PDF_V2_AUDIT.md) inspected the V1 upload/modal UI, sequential batch loop, NDJSON endpoint, LibreOffice adapter and preview lifecycle before implementation. The route/category, opt-in engine, limits, existing PDF/download/ZIP utilities and legacy API behavior are preserved. No new V2 dependency or hosted conversion API was added.

The native renderer is still self-hosted LibreOffice. It was **not installed or enabled** here. The real endpoint reports unavailable, the interface says so, and upload actions remain disabled. Successful UI/preview tests intercept the native response with known PDF bytes; they never prove DOCX rendering fidelity. The PDF itself visibly identifies its synthetic QA origin.

## Delivered feature verification

| Area | Implementation / evidence | Boundary |
| --- | --- | --- |
| Toolbar | QUICKKIT identity, breadcrumb, tool title/status, undo/reset and help | Settings history limited to 30 snapshots; no persistence |
| Desktop workspace | Files / central preview / settings, collapsible sidebars, CSS horizontal sidebar resizing | Collapse/reopen tested; native CSS resize handle is provided, not browser/OS manual drag-certified |
| Upload queue | Drag/drop, multi-file input, names, byte size, source/output page counts after conversion, move up/down, replace/remove, individual status | Before conversion, icons and “Pages unknown” are shown, not invented page counts or DOCX thumbnails |
| Queue thumbnails | Actual first-PDF-page rendering after conversion | Serialized; no fake document covers |
| Main viewer | Actual PDF.js canvas, lazy page thumbnails, direct/previous/next navigation, zoom, fit width/page, rotation | Rotation changes real exported PDF geometry; canvas pixel area/edge sizes are bounded |
| Fullscreen | Full-viewport preview, keyboard focus containment, Escape, scroll/focus restoration | CSS workspace fullscreen, deliberately not permission-dependent browser Fullscreen API |
| Search | Reads PDF text layer, lists matching pages and navigates to them | No OCR, word-location highlight or guaranteed search of outlined/scanned text |
| Comparison | Actual DOCX package via docx-preview; native-PDF versus final-PDF split view | DOCX browser layout explicitly approximate; local DOCX comparison capped at 5 MiB |
| Page Setup | Original, A4/A3/A5/Letter/Legal/Custom; orientation/dimensions; global/file margins | All-page layout requires native reflow; selected-page layout is PDF geometry, not selective Word reflow |
| Page Management | Include/exclude ranges; explicit output order; selective overlay ranges; custom header/footer; numbering start, Roman/Arabic, skip first number, position/font/size/alignment/colour | Ranges refer to source-PDF pages after native pagination; overlays are basic Latin and can overlap content |
| Appearance | Real background stream behind source content; shared header/footer/number styling; tagged-native request | Opaque source backgrounds stay opaque. Text mode is fixed native text; embedding automatic where supported/licensed. No forced outline editor or PDF/UA promise |
| Quality | Standard/High/Print; automatic/JPEG/lossless image encoding; JPEG quality; resolution preservation/DPI | Native flags are wired, but actual LibreOffice fidelity is unverified. Print is not PDF/X, CMYK, bleed or press certification; no lossless-conversion claim |
| Size | Actual output bytes displayed and reported | Numeric pre-conversion estimation is intentionally unavailable rather than fabricated |
| Live updates | 400 ms debounced, serialized local processing, page-specific view, loading/error handling, refresh | Native-affecting edits mark output stale; upload must be explicit or separately opted in |
| Auto native refresh | Separate checkbox, off by default, 1,000 ms debounce, active previously-converted file only | Disabled without engine/upload consent; no upload on mere selection; revocation/clear disables it |
| Export | Individual PDF, ZIP of synchronized successes + JSON report, custom names, title/author/subject/keywords | Empty metadata preserves native metadata rather than redacting it |
| Consistency | One `process-pdf.ts` pipeline for server/client; full settings/native fingerprints gate export | Preview and download use the same retained final bytes; stale/invalid output cannot be downloaded |
| Batch | Existing sequential bounded approach retained, stage progress, cancel/retry, per-file errors and completion report | No invented percentage/page progress from LibreOffice |
| Mobile | Files/Preview/Settings tabs, full-viewport viewer, sticky export action | 390 × 844 overflow and accessibility verified; real-device/manual screen-reader review outstanding |

## Final verification results

| Check | Final result |
| --- | --- |
| `npm run test` | **986 passed, 52 test files** |
| V2-specific unit tests | **32 passed**, added without removing existing tests |
| Existing Word-to-PDF package/settings/server-gate tests | 23 passed |
| Existing fake-executable adapter tests | 4 passed; process/cancel/temp cleanup and real PDF processing, **not native rendering** |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed, no warnings |
| `npm run build` | Passed, no tracing warning; page/API retained |
| Final Word-to-PDF Chromium E2E | **8 passed** (4 preserved V1 flows, 4 new V2 flows) |
| Wider Chromium selection: core + PDF tools + Word-to-PDF | Latest complete attempts: **40 passed, 1 unchanged PDF Splitter timing failure** out of 41; an earlier V2 run passed all 41 |
| PDF Splitter ready-gated diagnostic | Passed all three existing rejection assertions when waiting for the real input to become enabled before dispatching the synthetic drop |
| axe | Zero violations in real unavailable/queue state and V2 live desktop/mobile fixture states |
| Mobile overflow | Passed for Files, Preview and Settings panels at 390 px |
| `git diff --check` | Passed |

The final eight-test tool run used:

```sh
LD_LIBRARY_PATH=/tmp/lib PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/tmp/chromium \
  npm run test:e2e -- tests/e2e/word-to-pdf.spec.ts \
  tests/e2e/word-to-pdf-v2.spec.ts --project=chromium --workers=1
```

Wider regression selection additionally included `core.spec.ts`, `pdf-merger.spec.ts`, `pdf-splitter.spec.ts`, `pdf-compressor.spec.ts` and `pdf-to-word.spec.ts`; both one- and two-worker final attempts reproduced the unchanged Splitter test's missing “2 files were not added” assertion. That test dispatches a synthetic `drop` immediately after `goto`, before waiting for hydration. Its source/tool were **not changed to hide the failure**. A separate diagnostic waited for “Choose a PDF” to become enabled, dispatched the same two files, and verified all three expected rejection messages. This is recorded as an outstanding regression-test synchronization issue, not a blanket all-E2E-pass claim.

Chromium and its required runtime libraries were unpacked outside the repository through the already-established npm-based test setup. Firefox/WebKit, the complete site-wide multi-browser suite and manual assistive-technology testing were not run.

## New test evidence

Unit tests verify native-versus-local settings signatures, invalid settings, include/exclude/order semantics, empty/duplicate page selection errors, Roman numerals, source-byte immutability, metadata preservation/overrides, real page order/rotation, selective PDF geometry, actual background content-stream ordering, selected overlays and first-page numbering, abort behavior and extreme page-geometry canvas bounds.

New V2 browser tests verify:

- Genuine DOCX fixture selected locally; real PDF fixture rendered through PDF.js after an explicitly mocked native response.
- Local reordering/headers/numbering/metadata without a second POST; downloaded PDFs parsed independently for page order, author/title and rotation.
- Lazy thumbnails, navigation, zoom, fit width/page, text search, actual DOCX comparison, before/after PDF, fullscreen exit and live/mobile accessibility.
- Native page-size and quality/compression/resolution changes marking output stale and blocking downloads until refresh; header settings checked on the mocked transport.
- No native request before explicit refresh or separate auto-upload opt-in; rapid edits debounced to the latest setting; consent revocation stops automatic uploads.
- Queue reorder/replace/remove, custom names, undo/reset, sidebar collapse/reopen, mobile tabs/no overflow.
- Invalid live settings visibly failing and blocking export, followed by local recovery without native re-upload.

The original four browser tests still exercise real fail-closed behavior and mocked batch preview/ZIP/error/retry/cancel flows. Their tool-title and URI-encoded-header selectors were adapted to V2; assertions were not removed. Early V2 test iterations exposed stale-status text masking a real error, and a browser Fullscreen API enter/exit race; both were corrected. Workspace fullscreen now uses reliable full-viewport CSS. A selected-mobile-tab hover contrast issue was corrected and mobile axe rerun.

## Screenshots / preview

The production-build sandbox preview is running on **port 3001**; open `/tools/word-to-pdf`. It remains honestly engine-unavailable, not a deployed converter.

### Actual installation — no mocked availability

- [Desktop, native engine unavailable](word-to-pdf/v2/desktop-engine-unavailable.png)
- [Mobile Files, native engine unavailable](word-to-pdf/v2/mobile-files-engine-unavailable.png)

### Real PDF/DOM rendering with a mocked native response — not native conversion evidence

- [Desktop live editing studio](word-to-pdf/v2/desktop-live-mocked-engine.png)
- [Mobile PDF preview](word-to-pdf/v2/mobile-live-mocked-engine.png)
- [Before/after PDF comparison](word-to-pdf/v2/before-after-mocked-engine.png)
- [Original DOCX comparison](word-to-pdf/v2/docx-comparison-mocked-engine.png)

The synthetic PDFs visibly say their engine response is mocked. DOCX comparison uses actual generated DOCX package bytes with text/table content. No runtime demo document, fake PDF placeholder or hidden production mock route was added.

## Security / resource lifecycle

No silent uploads, third-party API, new secrets, localStorage or IndexedDB retention. Only a consented explicit action or separately enabled native auto-refresh sends bytes to the same-origin endpoint. Existing private temp directories, native process-group kill, deadlines and per-process server slot remain in use.

Client retained native + final PDFs are capped at **120 MiB combined**; originals are capped at 80 MiB per queue. Browser PDF transformations are serialized; superseded results are discarded. Handles/URLs/search tasks are cleaned up on replacement/unmount, and per-file preferences/history are pruned on removal/clear. ZIP/canvas/parser work can temporarily exceed retained-byte accounting; no peak-memory guarantee is claimed. The new preview option respects exported page rotations and adds canvas area/edge bounds; old callers retain their default preview semantics. Existing PDF-to-Word regression flows passed after this additive utility change.

## Unresolved production blockers

1. A real patched LibreOffice installation, licensed font inventory and isolated persistent host (engine absent here).
2. Unmocked native DOCX corpus/reference-PDF testing: charts, complex/nested tables, floating images/transparency, fonts/scripts, mixed page sizes, headers/footers, fields, links and tagged structure.
3. Actual-host network/filesystem/quota/rate-limit checks, cancellation through proxy, process-crash temp expiry and no body/metadata-header logging.
4. Large-document and browser/native memory benchmarks. **1,000-page support is disabled**; the provisional 100-page output check is not a stress-test guarantee.
5. Firefox/WebKit, real-device resize/fullscreen/touch review, manual screen-reader testing, owner acceptance and the existing PDF Splitter E2E hydration-wait fix as a separately scoped test improvement.
6. Numeric pre-render output estimation, forced text outlines/font-substitution editing and certified press output are not implemented; the UI explicitly limits/discloses these capabilities rather than presenting working-looking fake controls.

See [V2 operator setup and limitations](WORD_TO_PDF_V2_OPERATIONS.md), [original host isolation checklist](WORD_TO_PDF_OPERATIONS.md) and [engine feasibility audit](WORD_TO_PDF_AUDIT.md). Do not mark native conversion production-ready based on UI tests or screenshots.
