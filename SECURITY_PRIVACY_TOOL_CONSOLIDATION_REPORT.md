# Security & Privacy tool consolidation report

### Latest verification and additional local work

Password strength now flags repeated multi-character segments; hash comparison provides length and trusted-reference caveats without disclosing inputs. Full Vitest after these additions: **1,889 passed / 124 files**; production build, typecheck, lint and formatting passed. Targeted production Chromium Security suites: **69 passed**. The clean full Chromium run of **987 passed / 3 screenshot skips** below used the immediately preceding build; all skips passed separately when enabled. It was not rerun after these two changes. External DNS/IP responses remain unverified, and live TLS remains unsupported.

## Deep-upgrade checkpoint

`SECURITY_PRIVACY_OPERATION_CHECKLIST.md` accounts for all **9 workbenches / 60 operation tabs** and gives per-operation functionality and limitations, plus the unsupported live TLS capability. The registry and checklist were cross-checked. This is a partial upgrade, not a claim that every operation has advanced settings, batch support or complete acceptance.

New work: locally bounded 25-entry URL review batch with independent errors and download; request-header risk analysis without credential values; SPF/DMARC static validation with clearer lookup-budget caveats. Focused unit and actual Chromium UI tests passed. Full Vitest first run had one intermittent unrelated QR timeout; complete retry **1,887 passed**, not proof the flake is fixed. Production build, typecheck, lint and formatting passed. Three prior screenshot skips ran separately; a missing Images-to-PDF test navigation was fixed and all three passed. Full current Chromium regression: **987 passed, 3 screenshot tests skipped / 990**; all three skipped tests passed in a separate opt-in capture run. The `docs/` screenshots were restored. Live TLS, independent DNSSEC verification and actual external provider tests remain blocked/incomplete, as detailed below and in the checklist.


Status: consolidation implemented; the final advanced upgrade remains **partial**, with new work and verification recorded below. This is not a security audit.

## Counts and scope

- Original: **60 Security & Privacy category routes**, comprising 57 dedicated security workspaces and 3 shared password, hash and Base64 routes. The 72-capability inventory contains overlaps, not 72 distinct routes.
- Current: **9 unified Security & Privacy category routes**, comprising 2 upgraded existing routes (password and hash) and 7 new workbench routes. The Base64 Developer Tool remains separately available at its existing URL and is also an operation in the cryptography workbench, so there are **10 functional URLs** counting that cross-category exception. The 57 former dedicated URLs remain redirects, not additional catalog entries. Catalog has 49 unique routes total.
- Existing operation modules and processors are reused, not replaced by placeholders; no modules were deleted. The standalone Base64 exception protects Developer Tools users and bookmarks. Password and hash URLs remain canonical and gain tabs; their existing Developer/SEO usage remains.

## Merging map

In the table, each old slug names the actual reused operation. The old 72-capability inventory (including overlaps and precise limitations) remains in `SECURITY_PRIVACY_TOOL_INVENTORY.md` as a historical pre-consolidation audit; `SECURITY_PRIVACY_CONSOLIDATION_PLAN.md` is the complete pre-change assignment.

| Unified route | Existing operations assigned (old slugs; `*` is an existing cross-category/shared route) |
|---|---|
| `password-generator` | password-generator*, password-strength-checker, passphrase-generator, password-entropy-calculator, password-policy-generator, secure-random-string-generator |
| `hash-generator` | hash-generator*, hash-comparison, file-privacy-checker (signature and metadata hints) |
| `advanced-cryptography` | text-encryption, file-encryption, encryption-key-generator, rsa-cryptography, hmac-generator-verifier, jwt-decoder, jwt-generator, base64url-converter, base64-encoder-decoder* |
| `dns-email-security` | dns-lookup, dnssec-status-checker, email-header-analyzer, spf-record-checker, dkim-configuration-checker, dmarc-record-checker |
| `website-security-review` | security-headers-analyzer, csp-generator, csp-analyzer, certificate-inspector, cookie-security-analyzer, hsts-checker, permissions-policy-generator, referrer-policy-generator, x-frame-options-checker, robots-security-review, security-txt-generator, website-privacy-config-review |
| `privacy-metadata-manager` | image-metadata-inspector, image-metadata-remover, pdf-metadata-viewer, document-metadata-inspector, sensitive-information-detector, personal-information-masker, text-redaction |
| `url-network-privacy` | url-safety-review, public-ip-information, browser-privacy-checker, browser-permission-checker, third-party-cookie-information, tracking-protection-guide, fingerprinting-education, privacy-settings-checklist |
| `privacy-policy-workbench` | privacy-policy-generator, cookie-policy-generator, gdpr-checklist, data-retention-policy-generator, consent-notice-generator, data-processing-agreement-generator |
| `api-credential-tools` | api-key-format-validator, api-request-header-analyzer, bearer-token-formatter |

For all 57 formerly dedicated slugs, `/tools/<old-slug>` returns a permanent redirect to the table's unified route with `?operation=<old-slug>`. The full machine-readable mapping is `legacySecurityRedirects` in `lib/tools/security/consolidation.ts`; tests assert that every original dedicated slug is present exactly once and that its destination selects the corresponding tab. Password and hash keep their original URLs as their unified route; `/tools/base64-encoder-decoder` stays a separate shared Developer Tool instead of redirecting.

## Interface and preservation

Every unified page has keyboard-operable operation tabs and local, independently mounted forms. The URL contains only the operation identifier, never user inputs; history back/forward restores the selected tab. Switching tabs unmounts the old form and clears its inputs/results rather than persisting secrets. Users must copy/download any result before switching. Existing copy, downloads, uploads, advanced controls and batch capabilities remain in the underlying tools where supported; no blanket claim that every mode provides each feature or batch processing. Server-rendered pages wait for hydration before exposing the selected operation, preventing a bookmarked form from being replaced after user input.

Catalog counts, search keywords, precise old-operation search links, canonical sitemap membership, route metadata and old-slug favorites migration were updated. Old favorites for operations in the same workbench deduplicate to the unified page, not to a particular operation; this loses per-operation favorite specificity. Base64 remains individually favoritable. No general site-wide recently-used-tools registry was found; unrelated tool-specific histories are unchanged.

DNS/IP requests remain consent-gated and limited to existing fixed providers. The two network workbenches receive only their required route-scoped CSP hosts. No arbitrary URL fetch or server proxy was introduced. Offline reports are not live scans.

## Verification

- Full Vitest: **124 files / 1,877 tests passed** under Node 26.13.0; production build, TypeScript, ESLint and Prettier passed. `npm audit --audit-level=moderate`: 0 vulnerabilities.
- Local-production Chromium: **65 targeted security, redirects, catalog and hashing tests passed**. Tests exercise real processing, 57 redirected URLs and selected tabs, all 60 assigned operation tabs, tab keyboard/history behavior, favorites migration, search, AES and PDF/image uploads/downloads, checksum batches, clipboard, five hash algorithms and JWT/certificate workflows. DNS/IP responses were mocked. Separately the consolidated suite **5/5 passed**, including automated axe checks and 375 px overflow checks on all nine initial workbench views; not every tab was separately axe-audited.
- Test failures during development: an initial PDF browser test exposed a pre-hydration form replacement race; the workspace now waits for hydration. A 375 px file input overflow was corrected. The full unit suite initially found missing glyph mappings and too-short metadata descriptions; both were fixed and full suite passed.
- Full production Chromium suite: **963 passed, 9 failed, 3 skipped / 975** using four workers. All nine failed cases passed without code or test changes on a one-worker retry; the retry selected 20 cases because one test location represents 12 parameterized cases. The initial suite remains a failed run, not a clean single-pass success. Failures were in developer-tools copy/download (timeout), discount/image/percentage responsive checks, legal keyboard/axe, time-converter evidence, premium axe, QR recognition and Word-to-PDF synchronization. Logs in this sandbox are `/tmp/qk-consolidation-full-e2e.log` and `/tmp/qk-consolidation-retry.log`. The `docs/` screenshot evidence was restored from the pre-run archive. Chromium 153 and locally compiled NSS/NSPR are used instead of the Playwright-pinned browser; Firefox and WebKit have not been run.

## Remaining limitations at consolidation checkpoint

- Live HTTPS/TLS scanning was not implemented, and RSA digital-signature **generation** was not previously present (RSA verification is available). The offline PEM inspector does not verify live connections, trust chains or revocation. No placeholder claims otherwise.
- DNS/IP live endpoints and CORS were not verified because sandbox egress disallows the external providers; DNSSEC is a resolver-reported AD flag, not independent validation. Email authentication headers and static records do not prove message authenticity.
- PDF cleaning is limited and may leave sensitive material or invalidate signatures; metadata/file-signature/PII/URL review is incomplete. Legal drafts require qualified review. Batch/copy/export features are preserved only in operations that already implemented them; there is no universal batch pipeline or full security audit.
- Automated responsive and accessibility checks cover the specified views, not every browser, operation state, or assistive technology. Full completion of the user's broad "zero duplicate functionality" and every requested advanced feature is not claimed: standalone cross-category Base64 remains for compatibility and several requested features were absent before consolidation.

No push, merge or deployment was performed.


## Advanced-upgrade checkpoint (current)

This section supersedes the earlier statement that RSA signature generation was unavailable. It is not a claim that every operation received a complete advanced upgrade.

- **Advanced cryptography:** RS256 signing and separately generated 2048/3072-bit signing/verification JWK pairs now use browser Web Crypto. Encryption and signing key usages are separated; invalid or inappropriate keys are rejected and private input remains masked. Node crypto independently verified browser signatures and Web Crypto verified Node signatures; modified messages and oversized input were tested. Private keys are sensitive, unencrypted JWKs and must be protected.
- **DNS/email security:** opt-in DNS batching handles up to 10 validated, distinct public names sequentially with per-query failures, bounded replies and cancellation on unmount. A fresh explicit consent is required when enabling batching or changing lookup modes. All input is validated before the first request, results can be copied/downloaded, and no query is sent until consent. These are requests to the existing fixed public resolver, not a server-side arbitrary fetch. Browser and unit network tests used **mock responses**.
- **Website security:** pasted-header review now supplies prioritized, actionable static findings for absent or ambiguous headers and report-only CSP, avoiding cookie/authorization values. It is partial static analysis, not a live site audit or a guarantee.
- **Privacy/metadata:** DOCX inspection now reports shallow package-name indicators for comments, custom properties, embedded objects, external-link parts and VBA, without reading those parts. Absence is not proof that sensitive data or macros are absent; revisions and relationships remain uninspected. Existing PDF-cleaning limitations remain.
- **Other workbenches:** prior implementations and checks are retained; password, hash/file integrity, URL/network privacy, privacy/legal and API-credential operations did not all receive new advanced features in this checkpoint. There is no blanket per-operation batch support or verified universal professional report.

### Current verification

- Full Vitest retry, without concurrent production build: **124 files / 1,884 tests passed**. The first run, concurrent with the build, had **1,883 passed / 1 timed out** in an unrelated QR history test; it was not a clean pass and no assertion was changed. The clean retry passed the complete suite.
- Node 26.13.0 production build, TypeScript, ESLint, Prettier and `npm audit --audit-level=moderate`: **passed**, audit reported **0 vulnerabilities**.
- Production Chromium targeted suites: **66 passed** in one worker, including all legacy redirects, operation navigation, signing interoperability, consent-gated DNS batch and download, real file/crypto workflows and 375 px/axe checks of initial workbench views. DNS/IP results were mocked. These checks do not establish actual external-service availability or cover every operation state at every viewport.
- Full production Chromium regression with two workers: **973 passed, 1 failed, 3 skipped / 977** in 32.3 minutes. The only failure was the legal accessibility test: twelve page navigations, axe scans and keyboard journeys shared a single 30-second test timeout. It was split into twelve independently timed tests, retaining all axe, focus and link assertions; the complete legal file then passed **18/18**. This was a targeted rerun, not a clean full-suite rerun after the change. Screenshots in `docs/` were restored from the pre-run archive. The eight other failures from the previous full run passed in this two-worker run; their root causes are not necessarily fixed. The QR recognition failure previously retained the preceding badge while waiting, and Word-to-PDF export remained disabled until timeout. No assertions were removed or weakened.

### Still blocked or incomplete

- A live HTTPS/TLS service has **not** been added. Safe deployment requires a reviewed architecture that pins validated DNS results at connection time, rejects non-public IPv4/IPv6 and rebinding, revalidates redirects, limits responses/time/concurrency, and provides reliable shared rate/abuse controls. No existing shared rate-limit infrastructure was identified in this checkout. An unrestricted fetch proxy would expose users and infrastructure to SSRF; offline PEM inspection remains explicitly offline and does not verify trust/revocation or a live endpoint.
- Live Cloudflare DNS and ipify checks from this sandbox failed TLS connection (`SSL_ERROR_SYSCALL`) because those hosts are outside the permitted outbound network. Their CORS/actual availability were not verified here; no fake success was substituted. DNSSEC is still the resolver-reported AD flag, not independent validation; SPF/DKIM/DMARC record reviews do not authenticate a message or fully evaluate policy/alignment.
- Every requested feature, operation-specific advanced setting, report and cross-browser/mobile state has not been implemented or tested. Complete secure live scanning and real-world provider checks require owner-approved infrastructure and a permitted network environment. The earlier non-legal Chromium flakes are not claimed fixed.

No push, merge, production setting change or deployment was performed.
