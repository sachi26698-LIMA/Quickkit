# V4 private native worker — operator setup and release gates

**4 November 2026: implementation/recipe only; not deployed, image not built, native rendering NOT validated here.** This environment has no LibreOffice or Docker/Podman, no approved cached native artifact, and Debian/image registry hosts are outside its outbound allowlist. Namespace isolation itself works. Do not interpret mocked CLI tests, authored PDFs or a green Next build as native/fidelity/security certification. Keep the public app's **100-page cap**.

## Architecture / trust boundary

Browser consent → existing same-origin app API and full `prepareDocx` ZIP/XML validation → authenticated private worker → a fresh fixed-image LibreOffice container → bounded PDF bytes → existing V3 `processPdf` → PDF.js/editor. The V3 native base/final-byte fingerprint and edit/export/undo pipeline is unchanged. Configured worker errors never fall back to local/browser/managed conversion. Retry is explicit; documents are not placed into a persistent retry queue.

The Node broker has **root-equivalent Docker authority**. Run it as the sole broker on a dedicated, patched worker host, not inside the public application, and **never give the public web application a Docker socket or Docker group membership**. Use a private TLS reverse proxy, firewall source restrictions and a long random token; mTLS is recommended. The app uses HTTPS except explicit IP loopback HTTP. Do not expose the broker directly to the internet. Rootless Docker is preferable when its cgroup v2 delegation supports all limits; otherwise isolate the rootful daemon/host from other workloads. A broker replica is NOT a distributed queue/lease: deploy exactly one broker instance on the dedicated daemon. Multiple app replicas can use that one admission point.

Broker HTTP is intentionally loopback-only (8090 by default). It accepts no client-supplied image, command, filename, path or Docker option. Request/response/headers are bounded; one active request including input buffering, immediate 429 rather than a queue, 16 connections, 10-second header/30-second input deadlines. Reverse proxy must enforce private access, 20 MiB input, no document body/access-log capture, no buffering to persistent disk, and a response timeout over 150 seconds. Broker diagnostics never log documents/native stdout/stderr. Configure infrastructure logging/tracing/core-dump/swap/retention policies too: no application design can promise deletion from host swap, crash dumps or third-party ingress logs it does not control.

Every job uses an immutable local image ID, `--pull=never`, nonroot UID/GID 65532, network none, read-only root, no capabilities, no-new-privileges, default seccomp, private cgroup namespace, 1 CPU/1 GiB RAM/no extra swap, 128 PIDs, 256 FDs, 50 MiB per-file maximum, 512 MiB `/work` + 128 MiB `/tmp` tmpfs with noexec/nosuid/nodev. No document/secret bind mounts, published ports or container logging. The Python entrypoint checks effective UID/capabilities/no-new-privileges/seccomp/read-only root/network interfaces and cgroup v2 RAM/swap/CPU/PID limits **before even version probing**; unsupported hosts fail closed. These checks are written but have not run in a real container here. Image fonts and code must be trusted and patched: this is not a proof against kernel/container escape.

Native input/output/profile exist only in tmpfs (DOCX input <=20 MiB, PDF <=50 MiB). In-memory broker buffering is bounded but not zero-copy. Reserve at least 2 GiB host capacity per broker/job; separately constrain the broker with a service cgroup (start at 512 MiB and measure real peaks), not only the parser container. Do not oversubscribe hosts based on the 100-page cap: native work happens before the cap is known.

## Build on an approved host (NOT run in this sandbox)

Requirements: Linux cgroup v2 with `memory.peak`, Docker >=24, working default seccomp, Node >=22, signed Debian package access and an approved image registry. Do not bypass this session's outbound policy to install these. No npm wrapper substitutes for the actual native runtime.

1. Review `scripts/word-worker/{Dockerfile,entry.py,policy.mjs,broker.mjs}`. Put licensed custom fonts in `scripts/word-worker/fonts/` before building; never commit proprietary fonts. The baseline Liberation/DejaVu/Noto Core fonts are not guaranteed substitutes for Word fonts. The sample's `Quickkit Operator Test Font` is intentionally absent unless you install that font or regenerate using `WORD_TO_PDF_FIXTURE_FONT`.
2. Pull an approved Debian Bookworm base. Resolve and record its real digest (do not paste an invented placeholder hash):

   ```sh
   docker pull debian:bookworm-slim
   BASE=$(docker image inspect --format '{{index .RepoDigests 0}}' debian:bookworm-slim)
   docker build --build-arg BASE="$BASE" -t quickkit-word-reviewed scripts/word-worker
   IMAGE=$(docker image inspect --format '{{.Id}}' quickkit-word-reviewed)
   ```

   `IMAGE` must be `sha256:` + 64 actual hexadecimal digits. Broker rejects mutable tags and never pulls. Apt packages are latest signed versions at build time: this recipe is **not bit-reproducible** from a base digest alone. Archive the image digest, `/usr/share/quickkit-native-packages.txt`, build provenance/SBOM, vulnerability scan, LibreOffice version and font listing in your approved artifact registry. Rebuild/test/pin after security/font updates. Do not install fonts over a running document job.
3. Provision a cryptographically random 32–128 character URL-safe token via your secret manager/service environment; don't put it in shell history, frontend variables, URLs, source control or reports. Configure `WORD_WORKER_IMAGE` to `IMAGE`, `WORD_WORKER_TOKEN` to that secret. Optional `DOCKER_HOST` accepts **only local Unix sockets** (for rootless Docker). Broker's Docker child environment contains no token/web environment, and job containers receive only image ENV + a typed export filter. The native local V3 adapter now also uses a minimal child environment, but remains **not an OS sandbox**; only use it on an already externally isolated operator host.
4. Run as a restricted dedicated service:

   ```sh
   node scripts/word-worker/broker.mjs
   ```

   Configure a private HTTPS reverse proxy to loopback 8090; ensure no public ingress and no persistent request/response buffering/logging. Public preview hosting does not deploy this worker.
5. Set the app's **server-only** environment, restart it, then verify the existing `/api/word-to-pdf` health:

   ```dotenv
   WORD_TO_PDF_ENABLED=true
   WORD_TO_PDF_WORKER_URL=https://your-private-worker-host.example/
   # WORD_TO_PDF_WORKER_TOKEN is injected by the secret manager, NOT a NEXT_PUBLIC variable.
   ```

   Root URL only; no username/password/query/fragment/path. Invalid/empty partial worker configuration fails closed, not back to local execution. Only same-host `http://127.0.0.1:8090/` or `http://[::1]:8090/` may use HTTP (broker currently binds IPv4 loopback). No TLS verification bypass. An authenticated `/health` actually executes the pinned image's guarded `libreoffice --version`; active-job health reports only previously verified readiness. This reports engine/runtime policy, **not document fidelity**. Very slow cold starts can exceed the app's 8-second health deadline and must be investigated; no false availability is returned.

## Cleanup, cancellation, crashes and quarantine

`docker create` must complete before `start --attach --interactive`, so an ambiguous create can never begin native parsing. Cancellation/120-second outer native deadline kills the CLI **and** force-removes the daemon-owned job. Even normal success waits for force-remove/independent `ps` absence confirmation before sending a PDF. Failed cleanup confirmation, ambiguous create, runtime reconciliation errors or orphaned labelled containers quarantine the broker; it will not accept more jobs or return success. App fetch is bounded to 130 seconds; public request timeout remains 150 seconds. Cleanup may continue after the client disconnects and holds the slot until it ends.

The entrypoint additionally has a 110-second native timeout + 5-second hard kill independent of the broker. Exiting the container terminates remaining container processes; `--rm` removes its metadata. A host/daemon crash still requires operational reconciliation. On service restart, the first job/probe refuses existing containers labelled `quickkit.word-worker=1`. Inspect/remove only that dedicated host's orphan jobs, confirm no remaining tmpfs/documents/processes, fix the fault, **then restart** the broker. Do not automatically clear quarantine on retry or blindly delete someone else's containers. Lock down service restart/core-dump behavior; test daemon loss, OOM, disconnect during create/start/conversion/output, host reboot and proxy timeout on the real host before release.

## Genuine fidelity and benchmark procedure

Synthetic source DOCX inputs are provided in `docs/word-to-pdf/v4/fixtures/`; their generator is `scripts/word-to-pdf-v4-fixtures.mjs`. The complex fixture includes a merged-cell table, raster image, cache-only bar chart, requested custom font, header/footer, hyperlink, explicit page breaks, A4 portrait and Letter landscape sections. **These are not Word-rendered references or native outputs.** DOCX validation still rejects embedded OLE/workbook objects; many normal Office charts with embedded workbooks are therefore unsupported. The cache-only chart package passes validation but its actual appearance is unverified.

On the isolated approved host, after configuring the same server-side worker URL/token:

```sh
node scripts/word-to-pdf-v4-benchmark.mjs --isolated-host --consent-server-processing --retain-demo
```

Only these explicit flags permit upload. Default runs without flags produce BLOCKED/null data with no upload. `--retain-demo` deliberately saves the synthetic complex fixture's **real** raw native PDF under ignored `test-results/`; otherwise no output document is retained. The report records actual native page count, bytes, HTTP wall duration, native elapsed/user/system/max-child-RSS and, where readable, aggregate cgroup peak bytes/CPU usec. Null means missing, never zero/pass. Cgroup peak includes tmpfs; child max RSS is not simultaneous aggregate memory. Inspect Docker OOM/exit status and job cleanup separately when requests fail. Native output above 100 is probed directly at this private boundary solely for capacity testing; the public app must still reject it.

Then upload the complex DOCX through the real browser consent flow; inspect actual final preview, export and stale-preview behavior after settings/edits, watermarks and numbering. Preserve actual final bytes and SHA-256 and compare exported bytes to displayed final preview bytes. Record desktop/mobile screenshots and measure first PDF.js render, scrolling, settings-refresh, edit/undo/redo/export latency and browser memory on the **real native 100-page PDF**. The CLI explicitly leaves preview/edit timings null; do not replace them with PDF parse duration or V3 mocked timings. Browser editing 500/1000 is unsupported; raising the cap requires separate successful memory/performance/security review.

Obtain reference exports from the licensed Microsoft Word version in use; compare table borders/merges/row flow, image geometry, chart labels/values, custom-font embedding/substitution, all section dimensions/orientations, page-break positions, headers/footers and clickable hyperlinks, multipage order/text and accessibility tags. Track each fixture/version/font/reference/image digest and reviewer outcome. LibreOffice differences are possible: never promise lossless Word layout or certify fidelity from page counts. A genuine DOCX→PDF demo, these manual checks, native 100/500/1000 metrics, actual native browser metrics, sandbox escape/retention checks and patch/provenance review are **open release gates**.
