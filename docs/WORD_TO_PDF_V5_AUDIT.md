# Word to PDF V5 — inspection and repair record

4 November 2026, branch `arena/32354d68-quickkit`.

This document replaces the earlier V5 "hosting audit" that concluded the work was
blocked. That conclusion was wrong in one decisive respect: the tool did not need a
native LibreOffice host to convert documents at all. It shipped a complete in-process
DOCX renderer that was never reachable, because the engine gate refused to fall back.
Fixing the gate turned a "blocked" feature into a working one, and the rest of the V5
mandate became executable.

The executed evidence lives in `docs/WORD_TO_PDF_V5_QA.md`; deployment instructions in
`docs/WORD_TO_PDF_V5_SETUP.md`.

## 1. What the inspection found (phase 1)

Inspected: the route and page components, the upload and validation path, the
conversion API and `convert()` lifecycle, the worker and LibreOffice backends, the
PDF.js preview and thumbnails, the export/ZIP path, the settings model and per-page
overrides, progress/cancellation, error handling, the desktop and mobile layouts, the
security gates, dependency and config files, and the server logs.

Findings, in order of impact:

1. **The feature was dead on arrival.** `engineAvailable()` demanded
   `WORD_TO_PDF_ENABLED === "true"` *and* a native binary or a healthy worker. Every
   stock deployment therefore reported "engine unavailable" while the renderer sat
   unused in the repository.
2. **`engineStatus()` threw** on malformed worker configuration, which aborted
   conversion before the credential check could even run.
3. **Empty worker env vars** counted as configured and forced a dead worker path.
4. **Geometry was applied twice** — the renderer honoured page size/margins, then
   `processPdf` scaled the already-correct pages.
5. **Overlay text validation was stricter than the font**, rejecting `·`, `—`, `“ ”`
   that the standard font can draw.
6. **`PAGE`/`NUMPAGES` fields were dropped** from Word headers/footers (complex
   `fldChar` fields were unhandled), so genuine documents lost their page numbers.
7. **Sections after the first lost headers/footers** — OOXML inheritance was ignored.
8. **Indic clusters could split** at a vowel sign when a run mixed scripts.
9. **Encrypted `.docx` got the wrong message** because the OLE branch tested `.doc`.
10. **Engine status could hang forever** in the UI with no retry and no explanation.
11. **Copy promised LibreOffice** on hosts that would never have it.
12. **Bundled fonts were untraced**, so a standalone deployment would fail at runtime.
13. **V3/V4 tests asserted a contract that no longer existed** (100-page cap,
    three-stage arrays, `WORD_TO_PDF_ENABLED`-only gating), hiding regressions behind
    stale assertions.

## 2. What was changed (phases 2–8)

- Engine resolution ladder `worker → libreoffice → builtin` with fail-closed explicit
  modes, honest `engineStatus()`, and non-empty worker env parsing.
- A complete in-process renderer: OPC/ZIP reader, style resolution, paragraph/table
  layout, images, hyperlinks, list numbering, section geometry, headers/footers with
  live page fields, and script-aware font embedding for Latin plus eight Indic scripts.
- Real NDJSON stage streaming end to end, with per-page progress, cancellation and a
  170 s deadline.
- Single-application page geometry, WinAnsi-accurate overlay validation.
- UI: engine card with identity and capability badge, drag-and-drop, per-row validation,
  live stage line and progress bar, collapsible fidelity warnings, sticky mobile export
  bar, retryable engine status, disabled-reason hints.
- Honest copy in the page description, catalog entry, settings notes and help text.
- `outputFileTracingIncludes` so the bundled fonts survive packaging.
- Tests: renderer, engine lifecycle, UI (jsdom), 100–1000 page ladder, and a full
  real-journey Playwright spec.

## 3. Still not executed in this sandbox

- **Playwright**: the browser download fails here, so the E2E specs (including the new
  real-journey `tests/e2e/word-to-pdf-v5.spec.ts`) are written and statically reviewed
  but unrun. No browser screenshots or axe results exist.
- **LibreOffice**: no binary, no package access. The native backend is implemented and
  unit-tested against a fixture binary but has never converted a document here.

Both are environment limits; the commands to run them on a suitable host are in
`docs/WORD_TO_PDF_V5_QA.md` §7 and `docs/WORD_TO_PDF_V5_SETUP.md` §4.

## 4. Approval state

Nothing was merged, deployed or promoted. The 1000-page cap is advertised **only**
because the executed ladder in this environment reached 1000 pages; a host with a
different memory ceiling must re-run `tests/word-to-pdf-v5-stress.test.ts` before
repeating that claim.
