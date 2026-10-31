# Visual redesign — premium pass

**Date:** 31 October 2026 · **Branch:** `arena/78c28b12-quickkit`
**Trigger:** Phase 1 UI rejected as not meeting the premium reference standard.

> Note: the two screenshots referenced in the review request did not arrive in
> the workspace, so this pass used the recorded build output in
> `docs/verification/phase-1/` plus the written direction as the brief. Please
> compare the new captures in `docs/verification/redesign/` against your own
> screenshots.

## What changed

### Design system (`app/globals.css`)
- Rebuilt token set: lavender `25–300`, brand `50–800`, mint `soft/100/200`,
  sky/peach/blush pastels, ink/muted/line, feedback pairs.
- New radii scale (`control`, `card`, `panel`, `pill`) and five-layer shadows
  (`soft`, `card`, `float`, `tile`, `button`) tuned for a light theme.
- **Typography scale classes** (`t-display`, `t-h2`, `t-h3`, `t-lead`, `t-body`,
  `t-small`, `t-micro`) with mobile-first minimum sizes and fluid growth.
- Section rhythm class (`.section`: 44 px → 80 px) replacing ad-hoc padding.
- New utilities: `bg-grid-soft`, `text-gradient-brand`; motion tokens
  (`animate-float`, `animate-drift`) disabled under `prefers-reduced-motion`.

### Homepage
- **Hero**: two-column premium layout, gradient headline, badge, dual CTAs and
  three benefit chips (full labels ≥ 640 px, compact labels below).
- **Illustration**: layered glass "toolkit window" (logo, mini search, real tool
  rows, mint privacy badge) inside orbit rings, six floating pastel tiles, dot
  grid and floating chips — CSS + Lucide, no image payload, honest UI preview.
- **Search**: elevated overlapping panel (negative margin over the hero band),
  large target, category tiles with counts, reset affordance, live results.
- **Tool cards**: pastel gradient icon tile, category chip, hover lift, gradient
  wash, arrow that fills with the brand gradient; 1 column < 640 px.
- **Privacy section**: split layout with a layered "local processing" mock panel.
- **Features** and **CTA**: refined cards and an honest free-toolkit band.
- **Footer**: tighter grid, badge row, clearer link targets.

### About page (full rebuild)
Hero (gradient + stats + toolkit illustration), mission & vision panels, product
philosophy cards, "six tools in one clean kit" grid, the shared privacy section,
an honest "what these tools don't claim" block, and a closing CTA.

### Mobile fixes (screenshotted at 320/360/375/390/430)
- Viewport meta completed (`width`, `initialScale`, `viewportFit: cover`).
- Illustration no longer cropped: smaller art on small screens, reduced hero
  overlap, full labels hidden below 360 px.
- Category chips: 2-up grid on ≤ 380 px (no truncated labels), 3-up to 640 px,
  5-up on desktop.
- Benefit chips: one row of three compact chips on mobile instead of three
  stacked rows (saves ~200 px of scroll).
- Card descriptions are no longer clamped on mobile.
- Header nav and mobile sheet rows are ≥ 44/48 px; logo link raised to 44 px.
- Smallest **content** text is 12 px (was 11 px category/count labels); the only
  sub-12 px text is the decorative hero-window mock, which is `aria-hidden`.

## Final refinement pass (after design approval)

The visual direction was approved, so this pass only fixed correctness and
consistency issues. No layout concepts were reworked.

| # | Item | Result |
|---|---|---|
| 1 | CTA copy | "Everything here is free. Always." → **"Useful tools. Free to start."** Eyebrow, headline and perks now read `Free to start`; body explains that current tools stay free and that paid features may be added later. No pricing, tiers or dates are implied. |
| 2 | Homepage CTAs, cards, search, filters | All four CTAs resolved (`Explore tools` → `#tools`, `View all tools` → `/tools`, `Our privacy approach` → `/privacy`, `Browse all tools` → `/tools`). Search/filter matrix and card navigation re-verified (tables below). |
| 3 | Tool pages and navigation | All six routes: 200, one correct `<h1>`, header + footer, breadcrumb back to `/tools`, 0 px overflow at 390 and 1440 px, no console errors. Header → `/tools` → card → tool page also verified on mobile via the menu sheet. |
| 4 | Privacy accuracy | Audited the code rather than the copy: no `fetch`/`axios`/`XMLHttpRequest`/`sendBeacon`/`WebSocket` in `app`, `components` or `lib`; no `localStorage`/`sessionStorage`/cookies/`indexedDB`/Cache API; no input logging; no analytics, ad or third-party SDK in the dependency tree; the only external URL is the dynamic `VERCEL_URL` used for metadata. Every claim on `/privacy` is therefore currently true, and the page still carries the owner-action notice. |
| 5 | About / Privacy / Terms consistency | New shared `components/layout/legal-page.tsx` gives both policy pages the same hero band, typography, spacing and card treatment as About: gradient hero with badge, two-tone `<h1>`, lead, `Last updated` + `Covers` chips, an "At a glance" card, a sticky "On this page" nav (desktop) and ruled sections. The old `.prose` template and `page-band.tsx` were removed rather than kept as a second style. |
| 6 | 1366 / 1440 px desktop | 0 px overflow, no clipping, no console errors on all five content routes at both widths; screenshots captured at both. |
| 7 | 320 / 360 / 375 / 390 / 430 px mobile | 0 px overflow on every route and width; automated clip scan found no truncated content. One real fix: the CTA perk list went to a single column below 380 px so "Local processing" no longer crowds its tick. |
| 8 | Footer and internal links | Footer has 11 links (home, six tools, all tools, our approach, privacy, terms), all 200, no external or `mailto` links, no placeholder targets. Full crawl of all 11 internal routes: none broken. New in-page anchors verified to resolve and scroll. |

## Verification results

| Check | Result |
|---|---|
| `npx prettier --check .` | Pass |
| `npx eslint .` | Pass — 0 errors, 0 warnings |
| `npx tsc --noEmit` | Pass |
| `npm test` (Vitest) | **82 passed** (9 files) |
| `npm run build` | Pass — 19 static routes |
| Playwright (Chromium, 114 tests) | **114 passed** |
| axe WCAG 2.0/2.1/2.2 A+AA | 0 violations on all 11 routes (1440 & 390 px) |
| Horizontal overflow | 0 px on 7 routes × 9 widths (320–1440) |
| Console/page errors | none on any route |
| Touch targets < 40 px | only the sr-only skip link and two inline in-sentence legal links |
| Footer links | 11 links, all HTTP 200, no external targets |
| Legal-page anchors | 6 per page, all targets resolve, click scrolls |
| Tool functionality | all six workspaces exercised (counts, casing, JSON, password, QR preview + download, image compression) |

### Search & filter matrix (re-checked after the polish pass)

| Interaction | Result |
|---|---|
| Initial state | 6 cards · "6 tools, all free to use" |
| Query `json` (name) | 1 card · "1 of 6 tools" |
| Query `crypto` (keyword) | 1 card → Password Generator |
| Query `webp` (description) | 1 card → Image Compressor |
| Query `pdf merge` | 0 cards + "No tools found" empty state |
| Empty-state clear button | 6 cards restored |
| Chips: Text / Developer / Security / Image & QR / All | 2 / 1 / 1 / 2 / 6 cards, `aria-pressed=true` on the active chip |
| Text + `json` combined | 0 cards (correct: no JSON tool in Text) |
| "Reset filters" | 6 cards |
| Escape in the field | clears the query |
| Card click | navigates to `/tools/<slug>`, correct `<h1>` |

### Cross-breakpoint audit

| Width | Overflow X | Clipped content |
|---|---|---|
| 320 / 360 / 375 / 390 / 430 | 0 px | none |
| 768 | 0 px | none |
| 1024 | 0 px | none |
| 1440 | 0 px | none |

Page heights: home 3490 px (1440) → 6376 px (320); About 4604 px (1440) → 8643 px (320); `/tools` 2227 px (1440); `/privacy` 2529 px (1440); `/terms` 2349 px (1440).

Accessibility fixes made during this pass:
1. Category count badges set to `aria-hidden` so button names stay "Text",
   "Developer", … (also removes count noise for screen readers).
2. Removed low-contrast decorative step numbers on About (axe colour-contrast).
3. Category labels raised from 11 px to 12 px.

## Screenshots

`docs/verification/redesign/`

| File | View |
|---|---|
| `home-desktop-1440.png` | Homepage, full page, 1440 px |
| `home-desktop-1366.png` | Homepage, 1366 px |
| `home-tablet-768.png` | Homepage, 768 px |
| `home-mobile-430/390/375/360/320.png` | Homepage at each mobile width |
| `home-hero-desktop.png`, `home-hero-mobile-390.png` | Hero at viewport scale |
| `about-desktop-1440.png`, `about-desktop-1366.png`, `about-mobile-390.png`, `about-mobile-320.png` | About page |
| `privacy-desktop-1440.png`, `privacy-mobile-390.png` | Privacy Policy (shared legal layout) |
| `terms-desktop-1440.png`, `terms-mobile-390.png` | Terms of Use |
| `tools-desktop-1440.png`, `tools-mobile-390.png` | Tool directory |

## Polish pass (final, awaiting visual approval)

| Item | Change |
|---|---|
| Brand mark | **Root cause of the black logo:** the inner highlight `<rect>` in the SVG mark had no `fill`, so SVG defaulted it to black and covered the gradient. The mark is now CSS-gradient based (`span` + inset ring + inner sheen) with no `<defs>`/id dependency, so it can never fall back to black or collide across instances. `app/icon.svg` updated to the same gradient. |
| Hero illustration | Ground shadow added, glass sheen across the window body, traffic-light dots, balanced 2-left/3-right floating tiles, stronger orbit ring contrast and a wider desktop canvas. |
| Tool cards | Single shared anatomy everywhere (56 px pastel tile, category chip, title, two-line description, "Open tool" + arrow). Hover now: lift, border warm-up, top hairline sweep, icon tilt/scale, arrow fills with the brand gradient. `motion-reduce` opt-outs included. |
| Category chips | Fixed real clipping found at 390–430 px: 3-up labels no longer truncate ("Developer", "Image & QR" were cut). Mobile is 2-up, tablet 3-up, desktop 5-up. |
| Search & filters | Re-verified end-to-end (see matrix below). |
| Readability | Automated clip scan across all breakpoints: no truncated content except the visually-hidden skip link (by design). |

## Still open
- Visual approval of this refinement pass (direction itself is approved).
- Next development phase plan: `docs/NEXT_PHASE.md`.
- Playwright Firefox/WebKit projects are not runnable in this sandbox (browser
  downloads blocked); CI covers them.
- Lighthouse re-measure pending.
