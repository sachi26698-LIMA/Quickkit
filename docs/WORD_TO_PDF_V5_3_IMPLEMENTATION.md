# V5.3 implementation report

What shipped, what it cost, what it protects against, and what is still blocked.
Measured numbers come from this workspace; commands to reproduce are at the end.

## 1. Implementation

### 1.1 Renderer (`lib/tools/word-to-pdf/render/`)

- `lineHeight()` — `auto` = twips/240 multiplier, `exact|atLeast` = twips/20;
  default 1.15. This is the fix for the reported overlapping text.
- `paragraphFlow` was rebuilt around an explicit token stream
  (`word | space | tab | break | field | image`) so a tab can look ahead and align
  the following text. Supports left/centre/right stops, list labels snap to the
  hanging indent, and `\t` characters inside runs are real tabs.
- Numbering-level paragraph indentation (`numbering.xml`) is merged at the correct
  precedence (direct > numbering level > style), which also fixes bullet layout.
- `tableParts()` recurses content controls for `w:tr`/`w:tc`; `columnWidths()` pads
  short grids and floors cell width; table borders/shading resolve through the
  style chain; cell edges are drawn once (left/top ownership).
- `titlePg` first-page parts, odd/even parts, and tokenised `PAGE`/`NUMPAGES`
  fields.

### 1.2 Product surface (unchanged design, real status)

- `GET /api/word-to-pdf` returns `available`, `engine`, `label`, `native`,
  `fidelity`, `notes`, `maxPages`. The UI shows a "Built-in engine" / "Native
  engine" badge from that payload and never implies native fidelity otherwise.
- Conversion streams NDJSON stages (`Validating`, `Reading`, `Laying out`,
  `Preparing fonts and images`, `Rendering document pages` with `done`/`total`),
  so progress is real work, not a timer.
- The final event carries `pages`, `engine`, `native`, `warnings` and the PDF as
  base64; `requestConversion` in `client-convert.ts` maps it into the studio state
  (`outputPages`, warnings list).
- Preview area: `previewWorkspace` with fullscreen mode; every page rendered by
  `pdf.js` through `WindowedPages`/`IntersectionObserver` with 90 px thumbnails.
- Browser-first conversion: `client-convert.ts` + `private-worker.ts` keep the file
  on the device unless the user explicitly opts into server conversion
  (`x-quickkit-consent: server-conversion`, same-origin only).

### 1.3 Tests added

| File                                     | Purpose                                                                                                                                                                                 |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tests/word-to-pdf-v5.2-quality.test.ts` | Converts the whole corpus, writes PDFs + `quality-report.json`, asserts overlap/blank/size/coverage gates, line pitch, table drawing, orientation, images, page fields, 100-page budget |
| `tests/word-to-pdf-v5.2-text.test.ts`    | Per-run text audit over the real and synthetic corpus                                                                                                                                   |
| `scripts/word-to-pdf-v5.2-corpus.mjs`    | Reproducible A–K corpus (11 documents)                                                                                                                                                  |

Full suite: **73 files / 1,170 tests passing**, `tsc --noEmit` clean, `next build`
clean, ESLint 0 problems.

## 2. Benchmarks

Node 22, single container, measured with `process.hrtime.bigint()` and sampled RSS.

| Pages | Time   | PDF size | Peak RSS | Δ RSS |
| ----- | ------ | -------- | -------- | ----- |
| 100   | 1.37 s | 859 KB   | 188 MB   | 92 MB |
| 250   | 2.33 s | 2.1 MB   | 272 MB   | 84 MB |
| 500   | 2.21 s | 2.0 MB   | 336 MB   | 65 MB |
| 1000  | 4.60 s | 3.9 MB   | 367 MB   | 31 MB |

Through the HTTP API (production build): 101 pages in **1.45 s**, 4 pages in
**0.75 s** including upload and progress streaming.

## 3. Self-review

**Races.** `acquire()`/`release()` gate the server conversion path
(`429` when busy) and the abort signal plus a 170 s deadline bound a trickling
upload; `request.signal` listeners are removed in `cleanup()`. In the preview,
each render effect keeps a `disposed`/`dead` flag and destroys the `pdf.js`
document on cleanup, so a fast file switch cannot paint the previous document.

**Leaks.** `pdf.js` documents are destroyed (`destroy()`), object URLs are revoked
by the thumbnail effect's cleanup, and the renderer holds one `pdf-lib` document
per conversion (no global cache). 1000-page conversions leave ΔRSS ≈ 31 MB,
i.e. the per-document footprint is released to the GC.

**Security.** Uploads must be a ZIP with `[Content_Types].xml` and a
`word/document.xml`; macro/OLE payloads are rejected; 20 MiB and page caps are
enforced before layout; server conversion requires an explicit consent header and a
same-origin `sec-fetch-site`; CSP is `default-src 'self'` with
`frame-ancestors 'none'`; no document content is logged. Nothing is written to
disk server-side.

**Accessibility.** The preview region is a labelled region
(`aria-label="PDF page preview"`), the engine panel is `role="status"`, thumbnails
are real `<button>`s with `aria-pressed` selection state, and progress text is
announced through the status region. Contrast and focus rings come from the
existing QUICKKIT tokens.

**Mobile.** The studio switches to a single-column workspace under the tablet
breakpoint, fullscreen mode is available without a separate route, and preview
pages render at device pixel ratio so zoomed text stays sharp.

## 4. Blockers (honest list)

| Blocker                                  | Evidence                                                                                                                      |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| No LibreOffice binary                    | `which soffice libreoffice` → empty; `deb.debian.org` unreachable, so the native path cannot be installed or exercised        |
| No browser for E2E                       | `npx playwright install chromium` → `Error: Download failure, code=1`; no system Chrome. Playwright specs remain collect-only |
| No public network beyond npm/PyPI/GitHub | Cannot validate a hosted worker end-to-end                                                                                    |

Consequence: the deliverable claims **built-in renderer quality**, verified by
geometry and text audits plus HTTP-level end-to-end runs — not Word/LibreOffice
fidelity and not browser-verified UI.

## 5. Deployment guide

```bash
# 1. Application (built-in renderer, no extra infrastructure)
npm ci
npm run build
npm run start -- --port 3100
# optional: cap pages
echo "WORD_TO_PDF_MAX_PAGES=1000" >> .env

# 2. Opt-in fidelity path: local LibreOffice
apt-get install -y --no-install-recommends libreoffice-writer fonts-crosextra-carlito fonts-crosextra-caladea
# the worker must be isolated: no network, read-only FS apart from the job dir,
# per-process profile to avoid the known profile-lock problem:
soffice --headless -env:UserInstallation=file:///tmp/lo_profile_$$ --convert-to pdf --outdir /job /job/in.docx

# 3. Or a remote worker (Gotenberg example)
docker run --rm -p 3000:3000 gotenberg/gotenberg:8
# then
WORD_TO_PDF_WORKER_URL=http://gotenberg:3000/forms/libreoffice/convert
```

Health check:

```bash
curl -s localhost:3100/api/word-to-pdf   # → available, engine, native, fidelity, maxPages
```

Preview note for hosted environments: the app must be served on a host that
permits iframe embedding for the preview panel, or the panel is opened full
screen. `next.config.ts` sets the security headers; the sandbox preview proxy is
the only embedder used here.

## 6. Reproduce every number

```bash
node scripts/word-to-pdf-v5.2-corpus.mjs
npx vitest run tests/word-to-pdf-v5.2-quality.test.ts   # metrics, PDFs, quality-report.json
npx vitest run tests/word-to-pdf-v5.2-text.test.ts      # per-run text audit
npx vitest run                                          # 73 files / 1,170 tests
npx tsc --noEmit && npm run lint && npm run build
```

Outputs: `test-results/word-to-pdf-v5.2/*.pdf`, `quality-report.json` (not
committed); committed evidence in `docs/word-to-pdf/v5.2/{evidence,samples}`.
