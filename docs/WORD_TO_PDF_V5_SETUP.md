# Word to PDF V5 — deployment and engine configuration

This page describes how the shipped tool behaves on a server and how to enable each
conversion backend. It matches the code in `lib/tools/word-to-pdf/engine.ts` and
`app/api/word-to-pdf/route.ts`.

## 1. How a request is processed

1. The browser reads `GET /api/word-to-pdf` → `{available, engine, label, native,
   fidelity, notes, maxPages}` and renders the engine card from it.
2. The operator's consent checkbox must be ticked; only then does the client attach
   `x-quickkit-consent: server-conversion` and `sec-fetch-site: same-origin`.
3. `POST /api/word-to-pdf` validates: consent + same-origin, `application/octet-stream`,
   ≤ 20 MiB declared length, `x-quickkit-settings` ≤ 8 KiB and schema-valid, and a
   single conversion slot (409/429 on contention).
4. The body is streamed to the engine with a 170 s deadline; abort propagates to the
   reader.
5. The response is NDJSON: a `stage` event per phase (`Validating DOCX package`,
   `Reading DOCX package`, `Laying out N paragraphs`, `Preparing fonts and images`,
   `Rendering document pages`, `Applying export settings`, `Applying page settings`)
   followed by one final `{result, pages, base, engine, native, warnings}` event where
   `result` is base64 PDF.
6. `base:false` means the export settings were applied server-side; `base:true` means
   the client must apply them (only used when the engine cannot write them).

## 2. Choosing an engine

| `WORD_TO_PDF_ENGINE` | Behaviour |
|---|---|
| unset / `auto` | `worker` → `libreoffice` → `builtin`; first healthy backend wins |
| `builtin` | Always the in-process renderer (no external binaries) |
| `libreoffice` | Requires a working `soffice`; fails closed with an explanation |
| `worker` | Requires a reachable private worker; fails closed with an explanation |

Legacy switches:

- `WORD_TO_PDF_ENABLED=true` — no longer required for the built-in renderer. Kept for
  operators who gate the whole endpoint.
- `WORD_TO_PDF_WORKER_URL` / `WORD_TO_PDF_WORKER_TOKEN` — a **non-empty** value of
  either opts into worker mode under `auto`. Empty strings are treated as unset.

Hard limits (`lib/tools/word-to-pdf/page-limits.ts`): `MAX_PAGES = 1000`,
`MAX_FILE = 20 MiB` upload (50 MiB internal cap), settings header ≤ 8 KiB.

## 3. Built-in renderer (works out of the box)

No extra system packages. It bundles 13 Noto TTFs in `assets/noto/` (SIL OFL 1.1,
licence shipped) and embeds subsets with `@cantoo/fontkit`.

Because fonts are read with `fs` at runtime, `next.config.ts` sets:

```ts
outputFileTracingIncludes: { "/api/word-to-pdf": ["./assets/noto/**"] }
```

Verify after a build:

```bash
npm run build
python3 -c "import json;d=json.load(open('.next/server/app/api/word-to-pdf/route.js.nft.json'));\
print(len(d['files']),[f for f in d['files'] if 'assets/noto' in f][:3])"
```

If you deploy `output: "standalone"`, copy `assets/noto/` next to the server bundle if
your packaging step strips it — the trace file above is the source of truth.

Fidelity: text, tables, images, lists, hyperlinks, headers/footers with `PAGE` and
`NUMPAGES`, section geometry and orientation, colours, backgrounds, Indic scripts.
Charts, SmartArt, text boxes, footnotes, floating objects and Word's exact line
breaking are **approximated and reported as warnings**; they are never silently dropped.

## 4. Native LibreOffice (best pagination fidelity)

```bash
apt-get update && apt-get install -y --no-install-recommends libreoffice-writer fonts-noto
export WORD_TO_PDF_ENGINE=libreoffice      # or leave auto
which soffice && soffice --version
```

Requirements: `soffice` on `PATH`, a writable temporary directory, a hard timeout
(the API enforces 170 s), and enough RAM for the largest document you advertise.
Only advertise a 1000-page cap on a host where you have re-run
`tests/word-to-pdf-v5-stress.test.ts` with that engine.

## 5. Private worker (isolated conversion)

Set `WORD_TO_PDF_WORKER_URL` and `WORD_TO_PDF_WORKER_TOKEN`. The worker contract is
unchanged from V4 (`lib/tools/word-to-pdf/private-worker.ts`): bearer token, hard
timeout, bounded response size, structured errors. `auto` probes it once per request;
an unhealthy worker falls through to the next backend.

## 6. Reverse proxies, CSP and hosting

- Do **not** strip `sec-fetch-site`; the endpoint refuses cross-site posts by design.
  If your proxy removes it, conversions return 403 with a clear message.
- Allow `POST` with `application/octet-stream` and a large body on `/api/word-to-pdf`;
  the default Next body limit is bypassed by streaming, but some CDNs buffer.
- The endpoint is dynamic and `no-store`; do not cache it.
- Set `maxDuration`/platform timeout ≥ 180 s for large documents on serverless hosts;
  the built-in renderer is CPU-bound and works best on a normal Node process.

## 7. Smoke test after deploy

```bash
curl -s https://<host>/api/word-to-pdf        # expect available:true, engine:"builtin"
curl -sS -D- -o /tmp/out.ndjson \
  -H 'content-type: application/octet-stream' \
  -H 'sec-fetch-site: same-origin' \
  -H 'x-quickkit-consent: server-conversion' \
  -H 'x-quickkit-settings: {"paper":"Original"}' \
  --data-binary @docs/word-to-pdf/v5/fixtures/quality.docx \
  https://<host>/api/word-to-pdf
```

A correct response contains stage lines and one `result` line whose base64 decodes to a
file starting with `%PDF-`.
