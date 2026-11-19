# BioCraft — Hindi / Devanagari font ecosystem

_Status ledger, last updated 2026-11-19. Keep this file current before pausing
work: it is the resumable record of what is imported, what is verified, what is
still open, and the exact commands to reproduce each step._

## Outcome at a glance

| Measure                                                         | Count                                                          |
| --------------------------------------------------------------- | -------------------------------------------------------------- |
| Devanagari families discovered (Fontsource `devanagari` subset) | **63**                                                         |
| Families imported (binaries on disk)                            | **63**                                                         |
| Families verified by HarfBuzz shaping                           | **62**                                                         |
| Families rejected by the gate                                   | **1** — Bakbak One (no Devanagari digits U+0966–096F)          |
| WOFF2 files in the catalogue                                    | **354** (Devanagari + Latin companion subsets)                 |
| Variable families                                               | **13**                                                         |
| Licences represented                                            | OFL-1.1 (all imported families)                                |
| Public families in the catalogue                                | **62** (rejected family is retained only in the import report) |

Imported and verified are deliberately reported separately: importing a file is
not evidence that it can shape Hindi. The rejected family keeps its report and
hashes but its binaries are removed from `public/fonts`, so the public folder
contains exactly the 62 published families (354 WOFF2 files).

The required sample is checked through shaping, not by name:

> नमस्ते भारत … श्रृंगार, शायरी और एहसास।

Conjuncts probed: क्ष त्र ज्ञ श्र क्र प्र स्त्र. Every rejected publication
keeps its failure reason in `lib/fonts/data/import-report.json`; nothing is
fabricated.

## Phase ledger

| Phase | Scope                                                    | State | Evidence                                                                                                                                                                      |
| ----- | -------------------------------------------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | Discover / import genuine Devanagari fonts               | Done  | `scripts/fonts/sources.json`, `scripts/fonts/import-devanagari.mjs`, `lib/fonts/data/import-manifest.json` (63 families / 356 downloads)                                      |
| 2     | Glyph, matra, conjunct, nukta, punctuation verification  | Done  | `scripts/fonts/verify_fonts.py` (HarfBuzz 15), `lib/fonts/data/verification.json` (62 pass, 1 reject)                                                                         |
| 3     | Scalable catalogue, pagination, search, hashes, versions | Done  | `lib/fonts/catalogue.ts`, `lib/fonts/search.ts`, `lib/fonts/data/catalogue.json`, `app/api/fonts/route.ts`, usage API                                                         |
| 4     | Premium light Font Studio                                | Done  | `app/biocraft/fonts`, `components/biocraft/font-{library,card,preview-line,specimen}.tsx`, `app/biocraft/biocraft.css`                                                        |
| 5     | Wire the chosen font into BioCraft tools                 | Done  | `app/biocraft/studio`, `app/biocraft/poster`, `lib/fonts/studio-content.ts`, `components/biocraft/{studio,poster-studio,font-picker}.tsx`                                     |
| 6     | Admin Font Library upgrade                               | Done  | `app/admin/(protected)/fonts`, `components/admin/fonts/admin-fonts.tsx`, `app/api/admin/fonts/**`                                                                             |
| 7     | Performance                                              | Done  | WOFF2 only, `font-display: swap`, lazy IntersectionObserver loading, per-weight fetches, 12-family pages, immutable `/fonts/hindi/*` cache, no binary storage in localStorage |
| 8     | Licence / attribution metadata                           | Done  | `lib/fonts/data/licenses.json`, `app/biocraft/licenses`, per-family `LICENSE.txt` + `source.json`                                                                             |
| 9     | Automated + browser-rendered tests                       | Done  | 7 Vitest suites (40 assertions) + `tests/e2e/biocraft.spec.ts` (10 Chromium tests)                                                                                            |

## Where things live

### Pipeline

```bash
npm run fonts:import   # download from the pinned Fontsource manifest
npm run fonts:verify   # HarfBuzz shaping gate -> verification.json
npm run fonts:build    # catalogue.json + licenses.json + import-report.json
npm run fonts:all      # all three, in order
```

`fonts:verify` needs the Python toolchain:

```bash
python3 -m venv /tmp/fontenv
/tmp/fontenv/bin/pip install -r scripts/fonts/requirements.txt
# then run with PATH=/tmp/fontenv/bin:$PATH npm run fonts:verify
```

- Sources: `scripts/fonts/sources.json` (provider, distributor, weights,
  subsets, hashes, unicode ranges; all OFL-1.1 at import time).
- Curation: `scripts/fonts/curation.json` (categories, tags, descriptions).
- Font binaries: `public/fonts/hindi/<slug>/{devanagari*.woff2,latin*.woff2,
LICENSE.txt,source.json}` (18 MB, committed).
- Generated data: `lib/fonts/data/{catalogue,verification,licenses,
import-manifest,import-report}.json`.

### Runtime

- Server-only catalogue access in `lib/fonts/catalogue.ts`; the client never
  receives the full catalogue.
- Public read API: `GET /api/fonts` with `q`, `category`, `tag`, `sort`,
  `slug`, `cursor`, `limit`; `POST /api/fonts/usage` for local popularity.
- Search understands Hindi intent words (`पोस्टर` → Poster, `किताब` → Book)
  by translating each query token to an English tag.
- Each family is registered at runtime as `BioCraft Hindi <slug>` with the
  Devanagari `unicode-range`; the Latin companion is registered with its own
  range and is fetched only when Latin glyphs appear.
- Library cards use `IntersectionObserver`; a 12-card page fetches only the
  files it paints (verified: 12 font requests after scrolling the first page).

### Admin

- UI: `/admin/fonts` (nav label **Font library**), seven tabs — Overview,
  Catalogue, Validation, Imports, Usage, Licences, Export.
- APIs (same-origin + admin session):
  - `GET/POST /api/admin/fonts` — overrides: `set-status`, `update`, `clear`.
  - `POST /api/admin/fonts/verify` — fontkit pre-flight plus optional staging.
  - `GET/POST /api/admin/fonts/queue` — publish or remove staged imports.
- Overrides live in `data/fonts/*.json` (gitignored) and are merged over the
  committed catalogue; public font data stays local-first, Supabase remains
  auth-only.
- Staged binaries and the import queue live in `data/fonts/` (gitignored;
  never published automatically).
- `lib/fonts/inspect.ts` is a **pre-check only**. Publication still requires
  `scripts/fonts/verify_fonts.py`.

## Verification evidence

### Shaping and binaries

- HarfBuzz 15.0 runs the gate for every file. `verification.json` stores
  coverage, sample notdef count, conjunct/matra/nukta/numerals results and
  SHA-256 for each file.
- fontkit spot checks on Noto Sans Devanagari (upem 1000, 769 glyphs):
  क्ष/त्र/ज्ञ/श्र/क्र/प्र → one glyph, स्त्र → two; नमस्ते → five glyphs;
  ज़िंदगी → six; १२३०९ and ।॥ present.
- Skia (`@napi-rs/canvas`) renders all 62 families: 62 registered and painted,
  57 visibly different from the system fallback, 61 form a क्ष ligature, 61
  reorder `कि`, 61 render mixed Hindi + English.

### Automated tests

```bash
npx tsc --noEmit     # clean
npm run lint         # clean
npm test             # 221 files, 3016 tests passing
npm run build        # production build passing
```

BioCraft suites: `tests/biocraft-catalogue.test.ts`,
`biocraft-catalogue-api.test.ts`, `biocraft-font-inspection.test.ts`,
`biocraft-font-loader.test.ts`, `biocraft-font-rendering.test.ts`,
`biocraft-preview-component.test.tsx`, `biocraft-studio-content.test.ts` —
40 assertions covering catalogue integrity, Hindi search, API contracts,
pre-flight inspection, runtime loading, real Skia rendering and the preview
component.

### Browser tests

`tests/e2e/biocraft.spec.ts` exercises Chromium against a running server:
real WOFF2 requests, computed families, canvas advances, Hindi search,
pagination, favourites, compare mode, all seven studio tools, a downloaded
1080 × 1350 poster PNG, mobile overflow and the admin redirect.

```bash
npm run dev            # terminal 1
npm run test:e2e -- tests/e2e/biocraft.spec.ts
```

Result in this workspace: **10/10 passed** on headless Chromium 153. The
sandbox blocks Playwright's browser download, so the run used a locally
extracted Chromium build; CI should run `npx playwright install chromium` and
use the standard config.

Visual checks confirmed: light studio styling, Hindi headings and form values
render (the page loads a 121 KB Noto Sans Devanagari UI face with a
Devanagari-only `unicode-range`), all 12 cards paint after scroll, no horizontal
overflow at 390 px, and the poster renders the sample and conjuncts with the
selected font.

### Known environment caveat

The test container has no emoji font, so emoji accents in generated bios show
as tofu in screenshots. Real desktop/mobile devices have emoji fonts; the text
itself is correct and the emoji toggle is covered by unit tests.

## Open / next steps

1. **Authenticated admin walkthrough.** The admin routes are covered by unit
   tests, build checks and the unauthenticated redirect e2e test, but the
   signed-in UI flow needs a real Supabase admin session for a browser pass.
2. **Publish staged imports into the committed catalogue.** Uploads can be
   verified and queued today; promoting a staged file still requires running
   the Python gate and committing the resulting binaries/metadata. Automating
   that hand-off is the next pipeline improvement.
3. **CI browser job.** Add a workflow that installs Playwright Chromium and runs
   `tests/e2e/biocraft.spec.ts`; this sandbox cannot download it.
4. **Emoji fallback.** Optionally bundle a small emoji subset for canvas posters
   where the OS has none. The UI poster footer no longer depends on a system
   Devanagari font.
5. **More sources.** The same verifier can ingest other OFL Devanagari families
   (e.g. Shobhika) by adding entries to `scripts/fonts/sources.json`; do not add
   GPL families such as Yashomudra.

## Guardrails

- A family is never called Hindi because of its name; only the shaping gate
  decides.
- Rejected families keep their report; no catalogue record is invented.
- Existing Quickkit tools, records and admin auth are untouched.
- Restricted/GPL files are not redistributed.
- Public font data stays in the repository/API; Supabase is auth only.
- Font previews always use the actual WOFF2 file, never a `font-family` label
  over a fallback.
