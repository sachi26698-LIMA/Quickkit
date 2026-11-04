# Word to PDF V3 — native engine status and release gates

**4 November 2026: NOT production-approved.** No merge, deployment or host provisioning was performed.

## Actual environment findings

- `command -v libreoffice soffice`: neither executable found on PATH.
- Real `GET /api/word-to-pdf`: `available: false`; the real browser shows operator setup requirements and never uploads files to a disabled engine.
- Native enablement remains opt-in: `WORD_TO_PDF_ENABLED=true`, optional absolute `WORD_TO_PDF_SOFFICE` executable path. Executable permission/availability is not a font, parser sandbox, fidelity or health certification.
- No successful real DOCX conversion, source-font substitution review, table/chart/image fidelity review, headers/footers/page-break review or native performance certification occurred here. Fake-adapter tests and mocked response screenshots are not substitutes.
- [Actual native stress availability report](word-to-pdf/v3/native-stress-blocked.json): 100, 500 and 1,000-page cases **BLOCKED**, no POST/upload, no simulated success. Exit 2 is intentional blocker status.
- Browser/PDF edits are independently verified with authored real PDFs; [those results](WORD_TO_PDF_V3_QA.md) do not remove native acceptance gates. Keep the 100-source/output-page cap and never advertise 1,000-page support.

## Mandatory operator setup

Use a patched, persistent Linux Node host with a real LibreOffice Writer installation and reviewed/licensed fonts. The native engine is not supported on default Vercel serverless hosting. Follow [the original isolation checklist](WORD_TO_PDF_OPERATIONS.md) and [V2 operations](WORD_TO_PDF_V2_OPERATIONS.md): unprivileged process/container, blocked outbound including cloud metadata, no sensitive inherited credentials/environment, read-only root, CPU/RAM/process/temp quotas, HTTPS, request rate/body limits, no document/settings-header logging or temp backups, and crash-expiry cleanup for orphaned `quickkit-word-*` directories.

Native parser/conversion is not a security boundary. The one-job gate is per Node process, not a cluster-wide admission controller. Fifty-MiB output and 100-page guards run after native rendering; OS quotas must bound oversized work **before** those checks can run.

Existing limits remain: 10 files, 20 MiB each, 80 MiB original queue; expanded ZIP 100 MiB / 2,000 entries / 40 MiB per entry; one native child per process; 120 s native / 150 s total request deadline; 50 MiB per source/final PDF; 100 source/output pages; 120 MiB combined retained base/final bytes. New native bases are budget-checked before retention, including when a visual plan fails after reflow. The retained-byte budget is not browser/native peak RSS.

## Reproducible native probe (operator only)

```sh
# With the real app already running; disabled engine returns BLOCKED / exit 2.
node scripts/word-to-pdf-native-stress.mjs

# Only on a verified isolated native host, with explicit operator upload consent:
WORD_TO_PDF_TEST_URL=http://127.0.0.1:3001 \
  node scripts/word-to-pdf-native-stress.mjs \
  --isolated-host --consent-server-processing
```

The script generates actual DOCX fixtures with explicit page breaks, fonts, tables, images and headers/footer. It never silently enables an engine. It expects a valid 100-page native PDF, and **guard rejection**, not supported conversion, for 500/1,000 pages under the current cap. It writes `test-results/word-to-pdf-v3-native-stress.json`. Exit 1 means failure, exit 2 means blocked. It does not measure native-server peak RSS; capture container/process resource telemetry independently. Do not run large native probes without host quotas.

## Required before a production claim

1. Record native/font versions, isolation configuration, quotas and network denial evidence.
2. Convert representative real DOCX files and manually compare Microsoft Word/native reference pages: fonts/substitution, tables, charts/shapes/equations, images/transparency, links, headers/footer, page breaks and complex sections. Browser DOCX comparison is approximate and not an authoritative Word layout diff.
3. Complete the real 100-page native workload with throughput, cancellation, temp cleanup and server/browser peak-memory telemetry. Test safe rejection/timeout for 500/1,000, hostile archives and overload. Raising the cap requires separate evidence and review; do not remove it because small PDF guard fixtures passed.
4. Review image-heavy 100-page edits/ZIP on representative low-memory mobile devices, plus manual keyboard/screen-reader and Firefox/WebKit verification. Confirm no old document URLs/workers survive clear/remove/unmount.
5. Address/independently approve the unchanged wider-suite Splitter hydration test race. Current wider result is 47/48, not all green.
6. Obtain owner approval. V3 is a review delivery with native release blockers, not an approval or deployment instruction.

Privacy remains consent-first. Base-mode requests now contain only native rendering options: local visual plans, watermarks/image data and PDF metadata stay in this tab. Automatic native refresh remains separately opted in and revocable. Native errors never trigger a hosted conversion fallback or pretend a faithful browser conversion succeeded.
