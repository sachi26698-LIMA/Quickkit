# Phase 19 — accuracy, privacy and security review

Scope: the four new pages, the studio's 2D tab, the scanner changes and the one
server route this phase touched (`app/api/product-lookup/route.ts`).

## 1. Server-side validation

| Surface          | Validation                                                                                                                                 | File                |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------- |
| Lookup query     | `normalizeGtin` accepts 8/12/13/14 digits **with a valid check digit**; anything else is a 400 without an outbound fetch                   | `product-lookup.ts` |
| Upstream request | fixed URL built from the validated digits; `redirect: "manual"`; 6 s timeout; JSON parsed through `parseProductPayload` with a shape check | `lookupProduct`     |
| Image proxy      | host allow-list (`offAssetHost`), MIME allow-list (`image/jpeg                                                                             | png                 | webp`), declared and actual size cap 2 MB, `nosniff`, `CSP: default-src 'none'; sandbox`, 6 s timeout | `route.ts` |
| Rate limit       | token bucket per client (15 reads/min, matching the database's published limit), 429 with `Retry-After`                                    | `lookup-cache.ts`   |
| Cache            | process-local, TTL by result kind; `no-store` for failures so an outage is not cached as truth                                             | `lookup-cache.ts`   |

The endpoint accepts **one** parameter. It cannot be pointed at another host, another
path, an image URL or a batch code — the SSRF surface is the single string that must pass
`normalizeGtin` before it is interpolated into a fixed URL.

## 2. Client-side validation

- Studio input is validated by the encoder (`validate.ts`) before anything is painted;
  the 2D panel validates byte length per format (`MAX_BYTES`) before calling bwip-js.
- Batch studio rejects files over 5 MB, caps at 1,000 rows / 30 columns / 1,500 chars per
  cell, and reports truncation rather than silently processing part of a file.
- Image analyser rejects non-image MIME types and files over 12 MB, then downscales to a
  1,400 px working copy before reading pixels.

## 3. Privacy

- **No accounts, no signup, no cookies for these tools.** The lookup page stores nothing
  about the visitor; the server cache is keyed by GTIN only and holds no client identity.
- **Scan history is local.** `lib/tools/barcode-scanner/history.ts` writes to
  `localStorage`, is opt-out ("Remember scans"), caps at 100 entries and is cleared by a
  button. A typed value is stored with source `pasted` and labelled **Typed** in every
  view, so history can never be presented as camera evidence.
- **No PII logging.** No page logs values, GTINs, images or timestamps; there is no
  analytics call in any of the new components.
- **No secret exposure.** No API key, token or credential is needed by any of these tools.
  The lookup proxy needs none: Open Food Facts product reads are unauthenticated.
- **Outbound requests, complete list:** the lookup proxy (only a GTIN), and the browser's
  own fetch of `/api/product-lookup` on this origin. Everything else — encoding, raster,
  PDF, ZIP, decode, analysis, comparison, CSV export — runs in the tab.

## 4. Accuracy rules enforced in code

| Rule                                                                 | Enforcement                                                                                                  |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| A check digit does not imply a licensed GS1 number                   | Copy on studio, scanner, GS1 page, lookup page, guide; `toGtin14` returns the padded number and nothing more |
| A barcode is not a batch code                                        | Scanner's fact panel; batch checker is a separate tool                                                       |
| A community record is not a manufacturer statement                   | `manufacturerVerified: false` literal type; disclosure string appended server-side                           |
| A missing record is not a fake barcode                               | 404 copy on the page                                                                                         |
| An analysed photo is not a graded symbol                             | `analyze.ts` docblock + on-result disclaimer (ISO/IEC 15416 / 15415 named as _not_ applied)                  |
| A batch code cannot be turned into a date without a published scheme | Batch checker's VERIFIED / ESTIMATED / NOT DECODABLE separation (unchanged this phase)                       |

## 5. Abuse protection

- The token bucket is per process and per client key; it degrades to 429 rather than
  queueing.
- The image proxy caps bytes before and after download, so a hostile upstream cannot
  stream an unbounded body through the site.
- Batch encode and ZIP creation are bounded by row and file caps; a 1,000-row batch is the
  documented maximum and the UI reports when a file exceeds it.

## 6. Residual risks

1. **In-memory rate limiting** is per instance. On a multi-instance deployment the
   effective limit multiplies; a shared store would be needed for a strict global limit.
2. **Community data accuracy** cannot be fixed by code. The UI's job is to label it, which
   it does.
3. **bwip-js 2D renderer** runs in the page; a malformed option could throw. Every call is
   wrapped, and the failure is surfaced as a message rather than a blank preview.
