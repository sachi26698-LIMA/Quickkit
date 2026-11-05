# V5.3 research report — DOCX → PDF engines and workflows

Scope: choose the rendering strategy for QUICKKIT's Word → PDF tool on evidence,
not on preference. Everything below was read during this session; links are the
pages that actually informed a decision. Where a vendor does not publish an
implementation detail I say so instead of guessing.

## 1. Format and renderer specifications

### 1.1 OOXML (ECMA-376 / ISO 29500)

The document is a ZIP of parts; the body order is `document.xml`, and everything
that affects layout lives either inline (`w:pPr`, `w:rPr`, `w:tblPr`) or in
references (`w:pStyle` → `styles.xml`, `w:numPr` → `numbering.xml`,
`w:headerReference`/`w:footerReference` → `headerN.xml`/`footerN.xml`). Three
consequences drove this work:

- **Style inheritance is not optional.** Measured in
  `docs/word-to-pdf/v5.2/corpus/c-tables.docx`: `<w:tblBorders>` exist only in
  `styles.xml` (`TableGrid`); the table element itself is bare. A renderer that
  reads only direct formatting draws an empty-looking table — exactly the V5.1
  symptom.
- **Content controls wrap block content.** `w:sdt > w:sdtContent > w:tr` is legal
  and appears in real files (`corpus/real/invoice2013.docx`, 76 `w:sdt` elements,
  4 per data row). Direct-child filters silently drop those rows.
- **`w:spacing` has two meanings.** `w:line` + `w:lineRule="auto"` is a
  _multiplier_ in 240ths (`276` → 1.15); `lineRule="exact"|"atLeast"` is twips of
  absolute leading. Treating `276` as 13.8 pt produces overlapping lines — the
  "compressed text" defect. This is the single highest-impact bug found.

### 1.2 PDF text and font model

PDF has no notion of a paragraph: `Tj`/`TJ` operators place glyphs at
coordinates. Every quality metric in this repository is therefore computed from
extracted glyph boxes, not from the DOM we intended to draw. Text extraction from
complex scripts is visually ordered, which is why the automated audit skips Indic
runs (documented in `docs/WORD_TO_PDF_V5_2_QA.md` §2).

## 2. Libraries and services evaluated

| Option                                                                                       | Licence              | Maintenance signal                                             | Verdict                                                                                                                                                           |
| -------------------------------------------------------------------------------------------- | -------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **QUICKKIT built-in renderer** (`pdf-lib` + own OOXML parser)                                | MIT                  | In-repo, we own it                                             | **Chosen as the default path** — measured 0 overlaps, full text coverage, 1000 pages in 4.6 s                                                                     |
| [LibreOffice](https://www.libreoffice.org/) headless (`soffice --headless --convert-to pdf`) | MPL-2.0              | Very active; the reference implementation for OOXML→PDF in OSS | **Preferred when present** — already wired as the native worker; not installable in this sandbox (`deb.debian.org` unreachable, no `soffice`)                     |
| [Gotenberg](https://gotenberg.dev/)                                                          | MIT                  | Active (v8)                                                    | Good deployment wrapper around LibreOffice + Chromium; adds a ~1 GB container. Documented as an option, not adopted                                               |
| [Collabora Online / CODE](https://www.collaboraonline.com/)                                  | MPL-2.0 (CODE image) | Active                                                         | LibreOffice core behind WOPI; meant for interactive editing. Overkill for one-shot conversion                                                                     |
| [docx-preview / docxjs](https://github.com/VolodymyrBaydalka/docxjs)                         | Apache-2.0           | Active                                                         | Renders DOCX to **HTML**, "limited by HTML capabilities"; page breaks only at manual/`lastRenderedPageBreak`/section changes per its own README. Not a PDF engine |
| [mammoth.js](https://github.com/mwilliamson/mammoth.js)                                      | BSD-2-Clause         | Active                                                         | Semantic HTML/Markdown by design — explicitly ignores font, size, colour. Unusable for fidelity                                                                   |
| [PDF.js](https://github.com/mozilla/pdf.js) / `pdfjs-dist`                                   | Apache-2.0           | Active (6.5.x)                                                 | Used for **preview and verification**, not generation                                                                                                             |
| [docx4j](https://github.com/plutext/docx4j)                                                  | Apache-2.0           | Active                                                         | Java; used here only as the source of real-world test documents                                                                                                   |

Sources for the library rows: docx-preview's own README/limitations page
([socket.dev listing](https://socket.dev/npm/package/docx-preview)), mammoth's
licence and goal statement ([jsDelivr package page](https://www.jsdelivr.com/package/npm/mammoth)),
`pdfjs-dist` ([npm](https://www.npmjs.com/package/pdfjs-dist)), Gotenberg
([gotenberg.dev](https://gotenberg.dev/), [configuration](https://gotenberg.dev/docs/configuration)),
LibreOffice CLI mechanics and the `-env:UserInstallation` concurrency trap
([converterer.com LibreOffice headless cheatsheet](https://www.converterer.com/blog/libreoffice-headless/)),
PDF export parameters ([LibreOffice help: PDF parameters](https://help.libreoffice.org/latest/en-US/text/shared/guide/pdf_params.html)).

## 3. Competitor workflows

| Tool                                                                                   | What the vendor publishes                                                                                                                                       | Retention / jurisdiction | Engine stated?    |
| -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ | ----------------- |
| [Adobe Acrobat online Word→PDF](https://www.adobe.com/acrobat/online/word-to-pdf.html) | 100 MB uploads, DOC/DOCX/RTF/TXT, "handled by secure Adobe servers… deleted after processing unless you sign in"                                                | Adobe cloud              | No                |
| [CloudConvert](https://cloudconvert.com/docx-to-pdf)                                   | Privacy policy: files deleted automatically within 24 h, ISO 27001 (TÜV Süd), German company (Lunaweb GmbH; [privacy policy](https://cloudconvert.com/privacy)) | EU/Germany               | No                |
| [iLovePDF](https://www.ilovepdf.com/word_to_pdf)                                       | [Security page](https://www.ilovepdf.com/help/security): files "automatically and permanently deleted within two hours"; ISO 27001, GDPR, eIDAS                 | Spain/EU                 | No                |
| [PDF24](https://tools.pdf24.org/en/word-to-pdf)                                        | [FAQ](https://tools.pdf24.org/en/faq): files deleted within one hour; EU data centres; free **desktop** app processes locally                                   | Germany/EU               | No                |
| [Smallpdf](https://smallpdf.com/word-to-pdf)                                           | Retention varies by tool/account per third-party reviews (1 h account, longer anonymous) — **not verified against the vendor page in this session**             | EU                       | No                |
| [Sejda](https://www.sejda.com/word-to-pdf)                                             | Third-party reviews report ~2 h deletion and a desktop edition — **not verified in this session**                                                               | EU                       | No                |
| Microsoft Word "Save as PDF"                                                           | Local, no upload; the reference layout engine                                                                                                                   | n/a                      | Word's own layout |

Observation that shaped the design: **none of the online competitors disclose
their engine**, and every one of them uploads the document. That is the gap a
local, in-browser conversion path fills — and the reason QUICKKIT keeps the
document on the device wherever possible.

## 4. Decisions

1. **Keep the built-in renderer as the default**, because it is the only engine
   that runs in this environment and it now passes measured quality gates. Do not
   claim Word or LibreOffice fidelity for it.
2. **Keep the LibreOffice worker as the preferred path when a binary or remote
   worker exists**, because LibreOffice is the only OSS engine that reimplements
   Word's layout rather than approximating it. Its limits (font availability,
   layout drift on very complex documents) are documented, not hidden.
3. **Reject HTML-based preview renderers** (docx-preview, mammoth) as engines:
   they cannot produce a paginated PDF, and their READMEs say so.
4. **Verify with extracted PDF geometry**, never with "the code ran".
