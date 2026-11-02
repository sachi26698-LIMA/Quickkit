# Percentage Calculator — implementation and verification

Route: `/tools/percentage-calculator`. Scope: Percentage Calculator only. Browser evidence uses the actual production build and Chromium; it is not a claim of testing Firefox, WebKit or a screen reader.

## Feature checklist
- [x] Percentage of a number: `percentage ÷ 100 × number`; zero and negative examples tested.
- [x] One number as a percentage of another: `part ÷ reference × 100`; zero reference rejected; negative numerator/denominator tested.
- [x] Increase: `value × (1 + rate / 100)`; signed rates and negative values tested.
- [x] Decrease: `value × (1 − rate / 100)`; signed rates and negative values tested.
- [x] Percentage difference: `|a − b| ÷ ((|a| + |b|) / 2) × 100`; both zero rejected, mixed signs tested. Scaled calculation avoids tiny-number denominator underflow.
- [x] Reverse percentage change: `final ÷ (1 + signed rate / 100)`; enter a negative rate for a decrease, −100% rejected. The advanced original-before-discount mode uses `final ÷ (1 − discount / 100)` and rejects 100%.
- [x] Advanced comparison and sequential changes: signed rates apply successively; comparison uses `(new − old) ÷ |old| × 100`, and zero reference is shown as undefined. Step list, magnitude chart, summary copy and CSV export work in tested cases.
- [x] Live results, input validation, reset, session history, restore and clear. Basic history disappears on reload, intentionally. Advanced history is separate and also held in page memory.
- [x] Rounding and limits are shown in the interface: ordinary displayed values use up to four decimal places; nonzero absolute values below 0.0001 or at least 10^15 use seven significant digits in scientific notation. Computation uses IEEE-754 binary floating point; formatted results are estimates, not arbitrary-precision arithmetic. Non-finite results and input underflow are rejected rather than silently displayed as zero.
- [x] Browser test at 375, 390, 430, 768 and 1440 CSS pixels: populated results, no document horizontal overflow and automated axe scans with no reported violations. Keyboard selection, input, Enter on save, reset/restore, clipboard and CSV were exercised. See limitations below.

## Exact displayed-output cases
Expected values below were calculated from the formulas (including independent Python `decimal` checks for representative fractions and compound changes). Actual values are the text asserted against the rendered `<output>` in the successful Chromium run of `tests/e2e/percentage-complete.spec.ts`. Amounts use Indian digit grouping.

| Mode | First input | Second input | Expected | Actual |
|---|---:|---:|---:|---:|
| Of | 20 | 150 | 30 | 30 |
| Of | −10 | 200 | −20 | −20 |
| Of | 0 | 500 | 0 | 0 |
| Of | 50 | 1,000,000,000,000 | 5,00,00,00,00,000 | 5,00,00,00,00,000 |
| Of | 1e−8 | 100 | 1.000000e-8 | 1.000000e-8 |
| Is | 25 | 200 | 12.5% | 12.5% |
| Is | −25 | 200 | −12.5% | −12.5% |
| Is | 25 | −200 | −12.5% | −12.5% |
| Is | 1 | 3 | 33.3333% | 33.3333% |
| Increase | 80 | 25 | 100 | 100 |
| Increase | −100 | 20 | −120 | −120 |
| Increase | 100 | −20 | 80 | 80 |
| Decrease | 100 | 25 | 75 | 75 |
| Decrease | −100 | 20 | −80 | −80 |
| Decrease | 100 | −20 | 120 | 120 |
| Difference | 100 | 120 | 18.1818% | 18.1818% |
| Difference | −100 | 100 | 200% | 200% |
| Reverse | 80 | −20 | 100 | 100 |
| Reverse | 120 | 20 | 100 | 100 |
| Reverse | −120 | 20 | −100 | −100 |
| Reverse | 0 | 50 | 0 | 0 |

Advanced UI assertions: 100 with +10%, −20% → **88** (actual 88); −100 → −50 → −150 → **+50%, −200%** (actual 50%, −200%); 0 → nonzero → **undefined** (actual undefined); discounted 80 at 20% → **100** (actual 100). Export was downloaded and checked for the calculation text.

Invalid UI cases actually exercised: reference zero; difference of two zero values; reverse −100%; magnitude above 1 trillion; number too small to represent; invalid hexadecimal in comma-separated input; and 100% reverse discount. Each showed the expected error. Missing input showed the empty state. Additional unit cases include non-finite values, tiny denominator overflow, subnormal difference, a sequence producing zero, unrepresentable underflow, and rounding.

## Test evidence and limitations
- `npx vitest run tests/percentage-accuracy.test.ts tests/calculators.test.ts tests/phase9-v2-advanced.test.ts`: **32 passed** (23 dedicated percentage tests plus 9 shared tests).
- `npm test`: **185 passed**, 18 files. `npm run typecheck`, `npm run lint`, `npm run build`: passed.
- `tests/e2e/percentage-complete.spec.ts --project=chromium`: **4 passed** on the production preview. The earlier advanced percentage integration test also passed. Browser test asserts no uncaught page errors in the five-width pass; it does not claim a complete browser-console warning audit.
- Real populated full-page screenshots: `docs/percentage-qa/percentage-375.png` and `docs/percentage-qa/percentage-1440.png`. Mobile and desktop images were visually inspected; tablet was checked programmatically.
- Chromium browser was supplied via the previously documented npm-distributed binary and bundled NSS libraries. Firefox and WebKit were not available/tested; manual screen-reader testing was not performed. Automated axe and a targeted keyboard journey do not establish full accessibility conformance. These remain verification limitations, not silently passed checks.
- Numeric inputs are limited to magnitude 10^12 in the basic modes and comparison; sequences support 1–100 changes and reject results beyond 10^15. Very small values are constrained by IEEE-754 precision. See UI for the selected-mode assumptions. No inputs or history are persisted or uploaded.
