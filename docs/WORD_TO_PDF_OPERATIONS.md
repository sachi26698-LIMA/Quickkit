# Word to PDF — operator enablement / release gate

> V1 historical record. The same-route V2 upgrade is documented in [V2 QA](WORD_TO_PDF_V2_QA.md) and [V2 operator instructions](WORD_TO_PDF_V2_OPERATIONS.md); V2 browser retention/preview details supersede V1 values. Native production approval remains blocked.

This tool is **not yet approved for production use**. The UI and native adapter exist; real LibreOffice rendering QA and host isolation approval are outstanding. It intentionally stays unavailable by default. No third-party API keys are required.

## Host requirements

Use a persistent Linux Node 22 host with an up-to-date LibreOffice Writer installation and required, legally deployable fonts. This is not supported on the repository's default Vercel serverless host. Install native packages through your own trusted OS package source, not a browser-side SDK. Record the exact LibreOffice and font versions for QA.

Set these only on a secured operator-controlled host:

```text
WORD_TO_PDF_ENABLED=true
WORD_TO_PDF_SOFFICE=/usr/bin/libreoffice
```

Restart the Node process after configuration. `/api/word-to-pdf` reports availability without processing a document. Availability checks configuration and executable permission, not end-to-end rendering or sandbox health. Do not treat that check as a security audit.

## Mandatory isolation before enabling

- Dedicated unprivileged container/user; read-only root and no secrets reachable by the conversion process. The native parser inherits the Node process environment: do not share this process with unrelated sensitive credentials.
- Disable container outbound networking (including DNS and cloud metadata); DOCX field codes and parser vulnerabilities can bypass superficial ZIP relationship checks. Keep the engine patched.
- Bounded temporary filesystem, process count, CPU and memory enforced by the host. App guards limit uploads/expanded packages but cannot guarantee native parser memory usage.
- Reverse proxy: enforce request-body and upload-rate limits, disable request-body logging and buffering for streamed responses, require HTTPS, and apply abuse/rate limits. Browser consent is not authentication or abuse prevention.
- Single conversion process replica or external global queue. Current concurrency is one per Node process, with HTTP 429 for contention; no unbounded server queue is created.
- Ensure periodic expiry of `quickkit-word-*` temporary directories following process crashes. Normal success, failure and cancellation remove each private directory automatically. Exclude temp storage from backup. Do not delete another process's active work.
- Verify disconnect propagation through the proxy and subprocess-group termination on cancellation. Deadline is 150 seconds including upload; native rendering deadline is 120 seconds. App Router hosts must allow that duration and streaming.

## Release QA checklist (not completed in this sandbox)

1. Compare rendered PDFs with Microsoft Word reference PDFs using a legally owned representative corpus: nested/merged tables, floating images, transparency, charts, multiple scripts/fonts, embedded fonts, equations, tracked changes, clickable links, section headers/footers, mixed A3/A4/A5/Letter/Legal and custom sizes.
2. Exercise every page/margin/quality setting, global versus file overrides, and numbering overlays with headers/footers. Overlays must not obscure document content. Document font substitution and unsupported features rather than promising lossless output.
3. Test corrupted/truncated/renamed packages, password encryption, macros, OLE and network-linked resources. Confirm no outbound traffic and no retained input/output files after errors, cancellation or worker crash.
4. Validate PDFs using independent PDF tooling; inspect link destinations, image resolution, transparency and licensed font embedding. Print quality is the high-quality native image export preset, **not** PDF/X, CMYK, bleed or print-shop certification. PDF post-processing must not be represented as preserving digital signatures or conformance profiles.
5. Run repeated 10-file batches at memory limits, adversarial compressed inputs and timeout/cancel cases. Measure peak RSS, temp storage, duration and event-loop responsiveness. Browser batch outputs are capped at 100 MiB; ZIP creation is in-memory and can temporarily duplicate that data.
6. Long-document benchmarks: 100, 250, 500 and 1,000 pages across text-heavy and image-heavy inputs on desktop/mobile clients and the actual isolated host. Record native and browser peaks, latency, output validation and fidelity. **Do not increase the current 100-page limit until those tests pass and limits/UX are reviewed.** The native page-count guard runs after rendering; host quotas and deadlines protect processing before the count is known.
7. Run new native end-to-end tests without response mocks, plus Firefox/WebKit, keyboard, screen-reader and mobile review. Approve privacy/legal copy for the actual operator and retention configuration.

The test fake executable and Playwright intercepted responses validate adapter/transport behavior only. They are deliberately labelled and must never be cited as native DOCX rendering evidence.
