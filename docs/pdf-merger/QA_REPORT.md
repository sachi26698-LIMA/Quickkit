# PDF Merger — Final QA and Owner-Review Handoff

**Tool:** PDF Merger (`merge-pdf`)  
**Route:** `/tools/merge-pdf`  
**Status:** **implemented — awaiting owner approval**  
**Date:** 1 November 2026  
**Branch:** `arena/eb17e485-quickkit` (Arena session branch)  
**Pull request:** [#2](https://github.com/sachi26698-LIMA/Quickkit/pull/2)  
**Implementation checkpoint commit:** `070bc77dbda4d9ab4874c7bb39aef4cbe4cb666a`  
**Baseline:** `db4e906` (pushed Phase 3 commit)

> This is an owner-review handoff, not an approval or launch record. PDF Merger must not be marked live/complete, deployed or indexed until the owner personally approves it.
>
> **Currency note:** Sections 1–10 preserve the pre-merge handoff exactly as delivered. The owner later gave two separate instructions that supersede only the old branch/gate statements: PR #2 was merged at the owner’s explicit request, and PDF Merger verification plus PDF Splitter development were then authorized in parallel. See Section 11 for the post-merge verification addendum. No third PDF tool is authorized.

## 1. Git synchronization performed

The local checkout initially pointed at `35f957b`, while the pushed session branch was at `db4e906`. Inspection proved that `35f957b` is the direct ancestor/merge-base and `db4e906` is the later shared Phase 2/Phase 3 baseline.

Before changing Git refs, a workspace-local backup was created at:

- `/home/user/quickkit-backups/pdf-merger-20261101-111328/`
- Full source archive SHA-256: `b0a437044254745f1121ea4a10ea6132f65386e75aa89044ee1e669ce9d11f20`
- Untracked-files archive SHA-256: `db278664d0b620c98404c03a04fd2ed1670e93948191e54e87140db65d99552b`
- Temporary-index Git snapshot commit object: `0d9f3bab8f7ac8162e8324be58372e91a340eb14`

The worktree tree was then committed directly on top of `db4e906` as `070bc77`. The resulting diff contains 41 files and no deletions from the Phase 3 baseline. That checkpoint was pushed to `origin/arena/eb17e485-quickkit` and remote tree inspection confirmed the route, component, PDF engine/logic, worker, PDF.js asset script, tests and screenshots are present.

No merge into `main` was performed. No Image Resizer, Image Compressor or Image Cropper implementation files were modified by the PDF Merger integration.

## 2. Implemented workflow

PDF Merger includes:

- Multiple-file picker and drag/drop intake.
- Sequential local inspection with first-page previews.
- Explicit duplicate-content warnings while still allowing intentional duplicate entries.
- Drag reordering plus accessible move-to-top/up/down/bottom buttons and grip keyboard controls.
- Sort A–Z, reverse, add more, remove and clear-queue actions.
- All-pages or strict custom page ranges per file.
- Lazy visual page picker synchronized with the range selection.
- Per-file selected-page and output-page-span summaries.
- Output filename and document-title controls.
- Optional generated bookmark per source file.
- Dedicated Web Worker merge with mapped progress, elapsed time and cancellation.
- Reopen-and-validate output checks before the result is offered.
- Result preview, open-preview, download, back-to-queue and start-new-merge actions.
- Result invalidation when the queue or output settings change.
- User-supplied open-password workflow; passwords stay in page/worker memory only, are cleared after a successful merge, and the output is unencrypted.
- Guarded AcroForm flattening: supported appearances are preserved as static content, while unsafe/unprovable forms block with an actionable error.
- Selected-page reference copying with destination/action sanitization and unreachable-object pruning, preventing omitted page content from being silently carried into the output as orphan objects.

Configured limits:

| Limit | Value |
| --------------------- | ------: |
| Files per merge | 25 |
| Per-file size | 50 MiB |
| Total queue size | 100 MiB |
| Source pages per file | 1,000 |
| Selected output pages | 1,000 |

## 3. Privacy verification

The UI prominently states that PDFs never leave the browser. Implementation and tests confirm:

- File bytes are read locally with browser File APIs.
- Inspection and merging run in a dedicated local Web Worker.
- PDF.js previews use lazy, same-origin assets generated under `public/pdfjs/6.4.299/` during `predev`/`prebuild`.
- Passwords are not stored in local/session storage and are cleared on removal/reset and after a successful merge.
- The main browser test records interaction requests and asserts that they are same-origin/blob/data GET requests with no request bodies and no source filename in request URLs.
- The full quality suite also includes the repository-wide “no tool input is transmitted by interactions” test.

## 4. Functional and error-path coverage

Automated unit/engine tests cover:

- Selected-page order, page sizes and rotations.
- Internal destination retargeting/removal and omitted-content pruning.
- Supported form flattening, hidden-widget blocking and missing-appearance regeneration only when the value survives.
- Password-required, wrong-password, correct-password and unencrypted-output behavior.
- Generated source bookmarks and duplicate bookmark titles.
- Explicit duplicate file entries.
- Corrupt input, XFA-like markers and signature-like fields blocking.
- Duplicate/out-of-range page indices.
- Strict page-range parsing, selection summaries, queue moves, natural sorting, title/filename/bookmark sanitization and limit validation.

Browser tests use generated local PDF fixtures and verify:

1. Upload, previews, reorder, custom page selections, output filename/title, merge, no stale progress/cancel UI, download and reopening the downloaded PDF with the expected page count, title and marker order.
2. Unsupported text file, corrupt PDF, duplicate file content, duplicate page selection, out-of-range page selection and oversized-file handling without silent skipping.
3. Wrong and correct encrypted-PDF passwords, local unlock, password clearing after success and unencrypted downloaded output.
4. A complete 390px mobile workflow using button reorder, visual page picker, sticky merge action and download, with no horizontal overflow.
5. Cancellation of a 999-page plus one-page merge while preserving the queue.

Fixture caveat: the signature and XFA fixtures are synthetic structural markers (`/Sig` field/value and `/XFA` marker), not a cryptographically signed production PDF or a complete dynamic XFA document.

## 5. Tests actually executed after Git resynchronization

The sandbox browser run used Sparticuz Chromium 153 at `/tmp/chromium`, `LD_LIBRARY_PATH=/tmp/al2023/lib`, and a temporary sandbox-only `playwright.local.config.ts` pointing at the restored production preview on port 3000. That temporary config was deleted after the run and is not part of the repository change.

| Command | Result |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `LD_LIBRARY_PATH=/tmp/al2023/lib TEST_BASE_URL=http://127.0.0.1:3000 npx playwright test --config=playwright.local.config.ts tests/e2e/pdf-merger.spec.ts --workers=1` | **5 passed** |
| `LD_LIBRARY_PATH=/tmp/al2023/lib TEST_BASE_URL=http://127.0.0.1:3000 npx playwright test --config=playwright.local.config.ts --workers=1` | **146 passed** |
| `npm run format:check` | Passed |
| `npm run lint` | Passed |
| `npm run typecheck` | Passed |
| `npx vitest run tests/dependency-compat.test.ts --reporter=verbose` | **4 passed** |
| `npm test -- --reporter=dot` | **114 passed** |
| `npm run build` | Passed; 19 static pages including `/tools/merge-pdf` |
| `npm audit --omit=dev --json` | **0 vulnerabilities** |
| `curl -I http://127.0.0.1:3000/` | HTTP 200 |
| `curl -I http://127.0.0.1:3000/tools/merge-pdf` | HTTP 200 |

One initial full-unit run had a single non-PDF failure: the TypeScript-ESLint parser project-service test timed out at Vitest’s default 5s limit. In isolation it passed, with that individual test taking 4.239s. Only that test’s timeout was raised to 20s; its assertions were not changed. The subsequent full suite passed 114/114.

Firefox and WebKit are configured to run `pdf-merger.spec.ts`, but those browsers were not available in this sandbox and are therefore **not claimed as executed here**.

## 6. Earlier load checks in this implementation session

Temporary load specs were executed earlier in the implementation session and then removed from the repository test suite:

- **1,000 selected pages:** 999-page plus one-page inputs (0.41 MiB total) merged and reopened as 1,000 pages. Intake was 1,168ms and merge-through-result-preview was 6,085ms in sandbox Chromium.
- **25 image-heavy files:** 94.63 MiB total input in a 390px viewport with 4× CPU throttling. Intake was 16,482ms and merge-through-result-preview was 4,261ms; the downloaded output was 94.63 MiB / 25 pages and reopened successfully.

These are sandbox measurements, not performance claims for real devices. A physical low-end mobile check remains advisable before public launch.

## 7. Bundle measurements

Measured from the current production build output:

| Asset | Raw | Gzip |
| ---------------------- | --------------: | ------------: |
| PDF merge worker chunk | 600,538 bytes | 253,690 bytes |
| Lazy PDF.js main chunk | 455,544 bytes | 134,896 bytes |
| PDF.js worker | 1,264,342 bytes | 374,032 bytes |

The PDF code is route/worker-lazy rather than part of the homepage’s initial tool workflow.

## 8. Visual and accessibility review

Screenshots in this directory were inspected:

- `01-empty-desktop.png` — clean empty state and dropzone.
- `02-queue-desktop.png` — populated queue, page picker and output settings.
- `03-result-desktop.png` — validated result with preview/download actions.
- `04-queue-mobile.png` — mobile queue and sticky merge action.
- `05-page-picker-mobile.png` — mobile visual page selection.

Visual inspection led to two fixes already included in the checkpoint:

- The native file input is visually hidden behind the polished **Add PDFs** button instead of rendering as a nested browser control.
- Successful merges now clear progress state immediately, so no stale progress bar or **Cancel merge** button remains beside the result.

Automated quality coverage includes Axe checks on populated PDF states and route overflow checks from 320px through 1440px. The full Chromium suite passed after those fixes.

## 9. Known fidelity limits

PDF Merger does not promise preservation of:

- Original bookmark trees, named destinations or page labels.
- Attachments/portfolios.
- Optional-content layers.
- Tagged structure/PDF-UA conformance.
- XMP/source metadata beyond the new title and normal document information.
- Document JavaScript/actions or dynamic XFA behavior.
- Digital-signature validity.
- PDF/A identity.
- Every complex annotation/link or interactive AcroForm behavior.

Supported forms are flattened; unprovable forms block. Encrypted sources require a user-supplied authorized open password and produce an unencrypted output.

## 10. Owner-review decision required

Please review the live preview, screenshots and this report. Until explicit owner approval is recorded:

- Status remains **implemented — awaiting owner approval**.
- Do not merge PR #2 into `main` for PDF Merger approval purposes.
- Do not deploy/index.
- Do not start PDF Splitter or any other tool.

## 11. Post-merge verification addendum — 1 November 2026

### Current owner directive and Git state

- After this report was first delivered, the owner explicitly requested that PR #2 be merged. That separate instruction produced `main` merge commit `58a81edd28d16f1ed7e2e0f6f0554196a588d47c`. This addendum does not reinterpret that merge as product approval: **PDF Merger remains implemented — awaiting owner approval** under the latest directive.
- The owner then explicitly superseded the former one-tool gate for this workstream: PDF Merger verification and PDF Splitter development may proceed in parallel, but no third PDF tool may start.
- The owner requested `feature/pdf-merger` and `feature/pdf-splitter`. This Arena session is fixed to `arena/fe1f419c-quickkit` and cannot create, switch to or push another branch. That platform deviation is disclosed here; current Splitter work is isolated in tool-specific files/commits on the fixed session branch and has not been merged into `main` by this workstream.
- Before Splitter coding, the clean worktree at `58a81ed` was backed up to `/home/user/quickkit-backups/parallel-pdf-20261101-114630/`.
  - `worktree-source.tar.gz` SHA-256: `8e92955e3e0f8dfcf2457d80077ef2f0fff9b4e38a5afd2d584afdf85e1a689d`
  - `head.bundle` SHA-256: `2988f6ce43305307a70b36aec99c968a1e98d2e516278cfe2d603ebfdb29fe1e`
  - Tracked patch and untracked-file list were both zero bytes because the inspected worktree was clean.

### What changed around the Merger during the parallel workstream

- No PDF Merger UI, route, limits, queue behavior or merge workflow was redesigned or removed.
- The shared `lib/tools/pdf/merge-engine.ts` gained an isolated `splitPdfBytes` implementation so the Splitter can reuse the already-reviewed load, guarded form-flattening, selected-reference copying, sanitization/pruning and reopen-validation internals rather than introducing a second page-copy path.
- Catalog/public copy changed only to add the separate Splitter and update the repository tool count from seven to eight.
- Because a shared engine file changed, the Merger browser suite was rerun after Splitter integration as well as before it.

### Re-verification actually executed on the merged code

The restored sandbox used Sparticuz Chromium 153 at `/tmp/chromium`, `LD_LIBRARY_PATH=/tmp/al2023/lib`, and a temporary sandbox-only Playwright config against the production preview on port 3000. The temporary config is removed before handoff and is not committed.

| Stage                       | Command / check                                                                                                                                                        |                                            Result |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------: |
| Before Splitter coding      | `npx vitest run tests/pdf-merge-engine.test.ts tests/pdf-merge-logic.test.ts --reporter=dot`                                                                           |                                     **18 passed** |
| Before Splitter coding      | `LD_LIBRARY_PATH=/tmp/al2023/lib TEST_BASE_URL=http://127.0.0.1:3000 npx playwright test --config=playwright.local.config.ts tests/e2e/pdf-merger.spec.ts --workers=1` |                                      **5 passed** |
| After Splitter integration  | Same Playwright invocation for `tests/e2e/pdf-splitter.spec.ts tests/e2e/pdf-merger.spec.ts`                                                                           |             **10 passed** (Merger 5 + Splitter 5) |
| Full repository unit suite  | `npm test -- --reporter=dot`                                                                                                                                           |                                    **131 passed** |
| Full sandbox Chromium suite | `LD_LIBRARY_PATH=/tmp/al2023/lib TEST_BASE_URL=http://127.0.0.1:3000 npx playwright test --config=playwright.local.config.ts --workers=1`                              |                                    **161 passed** |
| Production build            | `npm run build`                                                                                                                                                        | Passed; 20 static pages including both PDF routes |
| Production audit            | `npm audit --omit=dev`                                                                                                                                                 |                             **0 vulnerabilities** |
| Preview smoke checks        | `curl` for `/`, `/tools/merge-pdf`, `/tools/split-pdf`                                                                                                                 |                            HTTP 200 for all three |

The rerun covers real browser upload, reorder, page selection, merge, validated download, unsupported/corrupt/duplicate/oversized errors, encrypted unlock and password clearing, the 390px mobile workflow, and cancellation. No Merger defect was found in the post-merge rerun, so no Merger behavior fix was required. Firefox/WebKit remain configured but were not available in this sandbox and are not claimed as executed.

### Addendum decision

PDF Merger remains **implemented — awaiting owner approval**. It has not been deployed or indexed by this workstream. PDF Splitter is the only other authorized PDF workstream; no third PDF tool has been started.
