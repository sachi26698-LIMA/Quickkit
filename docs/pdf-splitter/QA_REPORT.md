# PDF Splitter — QA and Owner-Review Handoff

**Tool:** PDF Splitter (`split-pdf`)
**Route:** `/tools/split-pdf`
**Status:** **implemented — awaiting owner approval**
**Date:** 1 November 2026
**Working branch:** `arena/fe1f419c-quickkit`
**Base:** `58a81edd28d16f1ed7e2e0f6f0554196a588d47c` (`origin/main` after the owner-requested PR #2 merge)

> This is an owner-review handoff, not a launch record. PDF Splitter has not been deployed or indexed. It must not be marked live/complete until the owner personally approves it. No third PDF tool has been started.

## 1. Branch and preservation note

The owner requested a separate `feature/pdf-splitter` branch. This Arena session is fixed to `arena/fe1f419c-quickkit` and cannot create, switch to or push another branch. That deviation is disclosed rather than hidden. Splitter work is isolated in Splitter-specific route/component/logic/worker/test files and in tool-specific commits on the fixed session branch. This workstream has not merged Splitter into `main`.

Before coding, the clean `58a81ed` worktree was backed up at:

- `/home/user/quickkit-backups/parallel-pdf-20261101-114630/`
- `worktree-source.tar.gz` SHA-256: `8e92955e3e0f8dfcf2457d80077ef2f0fff9b4e38a5afd2d584afdf85e1a689d`
- `head.bundle` SHA-256: `2988f6ce43305307a70b36aec99c968a1e98d2e516278cfe2d603ebfdb29fe1e`
- Tracked patch and untracked-file list: zero bytes (clean worktree)

PDF Merger was not reset, removed or overwritten. Its only shared-code touch is an added `splitPdfBytes` function in the existing shared PDF engine file; the Merger browser suite was rerun after that change.

## 2. Implemented workflow

PDF Splitter includes:

- Single-PDF picker and drag/drop intake, with extra dropped files named and not silently ignored.
- Local inspection, first-page thumbnail and lazy batches of 24 visual page previews.
- Four explicit split methods:
  - **Custom ranges:** semicolon/newline-separated output groups such as `1-3; 4-5, 8; 9`.
  - **Extract pages:** typed selection or tappable page previews, as one combined PDF or one PDF per selected page.
  - **Every N pages:** ordered equal groups with any remainder in the final PDF.
  - **Every page:** one PDF per page, subject to the output-file cap.
- Page previews that show inclusion/exclusion or the planned output number(s).
- Exact pre-processing output plan with filenames, pages and written-page total.
- Clear warnings for pages omitted by the plan and pages repeated by overlapping custom ranges.
- Output base name and three suffix styles: part number, page numbers, or both.
- Editable ZIP name when more than one PDF is planned.
- Dedicated Web Worker processing with mapped progress, elapsed time and cancellation.
- Reopen-and-validate checks for every output before any download is offered.
- Individual PDF open/download actions and one locally packaged ZIP for multi-output results.
- Result invalidation when the source, plan or names change, so stale files are not presented as current.
- User-supplied open-password workflow; passwords stay in page/worker memory only, are cleared after a successful split, and are not re-applied to outputs.
- Guarded AcroForm flattening through the same reviewed path used by PDF Merger; unsafe/unprovable forms block with an actionable error.
- Selected-page reference copying with destination/action sanitization and unreachable-object pruning per output.

Configured local safety limits:

| Limit                        |   Value |
| ---------------------------- | ------: |
| Source files per run         |       1 |
| Source size                  |  50 MiB |
| Source pages                 |   1,000 |
| Output PDFs per run          |     100 |
| Written output pages per run |   1,000 |
| Generated PDF bytes retained | 128 MiB |

The written-page limit counts overlapping pages once per output in which they appear. That is intentional: overlap is disclosed and its real memory/output cost is bounded instead of being silently deduplicated.

## 3. Architecture and privacy

- `lib/tools/pdf/split-pdf-logic.ts` owns range-group planning, output naming, overlap/omission warnings, CRC32 and stored-ZIP creation.
- `splitPdfBytes` in `lib/tools/pdf/merge-engine.ts` loads the source once and creates each output through the shared reviewed load, guarded form-flattening, selected-reference copy, graph sanitization/pruning and reopen-validation internals.
- `workers/pdf-split.worker.ts` owns worker-side size/plan validation, engine progress and ZIP packaging. PDFs are packaged uncompressed (“stored”) because PDF streams are already compressed internally; this avoids adding a ZIP dependency.
- `lib/tools/pdf/use-pdf-split-worker.ts` provides request IDs, transferred source/output buffers, worker error mapping and termination-based cancellation.
- PDF.js rendering remains lazy and preview-only, using the existing same-origin asset pipeline.

The UI prominently states that the PDF never leaves the browser. Implementation and browser tests confirm local File API reads, local worker processing, local canvas previews and local ZIP creation. The main Splitter browser test records post-load interaction requests and asserts same-origin/blob/data GET requests with no bodies and no source filename in URLs.

## 4. Error handling covered

Clear, actionable paths are implemented and tested for:

- Non-PDF, empty, renamed/non-PDF-signature and corrupt/unsupported files.
- Oversized source PDFs.
- More than one dropped source file.
- Password-required, wrong-password, blank-password support path and unsupported encryption failures.
- Dynamic XFA-like and signed-like structural fixtures.
- Invalid, reversed/out-of-range and duplicate-inside-one-output page selections.
- Plans exceeding 100 outputs or 1,000 written pages.
- Unsafe form appearances/widgets inherited from the shared guarded form path.
- Worker/startup/message failures and cancellation.

Fixture caveat: signature and XFA coverage uses the repository’s synthetic structural fixtures (`/Sig` field/value and `/XFA` marker), not a cryptographically signed production PDF or a complete dynamic XFA document.

## 5. Automated coverage added

Unit/engine tests:

- `tests/pdf-split-logic.test.ts` — range groups, overlap/omission warnings, combined/separate extraction, every-N grouping, output bounds, filename/ZIP-name sanitization, standard CRC32 value, stored-ZIP structure/CRCs and duplicate ZIP names.
- `tests/pdf-split-engine.test.ts` — output order/titles/geometry/rotation, unselected-content pruning and destination repair, guarded form flattening, encrypted input to unencrypted outputs, signed/XFA blocking, corrupt/oversized/duplicate/out-of-range failures.
- Catalog and launch-gate tests now expect eight tools, two PDF Tools and 12 gated sitemap routes.

Browser tests in `tests/e2e/pdf-splitter.spec.ts` use generated local PDF fixtures and verify:

1. Custom-range split with previews/assignments, omitted-page warning, output/ZIP naming, local-request audit, result preview, ZIP parsing/reopening and individual PDF download markers/titles.
2. Unsupported extra-file, corrupt, oversized and invalid-plan handling, plus visual extraction selection and separate-per-page planning.
3. Wrong/correct encrypted-PDF passwords, password clearing after success and unencrypted outputs inside the ZIP.
4. Complete 390px mobile every-N workflow with sticky Split action and no horizontal overflow.
5. Cancellation of a 999-page split while preserving the source and plan.

## 6. Tests actually executed

The sandbox browser run used Sparticuz Chromium 153 at `/tmp/chromium`, `LD_LIBRARY_PATH=/tmp/al2023/lib`, a temporary sandbox-only Playwright config and the production preview on port 3000. The temporary config is removed before handoff and is not committed.

| Command                                                                                                                                                                                               |                                               Result |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------: |
| `npx vitest run tests/pdf-split-logic.test.ts tests/pdf-split-engine.test.ts tests/catalog.test.ts tests/launch.test.ts tests/pdf-merge-logic.test.ts tests/pdf-merge-engine.test.ts --reporter=dot`  |                                        **53 passed** |
| `LD_LIBRARY_PATH=/tmp/al2023/lib TEST_BASE_URL=http://127.0.0.1:3000 npx playwright test --config=playwright.local.config.ts tests/e2e/pdf-splitter.spec.ts tests/e2e/pdf-merger.spec.ts --workers=1` |                                        **10 passed** |
| `npm test -- --reporter=dot`                                                                                                                                                                          |                                       **131 passed** |
| `LD_LIBRARY_PATH=/tmp/al2023/lib TEST_BASE_URL=http://127.0.0.1:3000 npx playwright test --config=playwright.local.config.ts --workers=1`                                                             |                                       **161 passed** |
| `npm run build`                                                                                                                                                                                       | Passed; 20 static pages including `/tools/split-pdf` |
| `npm audit --omit=dev`                                                                                                                                                                                |                                **0 vulnerabilities** |
| `curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/tools/split-pdf`                                                                                                                       |                                             HTTP 200 |

Final handoff gates after the implementation/documentation pass also passed: `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm audit --omit=dev` (0 vulnerabilities), a fresh `npm run build` (20 static pages) and `git diff --check`.

Firefox/WebKit are configured to run `pdf-splitter.spec.ts`, but those browsers were not available in this sandbox and are therefore **not claimed as executed here**.

## 7. Issue found and fixed during QA

The first Splitter browser run passed 4/5 workflows. The remaining test exposed two separate issues:

1. The test initially tried to set two files on a deliberately single-file input. The test was corrected to exercise the real multi-file drag/drop path instead of weakening the product UI.
2. Axe found `aria-prohibited-attr` on the PDF status badge container because a generic `div` had an `aria-label` without a role. The container is now a named `group`. The production build was regenerated and both PDF browser suites then passed 10/10.

No Merger defect was found in the post-merge rerun.

## 8. Bundle measurements

Measured from the production build used for browser QA:

| Asset                    |             Raw |          Gzip |
| ------------------------ | --------------: | ------------: |
| Split worker entry chunk |    17,653 bytes |   6,359 bytes |
| Shared PDF engine chunk  |   605,632 bytes | 254,660 bytes |
| Splitter component chunk |    42,307 bytes |  11,904 bytes |
| Lazy PDF.js main chunk   |   455,544 bytes | 134,896 bytes |
| PDF.js worker            | 1,264,342 bytes | 374,032 bytes |

PDF code stays route/worker-lazy. The shared engine chunk increased modestly from the Merger handoff measurement because it now contains the additional isolated split function used by the Splitter worker.

## 9. Visual and accessibility review

Screenshots in this directory were captured from the production preview with a synthetic six-page PDF and inspected:

- `01-empty-desktop.png` — empty state, privacy banner and dropzone.
- `02-plan-desktop.png` — split methods, custom ranges, counts and exact output plan.
- `03-result-desktop.png` — validated result, first-output preview, ZIP and individual downloads.
- `04-source-mobile.png` — 390px source card, status and sticky action.
- `05-extract-mobile.png` — 390px tappable extraction previews with included/excluded states.

Automated quality coverage includes Axe on empty and populated Splitter states and overflow checks from 320px through 1440px.

## 10. Known fidelity limits

PDF Splitter does not promise preservation of:

- Original outline/bookmark trees, named destinations or page labels.
- Attachments/portfolios.
- Optional-content layer behavior.
- Tagged structure/PDF-UA conformance.
- XMP/source metadata beyond each new output title and normal document information.
- Document JavaScript/actions or dynamic XFA behavior.
- Digital-signature validity.
- PDF/A identity.
- Every complex annotation/link or interactive AcroForm behavior.

Safe same-output internal destinations are retained where the shared sanitizer can repair them; destinations/actions pointing outside an output are removed and reported rather than left broken. Supported forms are flattened; unprovable forms block. Encrypted sources require a user-supplied authorized open password and produce unencrypted outputs.

## 11. Owner-review decision required

Please review the preview, screenshots and this report. Until explicit owner approval is recorded:

- Status remains **implemented — awaiting owner approval**.
- Do not merge this Splitter workstream into `main`.
- Do not deploy/index.
- Do not start any third PDF tool.
