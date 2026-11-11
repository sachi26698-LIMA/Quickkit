# QUICKKIT Phase 9 — Calculator and Converter Audit

**Date:** 10 November 2026 (UTC)
**Status:** **PARTIAL — targeted calculations pass; browser acceptance remains blocked.**
**Checkpoint before Phase 9:** `1e3215b` (Phase 7 documentation; Phase 8 report is being checkpointed with this phase).

## Scope and source review

Audited existing calculator/converter implementations and tests rather than recreating them. Coverage spans core percentage/BMI/discount/GST formulas, advanced percentage scenarios and numerical boundaries, conversion, profit, loans and repayment scenarios, dates, zodiac, scientific calculations, time-zone conversion, working-time calculations, calculator PDF/SEO rendering, and BMI age-safety messaging.

Source review confirmed finite-number/range validation across calculation helpers and input parsing in the specialized modules. Percentage tests cover signed values, zero denominators, tiny values, underflow/overflow and formatting. Time-zone tests cover IANA zones, UTC offset conversion, invalid local dates, daylight-saving gaps, and explicit earlier/later choices for repeated local times. Working-time tests cover selected workdays, partial days, duration, invalid dates/ranges and clock validation. BMI UI suppresses adult categories and weight-range estimates unless adult age is confirmed; minors are directed to age/sex-specific growth charts and clinical guidance. No medical diagnosis or individualized recommended-weight claim is accepted from these tests.

Existing financial/calculator results are tested for representative formulas, but no independent accountant/financial-domain review was performed. Formula tests do not establish suitability for tax, lending, investment, medical or legal decisions.

## Executed tests

Command (Node 26.13.0): `npm exec --yes --package=node@26.13.0 -- node node_modules/vitest/vitest.mjs run --reporter=dot tests/calculators.test.ts tests/bmi-age-safety.test.tsx tests/calculator-pdf.test.ts tests/calculator-seo-batch-b.test.tsx tests/percentage-accuracy.test.ts tests/phase9-conversion-advanced.test.ts tests/phase9-profit.test.ts tests/phase9-remaining.test.ts tests/phase9-timezones.test.ts tests/phase9-v2-advanced.test.ts tests/phase9-v2-scenarios.test.ts tests/phase9-v2.test.ts tests/phase9-working-time.test.ts tests/phase9-zodiac.test.ts`

**Result: 14 test files passed; 65 tests passed (5.05 seconds).**

## Not verified / blocker

- Playwright UI workflows, responsive layouts, keyboard and screen-reader interaction, browser locale/time-zone variation and real-browser calculator output were not run because the browser runtime is unavailable (Chromium previously failed to launch due to missing `libnspr4.so`).
- These tests do not validate legal/tax rules in all jurisdictions, clinical interpretation, financial advice, or real-world domain suitability. No such claims are inferred.
- Browser verification remains a prerequisite for full phase acceptance; see the Phase 5 report for the reproduction path and environment issue.

## Verdict

**NEEDS ATTENTION for full phase acceptance / public launch.** Existing tools passed all 65 targeted tests and source review found no reason to alter established formulas. Browser and independent domain validation remain open. Preserve the existing calculations and URLs.
