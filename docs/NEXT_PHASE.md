# Next development phase — plan and readiness

**Date:** 31 October 2026 · **Branch:** `arena/78c28b12-quickkit`
**Status:** design approved, final refinement pass applied, nothing deployed.

This document is the hand-off for the next phase. It records what the code
looks like now, what is still blocked on owner input, and how to add the next
tool without breaking the design system, the tests or the privacy claims.

## 1. Where the code stands

| Layer | Files | Notes |
|---|---|---|
| Catalog (single source of truth) | `lib/catalog.ts` | Tool list, categories, search/filter helpers, category counts. Drives the homepage grid, `/tools`, header menu, footer and sitemap. |
| Routes | `app/page.tsx`, `app/tools/page.tsx`, `app/tools/<slug>/page.tsx` (×6), `app/about/page.tsx`, `app/privacy/page.tsx`, `app/terms/page.tsx` | All statically prerendered (19 routes incl. icons, robots, sitemap). |
| Layout | `components/layout/site-header.tsx`, `site-footer.tsx`, `legal-page.tsx` | Header = desktop nav + mobile sheet; `LegalPage` = shared shell for privacy/terms. |
| Shared UI | `components/ui/{badge,button,icon-tile,section-heading}.tsx`, `components/brand/logo.tsx` | No page-local copies of buttons, badges or headings. |
| Tool UI | `components/tool-shell.tsx`, `components/tools/{tool-explorer,tool-card,tool-icon}.tsx` | `ToolShell` wraps every tool page (breadcrumb, title, description, panel). |
| Styling | `app/globals.css` | Tokens, `t-*` type scale, `.section` rhythm, `.tool-card` anatomy, motion utilities. Light theme only. |
| Tests | `tests/*.test.ts` (82 unit), `tests/e2e/*.spec.ts` (114 browser) | Functional, a11y (axe), overflow at 320–1440, no-network assertions. |

Current gates, all green on this branch: prettier, eslint (0/0), `tsc`,
82/82 unit, 114/114 Chromium e2e, axe 0 violations (11 routes × 390 px + 5
routes × 1440/768 px), `next build` 19 static routes.

## 2. Gates that only the owner can clear

Tracked in `docs/OWNER_INPUTS.md` and `RELEASE_CHECKLIST.md`. Still outstanding:

1. Operator legal identity, jurisdiction, monitored contact → `/privacy` and
   `/terms` keep their "Owner action required before public launch" notice
   until then.
2. Hosting/log-retention confirmation for the actual Vercel project.
3. Real `SITE_URL` (metadata, canonicals, sitemap) instead of the dynamic
   `VERCEL_URL` fallback.
4. Security-review decision on the residual dev-only dependency findings.
5. `LAUNCH_APPROVED` — production release approval and deploy are **not**
   part of this phase.
6. CI-only browser matrix: Firefox and WebKit projects exist in
   `playwright.config.ts`; browser downloads are blocked in this sandbox, so
   only Chromium was executed locally.

## 3. How to add a tool (checklist)

1. **Catalog** — add an entry to `tools` in `lib/catalog.ts`: `slug`, `name`,
   one `category`, `description` (one line), `summary` (one sentence),
   `keywords`, `icon`, `color`, `phase`. Never list a route that does not exist.
2. **Route** — create `app/tools/<slug>/page.tsx` with `pageMetadata(...)` and a
   `<ToolShell>` wrapper; keep all processing client-side and synchronous where
   possible.
3. **Behaviour** — pure logic goes in `lib/tools/` and gets unit tests; DOM
   wiring stays in the page component and gets an e2e test.
4. **Nothing leaves the tab** — no `fetch`, no `localStorage`, no analytics.
   `quality.spec.ts` asserts no outbound requests during interactions; keep it
   passing rather than adding an exception.
5. **Design** — reuse `Button`, `Badge`, `IconTile`, `SectionHeading` and the
   `t-*` type scale. Do not add new raw hex colours; extend the token set in
   `globals.css` if a new pastel is genuinely needed.
6. **Responsive** — verify 320/360/375/390/430/768/1024/1366/1440 px: no
   horizontal overflow, no clipped labels, ≥ 44 px touch targets, no text under
   12 px (12.5–13 px for meta labels).
7. **A11y** — labelled inputs, `aria-live` for changing results, visible focus,
   one `<h1>`, run axe on the new route.
8. **Copy honesty** — describe what the tool does and its limits; no fabricated
   accuracy, scale or pricing claims.
9. **Docs** — add the tool to the tables in `docs/REDESIGN.md` (screenshots) and
   to the privacy page's tool list if it changes what the site processes.

## 4. Candidate backlog (needs owner approval, not committed)

Chosen for small, local, dependency-free scope and reuse of the existing design
system. Every item must stay client-side.

| Candidate | Why it fits | Watch-outs |
|---|---|---|
| Base64 encoder/decoder | Text/Developer, no deps, pure string work | Unicode handling; document byte vs text behaviour |
| URL encoder/decoder | Same family, one-screen UI | Must not be used to build tracking links |
| Hash generator (SHA-256) | Uses `crypto.subtle`, stays local | Label it as hashing, not encryption |
| Timestamp ↔ date converter | Developer utility, no deps | Timezone wording; ISO + local display |
| Colour converter (HEX/RGB/HSL) | Image & QR category, visual | Contrast preview must not imply compliance |
| Unit converter | Everyday utility | Precision wording; rounding disclosure |
| CSV ↔ JSON | Developer, pure parsing | Large-file limits must be stated |
| Markdown preview | Text, needs a renderer dependency | Requires a dependency + XSS review first |

Explicitly **out of scope** for the next phase unless the owner asks: accounts,
payments, server-side processing, uploads, analytics, ads, dark mode.

## 5. Definition of done for the next phase

- [ ] New tool appears in catalog, header menu, footer, `/tools`, homepage grid
      and sitemap with no duplicate or missing entry.
- [ ] Unit + e2e coverage for the new logic and UI, with the existing suites
      unchanged and passing.
- [ ] axe 0 violations on the new route at 390 px and 1440 px.
- [ ] No horizontal overflow across 320–1440 px; screenshots stored in
      `docs/verification/`.
- [ ] Privacy and Terms copy still accurate; date updated if wording changes.
- [ ] `npm run check` (format, lint, types, unit, build) passes.
- [ ] Preview reviewed before any deploy; deploy needs explicit approval.

## 6. Known technical notes

- `next start` serves the previous build until it is rebuilt **and** the old
  process is killed — always rebuild before screenshotting.
- The brand mark and favicon are CSS/SVG gradients with no shared ids, so they
  cannot fall back to black or collide between instances.
- CSP keeps `'unsafe-inline'` for styles and framing allowed for the preview
  environment; revisit both when the production origin is fixed.
- Lighthouse has not been re-measured since the redesign; run it against the
  preview before launch.
- Screenshot set for the approved design lives in `docs/verification/redesign/`.
