# Stage 2 Audit — PDF Tools

Audit at checkpoint `416dd50`, branch `arena/0f4d0d5c-quickkit`. Read-only; no
PDF tool code was modified to produce this report.

## 1. Tool inventory

| Tool                        | Component                            | Lines | Route                  |
| --------------------------- | ------------------------------------ | ----- | ---------------------- |
| PDF Studio (the PDF Editor) | `components/tools/pdf-studio.tsx`    | 2,108 | `/tools/pdf-studio`    |
| PDF Merger                  | `components/tools/merge-pdf.tsx`     | 2,245 | `/tools/merge-pdf`     |
| PDF Splitter                | `components/tools/split-pdf.tsx`     | 2,098 | `/tools/split-pdf`     |
| PDF Compressor              | `components/tools/compress-pdf.tsx`  | 2,339 | `/tools/compress-pdf`  |
| PDF to Image                | `components/tools/pdf-to-image.tsx`  | 1,123 | `/tools/pdf-to-image`  |
| Images to PDF               | `components/tools/images-to-pdf.tsx` | 1,104 | `/tools/images-to-pdf` |
| PDF to Word                 | `app/tools/pdf-to-word`              | —     | `/tools/pdf-to-word`   |

Engines in `lib/tools/pdf/`: `compress-engine.ts`, `merge-engine.ts`,
`split-pdf-logic.ts`, `merge-pdf-logic.ts`, `compress-pdf-logic.ts`,
`pdf-preview.ts`, plus worker types and `use-pdf-{compress,merge,split}-worker.ts`.

## 2. Capacity — the 1,000-page target is already met in the engines

Verified in `lib/tools/pdf/*.ts`:

```
maxPagesPerFile: 1000
maxTotalPages:   2000
maxFiles:        20 / 25
```

**This is the most consequential audit finding.** The merger and splitter
engines already satisfy the 1,000-page target and enforce it with explicit
messages rather than truncating. Stage 2 capacity work should therefore target
the _converter_ tools and the UI layer, not these engines. Raising them further
would be needless risk against working, tested code.

## 3. Capability matrix

Counts are case-insensitive hits in each component. `0` means absent.

| Capability                         | pdf-studio | merge-pdf | split-pdf | compress-pdf |
| ---------------------------------- | ---------- | --------- | --------- | ------------ |
| Select all                         | 0          | 1         | 1         | 0            |
| Invert selection                   | 0          | 1         | 1         | 0            |
| Rotate selected                    | 0          | 0         | 0         | 0            |
| Header / footer text               | 0          | 0         | 0         | 0            |
| Undo                               | 0          | 0         | 0         | 0            |
| Virtualised list / lazy thumbnails | 0          | 0         | 0         | 0            |

Confirmed absent across the whole of `lib/tools/` and `components/tools/`:
`headerText`, `footerText`.

## 4. Page numbering — partially implemented already

`lib/tools/pdf-studio.ts` already carries:

| Option                            | State                            |
| --------------------------------- | -------------------------------- |
| Enable/disable                    | ✅ `pageNumbers` (`:99`)         |
| Format string                     | ✅ `pageNumberFormat` (`:100`)   |
| Position (6 corners)              | ✅ `pageNumberPosition` (`:101`) |
| Font size                         | ✅ `pageNumberSize` (`:103`)     |
| Watermark text/opacity/size/angle | ✅ (`:105+`)                     |
| **Custom starting number**        | ❌                               |
| **Prefix / suffix**               | ❌                               |
| **Roman numerals**                | ❌                               |
| **Font family / colour**          | ❌                               |
| **Custom margins**                | ❌ (hardcoded 24 pt)             |
| **Exclude cover page / selected** | ❌                               |

So Stage 2 item 5 is roughly 40% done. The plumbing — pure `pageNumberLabel` +
`pageNumberPlacement`, and a stamping pass in `buildDocument` that runs _after_
the page loop so numbering follows final page order — exists and is
unit-tested. What is missing is the option surface and per-page targeting.

**"Numbering must follow the final page order" is already satisfied** by that
ordering, which is worth preserving rather than re-deriving.

## 5. Gaps that block the brief

1. **No selection-set abstraction in pdf-studio.** Page operations act per id
   (`setRemoved`, `toggleRemoved`, `rotatePage`, `duplicatePage`), which is why
   rotate-selected, rotate-all, select-all, invert and odd/even are all absent
   together. `lib/tools/batch/selection.ts` (Stage 1) supplies exactly this and
   is unused so far.
2. **No headers/footers at all.** New work, but it can reuse the same stamping
   pass as page numbering.
3. **No undo/redo in any PDF tool.** Stage 1 found a reusable generic
   `History<T>` in `lib/tools/image-crop.ts:664`.
4. **No virtualisation or lazy thumbnails in any PDF tool.** At 1,000 pages this
   is the failure mode that makes the capacity target unusable in practice.
   `IntersectionObserver` precedent exists in `components/reveal.tsx:28` with a
   feature-detection fallback worth copying.
5. **No bounded-concurrency primitive wired into the PDF UIs.** Stage 1's
   `runBounded` is available and unused.

## 6. Reusable infrastructure already available (do not rebuild)

| Need                                     | Exists at                                                                                         |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Selection set                            | `lib/tools/batch/selection.ts`                                                                    |
| Bounded concurrency, retry, skip, cancel | `lib/tools/batch/concurrency.ts`                                                                  |
| Generic undo/redo                        | `lib/tools/image-crop.ts:664` (`createHistory` / `commitHistory` / `undoHistory` / `redoHistory`) |
| Page-number stamping                     | `lib/tools/pdf-studio.ts` `buildDocument`                                                         |
| Lazy-load pattern + fallback             | `components/reveal.tsx:21-28`                                                                     |

## 7. Safety constraints carried forward

- **Password-protected PDFs must stay refused.** Verified earlier that
  `pdf-lib`'s `save({userPassword, ownerPassword})` is a **silent no-op**
  returning an unencrypted file, so protection must not be offered. Detection
  uses `instanceof EncryptedPDFError`; both error classes report
  `.name === "Error"`, so a name check does not work.
- **Corrupt PDFs must not be reported as password-protected.** That defect was
  fixed in `runPdfStudio`; do not regress it.
- Everything stays local. No upload path exists in these tools.

## 8. Honest constraints on verification

**There is no browser binary in this sandbox** — `playwright install` fails with
`ECONNRESET`. Unit tests and the production build run locally; the e2e suite
runs only in CI. Real memory measurements at 500/1,000 pages, and any
mobile/desktop screenshots, are therefore **not obtainable here**. The brief
requires 1,000-page claims to be stress-verified, so no such claim should be
made on the basis of this environment alone.

## 9. Recommended execution order

1. Wire `SelectionSet` into pdf-studio → unlocks rotate-selected, rotate-all,
   select-all, invert, odd/even at once.
2. Virtualised page list + lazy thumbnails → precondition for any capacity use.
3. Page-numbering option surface on the existing plumbing; add headers/footers
   to the same stamping pass.
4. `History<T>` for undo/redo.
5. Wire `runBounded` into the processing paths.
6. Extend engines' capacity only if measurement shows a need — they are already
   at 1,000/2,000.
