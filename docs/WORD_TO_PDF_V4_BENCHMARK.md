# V4 real native benchmark status

4 November 2026 — **BLOCKED / NOT RUN**. No LibreOffice/container runtime or approved native installation artifact is available here; approved session networking excludes Debian/image repositories. Actual runtime absence is not replaced by a mock, npm wrapper, browser converter or fabricated PDF.

| Workload | Native wall/duration | Peak RAM / CPU | Output / actual pages | PDF.js preview / editing |
| --- | --- | --- | --- | --- |
| Complex fidelity DOCX | null — NOT RUN | null | null | null |
| 100-page-intent DOCX | null — NOT RUN | null | null | null |
| 500-page-intent DOCX | null — NOT RUN | null | null | unsupported at current app cap |
| 1000-page-intent DOCX | null — NOT RUN | null | null | unsupported at current app cap |

Public maximum remains **100 pages**. Synthetic 100/500/1000 DOCX inputs pass package validation; that is not rendered page-count, throughput, peak-memory or production capacity evidence. V3 authored PDF editing/virtualization stress observations remain historical non-native evidence, not these missing metrics.

`node scripts/word-to-pdf-v4-benchmark.mjs` was actually run: exit **2 / BLOCKED**, no consent flags/configured native worker, **no upload**. Its archived JSON has null metrics. A separate observed local app health response reports `available:false`, `maxPages:100`. Neither asserts a failed real native workload or a measured native runtime.

On an approved isolated host, inject private server URL/token and run:

```sh
node scripts/word-to-pdf-v4-benchmark.mjs --isolated-host --consent-server-processing --retain-demo
```

The explicit flags allow direct synthetic DOCX upload to the authenticated private worker after a guarded real image/LibreOffice version probe. No third-party/automatic fallback. Direct raw native probes deliberately precede the public app's page guard; they do not enable 500/1000-page browser editing. Default execution retains only numeric reports, not output PDFs; `--retain-demo` explicitly saves the real complex native PDF under ignored `test-results/` when conversion actually succeeds.

Metric definitions: HTTP `wallMs` includes transfer/create/start/native/cleanup; native `elapsedSeconds` measures the actual LibreOffice command phase; `userSeconds`/`systemSeconds`/`peakRssKiB` are Linux child resource usage (RSS is max child, not concurrent aggregate). `containerPeakBytes` reads cgroup v2 `memory.peak` and includes processes + tmpfs; `containerCpuUsec` is that container's CPU usage after conversion. Missing counters remain null. Never substitute process RSS or an arithmetic estimate for actual aggregate peak RAM. Real failed jobs need correlated OOM/daemon/cleanup inspection; CLI failure status is not a fidelity result.

The CLI deliberately leaves browser `previewMs`/`editingMs` null. A separate consented real-native 100-page browser run must measure actual PDF.js first render, scroll virtualization, settings refresh, edit/undo/redo/export and browser memory, plus actual final preview/export byte identity. Do not label PDF parse duration as preview/edit latency. The complete release procedure and native/failure/security gates are in `WORD_TO_PDF_V4_SETUP.md`. No 1000-page support claim is made.
