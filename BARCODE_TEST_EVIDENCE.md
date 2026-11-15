# Barcode suite — test evidence (Phase 20)

Every number below was produced by a command on this machine, on the branch and
commit named at the top of `BARCODE_STUDIO_PHASE20_REPORT.md`. Where a check did
not run, the row says so. No result is copied from an earlier phase.

Environment: Node 22.22.3 · Next 16.4.3 · React 19.3.1 · Chromium 141 (headless,
installed by `scripts/prepare-headless-chromium.mjs` into `/tmp/chromium`) ·
2026-11-13 / 14 UTC.

---

## 1. Static gates

| Gate             | Command                                | Result                                                         |
| ---------------- | -------------------------------------- | -------------------------------------------------------------- |
| TypeScript       | `npx tsc --noEmit`                     | 0 errors                                                       |
| ESLint           | `npm run lint`                         | 0 errors, 0 warnings (after replacing one `<a>` with `<Link>`) |
| Prettier         | `npx prettier --check <changed files>` | all matched files clean                                        |
| Unit/integration | `npx vitest run --reporter=dot`        | **125 files / 2,135 tests passed**, 0 failed, 332 s            |
| Production build | `npm run build`                        | compiled; **143/143 static pages**                             |
| Dependencies     | `npm audit` · `npm audit --omit=dev`   | **0 vulnerabilities** in both                                  |

Suite growth this phase: 122 files / 2,089 tests (Phase 19) → 125 files /
2,135 tests. The 46 added tests are in `tests/barcode-bulk-mixed.test.ts` (20),
`tests/batch-brand-decoders.test.ts` (14),
`tests/product-lookup-redirect-guard.test.ts` (10), plus 2 regression tests in
`tests/batch-code-engine.test.ts` and `tests/batch-code-checker-ui.test.tsx`.

---

## 2. Browser end-to-end — nine barcode pages, two viewports

Method: production build served by `next start` on `0.0.0.0:3010`; Playwright /
Chromium; `waitUntil: "networkidle"`; page-error and console-error listeners
attached before navigation; horizontal overflow measured as
`document.documentElement.scrollWidth - window.innerWidth`.

| Page                        | 1280 px | 390 px | Overflow 1280 / 390 | Page errors | Console errors |
| --------------------------- | ------- | ------ | ------------------- | ----------- | -------------- |
| `/tools/barcode-generator`  | 200     | 200    | 0 / 0               | 0           | 0              |
| `/tools/barcode-scanner`    | 200     | 200    | 0 / 0               | 0           | 0              |
| `/tools/barcode-developer`  | 200     | 200    | 0 / 0               | 0           | 0              |
| `/tools/batch-studio`       | 200     | 200    | 0 / 0               | 0           | 0              |
| `/tools/batch-code-checker` | 200     | 200    | 0 / 0               | 0           | 0              |
| `/tools/gs1-intelligence`   | 200     | 200    | 0 / 0               | 0           | 0              |
| `/tools/product-lookup`     | 200     | 200    | 0 / 0               | 0           | 0              |
| `/tools/qr-code-scanner`    | 200     | 200    | 0 / 0               | 0           | 0              |
| `/guides/barcode`           | 200     | 200    | 0 / 0               | 0           | 0              |

18 visits, **18 × HTTP 200, 0 overflow, 0 page errors, 0 console errors.**

### 2.1 Interactions that ran

| Interaction                                                                            | Observed                                                                                                                                                         |
| -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Batch studio — "Load a mixed-format sample" → "Encode 5 rows"                          | Result table with per-row format column: `EAN-13 ok 5901234123457`, `ITF-14 ok 09506000134352`, `Code 128`, …                                                    |
| Batch studio — "All formats — PNG"                                                     | Download `quickkit-batch-all-formats-png.zip`, **89,351 bytes**, `PK` magic, folders `ean13/`, `itf14/`, `code128/`, `qrcode/`, `datamatrix/`, plus `README.txt` |
| Batch studio — first group "SVG"                                                       | Download `quickkit-batch-ean13-svg.zip`, **3,047 bytes**, `PK` magic                                                                                             |
| Batch studio — "Report CSV"                                                            | Download `quickkit-batch-report.csv`, header `row,format,status,value,message`, 5 data rows                                                                      |
| GS1 intelligence — parse `(01)09506000134352(17)251231(10)LOT-42`                      | GTIN, `2025-12-31` and `LOT-42` all rendered                                                                                                                     |
| Product lookup — `?gtin=123`                                                           | Check-digit refusal shown; **0 requests** to `/api/product-lookup`                                                                                               |
| Batch code checker — brand preset + `(01)09506000134352(17)270930(10)LOT-9`            | **VERIFIED**, decoder `gs1-element-string v2.0.0`, `AI 17 Expiration date — 30 Sep 2027`, lot `LOT-9` kept, brand preset preserved                               |
| Batch code checker — `(01)04005808147709(17)270930(10)LOT-9` (check digit should be 2) | Not promoted to VERIFIED; reported as an ambiguous date reading                                                                                                  |
| Batch code checker — `28H300` on Nivea                                                 | NOT DECODABLE, with the "Why this code cannot be decoded" explanation and PAO guidance                                                                           |
| Barcode generator — SVG download                                                       | `quickkit-barcode-code128-quickkit-2026.svg`, 3,021 bytes, valid `<svg>`                                                                                         |

### 2.2 Camera (synthetic device — see limitations)

Chromium started with `--use-fake-device-for-media-stream`; context granted
`camera`; `/tools/barcode-scanner` at 390 × 844.

| Check                             | Result                                                                                                                   |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `enumerateDevices()` video inputs | 1                                                                                                                        |
| Start camera                      | stream acquired, `<video>` playing, `640 × 480`, readyState ≥ 2                                                          |
| Stop camera                       | button appears; after stop **every track `readyState === "ended"`**                                                      |
| Page errors                       | 0                                                                                                                        |
| Torch control                     | not offered — the synthetic track reports no torch capability, which is the built-in behaviour for a track that lacks it |

---

## 3. Core Web Vitals (mobile)

Method: Chromium, 390 × 844, CPU throttled 4×, network shaped to ~9 Mbps
down / 1.5 Mbps up with 70 ms latency. LCP from `largest-contentful-paint`,
CLS from `layout-shift` (recent input excluded), 1.2 s settle after `load`.

| Page                        | LCP    | CLS   | Transfer | Note                                                  |
| --------------------------- | ------ | ----- | -------- | ----------------------------------------------------- |
| `/tools/barcode-generator`  | 656 ms | 0.000 | 571 KB   | encoder payload dominates                             |
| `/tools/batch-studio`       | 472 ms | 0.000 | 301 KB   |                                                       |
| `/tools/batch-code-checker` | 488 ms | 0.000 | 40 KB    | **was LCP 1,664 ms / CLS 0.145** before the fix below |
| `/tools/gs1-intelligence`   | 448 ms | 0.000 | 27 KB    |                                                       |
| `/tools/product-lookup`     | 380 ms | 0.000 | 24 KB    |                                                       |

### 3.1 The CLS defect, and what caused it

`/tools/batch-code-checker` wrapped its form in
`<Suspense fallback={null}>` because the component called `useSearchParams()`.
On a statically generated page that makes the whole workspace client-only: the
HTML arrived without the 1,669 px form, which then appeared ~500 ms later and
pushed the brand directory down — a measured **0.145 CLS** shift, attributed by
`layout-shift` sources to `section.x2Nsca_directory` and `p.privacy-inline`.

Fix: the `?brand=` preset is now read with
`useSyncExternalStore(subscribe, () => location.search, () => "")`, which is
hydration-safe, and the boundary was removed. The form is now in the static HTML
(verified: `curl … | grep x2Nsca_form` matches, no Suspense marker), CLS is
0.000 on both a warm and a cold run, and LCP dropped 1,664 → 488 ms.

A second-order bug was fixed with it: clearing the brand after arriving with
`?brand=` used to restore the preset. A `null` choice now means "cleared" and is
distinct from "not chosen yet"; the UI test drives both paths.

---

## 4. SEO — both launch states

The site has a deliberate launch gate (`lib/launch.ts`): indexing requires
`SITE_URL` **and** `LAUNCH_APPROVED=true`. Both states were measured.

### 4.1 Gate closed (default, what `npm run build` ships)

| Check                                    | Result                                              |
| ---------------------------------------- | --------------------------------------------------- |
| `/robots.txt`                            | `User-Agent: *` / `Allow: /ads.txt` / `Disallow: /` |
| `<meta name="robots">` on all nine pages | `noindex, nofollow`                                 |
| `/sitemap.xml`                           | valid XML, **0 URLs**                               |

This is the intended closed state, not a defect: nothing is indexable until the
owner sets the two variables.

### 4.2 Gate open (`SITE_URL=https://quickkit.app LAUNCH_APPROVED=true`)

| Page                        | Status | Title | Description | Canonical                   | Robots        | H1  |
| --------------------------- | ------ | ----- | ----------- | --------------------------- | ------------- | --- |
| `/tools/barcode-generator`  | 200    | 53    | 154         | `/tools/barcode-generator`  | index, follow | 1   |
| `/tools/barcode-scanner`    | 200    | 58    | 133         | `/tools/barcode-scanner`    | index, follow | 1   |
| `/tools/barcode-developer`  | 200    | 60    | 153         | `/tools/barcode-developer`  | index, follow | 1   |
| `/tools/batch-studio`       | 200    | 58    | 151         | `/tools/batch-studio`       | index, follow | 1   |
| `/tools/batch-code-checker` | 200    | 59    | 139         | `/tools/batch-code-checker` | index, follow | 1   |
| `/tools/gs1-intelligence`   | 200    | 57    | 151         | `/tools/gs1-intelligence`   | index, follow | 1   |
| `/tools/product-lookup`     | 200    | 58    | 158         | `/tools/product-lookup`     | index, follow | 1   |
| `/tools/qr-code-scanner`    | 200    | 60    | 147         | `/tools/qr-code-scanner`    | index, follow | 1   |
| `/guides/barcode`           | 200    | 57    | 155         | `/guides/barcode`           | index, follow | 1   |

- `/robots.txt`: three groups (`*`, `Googlebot`, `Mediapartners-Google`), each
  `Allow: /` with `Disallow: /api/`, plus `Sitemap: https://quickkit.app/sitemap.xml`.
- `/sitemap.xml`: **132 URLs, 0 duplicates**, of which **68** are barcode-related
  (tools, the guide and the 59 brand records). **All 68 returned HTTP 200.**
- JSON-LD on the eight tool pages: `Organization`, `WebSite`, `SearchAction`,
  `BreadcrumbList`/`ListItem`, `WebApplication`, `Offer`, `FAQPage`/`Question`/
  `Answer`. `/guides/barcode` carries the site-level graph only — it renders no
  visible breadcrumb, and the repo's rule is to emit `BreadcrumbList` only where
  the trail is on screen, so its absence is correct rather than missing markup.
- Internal links per page: 32–33, and 91 on the batch-code checker (brand
  directory).

**No indexing is claimed.** Google Search Console access is not available from
this environment; this section proves the markup and sitemap a crawler would
receive, not that Google has crawled or indexed anything.

---

## 5. Product lookup network failure — root cause

`GET /api/product-lookup?gtin=4006381333931` answers 502 with
`"reason":"network"` in this sandbox. Probes isolate why.

| Probe                                      | Result                                                                       |
| ------------------------------------------ | ---------------------------------------------------------------------------- |
| DNS (`dns.lookup world.openfoodfacts.org`) | resolves to `151.115.132.10`                                                 |
| TCP connect `:443`                         | **connects in 176 ms** (egress proxy accepts the socket)                     |
| TLS handshake                              | `SSL_ERROR_SYSCALL`, `unexpected eof while reading`, **no peer certificate** |
| Plain HTTP `:80`                           | `curl: (52) Empty reply from server`                                         |
| `registry.npmjs.org:443` (allow-listed)    | TLS completes, HTTP 200 in 0.05 s                                            |
| `api.github.com` (allow-listed)            | HTTP 200                                                                     |
| `world.openbeautyfacts.org:443`            | same TLS reset                                                               |

Conclusion: name resolution and TCP are fine; the sandbox allow-list terminates
the TLS handshake for every host it does not permit, so no HTTP request is ever
sent to Open Food Facts. This is an environment restriction, not an OFF outage
and not an application bug — which is exactly what the route reports. It cannot
be fixed from inside the repo, and no mock or cached product is substituted.

A second, real defect was found while auditing the route and is fixed:

- `lookupProduct()` used `redirect: "follow"`, so OFF's edge could have sent the
  server to any host, including `169.254.169.254`. Redirects are now followed by
  hand (`redirect: "manual"`), each hop is validated against
  `offFamilyHost()` (the four databases plus national/`images`/`static`
  subdomains only), hops are capped at 3, and a blocked hop is reported instead
  of requested. `tests/product-lookup-redirect-guard.test.ts` covers the national
  redirect, the off-family redirect, an `http` downgrade, a self-redirect, the
  hop budget, the 504 timeout mapping, the 502 upstream-status mapping, and a
  caller-supplied `&url=`/`&host=` that must be ignored (the request still went
  to `world.openfoodfacts.org`).

---

## 6. Batch-code research — what was checked, and the null result

| Check                          | Result                                                               |
| ------------------------------ | -------------------------------------------------------------------- |
| Brand records                  | 59, all `decoderId: "none"`                                          |
| Duplicate slugs                | 0                                                                    |
| Alias collisions               | 0                                                                    |
| Unique official guidance hosts | 57 → **59** after two records were completed                         |
| Records without a guidance URL | 2 (`avene`, `cle-de-peau`) → **0**                                   |
| Records with shelf-life months | 59/59, all `confidence: "guidance"`                                  |
| `lastVerified` non-null        | 0 of 59 (no record has been checked against a manufacturer document) |
| Verified brand decoders        | **0 of 59**                                                          |

Two URLs were added only after the pages were fetched successfully:
`https://www.aveneusa.com` (avene.com redirects there) and
`https://www.cledepeaubeaute.com`, both HTTP 200 on 2026-11-13.

Searches for manufacturer-published lot-code documentation returned
`skincarisma.com`, `lotexp.com`, `nanamall.com` and `perfumeson.com` — third-party
checkers that publish unverifiable per-brand rules and cite no manufacturer.
They were rejected as evidence, so no decoder was added.

What did ship is the mechanism that makes a future decoder safe:
`lib/tools/batch-code/brand-decoders.ts` (registry, `validateBrandDecoder`,
`decodeBrandCode`) plus the hook in `check.ts` that turns a matched brand rule
into a `verified` manufacture date carrying its evidence URL. Fourteen tests
prove that a decoder cannot be registered without https evidence, a read date and
at least two reproducible vectors, that an unreproducible vector fails validation,
that the shipped registry is empty and consistent with every brand record, and
that a printed date still outranks a decoder.

---

## 7. What did not run

| Item                                                                                    | Why                                                                               | Classification |
| --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | -------------- |
| Real phone camera (permissions prompt, rear/front switch, torch, repeated scans, glare) | no camera hardware in this sandbox                                                | **BLOCKED**    |
| Live Open Food Facts success path (`found`), 404, 429 against the real API              | egress allow-list resets TLS to OFF                                               | **BLOCKED**    |
| Any second product provider end to end                                                  | no provider can be reached from here; terms not yet approved for adoption         | **BLOCKED**    |
| Firefox / WebKit                                                                        | browser download hosts are not reachable                                          | **BLOCKED**    |
| Google Search Console indexing confirmation                                             | no Search Console access                                                          | **BLOCKED**    |
| Axe/WCAG sweep of the nine pages                                                        | not part of this phase's scope; earlier phases recorded 0 violations on 68 routes | **NOT RUN**    |

---

## 8. Reproducing this evidence

```bash
# static gates
npx tsc --noEmit
npm run lint
npx vitest run --reporter=dot
npm run build && npx next start -H 0.0.0.0 -p 3010

# browser
npm i --no-save @sparticuz/chromium@153.0.0
node scripts/prepare-headless-chromium.mjs
LD_LIBRARY_PATH=/tmp/quickkit-chromium/lib node <playwright-script>.mjs

# indexing state
SITE_URL=https://quickkit.app LAUNCH_APPROVED=true npx next dev -p 3011
curl -s localhost:3011/robots.txt
curl -s localhost:3011/sitemap.xml | grep -c "<loc>"
```

The Playwright scripts used for this phase were scratch files: they lived in the
repository root, they were deleted after the runs recorded above, and nothing in
the shipped product depends on them.
