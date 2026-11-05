# V5.3 root-cause analysis — how the "compressed, overlapping text" reached users

The pipeline is: ZIP/DOCX → OOXML model → layout → `pdf-lib` draw → PDF bytes →
`pdf.js` preview → download. Each stage was inspected with real bytes. This
document records what actually failed, in pipeline order, and why the test suite
of the time could not see it.

## Stage 1 — package intake (`docx.ts`)

_Symptom:_ some genuine documents were rejected outright.

_Cause:_ the "no macros" check matched on the _entry path_ — any ZIP member whose
path matched `vbaProject|activeX|oleObject` failed the whole package. Real Word
files contain e.g. `word/embeddings/oleObject1.bin` for an embedded Excel chart,
which is data, not code.

_Fix:_ reject only executable/macro payloads (`*.bin|exe|dll|docm` under
`embeddings/`, `vbaProject.bin`), keep everything else.

_Why tests missed it:_ fixtures were generated with `docx` (no embeddings). Only
real-world files expose it.

## Stage 2 — OOXML parse (`ooxml.ts`)

### 2a. Line spacing (the headline defect)

`<w:spacing w:line="276" w:lineRule="auto"/>` — Word's default for "1.15 lines".
The parser stored `line = 276` and the layout used it as **points**, so every line
was 13.8 pt tall around 11 pt text: ascenders and descenders of consecutive lines
overlapped. Measured on 41 documents before the fix: 0–hundreds of overlap pairs
per page; after: **0**.

Correct reading: `auto` → `line / 240` multiplier (276 → 1.15);
`exact|atLeast` → `line / 20` points.

### 2b. Table formatting only from direct properties

`styles.xml` defines the borders and cell margins for `TableGrid`; the table in
`c-tables.docx` carries none of its own. Resolution order is now
direct → style chain (`basedOn`) → document defaults, and `Edge.width = sz/8` pt.

### 2c. Rows inside content controls

`tableParts()` now recurses through `sdt | sdtContent | customXml | ins | del |
moveFrom | moveTo` when collecting `tr` and `tc`. Before the fix,
`invoice2013.docx` lost its entire line-item table (`ITEM1 … $120`) while still
producing a valid PDF — silent data loss.

### 2d. Numbering indentation

A numbered/bulleted paragraph's indent lives in `numbering.xml`
(`w:lvl/w:pPr/w:ind`), not in the paragraph. Ignoring it put the bullet at x=0 and
the text at the first default tab stop (36 pt grid), which made lists look broken
and pushed body text under the page margin.

### 2e. Tabs

`\t` inside a run was folded into a space by the whitespace splitter; right-aligned
tab stops were unsupported. Resume headers therefore rendered as
`Principal Engineer — Meridian Docs 2021 — present` on one line instead of the date
pinned to the right margin. Tabs are now their own token with left/centre/right
alignment and look-ahead width; list labels snap to the hanging indent.

### 2f. Text boxes

`w:txbxContent` was parsed in only one of the block paths (the body loop built its
own inline sections), so text boxes in the body were dropped.

## Stage 3 — layout (`render.ts`)

The spacing bug lived in `lineHeight()`. Two secondary issues were found while
measuring: a table grid shorter than the widest row collapsed cells (now padded and
floored at 8 pt), and cell edges were drawn twice by adjacent cells (now owned by
the left/top cell, with right/bottom only at boundaries or across spans).

## Stage 4 — drawing and PDF bytes

Verified with PyMuPDF and `pdfjs-dist` on the produced files: page count, page
size, glyph boxes, font sizes, image XObjects and vector paths. No defect found at
this stage after the layout fixes — 0 overlaps on 18 documents, coverage 1.00.

One earlier hypothesis was **wrong** and is recorded so it is not retried: a
"squeezed table" and a `toc.docx` paragraph were suspected of clipped drawing
(tab stops, `columnWidths`, pagination). Instrumentation showed the paragraph's
lines were laid out completely and the apparent loss came from page-number chrome
interleaved into extracted text at a page break. The remaining audit artefacts are
now explicitly filtered (`docs/WORD_TO_PDF_V5_2_QA.md` §2).

## Stage 5 — preview

The preview was suspected of showing only page 1. In fact
`lib/tools/pdf-to-word/preview-pdf.ts` renders any page on demand and
`preview-resources.tsx` mounts pages through `IntersectionObserver`; the real
problem was that the pages it rendered _were_ the defective ones. Fixing the
renderer fixed the preview, because the preview is the same byte array as the
download.

## Why the pre-V5.2 test suite was blind

| Test pattern                                     | Why it passed a broken renderer                                       |
| ------------------------------------------------ | --------------------------------------------------------------------- |
| "conversion returns bytes starting with `%PDF-`" | Any structurally valid PDF passes                                     |
| "page count > 0"                                 | Overlapping text still produces pages                                 |
| Snapshot of the model, not the output            | The model was already correct; the drawing was wrong                  |
| Fixtures generated by `docx`                     | Never exercised `w:sdt` rows, `U+0085`, `titlePg`, style-only borders |
| No geometric assertions                          | Nothing compared glyph boxes to each other or to the page             |

The replacement (V5.2) asserts **output geometry**: overlap pairs, blank pages,
font-size range, image count, per-run text presence, page size per section.

## Residual limitations (confirmed, not assumed)

- Charts, SmartArt, OLE objects and equations are not laid out; a warning is
  emitted and their text is counted as missing.
- Calibri/Cambria fall back to the closest base-14 face; the substitution is
  reported in `warnings`.
- Complex-script shaping relies on the embedded Noto fonts; extraction-based
  assertions are skipped for those runs by design.
- LibreOffice fidelity and real-browser E2E remain unverified in this sandbox
  (no `soffice`, no downloadable Chromium).
