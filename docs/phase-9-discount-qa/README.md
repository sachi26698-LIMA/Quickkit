# Discount calculator — focused verification

Status: **Testing**, not complete. This checkpoint strengthens the existing basic discount workflow without rebuilding it. The remainder of Phase 9 is not complete.

## Features in this pass
- Decimal/scientific discount-rate lists reject empty, hexadecimal and underflowed values; the calculation rejects non-finite or underflowed discount multipliers/results.
- Profit ratios reject overflow rather than displaying infinity. Basic session history adds favorite/unfavorite, individual delete and clear confirmation; existing restore, CSV, copy and reset remain.
- Existing comparison, buy/get and profit panels remain separate. Currency selection changes formatting only; it does not convert money or use exchange rates.

## Independent examples
Python `decimal` independently gives: 1250 after 12% then 7.5% = 1017.50, savings 232.50; 18% tax = 183.15; total 1200.65. Cost 80 and selling price 100 gives profit 20, margin 20%, markup 25%. `tests/discount-accuracy.test.ts` also covers reverse and invalid/zero/extreme cases.

## Executed checks
- 12 targeted Vitest cases across `calculators`, `discount-accuracy`, `phase9-profit`, and `phase9-v2-scenarios` passed; full suite 199 passed.
- Production build, formatting, lint and typecheck passed. Targeted production Chromium: 13 passed across discount verification, existing finance tests and advanced batch tests. New tests exercised copy, CSV, history restore/favorite/delete/clear confirmation, reset, malformed inputs and one keyboard action; axe scan on populated responsive route passed.
- Real Chromium screenshots at 375, 390, 430, 768, 1024, 1440: `discount-<width>.png`. Only the 375 capture was visually inspected: the result and comparison are visible, but the several advanced sections make the mobile page long and some other panels are empty. Responsive no-overflow checks passed at all six widths.

## Remaining
Full Phase 9 regression on the latest changes, full keyboard and manual assistive-technology review, Firefox/WebKit, comprehensive offer/profit controls, persistent favorites, formula copying and PDF export are unverified or missing. Calculations use JavaScript floating point; displayed monetary values are rounded and are estimates, not accounting advice. This is not a professional certification or final acceptance.
