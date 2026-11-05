# Word to PDF V3 — delivery and QA

**4 November 2026 · `/tools/word-to-pdf` · implemented for review, not production-approved.**

V3 extends the existing V2 route and shared PDF processor. Native DOCX acceptance remains blocked: LibreOffice is absent/disabled here. Successful preview screenshots and the demo PDF are explicitly labelled authored PDF fixtures with a mocked native response, **not evidence of DOCX conversion fidelity**.

## Final verification

| Check | Final result |
|---|---|
| Full Vitest suite | **1,021 PASS / 54 files** (`npm test`) |
| Word-specific units | 94 total: original 23, V2 32, fake-native-adapter 4, V3 32, real-PDF stress/guard 3 |
| Word Chromium E2E | **15 PASS**: original 4 + V2 4 + V3 7 (1.2 min) |
| Wider selected Chromium suite | **47 PASS / 1 FAIL / 48 tests** (2.7 min); unchanged Splitter hydration race described below |
| TypeScript | `npm run typecheck` PASS |
| ESLint | `npm run lint` PASS, no warnings |
| Production build | `npm run build` PASS; current preview serves that production build |
| Whitespace | `git diff --check` PASS |
| Desktop/mobile accessibility | axe checks in V2 and V3 PASS, zero violations; 390 px no horizontal overflow |
| Native DOCX stress | **BLOCKED**, not a pass; operator probe exited 2 without uploading documents |

Full verification commands:

```sh
npm test
npm run typecheck
npm run lint
npm run build
git diff --check
LD_LIBRARY_PATH=/tmp/lib PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/tmp/chromium \
  npm run test:e2e -- tests/e2e/word-to-pdf.spec.ts \
  tests/e2e/word-to-pdf-v2.spec.ts tests/e2e/word-to-pdf-v3.spec.ts \
  --project=chromium --workers=1
```

The wider run added `core.spec.ts`, `pdf-merger.spec.ts`, `pdf-splitter.spec.ts`, `pdf-compressor.spec.ts` and `pdf-to-word.spec.ts`. Its sole failure remains `pdf-splitter.spec.ts:207`: synthetic drop immediately after `goto` precedes hydration, so “2 files were not added” never appears. It was already recorded in V2. A separate current-build diagnostic waited for the existing **Choose a PDF** control to be enabled, dispatched the same two-file drop, and passed all three original rejection assertions. Neither Splitter source nor its test was changed. This diagnostic does **not** turn the 47/48 result into an all-green suite. Firefox/WebKit, physical-device and manual screen-reader QA remain outstanding.

## What changed and what the tests prove

- Stable output-page identities reference immutable native source indices or actual blank pages. Reorder, delete, independently duplicate/rotate, insert blanks, select/deselect all, explicit ranges, multiple selection and move-to-section change the **saved PDF**, not just labels. Desktop mouse drag/drop and mobile touch move buttons are exercised.
- Editor sections are output ordering groups. Moving to a section relocates actual pages; it does not create Word section reflow or promise PDF bookmarks. Page ranges/order remain available from V2 when the visual plan is reset.
- Thirty data-only settings/plan history snapshots support undo **and redo**, including branching and clearing redo after a new edit. PDF buffers are not retained in history. Native refresh/file operations are not historical PDF-version snapshots; undoing native options can require a consented refresh.
- Headers/footer, background, overlay fonts/size/colour/alignment, numbering/template/style/top-bottom, watermark and PDF geometry have global/file settings plus selected-page overrides. Changing one selected property preserves all other per-page overrides. Number templates support `{n}`, `{total}`, `{section}`, Arabic/Roman, start number, skip-first and output ranges. Numbers follow output positions, including unprinted positions. Explicit per-page header/footer/number switches override their global range gates; global skip-first still applies.
- Overlays use the **displayed page coordinates**, including native/global/per-page rotation, rather than putting bottom numbering on the left of a rotated sheet. Four actual PDF matrix tests verify 0/90/180/270-degree positioning. Text watermark size is fitted to its rotated bounds; images preserve aspect/transparency where supported.
- PNG/JPEG image watermarks are actual embedded PDF image XObjects. One local asset per document, up to 256 KiB / 4 MP / 4,096 px per edge. No URL/SVG loading. Selected pages can toggle/size/fade the asset. File reads and object URLs are cleaned up.
- Selected-page extraction copies **already-final** pages, retaining their rotation/geometry/header/watermark/numbering exactly once. Complete/selected export, custom file names, existing metadata/native quality presets, individual/batch ZIP and reports remain supported.
- ZIP export runs in one worker, copying/transferring 1 MiB chunks without detaching retained preview bytes. Input-byte/entry progress is real; cancellation terminates the worker. Retry/custom ZIP names and byte-identical PDF entries are checked. Cancellation tests deliberately add yield/transport latency to make the controls reachable; they are **not throughput benchmarks**.
- Native uploads still require consent. Local edits, image assets, plans, overlays and metadata are not sent in base-mode native request headers. Only native rendering options are sent. No silent re-upload; automatic refresh remains a separate revocable opt-in.
- Export gates compare the full effective settings and native signature. Superseded/cancelled/invalid output cannot be exported. If new native pagination changes the source count, the visual plan blocks with an actionable error. The new base remains retained: explicit visual reset recovers locally without another upload. Cancellation/retry after consent revocation is tested with no additional POST.
- Original DOCX/PDF comparison links source-page navigation and zoom mode/percentage, maps duplicates back to their source, and explicitly identifies inserted blanks with no original. It reports approximate DOCX/native/edited counts and warns about potential font, table/image/header/footer and pagination differences. **It is not an automatic font-substitution detector, semantic layout diff, authoritative Word reference or fidelity score.** Out-of-range approximate DOCX pages are explicitly labelled/clamped rather than fabricated.

## Actual 100 / 500 / 1,000-page evidence

[PDF fixture measurements](word-to-pdf/v3/pdf-fixture-stress.json), [browser thumbnail measurements](word-to-pdf/v3/browser-100-page-fixture-metrics.json), [blocked native probe](word-to-pdf/v3/native-stress-blocked.json).

| Actual authored PDF fixture | Observed result in final full unit run |
|---|---|
| 100 pages | Reordered all 100; numbering/watermark and independent rotations verified; native bytes unchanged. Source 42,782 B → final 88,865 B. Edit + parse verification about **176 ms**. |
| 500 pages | Generated/parsed actual 214,072 B PDF; **rejected** by the unchanged 100-page cap, about **43 ms** to reject. Not supported editing/conversion. |
| 1,000 pages | Generated/parsed actual 430,311 B PDF; **rejected** by the unchanged cap, about **77 ms** to reject. Not 1,000-page support. |

These are small text/vector fixtures, not representative production Word documents or image-heavy/native benchmarks. RSS samples/maxRSS in JSON are process-level observations, not isolated per-case or browser/native-server peak guarantees. In the 100-page browser test, only 8 initial / 5 end-window rows were mounted (bound 10), with 3 peak live thumbnail URLs in the final wider run; after clearing files the live URL count reached zero. Offscreen rows unmount and revoke URLs; both editor and viewer thumbnail rails are windowed.

A separate actual image-PDF regression duplicates one 512×512 RGB image page to **100 independent pages**, checks the asset reference is shared, only one page is rotated, page headers do not accumulate across duplicates, and final bytes remain below twice the source size. Mutable contents/resource containers and annotation coordinates are isolated while immutable image/font streams are shared. This prevents the earlier per-copy asset multiplication risk. Annotation rectangle independence is verified during selected geometry scaling.

Native 100/500/1,000-page DOCX conversions were **not run successfully**: the real endpoint reported unavailable. The operator probe recorded all three as BLOCKED, no upload, no fallback. The production source/output cap stays **100**, and remains provisional for native Word workloads. The missing native/fidelity/image-heavy/physical-mobile memory tests are release blockers, not hidden exceptions.

## Deliverables and reproduction

- [Technical audit](WORD_TO_PDF_V3_AUDIT.md)
- [Visual editor/operator guide](WORD_TO_PDF_V3_EDITOR_REPORT.md)
- [Engine status and release gates](WORD_TO_PDF_V3_ENGINE_STATUS.md)
- [Exact V3 changed-file inventory](WORD_TO_PDF_V3_CHANGED_FILES.md)
- [Screenshots/demo index](word-to-pdf/v3/README.md)
- [Real edited PDF demonstration](word-to-pdf/v3/editor-demo-authored-fixture.pdf) — authored/mock-native fixture, not DOCX conversion

The V3 browser suite reproduces the real edited PDF and screenshots on the existing route, with explicit request interception only inside the tests. There is no hidden production demo route or fake successful engine mode. V1/V2 test screenshots now go to ignored `test-results/` so reruns do not overwrite historical V1/V2 committed evidence; the only V2 assertion selector change is the requested mobile **Settings → Edit** tab rename.

Checkpoints: `1807951` preserves the previously uncommitted V2 baseline; `3abf9e1` adds the audited PDF model/processor; `e1a86e8` integrates the visual studio; `c10e848` hardens duplicated resources, rotated overlays and cancellable ZIP; `ec1e3aa` budget-checks refreshed native bases before retention. Final QA/docs/stress assets are a separate checkpoint. No branch switch, merge, deployment or push was performed.
