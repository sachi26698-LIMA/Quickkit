# QR Code Studio — premium UI redesign: QA and owner-review handoff

**Tool:** QR Code Generator (`qr-generator`), presented in-page as **QR Code Studio**
**Route:** `/tools/qr-generator`
**Status:** **redesign implemented — awaiting owner approval**
**Date:** 2 November 2026
**Branch:** `arena/8be11fd2-quickkit` (Arena session branch; three earlier QR commits on top of `main` at `799f12a`)
**Evidence in this folder:** 49 real-browser screenshots + `measurements.json` (per-capture overflow measurement)

> This is an owner-review handoff, not an approval or a launch record. Nothing was merged into
> `main`, nothing was deployed, no other tool or route was modified, and the QR encoding engine
> under `lib/tools/qr/` was deliberately left untouched by this pass — every change is layout,
> composition, copy and interaction. The owner must open the live preview, use every feature and
> approve the actual design before this is called done.

---

## 1. What the brief asked for

1. The attached reference image is a **mandatory layout input**: desktop two-column workspace,
   mobile arrangement, header/typography, purple-lavender palette, card style, preview
   positioning, tabs/controls/download section, and the Bulk CSV + History + Presets panels.
   Implement it, don't describe it, and adapt it to the existing QUICKKIT design system.
2. Desktop: Content type left, Design & Customize below it, live preview right with scan
   verification + QR metadata, download formats below the preview, Advanced Settings collapsed.
3. Mobile: compact header, `Create / Bulk / History / Presets` tabs, preview prominent,
   Content / Design / Advanced as compact accordions, reachable download controls, no horizontal
   overflow — verified at 375, 390, 430 and tablet widths.
4. Every existing feature preserved and still real: 12 content types, validation, live
   generation, independent decoding, colour/gradient controls, module + eye patterns, logo
   upload, premium templates, error correction + quiet zone, presets, local history, bulk CSV,
   PNG / high-res PNG / SVG / PDF, copy and share, contrast and scan verification.
5. UX: working sample for first-time users, polished empty state, never a false "scan verified",
   advanced collapsed initially, compact controls instead of long numbered sections, clear
   loading/success/error states, exports easy to find.
6. Bulk / History / Presets as separate workspace tabs matching the reference.
7. Light theme only, white + soft lavender surfaces, QUICKKIT purple accents, consistent radius,
   subtle shadows, no dark mode, no oversized empty spaces, no endless card stack.
8. Inspect existing code and tests first, work on the existing branch, then run lint, TypeScript,
   unit tests, production build, real browser tests (all features, all export formats,
   decode-after-redesign), desktop/tablet/mobile screenshots, a comparison against the reference
   with honest differences, and updates to `TOOL_DEVELOPMENT_STATUS.md` + this QA doc.

---

## 2. How the reference was implemented

| Reference element                               | Built as                                                                                                                                                                                                                                                                                                                                                                                  |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Product header + nav (logo, links, search, CTA) | The existing QUICKKIT `site-header` is reused unchanged. Breadcrumbs (`Home › Tools › QR & Barcode Tools › QR Code Generator`) and the tool hero stay above the workspace, so the redesign does not fork a second navigation model.                                                                                                                                                       |
| Page title + subtitle band on lavender          | `QR Code Studio` heading with the one-line promise ("Twelve content types, colour, shape and logo styling, bulk CSV runs and a decoder that checks every code before you can download it") and a `Local processing` status pill, on the shared `--soft`/gradient surface tokens.                                                                                                          |
| Tab row: Create / Bulk / History / Presets      | `div.qr-tabs[role=tablist]` with `#qr-tab-create                                                                                                                                                                                                                                                                                                                                          | bulk | history | presets`. Labels are **Create QR**, **Bulk (CSV)**, **History** (live count pill), **Presets** (live count pill). Panels are lazy: History/Presets/Bulk do not mount until selected, so nothing renders or decodes twice. |
| Left column: "Select Content Type" card         | Card titled **Content** with a `select#qr-type-select` picker (12 options, grouped by nothing — order follows the payload catalogue), the type's hint line under it, its fields in `.field-grid`, and a `38 / 2,500` byte counter in the head.                                                                                                                                            |
| Below it: "Design & Customize"                  | One card, five tabs (`Colours · Pattern · Corners · Logo · Templates`) via `div.qr-seg[role=tablist]`, with `Reset` right-aligned beside the tab strip. Only the active tab is mounted, so a colour change never re-renders a hidden logo editor.                                                                                                                                         |
| Right column: live preview                      | Card titled **Preview** holding the rendered canvas on a stage, with three icon tools docked to its right (maximise → size-test dialog, download PNG, copy image), then the verification panel, then three fact chips (**Size**, **Correction**, **Contrast**), then a computed metadata line (`Symbol v3 · 29×29 modules · 38 byte payload · 4-module quiet zone · 20.8 px per module`). |
| Download section under the preview              | `div.qr-download#qr-export` inside the Preview card: label **Download**, a `VERIFIED · 23 KB` badge, four format tiles (PNG, High-res PNG, SVG, PDF) and a collapsible _More export options_ sub-fold (size ladder, filename, transparency, paper, quality).                                                                                                                              |
| Advanced Settings                               | Card titled **Advanced Settings** as a closed `<details>` fold whose head carries a summary chip (`M · 4-MODULE BORDER · 768 PX`) so the folded state still tells the truth. Inside: error correction, quiet zone, module size rounding, margin, invert guard rails.                                                                                                                      |
| Bulk CSV panel                                  | Separate workspace tab: content type for every row, batch limit, render size, two safety toggles, drop zone + `Load the sample file`, parsed-file summary, **Column mapping** selects, progress bar during the run, result chips (`N rendered`, `N failed`, memory), **Download ZIP**, **CSV result report**, per-row table with status/message/preview/PNG.                              |
| History panel                                   | Separate workspace tab. Local-only list of recent designs with real mini-QR thumbnails, redacted payload display, timestamp, "Restore design" (design only — payloads are deliberately not stored) and per-item + clear-all delete.                                                                                                                                                       |
| Presets panel                                   | Separate workspace tab: name field + `Save design`, saved presets with thumbnails, meta line (`square · square · M · 768px`), Apply and delete, plus `Preset export sizes` in Advanced. No logo, no field text, no password is ever part of a preset.                                                                                                                                     |
| Mobile arrangement                              | Same cards in one column ordered **Preview → Content → Design → Advanced** (the preview is first and sticky-free at ≤700 px); the tab strip stays reachable; accordions are compact; downloads sit directly under the preview.                                                                                                                                                            |

### Honest differences from the reference

These are deliberate, not oversights:

1. **No fake device frame.** The reference preview sits inside a phone mock-up. Ours shows the
   actual pixels on a plain stage because the exported file is what the user must trust, and a
   device frame would imply a print preview we do not compute.
2. **Four download tiles, not three.** The reference lists PNG/SVG/PDF. We keep High-res PNG
   (up to 2,048 px) as a separate tile because it is gated differently: it only needs a valid
   payload, while the exact-size PNG/SVG/PDF require a completed decode.
3. **Colour rows carry gradient controls.** The reference shows swatch + hex only. The engine
   supports solid/linear/radial fills with an angle slider and a live contrast read-out, so each
   fill has a three-way segment control and a gradient strip preview.
4. **Column ratio is ~1:1 (1.02fr / 0.98fr), not 60/40.** A 60/40 split left the form cramped at
   1,280 px in testing; the current ratio keeps both columns comfortable down to 1,100 px.
5. **Icons come from `lucide-react`** (already a dependency) rather than the reference's custom
   set, so shapes are close but not pixel-identical.
6. **The site chrome, breadcrumbs, footer and all other routes are untouched.** Anything outside
   the studio card belongs to QUICKKIT's existing shell.
7. **Typography uses the repo's token stack.** Sizes/weights were retuned for the reference's
   rhythm (15.5 px card titles, 11.5 px hints, uppercase 10–10.5 px micro-labels) instead of
   importing new font files.
8. **Reference history cards show full payloads.** Ours show redacted labels, because storing a
   Wi-Fi password or vCard body in `localStorage` was rejected during the engine build.

---

## 3. Feature preservation map

Nothing below was removed, stubbed or turned into a decorative control.

| Capability                                                                                                                       | Where it lives now                    | How it was verified in this pass                                                                                        |
| -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| 12 content types (URL, text, email, phone, SMS, WhatsApp, Wi-Fi, vCard, location, event, social, app download)                   | Content card, `#qr-type-select`       | Unit: option-label equality test. Browser: screenshots `…-03-content`, `…-04-design`; e2e fills the URL field.          |
| Per-field validation + byte budget (payload ≤ 2,500 UTF-8 bytes, URL ≤ 2,000, etc.)                                              | Payload builder + inline field errors | Unit suites `tests/qr-payload.test.ts`, `tests/qr-capacity.test.ts`; e2e low-contrast/verification flow.                |
| Live generation on every keystroke, re-decoded after each change                                                                 | `use-qr-studio.ts` render pipeline    | e2e waits for "Verified by an independent decoder"; unit tests assert the two-pass gate.                                |
| Independent decoding (ZXing) used as the export gate; hi-res PNG gated on payload only                                           | Verification panel + `#qr-export`     | e2e: PNG decoded back with jsQR and compared to the input string; blocked-state asserted at `#eeeeee` ink.              |
| Colour + gradient controls (foreground/background, solid/linear/radial, angle), contrast floor 3:1, good ≥ 4.5:1, "Make it safe" | Design → Colours                      | Unit tests for `colour.ts`; e2e "near-invisible ink is refused, then repaired"; shots `…-05-design-colours`.            |
| 5 module patterns + 5 eye patterns                                                                                               | Design → Pattern, Corners             | Shot `…-06-design-pattern`, `…-07-design-corners`; render unit tests.                                                   |
| Logo upload with scale (≤ 30 %), offset, padding, error-correction escalation and safety rejection                               | Design → Logo                         | Shots `…-08-design-logo`, `…-10-logo-applied`, `…-11-logo-preview` (real PNG uploaded through the file input).          |
| 8 premium templates                                                                                                              | Design → Templates                    | Shot `…-09-design-templates`, `…-12-template-applied`; e2e applies _Midnight Grape_ and requires re-verification.       |
| Error correction L/M/Q/H + auto, quiet zone 0–16, size 128–2,048 px                                                              | Advanced Settings                     | Shot `…-13-advanced`; e2e picks the 256 px preset and asserts the exported width.                                       |
| Preset saving/apply/delete with thumbnails                                                                                       | Presets tab                           | Shot `…-16-presets` (saved preset with rendered thumbnail, Apply + delete).                                             |
| Local history with redaction and delete/clear                                                                                    | History tab                           | Shot `…-15-history` (count pill, entry card, restore/delete).                                                           |
| Bulk CSV: parse, column mapping, limits, progress, per-row preview, ZIP, result report                                           | Bulk (CSV) tab                        | e2e runs the sample CSV, asserts `rendered`/`0 failed`, downloads the ZIP and checks the `PK` header; shot `…-17-bulk`. |
| Exports: PNG, high-res PNG (2,048), SVG, PDF (A4 / US Letter / Square label / fit-to-code), copy image, share                    | `#qr-export` + stage tools            | e2e decodes the 256 px PNG and the 2,048 px PNG, checks the SVG markup, the PDF `%PDF-`/`%%EOF` framing, and the ZIP.   |
| Scan-verification honesty: pending / verified / blocked states                                                                   | Verification panel + badges           | Asserted in unit tests and in both browser passes (never a false positive: the verdict comes from the decoder).         |

---

## 4. Automated checks (repository commands)

Run against this branch on 2 November 2026:

| Command                                                                                 | Result                                                                                                                                               |
| --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npx tsc --noEmit`                                                                      | clean, no output                                                                                                                                     |
| `npx eslint components/tools/qr-generator tests/qr-studio.test.tsx tests/e2e/*.spec.ts` | clean                                                                                                                                                |
| `npx prettier --check` (touched files)                                                  | "All matched files use Prettier code style!"                                                                                                         |
| `npm run test` (Vitest)                                                                 | **547 passed / 32 files** — QR suites: `qr-studio` 18, `qr-payload` 32, `qr-bulk-export` 28, `qr-render` 41, `qr-capacity` 7 (126 QR tests in total) |
| `npm run build`                                                                         | compiled successfully; `/tools/qr-generator` prerendered as static (`○`)                                                                             |
| `npx playwright test` (Chromium, prod build, three QR-relevant spec files)              | **258 passed / 0 failed** — see §5                                                                                                                   |

The Vitest numbers are the whole repository suite, not just QR: the redesign changed component
markup, so `tests/qr-studio.test.tsx` was rewritten for the new DOM contract (tab names,
`select#qr-type-select`, the five design tabs, card-title order
`["Content","Design & Customize","Advanced Settings","Preview"]`, `#qr-export .qr-block-label ===
"Download"`, `#qr-export` nested inside `#qr-preview`, the collapsed-by-default Advanced fold,
one-design-tab-mounted-at-a-time, empty-state + Try sample). Two earlier assertions were also
corrected because they encoded stale behaviour rather than a defect — recorded here so the owner
can check them: the accessible-name query for colour inputs and the tab labels.

---

## 5. Real-browser QA (production build, headless Chromium)

**Why a production build:** the site CSP sends `script-src 'self' 'unsafe-inline'
'wasm-unsafe-eval'` in every mode. React's _development_ build calls `eval()` to build component
stacks, so under this CSP hydration aborts and `.qr-studio` (which is disabled until hydrated)
stays grey and inert. That affects **every client tool in dev mode**, not just this one, and it
was not "fixed" by weakening the CSP — the shared config is deliberately strict. Browser QA was
therefore run against `npm run build && next start -p 3000`.

**Harness:** Puppeteer driving the sandbox's real Chromium build, one fresh page per scenario,
waiting for the enabled `.qr-studio` fieldset, typing into `#qr-field-url-url`, waiting for
"Verified by an independent decoder", clicking by selector/text, then screenshotting and measuring.

- **49 captures** across 1440×900 (17), 768×1024 (8), 430×932 (8), 390×844 (8), 375×812 (8) —
  filenames are listed in §8.
- **Page-level horizontal overflow: 0 px in all 49 captures** (`documentOverflowPx` in
  `measurements.json`), and **0 px of studio-level overflow too** — the harness reports
  `49 shots, 0 with horizontal overflow`.
- The wide bulk results table (600 px min-width) is listed by the measurement as a "suspect" at
  every width because it is genuinely wider than a phone, but it scrolls inside
  `.qr-bulk-rows-wrap` (`overflow-x: auto`) and no longer stretches any ancestor. That is the
  intended behaviour for a six-column data table; row content stays reachable by swiping.
- **Console/page errors during the whole pass: 0.**

**Repository Playwright suite** (`tests/e2e/browser-tools.spec.ts`,
`tests/e2e/premium-tools.spec.ts`, `tests/e2e/quality.spec.ts`) executed against the same
production server with the sandbox Chromium binary: **258 passed / 0 failed** (whole run, not just the QR tests). It covers the QR
flow specifically: export filename + 768 px PNG decoded back to the exact input (including
Devanagari in the query), 256 px preset honoured, SVG download contains `<svg>`, high-res PNG
really 2,048 px and decodable, PDF starts with `%PDF-` and ends with `%%EOF`, template applied →
still verified, near-invisible ink → export blocked → _Make it safe_ → verified again, bulk CSV →
ZIP with `PK` magic, the payload view showing the exact normalised string, plus axe WCAG 2.2 AA
sweeps of interactive states and the nine-width overflow sweep.

**Four spec updates were needed for the new markup — all selector/staleness fixes, no product
regressions behind them:**

| Spec assertion                                                                                                          | Why it changed                                                                                                                                                                                          |
| ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `getByRole("tab", { name: /Create one code/ })`                                                                         | the workspace tab is now labelled **Create QR** (reference wording).                                                                                                                                    |
| `getByRole("tab", { name: /Bulk from CSV/ })`                                                                           | renamed to **Bulk (CSV)**; strict-mode ambiguity fixed by `exact: true` because the file input is also named "…file here".                                                                              |
| `openFold(page, "qr-templates")` → click `#qr-design-tab-templates`, then `#qr-design-tab-colours` before `#qr-fg-base` | Templates and colours are now tabs of one Design card, and only the active tab is mounted, so a hidden colour input legitimately does not exist.                                                        |
| `toHaveText(text)` on the payload view and the decoded PNG                                                              | the URL payload is normalised through `new URL()`, so non-ASCII in the query is percent-encoded in the symbol; the test now derives the expectation from that same rule instead of asserting raw input. |
| `getByText(/rendered/)` in the bulk test                                                                                | ambiguous (8 matches including help copy); scoped to `.qr-bulk-summary` and extended to assert `0 failed`.                                                                                              |

---

## 6. Defects found by this pass and fixed

1. **WCAG 2.2 `nested-interactive` (a real axe violation, and it took two attempts to close).** The
   Design card's `Reset` button lived inside `<summary>`. The first fix — moving the action row into
   a grid cell beside the summary — was itself a regression: giving `<details>` `display: grid`
   bypasses the browser's own "hide everything after the summary while closed" slot, the hidden body
   started participating in layout inside a 34 px grid column, and the Content/Design cards collapsed
   to one word per line at 1440. The final fix is smaller and structural instead of cosmetic: a head
   may only carry non-interactive pills, and the one button in that card moved to the top of the body,
   right-aligned on the same line as the design tab strip (`.qr-design-bar`). `<details>` keeps its
   default layout, the summary keeps its pill + chevron, and `preventDefault` still stops a pill click
   from toggling the fold. axe is clean again afterwards (§5).
2. **Hex inputs clipped** (`#2a1b…`) in the two-column fill editor: the visible caption moved above
   the swatch+hex row and `QrColorInput` gained a `hideLabel` mode; the input went from 60 px to
   111 px of usable width.
3. **Card-head pills pushed past the viewport at 375 px** ("3 rows · 3 columns", "M · 4-module border
   · 768 px"). Two causes, both fixed: `.qr-card-head > div { flex: 1 }` outranked the mobile pill rule
   on specificity (the override is now `.qr-card-head > .qr-card-action`, so the pill row gets its own
   full flex line instead of being squeezed into a zero-basis 109 px item), and in the disclosure heads
   the chevron now keeps the title line (`order: 2`) while the pill wraps to the line below
   (`order: 3`) so a 186 px pill never squeezes "Advanced Settings" to one word per line.
4. **Right column could scroll out of sight on tall desktop pages:** the preview column is sticky
   with `max-height: calc(100vh - 116px)` and its own scrollbar, cleared below the site header.
5. **Mobile preview was buried under the form:** the layout switches to one column with
   `order: -1` on the preview side, and the mobile "view switcher" accordion pattern was replaced by
   the reference's own tab strip + accordions.
6. **Tab strip bled off-canvas** (negative margins): removed; the strip now fits 375 px exactly.
7. **"Advanced" vs the reference label:** card title is **Advanced Settings**.
8. Stale CSS for the deleted numbered-section design (`.qr-step*`, library panel) was pruned; the
   library card became the History/Presets tabs, so `components/tools/qr-generator/library-panel.tsx`
   was deleted rather than left dead.
   (`.qr-step*`, library panel) was pruned; the
   library card became the History/Presets tabs, so `components/tools/qr-generator/library-panel.tsx`
   was deleted rather than left dead.

---

## 7. Known gaps — read before approving

- **Fonts in these screenshots are substituted.** The sandbox only has DejaVu; the repo's font
  stack resolves to it, so glyph widths/weight in `docs/qr-studio/*.png` differ slightly from the
  owner's machine. Layout, spacing and colour are accurate; letterforms are not the shipped ones.
- **Only Chromium was executed here.** The Playwright config also declares Firefox and WebKit
  projects; downloading those browsers is impossible in this sandbox (no CDN access), so
  cross-engine rendering, print CSS and real `navigator.share` behaviour remain unverified.
- **No manual screen-reader pass.** axe ran on multiple states (clean), but VoiceOver/NVDA
  announcement order for the tab/toast/dialog interactions was not reviewed by a human.
- **Share** is exercised by unit tests and the fallback path (copy link) in code review, not by a
  real share sheet in this environment.
- **Logo uploads were tested with generated raster fixtures** (100×100 and larger PNGs), not with
  every exotic ICO/HEIC the browser might accept; unsupported types are rejected with a message.
- **Dev-mode preview of any client tool appears frozen** under the CSP described in §5. To review
  this design locally: `npm run build && npm run start`. Worth deciding separately whether to add
  `'unsafe-eval'` in development only — it is a site-wide security posture choice, so it was left alone.
- **Print stylesheet** for the exported paper sizes is the PDF generator's job; the on-page print
  CSS was not redesigned.
- History retains up to 24 entries locally and stores **redacted** payload labels only; restoring a
  history entry restores the design, never the secret. This is intentional, not a regression.

---

## 8. Files in this folder

- `desktop-1440-01-empty.png` … `-17-bulk.png` — 17 desktop states: empty, full studio, preview
  card, content card, each design tab (colours/pattern/corners/logo/templates), logo applied,
  logo preview dialog, template applied, advanced open, more export options, history, presets, bulk.
- `tablet-768-0{1..8}`, `mobile-430-0{1..8}`, `mobile-390-0{1..8}`, `mobile-375-0{1..8}` — the same
  eight checkpoints per width: empty, preview, content, design, advanced, download, history, bulk.
- `measurements.json` — `{shot, viewport, documentOverflowPx, studioOverflowPx, suspects}` for
  every capture, produced by the harness (not hand-written).

## 9. Reproducing the browser pass

```bash
npm run build && npm start -- --hostname 0.0.0.0 -p 3000   # hydration works here, see §5
LD_LIBRARY_PATH=/tmp/al2023/lib \
FONTCONFIG_PATH=/tmp/fonts FONTCONFIG_FILE=/tmp/fonts/fonts.conf \
npx playwright test --config /tmp/shot/pw.cjs \
  tests/e2e/browser-tools.spec.ts tests/e2e/premium-tools.spec.ts tests/e2e/quality.spec.ts
```

The throwaway config at `/tmp/shot/pw.cjs` exists only because this sandbox has no downloadable
Playwright browsers; it points `executablePath` at the local Chromium and skips `webServer`. The
repository's own `playwright.config.ts` was not modified. Screenshot captures came from a
Puppeteer driver kept outside the repo for the same reason.

## 10. Handoff checklist

- [x] Reference composition implemented (desktop two-column, mobile single column, tabs, panels)
- [x] Every prior feature present and reachable
- [x] Decode verification still gates exports; no false positives
- [x] All four export formats downloaded and inspected in a real browser
- [x] 375 / 390 / 430 / 768 / 1440 captured; zero page-level overflow
- [x] Lint, TypeScript, Prettier, 547 unit tests, production build green
- [x] Playwright Chromium suite green (258 tests) after honest spec updates
- [ ] **Owner opens the live preview and approves the design** ← blocking
- [ ] Merge to `main` — not performed, awaiting approval
- [ ] Deploy / indexing — not performed, awaiting approval
