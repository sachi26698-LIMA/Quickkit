# QR Code Studio — premium UI redesign: QA and owner-review handoff

**Tool:** QR Code Generator (`qr-generator`), presented in-page as **QR Code Studio**
**Route:** `/tools/qr-generator`
**Status:** **redesign implemented — awaiting owner approval**
**Date:** 3 November 2026 (redesign captured 2 November; the fixes and re-verification below are from 3 November)
**Branch:** `arena/8be11fd2-quickkit` — `f30b2f4` (redesign) + `fbb21bc` (dev-preview config fix) + the four UI defects listed in §6
**Evidence in this folder:** 54 real-browser screenshots + `measurements.json` (per-capture overflow measurement), and the `30/30 checks passed, 0 console and page errors` / `30/30 checks passed, 0 console and page errors` / `259` results described in §5

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
| Tab row: Create / Bulk / History / Presets      | `div.qr-tabs[role=tablist]` with `#qr-tab-create                                                                                                                                                                                                                                                                                                                                          | bulk | history | presets`. Labels are **Create QR**, **Bulk (CSV)**, **History** (live count pill), **Presets** (live count pill). Panels are lazy: History/Presets/Bulk do not mount until selected, so nothing renders or decodes twice — and an inactive panel is now genuinely `display: none`, not merely marked `hidden` (see §6.11). |
| Left column: "Select Content Type" card         | Card titled **Content** with a `select#qr-type-select` picker (12 options, grouped by nothing — order follows the payload catalogue), the type's hint line under it, its fields in `.field-grid`, and a `38 / 2,500` byte counter in the head.                                                                                                                                            |
| Below it: "Design & Customize"                  | One card, five tabs (`Colours · Pattern · Corners · Logo · Templates`) via `div.qr-seg[role=tablist]`, with `Reset` right-aligned beside the tab strip. Only the active tab is mounted, so a colour change never re-renders a hidden logo editor.                                                                                                                                         |
| Right column: live preview                      | Card titled **Preview** holding the rendered canvas on a stage, with three icon tools docked to its right (maximise → size-test dialog, download PNG, copy image), then the verification panel, then three fact chips (**Size**, **Correction**, **Contrast**), then a computed metadata line (`Symbol v3 · 29×29 modules · 38 byte payload · 4-module quiet zone · 20.8 px per module`). |
| Download section under the preview              | `div.qr-download#qr-export` inside the Preview card: label **Download**, a `VERIFIED · 23 KB` badge, four format tiles (PNG, High-res PNG, SVG, PDF) and a collapsible **“Copy, share and file details”** sub-fold (`#qr-export-more`: clipboard copy, share link, PDF paper setup, exact file names).                                                                                                                              |
| Advanced Settings                               | Card titled **Advanced Settings** as a closed `<details>` fold whose head carries a summary chip (`M · 4-MODULE BORDER · 768 PX`) so the folded state still tells the truth. Inside: error correction, quiet zone, module size rounding, margin, invert guard rails.                                                                                                                      |
| Bulk CSV panel                                  | Separate workspace tab: content type for every row, batch limit, render size, two safety toggles, drop zone + `Load the sample file`, parsed-file summary, **Column mapping** selects, progress bar during the run, result chips (`N rendered`, `N failed`, memory), **Download ZIP**, **CSV result report**, per-row table with status/message/preview/PNG.                              |
| History panel                                   | Separate workspace tab. Local-only list of recent designs with real mini-QR thumbnails, redacted payload display, timestamp, **Apply design** / **Edit and regenerate** (design only — payloads are deliberately not stored) and per-item + clear-all delete.                                                                                                                                                       |
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
| 12 content types (URL, text, email, phone, SMS, WhatsApp, Wi-Fi, vCard, location, event, social, app download)                   | Content card, `#qr-type-select`       | Unit: option-label equality test. Browser: the harness selects all 12 types in turn, fills each type's fields, and requires a decoded code (or the exact validation message) for every one; screenshots `…-03-content`, `…-04-design`.          |
| Per-field validation + byte budget (payload ≤ 2,500 UTF-8 bytes, URL ≤ 2,000, etc.)                                              | Payload builder + inline field errors | Unit suites `tests/qr-payload.test.ts`, `tests/qr-capacity.test.ts`; e2e low-contrast/verification flow.                |
| Live generation on every keystroke, re-decoded after each change                                                                 | `use-qr-studio.ts` render pipeline    | e2e waits for "Verified by an independent decoder"; unit tests assert the two-pass gate.                                |
| Independent decoding (jsQR) used as the export gate; PNG/SVG/PDF need a completed decode **and** an unblocked safety audit, high-res PNG needs a valid payload **and** an unblocked safety audit                                           | Verification panel + `#qr-export`     | e2e: PNG decoded back with jsQR and compared to the input string; blocked-state asserted at `#eeeeee` ink.              |
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
| `npm run test` (Vitest)                                                                 | **555 passed / 33 files** — QR suites: `qr-studio` 21, `qr-payload` 32, `qr-bulk-export` 28, `qr-render` 41, `qr-capacity` 7 (129 QR tests), plus `next-headers` 5 for the site header policy |
| `npm run build`                                                                         | compiled successfully; `/tools/qr-generator` prerendered as static (`○`)                                                                             |
| `npx playwright test` (Chromium, prod build, three QR-relevant spec files)              | **259 passed / 0 failed** — see §5                                                                                                          |

The Vitest numbers are the whole repository suite, not just QR: the redesign changed component
markup, so `tests/qr-studio.test.tsx` was rewritten for the new DOM contract (tab names,
`select#qr-type-select`, the five design tabs, card-title order
`["Content","Design & Customize","Advanced Settings","Preview"]`, `#qr-export .qr-block-label ===
"Download"`, `#qr-export` nested inside `#qr-preview`, the collapsed-by-default Advanced fold,
one-design-tab-mounted-at-a-time, empty-state + Try sample). Two earlier assertions were also
corrected because they encoded stale behaviour rather than a defect — recorded here so the owner
can check them: the accessible-name query for colour inputs and the tab labels.

---

## 5. Real-browser QA (headless Chromium, against dev *and* prod)

**Both servers were exercised.** `npm run dev` (port 3001) and `npm run build && next start`
(port 3000) each ran the whole harness, because the owner reviews the *live preview*, which is a
dev server. The site CSP previously made that preview unusable: React's development build calls
`eval()` to build component stacks, so under `script-src … 'wasm-unsafe-eval'` hydration aborted
and `.qr-studio` (a fieldset disabled until hydrated) stayed grey and inert — **every client tool
in dev mode**, not just this one. The fix is in `next.config.ts`: the same policy is served as
`Content-Security-Policy-Report-Only` when `NODE_ENV !== "production"` (violations stay visible,
nothing is weakened, no `'unsafe-eval'` anywhere), and Next 16's cross-origin dev guard got
`allowedDevOrigins` for loopback because the server binds `0.0.0.0` and `/_next/hmr` was being
blocked. Production still enforces. `tests/next-headers.test.ts` pins both modes; `curl -D -`
confirms it: `Content-Security-Policy-Report-Only:` on 3001, `Content-Security-Policy:` on 3000,
identical policy text.

**Browser harness** (`/tmp/shot/verify.cjs`, kept outside the repo like the Playwright config):
Puppeteer on the sandbox's real Chromium, 30 sequential checks on one page — hydration without a
reload, control census, the empty-state artwork's computed fills (styled, not SVG's
default black) and no overlap in its action row, typing re-renders and re-verifies, the four export tiles unlocking, the
stage tools, the size-test expander, all four workspace tabs (asserting the inactive panels are
`display: none`), tablist arrow-key navigation, the five design tabs, the three folds, all five
module patterns and all five eye styles, ink chips + the contrast chip, gradient angle slider,
near-invisible ink blocking export then “Make it safe”, quiet-zone/EC/size presets, the three
Advanced switches, logo upload → max scale → halo → removal, all eight premium templates,
preset save/apply/delete, history record/apply/forget/clear (and that no raw payload leaked),
bulk CSV sample → mapping → generate → per-row preview → ZIP → report, **PNG + high-res PNG
downloaded and decoded back to the exact payload with jsQR, SVG and PDF byte-checked**, copy and
share, all 12 content types, the 2,500-byte capacity guard, the stale-output gate, total
console/page errors, and a 1440/1280/768/430/390/375 overflow sweep.

- dev (3001): **30/30 checks passed, 0 console and page errors** · prod (3000): **30/30 checks passed, 0 console and page errors** · console and page errors: **0** on both.
- Downloads were inspected from disk, not simulated: `quickkit-qr-url-…-768px.png` decodes to
  `https://arena.dev/qr-decode-proof` at 768 px and again at 2,048 px; the SVG contains vector
  modules; the PDF opens `%PDF-` and ends `%%EOF`; the bulk ZIP is a real archive with 5 entries
  and the CSV report starts `name,url,…`.
- Honest-outcome checks pass too: with `#eeeeee` ink the verdict is *Not scannable* and PNG/SVG/PDF
  stay disabled until “Make it safe” runs; a zero quiet zone is refused even though our own decoder
  happens to read it; a 2,600-byte payload is rejected instead of truncated; `Copy PNG` reports
  that the clipboard is unavailable in this browser and points at Download rather than claiming success.

**Screenshots:** 54 captures — 1440×900 (18 states, including a close-up of the download row and
the sub-fold opened with the sticky column scrolled to it), 1280×900 (4), 768×1024 / 430×932 /
390×844 / 375×812 (8 each) — with **54 shots with 0 horizontal overflow and 0 console/page errors**, taken from the production build after every
fix in §6. Card checkpoints are element screenshots so nothing is cropped by the sticky preview
column, which has its own scrollbar (§6.4). `measurements.json` holds the per-shot numbers the
capture produced; the images were reviewed by eye afterwards, which is how §6.13 and §6.14 were
found — a `documentOverflowPx: 0` pass says nothing about a black square where an illustration
should be.

**Repository Playwright suite** (`tests/e2e/browser-tools.spec.ts`,
`tests/e2e/premium-tools.spec.ts`, `tests/e2e/quality.spec.ts`) executed against the same
production server with the sandbox Chromium binary: **259 passed / 0 failed**. It covers the QR
flow specifically: export filename + 768 px PNG decoded back to the exact input (including
Devanagari in the query), 256 px preset honoured, SVG download contains `<svg>`, high-res PNG
really 2,048 px and decodable, PDF starts with `%PDF-` and ends `%%EOF`, template applied →
still verified, near-invisible ink → export blocked → _Make it safe_ → verified again, bulk CSV →
ZIP with `PK` magic, the payload view showing the exact normalised string, **workspace tabs
swapping panels rather than stacking them** (new), plus axe WCAG 2.2 AA sweeps of interactive
states and the nine-width overflow sweep.

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

The four below were found by driving the finished UI in a real browser (the `verify.cjs` harness)
rather than by reading code — each has a regression test now, and the first three were invisible to
every numeric probe and to `tsc`/ESLint/unit tests:

9. **The download row contradicted the safety audit.** With a zero quiet zone the decoder succeeds,
   so `output.verification.ok === true`, but the safety layer escalates to `blocked` ("There is no
   quiet zone, so the code has no light border") and the preview says *Not scannable — export is
   blocked*. The export panel computed its own gate as `!verified` only, so all four tiles stayed
   live and the promise was false. `export-panel.tsx` now folds `safety.level === "blocked"` into
   `ready`/`blocked` (high-res PNG included), and the `.qr-blocked` line names the actual reason.
   Regression: `qr-studio.test.tsx` › “keeps the download row locked while the safety audit blocks
   the code”.
10. **Applying a template blended it with the previous one.** `applyTemplate` spread the template's
    partial design over the *current* design, so keys a template omits survived: applying
    “Clear Badge” after “Inverted Noir” kept `invert: true`, and the resulting hybrid could not be
    decoded — a shipped premium template that permanently blocked its own export. It now starts from
    `defaultDesign()` and lets the template overwrite it, keeping only the user's uploaded logo and
    their chosen export size when the template does not set one. Regression:
    `qr-studio.test.tsx` › “replaces the whole look when a template is applied, instead of blending
    two”; in the browser all eight templates are applied in sequence and each must land on
    *verified* or *decoded with notes* (honest: several verify **with cautions** — the gradient and
    rounded-dot templates do — which is why the harness accepts both verdicts).
11. **The workspace tabs never hid the other panels.** Panels are toggled with the `hidden`
    attribute, but `.qr-layout`/`.qr-panel-solo` set `display: grid`, and an author-level display
    rule beats the browser's `[hidden] { display: none }` — so Bulk/History/Presets stacked *under*
    the editor instead of replacing it, and the mobile view became one long card stack. Fixed with
    `.qr-layout[hidden], .qr-panel-solo[hidden] { display: none }`, scoped to those two containers
    so no other tool's markup changes. Caught only by looking at a screenshot: the harness had been
    asserting `!hasAttribute("hidden")`, which was true all along — it now asserts computed
    `display` for every panel, and `premium-tools.spec.ts` gained a tab-swap test.
12. **Every client tool's dev-mode preview was frozen** by the site CSP (see §5). Fixed in
    `next.config.ts` without weakening production; `tests/next-headers.test.ts` forbids either mode
    from regressing (report-only in dev *only*, and no raw `'unsafe-eval'` anywhere). Next 16's
    `allowedDevOrigins` was also extended to loopback in dev so `/_next/hmr` is not blocked when the
    server binds `0.0.0.0`.

13. **The empty-state artwork rendered as a solid black square.** `QrPlaceholder` draws its frame,
    finder eyes and sparse modules through classes (`.qr-empty-frame`, `.qr-empty-eye`,
    `.qr-empty-eye-inner`, `.qr-empty-module`) with no presentation attributes, and those classes had
    no rules in `app/globals.css` — pruned with the genuinely dead `.qr-step*` block during the
    redesign. SVG's default fill is black, so first-time users saw a black slab instead of a
    placeholder. Restyled in the purple family on white, and the empty-state copy now reads “Fill in
    the Website URL field and a live 768×768 px code appears here, then a second reader checks it.”
    (it used to lowercase the type label and say “fields” for a one-field type). The `.qr-empty-actions`
    row and `.qr-empty-hint` also gained rules, which removes an overlap between the *Try sample*
    button and the sample-URL hint at 375 px. The harness now asserts the computed fills and the
    overlap, so this class of pruning regression cannot return silently.
14. **A disabled export tile looked live.** `.qr-format:disabled` had no styling, so while a code was
    pending the primary **PNG** tile kept its full-opacity purple gradient (only the three secondary
    tiles dimmed, via the browser default) — the opposite of the clear state the brief asks for. They
    now drop to 0.5 opacity, desaturate and lose their shadow, with `cursor: not-allowed`. The flash
    banner's dismiss button (`.qr-flash-close`) was unstyled for the same reason and is now a proper
    26 px ghost button pinned inside the banner; the extra padding is scoped to
    `.qr-studio > .status` so no other tool's `.status` block changes.

15. **A pristine form opened with a red error.** On a fresh load the Content card showed “Web
    address is required.” before the user had typed anything, which both duplicated the empty state’s
    own guidance and made the first screen look like a failure. The field grid now renders
    `formError` only when `hasContent` is true — the same flag the status machine already uses to
    distinguish `empty` from `invalid` — so the inline errors and the preview verdict can never
    disagree about whether the user has started. Whitespace still counts as nothing; the first real
    keystroke (or a cleared field) brings validation back in full. Regression:
    `qr-studio.test.tsx` › “keeps a pristine form quiet and validates from the first real keystroke”.

**Process lesson recorded deliberately:** items 9–11 (and 13) all survived a numeric pass. A layout or
state change is only verified once somebody looks at the rendered pixels — `documentOverflowPx: 0`
and a green unit suite said nothing about a hidden panel being visible.

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
- **Dev-mode preview is fixed, but that change is site-wide.** `next dev` now hydrates because the
  CSP is delivered in report-only mode outside production (§5). It affects every client tool's dev
  experience, so it is the one change on this branch that is not QR-only — worth knowing before
  merge. Production headers are byte-identical to before, and QA ran against both modes.
- **The browser harness reads the app's own copy** (verdict strings, button labels, chip text) to
  decide pass or fail. That is deliberate — a copy change should fail a check rather than let a
  defect slip — but it means the harness itself needed iteration while wording was confirmed; none of
  those iterations was a product regression, and each is recorded above rather than quietly patched.
- **Print stylesheet** for the exported paper sizes is the PDF generator's job; the on-page print
  CSS was not redesigned.
- History retains up to 24 entries locally and stores **redacted** payload labels only; restoring a
  history entry restores the design, never the secret. This is intentional, not a regression.

---

## 8. Files in this folder

- `desktop-1440-01-empty.png` … `-17-bulk.png` — 17 desktop states: empty, full studio, preview
  card, content card, each design tab (colours/pattern/corners/logo/templates), logo applied,
  logo preview dialog, template applied, advanced open, more export options, history, presets, bulk.
- `desktop-1280-0{1,2,13,17}` — the whole-page states at the other desktop width the owner asked for.
- `tablet-768-0{1..8}`, `mobile-430-0{1..8}`, `mobile-390-0{1..8}`, `mobile-375-0{1..8}` — the same
  eight checkpoints per width: empty, preview, content, design, advanced, download, history, bulk.
  Card checkpoints are element screenshots (nothing cropped, no scroll artefacts); tab checkpoints
  are whole-page.
- `measurements.json` — `{shot, viewport, documentOverflowPx, studioOverflowPx, suspects}` for
  every capture, produced by the harness (not hand-written).

## 9. Reproducing the browser pass

```bash
npm run build && npm start -- --hostname 0.0.0.0 -p 3000
node /tmp/shot/verify.cjs 3000 prod              # 29-check interactive harness (3001 = `npm run dev`)
node /tmp/shot/shoot3.cjs 3000 docs/qr-studio     # the 53 captures + measurements.json
LD_LIBRARY_PATH=/tmp/al2023/lib \
FONTCONFIG_PATH=/tmp/fonts FONTCONFIG_FILE=/tmp/fonts/fonts.conf \
npx playwright test --config /tmp/shot/pw.cjs \
  tests/e2e/browser-tools.spec.ts tests/e2e/premium-tools.spec.ts tests/e2e/quality.spec.ts
```

The harnesses live in `/tmp/shot` (outside the repo) only because this sandbox has no downloadable
Playwright browsers: `pw.cjs` points `executablePath` at the local Chromium and skips `webServer`,
while `verify.cjs` and `shoot3.cjs` drive the same Chromium through Puppeteer. `ONLY=/pattern/ node
verify.cjs 3000 prod` re-runs one check in isolation. The repository's own `playwright.config.ts`
was not modified, and nothing in `docs/qr-studio` is hand-written — every screenshot and every
number in `measurements.json` came out of those runs. Header behaviour can be confirmed directly:
`curl -sI http://127.0.0.1:3000/tools/qr-generator | grep -i content-security` (enforcing) versus the
same request on 3001 (report-only).

## 10. Handoff checklist

- [x] Reference composition implemented (desktop two-column, mobile single column, tabs, panels)
- [x] First-run experience: illustrated empty state, one-click sample, no premature validation
- [x] Every prior feature present and reachable
- [x] Decode verification still gates exports; no false positives
- [x] All four export formats downloaded and inspected in a real browser
- [x] 375 / 390 / 430 / 768 / 1280 / 1440 captured (53 shots); zero page-level overflow
- [x] 29-check interactive browser harness green on **both** `next dev` and `next start`
- [x] Lint, TypeScript, Prettier, 555 unit tests, production build green
- [x] Playwright Chromium suite green (259 tests) after honest spec updates
- [x] Four defects found by the browser harness fixed with regression tests (§6.9–§6.12)
- [ ] **Owner opens the live preview and approves the design** ← blocking
- [ ] Merge to `main` — not performed, awaiting approval
- [ ] Deploy / indexing — not performed, awaiting approval
