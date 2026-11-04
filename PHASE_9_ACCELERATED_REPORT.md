# Phase 9 accelerated V2 checkpoint

**Status: In Progress, not accepted or deployed.** Currency conversion remains **BLOCKED — awaiting an approved live exchange-rate provider**. No hardcoded exchange rates or new external API were introduced.

## Calculator status

| Calculator | Increment or existing functionality exercised | Remaining work |
|---|---|---|
| Discount | Basic calculation PDF; sequential, tax, reverse, offer comparison, buy/get and profit; focused browser and arithmetic tests. | Comprehensive all-control, PDF content, precision, accessibility and cross-browser verification. |
| Percentage | Advanced sequential/comparison PDF; existing formulas, history, chart and CSV tested. | Complete shared history actions and comprehensive PDF content/accessibility review. |
| BMI | Multi-person comparison and CSV, separate adult/minor/unknown interpretation; existing age gating tested. | History chart and full unit-switching workflow, clinical review and exhaustive verification. |
| GST | Multi-item invoice PDF with configurable rates/basis and line details; CSV retained. | PDF requires ASCII names that fit the page; CSV supports other names. Accounting rounding and all cases need review. |
| Age | Optional, explicitly entertainment-only zodiac, with session restore; result CSV. | Broader leap/calendar boundary, accessibility and shared history checks. |
| Date difference | CSV includes dates, result and breakdown; business-day/holiday behavior tested. | More calendar visualization, exhaustive edge and accessibility checks. |
| EMI | Monthly amortization schedule PDF; CSV, prepayments and variable-rate scenario remain. | Maximum-length PDF, rate/prepayment boundary, complete independent amortization verification. |
| Loan | Monthly amortization PDF alongside affordability/LTV and variable-rate workflows. | Underwriting/rounding disclosures and broader independent and browser testing. |
| Scientific | Expression-history CSV with formula-injection escaping; bounded expression parser remains. | Dedicated fractions, parser fuzz/domain/keyboard coverage, comprehensive verification. |
| Unit | Comparison CSV, session favorites/delete and precision/settings restore. | Persistent favorites/recent, factor verification and blocked live currency conversion. |
| Temperature | Comparison CSV and more complete session restore. | Broader Rankine/absolute-zero edge cases and independent verification. |
| Time | Comparison CSV and more complete session restore; existing IANA meeting planner and calendar shifts remain. | Overnight shifts, breaks/holidays, broader IANA/DST edge cases and manual accessibility review. |

## Current test evidence

- `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test` (**202 passed**) and `npm run build` passed on the current application code.
- Full production Chromium regression **339 passed**, including existing QUICKKIT tools, focused batch tests and representative axe/responsive checks. It is not proof every control and every input has been tested.
- Earlier focused run: 7 passed and one BMI locator ambiguity failed; fixed locator and targeted rerun passed 3/3. Formatting initially failed on two test files and passed after formatting. Batch 2 and batch 3 focused browser checks passed 3/3 and 6/6 respectively.
- PDF checks load the generated files and validate page count, but do not independently inspect all extracted content or every 1,200-month schedule. Existing GST PDF uses basic Latin text only and does not support long unbroken names; errors direct users to CSV.
- Chromium was run using an npm-distributed Chromium binary and supporting libraries. Firefox/WebKit and manual screen-reader checks were not rerun. Existing CI previously reported two unrelated WebKit PDF-merger failures; this run does not resolve them.
- Monetary and scientific operations use binary floating point. Financial outputs are estimates, shown rounded, not lender or filing advice. BMI is screening, not diagnosis. Browser IANA timezone database versions and DST rules vary. History and favorites are session-only.
- Prior populated screenshot evidence is indexed at `docs/phase-9-v2-final-evidence/README.md`; the focused Discount screenshots are at `docs/phase-9-discount-qa/README.md`. These predate the latest PDF and BMI UI additions and should not be presented as new visual verification.

## Next steps

1. Address the remaining per-tool items above, prioritizing international GST PDF text, comprehensive loan/PDF accuracy and BMI comparison/history.
2. Run independent formula, boundary, keyboard, visual and cross-browser tests for every applicable feature; capture updated screenshots and revise the matrix without marking unverified work complete.
3. Configure an approved live-rate provider only after owner approval and review of availability, licensing, pricing, rate limits, security and privacy.
4. No push, merge or deployment without explicit approval.
