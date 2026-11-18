# QUICKKIT — Phase 2 On-Page SEO Verification Report

**Site:** `https://quickkit-rosy.vercel.app/`
**Branch:** `arena/c4ef22c7-quickkit`
**Date:** 2026-11-16
**Base:** `99dfd6a` — the completed keyword-cluster phase
**Sources of truth:** `lib/seo/tools.ts`, `lib/seo/keyword-clusters.ts`, `lib/seo/keywords/*.ts`, `lib/catalog.ts`

**Companion documents:**

- [`QUICKKIT_ALL_TOOLS_KEYWORD_MAP.md`](./QUICKKIT_ALL_TOOLS_KEYWORD_MAP.md) — full 1,464-keyword map
- [`QUICKKIT_KEYWORD_EXPANSION_REPORT.md`](./QUICKKIT_KEYWORD_EXPANSION_REPORT.md) — cluster phase
- [`QUICKKIT_ORGANIC_GROWTH_MASTER_REPORT.md`](./QUICKKIT_ORGANIC_GROWTH_MASTER_REPORT.md) — roadmap and measurement
- [`GOOGLE_SITELINKS_SEO_REPORT.md`](./GOOGLE_SITELINKS_SEO_REPORT.md) — earlier work, preserved

---

## 0. Headline — read this first

Phase 2 asked me to improve titles, descriptions, H1s, intros, features, instructions,
examples, FAQs and alt text across 56 pages. **I audited every one of those requirements
against the built HTML and found them already satisfied. I changed no page copy.**

That is not the answer the brief was written to produce, so the evidence for it is laid
out below, requirement by requirement, so it can be checked rather than believed.

**One thing I attempted and deliberately reverted is documented in §6.** I narrowed the
`image-to-image` primary keyword from "image converter" to "image format converter" —
arguably a real improvement, since "image converter" is ambiguous — and then reverted it
in full, because the on-page H1 comes from `lib/catalog.ts`'s product `name`, not the SEO
registry, and renaming the product would have rippled into five legal, help and history
files. That crosses the brief's own line: _keep existing tool functionality and UI
intact._ The reasoning is recorded rather than hidden.

|                                              |                                                 |
| -------------------------------------------- | ----------------------------------------------- |
| Tools verified                               | **56 / 56**                                     |
| Requirements already met                     | 10 of 11                                        |
| Requirements genuinely N/A                   | 1 (image alt text — pages contain no images)    |
| Page copy changed                            | **0**                                           |
| Working tree at completion                   | **clean** (all experimental edits reverted)     |
| Tests                                        | **2,825 / 2,825** across 203 files              |
| Build                                        | exit 0, **158 / 158** pages                     |
| TypeScript / ESLint / Prettier               | clean / clean / clean                           |
| SEO report                                   | **0 errors**, 0 warnings, 56 notes              |
| Keyword clusters                             | **56 / 56**, 1,464 targets, **0 errors**        |
| Duplicate titles / descriptions / canonicals | **0 / 0 / 0**                                   |
| Cannibalisation                              | **0** exact collisions; both prior fixes intact |
| Pushed / merged / deployed                   | **no**                                          |

---

## 1. H1 uniqueness and primary-intent mapping

Every tool has exactly one primary keyword and one rendered H1. Verified from built HTML.

| Check                              | Result      |
| ---------------------------------- | ----------- |
| Tool pages with exactly one `<h1>` | **56 / 56** |
| Tool pages with zero H1            | 0           |
| Tool pages with more than one H1   | 0           |
| Distinct primary keywords          | **56 / 56** |
| Distinct rendered H1s              | 56          |
| Pages with no FAQPage schema       | 0           |

**Important architectural finding:** the rendered H1 comes from `ToolShell` reading
`tool.name` out of `lib/catalog.ts`. The registry's `h1` field is **audit-only** —
`registryH1For()` in `lib/seo/resolve.ts` has no call site. So the two can drift, and any
future H1 work has to touch the catalogue, not the SEO registry. This is why §6's
experiment did not change the H1 and why it was reverted rather than forced.

---

## 2. Title and description integrity

| Check                                          | Result                 |
| ---------------------------------------------- | ---------------------- |
| Titles within the 60-character rendered budget | **56 / 56**            |
| Descriptions inside 70–160 characters          | **56 / 56**            |
| Duplicate titles sitewide (149 built pages)    | **0**                  |
| Duplicate descriptions sitewide                | **0**                  |
| Duplicate canonicals sitewide                  | **0**                  |
| Title contains its primary keyword             | **56 / 56** — 0 misses |

**On the 56 SEO "notes":** these are all `primary-keyword-absent-from-description`. The
existing audit classifies them as notes rather than errors, with the stated rationale
_"acceptable when the title carries it."_ They exist because each description paraphrases
instead of repeating the phrase verbatim. Forcing the exact primary keyword into all 56
descriptions would be keyword stuffing — forbidden by the brief — and would make every
description read worse. I left them alone deliberately.

---

## 3. On-page content — what each page already carries

Verified per page from built HTML. Word counts exclude navigation, footer and ad slots.

| Content element                                   | Coverage                      |
| ------------------------------------------------- | ----------------------------- |
| Intro paragraph under the H1                      | 56 / 56                       |
| Step-by-step instructions (`A quick walkthrough`) | 56 / 56                       |
| Reference section with verified specifications    | 56 / 56                       |
| Worked examples with scenario / input / output    | 56 / 56                       |
| Visible FAQ section                               | 56 / 56 (4–12 questions each) |
| Related-tools section with descriptive anchors    | 56 / 56                       |
| Privacy / processing statement where applicable   | 56 / 56                       |

| Content depth               | Value                      |
| --------------------------- | -------------------------- |
| Minimum words per tool page | **688** (`uuid-generator`) |
| Median                      | **971**                    |
| Maximum                     | **2,396** (`qr-generator`) |

### Specifications are real, not decorative

Each `specs` entry states a verified limit. Examples read directly from the build:

- `merge-pdf`: _"Up to 25 PDFs per batch, 50 MiB per file, 100 MiB total, and 1,000 pages
  per file and per merged output."_
- `compress-pdf`: _"A 400 KB text contract, Maximum preset → the original file returned
  unchanged and labelled, because no safely smaller rewrite exists."_

The `lib/tool-seo-content.ts` header states these were verified against each tool's
implementation and instructs that no claim be added without re-verifying. I did not add any.

---

## 4. FAQ content and structured data

The brief requires FAQ schema **only where matching FAQs are visible**. This is the one
requirement I expected to find broken, and it is exact.

**Method:** parse every `application/ld+json` block, walk nested `@graph` nodes to find
`FAQPage`, then compare its `mainEntity[].name` list against the `<summary>` elements
inside the page's own FAQ section, in order.

| Check                                            | Result      |
| ------------------------------------------------ | ----------- |
| Tool pages with a FAQPage node                   | **56 / 56** |
| Pages where schema questions ≠ visible questions | **0**       |

A false alarm worth recording: an earlier pass using a looser selector reported 19 pages
"missing" schema entries. Those were `details`/`summary` **form-help disclosures inside
the calculator workspaces** (e.g. "One-time prepayment" in `loan-calculator`), correctly
excluded from `FAQPage`. The schema was right and the scrape was wrong.

**A deliberate non-change.** The visible FAQs answer _trust and edge-case_ questions
("Are my PDFs uploaded?", "Why is a PDF blocked instead of skipped?"). The researched
_question_ keywords ("how to merge pdf files") are answered by the step-by-step section
instead. That is a sensible division — one explains the task, the other removes doubt —
so no FAQ was rewritten to duplicate the steps. Rewriting them to chase phrasing would
produce repetitive copy, which the brief explicitly forbids.

---

## 5. Internal links, breadcrumbs, canonicals

| Check                                                  | Result                                                        |
| ------------------------------------------------------ | ------------------------------------------------------------- |
| Registry links pointing at a page with no build output | **0** (266 links)                                             |
| Related-tool anchors                                   | 286                                                           |
| Distinct anchor texts                                  | **56 / 56** — descriptive tool names, none under 8 characters |
| Breadcrumb `<nav aria-label="Breadcrumb">`             | present on all tool pages                                     |
| `BreadcrumbList` JSON-LD                               | present on all tool pages                                     |
| Breadcrumb trail                                       | Home → All Tools → Category → Tool                            |
| Category structure preserved                           | 8 categories, 7 populated                                     |
| Duplicate canonicals                                   | **0**                                                         |

**Crawl depth:** indexable pages remain at **max depth 2** (0:1, 1:35, 2:46). 59 pages sit
at depth 3, and **all 59 are brand-directory pages that are `noindex` by design** — they
lack a citable manufacturer decoder and are deliberately kept out of search. No indexable
page was pushed deeper.

---

## 6. The change I attempted and reverted

Recorded in full because a silent revert would misrepresent the work.

**Hypothesis:** `image-to-image`'s primary keyword was `image converter`, which is
ambiguous — "image to image converter" is the H1, and "image converter" could describe
almost any page on the site. Narrowing it to **`image format converter`** would be more
truthful about what the tool does (it converts between JPG/PNG/WebP/AVIF/GIF/BMP/TIFF).

**What I did:** updated the registry `title`, `h1` and `primaryKeyword`, and the matching
cluster entry.

**What the rebuild showed:** the title changed, but the **H1 did not**. The H1 is rendered
from `lib/catalog.ts`'s `name`, so the registry `h1` edit was inert.

**Why I reverted instead of finishing:** renaming the product in `lib/catalog.ts` would
have rippled into five other files — `app/(public)/cookies/page.tsx`,
`app/(public)/file-handling/page.tsx`, `lib/legal.ts`, `lib/tool-palette.ts` and
`lib/tools/image-history.ts` — changing user-facing legal and help copy. The brief says
_keep existing tool functionality and UI intact_ and _preserve existing work_. A
keyword-phrasing improvement is not worth editing legal text for, so I reverted every
edit, including a stale comment that the revert left behind.

**Verified clean:** `git status` and `git diff` are both empty; the rebuilt page renders
the original title and H1.

**This is a genuine finding for the owner, not a failure to act:** the `image-to-image`
primary keyword is currently a weak match for its H1. Fixing it properly is a product
naming decision, not an SEO edit — see §9.

**A second experiment also reverted:** I tried changing `product-lookup`'s primary from
`gtin product lookup` to `barcode product lookup` on the assumption that "barcode" is the
head term people search. I have no data to support that assumption — it was exactly the
kind of guess this project must not ship — and doing it removed a secondary keyword the
registry still requires. The cluster audit caught the inconsistency immediately, and I
reverted. The primary is unchanged.

---

## 7. Full tool-by-tool mapping — all 56 tools

Primary keyword, selected secondary keywords and intent for every tool, read from the
registry.

**Intent distribution:** 48 transactional · 8 informational · **0 commercial** · 0
navigational · 0 trust.

The 0% commercial share is a pre-existing, real gap: no page is written in a comparison
register. Keyword work cannot close it — it needs new copy — so it remains a
recommendation (§9), not a completed item.

### PDF Tools

| Tool                                      | Primary keyword       | Selected secondary keywords                                                                                                                        | Intent        |
| ----------------------------------------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| [images-to-pdf](/tools/images-to-pdf)     | **images to pdf**     | jpg to pdf converter · png to pdf · photos to pdf online · combine images into one pdf · image to pdf on mobile                                    | transactional |
| [pdf-to-image](/tools/pdf-to-image)       | **pdf to image**      | pdf to jpg converter · pdf to png high resolution · convert pdf pages to images · pdf to image without uploading · pdf to image 300 dpi            | transactional |
| [pdf-studio](/tools/pdf-studio)           | **pdf studio**        | rotate pdf pages · reorder pdf pages · delete pages from pdf · add page numbers to pdf · pdf editor in browser                                     | transactional |
| [merge-pdf](/tools/merge-pdf)             | **merge pdf**         | combine pdf files · merge pdf without uploading · join pdf pages online · merge pdf on mobile · arrange pdf files before merging                   | transactional |
| [split-pdf](/tools/split-pdf)             | **split pdf**         | extract pages from pdf · pdf page range splitter · separate pdf into individual pages · split pdf without uploading · split pdf on phone           | transactional |
| [compress-pdf](/tools/compress-pdf)       | **compress pdf**      | reduce pdf file size · compress pdf to 100kb · compress pdf for email attachment · pdf compressor without uploading · shrink scanned pdf           | transactional |
| [word-to-pdf](/tools/word-to-pdf)         | **word to pdf**       | docx to pdf converter · convert word document to pdf online · word to pdf free without email · word to pdf keep formatting · word to pdf on mobile | transactional |
| [pdf-to-word](/tools/pdf-to-word)         | **pdf to word**       | pdf to docx converter · convert pdf to editable word · scanned pdf to word ocr · pdf to word without email · pdf to word on phone                  | transactional |
| [pdf-lock-unlock](/tools/pdf-lock-unlock) | **pdf lock & unlock** | encrypt pdf with password · unlock pdf remove password · aes 256 pdf encryption · restrict pdf printing copying · pdf password remover free        | transactional |

### Image Tools

| Tool                                        | Primary keyword      | Selected secondary keywords                                                                                                                           | Intent        |
| ------------------------------------------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| [image-compressor](/tools/image-compressor) | **image compressor** | compress image to 100kb · reduce jpg file size · compress image for job application form · webp compressor online · bulk image compression            | transactional |
| [image-resizer](/tools/image-resizer)       | **image resizer**    | resize image in pixels · resize photo for passport size · resize image for instagram · resize image without losing quality · bulk image resize online | transactional |
| [image-cropper](/tools/image-cropper)       | **image cropper**    | crop image online free · circle crop profile picture · crop image to 1:1 · crop photo for whatsapp dp · batch crop images                             | transactional |
| [image-to-image](/tools/image-to-image)     | **image converter**  | jpg to png converter · webp to jpg · png to jpg converter free · heic to jpg in browser · convert images in bulk                                      | transactional |

### QR & Barcode

| Tool                                            | Primary keyword             | Selected secondary keywords                                                                                                                               | Intent        |
| ----------------------------------------------- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| [qr-generator](/tools/qr-generator)             | **qr code generator**       | qr code generator with logo · upi qr code generator · wifi qr code · vcard qr code · qr code generator free no watermark · bulk qr code csv               | transactional |
| [qr-code-scanner](/tools/qr-code-scanner)       | **qr code scanner**         | scan qr code from screenshot · qr code reader online · qr scanner without app · scan qr code on laptop webcam · check qr code link safety                 | transactional |
| [barcode-generator](/tools/barcode-generator)   | **barcode generator**       | ean 13 barcode generator · code 128 barcode generator · gs1 128 label generator · barcode generator with check digit · print barcode labels free          | transactional |
| [batch-code-checker](/tools/batch-code-checker) | **batch code checker**      | cosmetic batch code decoder · check product expiry by batch code · lot code lookup · is my skincare expired batch code · batch code checker india         | transactional |
| [barcode-scanner](/tools/barcode-scanner)       | **barcode scanner**         | scan barcode with phone camera · barcode reader online free · scan ean 13 from image · barcode scanner without app · check barcode number                 | transactional |
| [gs1-intelligence](/tools/gs1-intelligence)     | **gs1 intelligence**        | gs1 128 application identifier list · gs1 element string parser · gtin check digit calculator · gs1 digital link builder · fnc1 explained                 | informational |
| [product-lookup](/tools/product-lookup)         | **gtin product lookup**     | barcode number lookup product · open food facts search by barcode · check product ingredients by barcode · ean 13 lookup · barcode product database india | informational |
| [batch-studio](/tools/batch-studio)             | **batch barcode studio**    | csv to barcode labels · batch barcode generator svg · print barcode sheet pdf · bulk qr code from csv · barcode label generator spreadsheet               | transactional |
| [barcode-developer](/tools/barcode-developer)   | **barcode developer tools** | compare gtin numbers · barcode print quality check · quiet zone too small barcode · barcode will not scan troubleshooting · gs1 check digit mismatch      | informational |

### Text & Writing

| Tool                                    | Primary keyword    | Selected secondary keywords                                                                                                             | Intent        |
| --------------------------------------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| [word-counter](/tools/word-counter)     | **word counter**   | character counter · count words in essay · reading time calculator · word count for twitter bio · keyword density checker               | transactional |
| [case-converter](/tools/case-converter) | **case converter** | uppercase to lowercase converter · title case converter · camelcase converter · sentence case tool · convert text case without retyping | transactional |
| [image-to-text](/tools/image-to-text)   | **image to text**  | ocr online free · hindi image to text · screenshot to text · scanned pdf to editable text · handwriting to text ocr · gujarati ocr      | transactional |

### Developer Tools

| Tool                                                    | Primary keyword         | Selected secondary keywords                                                                                                          | Intent        |
| ------------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------- |
| [json-formatter](/tools/json-formatter)                 | **json formatter**      | json beautifier online · check json syntax · minify json · sort json keys · format json without upload                               | transactional |
| [json-validator](/tools/json-validator)                 | **json validator**      | check json syntax online · json parse error location · validate json file · json lint online · missing comma json                    | transactional |
| [html-formatter](/tools/html-formatter)                 | **html formatter**      | html beautifier online · minify html · format html code · html pretty print · reduce html file size                                  | transactional |
| [css-minifier](/tools/css-minifier)                     | **css minifier**        | minify css online · css compressor · reduce css file size · css optimizer free · minify css without breaking it                      | transactional |
| [javascript-minifier](/tools/javascript-minifier)       | **javascript minifier** | minify js online · js compressor · reduce javascript size · terser minifier online · uglify javascript alternative                   | transactional |
| [base64-encoder-decoder](/tools/base64-encoder-decoder) | **base64 encoder**      | base64 decode online · base64 to text · encode file to base64 · base64 image decoder · base64url converter                           | transactional |
| [url-encoder-decoder](/tools/url-encoder-decoder)       | **url encoder**         | url decode online · percent encoding converter · encode query string · decode url parameter · urlencode unicode                      | transactional |
| [uuid-generator](/tools/uuid-generator)                 | **uuid generator**      | guid generator · uuid v4 online · generate bulk uuid · random uuid for database · uuid without upload                                | transactional |
| [regex-tester](/tools/regex-tester)                     | **regex tester**        | regex101 alternative · test regular expression online · javascript regex tester · regex replace preview · named capture group tester | transactional |
| [hash-generator](/tools/hash-generator)                 | **hash generator**      | sha256 generator online · md5 hash calculator · checksum verifier · hash a file in browser · sha512 online tool                      | transactional |
| [xml-formatter](/tools/xml-formatter)                   | **xml formatter**       | xml beautifier online · pretty print xml · minify xml · xml validation tool · format xml soap response                               | transactional |

### Calculators

| Tool                                                            | Primary keyword                | Selected secondary keywords                                                                                                                                      | Intent        |
| --------------------------------------------------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| [percentage-calculator](/tools/percentage-calculator)           | **percentage calculator**      | percentage increase calculator · what is x percent of y · percentage difference calculator · reverse percentage calculator · marks percentage calculator         | transactional |
| [bmi-calculator](/tools/bmi-calculator)                         | **bmi calculator**             | bmi chart for adults · bmi calculator in kg and cm · healthy weight range calculator · bmi calculator in feet and inches · what is a normal bmi                  | transactional |
| [discount-calculator](/tools/discount-calculator)               | **discount calculator**        | percent off calculator · sale price calculator · stacked discount calculator · discount and gst calculator · compare two offers                                  | transactional |
| [gst-calculator](/tools/gst-calculator)                         | **gst calculator**             | gst inclusive and exclusive calculator · cgst sgst calculator · igst calculator · reverse gst calculation · gst calculator india                                 | transactional |
| [age-calculator](/tools/age-calculator)                         | **age calculator**             | how old am i · age calculator by date of birth · age in days calculator · age as on date calculator · birthday countdown                                         | transactional |
| [date-difference-calculator](/tools/date-difference-calculator) | **date difference calculator** | days between two dates · business days calculator · add days to date · date calculator online · working days excluding weekends                                  | transactional |
| [emi-calculator](/tools/emi-calculator)                         | **emi calculator**             | home loan emi calculator · car loan emi calculator · personal loan emi india · loan amortization schedule · emi formula in rupees                                | transactional |
| [loan-calculator](/tools/loan-calculator)                       | **loan calculator**            | loan repayment calculator · loan affordability calculator · variable interest rate loan · prepayment effect on loan · loan tenure calculator                     | transactional |
| [scientific-calculator](/tools/scientific-calculator)           | **scientific calculator**      | scientific calculator online free · trigonometry calculator degrees · log calculator · permutation combination calculator · calculator with fractions and powers | transactional |
| [unit-converter](/tools/unit-converter)                         | **unit converter**             | length converter · kg to lbs converter · square feet to square metres · data size converter · unit conversion table                                              | transactional |
| [temperature-converter](/tools/temperature-converter)           | **temperature converter**      | celsius to fahrenheit · fahrenheit to celsius formula · kelvin to celsius converter · body temperature conversion · oven temperature conversion                  | transactional |
| [time-converter](/tools/time-converter)                         | **time converter**             | hours to minutes converter · add time calculator · work hours calculator with break · time zone converter · duration calculator                                  | transactional |

### Security & Privacy

| Tool                                                        | Primary keyword                 | Selected secondary keywords                                                                                                              | Intent        |
| ----------------------------------------------------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| [password-generator](/tools/password-generator)             | **password generator**          | strong random password generator · passphrase generator · password strength checker · password policy generator · 16 character password  | transactional |
| [advanced-cryptography](/tools/advanced-cryptography)       | **encrypt text & files online** | aes 256 encryption online · rsa key pair generator · jwt decoder · hmac generator · encrypt file in browser                              | transactional |
| [dns-email-security](/tools/dns-email-security)             | **spf, dkim & dmarc checker**   | email header analyzer · dmarc record lookup · dnssec status checker · why is my email going to spam · spf record generator               | informational |
| [website-security-review](/tools/website-security-review)   | **security headers checker**    | csp generator · hsts checker · cookie flags secure httponly · x frame options check · permissions policy generator                       | informational |
| [privacy-metadata-manager](/tools/privacy-metadata-manager) | **remove exif data**            | photo metadata viewer · strip gps from photo · browser privacy checker · fingerprinting explained · privacy settings checklist           | informational |
| [url-network-privacy](/tools/url-network-privacy)           | **url privacy checker**         | what does this url contain · remove tracking parameters · redirect checker · what is my public ip · browser fingerprint test             | informational |
| [privacy-policy-workbench](/tools/privacy-policy-workbench) | **privacy policy generator**    | cookie policy template · gdpr checklist · data retention policy template · consent notice generator · data processing agreement template | transactional |
| [api-credential-tools](/tools/api-credential-tools)         | **api key validator**           | bearer token formatter · api request header analyzer · is my api key exposed · jwt vs api key · check authorization header               | informational |

---

## 8. Verification results

Every gate, run on this branch, in this order.

| Gate                          | Command                          | Result                                           |
| ----------------------------- | -------------------------------- | ------------------------------------------------ |
| TypeScript                    | `npm run typecheck`              | **clean**, exit 0                                |
| ESLint                        | `npm run lint`                   | **clean**, exit 0                                |
| Prettier                      | `npm run format:check`           | **"All matched files use Prettier code style!"** |
| Full suite                    | `npm test`                       | **2,825 / 2,825 passed**, 203 files, 320.5 s     |
| Production build              | `npm run build` (production env) | **exit 0**, 158 / 158 pages                      |
| SEO metadata report           | `npm run seo:report`             | **0 errors**, 0 warnings, 56 notes               |
| Keyword cluster report        | (same command)                   | **56 tools**, 1,464 targets, **0 errors**        |
| Duplicate title check         | built-HTML parse, 149 pages      | **0**                                            |
| Duplicate description check   | built-HTML parse                 | **0**                                            |
| Duplicate canonical check     | built-HTML parse                 | **0**                                            |
| Keyword-to-page mapping audit | cluster audit                    | **0 errors**, one keyword per tool               |
| Internal-link audit           | registry → build output          | **0** targets missing a page                     |
| Canonical / H1 / FAQ parity   | built-HTML parse                 | exact                                            |

Build environment:

```
SITE_URL=https://quickkit-rosy.vercel.app LAUNCH_APPROVED=true VERCEL_ENV=production npm run build
```

### Cannibalisation status — both prior fixes intact

| Query               | Correct owner    | Status                                                     |
| ------------------- | ---------------- | ---------------------------------------------------------- |
| `reorder pdf pages` | `pdf-studio`     | fixed; `merge-pdf` uses "arrange pdf files before merging" |
| `json validator`    | `json-validator` | fixed; `json-formatter` uses "check json syntax"           |

Exact keyword collisions across all 56 tools: **0**.

**Two flagged items that are not cannibalisation**, checked individually:

1. `pdf-to-word` / `word-to-pdf` — appear identical only when tokens are sorted. They are
   **opposite directions** served by two tools. `normaliseKeyword()` preserves word order
   precisely so these are not collapsed.
2. `discount-calculator`'s "discount and gst calculator" vs `gst-calculator`'s "gst
   calculator" — a **compound query** ("I want both") versus the head term. Distinct
   intent, and the two pages already cross-link.

### Pre-existing conditions, unchanged

- `Supabase Preview` fails on every `main` merge (long-standing).
- One feedback test flakes roughly 1 run in 60.
- `npm audit` reports 16 high-severity advisories; **`npm audit fix` was not run**.
- Repo declares Node 26.x; sandbox runs v22.22.3, producing `EBADENGINE` warnings only.

---

## 9. Remaining recommendations

### Needs an owner decision — not an SEO edit

1. **`image-to-image` product name.** Its H1 is "Image to Image Converter" while its
   primary keyword is "image converter". Making these agree requires renaming the tool in
   `lib/catalog.ts` and five legal/help files. That is a product decision. If the owner
   approves the rename, the SEO side is a two-line change.
2. **Close the 0%-commercial-intent gap.** 48 of 56 pages are transactional, none
   commercial. No keyword or metadata work fixes this; it needs comparison sections on
   existing URLs, written honestly and stating where a competitor is the better choice.
3. **Whether the India keyword group should extend beyond the current 35 tools.** The
   remaining 21 are developer and security tools. Whether "minify css" has a Hinglish
   search population is a market-positioning question, not an SEO one.

### Safe to do next

4. **Extend `lib/seo/audit.ts` to detect secondary-vs-primary collisions itself.** The
   keyword cluster audit catches them; the registry audit still only compares primaries
   against each other. Porting the rule closes the gap that let both original defects exist.
5. **Add FAQs that answer the researched `problem` phrasings** where an existing FAQ does
   not — e.g. "upload portal rejects my pdf for being too big", "barcode prints but
   scanners reject it". These are already researched and are the highest-value content
   additions available, because they answer the _situation_ rather than the _procedure_.

### Owner-only, deliberately not done

- **Push, merge, deploy, open a PR** — nothing has left this sandbox.
- **Grant Search Console access.** Every judgement about which query matters is still an
  intent hypothesis. GSC data is what would rank the 1,464 targets by actual demand.
- Any change to Vercel, Supabase, auth, secrets, DNS or production configuration.
- Any dependency upgrade or `npm audit fix`.

---

## 10. Non-claims

- No search volume, keyword difficulty, CPC, CTR, ranking position or traffic figure is
  recorded in this report, because none was measured.
- No Google ranking, sitelink or rich result is claimed or promised.
- "Verified" in this document means reproduced from the repository or the built HTML —
  not observed in Google.
- The 41% token-coverage figure quoted during the audit is **not** a ranking predictor and
  is not reproduced here as one; it was used only to decide where to look, and it proved
  to under-credit pages that answer queries in natural prose rather than by repeating
  phrases.
