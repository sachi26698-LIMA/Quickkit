# Phase 9 calculator implementation plan

## Audit (2 November 2026)
- Next.js 16 App Router, React 19, TypeScript; Node 22. Existing tools use `/tools/<slug>`, `ToolShell`, `pageMetadata`, the inline `lib/catalog.ts` registry, and `app/globals.css` tokens. Sitemap and discovery derive from the catalog.
- Eight existing tool routes; no calculator implementation. Working tree was clean on `arena/212261ea-quickkit` at `771a54b`. This session's branch is fixed by Arena and is the Phase 9 work branch.
- Existing tests use Vitest and Playwright; scripts include lint, typecheck, test and build. Existing catalog tests contain hardcoded counts and need adjustment as tools are added. Existing status policy describes an older single-tool workflow; the owner's current request authorizes Phase 9 work, not deployment or merging.
- Risks: shared catalog/shell types, fixed-count tests, browser availability, timezone/date arithmetic, financial rounding, unsafe scientific expression evaluation, and bundled dependencies for unrelated PDF/OCR tools.

## Workstreams and integration
1. Shared calculation/validation utilities and reusable accessible interface, preserving design tokens and shell.
2. Percentage, BMI, discount and GST; independently test formulas and validation.
3. Age and date difference: UTC civil-date arithmetic, explicit leap-day policy.
4. EMI and loan: payment and amortization with clear rounding and zero-interest behavior.
5. Scientific: bounded parser, never eval; unit, temperature and time conversion with documented factors and assumptions.
6. Integrate catalog and SEO, then automated math, regression, responsive browser, keyboard and accessibility tests; capture genuine screenshots and report failures.

Shared files are integrated sequentially; independent workstreams are not delegated because no parallel coding agents are available. Do not expose placeholders or mark untested tools verified. See `PHASE_9_FEATURE_CHECKLIST.md` for the authoritative progress and next steps.

## Continuation checkpoint
All twelve routes now have initial implementations. Integration was sequential to avoid shared-file conflicts. Chromium became usable through an npm-distributed binary and its bundled NSS libraries; the CDN remains inaccessible and Firefox/WebKit have not been tested. The current evidence and remaining acceptance work are recorded in `PHASE_9_FEATURE_CHECKLIST.md`. This is not a release approval.
