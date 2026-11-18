# QUICKKIT production-readiness audit — 18 November 2026

## Scope, evidence and boundaries

This pass inspected the current checkout (`arena/ce25846a-quickkit`, based at `78439ff0583e714614effc0ee2a31b871fa63c7e`), its Next.js application, 56-tool catalog, current Playwright configuration, tests, package/runtime declarations, and representative production-rendered pages. The production origin was not changed; no deploy, environment edit, database operation, branch switch, merge, or push was performed.

Production homepage, PDF Merger, JSON Formatter and Image Compressor were fetched as rendered HTML through the page-fetch facility. They returned rendered page content and showed the expected tool workspaces/privacy messaging. This does **not** execute client-side JavaScript and cannot establish event-handler, browser API, file processing, download, runtime, hydration, or visual behavior. Direct HTTP requests from the sandbox to the production domain failed at the TLS/network boundary. No browser executable or Playwright browser installation was present in the sandbox, and Playwright's browser install inventory failed because its cache directory did not exist. Consequently no browser-based issue was truthfully marked reproduced or passed in this audit.

## Defect register

| ID       | Severity                                                        | Affected browsers / routes                                             | Confirmed root cause                                                                                                                                                                                                                                                                             | Proposed repair / status                                                                                                                                                                                                                                                                                      |
| -------- | --------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| QA-01    | High (coverage gap)                                             | Firefox, WebKit; all 56 tools; shared public/admin responsive surfaces | Existing Playwright projects restricted Firefox and WebKit to a handful of legacy suites. There were no Android-sized Chromium or mobile-WebKit projects. Existing shared responsive coverage used only 7 widths and tested the home shell, not representative tools/admin layouts.              | Added a reusable readiness suite which runs every catalog tool route and the full requested 11-width layout matrix. Added Android-sized Chromium and mobile-WebKit projects; Firefox/WebKit include the readiness suite. Not browser-run in this environment; tests are coverage added, not passing evidence. |
| ENV-01   | Medium (reproducibility risk; not a confirmed production fault) | Local/CI build environments                                            | `package.json` declares Node `26.x`; installed sandbox Node is `22.22.3`; `@zxing/library@0.23.0` also declares Node `>=24.0.0`. `npm ci` warned about both mismatches. Type-check, lint, tests and build happened to complete here, but this environment is outside the declared support range. | Confirm Vercel and CI runtime match the declared major and provide a supported Node 26 runtime, or intentionally align the project/dependencies to a common supported version. No version was changed without validating deployment/runtime compatibility.                                                    |
| REPRO-01 | Unknown (not severity-assigned)                                 | All browsers, all application routes                                   | The reported UI breakage, browser runtime/hydration errors, failed chunks, asset failures, file failures, resource leaks and performance regressions could not be reproduced: the browser engines are unavailable here and the production fetch interface only exposes rendered HTML.            | Run the added suite in a runner with Chromium, Firefox and WebKit installed, then investigate each emitted failure at its source. Do not infer success from SSR/page availability.                                                                                                                            |

No product runtime bug was declared fixed in this pass: there was not enough executable browser evidence to attribute or safely repair the user's reported production failures. The test coverage defect above was confirmed in repository configuration and addressed directly.

## Changes made

- Added `tests/e2e/production-readiness.spec.ts`:
  - derives route coverage from the canonical `lib/catalog.ts` catalog;
  - checks status, visible H1/main, document width, runtime/console errors and failed script/style/font/image resources on each tool route;
  - exercises shared home, directory, text workspace, image workspace and admin-login surfaces at 320, 360, 375, 390, 414, 430, 768, 1024, 1280, 1440 and 1920 pixels;
  - captures small-screen homepage screenshots into Playwright's ignored `test-results` output when actually run.
- Expanded Playwright browser projects with Pixel 7 Chromium and iPhone 13 WebKit emulation. Firefox, WebKit and both mobile projects include the new readiness suite.
- Left tool implementations, branding, SEO/sitemap/robots, Supabase/auth/RLS, environment configuration and production infrastructure untouched.

## Verification performed in this environment

| Check                                                         | Result                                                                                                                                                                                                                                           |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm ci --ignore-scripts`                                     | Completed; warned that sandbox Node 22.22.3 does not satisfy the project Node 26.x declaration or `@zxing/library`'s Node >=24 requirement. 16 high-severity audit findings were reported by npm during install; no automatic audit fix was run. |
| `npm run typecheck`                                           | Passed after the readiness spec and Playwright config edits.                                                                                                                                                                                     |
| `npm run lint`                                                | Passed after the readiness spec and Playwright config edits.                                                                                                                                                                                     |
| `npm run format:check`                                        | Passed repository-wide after the edits.                                                                                                                                                                                                          |
| `npm run test -- --reporter=dot`                              | Passed: 212 files, 2,954 tests. The suite emitted verbose expected ZXing decoder diagnostic output while passing.                                                                                                                                |
| `npm run build`                                               | Passed on Node 22.22.3: Next.js 16.4.6 optimized production build, TypeScript and 159 static page generations completed. This does not validate the production deployment or browser interactions.                                               |
| Production rendered page fetch                                | Homepage, Merge PDF, JSON Formatter and Image Compressor returned rendered HTML. This is SSR evidence only, not a functional/browser pass.                                                                                                       |
| Playwright discovery                                          | `npx playwright test tests/e2e/production-readiness.spec.ts --list` passed: 285 cases discovered (56 routes + responsive suite across five configured projects).                                                                                 |
| Playwright browsers / e2e                                     | **NOT TESTED**. No browser executables were found; Playwright browser installation/listing could not run because the browser cache was absent. No browser-wise pass/fail claim is made.                                                          |
| Requested responsive screenshots                              | **NOT CAPTURED**: requires a real browser run. The added test suite will emit screenshots when run in a browser-equipped environment.                                                                                                            |
| Performance before/after measurements                         | **NOT MEASURED**: no valid browser performance/CPU/memory/Lighthouse measurements were available. No performance improvement is claimed.                                                                                                         |
| Manual Samsung Internet, iPhone Safari, Android Firefox, Edge | **NOT TESTED**.                                                                                                                                                                                                                                  |

## Owner / CI actions required

1. Trigger the existing `pull_request` CI by pushing this branch and opening a PR to `main`; a feature-branch push by itself does not trigger the workflow (push runs are restricted to `main`). The workflow already installs Chromium, Firefox and WebKit with `npx playwright install --with-deps` and runs the full Playwright suite.
2. The Node 26 typecheck, lint, Prettier, unit suite and production build were rerun after a clean `npm ci` and passed (details below); rerun these gates after further source changes.
3. The latest successful baseline CI proves existing file-upload/processing/download e2e coverage runs on hosted browsers. The new Android/iPhone projects now also select representative core, QR/image browser-tools, and PDF Merger interactions; inspect their PR-run results and add tests for any remaining uncovered tool workflows before claiming complete coverage.
4. The checked-in runtime setup agrees across package.json, .nvmrc, GitHub Actions and Vercel's supported Node 26 runtime. Recheck these declarations only if deployment/runtime policy changes.
5. Perform real-device checks and capture actual browser performance baselines before claiming performance or compatibility improvements.

## Delivery / Git

- Branch: `arena/ce25846a-quickkit` (active; retained as required by the session).
- Starting commit: `78439ff0583e714614effc0ee2a31b871fa63c7e`.
- Existing open PRs inspected with `gh pr list`: #3 and #1, both target `main`; neither was changed.
- Production deployment: unchanged.
- At the original audit checkpoint, no commit was made. Continuation verification is recorded below.

## Continuation — runtime and browser execution checkpoint

The continuation requested preservation of this report, test and Playwright changes. They were inspected and retained; no reset or overwrite was performed. The authoritative active session branch is `arena/ce25846a-quickkit` at `78439ff0583e714614effc0ee2a31b871fa63c7e`. The user-supplied `arena/c25846a-quickkit` spelling does not match the checked-out session branch, so no branch switch was made.

### Runtime compatibility — resolved for this test session, no project/deployment settings changed

- `package.json` and `package-lock.json` root engine: Node `26.x`; `.nvmrc`: `26`; GitHub Actions `setup-node`: `26`. `@zxing/library@0.23.0` requires Node `>=24`.
- `vercel.json` does not pin a Node version. Vercel's official runtime documentation lists Node 26.x as the current default/available version and says `package.json` `engines.node` can select/override the project's setting: [Supported Node.js versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions).
- Therefore the repository's intended CI/Vercel runtime is consistent; the mismatch was the sandbox's preinstalled Node `22.22.3`, not a reason to change production settings. No runtime configuration, environment variables or Vercel settings were modified.
- To execute the checks on the declared runtime without changing repository files, provisioned Node `v26.13.1` from the allowed npm registry into `/tmp/quickkit-node26` and ran commands with `PATH=/tmp/quickkit-node26/bin:$PATH`. The temporary runtime is not tracked or a project dependency.

### Node 26 quality gates

| Check                            | Result                                                                                                                                      |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run typecheck`              | Passed on Node v26.13.1.                                                                                                                    |
| `npm run test -- --reporter=dot` | Passed: 212 files, 2,954 tests on Node v26.13.1. Existing ZXing/Canvas diagnostic output was emitted; the test command exited successfully. |
| `npm run lint`                   | Passed on Node v26.13.1.                                                                                                                    |
| `npm run format:check`           | Passed on Node v26.13.1.                                                                                                                    |
| `npm run build`                  | Passed on Node v26.13.1; Next.js 16.4.6 compiled, type-checked and generated all 159 static pages.                                          |
| Existing Playwright discovery    | 285 cases listed across Chromium, Firefox, WebKit, Pixel 7 Chromium and iPhone 13 WebKit projects. Discovery is not execution.              |

### Actual browser attempt — blocked before any app route executed

Attempted `npx playwright install chromium firefox webkit`. Playwright 1.64.1 tried to retrieve Chromium 156.0.8078.4 (`playwright chromium v1248`) from `https://cdn.playwright.dev/builds/cft/156.0.8078.4/linux64/chrome-linux64.zip`. The connection failed before TLS establishment with `ECONNRESET` (`Client network socket disconnected before secure TLS connection was established`). The CDN is outside this sandbox's allowed outbound hosts. No Chromium/Firefox/WebKit binaries were installed.

Then ran the actual test runner across all five configured projects for `/tools/word-counter` (`--workers=1 --retries=0`). It reported **5 launch failures, 0 browser tests executed** because executables were absent:

- Chromium/Android Chromium: missing `/home/user/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell`.
- Firefox: missing `/home/user/.cache/ms-playwright/firefox-1555/firefox/firefox`.
- WebKit/iPhone WebKit: missing `/home/user/.cache/ms-playwright/webkit-2370/pw_run.sh`.

Playwright's pinned browser manifest expects Chrome for Testing / Chromium `156.0.8078.4`, Firefox `157.0`, and WebKit `27.2`; none of those binaries were installed, so these are expected versions, not tested browser versions. These are infrastructure launch failures, not application test failures. No tool route was opened in a browser, no route interaction passed or failed, and no screenshots were captured. Full Playwright e2e, file upload/download, browser console/network inspection, processing durations, browser performance, and physical-device checks remain **NOT TESTED**. Existing unit tests are not substitutes for these workflows.

### Reproducible commands for a normal supported runner

The repository's `.github/workflows/ci.yml` already provisions Node 26 and installs Playwright browsers on Ubuntu. On a compatible Linux runner with outbound access to Playwright's browser download hosts and permission to install OS packages, run:

```sh
npx playwright install --with-deps chromium firefox webkit
npx playwright test tests/e2e/production-readiness.spec.ts --project=chromium --project=firefox --project=webkit --project=android-chromium --project=mobile-webkit
npm run test:e2e
```

Then review saved screenshots/traces under `test-results/`. Test the five project browser versions reported by the runner at execution time; this sandbox could not report browser versions because no engines installed. Real Samsung Internet, iPhone Safari, Android Firefox and Edge still require device/manual checks.

### Current disposition and Git

- **CONFIRMED FIXED:** automated coverage gap in Playwright configuration (all catalog routes and required width list are now represented in the added suite/config). This only fixes test coverage, not a product runtime defect.
- **TESTED AND PASSED:** all Node 26 quality gates listed above.
- **FAILED / BLOCKED:** browser installation from `cdn.playwright.dev` with TLS `ECONNRESET`; five smoke invocations fail before browser launch due to missing executables.
- **NOT TESTED:** application browser workflows, file processing/downloads, browser-wise behavior, screenshots, and measured before/after performance.
- At that earlier checkpoint, branch was `arena/ce25846a-quickkit` at `78439ff0583e714614effc0ee2a31b871fa63c7e`. The follow-up below supersedes the prior uncommitted status.

## GitHub Actions follow-up — hosted browser verification and PR trigger

Inspected `.github/workflows/ci.yml` and GitHub Actions on 18 November 2026. No workflow change is needed: `Verify QUICKKIT` uses Node 26, executes `npx playwright install --with-deps chromium firefox webkit`, runs focused cross-browser regressions, then invokes `npm run test:e2e`. Its `pull_request` event covers a feature branch PR to `main`; its `push` event is restricted to `main`. There is no `workflow_dispatch` trigger. Therefore pushing this feature branch alone will **not** start CI; push the branch and open a PR to `main` to trigger it.

The latest successful baseline run is [Actions run 44319857493](https://github.com/sachi26698-LIMA/Quickkit/actions/runs/44319857493), on `main` at exactly `78439ff0583e714614effc0ee2a31b871fa63c7e` (the starting commit for this branch). Its completed `verify` job confirms that GitHub-hosted Ubuntu **did install Chromium, Firefox and WebKit** and ran the existing browser suites:

- Browser install step: **success** (`npx playwright install --with-deps chromium firefox webkit`).
- Focused cancellation coverage: **3 passed** across Firefox/WebKit, repeated twice.
- Focused PDF preview coverage: **8 passed** across Chromium/Firefox/WebKit.
- Full `npm run test:e2e`: **success**, Playwright reporter summary **1,146 passed, 7 skipped in 36.5 minutes**. Overall CI job: success in 45m22s.
- Screenshots artifact uploaded successfully (`browser-screenshots`, 158,118,412 bytes).

This is real hosted-browser evidence for the **baseline commit and existing three-desktop-project configuration**, not evidence for this branch's pending five-project config or newly added tests. GitHub's run summary does not expose per-project pass counts or actual browser patch versions. Its annotations/log URL did not provide raw logs in this sandbox, so do not infer version-specific or per-project totals beyond the reported focused tests and global result.

### Current local changes prepared for the next PR run

- `playwright.config.ts`: retains all prior projects; Firefox/WebKit include readiness coverage. Pixel 7 Chromium and iPhone 13 WebKit projects now run readiness routes plus representative core, browser-tools (QR/image upload, processing and download), and PDF Merger interactions.
- `tests/e2e/production-readiness.spec.ts`: now asserts the canonical count is 56; runs every route in each configured project; checks JS/console errors, failed requests and HTTP responses >=400, failed assets, visible route structure and horizontal overflow; runs five shared surfaces at all 11 requested widths and writes mobile screenshots to Playwright output.
- `docs/PRODUCTION_READINESS_AUDIT_2026-11-18.md`: retains earlier evidence and this continuation.

Current Playwright discovery for the readiness file: **290 listed cases** across five configured projects, including browser-tool and PDF Merger interactions on the mobile emulation projects. Discovery is not execution. The modified five-project suite has **not run successfully yet**; the local browser CDN is blocked. The next PR-run is the first valid pass/fail evidence for these pending changes.

### Verification and commit preparation

After the latest config/spec edits, Node 26.13.1 `npm run typecheck`, `npm run lint`, focused Prettier check, Playwright `--list`, and `git diff --check` passed. The most recent full unit/build checks (after clean Node 26 `npm ci`) also passed as listed above. No product implementation or workflow file was changed; no production, Supabase, SEO, DNS, SMTP, or runtime setting was modified.

Proposed commit message: `test(e2e): add cross-browser production-readiness coverage`.

Proposed local commit: `test(e2e): add cross-browser production-readiness coverage` (three files listed in the delivery report). The commit SHA is supplied in the session delivery after local commit creation. Do **not** regard the commit as browser-test sign-off; the PR CI run must pass before product readiness can be assessed. Do not push, merge or deploy until explicitly requested.

## PR #69 first hosted browser run — 18 November 2026

This section supersedes the earlier statement that the five-project tests had not yet run. PR #69 (`https://github.com/sachi26698-LIMA/Quickkit/pull/69`) ran Actions workflow `Verify QUICKKIT` as run [44334899901](https://github.com/sachi26698-LIMA/Quickkit/actions/runs/44334899901), on SHA `6cce15cf0f19806920497f26e1f33a0777c3cb95`. The job completed as **failure** after 1h04m26s. Node 26 setup, install, format, lint, unit tests, build, typecheck, audit, Playwright browser installation, and both focused Playwright commands succeeded. Browser installation (`chromium firefox webkit`) succeeded on the hosted runner, and the full `npm run test:e2e` ran to completion in 33.9m.

Playwright reporter totals for the full run: **1,461 passed; 5 failed; 1 flaky (passed on retry); 8 skipped**. These are executed outcomes, not discovery. The five final failures were precisely the one `shared layouts fit every required responsive width` aggregate test in each project: Chromium, Firefox, WebKit, Android-sized Chromium (Pixel 7), and iPhone-sized WebKit (iPhone 13). The stack points to `page.goto(..., waitUntil: "networkidle")` within its serial 11-width × 5-route loop timing out at the default 30s test limit. The all-route test cases were not listed among the failures; catalog-derived 56-route coverage executed in all five projects (280 route cases) without a reported failure. The spec's 5 catalog-count assertions also passed. Thus the failing checks are a **test design timeout**, not evidence of product route/layout defects; the loop was waiting for network quiescence even though its assertions only need document readiness and layout geometry.

Confirmed test-only correction now made in `tests/e2e/production-readiness.spec.ts`: keep every width/route assertion, await `domcontentloaded` for the repeated responsive navigations, and set a 90s budget for the 55-navigation aggregate test. The all-route browser/network checks continue to use `networkidle`. No product code or assertions were relaxed.

The run reported one additional **flaky, retry-recovered** existing Chromium test `V3 worker ZIP has real progress, cancellation, retry, custom names and unchanged PDF bytes`: first attempt produced `quickkit-pdfs.zip` where the assertion expected `custom review.zip`; retry passed. The test inputs the filename then downloads; the app sets that React state directly. Since it passed on retry and was not a final failure, no product fix is justified yet. The failure trace artifact is available on GitHub, but downloading the 312 MB artifact/log archive from Actions result storage failed in this sandbox with EOF; no trace-level root cause was confirmed. Recheck this existing flake in the next full run and only change the test or product if a reproducible cause is established.

The five-project route suite actually executed. Browser-specific executed pass totals are **not available from the aggregate reporter summary retrieved here**; the run does establish one responsive-test failure in each named project and no route-case failures. The Actions archive download attempt failed with EOF; do not infer per-project pass totals from 290-case discovery.

### Vercel Preview

Vercel's PR check is **SUCCESS**, and the preview deployment for PR #69/SHA `6cce15cf0f19806920497f26e1f33a0777c3cb95` is `READY` (staged preview, not production): `https://quickkit-git-arena-ce25846a-quickkit-sachi26698-6758s-projects.vercel.app`. Deployment build events show Node 26, successful `npm ci`, successful Next.js build and all 159 static pages generated. Build logs included warnings for the deprecated ESLint package, an npm config key, install scripts not covered by allowScripts, and 16 high npm audit findings. These did not block the preview build; this test-only change did not alter dependencies or environment settings. Browser E2E in Actions targeted its local Next server (`127.0.0.1:3001`), not the deployed Vercel URL; direct preview interaction was not confirmed here. Supabase Preview check was skipped. No production deployment, Supabase, or data change occurred.

### Follow-up checks

After the test-only correction: Node 26.13.1 typecheck, lint, Prettier, and `git diff --check` passed. Unit tests passed (**212 files / 2,954 tests**) and `npm run build` passed, producing 159 static pages. Playwright listing still shows 290 discovered cases, but the corrected browser test has **not yet executed**. Local browser binaries remain unavailable and the prior CDN download is blocked. The correction is being committed and pushed to this same PR branch to trigger a full Actions rerun. Do not merge PR #69 or deploy to production; await and review the new Actions result first.
