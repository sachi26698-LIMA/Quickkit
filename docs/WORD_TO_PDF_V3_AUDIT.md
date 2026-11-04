# Word to PDF V3 — inspection and technical audit

4 November 2026. Branch `arena/15621ae8-quickkit`, initially at `881d174`. The entire completed V1/V2 implementation was in the working tree, not in commits. It was preserved in checkpoint `1807951` before V3 edits; no reset, checkout, re-clone or discard occurred.

Read: TOOL_DEVELOPMENT_STATUS.md, V2 QA/operations/audit, native adapter and endpoint, shared process-pdf.ts, settings, use-studio batch/history, viewer, original DOCX pane, preview resource lifecycle and test setup.

## Existing / missing / blocked
- Existing: real PDF.js rendering, lazy thumbnails, navigation/zoom/fit/full-viewport mode, global rotation, text-layer search, native/final and approximate DOCX comparison, shared local/server PDF pipeline, consent-gated sequential native transport, stale-output export gate, quality/metadata/batch ZIP/reports.
- Missing: identity-based visual page operations, duplication/blanks/deletion/per-page rotation, editor sections, undo redo (V2 undo only), selected-page extraction, per-page appearance, custom numbering formats, watermarks and synchronized DOCX navigation/zoom. V2 thumbnails are lazy but retain visited thumbnails; V3 must window/unmount offscreen rows.
- Still blocked: `libreoffice` and `soffice` are not on PATH; native conversion is disabled by default. Existing native deployment requires isolated persistent Linux hosting, not default Vercel serverless. Native font/chart/layout fidelity and real 100/500/1,000-page DOCX stress cannot be declared passed here. The 100-source/output-page cap will stay; 500/1,000 fixtures must be rejected rather than advertised as supported.

## Extension plan (not a V2 rebuild)
1. Add a bounded identity-based visual plan to existing settings, default null so all V2 range/export behavior remains intact. It references immutable native source page indices or actual inserted blank pages. Source page count mismatch after native reflow blocks edits pending explicit reset.
2. Extend process-pdf.ts to materialize the visual plan, apply page-specific geometry/appearance/rotation, shared numbering format and text/image watermarks. Preview and export still use the exact same final bytes. Extract selected pages from those final bytes, not from native/unwatermarked source.
3. Extend the existing settings history with redo. Plans/overrides are data-only; snapshots share image strings and never hold PDF buffers. Bound history to 30 and final pages to 100. Keep native signature independent of all local visual edits.
4. Keep visual plans and image watermarks local: strip them from the native request header. Upload consent and separately opted-in native refresh remain unchanged. Never simulate successful native conversion.
5. Add a dedicated virtualized page editor to the existing Files panel, with drag/drop plus touch/keyboard move buttons. Editor sections are output ordering groups, not Word section reflow or guaranteed PDF outlines.
6. Synchronize comparison page/zoom controls using actual source mapping; report observed approximate DOCX/output counts and potential font/layout limitations without inventing detected substitutions or fidelity scores.
7. Run PDF-output unit/browser verification, actual local-PDF 100-page stress, 500/1,000 guard tests, and an explicit native stress availability probe. Report native blockers separately from authored PDF fixture tests. Preserve unrelated tools and document any unchanged regression-test race.


## Audit closure / evidence

The planned existing-route extension is implemented in checkpoints `3abf9e1`, `e1a86e8`, `c10e848`. See [final QA](WORD_TO_PDF_V3_QA.md) and [editor report](WORD_TO_PDF_V3_EDITOR_REPORT.md). An implementation review identified and removed the risk of re-copying shared images/fonts for every duplicate: one copier shares immutable streams, while mutable content/resource containers and annotation geometry are isolated. Actual 100-copy image-PDF tests verify independent edits and bounded output growth. ZIP packing uses one bounded-chunk worker, not a synchronous UI-thread CRC loop. New native bases are checked against the retained-byte budget before being retained, including pagination-change failure paths.

Native blockers did not disappear: the real endpoint is unavailable, no native conversion/fidelity/stress success is claimed, and the cap remains 100. The 500/1,000-page actual PDF cases are explicit rejection tests. Automated font-substitution/semantic layout detection is not implemented; linked approximate comparison shows observed counts and honest manual-review warnings. These limitations and physical-device/cross-browser/operator release gates are preserved in the delivery report.
