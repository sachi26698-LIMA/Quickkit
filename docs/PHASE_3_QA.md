# QUICKKIT — Phase 3 QA Report (Advanced Polish & Professional Quality)

Completed 2026-11-01. Phase 2 was independently re-verified from a fresh
checkout before this phase began (95 unit tests, 109 browser tests, build —
all passing at commit `1079b81`). No deployment was performed.

## Fixes applied in Phase 3

1. **Touch targets** — compact toolbar buttons (Sample, Open file, Hide,
   Paste from clipboard, Try sample text) raised from 36px to 40px minimum
   height, matching the design system's touch-friendly convention.
2. **Font-swap CLS eliminated** — migrated Geist from `@fontsource-variable/geist`
   to self-hosted `next/font/local` (`app/fonts/geist-latin-variable.woff2`,
   OFL license included). The font is now preloaded and paired with a
   metric-matched fallback, removing the throttled-mobile layout shift
   (Home CLS 0.249 → 0 in Lighthouse). One production dependency removed.
   Trade-off: only the Latin subset ships; other scripts already fell back
   to system fonts for glyphs Geist lacks.
3. **Clickjacking hardening** — CSP gained `frame-ancestors 'none'`.
4. **Brand label-in-name** — decorative "Q" logo tile is now `aria-hidden`,
   so the accessible name ("QUICKKIT home") matches the visible wordmark
   for voice-control users. (Lighthouse's experimental text-extraction
   audit still flags the rendered letter; it is not part of the scored
   Accessibility category, which is 100.)
5. **Permanent regression coverage** — overflow matrix in
   `tests/e2e/quality.spec.ts` extended to all nine required widths
   (added 360 + 1024); two new tests in `tests/e2e/premium-tools.spec.ts`:
   axe WCAG 2.2 AA in five interactive states, and a keyboard-only
   password-generation journey with per-stop focus-visibility checks.

## Actual results

### Automated gates
- lint / typecheck / format:check — clean
- Unit tests — **95 passed**
- Browser tests (Playwright, Chromium, production build) — **131 passed,
  0 failed, 0 flaky** (109 pre-existing + 2 new a11y tests + 20 new
  viewport-overflow combinations)
- Production build — all 18 routes static

### Responsive (320, 360, 375, 390, 430, 768, 1024, 1366, 1440 × 10 routes)
- Horizontal overflow: **none** in any of the 90 combinations (now also
  enforced permanently by the e2e suite).
- Screenshots: `docs/phase-3/` (home + every tool at 1440 and 390,
  plus 320px worst-case checks and a 768px tablet check).

### Accessibility
- Axe WCAG 2.0/2.1/2.2 A+AA: **0 violations** on all routes at first paint
  (committed suite) and in 7 audited interactive states (filled word
  counter with density/goal, JSON error with caret excerpt, JSON success,
  generated password + history, QR result, compressed image).
- Keyboard: visible focus indicator verified at every one of 14 tab stops
  on all six tool pages; mobile menu Escape/focus-return covered by the
  existing suite; new keyboard-only journey test passes.
- Reduced motion: verified `prefers-reduced-motion: reduce` yields
  0s transitions and non-smooth scrolling.
- Targets: all operable controls ≥40px except the intentionally
  visually-hidden file input (operated through its 40px button).

### Performance — Lighthouse 12, mobile simulation (Moto G, throttled),
production server on localhost, bundled Chromium 153
| Page | Perf | A11y | Best Prac. | SEO | FCP | LCP | CLS | TBT | Weight |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Home | 100 | 100 | 100 | 63* | 0.8s | 0.8s | 0 | 70ms | 213 KiB |
| Word Counter | 100 | 100 | 100 | 63* | 0.8s | 0.8s | 0 | 40ms | 207 KiB |
| Case Converter | 100 | 100 | 100 | 63* | 0.8s | 0.8s | 0 | 40ms | 205 KiB |
| JSON Formatter | 100 | 100 | 100 | 63* | 0.8s | 0.8s | 0 | 60ms | 207 KiB |
| Password Generator | 100 | 100 | 100 | 63* | 0.8s | 0.8s | 0 | 60ms | 206 KiB |
| QR Generator | 100 | 100 | 100 | 63* | 0.8s | 0.8s | 0 | 70ms | 206 KiB |
| Image Compressor | 100 | 100 | 100 | 63* | 0.8s | 0.8s | 0 | 70ms | 207 KiB |
| About | 100 | 100 | 100 | 63* | 0.8s | 0.8s | 0 | 70ms | 202 KiB |

\* SEO is gated by the intentional pre-launch `noindex` (robots meta,
`X-Robots-Tag`, `robots.txt`) which flips automatically when `SITE_URL`
is configured at launch (`lib/launch.ts`). It is not a defect.
Bundle facts: ~180 KB gzipped initial JS per route (Next/React runtime
dominated; `qrcode` is correctly split into ~36 KB of async chunks),
7–8 KB gzipped HTML, 29 KB self-hosted variable font. Lab numbers from a
local sandbox are indicative, not a substitute for post-deploy field data.

### Functional QA (normal / empty / invalid / large)
Covered by the 131-test browser suite and 95 unit tests, including:
1,000,000-character text, empty/invalid/deeply-nested/overflow-number JSON,
2,000-UTF-8-byte QR limits with real decode checks, corrupt/oversized/
wrong-type images, clipboard success and failure paths, real download
byte assertions, object-URL cleanup, and all copy/download/reset actions.

### Security & privacy verification
- `npm audit --omit=dev`: **0 vulnerabilities** in production dependencies.
- Dev-only: 15 moderate findings, one root cause (minimatch advisory in
  the ESLint toolchain). This is an intentionally engineered position:
  the one modern consumer is pinned to fixed minimatch 11.0.3 via
  `overrides`, and `tests/dependency-compat.test.ts` proves the residual
  legacy copy does not contain the vulnerable optimizer code path.
  `npm audit fix --force` was evaluated and rejected because it would
  break those compatibility guarantees for a non-shipped dev toolchain.
- Code audit: no `eval`, `Function`, `dangerouslySetInnerHTML`, web
  storage, cookies, analytics or network submission of tool inputs.
  The only `fetch` reads a same-page `blob:` URL to copy a QR image.
  A committed e2e test asserts no input leaves the page over the network.
- Headers verified live: CSP (now including `frame-ancestors 'none'`),
  HSTS, `nosniff`, strict referrer policy, restrictive Permissions-Policy,
  `X-Powered-By` removed.

### Sandbox methodology note
The Playwright/Lighthouse browser CDNs are unreachable from this build
sandbox, so browser tests and Lighthouse ran on the npm-bundled Chromium
(`@sparticuz/chromium`, `--no-save`, temporary config removed afterwards).
The committed `playwright.config.ts` is unchanged; CI will exercise
Chromium + Firefox + WebKit via `npm run test:e2e`. Firefox/WebKit were
therefore not re-run in this phase — the only known engine difference is
password masking (`-webkit-text-security`), documented in Phase 2.

## Residual / accepted items
- SEO score remains gated until launch configuration (`SITE_URL`).
- Dev-toolchain minimatch advisory (see rationale above).
- Latin-only font subset (documented trade-off, fix applied for CLS).
- Field performance (CrUX) can only be measured after deployment.
