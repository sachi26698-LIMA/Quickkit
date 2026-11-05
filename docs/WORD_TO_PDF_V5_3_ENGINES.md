# V5.3 engine comparison

Criteria requested: fidelity, fonts, tables, images, performance, memory,
deployment, licence, security, maintenance. Values are either measured in this
workspace (marked) or taken from the project's documentation (linked in
`WORD_TO_PDF_V5_3_RESEARCH.md`).

## 1. Matrix

| Criterion               | QUICKKIT built-in (this repo)                                                                                                                                        | LibreOffice headless                                                                                 | Gotenberg (LibreOffice engine)                         | Collabora Online / CODE                  | docx-preview                                                               | mammoth                                          |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ---------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------ |
| Output                  | PDF (`pdf-lib`)                                                                                                                                                      | PDF                                                                                                  | PDF                                                    | PDF export, WOPI editing                 | HTML only                                                                  | HTML/Markdown                                    |
| Layout fidelity         | Approximate, deterministic; measured 0 overlaps and full text coverage on the acceptance corpus                                                                      | Highest OSS fidelity (reimplements Word layout)                                                      | Same as LibreOffice                                    | Same as LibreOffice                      | Visual approximation inside HTML/CSS; no pagination except explicit breaks | Semantic only — no fonts/sizes/colours by design |
| Fonts                   | Base-14 PDF faces + embedded Noto for non-Latin; Calibri/Cambria substituted (warning surfaced)                                                                      | System fonts; needs MS fonts installed for exact Calibri                                             | Container fonts; can bake in MS core fonts             | Container fonts                          | Browser fonts                                                              | Ignored                                          |
| Tables                  | Style-chain resolution (direct → `basedOn` → `styles.xml`), borders, insets, shading, merged cells, nested tables, row splitting across pages                        | Full                                                                                                 | Full                                                   | Full                                     | Basic tables, merged cells reported OK                                     | Flattened to `<table>`                           |
| Images                  | Inline PNG/JPEG decoded and placed at their document size                                                                                                            | Full (incl. EMF/WMF)                                                                                 | Full                                                   | Full                                     | Base64/blob, fine                                                          | Basic                                            |
| Headers/footers         | `titlePg`, odd/even parts, `PAGE`/`NUMPAGES` resolved                                                                                                                | Full, incl. fields                                                                                   | Full                                                   | Full                                     | Not paginated                                                              | Dropped                                          |
| Sections / orientation  | Per-section page size and margins                                                                                                                                    | Full                                                                                                 | Full                                                   | Full                                     | Section breaks end a "page"                                                | Dropped                                          |
| Charts / SmartArt / OLE | Not laid out — warning emitted                                                                                                                                       | Charts yes, OLE partially                                                                            | Same                                                   | Same                                     | No                                                                         | No                                               |
| Performance (measured)  | 100 p 1.4 s · 250 p 2.3 s · 500 p 2.2 s · 1000 p 4.6 s (Node, this sandbox)                                                                                          | ~2–3 s for a small file, startup dominates; batch in one invocation (third-party cheatsheet timings) | Adds HTTP hop; container start dominates               | Per-document kit process                 | Fast, but no PDF                                                           | Fast                                             |
| Memory (measured)       | Peak RSS 188/272/336/367 MB for 100/250/500/1000 pages                                                                                                               | Process per conversion, hundreds of MB                                                               | ≥ ~1 GB container                                      | ~300–450 MB idle per third-party reports | Tens…hundreds of MB in tab                                                 | Low                                              |
| Deployment              | Zero extra infrastructure; runs in the Next.js Node runtime and in the browser worker                                                                                | Needs the binary + fonts in the image; `-env:UserInstallation` per process to avoid profile lock     | Docker service (easy on Vercel-adjacent infra via URL) | Container + reverse proxy + WOPI         | Static JS                                                                  | Static JS                                        |
| Licence                 | MIT (own code) + Apache-2.0 (`pdf-lib`, `pdfjs`)                                                                                                                     | MPL-2.0                                                                                              | MIT                                                    | MPL-2.0 (CODE)                           | Apache-2.0                                                                 | BSD-2-Clause                                     |
| Security                | No upload by default (browser path); server path requires an explicit same-origin consent header; ZIP/DOCX validation; 20 MiB and page caps; no macros/OLE execution | Macro execution must be disabled (`--safe-mode`, no macro sandbox by default)                        | Container isolation; disable macros                    | Needs hardened container and auth        | Client-side                                                                | Client-side                                      |
| Maintenance             | Ours; protected by 1,170 tests incl. two quality suites                                                                                                              | Very active                                                                                          | Active                                                 | Active                                   | Active                                                                     | Active                                           |

## 2. Why not "just use LibreOffice"

LibreOffice is the best available fidelity, and the repo already supports a
`WORD_TO_PDF_WORKER_URL` remote worker plus a local binary path. It is not the
default here because in this environment it cannot be exercised at all:

```
$ which soffice libreoffice   # → nothing
$ apt-get install libreoffice # → cannot reach deb.debian.org
```

Shipping a code path that has never run would repeat the mistake this task is
meant to fix. The honest configuration is: built-in renderer as the measured
baseline, LibreOffice as the opt-in fidelity upgrade with a documented setup
(`docs/WORD_TO_PDF_V5_SETUP.md`), and the UI labelling which engine produced the
file (`engine`, `native`, `fidelity` fields in `GET /api/word-to-pdf`).

## 3. Why not an HTML renderer

`docx-preview` and `mammoth` both produce HTML. Their own documentation states the
limits: docx-preview is "limited by HTML capabilities" and only breaks pages on
explicit/`lastRenderedPageBreak`/section changes; mammoth "aims to produce simple
and clean HTML … ignoring other details" such as fonts and sizes. Using either as
the renderer would recreate exactly the complaint that started this task —
layout that does not match the document and cannot be trusted as a PDF.

## 4. Decision summary

| Situation                           | Engine                                                                     |
| ----------------------------------- | -------------------------------------------------------------------------- |
| Default, no infrastructure          | Built-in renderer (`engine: "builtin"`, `native: false`)                   |
| `WORD_TO_PDF_WORKER_URL` configured | Remote LibreOffice worker (`native: true`) — fidelity path                 |
| Local binary present                | Sandboxed local LibreOffice worker                                         |
| Preview                             | `pdf.js` on the produced PDF bytes — always the same bytes as the download |
