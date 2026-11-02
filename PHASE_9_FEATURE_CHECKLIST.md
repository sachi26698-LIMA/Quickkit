# Phase 9 feature checklist — 2 November 2026

**Phase status: Testing / In Progress. Not accepted, merged or deployed.** All twelve routes have implementations and representative tests, but broader mathematical, interaction, keyboard and cross-browser coverage is still needed. No tool is marked Verified.

## Shared foundation
- Implemented: labelled inputs, result panel, live updates, reset, copy, session history/clear, responsive templates, SEO, breadcrumbs, FAQ and related links.
- Testing: Chromium 1440, 768, 375, 390 and 430 widths, one populated example and horizontal-overflow assertion per tool; axe automated scan at 430 and page errors checked. Screenshots: `docs/phase-9-screenshots/<slug>-1440.png` and `...-375.png` (24 real screenshots). This is not a complete manual visual or keyboard audit.
- Pending: expanded keyboard and input interaction tests, cross-browser tests, broader independent numerical review and extreme values, complete formula documentation, detailed bundle analysis.

## Calculator details
All routes are under `/tools/`. Common integration files: `lib/catalog.ts`, `lib/calculator-info.ts`, `app/tools/[calculator]/page.tsx`, `app/globals.css`, `components/tools/phase9-shared.tsx`; screenshots and browser tests in `docs/phase-9-screenshots/` and `tests/e2e/{calculators,phase9-remaining}.spec.ts`. The first four also use `components/tools/calculator.tsx` and `lib/tools/calculators.ts`; new tools use `components/tools/phase9-*.tsx` and `lib/tools/phase9-*.ts`. Representative formula tests are in `tests/calculators.test.ts` and `tests/phase9-remaining.test.ts`.

| Tool / route | Status | Implemented features | Pending / known limitations |
|---|---|---|---|
| Percentage `/tools/percentage-calculator` | Testing | of, ratio, increase/decrease, difference, reverse signed change, formula, history | Test more precision, bounds and every UI mode; difference uses average absolute magnitudes. |
| Age `/tools/age-calculator` | Testing | selected birth/as-of dates; calendar years/months/days; total days/weeks/completed months; weekday; birthday countdown; leap-day policy | No default to today; user selects as-of date. More month-end/year-boundary tests and independent review needed. Feb 29 observed Feb 28 in non-leap years. |
| Date difference `/tools/date-difference-calculator` | Testing | date difference, years/months/days, total days/weeks, inclusive end, signed day shift, weekdays; UTC civil dates | No public-holiday calendar. More boundary tests; calendar month-end clamping documented. |
| BMI `/tools/bmi-calculator` | Testing | metric/imperial, adult category, healthy weight range, validation, formula and disclaimer | Broader thresholds and edge tests; screening only. |
| Discount `/tools/discount-calculator` | Testing | price, sequential discounts, reverse, savings, tax, INR | Selectable currency not implemented. Floating-point, rounded at display; more edge tests. |
| GST `/tools/gst-calculator` | Testing | add/remove, custom rate, taxable amount, GST, CGST/SGST and alternative IGST, INR | More tax rounding and bounds tests; not tax advice. |
| EMI `/tools/emi-calculator` | Testing | fixed rate, monthly/year tenure, payment/totals, chart, full schedule, extra monthly prepayment, live updates | More large/small/rate boundary and rounding tests. Extra payments apply monthly; no lender fees. |
| Loan `/tools/loan-calculator` | Testing | fixed-rate repayment, principal/interest, payment, schedule, up to five scenarios, assumptions/formula | Comparison saves outputs rather than detailed input labels; more scenario interaction tests. |
| Scientific `/tools/scientific-calculator` | Testing | arithmetic, parentheses, powers, roots, trig/inverse, logarithms, factorial, constants, degree/radian, memory, text keyboard, history; bounded parser without eval | Broader domain, precision, parser-fuzz and keyboard tests; tan at singularities is subject to floating-point approximation. |
| Unit `/tools/unit-converter` | Testing | length, mass, area, volume, speed, time, data, energy, pressure, power, frequency and fuel economy; search/swap | More independent factor/reciprocal tests across all units. |
| Temperature `/tools/temperature-converter` | Testing | Celsius/Fahrenheit/Kelvin, negative values, absolute-zero validation, formula, swap | More decimal/edge tests. |
| Time `/tools/time-converter` | Testing | seconds through years, convert/swap; duration add/subtract from local datetime | Month = 30 days, year = 365 days; elapsed time across DST, not calendar arithmetic. More DST/invalid date tests. |

## Formula and QA report
- Representative unit cases pass for each calculator (including leap day, reversed dates, zero-rate loans, early payoff, division by zero, scientific precedence, absolute zero, fuel reciprocity and defined time approximations). Coverage is not exhaustive or independent certification of all formulas.
- `npm run typecheck`, `npm run lint`, `npm test` passed (150 tests, 14 files). Production build passed for all 12 routes.
- Chromium regression: 271 tests passed, including 12 calculator checks. Calculator tests exercise one example at each requested width, compare expected output, detect document overflow, inspect uncaught page errors and run axe at 430px. Accessibility: automated axe reported no violations in those tested states; manual keyboard and assistive technology testing remains pending.
- Full regression initially encountered an outdated fixed catalog count; updated the test to derive the count from the catalog. Original four tool browser tests also passed separately. Initial loan axe findings (unlabelled chart role and inaccessible scroll region) were corrected and rerun successfully.
- Browser blocker investigated: default Playwright Chromium absent; CDN download fails due to outbound restriction. Installed `@sparticuz/chromium` in an external temporary workspace through npm registry, extracted its supplied NSS libraries, and ran Playwright with `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` and `LD_LIBRARY_PATH`. No site security headers were changed. This binary/environment is not a committed dependency; Firefox and WebKit remain unavailable and untested. Full regression was against the build before the latest small numeric-bound fixes; after rebuilding, all 12 calculator browser checks passed again and screenshots were refreshed.
- `npm ci` reported 15 moderate dependency advisories at previous checkpoint. No dependency changes; full audit and bundle analysis pending.

## Next steps
1. Repeat the full regression after numeric changes; run Firefox/WebKit in a browser-enabled environment.
2. Add tests for every mode, missing inputs, all unit factors, currency rounding, date month-end/year boundaries, scientific domains, prepayment and comparison interactions, clipboard/history/reset and keyboard navigation.
3. Review screenshots manually at all target widths; test assistive technology and inspect console warnings as well as page errors.
4. Add currency choice for discounts, strengthen formula explanations and scenario details, conduct dependency/bundle review, and update all records only after tests pass. No merge or deployment without owner approval.
