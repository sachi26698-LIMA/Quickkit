# QUICKKIT — SEO research log

This is the evidence file behind `lib/seo/tools.ts` and `lib/seo/categories.ts`.
Every record in those registries carries a `researchId`; the matching heading
below records **what queries were examined, what the search results actually
look like, what the intent is, and why the chosen title and description say what
they say.**

## Method

1. **Repository first.** The 56 published tools, 8 categories and their
   real behaviour (hard limits, supported formats, processing location) were read
   from the implementation before any copy was written. A description that the
   engine cannot keep was rejected at that step.
2. **SERP inspection.** For each cluster, Google results were inspected for the
   head query plus long-tail, question, mobile/desktop, comparison and
   India/regional phrasings. Search volume and keyword difficulty were **not**
   available from a reliable source in this environment, so **no numbers are
   recorded anywhere in this repository**. Where a claim could not be sourced, it
   is written as "not measured".
3. **Intent extraction, not copying.** Competitor pages were read for the jobs
   they answer and the objections they fail to address (often: an unstated
   limit, a hidden upload, or a "100% accurate" promise). The registry copy is
   original and, where relevant, explicitly answers the objection the competitors
   avoid.
4. **Recording.** Each record stores: primary keyword, secondary cluster, intent,
   H1, canonical path, OG copy (derived centrally in `lib/seo.ts`), internal-link
   targets, two alternative titles and one alternative description.

### A note on what is deliberately absent

- **No invented volumes, difficulty scores, CTRs or positions.** None of that
  data was available here, and fabricating it would poison every later decision.
- **No fake local pages.** QUICKKIT is an online tool platform. Regional phrasing
  is recorded in `localPhrasing` on the records where the tool genuinely serves
  that wording (GST/CGST-SGST, UPI QR, Hindi/Gujarati OCR, 100 KB upload limits),
  and is used inside the existing page copy — never as a separate city URL.
- **No competitor claims repeated as ours.** Where a competitor promises
  "unlimited" or "no quality loss", QUICKKIT's copy states the real limit.

---

## PDF cluster (`/category/pdf-tools`)

Queries examined: `merge pdf`, `merge pdf without uploading`, `combine pdf files
online free`, `split pdf`, `extract pages from pdf`, `compress pdf`, `compress
pdf to 100kb`, `reduce pdf file size for email`, `pdf to image`, `pdf to jpg 300
dpi`, `images to pdf`, `jpg to pdf a4`, `pdf password protect`, `unlock pdf`,
`pdf rotate pages`, `reorder pdf pages`, `word to pdf`, `pdf to word`, `pdf to
word without email`, `scanned pdf to word ocr`.

**What the results look like.** The head terms are dominated by a small number of
high-authority brands (iLovePDF, Smallpdf, Adobe) plus a long tail of
"privacy" clones that all run in-browser. The clones compete almost entirely on
three claims: _no upload_, _no watermark_, _no signup_. Two gaps recur:

- Almost nobody states a **batch limit** in the snippet, even though every
  browser implementation has one, so users discover it after uploading 30 files.
- "Compress PDF to 100 KB" is a large, distinctly Indian search intent (job
  portals, exam forms, government applications). Most pages either cannot hit a
  target size or silently rasterise text to make the number.

**Intent.** Transactional, with an informational sub-intent for compression
("why didn't my file shrink?") and for page organisation.

**Decision.** Titles lead with the task verb and keep the differentiator inside
the 60-character window (`Merge PDF Online — Combine & Reorder PDF Pages`).
Descriptions name a real limit where a limit exists — 25 PDFs, 1,000 pages,
72–600 DPI, target size — because specificity is what earns the click from a
user who has already been burned by a vague promise. `compress-pdf` explains
that only embedded images are re-encoded, which answers the "why is it still
big?" question in the snippet itself.

Research IDs: `pdf-merge`, `pdf-split`, `pdf-compress`, `pdf-to-image`,
`images-to-pdf`, `pdf-security`, `pdf-studio`, `word-to-pdf`, `pdf-to-word`,
`category-pdf`.

---

## Image cluster (`/category/image-tools`)

Queries examined: `image compressor`, `compress image to 100kb`, `compress jpg
online free`, `resize image in pixels`, `resize photo passport size`,
`passport size photo tool`, `crop image online`, `circle crop profile picture`,
`image converter`, `webp to jpg`, `png to jpg`, `heic to jpg`, `bulk image
resize`, `photo size kam kaise kare`.

**What the results look like.** A very large volume of near-identical
"compress to 100 KB" landing pages, many of which are thin doorway pages for
exact numbers (50 KB, 100 KB, 200 KB, 500 KB). The genuinely useful ones state
the target explicitly and admit when it cannot be reached. The Indian mobile
intent around passport photos, exam forms and signatures is strong and is
usually served by a badly designed page.

**Intent.** Transactional, mobile-first, often urgent (an upload form is
rejecting the file right now).

**Decision.** `image-compressor` and `image-resizer` keep the KB target in the
description because that is the phrase people type under pressure, while the
recorded `localPhrasing` captures the Hindi/Hinglish variants ("photo size kam
kaise kare", "passport size photo banane wala tool") for use inside the existing
page, not as separate URLs. Titles avoid the doorway pattern
("Compress Image to 100 KB Online Free") and instead describe the engine's real
choice set: quality slider **or** exact target, batch of 20, ZIP export.

Research IDs: `image-compress`, `image-resize`, `image-crop`, `image-convert`,
`category-image`.

---

## QR & Barcode cluster (`/category/qr-barcode`)

Queries examined: `qr code generator`, `qr code generator with logo`, `upi qr
code generator`, `upi qr code banane wala tool`, `wifi qr code`, `vcard qr code`,
`dynamic qr code vs static`, `qr code scanner online`, `scan qr code from
screenshot`, `scan qr code without app`, `barcode generator`, `ean 13 barcode
generator`, `code 128 barcode generator`, `gs1 128 label`, `barcode scanner
online`, `batch code checker`, `cosmetic batch code decoder`, `gs1 element
string`, `gtin check digit`, `bulk barcode from csv`, `why won't this barcode
scan`.

**What the results look like.** QR generation is saturated and dominated by
"dynamic QR" SaaS products pushing a subscription; the honest differentiator is
that a _static_ code cannot be revoked by a vendor. Scanning has a clear gap:
most browser scanners use only the camera and ignore screenshots, which is how
people actually encounter QR codes on a laptop.

Barcodes are different: the results are mostly industrial vendor pages (Zebra,
BarcodeFAQ) written for label-printer buyers, with very little aimed at someone
who needs one correct EAN-13 or a check-digit explanation. "Batch code checker"
is a consumer-beauty intent served mostly by thin affiliate sites that invent
expiry dates.

**Intent.** Transactional for generators and scanners; informational for GS1,
check digits and batch codes.

**Decision.** The generator/scan pair leads with the phrase and adds the proof of
quality (verified scan, check digit, quiet zone). GS1, product lookup and batch
code pages are deliberately informational and say plainly what a code cannot
prove — a check digit is arithmetic, not a licence; a database record is a
volunteer's entry, not a manufacturer's declaration. That honesty is the
differentiator in a SERP full of claims.

Research IDs: `qr-generator`, `qr-scanner`, `barcode-generator`,
`barcode-scanner`, `batch-code`, `gs1`, `product-lookup`, `batch-studio`,
`barcode-debug`, `category-qr`.

---

## Text & Writing cluster (`/category/text-writing`)

Queries examined: `word counter`, `character counter`, `count words in essay`,
`reading time calculator`, `word count kaise check kare`, `case converter`,
`uppercase to lowercase`, `title case converter`, `camelcase converter`, `image
to text converter`, `ocr online free`, `hindi image to text`, `hindi photo se
text kaise nikale`, `gujarati ocr`, `screenshot to text`, `scanned pdf to text`.

**What the results look like.** Word counters are numerous and mostly
undifferentiated; the differentiators that appear are reading time, keyword
density, and language handling for CJK/Thai. OCR results split into two camps:
"100+ languages" claims that are technically true but produce unusable output for
Indic scripts, and services that upload the image.

**Intent.** Transactional, with strongly multilingual sub-intent in India
(Hindi, Gujarati, Marathi).

**Decision.** The OCR title names real supported languages (Hindi, Gujarati,
English) rather than "100+ languages", because the specific claim is both more
credible and matches how people search. The word counter's description names the
limits people check against (characters with and without spaces, reading time)
and states that text stays local.

Research IDs: `word-counter`, `case-converter`, `ocr`, `category-text`.

---

## Developer cluster (`/category/developer-tools`)

Queries examined: `json formatter`, `json beautifier`, `json validator`, `json
parse error line column`, `minify json`, `xml formatter`, `html formatter`,
`css minifier`, `javascript minifier`, `terser minifier online`, `base64
encoder`, `base64 decode`, `url encoder`, `url decode`, `uuid generator`, `guid
generator`, `regex tester`, `regex101 alternative`, `hash generator`, `sha256
generator`, `md5 hash calculator`, `checksum verifier`.

**What the results look like.** Extremely saturated, and dominated by pages that
publish _no_ limit while accepting arbitrarily large input (and then hanging the
tab). The recurring user failure is a JSON error message with no position, or a
minifier that silently breaks code.

**Intent.** Transactional, developer, desktop-first, often with a sensitive
payload (an internal response, an API key, a private key).

**Decision.** Every description names the specific capability that distinguishes
the engine — exact line/column error location, DOCTYPE refusal for XML,
syntax-aware CSS minification that keeps the first licence comment, Terser
parsing without execution, a 300 ms regex worker timeout. These are the facts a
developer uses to choose a tool, and they are all verifiable in the
implementation.

Research IDs: `json-formatter`, `json-validator`, `xml-formatter`,
`html-formatter`, `css-minifier`, `javascript-minifier`, `base64`, `url-encode`,
`uuid`, `regex`, `hash`, `category-dev`.

---

## Calculators cluster (`/category/calculators`)

Queries examined: `percentage calculator`, `percentage increase calculator`,
`bmi calculator`, `bmi chart adults`, `discount calculator`, `percent off
calculator`, `gst calculator`, `gst calculator india`, `gst kaise nikale`,
`cgst sgst calculator`, `reverse gst`, `age calculator`, `age calculator by date
of birth`, `date difference calculator`, `business days calculator`, `emi
calculator`, `home loan emi calculator`, `emi kaise nikale`, `loan calculator`,
`scientific calculator`, `unit converter`, `kg to lbs`, `temperature converter`,
`celsius to fahrenheit`, `time converter`, `work hours calculator`.

**What the results look like.** Two distinct styles. Global calculator sites
optimise for the bare query and show a widget with no explanation. Indian
finance sites (GST, EMI) optimise hard for local phrasing, publish year-stamped
pages ("2026-27"), and often push a rate table or a lead form. The Indian GST
SERP is currently noisy because of the 2025 rate-slab changes, so slabs are
changing under users' feet.

**Intent.** Transactional, frequently mobile, frequently India-specific.

**Decision.** The financial titles carry the local phrase (`GST Calculator — Add
or Remove CGST, SGST & IGST`, `EMI Calculator — Monthly EMI, Interest &
Schedule`) while the descriptions state what the calculator actually returns —
the CGST/SGST split, the amortisation schedule, the healthy-weight range — rather
than publishing a rate table that would need contant maintenance and could be
wrong. No calculator page asserts a current tax rate or a medical conclusion;
both are explicitly out of scope in the on-page copy and in the record.

Research IDs: `percentage`, `bmi`, `discount`, `gst`, `age`,
`date-difference`, `emi`, `loan`, `scientific`, `unit-converter`,
`temperature`, `time-converter`, `category-calc`.

---

## Security & Privacy cluster (`/category/security-privacy`)

Queries examined: `password generator`, `strong random password`, `passphrase
generator`, `encrypt text online`, `aes 256 encryption`, `encrypt file in
browser`, `rsa key pair generator`, `jwt decoder`, `hmac generator`, `spf dkim
dmarc checker`, `email header analyzer`, `why is my email going to spam`,
`security headers checker`, `csp generator`, `hsts checker`, `remove exif data`,
`photo metadata viewer`, `what is my public ip`, `remove tracking parameters`,
`privacy policy generator`, `cookie policy template`, `gdpr checklist`, `api key
format validator`, `bearer token formatter`.

**What the results look like.** Split between serious reference material (MDN,
OWASP) and tool pages that make compliance claims they cannot support ("GDPR
compliant in 2 minutes"). DNS/email authentication queries are dominated by
vendor tools that require a signup for a lookup that should take one second.
Metadata removal is a strong consumer intent driven by "what does my photo
reveal".

**Intent.** Informational for DNS, headers, metadata and privacy policy;
transactional for passwords, encryption and hashing.

**Decision.** The safety-critical pages are the most conservative copy in the
product. They state what has been _checked_ and what has not: an SPF record being
present is not deliverability; a certificate inspection is offline, not a live
scan; the privacy workbench produces a draft for qualified legal review, not a
compliance guarantee. The registry's `intent` for these records is
`informational` for exactly that reason.

Research IDs: `password`, `crypto-suite`, `dns-email`, `web-security-review`,
`metadata-privacy`, `url-privacy`, `privacy-policy`, `api-credentials`,
`category-security`.

---

## Page-level routes (homepage, hubs, guide and policies)

Seventeen non-tool routes were researched separately, because the job they do is
different: a landing page has to explain a whole toolset in 60 characters, and a
policy page has to answer "is this site safe to use?" without selling anything.
Their records live in `lib/seo/pages.ts`.

**Queries examined.** `free online tools`, `all in one online tools free`, `free
online tools no signup`, `free pdf and image tools`, `free online tools list`,
`online tools help center`, `barcode guide`, `code 128 vs qr code`, `gs1 barcode
explained`, `html sitemap`, `is quickkit safe`, `does it upload my files`,
`what happens to my file online converter`, `terms of use`, `cookie policy`,
`privacy policy browser tools`, `accessibility statement`, `responsible
disclosure`, `file handling policy`.

**What the results look like.** The generalist head terms are held by
300-plus-tool aggregators (OneConvert, InstantConverter and similar) that win on
page count and template their way through the long tail. The privacy subplot is
the interesting one: a whole cluster of pages now answers _"are online PDF tools
safe?"_ — and almost every one of them argues that a server upload creates a
copy you cannot verify was deleted, then cites a retention window that is
unverifiable from outside. Two search behaviours follow:

- Searchers who arrive from that cluster are looking for **evidence, not
  adjectives**: which route processes the file, what limit applies, and what
  happens on the one path that does upload.
- Support-intent queries (`is it free`, `why did my file not convert`, `do I
need an account`) are answered on competitor pages by FAQ blocks that are
  frequently wrong about their own limits.

**Decision.**

- The homepage title names the four formats QUICKKIT leads with rather than
  claiming "300+ tools" it does not have. The count in the description is
  substituted from the live catalogue, so it can never be stale or inflated.
- `/tools` puts the real published count in the title (`All 56 Free Online Tools
— PDF, Image & Code`) because an honest count is the only differentiator a
  56-tool index has against an aggregator's 300.
- `/help` and the policy pages are written to be _found during a trust check_
  and then send the reader on to the document that answers the next question —
  `/file-handling` for "does it upload", `/security` for headers and disclosure,
  `/privacy` → `/cookies` for what is stored.
- The policy-page **descriptions still come from `lib/legal.ts`**, which is the
  single source of truth for the text a reader sees. The registry adds only the
  search layer (title composition, keyword, intent, research id, onward links)
  so there are not two descriptions to keep in sync.

Research IDs: `page-home`, `page-tools-index`, `page-help`, `page-barcode-guide`,
`page-html-sitemap`, `page-about`, `page-contact`, `page-faq`, `page-privacy`,
`page-terms`, `page-cookies`, `page-disclaimer`, `page-copyright`,
`page-accessibility`, `page-security`, `page-file-handling`,
`page-intellectual-property`.

---

## Local & multilingual strategy

QUICKKIT is an online tool platform, not a local business. There is no address,
no phone number, no service area and no branch, so **no city or region landing
page exists and none was created.** Creating one would be a doorway page.

Instead, regional demand is captured in three legitimate ways:

1. **Inside the existing tool page.** The tool that serves the need is the page
   that ranks for the regional phrasing, because the page genuinely answers it.
2. **`localPhrasing` on the registry record.** This is a documented, reviewable
   list of regional/Hinglish phrasings a tool actually serves, so a future editor
   knows the intent exists without inventing a URL for it. Examples recorded:
   - GST: `gst calculator india`, `gst kaise nikale`, `18% gst kitna hoga`,
     `cgst sgst calculation`
   - UPI QR: `upi qr code banane wala tool`, `shop payment qr code`,
     `qr code generator india`
   - OCR: `hindi photo se text kaise nikale`, `gujarati ocr`,
     `marathi image to text`
   - Image limits: `compress image to 100kb for exam form`,
     `photo size kam kaise kare`, `passport size photo banane wala tool`
   - EMI: `home loan emi calculator india`, `emi kaise nikale`,
     `lakh rupees loan emi`
3. **Real language support where it exists.** The OCR engine ships eight
   language models, so Hindi, Gujarati, Marathi, Bengali, Tamil, Telugu and Urdu
   are named on the page because the engine genuinely reads them. No other page
   claims a language it cannot process.

Spelling variants (`organisation`/`organization`, `colour`/`color`) are not
duplicated as pages; the site uses one spelling consistently and does not create
alternate URLs for the other.

**What was explicitly not done:** no `/tools/qr-generator-india`,
`/tools/gst-calculator-gujarat`, `/city/ahmedabad`, fake addresses, fake phone
numbers, Google Business Profile claims, or "serving [city]" copy. If a genuine
regional product is ever built (for example a state-specific stamp-duty
calculator with real rates), it gets its own page **then**, with its own record
and its own research — not before.

---

## Measurement honesty

This log records **qualitative** SERP observations only. No impressions, clicks,
CTR, average position, traffic estimate or keyword difficulty figure is stored in
this repository. Those are Google Search Console measurements; the correct place
to read them is Search Console, after the pages are verified and indexed. Any
future change to metadata should be justified by two things this repository can
actually prove:

1. the page's content and behaviour (audited by `npm run seo:report` and the
   test suite), and
2. Search Console data the owner supplies.

Anything else is guesswork dressed as strategy.
