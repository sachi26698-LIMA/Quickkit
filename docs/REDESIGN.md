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
| Tool functionality | all six workspaces exercised (counts, casing, JSON, password, QR preview + download, image compression) |

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
| `home-tablet-768.png` | Homepage, 768 px |
| `home-mobile-430/390/375/360/320.png` | Homepage at each mobile width |
| `home-hero-desktop.png`, `home-hero-mobile-390.png` | Hero at viewport scale |
| `about-desktop-1440.png`, `about-mobile-390.png` | About page |
| `tools-desktop-1440.png`, `tools-mobile-390.png` | Tool directory |

## Still open
- Visual approval of the captures above.
- Playwright Firefox/WebKit projects are not runnable in this sandbox (browser
  downloads blocked); CI covers them.
- Lighthouse re-measure pending.
