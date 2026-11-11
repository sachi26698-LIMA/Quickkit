# QUICKKIT Master Project Roadmap

**Source of truth:** current repository, tests, `PHASE_5_FINAL_REPORT.md`, `PHASE_6_FINAL_REPORT.md`, `PHASE_7_FINAL_REPORT.md`, `PHASE_8_FINAL_REPORT.md`, `PHASE_9_FINAL_REPORT.md`, `PHASE_10_FINAL_REPORT.md`, `PHASE_11_FINAL_REPORT.md`, `PHASE_12_FINAL_REPORT.md`, and `MULTIPLE_TOOLS_ROADMAP.md`. Counts below are repository-derived; no roadmap feature should be recreated if it already exists.

## Product inventory

- App Router / TypeScript / Next.js; package and `.nvmrc` target Node 26.x.
- 42 published tool catalog entries, 7 categories with published tools, plus an eighth AI Tools category explicitly marked Coming Soon.
- The current tool catalog already contains the Phase 6 image suite, Phase 7 text/OCR tools, Phase 8 developer tools, Phase 9 calculator/converter suite, Phase 10 QR generator and scanner, and Phase 11 security/privacy capability.
- There is no Barcode Generator route/tool. QR Scanner can interpret some barcode-like text but is not a barcode-generation product. Do not imply otherwise.
- AI category has no working AI tool, external model integration, API key, or approved paid provider. Preserve its Coming Soon status until a real integration has an approved privacy/cost/security design.

## Phase status and gates

| Phase      | Roadmap scope                                                                              | Status                                                   | What remains to call fully accepted                                                                                                                                                                                                                    |
| ---------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 5          | Production readiness, SEO, security, performance, launch preparation                       | **NEEDS ATTENTION**                                      | Node 26, unit/build/audits/routes pass; browser E2E, real-device accessibility/performance, owner/legal/domain/hosting review and full license clearance remain. Report: `PHASE_5_FINAL_REPORT.md`.                                                    |
| 6          | Image compressor, resizer, cropper, image format converter                                 | **PARTIAL — audit/tests pass; browser blocked**          | 12 files / 397 targeted tests pass; real browser decode/export/download, mobile accessibility/performance workflows not run. Report: `PHASE_6_FINAL_REPORT.md`.                                                                                        |
| 7          | Word Counter, Case Converter, Image-to-Text/OCR                                            | **PARTIAL — implementation/tests pass; browser blocked** | 9 files / 177 tests pass; actual OCR fixtures and limits reviewed. Browser input/edit/export/accessibility checks remain unrun. Report: `PHASE_7_FINAL_REPORT.md`.                                                                                     |
| 8          | Existing developer utilities                                                               | **PARTIAL — implementation/tests pass; browser blocked** | 4 files / 88 tests pass, covering vectors, parsers, Unicode, non-execution, regex bounds and catalog. Browser keyboard/copy/download/accessibility flows remain unrun. Report: `PHASE_8_FINAL_REPORT.md`.                                              |
| 9          | 12 calculators and converters                                                              | **PARTIAL — tests/source review pass; browser blocked**  | 14 files / 65 tests pass across formula, numerical boundaries, loans, conversions, dates/time zones and BMI age messaging. Browser/device and independent domain validation remain. Report: `PHASE_9_FINAL_REPORT.md`.                                 |
| 10         | QR Generator and QR Scanner; optional barcode work only if separately implemented/approved | **PARTIAL — tests/source review pass; camera blocked**   | 18 files / 426 QR tests pass across payload, render/export, scanner decode/worker and security. Browser/device camera and accessibility checks remain open. No barcode generator exists. Report: `PHASE_10_FINAL_REPORT.md`.                           |
| 11         | Password generation and privacy/security claims                                            | **PARTIAL — secure RNG/tests pass; browser blocked**     | 2 files / 51 tests pass; source uses Web Crypto rejection sampling without insecure fallback. Browser network/storage/privacy instrumentation and product-wide data-flow audit remain. Report: `PHASE_11_FINAL_REPORT.md`.                             |
| 12         | AI category audit/integration decision                                                     | **No live AI tool; safely deferred**                     | Keep Coming Soon. No API credentials, provider approval, paid budget, rate-limit service, or consented external-processing model is configured. Do not fake an AI implementation. Report: `PHASE_12_FINAL_REPORT.md`.                                  |
| Integrated | Global navigation, SEO, accessibility, performance, security, legal/trust, final report    | **NOT READY FOR LAUNCH**                                 | 104 files / 1,737 serial tests pass; typecheck, lint, format, build (76 static pages) and npm audits (0 vulnerabilities) pass. Browser/device, accessibility, performance, owner/legal/license/hosting approval remain. See `FINAL_PROJECT_REPORT.md`. |

## Non-negotiable execution rules

- Preserve QUICKKIT branding, the approved homepage/hero and light theme, working URLs/tools/calculations/QR design, and existing local-first/privacy guarantees.
- Do not activate ads, production indexing, paid services, API credentials, domain/hosting settings, or deployments.
- Do not claim browser, accessibility, performance, licensing, privacy, security, or launch acceptance without evidence.
- Keep AI Tools visibly Coming Soon until real, approved processing exists.
- Work only on the active branch. Local commits/checkpoints are permitted; push, PR, merge, deployment and purchases are not authorized.
