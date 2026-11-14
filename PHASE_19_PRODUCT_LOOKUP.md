# Product lookup — data source, contract, failure taxonomy

Module: `lib/tools/barcode-scanner/product-lookup.ts`
Proxy: `app/api/product-lookup/route.ts`
Export helpers: `lib/tools/barcode-scanner/product-export.ts`
Page: `/tools/product-lookup`
Tests: `tests/product-lookup-intel.test.ts` (9), `tests/product-lookup-v3.test.ts` (19)

## Source and licence

- **Database:** Open Food Facts, product API **v3.6**
  (`https://world.openfoodfacts.org/api/v3/product/<gtin>.json`), fields restricted to
  `product_name,brands,quantity,categories,ingredients_text,allergens,nutriments,last_modified_t,image_front_url`.
- **Data licence:** ODbL 1.0. **Image licence:** CC-BY-SA. Both are emitted in exports and
  rendered on the page.
- **Attribution** names the answering server (`offAssetHost`) because the project runs
  several (world / in / us …); the host is part of the record.
- The record is **never** described as manufacturer-verified: `manufacturerVerified` is
  the literal type `false`, and every export writes it.

## Response contract

```
GET /api/product-lookup?gtin=3017620422003

200  { status: "found", product: {...}, disclosure }
400  { status: "invalid", message }                    // not a GTIN with a valid check digit
404  { status: "not-found", message }                  // no community record
429  { status: "rate-limited", message, retryAfterSeconds }   + Retry-After
502  { status: "error", reason: "upstream"|"network"|"response", message, upstreamStatus? }
504  { status: "error", reason: "timeout", message }
```

`X-Quickkit-Cache: HIT|MISS` reports whether the process-local cache answered.

## Failure taxonomy (deliberately not merged)

| Condition               | reason / status                     | What the user is told                                               |
| ----------------------- | ----------------------------------- | ------------------------------------------------------------------- |
| GTIN bad check digit    | local, no request                   | "Nothing was sent to the database."                                 |
| No record               | `not-found` / 404                   | A missing record is not a fake barcode.                             |
| Token bucket empty      | `rate-limited` / 429                | Wait; retrying makes it worse.                                      |
| Upstream 5xx            | `upstream` / 502 + `upstreamStatus` | The database failed; the product is not implicated.                 |
| Request timed out       | `timeout` / 504                     | The server's fetch exceeded its own timeout.                        |
| DNS/TLS/connect failure | `network` / 502                     | No response arrived at all.                                         |
| Unparseable body        | `response` / 502                    | The database answered with something that is not a product payload. |

## Field completeness

`parseProductPayload` builds a record and then **derives** `missing[]` from what the
payload lacks: `image`, `brand`, `quantity`, `category`, `ingredients`, `nutrition`,
`allergens`. The UI lists those names and shows an empty field as empty; it never fills
an absent ingredient statement with a typical recipe.

Nutrition rows come from `nutritionRows(nutriments)` and are limited to a documented set
(energy kcal/kJ, fat, saturates, carbohydrate, sugars, fibre, protein, salt, sodium) per
100 g/ml. Unknown keys are ignored rather than displayed under a guessed label.

## Exports

- **CSV** — two columns (`field,value`), including source host, source URL, both
  licences, `manufacturer verified,false` and the missing-field list.
- **JSON** — `schema: "quickkit.product-lookup/1"`, `exportedAt`, the product object and a
  `source` block with the same attribution.
- Both are generated in the browser; no export is uploaded anywhere.

## Measured in this sandbox (2026-11-13)

| Request               | Result                                                                                       |
| --------------------- | -------------------------------------------------------------------------------------------- |
| `?gtin=12345`         | HTTP 400 (local validation; no outbound request)                                             |
| `?gtin=4006381333931` | HTTP 502, `reason:"network"`, 42 ms — the sandbox egress allow-list blocks openfoodfacts.org |

The 502 is the honest sandbox result. It is recorded here so the network path is not
mistaken for a passing live lookup: **the live upstream fetch has not been observed
succeeding in this environment**, and the UI is written to say exactly that rather than
show a spinner forever.
