# Owner review — Image to Text (OCR), PR #19

Prepared 5 November 2026. Branch `arena/cac1764b-quickkit`, head `23df75c`.
**PR #19 is open, mergeable, and has not been merged or deployed.** Nothing was merged to `main` and
nothing was promoted to production by this work.

Everything below is either a measured result or is explicitly marked as unverified.

---

## 1. Preview URL

**https://quickkit-git-arena-cac1764b-quickkit-sachi26698-6758s-projects.vercel.app**

This is a public Vercel preview, not localhost. Evidence that it is current:

| Evidence                                       | Value                                     |
| ---------------------------------------------- | ----------------------------------------- |
| Vercel reports for every commit on this branch | `success` (5 deployments, one per commit) |
| Latest deployment status on head `23df75c`     | success, 5 Nov 2026                       |
| Vercel "Preview" link in the PR bot comment    | resolves to the URL above                 |

Caveat I must state plainly: this sandbox's network is allow-listed to GitHub/npm/PyPI, so **I could not
load the Vercel URL myself** and cannot click through it. The deployment statuses above are what Vercel
reports to GitHub. If the preview looks stale, re-deploy from the branch — the alias tracks branch head.

Local dev server used for all captures below: `http://127.0.0.1:3000` (**not** a public URL; listed only so
you know what produced the screenshots).

---

## 2. Screenshots — 11 real captures, all in `docs/screenshots/`

Taken with Chromium 153 driven by Playwright against the running app. Nothing is a mockup or a
reconstruction.

| File                             | Size      | What it proves                                                                                                   |
| -------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------- |
| `desktop-01-empty.png`           | 1440×900  | Empty workspace: upload drop zone, 8 language chips, extraction modes                                            |
| `desktop-02-uploaded.png`        | 1440×900  | 3-file batch staged, per-file cards, Select all / Deselect / Invert, 2 languages selected                        |
| `desktop-03-result.png`          | 1440×900  | After **Start OCR**: every file `Done`, batch progress `3/3 pages · 5.1s`, script detection `Gujarati 98 %`      |
| `desktop-04-full.png`            | 1440×full | Whole page: workspace, export panel, "How to use", FAQ, related tools, footer                                    |
| `desktop-05-upload-workflow.png` | 1440×900  | Upload workflow close-up: gallery, per-file progress, run bar, batch summary                                     |
| `desktop-06-editor.png`          | 1440×900  | Extraction editor: 3 page tabs with confidence (94/95/96 %), real Gujarati text, undo/redo/find, detected script |
| `desktop-07-export.png`          | 656×420   | Export options isolated: 4 scopes, TXT/DOCX/PDF/CSV/JSON/Copy/ZIP                                                |
| `mobile-01-empty.png`            | 390×844   | Phone empty state, sticky Start OCR bar in reach                                                                 |
| `mobile-02-uploaded.png`         | 390×844   | Phone: 3 files staged with upload panel in view                                                                  |
| `mobile-03-result.png`           | 390×844   | Phone: editor with real Gujarati and Export panel directly beneath                                               |
| `mobile-04-full.png`             | 390×full  | Whole phone page — results before settings                                                                       |

Measured on the phone viewport: **`scrollWidth − innerWidth = 0`** (no horizontal overflow), 3 page tabs.

One honesty note visible in the shots: the Bengali/Tamil/Telugu chips and their thumbnails render as tofu
boxes. That is the **test machine having no fonts for those scripts**, not the app — the app ships its own
font stack. It does not affect English, Hindi or Gujarati, which are the scripts under test.

---

## 3. Changed files and diff summary

Against `main` as it stands now (`origin/main` = `9946479`). The branch was **5 commits behind** and had gone
`CONFLICTING` while under review; it has been merged up and is now `MERGEABLE`.

**61 files changed, +12,789 / −41.**

### New — logic (`lib/tools/image-to-text/`, 4,763 lines)

| File            | Lines | Role                                                           |
| --------------- | ----- | -------------------------------------------------------------- |
| `types.ts`      | 500   | Types, limits, the 8 shipped languages                         |
| `runner.ts`     | 522   | Batch queue, progress, cancellation, worker lifecycle          |
| `preprocess.ts` | 493   | Rotation, deskew, scaling, contrast/noise                      |
| `extract.ts`    | 485   | Lines → blocks, tables, key/value fields                       |
| `export.ts`     | 990   | TXT, DOCX, PDF, CSV, JSON, ZIP builders                        |
| `prepare.ts`    | 471   | File → pages (images and scanned PDFs)                         |
| `geometry.ts`   | 409   | Line/cell geometry, table detection                            |
| `engine.ts`     | 316   | tesseract.js worker wiring                                     |
| `editor.ts`     | 220   | Undo/redo, find & replace                                      |
| `pdf-text.ts`   | 167   | Browser shaping and line geometry for the PDF text layer       |
| `language.ts`   | 137   | Script detection                                               |
| `encode.ts`     | 53    | ImageData → PNG bytes (**the fix that made browser OCR work**) |

### New — UI (`components/tools/image-to-text/`, 2,986 lines)

`index.tsx` (859), `editor-pane.tsx` (494), `settings-panel.tsx` (496), `crop-dialog.tsx` (232),
`preview-pane.tsx` (157), `export-panel.tsx` (331), `upload-panel.tsx` (310), `shared.tsx` (107).

### New — page and docs

`app/tools/image-to-text/page.tsx` (80), `docs/QA_IMAGE_TO_TEXT.md` (213), 11 screenshots (2.8 MB).

### New — tests (2,726 lines)

8 unit/component files (2,333 lines) and `tests/e2e/image-to-text.spec.ts` (393 lines, 13 tests),
plus 13 fixtures (10 images, 2 Noto TTFs, 1 JPEG).

### Modified existing files — this is the complete list

| File                              | Change          | Why                                                        |
| --------------------------------- | --------------- | ---------------------------------------------------------- |
| `lib/catalog.ts`                  | **+23 / −1**    | One new catalogue entry + name-priority search ranking     |
| `components/tool-icon.tsx`        | **+2**          | `ScanText` icon import and one map entry                   |
| `app/globals.css`                 | **+1,819 / −0** | One appended `i2t-*` block; zero existing selectors edited |
| `package.json`                    | **+10**         | 5 OCR language packs, `@cantoo/fontkit`, `jpeg-js` (dev)   |
| `package-lock.json`               | **+97**         | Generated by npm                                           |
| `README.md`                       | **+29 / −28**   | Tool table row, count 29, setup note                       |
| `scripts/copy-ocr-assets.mjs`     | **+8 / −5**     | Copy 8 language packs instead of 3                         |
| `tests/catalog.test.ts`           | **+30 / −6**    | Assert the new tool does not outrank JSON Formatter        |
| `tests/split-regression.test.tsx` | **+3 / −1**     | Derived counts instead of a hard-coded total               |

Note on dates: `main` moved a lot during review (legal pages, QPDF, calculators). The `README.md` diff above
therefore looks like a revision of text this PR never wrote — see §7.

---

## 4. The interface, walkthrough

1. **Upload** — drop zone accepting JPG/PNG/WEBP/BMP/TIFF/AVIF/GIF and scanned PDFs, 40 files / 25 MB each.
   Every file becomes a card with a thumbnail, its own status, and reorder / rotate / crop / re-run / remove
   controls. Select all, Deselect and Invert act on the batch. Nothing leaves the tab.
2. **Choose what to read** — 8 language chips (English, Hindi, Gujarati, Marathi, Bengali, Tamil, Telugu,
   Urdu). Multi-select is allowed; nothing outside those 8 is claimed anywhere.
3. **Run** — one click. The batch bar shows per-file progress, the current page, and a working Cancel. The
   engine runs in a Web Worker, so the page stays responsive.
4. **Extract and edit** — page tabs carry each page's confidence. Text is editable, with undo/redo, find &
   replace, copy, and low-confidence words highlighted against the threshold slider.
5. **Export** — 4 scopes (combined / this page / selected pages / one file per page) × 7 formats
   (TXT, DOCX, PDF, CSV, JSON, Copy, ZIP).

Measured in Chromium, JS heap via CDP: a 12-megapixel scan in **2.29 s**, a 4-file batch in **2.47 s**,
Cancel effective in **0.5 s**, heap steady at **13 MB** throughout.

---

## 5. Existing tools and catalog search are unaffected

| Check                                                                       | Result                                                                           |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Unit/integration suite                                                      | **75 files / 1,290 tests passing** (main's 1,283 + 7 new)                        |
| Every tool route returns 200                                                | **31 / 31**                                                                      |
| Categories sum to the catalogue                                             | 31 = 31 across all 8 categories                                                  |
| Every tool findable by its own name                                         | **31 / 31**, none shadowed                                                       |
| `core`, `foundation`, `browser-tools`, `premium-tools`, `image-to-text` E2E | **44 / 45 passing**, the 1 failure being the pre-existing password-keyboard test |
| `category/text-writing`, `/tools?q=json`, `/saved`, `/`                     | 200 and correct                                                                  |

Catalogue search does change in one deliberate, documented way, and it was a **defect fix**: `filterTools`
now ranks name matches above keyword matches, so typing `json` lands on JSON Formatter even though other
tools mention JSON. A guard test asserts this. This is the only behavioural change to shared code.

---

## 6. The remaining E2E failures, compared with `main`

The number moved because `main` moved and because one of these tests is flaky. Here is the current,
settled comparison — both runs from the same CI configuration, on the final head:

|                                        | `main` (`9946479`) | This branch (`23df75c`, final) |
| -------------------------------------- | ------------------ | ------------------------------ |
| Failing E2E tests in CI                | **21**             | **21**                         |
| Are the two failure sets identical?    | —                  | **Yes, test for test**         |
| Failures unique to this branch         | —                  | **0**                          |
| OCR (`image-to-text.spec.ts`) failures | 0                  | **0**                          |

Distribution of the 21 (identical on both):

| Spec                     | Tests | Tool                                                                  |
| ------------------------ | ----- | --------------------------------------------------------------------- |
| `image-to-image.spec.ts` | 10    | Image to Image (target file size)                                     |
| `images-to-pdf.spec.ts`  | 3     | Images to PDF (page setup, live preview)                              |
| `pdf-studio.spec.ts`     | 3     | PDF Studio                                                            |
| `pdf-to-image.spec.ts`   | 3     | PDF to Image                                                          |
| `legal-pages.spec.ts`    | 1     | Legal pages                                                           |
| `pdf-splitter.spec.ts`   | 1     | PDF Splitter (flaky — it passed on the previous run of both branches) |

So: **this PR introduces no failing test, changes no other tool's result, and leaves the suite exactly as
green as `main` is.** Every remaining failure needs a real browser and, judging by the assertions, runner
rendering/timing behaviour; fixing them means editing five unrelated tools, which belongs in its own PR.

Numbers quoted earlier during this review (19, then 20) were real at the time: they were measured against
`main` before `main` gained the PDF Lock & Unlock tool, and the `pdf-splitter` test is intermittently red.
This table is the current, reproducible one. I would rather show you the moving number and its cause than a
single tidy figure.

Two failures this branch _did_ cause were found and fixed on the way here:

- CI's `npm test` failed because the OCR accuracy suite shelled out to ImageMagick. Fixed by decoding the
  JPEG fixture with `jpeg-js`; the suite has no system-binary dependency now.
- Listing output formats as OCR keywords made `json` return two tools and broke `foundation.spec.ts`.
  Fixed, with a regression test in both directions.

## 7. No existing tool was modified unintentionally

Verified by inspecting the complete diff against `main` rather than trusting the summary:

- **Zero** existing tool components, workers, or `lib/tools/*` directories for other tools are touched. The
  only `lib/` change outside `lib/tools/image-to-text/` is `lib/catalog.ts`.
- `app/globals.css` is **additive only** (+1,819, −0): the new rules are scoped under `.i2t-`, so they
  cannot restyle another tool.
- `lib/catalog.ts` is additive plus the search-ranking fix described in §5.
- `components/tool-icon.tsx` gains one import and one map entry.
- The remaining modified files are tests, package metadata, a copy script and the README.

Two accidental changes were found during this review and reverted:

1. Running the full browser suite locally regenerated **91 evidence images** in `docs/` (percentage, phase-9
   and pdf-lock specs write those on every run), and a blanket `git add` swept them in. All 91 are now
   byte-identical to `main`. Worth knowing: `npm run test:e2e` mutates tracked files.
2. `next-env.d.ts` had been rewritten by the dev server (`.next/dev/…` paths). Reverted to `main`'s version.

Two pieces of stale copy that still described the old rasterised PDF export were corrected: the export
panel footnote and the page FAQ.

---

## 8. Honest limitations

- The OCR spec passes **13/13 in Chromium**; Firefox and WebKit were not exercised for this tool.
- Only synthetic fixtures were used — no real scanner or phone-camera photographs. That means skew, blur,
  JPEG artefacts and 12 MP size are covered; lens distortion and paper texture are not.
- Hindi reads at **3.1 %** character error rate (one conjunct slip); English and Gujarati are **0.0 %** on
  clean renders. No handwriting guarantee is made anywhere in the UI.
- In the PDF, the invisible layer is Helvetica, so a viewer's selection _rectangles_ can differ slightly from
  the drawn script. Search, copy and screen readers get correct Unicode.
- **21** CI E2E failures remain, exactly the same 21 as `main`, all in other tools (see §6).
- Local `npm run test:e2e` cannot complete here (727 tests, sandbox too slow); CI is the source of truth for
  those numbers, and its logs/artifacts are not reachable from this sandbox, so failure names come from the
  `github` reporter's annotations, which is why the comparison is per test rather than per log line.

---

## 9. Status

**PR #19 — https://github.com/sachi26698-LIMA/Quickkit/pull/19 — open, mergeable, not merged, not deployed.**

Ready for your review. On approval the merge is a single `gh pr merge 19 --merge`; I will not do that, or
deploy, without your explicit go-ahead.
