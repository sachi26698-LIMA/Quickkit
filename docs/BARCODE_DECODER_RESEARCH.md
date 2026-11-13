# Batch/lot code research log — what is publicly documented, and what is not

**Checked on:** 2026-11-13
**Scope:** the 59 brands in `lib/tools/batch-code/brands.ts`
**Question:** can a date be decoded from a cosmetics lot code using a source the
project is allowed to cite — a manufacturer document, a standards body, or a
regulator?
**Answer:** no, for every one of the 59 brands. This document records the search,
the sources, and the rule used to decide, so the conclusion can be re-checked
rather than taken on trust.

---

## 1. The evidence rule

A brand-specific decoder is only added when **all four** of these are true:

1. a primary source exists — the manufacturer, a standards body, or a regulator;
2. the source states the **code layout** (which characters mean what), not just
   that a batch code exists;
3. the source states the **date rule** (e.g. "the first digit is the year, the
   next two are the week"), including any century window;
4. the rule is checkable against at least two independently described examples.

Anything short of that is not a decoder. It is a guess with a citation glued to
it. A source that says "batch codes are printed on the pack" fails test 2, and a
source that says "the code looks like 38U60" fails test 3.

Two further constraints apply to this project:

- **No scraping, no private data.** A decoder derived from another site's
  database or a reseller's private notes is not usable, even if it happens to be
  right.
- **No promotion.** A pattern match is shown as ESTIMATED and can never be
  labelled VERIFIED, no matter how plausible the date looks.

## 2. Sources checked, and what each actually says

| Source | URL | What it establishes | Decoder? |
| --- | --- | --- | --- |
| L'Oréal — product quality and safety | `loreal.com/en/commitments-and-responsibilities/for-our-products/product-quality-and-safety/` | Batch control and traceability exist; no code layout, no date rule | No |
| L'Oréal — quality in manufacturing | `loreal.com/en/articles/group/quality-at-the-heart-of-our-manufacturing/` | Factory-level batch control; no consumer-facing decoding rule | No |
| Beiersdorf — company FAQ | `beiersdorf.com/meta-pages/faq/company` | Confirms lot numbers are used; no format | No |
| Unilever — quality procedure PDFs (UQP700/UQP701, as indexed) | `unilever.com` | "Batch code" used as an internal identifier; no decoding rule | No |
| EU Cosmetics Regulation 1223/2009, Art. 19(1)(e) and Annex VIII (via gov.uk guidance) | `gov.uk/government/publications/cosmetic-products-enforcement-regulations-2013/...` | A batch identifier is **mandatory**; its **format is not prescribed**; the PAO symbol is defined | No — and it proves no format can be assumed |
| GS1 General Specifications — AI table (2D in retail guide) | `ref.gs1.org/guidelines/2d-in-retail/` | AI 11/13/15/16/17 are N6 `YYMMDD`; day `00` = last day of month; AI 7003 is `YYMMDDhhmm`; AI 10 batch ≤ 20 alphanumeric | **Yes — standards decoder** |
| GS1 Digital Link Standard, URI syntax 1.7.0 (Aug 2026) | `ref.gs1.org/standards/digital-link/uri-syntax/` | A QR code can carry AI 01 + 10 + 17 in a URI, in path form, query form, or both | **Yes — standards decoder** |
| Open Food Facts API docs | `openfoodfacts.github.io/openfoodfacts-server/api/` | Not batch-code related; used only for GTIN lookup (see the readiness report) | No |

Every manufacturer page above was reached; none publishes a lot-number layout.
This is consistent with the regulation: the law requires a batch identifier that
lets the manufacturer identify the batch, and deliberately says nothing about
its structure.

## 3. Sources rejected, and why

Aggregator and "batch checker" sites were found for several of these brands.
They were rejected as evidence, for one or more of:

- **They contradict each other.** For the same short code, published examples
  read it as "April 3, 2019" on one site and "April 3, 2009" on another. For
  L'Oréal, the same code shape is described simultaneously as
  letter + digits, digits + year + week, and a seven-digit fragrance format.
- **They do not cite the manufacturer.** The layouts are asserted, not sourced.
- **At least one states its algorithms are partly "privately provided by
  consultants and resellers".** That is exactly the proprietary data this
  project must not copy.
- **They cannot be tested.** No source provides a vector that can be checked
  against a pack or a manufacturer statement.

Sites consulted and rejected: `cosr.ai`, `checkcosmetic.online`,
`cosmeticcalculator.com`, `batchcodechecker.org`, `freshness.app`,
`cosmeticbatchtool.com`, and a Fragrantica forum thread. They are recorded here
so the same dead end is not re-searched, not because their content was used.

## 4. What ships instead

| Decoder id | Version | Status it can produce | Basis | Limitations |
| --- | --- | --- | --- | --- |
| `gs1-element-string` | 2.0.0 | VERIFIED | GS1 AI table: 11, 13, 15, 16, 17, 7003, 8008 + AI 10 | Only when the input really is a GS1 element string; a GTIN alone carries no date |
| `gs1-digital-link` | 1.0.0 | VERIFIED | GS1 Digital Link URI syntax 1.7.0 | Must start with a primary key (01/8006/00) and pass the same AI validation; a marketing URL is rejected |
| `explicit-date` | 1.1.0 | ESTIMATED | ISO 8601 calendar and ordinal notation (pattern basis only) | A pattern, not a brand algorithm; ambiguity shows every reading; never promoted |
| `none` | 0 | NOT DECODABLE | No public manufacturer documentation identified | The honest default for all 59 brands |

Brand-specific decoders: **0 of 59**. `brandCoverage().verified === 0`, and every
brand record carries `decoderStatus: "none"`, `lastVerified: null` and a stated
limitation. The brand pages and the directory state this; they do not imply
coverage that does not exist.

## 5. Test vectors

These are the vectors the engine is tested against
(`tests/batch-code-engine.test.ts`, `tests/product-lookup-v3.test.ts`). They are
run on every build; they are not claims about a manufacturer.

| Input | Expected |
| --- | --- |
| `(01)09501101530003(11)260101(17)270101(10)LOT-7` | VERIFIED; production `2026-01-01`, expiration `2027-01-01`, batch `LOT-7` |
| `(01)09501101530003(17)260200` | expiration `2026-02-28` (day `00` → month end) |
| `(01)09501101530003(17)260231` | rejected (30 February does not exist); no date claimed |
| `(01)09501101530003(7003)2606302359` | expiration `2026-06-30` at `23:59` |
| `(8008)202606301200` | production `2026-06-30` at `12:00` |
| `(01)09501101530004(17)251231` | rejected (GTIN check digit fails) |
| `https://id.gs1.org/01/09501101530003/17/251231/10/AB-12` | VERIFIED; expiration `2025-12-31`, batch `AB-12` |
| `https://example.com/01/09501101530003?17=251231&10=LOT9` | VERIFIED; query form accepted |
| `https://example.com/sale/17/2026` | rejected (not a GS1 Digital Link) |
| `06/2027` | ESTIMATED, one reading |
| `240506` | ESTIMATED, two readings (`2006-05-24`, `2024-05-06`) |
| `2026-317` | ESTIMATED, ISO ordinal → `2026-11-13` |
| `2026-367` | rejected (2026 has 365 days) |
| `28H300` | NOT DECODABLE |

## 6. What would change the answer

A brand record gains a decoder only if a manufacturer document (or an equally
citable source) states the layout *and* the date rule. The change would be:

1. a new entry in `DECODERS` with a version, the source URL and a checked-on
   date;
2. a decoder function with the layout, the century window and the validation
   rules written down;
3. the brand record's `decoderId`, `decoderVersion`, `decoderStatus`, `pattern`,
   `dateLogic`, `source` and `lastVerified` filled in;
4. at least two positive vectors and one rejection vector added to the suite;
5. the coverage count and the UI copy updated from the record, not retyped.

Until that happens, the record stays `none`. A plausible-looking decode with no
source is the one failure mode this tool exists to avoid.

## 7. Access notes

- The pages above were read from this development environment on 2026-11-13.
- The application runtime in this environment has **no outbound network**, so
  no live manufacturer or GS1 endpoint is called by the app, and no claim of
  live verification is made anywhere in the product.
- URLs are recorded in full so the search can be repeated by hand.
