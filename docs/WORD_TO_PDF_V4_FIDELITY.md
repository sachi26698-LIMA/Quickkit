# V4 genuine DOCX fidelity report

4 November 2026 — **BLOCKED: no native execution; no fidelity certification or actual native demo.** See the exact install/runtime blocker in `WORD_TO_PDF_V4_AUDIT.md` and operator procedure in `WORD_TO_PDF_V4_SETUP.md`.

| Requirement | Synthetic source coverage | Shared package validation | Actual LibreOffice / Word-reference comparison |
| --- | --- | --- | --- |
| Complex tables | Merged heading, multiple rows/columns, wrapping text | PASS | NOT RUN |
| Images | Embedded PNG at explicit geometry | PASS | NOT RUN |
| Charts | Cache-only two-category bar chart with no embedded workbook | PASS | NOT RUN; cache-only fidelity unknown |
| Custom fonts | Named `Quickkit Operator Test Font` run, intentionally not installed | PASS | NOT RUN; no embedding/substitution claim |
| Headers / footers | Multiple pages and both sections | PASS | NOT RUN |
| Page and section breaks | Explicit page breaks and new landscape section | PASS | NOT RUN |
| Hyperlinks | HTTP hyperlink relationship | PASS, existing allowed hyperlink rule retained | NOT RUN; click-test final PDF |
| Paper / orientations | A4 portrait + Letter landscape | PASS | NOT RUN; inspect actual page dimensions |
| Multipage | 100/500/1000-page-intent DOCX with 99/499/999 explicit page breaks | PASS | NOT RUN; rendered counts not assumed |
| Final preview/export edits | Existing V3 actual PDF pipeline | Authored/mock-native PDF tests PASS | NOT RUN with genuine native base |

Source inputs are `docs/word-to-pdf/v4/fixtures/*.docx`. Generate them with `node scripts/word-to-pdf-v4-fixtures.mjs <output-directory>`; set `WORD_TO_PDF_FIXTURE_FONT` to a real licensed installed font for an operator run. ZIP/XML validation is not semantic OOXML schema validation or visual validation; this authored cache-only chart has not been opened/rendered in Word/LibreOffice here. Fixture files can contain build timestamps; their archived hashes describe these exact inputs, not bit-reproducible native output.

**Unsupported:** DOCX containing embedded OLE/workbook parts is still rejected intentionally. Many ordinary Word charts include such workbooks. Do not advertise general chart support or loosen active-content guards to force a pass. Font substitution, chart style, complex row flow, Word field behavior, missing glyphs and layout differences require manual review even when native conversion succeeds. Baseline open fonts do not establish Microsoft/custom font fidelity.

A passing report must record the LibreOffice/image/package/font versions, source/reference/final hashes, actual page geometry/text/link checks, Microsoft Word reference exports, desktop/mobile actual final preview, exported bytes equality and named reviewer outcomes for each row. All those native fields remain absent/null in this delivery. The V3 authored PDF demo remains explicitly authored/mock-native, never promoted to a V4 genuine conversion demo.
