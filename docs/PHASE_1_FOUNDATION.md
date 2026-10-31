# Phase 1 — Repository & foundation

**Date:** 31 October 2026 · **Branch:** `arena/78c28b12-quickkit` · **Spec:**
`QUICKKIT_AGENT_BRAIN_FINAL.md` (§2 stack, §3 IA, §11 Phase 1)

## 1. Repository state before Phase 1

| Item | Finding |
|---|---|
| Git | Branch `arena/78c28b12-quickkit`, clean tree, one commit ahead of `main` (`docs: record authorized GitHub publication`) |
| Framework | Next.js **16.4.3** App Router, React 19.3.1, Turbopack builds |
| Language | TypeScript 6.0.3, `strict: true`, path alias `@/*` |
| Package manager | **npm**, single `package-lock.json`, Node 22 (`.nvmrc`, `engines`, CI) |
| Styling | One 1,726-line hand-written `app/globals.css` with CSS variables; **no Tailwind** |
| Font | Geist Variable via `@fontsource-variable/geist` |
| Icons | Lucide React |
| Tests | Vitest + RTL (70 tests), Playwright (4 spec files, 3 browsers) |
| CI | `.github/workflows/ci.yml` — install, format, lint, test, build, typecheck, audit, e2e |
| Existing work | Six working tool routes (Word Counter, Case Converter, JSON Formatter, Password Generator, QR Generator, Image Compressor), tool logic in `lib/tools/`, launch/indexing gate in `lib/launch.ts`, SEO helper in `lib/seo.ts`, About/Privacy/Terms pages, sitemap/robots/OG image |

**Preserved unchanged:** all tool logic in `lib/tools/*`, all six tool
workspaces in `components/tools/*`, `lib/launch.ts`, `lib/seo.ts`,
`lib/use-hydrated.ts`, legal/about copy, security headers in `next.config.ts`,
Playwright/Vitest configuration, CI structure, the launch/indexing gate and the
existing 70 tests (one assertion updated for the new route, see §6).

**Identified gaps (what Phase 1 had to fix):**

1. No Tailwind; a single monolith stylesheet made a consistent design system
   hard to extend and had no token/utility contract.
2. No global navigation depth: header had only three links, no tool menu, and
   no dedicated `/tools` directory route (cards only lived on the homepage).
3. Homepage hero/search/cards were visually flat compared with the reference
   (small type, no floating tool tiles, no premium gradients, 3-column cards
   with heavy footers).
4. No reusable UI primitives (`components/ui/*`), no brand component layer, no
   shared logo component (the wordmark was duplicated in header and footer).
5. Tool pages had three separate shells (`ToolShell`, `tool-icon`,
   `related-card`) with duplicated visual logic; related tools always showed the
   first three tools regardless of category.
6. `format:check` covered only a subset of files; no Prettier config, so class
   ordering and file coverage were inconsistent.

## 2. What was built

### Toolchain

- **Tailwind CSS v4.3.3** with the official `@tailwindcss/postcss` plugin
  (`postcss.config.mjs`). Configuration is CSS-first through `@theme` in
  `app/globals.css` — no `tailwind.config.ts` is required in v4.
- `clsx` + `tailwind-merge` exposed as `cn()` (`lib/utils.ts`).
- `prettier-plugin-tailwindcss` with `tailwindStylesheet` +
  `tailwindFunctions: ["cn"]`, so utility classes are sorted consistently.
- **Plus Jakarta Sans Variable** replaces Geist for a rounded, premium
  international SaaS look (self-hosted, no external font request).
- Scripts added/updated: `lint:fix`, `test:watch`, `check` (format + lint +
  typecheck + test + build). `format`/`format:check` now cover the whole repo
  with `.prettierignore` exclusions.

### Design system (`app/globals.css`)

`@theme` tokens are simultaneously CSS variables and Tailwind utilities:

| Group | Tokens |
|---|---|
| Surfaces | `canvas #FFFFFF`, `canvas-soft #FBFAFF`, lavender ramp `50–300` |
| Brand | `brand-50…800` (primary `#6657E8`, ink `#3F2F9E`) |
| Text | `ink #171B2E`, `ink-soft`, `muted #565D73` (AA contrast on white/lavender) |
| Lines | `line #E7E5F2`, `line-soft #F1EFF9` |
| Mint accent | `mint`, `mint-soft`, `mint-200`, `mint-ink`, `mint-deep` |
| Feedback | danger/success text, soft and border pairs |
| Tool tints | `accent-purple/blue/mint/peach` (soft + ink) |
| Radii | `rounded-card`, `rounded-panel`, `rounded-pill` |
| Elevation | `shadow-soft`, `shadow-card`, `shadow-lift`, `shadow-button`, `shadow-tile` |
| Motion | `animate-float`, `animate-rise` — disabled under `prefers-reduced-motion` |

`@layer base` sets semantic defaults (typography, visible 3px focus ring on all
interactive elements, form controls, 16px inputs on ≤600 px to avoid iOS zoom).
`@layer components` keeps the tool workspaces' class contract (`.workspace`,
`.stat`, `.status`, `.primary`, `.secondary`, `.prose`, …) so the preserved tool
components are restyled by the new token system rather than rewritten.

Light-only: `color-scheme: light`, `themeColor: #ffffff`, no dark palette, no
black surfaces anywhere.

### Brand components

- `components/brand/logo.tsx` — `LogoMark` (gradient rounded-square "Q" SVG,
  configurable gradient id to avoid duplicate SVG ids), `Wordmark`
  (QUICK in ink, KIT in brand purple), `Logo` (accessible home link).

### UI primitives

`components/ui/` — `Button` / `ButtonLink` / `buttonStyles` (primary, secondary,
ghost × sm/md/lg), `IconTile` (six tones, three sizes), `Badge`,
`SectionHeading`.

### Layout

- `components/layout/site-header.tsx` — sticky translucent header, active-route
  states, a real **Tools dropdown** (all six tools with category, "Browse all
  tools" footer, outside-click and Escape handling with focus restored to the
  trigger) and an accessible mobile sheet (`aria-expanded`/`aria-controls`,
  Escape returns focus to the toggle). No fake search/bell/theme controls: the
  search icon links to the tool directory.
- `components/layout/site-footer.tsx` — brand block, complete tool links,
  company/legal links, privacy note and a "Local by design" mint badge.
- `app/layout.tsx` — skip link, `flex min-h-dvh` column shell, `<main
  id="main" tabIndex={-1}>`, noscript notice, metadata + viewport.

### Homepage

`app/page.tsx` composes `Hero`, `ToolExplorer`, `TrustSection`,
`PrinciplesSection`, `FreeBand`.

- `components/home/hero.tsx` + `hero-visual.tsx` — lavender gradient band,
  "YOUR EVERYDAY TOOLKIT" badge, gradient headline, primary/secondary CTAs and
  three benefit facts. The visual is a CSS/Lucide illustration (toolkit window,
  orbit rings, six floating tool tiles) with **no image payload** and no fake
  buttons.
- `components/tools/tool-explorer.tsx` — the premium search interface and
  category chips: live filtering while typing, clear button, Escape-to-clear,
  `aria-live` result count, empty state with "Clear search & filters", reset
  affordance, and an optional "View all tools" shortcut. Inputs are disabled
  until hydration (same contract as the tool workspaces) to avoid
  pre-hydration typing loss.
- `components/tools/tool-card.tsx` — reusable card (icon tile, name, two-line
  description, arrow) used on the homepage, the directory and tool pages. It
  keeps the `.tool-card` hook the existing browser suite counts.
- `TrustSection`, `PrinciplesSection`, `FreeBand` — honest equivalents of the
  reference's trust panel and premium ribbon: no fake "Pro"/pricing claims, and
  no invented testimonials, ratings or user counts.

### Tool directory route

`app/tools/page.tsx` (new) — real page at `/tools` with its own metadata,
gradient hero, three factual stats, the shared explorer, and two informational
cards. Added to the sitemap as an 11th launch-approved route.

### Tool page shell

`components/tool-shell.tsx` now renders the breadcrumb (Home › Tools › Tool),
header, workspace, privacy note, "How to use", FAQ and a related-tools grid that
prefers the same category. `components/tools/tool-icon.tsx` (new path) maps each
tool to a tinted `IconTile`; the old root duplicates `components/header.tsx`,
`components/catalog.tsx`, `components/hero-art.tsx`, `components/tool-icon.tsx`
were removed after confirming nothing referenced them.

### Content and docs

- `.env.example` — documents `SITE_URL`, the `LAUNCH_APPROVED` gate,
  `NEXT_TELEMETRY_DISABLED` and the Vercel-provided variables; placeholders only.
- `README.md` — rewritten: status table, stack, architecture map, design
  tokens, scripts, setup, tool limits, privacy/security, deployment and known
  limitations.
- `docs/verification/phase-1/` — screenshots captured from the production build
  at 1440, 768, 390 and 320 px.

## 3. Verification actually run

Environment: Node 22.22.3, npm 10.9.8, Next.js 16.4.3, Tailwind 4.3.3.

| Command | Result |
|---|---|
| `npx prettier --check .` | **Pass** — "All matched files use Prettier code style!" |
| `npx eslint .` | **Pass** — 0 errors, 0 warnings |
| `npx tsc --noEmit` | **Pass** — no output |
| `npm test` | **Pass** — 9 files, **82 tests** (70 existing + 12 new) |
| `npm run build` | **Pass** — 19 static routes, all `○ (Static)` |
| `NEXT_TELEMETRY_DISABLED=1 npx next start` + HTTP smoke | `/`, `/tools`, all six tool routes, `/about`, `/privacy`, `/terms` → **200** with one `<h1>` and a unique meta description; `/missing-tool` → **404** with the custom page; CSP/nosniff/`X-Robots-Tag: noindex` present; `/robots.txt` disallows; sitemap empty pre-launch |

Headless browser checks (production build on port 3001, Chromium from the
sandbox's pre-bundled runtime, with scripts in `/tmp`):

- **No page or console errors** on `/`, `/tools`, `/tools/word-counter`,
  `/tools/case-converter`, `/tools/json-formatter`, `/tools/password-generator`,
  `/tools/qr-generator`, `/tools/image-compressor`, `/about`, `/privacy`,
  `/terms`.
- **Zero horizontal overflow** at 1440, 768, 390 and 320 px on the homepage,
  `/tools`, a tool page and `/about`.
- Desktop Tools dropdown: opens (`aria-expanded=true`), Escape closes it and
  returns focus to the trigger.
- Live search filters 6 → 1 cards; the clear button restores 6.
- Mobile sheet (375 px): opens, closes on Escape, and the "Our approach" link
  navigates to `/about`.
- **axe-core WCAG 2.0/2.1/2.2 A+AA scans: 0 violations** on 11 routes ×
  1440 px and 390 px (22 scans).
- Tool workspaces under the new shell (Phase 1 regression pass, not a Phase 2
  sign-off): Word Counter counts ("Hello world. Another sentence here." → 5
  words), Case Converter → `HELLO WORLD`, JSON Formatter indents to 2 spaces,
  Password Generator returns a 20-character value, QR Generator renders the
  preview and download link.
- Screenshots reviewed at each width (see §5).

**Not run:** `npm run test:e2e` (Playwright). Chrome for Testing, Firefox and
WebKit downloads are blocked in this sandbox (only `github.com`,
`codeload.github.com`, `api.github.com`, `registry.npmjs.org`, `pypi.org`,
`files.pythonhosted.org` are reachable), and the system Chromium cannot load
without `libnspr4`/`libnss3`. The suite's new specs were written but are
unverified here; run them in CI or any machine with browsers installed.

## 4. Architecture notes and intentional decisions

- Server Components by default; `"use client"` only on the header, explorer,
  workspaces and the tool error boundary.
- `lib/catalog.ts` is the single source for tools/categories/search and is used
  by the header, explorer, directory, tool pages, related tools and the
  sitemap — no duplicated tool lists.
- Tool logic stays in `lib/tools/` and remains DOM-free and unit-tested.
- No new global state, no extra runtime dependencies beyond Tailwind/clsx/
  tailwind-merge (build-time or tiny), no analytics, no auth, no backend.
- Search, category chips and the directory only list tools that exist — no
  placeholder "PDF Merge"/"PDF Split" cards and no "100+ tools" claims.

## 5. Screenshots

`docs/verification/phase-1/`

| File | View |
|---|---|
| `home-desktop-1440.png` | Homepage, full page, 1440 px |
| `home-tablet-768.png` | Homepage, 768 px |
| `home-mobile-390.png`, `home-mobile-320.png` | Homepage, small screens |
| `header-tools-menu-1440.png` | Tools dropdown open |
| `tools-directory-1440.png`, `tools-directory-390.png` | `/tools` directory |
| `tool-page-1440.png`, `tool-page-390.png` | Word Counter tool page |
| `about-1440.png` | Content page band |

## 6. Changes to existing tests

| Test | Change | Why |
|---|---|---|
| `tests/launch.test.ts` | Sitemap route count 10 → 11 and a new assertion that `/tools` is included | New `/tools` route is part of the indexable site map |
| `tests/catalog.test.ts` | +3 tests: summaries/categories, `getTool`, per-category counts | Cover new catalog API |
| `tests/discovery.test.tsx` (new) | 9 tests: rendering, live search, keyword search, Escape, clear button, category filter, empty state, combined filter, card semantics | Phase 1 discovery surface |
| `tests/e2e/quality.spec.ts` | `/tools` added to the audited/overflow route list | New public route |
| `tests/e2e/foundation.spec.ts` | +3 browser tests: directory filtering, desktop dropdown behaviour, hero CTAs | New navigation |

## 7. Remaining tasks / follow-ups

1. **Run the Playwright suite** where browsers can be installed
   (`npm run test:e2e`) and re-run the axe/overflow sweep, including `/tools`.
2. **Lighthouse re-measure** on the new homepage/directory; the previous scores
   in `docs/verification/` describe the old design.
3. **Phase 2/3 re-verification**: the six tools are preserved and the build
   passes, but their specs (`tests/core-tools.test.ts`,
   `tests/browser-tools.spec.ts`) still need a run against the new shell before
   Phase 2 is signed off.
4. Owner inputs still open (unchanged): legal operator identity/contact,
   verified production domain (`SITE_URL`), indexing approval, and the
   dev-only `minimatch@3` advisory decision — see `docs/OWNER_INPUTS.md`,
   `docs/security/DEPENDENCY_REVIEW.md`, `RELEASE_CHECKLIST.md`.
5. Optional polish for later phases: per-category directory "jump" anchors,
   keyboard `⌘K` shortcut for the search field (needs an accessible hint), and a
   nonce-based CSP once the shell allows it.
