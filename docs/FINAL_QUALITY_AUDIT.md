# Final quality audit — 31 October 2026

> **Superseded in part:** the Phase 1 foundation rebuild (`PHASE_1_FOUNDATION.md`)
> replaced the styling layer, header/footer, homepage, cards and tool-page shell.
> Audit conclusions about logic, security headers, tool behaviour and the
> indexing gate still apply; the visual/CSS and homepage-count specifics in this
> file describe the previous design.

## Scope and limits

Reviewed tracked application/routes, client components, tool logic, discovery/navigation, styles, metadata/launch logic, headers, legal/content pages, dependency graph, package/TypeScript/lint/test/CI configuration and repository hygiene. Original commits and user uploads were preserved. This is source review plus automated/manual local verification, not a penetration test, legal opinion, complete accessibility certification or actual hosted-launch acceptance.

## Findings and implemented fixes

| Finding | Fix | Verification |
|---|---|---|
| Full audit reports 16 inherited moderate entries | Identified one GHSA; scoped parser minimatch 10.2.6 → 11.0.3; preserved v3 API for older consumers | 80 pre-upgrade compatibility cases, real parser project-service path, clean install, lint, tests/build. Raw audit now 15, not zero; see security review. |
| `SITE_URL` alone enabled indexing before owner/legal approval | Added server-only `LAUNCH_APPROVED=true` opt-in; Vercel Preview/Development always blocked; shared metadata/robots/sitemap/header gate | Unit matrix + sitemap/robots approval tests, browser checks for noindex metadata/header, disallow robots and empty sitemap |
| Image dimensions were checked after browser decode/preview | Bounded JPEG/PNG/WebP file-header preflight before preview selection and processing, with MIME/signature/dimension checks | 11 header tests, real three-format inputs, oversize-dimension pre-preview rejection, three-browser downloads/pixel checks |
| JSON overflow (e.g. `1e400`) could silently stringify as null | Reject non-finite parsed numbers with an actionable error | Regression unit test; large/deep/invalid JSON coverage retained |
| Word Counter could retain “Copied” feedback for edited input | Reset copy component state when text changes | Actual clipboard readback followed by changed-input assertion |
| 320px hero heading wrapped the emphasized phrase across two extra lines | Refined fluid mobile heading minimum to 34px | Updated 320px screenshot and responsive regression |
| Small mobile form text could trigger iOS focus zoom | Minimum 16px editable text/search/select sizing on small screens | Responsive tests and 320px screenshot review; real physical iOS test remains owner acceptance |
| Node range/CI could select an unverified or obsolete major | Pin project engines, `.nvmrc` and CI to Node 22 | Node 22.23.4 clean npm ci, lint, tests, build and type-check passed; provider docs confirm Node 22 support |
| npm initializer assigned ISC without an owner licence decision | Retain private package and use UNLICENSED pending owner choice | Owner-input checklist explicitly records licensing decision; no new open-source grant made |
| Vercel local metadata/credentials directory not ignored | Ignore `.vercel/`, common private key files and OS metadata | Repository/ignore inspection; no tracked .env, key or node_modules files found |

Header checks limit pixel allocation from supported header dimensions; they are not a substitute for browser decoder security or a full forensic image validator. A corrupt payload with a structurally readable header can still fail browser decoding; compression catches that failure. File byte size and decoded dimension bounds remain enforced.

## Verification results

Environment: Node **22.23.4**, Next.js 16.4.3, React 19.3.1, npm lockfile. Tests target the optimized production build on port 3001.

- Clean `npm ci`: passed with the scoped override preserved.
- Formatting + ESLint: passed.
- Strict type-check: passed.
- Production build: passed.
- Unit/component/config/compatibility tests: **70 passed**.
- Browser tests: **123 passed, 2 explicitly skipped** of 125 defined. The extra real clipboard-readback test is Chromium-only because this runner’s permission support differs; Firefox/WebKit still run all six tool workflows and the unavailable-clipboard fallback. All original test scenarios remain covered.
- Accessibility/console: automated WCAG A/AA scans on all ten initial pages pass; no introduced page/console errors in those checks.
- Populated workspaces: ten additional 320px/1440px result-state axe/overflow checks passed (Word, Case, JSON, Password, QR); reduced-motion scroll behavior verified. A standalone axe helper first required an explicit browser context; corrected and rerun.
- Responsive: ten routes at seven widths (320, 375, 390, 430, 768, 1366, 1440) have no horizontal overflow.
- Files: QR PNG downloaded and independently decoded to the original Unicode content; actual WebP/JPEG/PNG downloads checked for type, unchanged dimensions, alpha preservation and JPEG white fill. JPEG and WebP inputs also exercise real header formats.
- Resource lifecycle: reset during delayed image encoding discards stale results and leaves zero active object URLs in all three automated engines.
- Clipboard: Word/Case/JSON/Password success checked by real Chromium readback; denied/unavailable fallback checked separately.
- Security scan: no user-content HTML injection/eval, remote tool calls, user-input logging, Math.random password generation or persistent input storage found in application code. This is a scoped code review, not a guarantee of absolute security.
- Full npm audit: **15 moderate development-only residual entries**; production audit: **0**. No fake “all vulnerabilities fixed” claim.

## Failures during this audit and resolution

1. Refactoring image limits caused a missing `MAX_IMAGE_PIXELS` import: production type-check caught it; import fixed and build re-run successfully.
2. Old corrupt-image browser tests clicked Compress after the new preflight had already rejected and cleared the selection, replacing the decode error with the empty-selection error. Updated that scenario to assert immediate preflight rejection/no original preview; all three engines rechecked, then full suite passed. Validation was not removed or bypassed.
3. An auxiliary Markdown-report generator initially had a template-string quoting error; it was rewritten and generated the report successfully. No application functionality was affected.

## Remaining limitations / release gates

- See `docs/security/DEPENDENCY_REVIEW.md` for the reviewed residual v3 advisory metadata and required owner/security decision. No audit suppression was used.
- Operator/legal/contact/provider details are not supplied; legal pages remain visibly draft. See `docs/OWNER_INPUTS.md`.
- Need actual repository/team/domain choice, remote CI, returned deployment URL, domain verification and hosted smoke tests.
- Need physical mobile devices, current Edge/Safari, screen-reader/manual touch acceptance and deployed performance check. Do not reuse prior local Lighthouse scores as measured results for this deployment.
- CSP still permits framework inline scripts/styles for the static shell. A nonce-based policy would require a separate architecture/performance review. Framing restrictions need a deployment-specific choice because the Arena preview is embedded.
- Header/noindex rules are not authentication. Sensitive prelaunch content needs provider deployment protection.

Current release instructions: [`../RELEASE_CHECKLIST.md`](../RELEASE_CHECKLIST.md).

Final smoke check returned HTTP 200 for `/`, favicon, SVG icon, Apple icon, robots and sitemap; homepage includes `X-Robots-Tag: noindex, nofollow, noarchive`. Final formatting/build re-run passed after the expanded tests. Git whitespace check passed. A history-preserving bundle is supplied outside the repository and checked by an isolated clone; repository secrets/config are not part of the bundle.
