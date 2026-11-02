# Phase 9 feature checklist — checkpoint, 2 November 2026

**Phase status: In Progress, not acceptance-ready.** No merge or deployment. Screenshots and real browser verification are blocked: Playwright Chromium is not installed and `npx playwright install chromium` fails with ECONNRESET to `cdn.playwright.dev` (not an allowed outbound host). No screenshot files have been fabricated. Preview server is available during this session. Implemented pages are not marked Verified.

## Shared foundation
- Implemented: shared light-theme workspace, labelled inputs, live result, reset, copy, session history and clear, responsive CSS, `ToolShell` breadcrumbs/FAQ/related links, per-route SEO, pure calculation helpers.
- Testing: 4 new unit tests pass alongside existing suite; 4 Playwright/axe tests written but cannot launch. Keyboard, screen-reader, mobile overflow, console, and screenshots remain unverified.
- Pending: extensive edge-case and precision coverage, download/share as appropriate, browser regression, accessibility, performance/bundle inspection, full suite integration.

## Tool-by-tool tracker
Common changed files for the first four: `lib/tools/calculators.ts`, `lib/calculator-info.ts`, `components/tools/calculator.tsx`, `app/tools/[calculator]/page.tsx`, `app/globals.css`, `lib/catalog.ts`, `components/tool-icon.tsx`, `components/tool-shell.tsx`, `tests/calculators.test.ts`, `tests/e2e/calculators.spec.ts`.

### Percentage — Testing — `/tools/percentage-calculator`
- Implemented: percentage of, ratio, increase, decrease, difference, reverse change, formula, session history.
- Pending: broad invalid/large-number and decimal tests; genuine desktop/mobile checks and screenshots.
- Unit: representative modes and zero divisors pass. Formula: representative checks pass; difference uses average of absolute magnitudes, reverse uses signed change. Browser/desktop/mobile: blocked as above. Known issue: extreme finite inputs can overflow floating-point arithmetic. Changed files: common list.

### Age — Pending — planned `/tools/age-calculator`
- Pending: DOB; years/months/days; total days/weeks/months; next birthday; weekday; age on selected date; leap-day policy; all tests, preview and screenshots. Formula verification: not started. Changed files: none.

### Date difference — Pending — planned `/tools/date-difference-calculator`
- Pending: calendar difference, totals, inclusive end, add/subtract days, business days, leap/timezone-safe arithmetic, tests and previews. Formula verification: not started. Changed files: none.

### BMI — Testing — `/tools/bmi-calculator`
- Implemented: metric/imperial, adult category, healthy range, positive input validation, formula and screening disclaimer.
- Pending: broader edge cases, browser accessibility and responsive screenshots. Unit: representative metric/imperial and invalid values pass. Formula: kg/m² checked against test examples; boundaries need additional tests. Browser/desktop/mobile: blocked. Known issue: BMI categories are for adults and do not cover all populations. Changed files: common list.

### Discount — Testing — `/tools/discount-calculator`
- Implemented: price, sequential discounts, savings, reverse (input is pre-tax discounted price), tax after discount, INR formatting.
- Pending: selectable currency, detailed precision/large-value tests, browser and screenshots. Unit: sequential/reverse and invalid rates pass. Formula: representative examples pass; floating-point calculations round only for display. Browser/desktop/mobile: blocked. Known issue: extreme values may overflow. Changed files: common list.

### GST — Testing — `/tools/gst-calculator`
- Implemented: add/remove, custom rate, taxable amount, GST, final price, CGST/SGST and alternative IGST breakdown, INR formatting.
- Pending: expanded edge/precision tests, browser and screenshots. Unit: representative add/remove and invalid values pass. Formula: representative examples pass. Browser/desktop/mobile: blocked. Known issue: extreme values may overflow; rates and treatment require user confirmation. Changed files: common list.

### EMI — Pending — planned `/tools/emi-calculator`
- Pending: principal, rate, months/years, EMI, totals, chart, amortization, prepayment where practical, live updates, formulas, tests, previews and screenshots. Formula verification: not started. Changed files: none.

### Loan — Pending — planned `/tools/loan-calculator`
- Pending: repayments, principal/interest, scenarios, schedule, assumptions, formulas, tests, previews and screenshots. Formula verification: not started. Changed files: none.

### Scientific — Pending — planned `/tools/scientific-calculator`
- Pending: arithmetic, trig/inverse, logs, powers/roots, parentheses, factorial, constants, degree/radian, memory, keyboard, history, safe parser, validation, tests, previews and screenshots. Formula verification: not started. Never use eval. Changed files: none.

### Unit converter — Pending — planned `/tools/unit-converter`
- Pending: length, mass, area, volume, speed, time, data, energy, pressure, power, frequency, fuel consumption, searchable units, swap, factors, tests, previews and screenshots. Formula verification: not started. Changed files: none.

### Temperature — Pending — planned `/tools/temperature-converter`
- Pending: Celsius/Fahrenheit/Kelvin, live conversion, negative handling, formula, validation, tests, previews and screenshots. Formula verification: not started. Changed files: none.

### Time — Pending — planned `/tools/time-converter`
- Pending: seconds through years, month/year assumptions, duration arithmetic, date-time add/subtract, tests, previews and screenshots. Formula verification: not started. Changed files: none.

## Verification record and continuation
- `npm run typecheck`: passed. `npm run lint`: passed. `npm test`: 142 tests passed across 13 files after correcting an existing fixed sitemap count and using approximate equality for floating-point discount arithmetic. `npm run build`: passed; four calculator routes prerendered. These runs preceded only formatting and test expectation adjustments.
- Browser: `TEST_BASE_URL=http://127.0.0.1:3000 npx playwright test tests/e2e/calculators.spec.ts --project=chromium` failed before tests ran because Chromium executable is missing. Download failed due to restricted network. No accessibility results or screenshots available. Full browser regression not run.
- `npm ci` reported 15 moderate dependency advisories; no dependency upgrades attempted. Full audit and bundle analysis pending.
- Next: finish the eight pending calculators in the plan, extend validations and independent formula/edge tests, install browser in an environment with access to Playwright downloads, run all viewports/axe/regression tests, capture all 12 desktop/mobile screenshots, rerun all checks, and update this record. Avoid marking any tool Verified until all acceptance checks pass.
