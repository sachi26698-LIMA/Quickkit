# Word to PDF V5 — hosting audit and approval gate

4 November 2026. Started from V4 `7d760e8` on `arena/15621ae8-quickkit`; working tree was clean. No reset/reclone/branch switch, rebuild of the tool, production changes, merge or deployment.

## Phase 1: inspected, not deployed

- Repository contains `vercel.json` selecting Next.js with npm install/build/dev commands. It does **not** identify a deployed project, account, domain, plan, function limits or a dedicated native host. Configuration is not evidence of production hosting access.
- No hosting-provider or Word worker configuration environment variable names were present in this session's process environment. Values/secrets were not printed or copied. No connected production hosting service or approved worker endpoint has been supplied.
- Rechecked PATH: no Docker, Podman, LibreOffice or soffice. No Docker socket found at the standard rootful or this user's rootless location; no cached apt `.deb` archives found at the inspected location. Native execution remains unavailable locally.
- Session outbound allowlist still excludes Debian package repositories, container registries and arbitrary private-host endpoints. No prohibited download or remote deployment was attempted. Existing V4 audit records working namespaces/sudo but no delegated writable quota cgroup; this is not a claim that Linux isolation is impossible.
- Existing V4 `scripts/word-worker/Dockerfile`, guarded Python native entrypoint, fixed container policy, private authenticated broker and app transport already implement the intended genuine LibreOffice code path. They remain unbuilt/unexecuted here. Do not substitute a JS wrapper, mocked response or browser approximation for a native engine.
- Production provider credentials, machine access, actual host capacity, TLS/private routing, approved image provenance/fonts, body/response limits and duration limits require owner/operator verification. In particular, do not assume a Next.js/serverless deployment can itself host a Docker daemon or accept the configured 20 MiB documents/150-second request lifetime. Verify its real plan and limits or choose suitable Node/API hosting.

## Existing workspace capabilities to preserve

V3/V4 already include side-by-side approximate DOCX/native/final PDF comparison, PDF.js thumbnails/navigation/text search/zoom/fullscreen, individual settings, sequential batch conversion, real final-PDF/ZIP downloads, conversion reports and editing undo/redo/project state. Source inspection confirms undo history is not the same as a durable conversion-history feature. Future history improvements must explicitly specify metadata-only vs document persistence and obtain opt-in for persistence; no default permanent document storage. No capability has been rebuilt or removed in this audit.

## V5 work and evidence still required

1. Owner selects/approves an accessible private worker hosting target. Provisioning/deploying a host is a separate approval gate under the request's explicit no-deployment-without-approval instruction. Never request credentials in chat; use approved secure provisioning/secret injection.
2. Build/scan/pin the actual job image, deploy the single dedicated broker behind private authenticated HTTPS, configure server-only communication, and verify isolation/retention/failure operations. Existing Docker recipe is available; any additional orchestration configuration must retain the dedicated-host trust boundary and keep Docker authority out of the public app.
3. Run genuine DOCX fidelity checks (images/tables, headers/footers, licensed fonts, hyperlinks, breaks, multiple sections, portrait/landscape, complex formatting) against actual reference outputs; no native demo or fidelity pass exists yet. Embedded workbook/OLE rejection remains intentional.
4. Extend progressive native workloads to **100/250/500/750/1000** and run them on that approved host, with actual aggregate memory/CPU/duration/output-quality evidence. V4 tooling currently covers complex/100/500/1000, not the full V5 ladder. **Cap remains 100** pending real measurements/review. Native/browser metrics must stay null until measured.
5. Review requested advanced-workspace improvements against existing functionality, add only justified gaps, preserve every V3 edit/undo/export feature and every other tool. Measure real native preview/edit behavior, not just authored-PDF mocks.
6. Rerun full unit/type/lint/build, browser/security tests, actual conversion and progressive stress; capture new actual desktop/mobile evidence; update exact QA/setup/status reports. V4's 1057 units/17 Word E2E/39 selected cross-tool E2E are historical results, **not newly run V5 tests**.

Current outcome: **V5 audit started; hosting/approval blocked.** No V5 native execution, deployment, final screenshots, final QA, 1000-page support or production-readiness claim.
