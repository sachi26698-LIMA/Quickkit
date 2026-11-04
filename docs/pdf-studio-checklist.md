# PDF Studio — feature checklist and QA report

Step 7 of the combined-converter split. The tool lives at `/tools/pdf-studio`,
catalogue slug `pdf-studio`, category **PDF Tools**, icon `pdfStudio`, colour
`purple`, phase 3, inserted after `pdf-to-image`.

It works at page level across **several** PDFs: merge, extract, split, compress,
plus per-page rotate, reorder and remove. Everything runs in the browser — pages
are read with PDF.js and written with pdf-lib.

Engines are **reused, not re-implemented**: `runPdfStudio` from
`lib/tools/image-convert-runner.ts`, the plan helpers from `lib/tools/pdf-studio.ts`
(`buildPageList`, `rotatePage`, `movePage`, `toggleRemoved`, `keepOnlyRanges`,
`dropRanges`, `splitGroups`, `planProblem`, `describePlan`, `studioOutputName`),
and `PDF_COMPRESSION_PRESETS` from `lib/tools/pdf/compress-pdf-logic.ts`. These
are the same engines the standalone PDF Merger, Splitter and Compressor use.

## Evidence key

| Mark | Meaning                                                                     |
| ---- | --------------------------------------------------------------------------- |
| ✅   | Verified by a command actually run in this workspace, output recorded below |
| ⏳   | Written and listed, but needs a real browser to execute (CI-only)           |
| ⛔   | Not implemented, and deliberately not advertised in the UI                  |
| ❌   | **Not yet done — open gap** (none remain in this report)                    |

## 1. Features required by the brief

| #   | Requirement               | Status | Where it is proven                                                                                                 |
| --- | ------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------ |
| 1   | Upload multiple PDFs      | ✅     | Dropzone is `accept={PDF_ACCEPT}` with `multiple`; input id/testid `pdf-studio-input`                              |
| 2   | Merge                     | ✅     | `PDF studio action` = "Merge into one PDF"; `summarisePlan` reports one output                                     |
| 3   | Split by ranges           | ✅     | action "Split by ranges"; `splitGroups` yields one PDF per range                                                   |
| 4   | Extract                   | ✅     | action "Extract selected pages"; `keepOnlyRanges`                                                                  |
| 5   | Delete pages              | ✅     | `toggleRemoved` / `setRemoved`; removed pages counted in the plan line                                             |
| 6   | Drag-drop reorder         | ✅     | `movePage` / `dropPage` with `studioDragIdRef` + `studioDragOverId`                                                |
| 7   | Rotate individual pages   | ✅     | `rotatePage(pages, id, ±90)`; quarter turns only, matching the runner                                              |
| 8   | Compress                  | ✅     | action "Compress" + `PDF compression quality` preset select                                                        |
| 9   | Thumbnails                | ✅     | `PdfGallery` renders real pdf.js canvases                                                                          |
| 10  | Page count + file info    | ✅     | Queue row shows real `pageCount`; results show real byte size via `formatBytes`                                    |
| 11  | Individual downloads      | ✅     | Per-result download button                                                                                         |
| 12  | Batch / multiple outputs  | ✅     | Split writes one PDF per range; ZIP via `zipOutputs` ("Download all as ZIP")                                       |
| 13  | Plan shown before running | ✅     | `describePlan(studioPlan)` rendered as `converter-studio-summary` (unit-tested)                                    |
| 14  | Blocking invalid plans    | ✅     | `planProblem` rendered as `role="alert"` (`converter-studio-problem`); run button disabled while set (unit-tested) |

## 2. Features deliberately not shipped

- ⛔ **No mode switcher.** The four-mode tab strip is gone from this route.
- ⛔ **No image pipelines.** Image→Image, Images→PDF and PDF→Image each have
  their own tool now; this route takes PDFs only.
- ⛔ **No text editing or OCR.** PDF Studio rearranges and rebuilds pages; it does
  not edit text. PDF to Word remains the tool for text layers.
- ⛔ **No before/after compare slider.** There is no single "before" image to
  compare against a rebuilt document.
- ⛔ **No pause/resume or batch report table.** A studio run is one write pass.

## 3. What was actually run here

| Command                                             | Result                                                                           |
| --------------------------------------------------- | -------------------------------------------------------------------------------- |
| `npm run format:check`                              | ✅ `All matched files use Prettier code style!`                                  |
| `npx eslint .`                                      | ✅ no output, exit 0                                                             |
| `npx tsc --noEmit`                                  | ✅ exit 0, zero diagnostics                                                      |
| `npx vitest run`                                    | ✅ **733 passed / 39 files** (was 719/38 before this step)                       |
| `npx vitest run tests/pdf-studio-settings.test.tsx` | ✅ 14/14                                                                         |
| `npm run build`                                     | ✅ compiles; `/tools/pdf-studio` prerendered static                              |
| `npx playwright test --list`                        | ✅ 666 tests / 27 files **at the time of Step 7** — see §4, superseded in Step 8 |
| Route sweep vs fresh build                          | ✅ **39/39 routes → 200**                                                        |

Route sweep: 29 tool pages + 8 category pages + `/` + `/tools`, all `200`,
derived from `lib/catalog.ts` rather than a guessed list.

Catalogue counts were **probed by importing the real module**, not assumed:

```
PDF_EMPTY = ["image-converter","images-to-pdf","pdf-to-image","pdf-studio",
             "merge-pdf","split-pdf","compress-pdf","pdf-to-word"]
PDF_EXTRACT = ["split-pdf"]        (unchanged by the new record)
PDF_COUNT = 8
```

`tests/catalog.test.ts` and `tests/launch.test.ts` were updated from those
values: both empty-filter PDF slug lists gain `pdf-studio`, PDF Tools 7→8,
sitemap 46→47 (10 static + 8 category + 29 tool). All 4 previously failing
assertions now pass.

## 4. e2e coverage — gap opened in Step 7, closed in Step 8

At the time this report was written (Step 7) there was **no** e2e spec for PDF
Studio, and the unchanged Playwright manifest (666 tests / 27 files) was the
evidence. That gap is now **closed**.

Step 8 deleted `tests/e2e/image-converter.spec.ts` when the combined converter was
retired. That spec contained a "PDF Studio" describe block which was the only e2e
coverage of studio behaviour anywhere in the repo, so rather than lose it the 9
cases were ported into `tests/e2e/pdf-studio.spec.ts`, retargeted to
`/tools/pdf-studio` and the `pdf-studio-input` control. The encrypted-PDF fixture
was recovered from git history instead of being rewritten.

Those 9 cases assert real output bytes, which is exactly what was missing:

| Case                                                     | What it proves                                                   |
| -------------------------------------------------------- | ---------------------------------------------------------------- |
| merges two PDFs into one document in queue order         | merged `PDFDocument.getPageCount()` is 5 from sources of 2 and 3 |
| reordering the grid changes the order in the written PDF | written page order follows the grid                              |
| removed pages are not written                            | output page count drops from 4 to 3                              |
| rotating a page changes its written rotation             | `getPage(0).getRotation().angle === 90`                          |
| extract writes only the selected pages                   | `2-3` from 5 pages yields a 2-page PDF                           |
| split writes one PDF per range and offers a ZIP          | ZIP holds 2 entries, each a 2-page PDF                           |
| compresses the kept pages and reports the result         | compressed output still loads with the right page count          |
| a plan with no kept pages cannot run and says why        | `role="alert"` message and a disabled run button                 |
| an encrypted PDF is refused with a clear message         | password-protected input is rejected, not blanked                |

Current manifest: **661 tests / 27 files**. The move from 666 is −44 for the
deleted combined spec, +9 for the ported studio spec, and +30 because
`tests/e2e/quality.spec.ts` generates 10 tests per route and its route list gained
3 net entries when `/tools/image-converter` was replaced by the four split routes.

Two caveats that remain honest:

- These cases are **written and listed, not executed here**. No browser can be
  installed in this sandbox, so they run in CI.
- The compress case asserts that the output is a valid PDF with the correct page
  count, **not** that it is smaller than its source. The fixture is text-heavy and
  `planPdfEmbedSize` never upscales, so a size-reduction assertion would be weak
  or vacuous. Reduction is covered by the dedicated `pdf-compressor.spec.ts`.

## 5. Known limitations (disclosed in the UI, not hidden)

- **Ranges apply per file.** `1-2` with two PDFs queued takes pages 1–2 of each.
  The field hint says this in exactly those words, and it is unit-tested.
- **Compression recompresses image streams only.** Text is left alone, so it stays
  crisp — and a text-heavy document shrinks less than a scan. The hint says so.
- **Rotation is quarter turns only**, matching the shared runner's
  `normalizeRotation`.
- **Split parts get their range appended** to the file name by
  `studioOutputName`, which also sanitises unsafe characters.
- **Input ceilings** come from the shared limits: 25 MB and 100 pages per PDF.
- **An empty plan is refused, not guessed.** "Every page is marked as removed.
  Keep at least one page." and "No page matches that range." are real
  `planProblem` returns, surfaced as `role="alert"`.

## 6. Relationship to the existing standalone tools

PDF Merger, PDF Splitter and PDF Compressor **remain as separate catalogue cards**
per the owner's decision. PDF Studio is additive and calls the same engines rather
than duplicating their logic, so a fix to a shared engine reaches all four. The
FAQ on the page states this explicitly rather than implying the older tools are
redundant.

## Phase 7 Phase D addendum (2026-11-04)

### Duplicate page — implemented

Brief §6 asks for "duplicate pages". It did not exist.

- `duplicatePage` is pure plan logic beside `movePage` and `dropPage`, so it is
  unit-testable without a browser.
- The copy inherits the source's rotation and is always inserted kept, even
  when the source is struck through — duplicating is an explicit request for
  another usable copy, not a request to clone a deletion.
- Ids come from the module's existing sequence counter, so React keys stay
  unique across repeated duplication.

Verified: 7 unit cases plus 2 e2e cases. The e2e case asserts the real output
PDF gains the page via `PDFDocument.load`, not merely that the grid shows
another tile.

### Implemented after the note above was written

Two items originally listed here as not implemented were subsequently built.
They are recorded rather than silently edited out, so the history stays honest.

- **Add page numbers** (commit `3481ccd`). Numbers are stamped in
  `buildDocument` after every page is placed, so the total is known and
  numbering is sequential in the written document regardless of the source
  page numbers — which matters because the studio reorders and drops pages.
  Uses pdf-lib's built-in Helvetica, so no font file is fetched or bundled.
  Six positions, four layouts, 6–36 pt. A real defect was found and fixed:
  `pageNumberLabel` originally left unknown tokens in place, which would have
  stamped a literal `{bogus}` onto every page.
- **Metadata editing** (commit `ccb5582`). Author, subject and keywords were
  added alongside the existing title. Empty fields are skipped so an unfilled
  form does not overwrite anything the source carried. `parseKeywords` splits
  on comma or semicolon and de-duplicates case-insensitively.

### Text watermarks — implemented (commit `a2141c4`)

Listed as not implemented above; built afterwards. Reuses the text-stamping
plumbing added for page numbering rather than introducing a second path, and
uses pdf-lib's built-in HelveticaBold, so no font file is fetched or bundled.
The watermark is drawn after page numbers so it sits on top, and only when the
field is non-empty — blank writes nothing at all.

`watermarkPlacement` is pure geometry. The draw origin is offset by half the
_rotated_ text box because pdf-lib rotates about the draw origin; without that
offset a 45 degree watermark drifts off centre and clips on narrow pages. The
test reconstructs the rotated box centre from the returned origin at
0/15/45/-45/90 degrees and asserts it lands on the page centre, so a
regression in the trigonometry fails rather than silently producing off-centre
watermarks.

### Still not implemented — reported rather than stubbed

- **Password protection and unlocking** remain unsupported. Decryption of a
  password-protected PDF is refused with an explicit message. The brief scopes
  this to "only where supported and authorized", so this is a disclosed
  limitation, not a gap.
