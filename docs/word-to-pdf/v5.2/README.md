# Word to PDF acceptance corpus (V5.2 / V5.3)

Two kinds of input live here.

## 1. Generated acceptance corpus (`corpus/*.docx`)

Written by `scripts/word-to-pdf-v5.2-corpus.mjs` with the `docx` npm package, so
the files are byte-reproducible and reviewable in a diff. Each file isolates one
acceptance case:

| File                       | Case | What it exercises                                                            |
| -------------------------- | ---- | ---------------------------------------------------------------------------- |
| `a-simple.docx`            | A    | Headings, 1.15 line spacing, footer with `PAGE`/`NUMPAGES`                   |
| `b-resume.docx`            | B    | Right-aligned tab stops, bullet numbering with hanging indent, header rule   |
| `c-tables.docx`            | C    | Header shading, borders, merged row, nested table, wrapping sibling cell     |
| `d-images.docx`            | D    | Two inline PNGs at different sizes, caption text                             |
| `e-headers-footers.docx`   | E    | `titlePg` first-page parts, default parts, page fields                       |
| `f-fonts.docx`             | F    | Five font families, four weights/styles, three sizes, colours, mixed scripts |
| `g-landscape.docx`         | G    | A4 landscape section                                                         |
| `h-mixed-orientation.docx` | H    | Portrait → landscape → portrait sections                                     |
| `i-complex-report.docx`    | I    | Six pages of headings, justified body, header and footer                     |
| `j-stress-100-pages.docx`  | J    | 100 chapter pages                                                            |
| `k-stress-250-pages.docx`  | —    | 250 chapter pages (stress ladder)                                            |

Regenerate with:

```bash
node scripts/word-to-pdf-v5.2-corpus.mjs
```

## 2. Real-world corpus (`corpus/real/*.docx`)

Three genuine Microsoft Word files from the [docx4j](https://github.com/plutext/docx4j)
sample corpus (Apache-2.0) — see `corpus/real/NOTICE.md`. These are the documents
that exposed the `w:sdt`-wrapped table rows, the `U+0085` run and the textbox
regressions.

## 3. Evidence and samples

- `evidence/*.png` — one rendered page per case at 80 dpi, produced from the PDFs
  the test suite wrote (post-fix).
- `samples/*.pdf` — three full sample outputs (`b-resume`, `c-tables`,
  `invoice2013`) for inspection outside the test run.

Everything in this directory is input or evidence; no generated artefact here is
used by the app at runtime.
