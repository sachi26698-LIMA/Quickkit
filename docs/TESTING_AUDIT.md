# Feature regression audit — 13 November 2026

## Results

Tested the production build locally with Node 26 and headless Chromium.

| Check | Result |
| --- | --- |
| Production build | Passed |
| Final TypeScript check | Passed |
| Final ESLint check | Passed, no warnings |
| Final formatting check | Passed |
| Production dependency audit | 0 reported vulnerabilities |
| Unit/integration suite | 1,766 tests: 1,763 passed initially; all 3 timeout failures passed targeted reruns |
| Chromium regression suite | 962 tests: 949 passed initially, 10 failed, 3 skipped; all 10 failures passed targeted reruns |
| Site link crawl | 67 routes returned HTTP 200; no broken/placeholder internal links reported |
| Legal-page audit | 12 routes checked; no problems reported |

Combined browser result after fixes and targeted verification: **959 passed, 3 skipped, no unresolved failures**. This is not a claim that a second full suite was run from scratch. The three skips are optional image-converter, images-to-PDF and PDF-to-image screenshot-evidence tests, not skipped core functional assertions.

## Coverage

- Image conversion, compression, resizing, cropping, transparency, downloads and archives.
- PDF/image/document workflows, local editing, previews, export byte inspection, cancellation and retry.
- Real Word-to-PDF API journeys using this installation's available engine, as well as separately mocked native-response editing tests.
- QR content types, security warnings, upload/camera simulations, multi-code scans, independent decoding of generated exports, history and presets.
- Calculator scenarios, finance schedules, developer tools, clipboard and matching download contents.
- Responsive layouts, keyboard/touch workflows, axe accessibility checks and browser-error checks.
- Hero/laptop layout, bounded perimeter icons, live status, hydration, rotating tool palettes, feedback interactions and visitor-statistics consent/reveal controls.

## Fixes made during the audit

- Hardened the visitor-statistics endpoint against non-string identifiers and oversized/chunked request bodies, with bounded reads and regression tests.
- Corrected React's `dateTime` property usage on legal pages.
- Placed visitor consent UI within the footer landmark to resolve accessibility region violations.
- Updated legacy export tests to close the real optional feedback dialog before continuing, including a manually created mobile browser context. Dedicated feedback tests still exercise the prompt without automatic dismissal.
- Corrected cumulative time budgets for multi-route/multi-viewport/export tests without removing assertions; made the worker cancellation test's delivery delay long enough to allow a real user-style cancellation.
- Removed a subprocess-start race from the native cancellation test and restored genuine Git history for sitemap-date checks.
- Redirected generated screenshot/evidence outputs to ignored `test-results/` paths instead of overwriting checked-in documentation images.

## Limits and deployment checks

- Firefox, WebKit, physical phones and actual camera hardware were not tested. Mobile/touch coverage here uses Chromium emulation.
- Mocked native conversion responses prove editor/export behavior, not LibreOffice or remote-worker rendering fidelity. Real API journeys cover the engine available in this sandbox, not every deployment engine.
- Visitor metrics were exercised with a local persistent test database. Production remote libSQL credentials/storage still need deployment verification; test traffic is not real production audience data.
- The site currently intentionally blocks indexing before launch. Production `SITE_URL`, canonical URLs, sitemap entries and indexing policy need launch-time verification.
- Passing tests are evidence of the covered cases, not a guarantee that every possible input or environment is bug-free.

## Local reports

Full machine-readable reports and logs are in `/home/user/.cache/` (not committed):

- `quickkit-audit-unit-final.json` and `quickkit-audit-unit-recovered.json`
- `quickkit-audit-browser.json` and `quickkit-audit-browser-recovered.json`
- `quickkit-audit-lint-final.log`, `quickkit-audit-format-final.log`, `quickkit-audit-types-final.log`
- `quickkit-audit-links.log`, `quickkit-audit-legal.log`
- `quickkit-audit-dependencies-final.json`
