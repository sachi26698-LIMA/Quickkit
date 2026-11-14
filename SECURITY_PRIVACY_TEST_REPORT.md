# Security & Privacy test report

### Latest verification after password and hash changes

- Full Node 26 Vitest: **124 files / 1,889 passed**. Production build, TypeScript, ESLint and Prettier passed.
- Production Chromium targeted Security suites: **69 passed**, including 57 redirects, all operation tabs, initial nine-workbench mobile/axe checks and password/hash changes. DNS/IP were mocked. The complete **987 passed / 3 screenshot skips** run below was against the immediately preceding build, before these two small password/hash changes, and was not repeated; the three screenshot cases passed in their separate opt-in run. Firefox and WebKit remain untested.
- The earlier QR history unit timeout remains intermittent and unexplained despite an isolated pass and clean full retries. No assertions were weakened.

## Current deep-upgrade verification

- Registry cross-check: **9 groups / 60 operations**, no missing checklist rows. Operation-by-operation scope and gaps: `SECURITY_PRIVACY_OPERATION_CHECKLIST.md`.
- Node 26.13.0 full Vitest: first run **1,886 passed / 1 timed out** in `qr-studio.test.tsx` history test; isolated retry passed, and complete retry **124 files / 1,887 tests passed**. The timeout recurs intermittently and its root cause is not established; a retry does not erase it.
- Production build, TypeScript, ESLint and Prettier passed after code changes. Existing earlier dependency audit reported 0 vulnerabilities; no new dependencies were added in this checkpoint.
- New targeted Chromium and screenshot run: **5 passed** after fixes. First run had 3 passed, 2 failed: a test locator ambiguously matched checkbox and textbox, and Images-to-PDF screenshot test lacked navigation. Corrected the locator with an exact name and added missing page navigation. All three prior screenshot skips passed with `CAPTURE_SHOTS=1`; their captures use Playwright output paths. No assertions weakened.
- Full production Chromium after current changes: **987 passed, 3 skipped / 990** in 32.2 minutes with two workers, including all 57 redirects and nine workbench flows. The three skips are the opt-in screenshot tests and passed separately as described above. `docs/` screenshots were restored from the pre-run archive. DNS/IP outputs in tests were mocked, not live. Firefox and WebKit were not verified. The clean Chromium run does not prove unrelated intermittent QR unit timeout is fixed.


2026-11-13 UTC · branch `arena/ca3f5bd0-quickkit` · Node 26.13.0

| Check | Status | Evidence |
|---|---|---|
| Full Vitest | PASS | 123 files / 1,873 tests on the latest full run (after the password-policy and Unicode-strength changes). |
| Production build | PASS | `npm run build`. |
| TypeScript, ESLint, Prettier | PASS | `npm run typecheck`, `npm run lint`, `npm run format:check`. |
| Dependency audit | PASS | `npm audit --audit-level=moderate`: 0 vulnerabilities. |
| Security-related routes | PASS (availability only) | 60 unique category routes each returned HTTP 200 and displayed an h1 in Chromium; smoke only, no claim of individual functional acceptance. |
| HMAC, RSA, signature verification | PASS (unit/jsdom) | `tests/security-hmac.test.ts`, `tests/security-rsa.test.ts`, `tests/security-rsa-ui.test.tsx`, `tests/security-workspace-ui.test.tsx`: actual Web Crypto operations, vectors, wrong keys and controls. |
| Hash batches, file-signature and policy/URL review | PASS (unit) | `tests/developer-tools.test.ts`, `tests/security-file-signature.test.ts`, `tests/security-url-review.test.ts`, `tests/security-advanced-review.test.ts`. |
| DNS/SPF/DKIM/DMARC | PASS (mocked resolver and local key tests) | `tests/security-network.test.ts`, `tests/security-network-ui.test.tsx` use mocked resolver responses. `tests/security-dkim-key.test.ts` imports generated RSA public keys and checks invalid inputs locally. No live external resolver or CORS verification, message-signature check, or key ownership verification. |
| Offline certificate DNS SAN comparison | PASS (unit + Chromium) | `tests/security-certificate.test.ts` exercises generated certificate, exact/wildcard/IDN and invalid input; generated-certificate and private-key rejection Chromium case also passes. No live server, trust, chain or signature validation. |
| Browser E2E | PARTIAL | Latest targeted production run: 54 security tests plus 2 reused password/Base64 tests passed (Chromium 153, not Playwright-pinned; network mocked). Latest full 965-test Chromium run: 951 passed, 11 failed, 3 skipped. All 11 failed cases passed in a serial retry (22 cases total because one line selects 12 parameterized tests). Four failures were trace/artifact ENOENT errors caused by an overlapping targeted run clearing Playwright output; the remaining failures were timeouts or timing-sensitive under load. No clean single full-suite run. The five dedicated hydration/security tests passed in targeted and full runs. Chromium 153 and locally compiled NSS/NSPR were used, not Playwright-pinned Chromium; Firefox/WebKit not run. |
| Homepage hydration and catalog | PASS (targeted Chromium + jsdom) | Homepage category card, navigation, category page and filtered explorer agree on 60; no captured hydration errors. 99 unique overall routes, 57 dedicated security workspaces + 3 reused category routes. |
| security.txt dates | PASS (unit) | Actual leap-year/calendar-day and timezone checks, invalid dates rejected; leap seconds intentionally unsupported. |
| Comprehensive individual tool/security review | INCOMPLETE | Automated coverage exists for many modes but not all requested acceptance scenarios; no production security audit. See inventory for per-tool evidence. |

No tests were deleted. The password E2E assertion was updated to require the accurate upper-bound label and explanatory warning, while retaining its remaining behavioral checks. Network behavior was not simulated as live. No deployment or production verification was performed.

Latest completion-phase targeted tests: certificate and workspace **2 files / 35 tests**; DKIM, network, review and workspace **4 files / 56 tests**. These overlap the full suite. These targeted results are from the preceding phase; browser E2E and route rendering were rerun in the current phase. **Zero live external checks were independently verified in this sandbox.** The 72 capability classifications remain 0 full, 67 limited, 4 externally blocked and 1 unimplemented.

The eight initially failing Chromium cases: developer tools copy/download (regex guard under load), discount responsive screenshots, image-to-image responsive layout, legal-page axe/keyboard, percentage responsive/axe, password entropy-label assertion, premium-tools axe, and QR recognition. Seven timed out or were timing-sensitive under four-worker load; each passed at one worker without changing timeout. The password assertion was corrected as described above. The three skipped screenshot-only cases were image-to-image, images-to-PDF, and PDF-to-image evidence captures. A successful retry does not erase the initial failures.

## Latest functional acceptance pass

- Production-build Chromium: **54 tests passed** across `security-functional-acceptance.spec.ts` and `security-privacy-upgrades.spec.ts`, plus **2 selected reused password/Base64 tests passed**. The 57 dedicated workspaces and 3 reused routes all had at least one processing scenario; this is not proof of full per-capability or cross-browser acceptance. Several routes share a test or implement multiple capabilities. DNS/IP responses were explicitly mocked.
- Actual browser checks include AES-GCM text/file round trips and wrong passwords, file upload/download byte comparison, SHA-256 batch/manifest and downloaded bytes, HMAC independently calculated tag and real clipboard, limited PDF cleanup with independently parsed downloaded PDF, PNG cleanup/download, generated certificate SAN, JWT valid/tampered/duplicate claims, and consent. Many sample-based routes also check reset and empty input.
- `security-aes-interoperability.test.ts`: Node PBKDF2/AES-GCM and Web Crypto interoperate in both directions; authenticated salt, IV, ciphertext and tag mutations are rejected. `security-hmac.test.ts` includes RFC 4231 case 1 for SHA-256, SHA-384 and SHA-512. JWT duplicate-key and network size/address tests pass.
- The preceding full Vitest run had **123 files / 1,868 tests**; the latest full run has 1,873 tests as stated above. Build, lint, format, typecheck and audit pass, 0 vulnerabilities. Latest security run used locally supplied Chromium 153 and locally compiled upstream NSS/NSPR; no real external DNS/IP checks, independent DNSSEC validation, Firefox or WebKit. The 914-case full-browser run described above belongs to the preceding phase. No tests removed or assertions weakened in this phase.

### Additional individual hash modes

`tests/e2e/security-hash-vectors.spec.ts`: **5/5 Chromium tests passed** against the current production build; each MD5, SHA-1, SHA-256, SHA-384 and SHA-512 mode was independently checked against Node for both Unicode text and uploaded file bytes, and both legacy warnings were checked. Added and run after the full suite started, so these five are not included in its count.

### Latest password changes

The policy workspace now optionally checks selected uppercase, lowercase, decimal digit and non-letter/non-number requirements locally, warns composition rules can reduce usability, and does not return the sample. The strength heuristic counts code points consistently and detects repeated supplementary characters. Unit/UI and a production Chromium test pass. The 54-test targeted Chromium count includes that new policy test. The separate two reused password/Base64 tests ran against the immediately preceding production build, before this policy-only change.

### Latest full Chromium run and retry

The fresh four-worker run executed 965 tests against the local production build: **951 passed, 11 failed, 3 skipped** in 31.0 minutes. Five new hash-vector cases were added after the run started and passed separately; they are not part of the 965. Running that separate Playwright invocation concurrently was a mistake: it cleared shared `test-results` artifacts, causing four full-run failures (`image-to-image` batch target, `images-to-pdf` rotation, legal pages, PDF compressor) with missing trace files. Seven other failures involved timeouts or timing-sensitive behavior (developer-tools regex guard, discount screenshot, image-to-image responsive screenshots, percentage screenshot/axe, time-converter evidence, premium axe, QR recognition). All eleven initially failed cases passed without test changes in a one-worker retry; 22 cases ran because the selected time-converter line covers 12 parameterized cases. This is not a clean single-pass full run or proof that timing-sensitive tests cannot fail. Screenshot evidence under `docs/` was restored from the pre-run backup without discarding pre-existing changes.
