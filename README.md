# QUICKKIT

**Handy tools. Zero hassle.** A premium, light-only collection of browser
utilities — Next.js App Router, TypeScript, Tailwind CSS v4, and tool logic that
runs locally in the visitor's browser.

## Status

| Phase | Scope                                                                                                                               | State                                                                                          |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 1     | Repository & foundation: design system, layout, header/nav/footer, hero, search, categories, cards, responsive shell, tooling, docs | **Done — build and checks verified**                                                           |
| 2     | Core tools: Word Counter, Case Converter, JSON Formatter, Password Generator                                                        | Implemented in the repo; re-verification tracked in the phase log                              |
| 3     | Browser tools: QR Generator, Image Compressor                                                                                       | Implemented in the repo; re-verification tracked in the phase log                              |
| 4     | Content, SEO, accessibility and responsive audit                                                                                    | Tool instructions/FAQs, legal pages, sitemap, robots, 404 in place; a full re-audit is pending |
| 5     | Release readiness, security review, deployment                                                                                      | Prepared for Vercel; not deployed                                                              |

Phase evidence and measured results: `docs/PHASE_1_FOUNDATION.md`,
`docs/VERIFICATION.md`, `docs/FINAL_QUALITY_AUDIT.md`, `RELEASE_CHECKLIST.md`.

## Stack

- **Next.js 16 (App Router)** + **React 19** + **strict TypeScript**.
- **Tailwind CSS v4** via `@tailwindcss/postcss`, configured in CSS with
  `@theme` (`app/globals.css`). No `tailwind.config.ts` is needed in v4.
- **Plus Jakarta Sans** variable font, self-hosted through `@fontsource-variable`
  — no external font requests.
- **Lucide** icons for every glyph; no emoji or icon fonts.
- **npm** with the committed `package-lock.json` (Node 22, see `.nvmrc`).
- **Vitest + React Testing Library** for unit/component tests, **Playwright** for
  browser flows.

## Architecture

```text
app/
  layout.tsx            Root shell: skip link, header, main, footer, metadata
  page.tsx              Homepage: hero, search + catalog, trust, principles
  tools/page.tsx        Full tool directory (search/filter, all six tools)
  tools/<slug>/page.tsx Six tool routes (server components + metadata)
  about|privacy|terms   Long-form content pages
  globals.css           Tailwind import, @theme design tokens, base + components
components/
  brand/                Logo mark, wordmark, logo lockup
  layout/               Site header (desktop dropdown + mobile sheet), footer
  home/                 Hero, hero visual, trust panel, principles, free band
  tools/                Tool explorer (search/filter), tool card, tool icon,
                        tool workspaces, copy button
  ui/                   Button, badge, icon tile, section heading primitives
  tool-shell.tsx        Shared tool page chrome (breadcrumb, guide, FAQ, related)
lib/
  catalog.ts            Single source of truth for tools, categories, search
  seo.ts                Metadata helper + validated production origin
  launch.ts             Indexing gate (SITE_URL + LAUNCH_APPROVED)
  tools/                Pure tool logic, unit-testable without the DOM
  utils.ts              cn() class merge helper
tests/                  Vitest suites (unit/component) and Playwright suites
```

Conventions: Server Components by default; `"use client"` only for the explorer,
header, workspace and error boundary. Reusable tool logic lives in `lib/tools/`
and is free of DOM access. Each tool route renders its own metadata, guide, FAQ
and related tools.

## Design system

Tokens live in `app/globals.css` under `@theme`, so each one is both a CSS
variable and a Tailwind utility (`bg-brand-600`, `text-muted`, `rounded-card`,
`shadow-card`, `animate-float`, …).

- Surfaces: white and soft lavender (`#F8F6FF` → `#FFFFFF` gradients).
- Brand purple `#6657E8` with lavender support (`#A397FF` → `#EBE6FF`).
- Mint accent (`#D9FFF2`) reserved for privacy/trust signals.
- Ink `#171B2E`, muted text `#565D73`, hairline borders `#E7E5F2`.
- Radii `rounded-card`, `rounded-panel`, `rounded-pill`; three shadow levels.
- Light only: `color-scheme: light`, no dark mode, no black backgrounds.
- Motion respects `prefers-reduced-motion`; focus rings are always visible.

## Scripts

```sh
npm run dev          # development server on 0.0.0.0:3000
npm run build        # production build
npm start            # serve the production build
npm run lint         # ESLint (next core-web-vitals + TypeScript rules)
npm run lint:fix     # ESLint with --fix
npm run typecheck    # tsc --noEmit (strict)
npm test             # Vitest unit/component suites
npm run test:watch   # Vitest watch mode
npm run test:e2e     # Playwright (needs installed browsers)
npm run format       # Prettier write (Tailwind class sorting enabled)
npm run format:check # Prettier check
npm run check        # format, lint, typecheck, test and build in one go
```

## Setup

```sh
npm ci
npm run dev
```

Node 22 is required (`.nvmrc`, `package.json` engines and CI agree). No API keys,
database, account system, analytics or secrets are needed. `.env.example`
documents the only optional variables (`SITE_URL`, `LAUNCH_APPROVED` and
`NEXT_TELEMETRY_DISABLED`).

## Processing and limits

| Tool               | Notes                                                                                                                                         |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Word Counter       | 1,000,000 UTF-16 code units; Unicode code-point character counts; whitespace-delimited words; blank-line paragraphs; 200 wpm reading estimate |
| Case Converter     | 1,000,000 code units; four case modes; preserves line breaks; language rules are approximate                                                  |
| JSON Formatter     | 1,000,000 characters, 128 nesting levels; rejects non-finite numeric overflow; never executes JSON; duplicate keys collapse to the last value |
| Password Generator | 8–64 characters; `crypto.getRandomValues` with rejection sampling; at least one character from each selected set                              |
| QR Generator       | 2,000 UTF-8 bytes; client-side `qrcode` loaded on demand; 768×768 PNG                                                                         |
| Image Compressor   | JPEG/PNG/WebP input; 15 MB, 24 MP, 8,192 px/side; identical dimensions; WebP/JPEG/PNG output                                                  |

Canvas re-encoding can strip metadata and shift colour profiles. PNG output is
lossless, so the quality control is disabled for PNG. Preview object URLs are
revoked on replacement, reset and unmount.

## Privacy and security

Tool inputs stay in browser memory: no uploads, no persistent storage of tool
content, no accounts, no analytics, no ad SDK. Fonts and libraries are bundled.
Hosting still receives ordinary page and asset requests.

Security headers (CSP, HSTS, `X-Content-Type-Options`, referrer policy,
permissions policy) are configured in `next.config.ts`. CSP currently allows
inline framework scripts/styles because the static Next.js shell requires them;
it forbids `eval`, objects and remote script sources. Framing is intentionally
not blocked so the Arena preview can embed the app — review `frame-ancestors`
before a standalone production launch.

Indexing is gated: `robots.txt` disallows crawling, metadata is `noindex` and the
sitemap is empty until `SITE_URL` is set **and** `LAUNCH_APPROVED=true` in a
production environment.

## Deployment

Intended for Vercel with the Next.js preset, `npm ci` and `npm run build`. See
`RELEASE_CHECKLIST.md` for the owner/legal gates that must be resolved before a
public launch, including the operator identity, contact and domain details still
marked as owner input on `/privacy` and `/terms`.

## Known limitations

- Automated accessibility scans pass on the checked routes, but screen-reader
  and physical-device testing is still an owner acceptance task.
- Firefox/WebKit/Chromium coverage is defined in Playwright; browsers must be
  installed in the environment running the suite.
- `npm audit` still reports development-only moderate entries inherited from
  ESLint's `minimatch@3` chain; production dependencies audit clean. Details:
  `docs/security/DEPENDENCY_REVIEW.md`.
