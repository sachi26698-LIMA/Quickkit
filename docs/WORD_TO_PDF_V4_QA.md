# Word to PDF V4 — verification and honest delivery status

4 November 2026. Branch `arena/15621ae8-quickkit`, baseline completed V3 `e8d6091`.

## Outcome

**Infrastructure implemented for review. Native validation BLOCKED; NOT production-ready/approved.** Existing V3 route/editor/shared PDF infrastructure preserved. No merge, push, deployment, unrelated tool modification or page-cap increase. No actual native demo exists in this delivery. The synthetic source DOCX files are inputs, not proof of conversion.

Exact blocker: this Debian 12 sandbox has no LibreOffice/soffice, fontconfig or Docker/Podman, and no approved cached native artifacts. Its outbound policy permits GitHub/npm/PyPI hosts, not Debian repositories or image registries/external binary stores. No prohibited download was attempted; this is not an observed apt network failure. Passwordless sudo and mount/user/network/PID namespace isolation **do work**, but the session lacks a delegated writable quota cgroup and the trusted runtime/package artifacts needed for a bounded native test. See [audit](WORD_TO_PDF_V4_AUDIT.md).

## Implemented

- Explicit server-only URL/token private-worker mode, HTTPS except IP loopback, bounded authenticated health/output, redirect rejection, abort/deadline propagation, no automatic retry/fallback. Invalid partial configuration fails closed.
- Full shared `prepareDocx` runs before forwarding. Native base goes through unchanged V3 `processPdf` and actual final preview/export pipeline, including the 100-page guard. Fake HTTP fixtures verify integration only.
- Standalone private broker: single active job across app replicas using that broker; typed native filter; Docker create-before-start; immutable local image; nonroot, read-only, network-none, dropped caps, no-new-privileges/default seccomp, CPU/RAM/swap/PID/FD/file/tmpfs limits; no document/secret mounts or container logs.
- Guarded image entrypoint checks effective isolation/resource settings and executes genuine LibreOffice. It is **not executed here**. Docker recipe requires review/build/scanning/native validation outside this sandbox.
- Client cancel/deadline force-removes daemon-owned containers, independently confirms absence before success, and quarantines ambiguous creation/cleanup/orphan reconciliation. CLI kill alone is never treated as cleanup. Inner timeout limits native lifetime after broker crash; real daemon/crash cases remain unverified.
- Local compatibility adapter gets a minimal environment with no inherited web secrets; readiness now executes a bounded `--version` probe rather than mere executable access. This adapter is still **not an OS sandbox** and requires external operator isolation.
- Synthetic complex + 100/500/1000 DOCX fixtures, honest raw private-worker benchmark/metrics protocol and operator setup/release-gate guide. Public app remains capped at 100; raw probes above cap are not browser support.

## Actual verification

| Check | Result / limits |
| --- | --- |
| Full Vitest suite, final source | **1057 PASS / 56 files**, 57.38 s; 36 additions vs V3's 1021 |
| New targeted transport/broker/fixture + local orchestration subset | **40 PASS / 3 files** = 23 V4 transport/fixture + 11 mocked broker + 6 local fake-executable tests; all explicitly non-fidelity evidence |
| TypeScript `tsc --noEmit` | PASS |
| ESLint | PASS |
| Production Next build | PASS |
| Final-build Word Chromium E2E | **17 PASS / 1.3 min**: original 4 + V2 4 + V3 7 + V4 unavailable-state 2 |
| Selected cross-tool Chromium regression | **39 PASS / 1.5 min**: core, browser-tools, Merger, Splitter, Compressor, PDF-to-Word; run before final local-health-only hardening; no other-tool source changes |
| Production dependency audit | `npm audit --omit=dev`: **0 vulnerabilities reported** at this run; not a container/native OS scan or security certification |
| Broker JS syntax / Python compile / synthetic PNG chunk CRCs | PASS; no Docker/LibreOffice execution implied; Python cache excluded/removed from final tree |
| Whitespace / changed-file review | `git diff --check` PASS; final exact inventory linked below |
| Genuine native fidelity, real container policy enforcement | **BLOCKED / not run** |
| Native 100/500/1000, native PDF.js preview/edit metrics | **BLOCKED / null**, no fabricated duration/RAM/CPU/output |
| Firefox/WebKit, manual screen reader, real-host escape/retention/daemon failure tests | NOT RUN in V4 |

Security coverage includes unsafe transport configuration/credentials/redirect statuses, full DOCX validation before forwarding, actual downstream page cap, bounded streamed PDF bytes, worker cancellation/no retry, auth-before-Docker, strict export filters/fixed policy, global broker admission, cancel before/after create, native deadline, sanitized child environments, orphan reconciliation and cleanup quarantine. These are mocks/policy/orchestration tests, **not real isolation penetration tests**. Existing DOCX ZIP bomb/active content/external relationship guards remain covered by the full suite. No embedded workbook/OLE rule was loosened.

The old V3 Splitter hydration race passed the new 39-case run; it was not “fixed” and this run does not erase V3's historical 47/48 result. V3 E2E regenerated archived mock PDFs/screenshots as a side effect; their exact pre-existing committed bytes were restored, preserving their manifest/history. No historical evidence was relabelled as native.

## Evidence / logs

- [Setup/deployment and release procedure](WORD_TO_PDF_V4_SETUP.md)
- [Fidelity checklist and unsupported embedded charts](WORD_TO_PDF_V4_FIDELITY.md)
- [Native benchmark status/metric definitions](WORD_TO_PDF_V4_BENCHMARK.md)
- [Exact changed-file inventory](WORD_TO_PDF_V4_CHANGED_FILES.md)
- `docs/word-to-pdf/v4/`: real desktop/mobile engine-unavailable screenshots, four synthetic source DOCX files, actual artifact hashes, blocked benchmark JSON and observed local app health. Selecting/checking consent in the screenshot tests emitted **zero upload POSTs**. Neither screenshot shows a successful conversion or actual native pages. Full-page screenshots retain existing fixed navigation/action positioning; no unrelated layout work was undertaken.
- Final logs in workspace `/home/user/Quickkit-v4-{unit-final,type-final,lint-final,build-final,word-e2e-final}.log`; selected wider run `/home/user/Quickkit-v4-wide-e2e.log`; dependency JSON `/home/user/Quickkit-v4-dependency-audit.json`; subset `/home/user/Quickkit-v4-targeted.log`.

## Open acceptance gates

Build/scan/pin the real image on an approved dedicated host; verify actual resource/egress/filesystem enforcement and broker service limits; install licensed fonts; execute every fidelity case against Word references; capture a genuine consented DOCX→PDF final preview/export demo; run native 100/500/1000 with resource metrics; measure actual native 100-page preview/edit/export in browser; exercise cancellation/timeout/OOM/daemon loss/host reboot/temp cleanup and secure TLS/logging/retention operations. Above-cap editing stays unsupported until a separate evidence-backed cap decision. V4 cannot be called complete/production-ready on the present evidence.
