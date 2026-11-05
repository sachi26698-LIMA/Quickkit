# V3 evidence index

4 November 2026. All images are actual Chromium captures of the existing tool, not design mockups. **Native conversion is unavailable on this installation.** Captures ending `-mocked-engine.png` use an explicitly mocked native response containing a real authored PDF; they verify PDF.js preview/edit/export, not Word conversion fidelity. The document itself visibly says `AUTHORED PDF FIXTURE / native response mocked`.

## Actual disabled installation

- [Desktop, engine unavailable](desktop-engine-unavailable.png)
- [Mobile, engine unavailable](mobile-engine-unavailable.png)

## Real PDF editing with authored/mock-native fixture

- [Desktop visual page editor](desktop-page-editor-mocked-engine.png)
- [Linked approximate DOCX / final PDF comparison](comparison-linked-mocked-engine.png)
- [Mobile Files / Preview / Edit controls](mobile-edit-controls-mocked-engine.png)
- [Mobile page cards / touch move controls](mobile-touch-editor-mocked-engine.png)
- [Mobile full-viewport real PDF](mobile-fullscreen-mocked-engine.png)
- [Actual four-page edited PDF demonstration](editor-demo-authored-fixture.pdf)

[Artifact hash and actual page geometry/rotation](artifact-manifest.json) record the delivered PDF.

The demo exports actual final bytes after duplication, independent rotation, blank insertion/deletion, moving a page into an Appendix editor section, Roman numbering/custom templates, selected-page header, text watermark and a locally authored PNG watermark. The extracted-page output is independently tested for retained final numbering/rotation. The inserted blank is a real PDF page and intentionally receives a QA annotation/number from the selected settings.

The “engine available” label in successful test captures comes solely from Playwright's disclosed endpoint interception, not from this machine having LibreOffice. No such interception/fallback/demo mode is shipped in the app. Actual disabled-engine captures above show the installation's real state.

## Stress/guard measurements

- [Actual authored PDF 100/500/1,000-page measurements](pdf-fixture-stress.json): 100-page edits pass; 500/1,000 are rejection tests, not supported conversions.
- [100-page browser window/object-URL measurements](browser-100-page-fixture-metrics.json): bounded mounted rows, observed live/peak thumbnail URLs. Clearing files is asserted to reach zero live thumbnail URLs.
- [Native stress availability probe](native-stress-blocked.json): all native cases blocked; no document upload or simulated successful conversion.

Reproduce screenshots/demo with `tests/e2e/word-to-pdf-v3.spec.ts`. See [the QA report](../../WORD_TO_PDF_V3_QA.md), [editor guide](../../WORD_TO_PDF_V3_EDITOR_REPORT.md) and [engine release gates](../../WORD_TO_PDF_V3_ENGINE_STATUS.md). Measurements are fixture/environment-specific and do not certify large Word conversion, native fonts/layout, low-memory physical devices or peak RSS.
