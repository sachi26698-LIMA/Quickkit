# QUICKKIT — Keyword Research & Competitor Report


> **Historical report.** Measurements below were taken while the production
> origin was `quickkit-rosy.vercel.app`. The canonical public origin is now
> **`https://quickkit.live`** — see
> [`DOMAIN_MIGRATION_QUICKKIT_LIVE.md`](DOMAIN_MIGRATION_QUICKKIT_LIVE.md).
> Numbers are left as recorded rather than rewritten.

**Site:** `https://quickkit-rosy.vercel.app/`
**Scope:** PDF, Image, QR & Barcode, Text & Writing, Developer, Calculators, Security & Privacy
**Date:** 2026-11-16
**Status:** Research deliverable (Phase 1). Implementation is reported separately in
[`QUICKKIT_ORGANIC_GROWTH_MASTER_REPORT.md`](./QUICKKIT_ORGANIC_GROWTH_MASTER_REPORT.md).

---

## 0. How to read this document — and what is deliberately missing

This report contains **no search volumes, no keyword-difficulty scores, no rankings, no CTR
figures, no traffic estimates and no competitor traffic numbers.** None of those were available
from a first-party source while writing it, so none are stated. Anything that looks like a
number below is one of three things, and is labelled as such:

| Label          | Meaning                                                                                               |
| -------------- | ----------------------------------------------------------------------------------------------------- |
| **VERIFIED**   | Read directly out of the repository, the built HTML, or a live HTTP response. Reproducible by anyone. |
| **OBSERVED**   | Read off live third-party pages fetched during research. True of the page at fetch time; may change.  |
| **ASSUMPTION** | A judgement that is _not_ backed by data. Flagged so it can be tested, not trusted.                   |

Where a decision would normally rest on volume data and that data is unavailable, the decision is
made on **intent match, SERP composition and topical fit** instead, and the reasoning is written
down so it can be re-checked once real Search Console data exists.

> **Rule applied throughout:** no invented numbers. A missing measurement is reported as missing,
> never filled with a plausible guess.

---

## 1. Inventory — VERIFIED

Read from `lib/catalog.ts` and cross-checked against `lib/seo/tools.ts` (the metadata registry).

**56 tools across 8 categories.**

| Category           | Slug               | Tools | Tool slugs                                                                                                                                                                                                                                                    |
| ------------------ | ------------------ | ----: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PDF Tools          | `pdf-tools`        |     9 | `images-to-pdf`, `pdf-to-image`, `pdf-studio`, `merge-pdf`, `split-pdf`, `compress-pdf`, `word-to-pdf`, `pdf-to-word`, `pdf-lock-unlock`                                                                                                                      |
| Image Tools        | `image-tools`      |     4 | `image-compressor`, `image-resizer`, `image-cropper`, `image-to-image`                                                                                                                                                                                        |
| QR & Barcode       | `qr-barcode`       |     9 | `qr-generator`, `qr-code-scanner`, `barcode-generator`, `batch-code-checker`, `barcode-scanner`, `gs1-intelligence`, `product-lookup`, `batch-studio`, `barcode-developer`                                                                                    |
| Text & Writing     | `text-writing`     |     3 | `word-counter`, `case-converter`, `image-to-text`                                                                                                                                                                                                             |
| Developer Tools    | `developer-tools`  |    11 | `json-formatter`, `json-validator`, `html-formatter`, `css-minifier`, `javascript-minifier`, `base64-encoder-decoder`, `url-encoder-decoder`, `uuid-generator`, `regex-tester`, `hash-generator`, `xml-formatter`                                             |
| Calculators        | `calculators`      |    12 | `percentage-calculator`, `bmi-calculator`, `discount-calculator`, `gst-calculator`, `age-calculator`, `date-difference-calculator`, `emi-calculator`, `loan-calculator`, `scientific-calculator`, `unit-converter`, `temperature-converter`, `time-converter` |
| Security & Privacy | `security-privacy` |     9 | `hash-generator`, `password-generator`, `advanced-cryptography`, `dns-email-security`, `website-security-review`, `privacy-metadata-manager`, `url-network-privacy`, `privacy-policy-workbench`, `api-credential-tools`                                       |
| AI Tools           | `ai-tools`         |     0 | — (renders "Coming soon"; `noindex` — correct, it has nothing to rank)                                                                                                                                                                                        |

**Registry coverage: 56/56. Zero tools without a metadata record, zero records without a tool.**

---

## 2. Existing intent coverage — VERIFIED, and the skew is real

`lib/seo/registry.ts` types intent as `transactional | informational | commercial | navigational | trust`.
Measured distribution across the 56 records:

| Intent        | Count | Share |
| ------------- | ----: | ----: |
| transactional |    48 | 85.7% |
| informational |     8 | 14.3% |
| commercial    |     0 |    0% |
| navigational  |     0 |    0% |
| trust         |     0 |    0% |

**The gap is not a missing keyword list — it is 0% commercial intent.** Every tool page is
optimised to "do the thing". Nothing is optimised to "decide between things", which is exactly
where the competitor SERPs below are contested.

---

## 3. The five-way keyword grouping, applied per tool

The brief asks for **primary, secondary, long-tail, question-based, comparison/alternative**.
What already exists in the registry is two of those five:

| Group                        | Where it lives                     | Status                                     |
| ---------------------------- | ---------------------------------- | ------------------------------------------ |
| **Primary**                  | `primaryKeyword` (unique per tool) | ✅ Present, 56/56                          |
| **Secondary**                | `secondaryKeywords` (5.0 average)  | ✅ Present, 56/56                          |
| **Long-tail**                | _inside_ `secondaryKeywords`       | ⚠️ Present but **unseparated**             |
| **Question-based**           | not a registry field               | ⚠️ Covered only implicitly by on-page FAQs |
| **Comparison / alternative** | `alternativeTitles`                | ⚠️ Present, but **not surfaced as intent** |

This is the single most important structural finding: **the long-tail work is already done, it is
just filed in the wrong drawer.** Look at any record and the long-tail intent is unmistakable —
`merge-pdf` carries _"merge pdf without uploading"_, _"merge pdf on mobile"_; `compress-pdf` carries
_"compress pdf to 100kb"_, _"compress pdf for email attachment"_. Those are long-tails sitting in a
flat array with no label. Likewise `regex-tester` carries **"regex101 alternative"** — a
comparison keyword — inside `secondaryKeywords`, while its intent is tagged `transactional`.

**Decision:** do **not** rewrite 56 records into a new four-field schema. That is a large,
risk-bearing refactor of the file every metadata assertion in the suite reads from, for a
classification change that produces no new page and no new copy. Instead the grouping is recorded
here, and the _commercially useful_ part of the gap — the 0% commercial slice — is addressed by
targeting comparison intent in content, not by adding a field nobody renders.

---

## 4. Full keyword map — all 56 tools

Primary + the five recorded secondary keywords per tool. Long-tail and comparison terms are marked
inline where the existing list already contains them. Every row is **VERIFIED** from
`lib/seo/tools.ts`.

### PDF Tools (9)

| Tool              | Primary           | Secondary / long-tail recorded                                                                                                                             | Intent        |
| ----------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| `merge-pdf`       | merge pdf         | combine pdf files · **merge pdf without uploading** · join pdf pages online · **merge pdf on mobile** · reorder pdf pages                                  | transactional |
| `split-pdf`       | split pdf         | extract pages from pdf · pdf page range splitter · separate pdf into individual pages · **split pdf without uploading** · **split pdf on phone**           | transactional |
| `compress-pdf`    | compress pdf      | reduce pdf file size · **compress pdf to 100kb** · **compress pdf for email attachment** · pdf compressor without uploading · shrink scanned pdf           | transactional |
| `pdf-to-image`    | pdf to image      | pdf to jpg converter · pdf to png high resolution · convert pdf pages to images · **pdf to image without uploading** · **pdf to image 300 dpi**            | transactional |
| `images-to-pdf`   | images to pdf     | jpg to pdf converter · png to pdf · photos to pdf online · combine images into one pdf · **image to pdf on mobile**                                        | transactional |
| `pdf-lock-unlock` | pdf lock & unlock | encrypt pdf with password · unlock pdf remove password · aes 256 pdf encryption · restrict pdf printing copying · **pdf password remover free**            | transactional |
| `pdf-studio`      | pdf studio        | rotate pdf pages · reorder pdf pages · delete pages from pdf · add page numbers to pdf · pdf editor in browser                                             | transactional |
| `word-to-pdf`     | word to pdf       | docx to pdf converter · convert word document to pdf online · **word to pdf free without email** · word to pdf keep formatting · **word to pdf on mobile** | transactional |
| `pdf-to-word`     | pdf to word       | pdf to docx converter · convert pdf to editable word · scanned pdf to word ocr · **pdf to word without email** · **pdf to word on phone**                  | transactional |

### Image Tools (4)

| Tool               | Primary          | Secondary / long-tail recorded                                                                                                                            | Intent        |
| ------------------ | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| `image-compressor` | image compressor | **compress image to 100kb** · reduce jpg file size · **compress image for job application form** · webp compressor online · bulk image compression        | transactional |
| `image-resizer`    | image resizer    | resize image in pixels · **resize photo for passport size** · resize image for instagram · resize image without losing quality · bulk image resize online | transactional |
| `image-cropper`    | image cropper    | crop image online free · circle crop profile picture · crop image to 1:1 · **crop photo for whatsapp dp** · batch crop images                             | transactional |
| `image-to-image`   | image converter  | jpg to png converter · webp to jpg · png to jpg converter free · heic to jpg in browser · convert images in bulk                                          | transactional |

### QR & Barcode (9)

| Tool                 | Primary                 | Secondary / long-tail recorded                                                                                                                            | Intent        |
| -------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| `qr-generator`       | qr code generator       | qr code generator with logo · **upi qr code generator** · **wifi qr code** · vcard qr code · qr code generator free no watermark · bulk qr code csv       | transactional |
| `qr-code-scanner`    | qr code scanner         | **scan qr code from screenshot** · qr code reader online · qr scanner without app · **scan qr code on laptop webcam** · check qr code link safety         | transactional |
| `barcode-generator`  | barcode generator       | ean 13 barcode generator · code 128 barcode generator · gs1 128 label generator · barcode generator with check digit · print barcode labels free          | transactional |
| `barcode-scanner`    | barcode scanner         | scan barcode with phone camera · barcode reader online free · scan ean 13 from image · barcode scanner without app · check barcode number                 | transactional |
| `batch-code-checker` | batch code checker      | **cosmetic batch code decoder** · check product expiry by batch code · lot code lookup · **is my skincare expired batch code** · batch code checker india | transactional |
| `gs1-intelligence`   | gs1 intelligence        | gs1 128 application identifier list · gs1 element string parser · **gtin check digit calculator** · gs1 digital link builder · fnc1 explained             | informational |
| `product-lookup`     | gtin product lookup     | barcode number lookup product · open food facts search by barcode · check product ingredients by barcode · ean 13 lookup · barcode product database india | informational |
| `batch-studio`       | batch barcode studio    | csv to barcode labels · batch barcode generator svg · print barcode sheet pdf · bulk qr code from csv · barcode label generator spreadsheet               | transactional |
| `barcode-developer`  | barcode developer tools | compare gtin numbers · barcode print quality check · quiet zone too small barcode · **barcode will not scan troubleshooting** · gs1 check digit mismatch  | informational |

### Text & Writing (3)

| Tool             | Primary        | Secondary / long-tail recorded                                                                                                             | Intent        |
| ---------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------- |
| `word-counter`   | word counter   | character counter · **count words in essay** · reading time calculator · word count for twitter bio · keyword density checker              | transactional |
| `case-converter` | case converter | uppercase to lowercase converter · title case converter · camelcase converter · sentence case tool · convert text case without retyping    | transactional |
| `image-to-text`  | image to text  | ocr online free · **hindi image to text** · screenshot to text · scanned pdf to editable text · **handwriting to text ocr** · gujarati ocr | transactional |

### Developer Tools (11)

| Tool                     | Primary             | Secondary / long-tail recorded                                                                                                                          | Intent        |
| ------------------------ | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| `json-formatter`         | json formatter      | json beautifier online · json validator · minify json · sort json keys · **format json without upload**                                                 | transactional |
| `json-validator`         | json validator      | check json syntax online · **json parse error location** · validate json file · json lint online · missing comma json                                   | transactional |
| `xml-formatter`          | xml formatter       | xml beautifier online · pretty print xml · minify xml · xml validation tool · format xml soap response                                                  | transactional |
| `html-formatter`         | html formatter      | html beautifier online · minify html · format html code · html pretty print · reduce html file size                                                     | transactional |
| `css-minifier`           | css minifier        | minify css online · css compressor · reduce css file size · css optimizer free · **minify css without breaking it**                                     | transactional |
| `javascript-minifier`    | javascript minifier | minify js online · js compressor · reduce javascript size · terser minifier online · **uglify javascript alternative** _(comparison)_                   | transactional |
| `base64-encoder-decoder` | base64 encoder      | base64 decode online · base64 to text · encode file to base64 · base64 image decoder · base64url converter                                              | transactional |
| `url-encoder-decoder`    | url encoder         | url decode online · percent encoding converter · encode query string · decode url parameter · urlencode unicode                                         | transactional |
| `uuid-generator`         | uuid generator      | guid generator · uuid v4 online · generate bulk uuid · random uuid for database · **uuid without upload**                                               | transactional |
| `regex-tester`           | regex tester        | **regex101 alternative** _(comparison)_ · test regular expression online · javascript regex tester · regex replace preview · named capture group tester | transactional |
| `hash-generator`         | hash generator      | sha256 generator online · md5 hash calculator · checksum verifier · hash a file in browser · sha512 online tool                                         | transactional |

### Calculators (12)

| Tool                         | Primary                    | Secondary / long-tail recorded                                                                                                                                        | Intent        |
| ---------------------------- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| `percentage-calculator`      | percentage calculator      | percentage increase calculator · what is x percent of y _(question)_ · percentage difference calculator · reverse percentage calculator · marks percentage calculator | transactional |
| `bmi-calculator`             | bmi calculator             | bmi chart for adults · bmi calculator in kg and cm · healthy weight range calculator · bmi calculator in feet and inches · **what is a normal bmi** _(question)_      | transactional |
| `discount-calculator`        | discount calculator        | percent off calculator · sale price calculator · stacked discount calculator · discount and gst calculator · **compare two offers** _(comparison)_                    | transactional |
| `gst-calculator`             | gst calculator             | gst inclusive and exclusive calculator · cgst sgst calculator · igst calculator · reverse gst calculation · gst calculator india                                      | transactional |
| `age-calculator`             | age calculator             | **how old am i** _(question)_ · age calculator by date of birth · age in days calculator · age as on date calculator · birthday countdown                             | transactional |
| `date-difference-calculator` | date difference calculator | days between two dates · business days calculator · add days to date · date calculator online · working days excluding weekends                                       | transactional |
| `emi-calculator`             | emi calculator             | home loan emi calculator · car loan emi calculator · personal loan emi india · loan amortization schedule · emi formula in rupees                                     | transactional |
| `loan-calculator`            | loan calculator            | loan repayment calculator · loan affordability calculator · variable interest rate loan · prepayment effect on loan · loan tenure calculator                          | transactional |
| `scientific-calculator`      | scientific calculator      | scientific calculator online free · trigonometry calculator degrees · log calculator · permutation combination calculator · calculator with fractions and powers      | transactional |
| `unit-converter`             | unit converter             | length converter · kg to lbs converter · square feet to square metres · data size converter · unit conversion table                                                   | transactional |
| `temperature-converter`      | temperature converter      | celsius to fahrenheit · fahrenheit to celsius formula · kelvin to celsius converter · body temperature conversion · **oven temperature conversion**                   | transactional |
| `time-converter`             | time converter             | hours to minutes converter · add time calculator · **work hours calculator with break** · time zone converter · duration calculator                                   | transactional |

### Security & Privacy (9)

| Tool                       | Primary                     | Secondary / long-tail recorded                                                                                                                             | Intent        |
| -------------------------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| `password-generator`       | password generator          | strong random password generator · passphrase generator · password strength checker · password policy generator · 16 character password                    | transactional |
| `advanced-cryptography`    | encrypt text & files online | aes 256 encryption online · rsa key pair generator · **jwt decoder** · hmac generator · encrypt file in browser                                            | transactional |
| `dns-email-security`       | spf, dkim & dmarc checker   | email header analyzer · dmarc record lookup · dnssec status checker · **why is my email going to spam** _(question)_ · spf record generator                | informational |
| `website-security-review`  | security headers checker    | csp generator · hsts checker · cookie flags secure httponly · x frame options check · permissions policy generator                                         | informational |
| `privacy-metadata-manager` | remove exif data            | photo metadata viewer · strip gps from photo · browser privacy checker · fingerprinting explained · privacy settings checklist                             | informational |
| `url-network-privacy`      | url privacy checker         | what does this url contain _(question)_ · remove tracking parameters · redirect checker · what is my public ip _(question)_ · browser fingerprint test     | informational |
| `privacy-policy-workbench` | privacy policy generator    | cookie policy template · gdpr checklist · data retention policy template · consent notice generator · data processing agreement template                   | transactional |
| `api-credential-tools`     | api key validator           | bearer token formatter · api request header analyzer · **is my api key exposed** _(question)_ · jwt vs api key _(comparison)_ · check authorization header | informational |

`hash-generator` appears in both Developer and Security — the same tool, deliberately discoverable
from both categories, with one canonical URL. Not duplicate content.

---

## 5. Competitor findings — OBSERVED

Live third-party pages fetched during this research. **No traffic, volume or ranking numbers are
claimed below**, because none are published by the sources and none were measured.

### 5.1 PDF cluster

Sources fetched: a PDF-tool comparison blog (`pdfmavericks.com`), an "EverydayTools" comparison
(`everydaytools.pro`), a six-tool review (`codaone.ai`), a merger ranking (`pdftools.site`), and a
cloud-tools roundup (`dcreport.org`).

**Observed pattern — the PDF SERP is a comparison-content SERP.** Four of the five results fetched
are _"best free PDF tool"_ or _"X vs Y"_ roundups. Established tools named repeatedly: **iLovePDF,
Smallpdf, Adobe Acrobat Online, Sejda, PDF24, PDF Candy**, plus **Preview** (macOS) and Chrome
extensions as local-processing alternatives.

**Observed differentiators that competitors all lead with:**

| Axis                     | How competitors present it                                                                                           |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| **Privacy**              | "No upload / never leaves your browser" is the headline claim of _every_ comparison page fetched.                    |
| **Free-tier limits**     | The dominant comparison dimension: 2 tasks/day, 25 MB caps, watermarks above a size threshold, account requirements. |
| **Vector / DPI control** | Resolution choice (150 vs 300 DPI) and DPI defaults called out as a quality signal.                                  |
| **Batch/API**            | Positioned as paid-tier only across iLovePDF, Smallpdf.                                                              |

**Verified comparison against QUICKKIT's live pages:**

- `merge-pdf` page states real limits: **25 files / 50 MiB / 1,000 pages** (VERIFIED from live page).
- `gst-calculator` covers CGST/SGST/IGST + inclusive/exclusive + reverse (VERIFIED).
- QUICKKIT processes in-browser, which is the _exact_ axis every competitor roundup ranks on.

**Conclusion (ASSUMPTION, testable):** QUICKKIT's honest, specific limits plus local processing
are a genuinely stronger story than the generic "no upload" claim, because QUICKKIT can state
numbers where competitor comparison pages speak vaguely. The strategic gap is not the tool — it is
that **there is no page on the site that speaks in the comparison register** ("which PDF merger
should I use, and when is QUICKKIT the wrong answer").

### 5.2 QR & Barcode cluster

Sources fetched: five "best free QR code generator" roundups (`u2l.ai`, `imqrscan.com`,
`qrboomi.com`, `ez-qr.com`, `mergeimages.net`).

**Observed pattern — an almost entirely _list_-shaped SERP, and a strong static/dynamic story.**

- Every result fetched is a ranked listicle. None is a tool page.
- Recurring names: **QR Code Monkey, GoQR.me, QRStuff, Canva, Adobe Express, QRCodeChimp,
  QR TIGER, Uniqode, Flowcode, Bitly QR, ME-QR, Scanova**.
- The clearest editorial distinction the sources draw is **static vs dynamic** QR codes: static
  codes are free "because they cost the provider nothing to serve"; dynamic codes need a redirect
  server and are therefore rationed, capped by scans, or expire when a subscription lapses.
- Recurring free-tier catches named: monthly scan caps (1,000 / 500), codes deleted 30 days after
  cancellation (Flowcode), ads injected at the destination (ME-QR), SVG export moved to paid
  (QR TIGER).
- **Vector export (SVG/EPS) is presented as the print-quality dividing line** between serious and
  casual generators. QRCode Monkey's SVG/EPS/PDF support is cited as its main advantage.

**(ASSUMPTION, testable):** QUICKKIT cannot win "best QR generator" head-on — that SERP is owned by
dedicated QR businesses with SaaS funnels. The winnable position is **static, no-signup, no-expiry,
no-watermark, local-generation**, which is precisely QUICKKIT's model and exactly the "catch" list
above. QUICKKIT has no redirect server, so it can honestly say a printed code never dies because a
subscription lapsed — a claim the dynamic vendors structurally cannot make.

### 5.3 Calculator cluster (India-relevant)

Sources fetched: `edesy.in`, `indicalculator.in`, `tools.singhinfotech.in`, `fireai.in`, `busy.in`.

**Observed pattern — India-specific GST/EMI intent is well served and formula-led.** Every source
fetched provides: CGST/SGST vs IGST split, inclusive-vs-exclusive handling, reverse GST, worked
examples at 18%, and the explicit formula. Several ship an FAQ block in `FAQPage` format.

**Verified:** QUICKKIT's `gst-calculator` already covers CGST, SGST, IGST, inclusive, exclusive and
reverse (34/34/34/25/15/4 occurrences respectively in the built HTML). It is at feature parity with
every source fetched. The differentiator competitors use that QUICKKIT should match is the
**worked ₹ example** (e.g. ₹10,000 at 18% → ₹1,800, total ₹11,800) stated in plain text.

### 5.4 Cross-cutting competitor patterns worth copying (all safe, none deceptive)

1. **Comparison tables** with columns for privacy, free limits, signup, export formats.
2. **"Best for / where it falls short"** — the honest-limitations register. Note several fetched
   pages are themselves _competitor-affiliated_ roundups that put their own tool first; QUICKKIT
   must not imitate that self-serving pattern, only the transparency.
3. **Worked numeric examples** rather than feature adjectives.
4. **FAQ blocks** answering the "is it really free / what's the catch" questions.

---

## 6. Low-competition opportunities vs assumptions

Split exactly as the brief requires — what is backed by evidence, and what is not.

### Achievable now, on evidence

| Opportunity                                                                                                                                | Why it is defensible                                                                       | Evidence                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| **Static QR codes: no expiry, no watermark, no scan cap**                                                                                  | A structural advantage dynamic-QR SaaS cannot copy without abandoning their business model | OBSERVED: catch-lists across 5 QR roundups                          |
| **Honest numeric limits on every tool**                                                                                                    | Competitor roundups speak vaguely; QUICKKIT already states 25 files / 50 MiB / 1,000 pages | VERIFIED on live `/tools/merge-pdf`                                 |
| **Local processing stated per tool, truthfully**                                                                                           | The #1 ranking axis in PDF comparisons; already true and already written                   | VERIFIED + OBSERVED                                                 |
| **India-specific GST/EMI parity + worked examples**                                                                                        | Feature parity already achieved; only the example format is missing                        | VERIFIED                                                            |
| **Deep, specific long-tails already recorded** (`compress pdf to 100kb`, `resize photo for passport size`, `scan qr code from screenshot`) | These are real user phrasings, already mapped per tool                                     | VERIFIED                                                            |
| **GS1 / barcode-developer informational content**                                                                                          | Narrow technical niche; few competitors produce real explainer content                     | OBSERVED: none of the fetched QR roundups cover GS1 element strings |

### Assumptions — NOT backed by data, must be tested in Search Console

| Assumption                                           | How to test it                                                    |
| ---------------------------------------------------- | ----------------------------------------------------------------- |
| "no upload" phrasing converts better than "free"     | Compare CTR of pages whose title carries privacy vs price wording |
| QR static-vs-dynamic framing attracts clicks         | Watch impressions on `qr-generator` after any copy change         |
| Comparison content would win commercial queries      | Only provable by shipping one and reading GSC query data          |
| Long-tail secondary keywords are the traffic drivers | Segment GSC queries into head vs long-tail per tool               |

### Explicitly out of scope

- **No new thin keyword pages.** The brief forbids doorway pages, and the brand directory already
  demonstrates the correct pattern: 65 brand pages are `noindex` by design because they lack a
  citable decoder (`isBrandRecordIndexable`). That decision is preserved.
- **No fabricated review, rating or `AggregateRating` markup** to compete with the roundups.
- **No paid links, link farms or automated link schemes** to shortcut the listicle SERPs.

---

## 7. Site-side readiness — VERIFIED

The Phase 2–4 prerequisites are in place, so content strategy is not blocked by technical debt.

| Check                                         | Result                             |
| --------------------------------------------- | ---------------------------------- |
| Tools with a registry record                  | 56 / 56                            |
| Titles over 60 chars                          | 0                                  |
| Descriptions outside 70–160 chars             | 0                                  |
| Duplicate titles (sitewide, built HTML)       | **0**                              |
| Duplicate descriptions (sitewide, built HTML) | **0**                              |
| Tool pages with exactly one H1                | 115 / 115                          |
| Tool pages with `FAQPage` schema              | 115 / 115                          |
| Tool pages with an FAQ block                  | 56 / 56                            |
| Registry internal links to unbuilt pages      | **0**                              |
| Sitemap URLs ↔ indexable built pages          | 80 ↔ 80, exact                     |
| Orphan sitemap pages                          | 0                                  |
| Broken internal links                         | 0                                  |
| Max internal crawl depth                      | **2** (0:1, 1:33, 2:46)            |
| Redirect chains / loops / dead destinations   | 0 / 0 / 0 (58 redirects)           |
| Images missing alt text                       | 0                                  |
| Pages missing viewport                        | 0                                  |
| SEO metadata report                           | **0 errors, 0 warnings**, 56 notes |

---

## 8. What this research implies for the next 90 days

Ordered by evidence strength, not by ambition.

1. **Keep the technical base frozen.** It scores 0 errors and max depth 2. Churn here is pure risk.
2. **Add comparison-register content to existing pages**, not new URLs — the 0% commercial-intent
   gap is the clearest measurable hole, and the competitor SERPs show that register is what ranks.
3. **Lead with the static/no-expiry QR story** and the numeric-limits story. Both are true today.
4. **Instrument Search Console properly before any further content bets** — see the measurement
   framework in the master report. Every assumption in §6 above needs query-level data to resolve.
5. **Do not chase the listicle SERPs with a listicle.** QUICKKIT would be a self-interested
   "best X" page about its own tool, which is the pattern flagged in §5.4 as one to avoid.

---

## 9. Non-claims

This report does **not** claim, and must not be read as claiming:

- that QUICKKIT ranks, will rank, or could rank for any of the keywords above;
- any search volume, difficulty, CPC or traffic figure for QUICKKIT or any competitor;
- that any competitor's page structure should be copied wholesale;
- that the opportunities in §6 will produce traffic. They are hypotheses with a test attached.

Google sitelinks, rich results and rankings are never guaranteed by markup or content alone.
