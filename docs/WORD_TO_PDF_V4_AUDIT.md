# Word to PDF V4 — native/production readiness audit

4 November 2026. Branch `arena/15621ae8-quickkit`, clean at `e8d6091`. Inspected all six V3 checkpoint summaries/diffs, V3 audit/QA/editor/engine/changed-file reports, native adapter, endpoint, DOCX validation and package/deployment configuration. V3 is preserved; no reset/re-clone/branch switch/merge/deployment.

## Verified environment and exact blocker

- Debian 12 x86_64, UID 1001; about 4 GiB RAM / 17 GiB free disk at audit. Passwordless sudo is available. No LibreOffice/soffice, Docker/Podman, bubblewrap or fontconfig executable found; no cached `.deb` files.
- `unshare --user --map-root-user --mount --net --pid --fork sh -c 'mount --make-rprivate /'` **succeeded**. Do not falsely call namespace isolation impossible. Delegated cgroup directory is not writable here; this is not a production per-job quota host.
- Apt sources point at `deb.debian.org`. This session permits outbound requests only to GitHub, npm and PyPI hosts, **not Debian repositories or external binary storage**. Package download was not attempted against prohibited hosts; this is a policy blocker, not an observed apt network failure.
- npm metadata: `@shelf/aws-lambda-libreoffice@8.0.5` is only 10,310 unpacked bytes plus JS dependencies, not a bundled LibreOffice/font installation. `@sparticuz/libreoffice` returned registry 404. Neither establishes native availability. No third-party binary was executed or supply-chain shortcut used.
- Existing V3 native endpoint is disabled/unavailable; successful V3 images were explicitly mocked-native authored PDF fixtures. No actual DOCX fidelity or 100/500/1,000-page native workload has passed. Native install/build is blocked here, but an operator with approved Debian/image registry access can provision a dedicated worker host.

## Production gaps in V3 local adapter

The local child runs a real headless CLI, has unique private temp/profile paths, one per-process admission slot, timeout/cancel process-group kill and finally cleanup. It is not an OS sandbox: it inherited the web server environment and filesystem/network namespace. Executable access is not readiness/fidelity certification. Per-process admission is not cluster-wide. Native rendering happens before the 100-page guard. Source charts with embedded OLE/workbook packages remain deliberately rejected by DOCX validation; do not relax that rule just to advertise chart fidelity.

## V4 extension / checkpoints

1. Preserve the audit, implement an explicitly selected private-worker transport with fail-closed health/configuration, strict time/body limits and no automatic local/managed/browser fallback. Retain the current local adapter for V3 compatibility, label it operator-isolated-only, and sanitize its child environment.
2. Supply a private authenticated broker and fixed-image Docker job recipe: one job at a time across app replicas using this broker, network-none/read-only/nonroot/drop-capabilities/no-new-privileges/pids/CPU/RAM/tmpfs limits, ephemeral stdin → DOCX → stdout PDF, no bind-mounted documents/secrets, no container logs. Cancellation must remove the daemon-owned container, not merely kill `docker run`. Cleanup failure quarantines the broker.
3. Add transport/security/command-policy tests that are explicitly **not native rendering evidence**; preserve V3 preview/base/final processing and export fingerprints. Do not raise the 100-page cap.
4. Supply reproducible real DOCX fidelity fixtures (including cached charts and mixed sections) and operator benchmark tooling. Record blocked native metrics as null/not-run, never zero/pass. Large native benchmarking precedes the app's unchanged page guard; browser editing above the cap is not supported.
5. Run current unit/E2E/security/type/lint/build checks, capture actual disabled-engine desktop/mobile state, update tracker, exact changed files and readiness gates. Actual output demo/fidelity/large native performance remain blocked until a trusted native image is built and tested outside this restricted environment.

## Alternatives evaluated

- Dedicated self-hosted container-per-job LibreOffice worker: preferred; keeps files under operator control and can have no document persistence/network inside the parser. Requires a real container runtime, patched image, licensed fonts, quotas, firewall/TLS and operational validation.
- Self-hosted Gotenberg: a possible maintained LibreOffice-based service, not an isolation or fidelity guarantee by itself. Requires the same private-network/auth/admission/egress/retention review; no runtime/image is available here. Not silently substituted.
- Commercial managed conversion / Microsoft Graph / CloudConvert / Aspose: requires vendor/license/security/region/retention review, separate explicit third-party upload consent and secrets provisioning. Graph/drive-based storage conflicts with no permanent storage by default unless deletion/retention is carefully arranged. None is enabled, called or used as a fallback.

The deployment recipe is a reviewable solution, not a claimed completed deployment or native validation. V4 cannot be declared production-ready on this environment's evidence.
