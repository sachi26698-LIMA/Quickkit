# QUICKKIT Phase 21 — real data engine & existing-tool upgrade

**Branch** `arena/6102e674-quickkit` · continuing from Phase 20 commit `6a715f0`
**Date** 14 November 2026 (UTC) · Node 22.22.3 · Next 16.4.3 · React 19.3.1
**No new tools, no new pages, no catalog changes.** Nothing pushed, merged,
deployed or indexed.

---

## 0. The acceptance criterion, stated plainly

> Scan a genuine product barcode → decode its actual value → identify the
> identifier type → query a real product database when applicable → show the
> available genuine product information.

**PASS in the application, PARTIAL in this environment.** The scanner now does
all five steps in one flow: it decodes, classifies the value (GTIN-8/12/13/14,
GS1 element string, GS1 Digital Link, or ordinary text), fires the product lookup
automatically when — and only when — the value is a validated product number, and
renders every field the database actually returned, including an explicit list of
the fields it did not. What cannot be shown here is a **live** product record: this
sandbox's egress allow-list resets the TLS handshake to `world.openfoodfacts.org`
(evidence in §3), so every live lookup ends in an honest "Lookup unavailable"
state. The full success path was therefore verified in the browser against a
response shaped exactly like the documented v3.6 payload, and that is labelled as
intercepted everywhere it appears — no live success is claimed.

---

## 1. Every existing tool, and what changed

| Tool                                                            | Change this phase                                                                      | Class                     |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------- |
| Barcode Scanner                                                 | New identity classification + full product card + seven actions                        | **UPGRADED**              |
| Product Lookup                                                  | New fields; `?gtin=` deep link now performs the lookup                                 | **UPGRADED**              |
| Shared lookup engine (`product-lookup.ts`, `product-export.ts`) | Manufacturer, packaging, origin, description; wider `fields` request; export schema v2 | **UPGRADED**              |
| Barcode Generator                                               | Re-verified: 12 readable formats, independent ZXing decode, SVG download (3,021 B)     | **VERIFIED**              |
| Batch Studio                                                    | Re-verified: 5-format sample → 89,351 B ZIP, 5 folders + README                        | **VERIFIED**              |
| Batch Code Checker                                              | Re-verified: 59 brands, 0 decoders, GS1 string → VERIFIED with AI 17 date              | **VERIFIED**              |
| GS1 Intelligence                                                | Re-verified: AI 01/10/17 parse, 2027-09-30, LOT-9                                      | **VERIFIED**              |
| Barcode Developer                                               | Re-verified: format comparison + real validation live in the page                      | **VERIFIED**              |
| QR & Barcode Scanner                                            | Unchanged; regression-tested in the 18-visit sweep                                     | **VERIFIED**              |
| Image upload / camera path                                      | Synthetic-device lifecycle re-verified after the scanner rewrite                       | **PARTIAL** (no hardware) |

### 1.1 Scanner — the scan-to-information flow

A decoded string is now classified once, in
`lib/tools/barcode-scanner/identify.ts`, and that single answer drives the badge,
the check-digit line, the GS1 table and whether a lookup happens at all:

| Input                                                       | Classification                                           | Lookup?           |
| ----------------------------------------------------------- | -------------------------------------------------------- | ----------------- |
| `0731946697725`                                             | GTIN-13, check digit 5 valid, canonical `00731946697725` | yes               |
| `0731 9466 97725`                                           | same GTIN-13 (grouping separators removed, not guessed)  | yes               |
| `96385074` / `036000291452` / `09501101530003`              | GTIN-8 / GTIN-12 / GTIN-14                               | yes               |
| `(01)09506000134352(17)270930(10)LOT-9`                     | GS1 element string, 3 AIs, GTIN validates                | yes, for the GTIN |
| `https://example.com/01/09506000134352/10/LOT-42?17=251231` | GS1 Digital Link                                         | yes, for the GTIN |
| `04005808147709`                                            | text — GTIN-14 whose check digit should be 0, not 9      | **no**            |
| `(01)04005808147709(17)270930`                              | text, quoting the GS1 parser's check-digit rejection     | **no**            |
| `INV-2026-0042`                                             | decoded text, explicitly not a product number            | **no**            |
| `https://example.com/catalogue?page=2`                      | text — a URL, but not a Digital Link                     | **no**            |
| `123456789012345`                                           | text — 15 digits is not a GTIN length                    | **no**            |

The result card shows: decoded number, symbology, identifier type, check-digit
verdict (with the digit it would have needed), raw content, and — for a GS1
carrier — a table of Application Identifiers with human-readable dates. A GTIN is
looked up **once per value per visit**; a value that is not a validated product
number produces a sentence saying so and makes no request at all (verified: 0
requests for `INV-2026-0042`).

### 1.2 The product card

Rendered only from what the database returned: image (through the same-origin
proxy), name, brand, **manufacturer**, category, **net quantity**,
**packaging**, **country of origin**, **description (generic name)**,
ingredients, allergens, nutrition rows, source, last-edited date, and licence.
Every field that is absent is listed in a "Not provided by this record" block —
quantity, image, category, ingredients, allergens, nutrition, manufacturer,
packaging, country of origin, description — with the statement that these are
absent from the database, not hidden by QUICKKIT.

Actions: copy barcode, copy product details (a text summary that writes "not
recorded" rather than omitting lines), share (Web Share, clipboard fallback),
download JSON, download CSV, open the original record, and scan another product.
The JSON is schema `quickkit.product-lookup/2`; both exports carry the ODbL/CC-BY-SA
attribution, the source URL and the missing-field list.

---

## 2. Actual scanner output

Typed GTIN in a real Chromium session against the production build (mobile
390 × 844):

```
Decoded number   0731946697725
Symbology        Typed value
Identifier       GTIN-13 — 13 digits, canonical form 00731946697725
Check digit      Valid — the last digit (5) matches the GTIN-13 check digit.
Raw content      0731946697725
→ lookup requested: /api/product-lookup?gtin=0731946697725  (exactly 1 request)
→ Lookup unavailable — "The barcode itself is unaffected…"
```

With a v3.6-shaped response intercepted by the test harness (this is the only
place a product record appears; it is not a live response):

```
Example Cough Syrup 100 ml
Example Labs · 100 ml
Open Food Facts · last edited 2026-11-12 · image CC-BY-SA
GTIN 0731946697725 · Brand Example Labs · Manufacturer Example Laboratories Pvt Ltd
Category Medicines, Cough syrups · Net quantity 100 ml
Packaging Carton box with glass bottle · Country of origin India
Description (generic name) Honey-based cough syrup
Ingredients Aqua, glycerin, honey, citric acid · Allergens en:none-declared
Nutrition: Energy 120 kcal, Sugars 28 g, Salt 0.02 g
Not provided by this record: image
→ JSON 1,494 B (schema v2, attribution present)
→ CSV 970 B (attribution present)
```

---

## 3. Actual product-lookup evidence

### 3.1 Live network probe (this environment, 14 Nov 2026)

| Probe                                                 | Result                                                       |
| ----------------------------------------------------- | ------------------------------------------------------------ |
| `dns.lookup world.openfoodfacts.org`                  | resolves to `151.115.132.10`                                 |
| `curl https://world.openfoodfacts.org/api/v3.6/…`     | `SSL_ERROR_SYSCALL` — no peer certificate                    |
| `curl http://…:80`                                    | `Empty reply from server`                                    |
| `registry.npmjs.org`, `api.github.com` (allow-listed) | TLS completes, HTTP 200                                      |
| `GET /api/product-lookup?gtin=0731946697725`          | **502** `{"status":"error","reason":"network"}`              |
| `GET /api/product-lookup?gtin=123`                    | **400** `{"status":"invalid"}` — rejected before any request |

The failure is environmental: DNS and TCP work, the TLS handshake is terminated
by the sandbox allow-list. The application reports it as `network`, never as
"product not found".

### 3.2 Integration terms, as implemented

| Requirement        | Implementation                                                      |
| ------------------ | ------------------------------------------------------------------- |
| Endpoint           | `GET /api/v3.6/product/{gtin}?product_type=all&fields=…`            |
| User-Agent         | `QUICKKIT-BarcodeScanner/1.2 (https://quickkit.online[; contact])`  |
| Data licence       | ODbL 1.0 — attributed on the card, in CSV, in JSON                  |
| Image licence      | CC-BY-SA — attributed when an image is shown                        |
| Rate limiting      | process-local token bucket (10 per minute) before any upstream call |
| Caching            | TTL cache; 1 h for found/not-found, no-store for failures           |
| GTIN validation    | check digit validated in the browser **and** in the route           |
| Redirects          | followed by hand, hop-validated against the OFF family, max 3       |
| Missing fields     | enumerated, never filled                                            |
| Manufacturer claim | always `false`; the card says "volunteers — not the manufacturer"   |

### 3.3 Other databases

USDA FoodData Central was evaluated in Phase 20 and again here: public-domain
(CC0) data and a documented API, but every request needs a data.gov key the holder
must keep private, it is US-food-only, and it is unreachable from this sandbox.
**Not integrated** — adding an unverifiable provider would ship a path nobody
could test. No other provider met the bar (availability + terms + commercial use +
reachability). Open Beauty Facts and Open Products Facts are already covered by
the same OFF call (`product_type=all`) and the same ODbL terms.

---

## 4. Database sources

| Source                              | Role                                            | Licence                            | Status                                  |
| ----------------------------------- | ----------------------------------------------- | ---------------------------------- | --------------------------------------- |
| Open Food Facts v3.6                | the only product database queried               | ODbL 1.0 (data), CC-BY-SA (images) | **integrated, live path BLOCKED here**  |
| Open Beauty/Products/Pet Food Facts | same API family, reaches via `product_type=all` | ODbL 1.0                           | integrated through OFF                  |
| USDA FoodData Central               | evaluated                                       | CC0 1.0                            | **not integrated** (key + reachability) |
| GS1 General Specifications          | AI meanings, check digits, dates                | published standard                 | integrated (reference, not a live API)  |

---

## 5. Verified and unsupported barcode formats

Readable (12): Code 128, Code 39, Code 93, EAN-13, EAN-8, UPC-A, UPC-E, ITF-14,
Codabar, QR Code, Data Matrix, PDF417 — the independent-decode suite (`zxing-wasm`
C++ ZXing) passes 99 tests across the round-trip and Code 93 cases.

Not supported: GS1 DataBar (all variants), Aztec, MaxiCode, Composite. The
scanner's format list is generated from what the decoder actually implements, so
these are never advertised.

Carrier honesty: a GTIN is looked up only for symbologies that can legitimately
carry one (EAN/UPC/ITF-14/GS1-128/2D), and only when the digits validate.

---

## 6. Manufacturer decoder verification

Unchanged and still **0 of 59**. Every brand record keeps `decoderId: "none"`,
`lastVerified: null`, and says "Never reviewed against a manufacturer document".
The Phase 20 mechanism (https evidence + read date + two reproducible vectors,
enforced by `validateBrandDecoder`) remains the only way a decoder can ship, and
no manufacturer document describing a lot-code date rule has been found. The
batch checker still returns NOT DECODABLE for those brands while reading GS1
carriers correctly (verified in the browser: AI 17 → 30 Sep 2027).

---

## 7. Tests

| Gate                       | Result                                                     |
| -------------------------- | ---------------------------------------------------------- |
| `npx vitest run`           | **128 files / 2,160 tests passed** (Phase 20: 125 / 2,135) |
| `npx tsc --noEmit`         | 0 errors                                                   |
| `npm run lint`             | 0 errors, 0 warnings                                       |
| Prettier                   | every changed file clean                                   |
| `npm run build`            | 143/143 static pages                                       |
| `npm audit` / `--omit=dev` | 0 vulnerabilities / 0 vulnerabilities                      |

New tests this phase: `tests/scanner-identify.test.ts` (13),
`tests/scanner-product-intelligence.test.tsx` (8),
`tests/product-lookup-deeplink.test.tsx` (2), plus 2 additions to
`tests/product-lookup-intel.test.ts` (new fields, origin fallback) and fixture
updates that keep the missing-field list honest. No existing test was weakened;
two assertions changed because the JSON schema moved to v2 and the fixture now
carries the new fields.

---

## 8. Desktop and mobile results

18 visits — nine barcode pages × 1280 px and 390 px — **all HTTP 200, zero
horizontal overflow, zero page errors**, plus these interactions:

| Interaction                                    | Result                                                              |
| ---------------------------------------------- | ------------------------------------------------------------------- |
| Scanner, typed GTIN (live)                     | GTIN-13, check digit valid, 1 lookup, honest failure                |
| Scanner, typed GTIN (intercepted v3.6 payload) | every field rendered, JSON + CSV downloads verified                 |
| Scanner, typed spaced GTIN `0731 9466 97725`   | recognised as the same GTIN-13, 1 lookup                            |
| Scanner, `INV-2026-0042`                       | decoded text, **0 requests**, explanation shown                     |
| Scanner, bad check digit                       | rejected locally, 0 requests                                        |
| Product lookup, `?gtin=` deep link             | lookup now runs automatically; all fields + CSV (24 rows)           |
| Generator, SVG                                 | 3,021 B valid `<svg>`                                               |
| Batch studio, mixed sample                     | ZIP 89,351 B, 5 format folders + `README.txt`                       |
| GS1 intelligence                               | GTIN, 2027-09-30, LOT-9                                             |
| Camera (synthetic device)                      | stream plays 640×480, Stop ends every track, torch correctly absent |

Mobile Core Web Vitals (390 px, 4× CPU, ~9 Mbps): scanner **LCP 828 ms, CLS
0.000**; product lookup **LCP 480 ms, CLS 0.000**.

SEO regression: with the launch gate closed — the shipped default — robots
disallows all and the sitemap is empty; with `SITE_URL` + `LAUNCH_APPROVED=true`
all nine pages carry unique titles (53–60 chars), descriptions (133–158),
canonicals, `index, follow`, one H1 and JSON-LD, and the sitemap still lists
**132 URLs with 0 duplicates**. No Google indexing is claimed.

---

## 9. Security and performance findings

- **Fixed:** `?gtin=` on the product lookup page previously only filled the input.
  It now runs the lookup, through a hydration-safe read of the query string — no
  new dynamic rendering, no Suspense boundary.
- **Fixed:** a searched value is looked up once per value per visit. Before, the
  scanner required a manual button press per result; the automatic path could
  otherwise have burned the token bucket on repeat frames.
- **Confirmed:** GTIN validation happens before any request, in the browser and
  in the route; a 15-digit or bad-check-digit value never leaves the page.
- **Confirmed:** redirects are followed by hand and hop-validated (Phase 20),
  images are proxied same-origin, size-capped and type-checked.
- **Confirmed:** no user images are uploaded; camera frames stay in the tab; scan
  history is opt-in and stored locally only.
- **Performance:** no regression — the scanner grew a result card and a product
  card, and still measures CLS 0.000 with LCP 828 ms on a throttled phone.
- `npm audit` reports 0 vulnerabilities (production and full trees).

---

## 10. Remaining blockers

| Blocker                                    | What is needed                                          | Classification              |
| ------------------------------------------ | ------------------------------------------------------- | --------------------------- |
| Live product records                       | a network that can reach `world.openfoodfacts.org`      | **BLOCKED** (environment)   |
| Second provider end to end                 | approved terms + secret-managed key + live verification | **BLOCKED** (owner/network) |
| Real phone camera, torch, device switching | a physical device against a reachable build             | **BLOCKED** (no hardware)   |
| Manufacturer lot-code decoders             | a manufacturer document describing the format           | **BLOCKED** (research)      |
| Google indexing                            | Search Console confirmation                             | **BLOCKED** (no access)     |
| Firefox / WebKit                           | reachable browser download hosts                        | **BLOCKED** (environment)   |

Everything above that could be exercised from here was exercised; the one thing
this environment cannot do is prove a live third-party record, and no test or
report here pretends otherwise.
