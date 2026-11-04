# Legal & information pages — page-by-page verification report

**Date:** 4 November 2026
**Branch:** `arena/90233e12-quickkit` (dirty working tree, **not committed, not pushed, not merged, not deployed**)
**Build audited:** production build via `npm run build` + `npm start` on `:3001`, `SITE_URL` and `LAUNCH_APPROVED` unset (the pre-launch state).
**Verdict:** 12/12 routes pass the automated audit with **0 problems**. Approval is requested; release is blocked on the owner inputs listed in §3.

> **Read this before trusting the mobile and accessibility columns.** Playwright browser binaries
> cannot be installed in this environment (`npx playwright install chromium` fails: the CDN download
> is blocked and no system Chrome exists). **No page was rendered at any viewport, and no keyboard
> traversal was exercised in a real browser.** Those columns report what could be proven from the
> rendered HTML, the CSS breakpoints and the component tests — nothing more. See §2.

---

## 1. How each claim was checked

| Check | Evidence |
|---|---|
| Route responds independently | `curl` status per route; all 200 from `next start` against a production build |
| Content accuracy | Source read for every claim: `lib/site.ts`, `lib/tools/*`, `components/contact-form.tsx`, `next.config.ts`, `public/` |
| Links & anchors | `scripts/audit-legal-pages.mjs` (12 routes) + ad-hoc sweep of **383 distinct internal links**, each resolving to a 200 page *and* an existing fragment |
| SEO | `scripts/audit-legal-pages.mjs` metadata pass + a scratch `SITE_URL`/`LAUNCH_APPROVED` build |
| Accessibility | Static HTML sweep (heading order, h1 count, empty links, table captions/`th scope`, duplicate ids, `lang`, skip link) + CSS review of focus/contrast rules |
| Tests | `npx vitest run` — **942 passed / 50 files**; `tests/legal-pages.test.tsx` = 15 |
| Browser/E2E | **Not run — see the warning above.** |

---

## 2. Verification limits (stated plainly)

| Item | Status |
|---|---|
| Responsive rendering at 375 / 390 / 430 px, tablet, desktop | **NOT VERIFIED BY RENDERING.** Breakpoints exist at 1080/760/430 px and the mobile ToC is a `<details>` disclosure, but no browser was available to confirm layout or horizontal overflow. |
| Keyboard traversal, focus order, visible focus | **NOT VERIFIED BY RENDERING.** 27 `:focus-visible` rules and a skip link exist in the compiled CSS/HTML; interaction was not exercised. |
| Screen-reader output | **Not verified.** Only landmark/heading/label structure was inspected statically. |
| Playwright suites (`tests/e2e/*`) | **Not executed.** Must run in CI or locally before merge. |

Everything in the "Mobile UI" and "Accessibility" columns below is therefore *static*, and is labelled as such.

---

## 3. Page-by-page report

### 1. `/terms` — Terms and Conditions

| Field | Result |
|---|---|
| Route | ✅ 200, independently routable, prerendered static. 23 h2 sections, 15 ToC entries. |
| Content accuracy | ✅ Describes the real product: no accounts, no payments, no server-side processing. Liability cap and governing-law sections carry explicit legal-review flags rather than invented jurisdiction. |
| Mobile UI | ⚠️ Static only — 15-entry ToC collapses to a disclosure under 760 px; long paragraphs wrap at 68ch. Not rendered. |
| Link verification | ✅ All internal links and fragments resolve. §15 operator block shows an owner placeholder instead of a name. |
| SEO | ✅ Title 48 ch, description 154 ch, OG + Twitter present. Canonical omitted only because `SITE_URL` is unset (verified to appear when set). |
| Accessibility | ⚠️ Static: single h1, no heading skips, no empty links, tables captioned. Not rendered. |
| Tests passed | ✅ Suite + audit + crawler. |
| Pending owner inputs | Operating entity, jurisdiction, postal address/registration (if required), verified contact address, legal review of §12/§14. |

### 2. `/privacy` — Privacy Policy

| Field | Result |
|---|---|
| Route | ✅ 200. 22 h2, 14 ToC entries, `<time datetime>`. |
| Content accuracy | ✅ Every storage key named was matched to source (`quickkit:saved-tools`, the three `qk:qr-*` keys, `qk:i2i-retention`, `qk:p2w-retention`, and both IndexedDB databases). Claims "no cookies", "no analytics", "no third-party scripts" — all three verified true in code. §9 correctly *refuses* to state a log-retention period rather than inventing one. |
| Mobile UI | ⚠️ Static only. |
| Link verification | ✅ All §-cross-references (`/privacy#hosting`, `/privacy#rights` from other pages) resolve to real anchors. |
| SEO | ✅ Title 53, description 155. |
| Accessibility | ⚠️ Static only. |
| Tests passed | ✅ |
| Pending owner inputs | Hosting provider/region/log retention/subprocessors (§9), data-protection contact if a DPO is required, minimum age, legal review of the rights procedure (§13). |

### 3. `/cookies` — Cookie Policy

| Field | Result |
|---|---|
| Route | ✅ 200. 20 h2, 12 ToC entries. |
| Content accuracy | ✅ **Audited key by key.** All 6 `localStorage` keys and both IndexedDB names exist with the documented caps (24 presets, 20 history items, 10 MB per output, session/24h/7d). `document.cookie` appears nowhere in the codebase. **The page describes no consent banner, analytics, advertising or third-party cookie as existing — because none is implemented**; §8 explains why there is no banner without pretending one exists. |
| Mobile UI | ⚠️ Static only. The storage table is wrapped in a scroll container with a 460 px minimum width at ≤430 px. |
| Link verification | ✅ |
| SEO | ✅ Title 61, description 154. |
| Accessibility | ⚠️ Static: both tables have a `<caption>` and `scope="col"` headers; first cell of each row is a `<code>` key, not a `<th scope="row">` (acceptable, but a future improvement). |
| Tests passed | ✅ |
| Pending owner inputs | Legal review of whether any existing storage entry needs a consent mechanism in the target markets (§8). |

### 4. `/disclaimer` — Disclaimer

| Field | Result |
|---|---|
| Route | ✅ 200. 21 h2, 13 ToC entries. |
| Content accuracy | ✅ Limits are real: OCR accuracy caveats, conversion fidelity, calculator accuracy, no professional advice. No compliance claim anywhere on the page. |
| Mobile UI | ⚠️ Static only. |
| Link verification | ✅ `/disclaimer#ocr` (linked from `/file-handling` §9) resolves. |
| SEO | ✅ Title 54, description 155. |
| Accessibility | ⚠️ Static only. |
| Tests passed | ✅ |
| Pending owner inputs | None specific; covered by the global legal review. |

### 5. `/about` — About QUICKKIT

| Field | Result |
|---|---|
| Route | ✅ 200. 15 h2 + 4 h3, 8 ToC entries (anchors live on `<section>` elements — valid scroll targets, and the audit was corrected to accept them rather than the page being changed to suit the tool). |
| Content accuracy | ✅ Live tool count is computed from the catalog, not typed. Operator identity and jurisdiction appear as a marked placeholder, never an invented entity. |
| Mobile UI | ⚠️ Static only. |
| Link verification | ✅ |
| SEO | ✅ Title 46, description 135. |
| Accessibility | ⚠️ Static only. |
| Tests passed | ✅ |
| Pending owner inputs | Operator identity and jurisdiction. |

### 6. `/contact` — Contact Us

| Field | Result |
|---|---|
| Route | ✅ 200. **The only route with no ToC until this phase** — it uses a bespoke layout, so it never received the shell's contents panel. A ToC (desktop panel + mobile disclosure) was added, driven by the same `sections` registry. |
| Content accuracy | ✅ **This is where the central honesty change landed.** `hello@quickkit.in` was never a confirmed monitored inbox, so no address is published: the email card, the form and the channel cards all render a marked *Owner to supply* placeholder, and the form is **disabled** with a notice explaining the address was withdrawn rather than left to swallow messages. No `mailto:null`. |
| Mobile UI | ⚠️ Static only. |
| Link verification | ✅ The 8 ToC anchors were dead on arrival — four ids sat on `<p>` elements the audit doesn't scan and four were missing entirely. All eight now sit on the `<h2>`/`<h3>` they label; every fragment resolves. |
| SEO | ✅ Title 69, description 154. |
| Accessibility | ⚠️ Static: channel cards became `role="region"` + `aria-labelledby` pointing at real heading ids; disabled form fields are marked. |
| Tests passed | ✅ |
| Pending owner inputs | **A verified monitored address** (`ownerDetails.publicEmail`), and a form endpoint if a server-side form is wanted. |

### 7. `/faq` — Frequently Asked Questions

| Field | Result |
|---|---|
| Route | ✅ 200. 13 h2, 6 topic entries. |
| Content accuracy | ✅ Answers match implementation — including the honest "PDF Translator is not implemented" answer. Dates now render `<time datetime>` (was emitting the invalid `dateTime=` attribute). |
| Mobile UI | ⚠️ Static only. |
| Link verification | ✅ `/file-handling#pdf-translator` and `/help` resolve. |
| SEO | ✅ Title 37, description 145. |
| Accessibility | ⚠️ Static only. |
| Tests passed | ✅ |
| Pending owner inputs | Any answer quoting an address or entity stays placeholder-driven. |

### 8. `/copyright` — Copyright and DMCA Policy

| Field | Result |
|---|---|
| Route | ✅ 200. 17 h2, 9 ToC entries. |
| Content accuracy | ✅ **Claims no safe harbour and no registered agent** — it describes the process only. Real 17 U.S.C. §512 citations, and §512(f) misrepresentation is acknowledged. Verified processing limits quoted on the page match the constants. |
| Mobile UI | ⚠️ Static only. |
| Link verification | ✅ |
| SEO | ✅ Title 36, description 160. |
| Accessibility | ⚠️ Static only. |
| Tests passed | ✅ |
| Pending owner inputs | Whether to register a DMCA agent; postal address if required; dedicated copyright inbox. |

### 9. `/accessibility` — Accessibility Statement

| Field | Result |
|---|---|
| Route | ✅ 200. 20 h2, 12 ToC entries. |
| Content accuracy | ✅ **Makes no conformance claim** — no WCAG level is asserted as achieved. Known limitations are stated. This is consistent with the fact that no independent audit has occurred (and, in this environment, no browser testing either). |
| Mobile UI | ⚠️ Static only. |
| Link verification | ✅ |
| SEO | ✅ Title 34, description 147. |
| Accessibility | ⚠️ Static only — the statement itself was verified structurally like every other page, not by rendering. |
| Tests passed | ✅ |
| Pending owner inputs | Named accessibility contact, response commitment, independent review, which accessibility laws apply. |

### 10. `/security` — Security Policy

| Field | Result |
|---|---|
| Route | ✅ 200. 19 h2, 11 ToC entries. |
| Content accuracy | ✅ Headers described match `next.config.ts` (CSP with `connect-src 'self'`, `frame-src 'none'`, Permissions-Policy). The page explicitly disclaims SOC 2 / PCI DSS / HIPAA / GDPR compliance — the audit's claim-scanner now understands those negations instead of flagging them. |
| Mobile UI | ⚠️ Static only. |
| Link verification | ✅ `/security#reporting` (linked from `/contact`) resolves. |
| SEO | ✅ Title 26 (short but valid), description 152. |
| Accessibility | ⚠️ Static only. |
| Tests passed | ✅ |
| Pending owner inputs | Dedicated security inbox, disclosure window, `frame-ancestors` policy for the standalone domain, independent review. |

### 11. `/file-handling` — Data Processing and File Handling Policy

| Field | Result |
|---|---|
| Route | ✅ 200. Now 31 h2 (was 28), 23 ToC entries. |
| Content accuracy | ✅ **The largest real gap found in Phase 2.** The page claimed to cover "each file-handling tool" but omitted three live tools. Image Compressor, Image Resizer and Image Cropper were added as §12–§14 (everything after renumbered to §23, registry updated) with limits taken from the enforced constants, and each verified to write **no** persistent storage. All previously documented limits re-checked against source: Merger 25/50 MB/100 MB/1,000 pages; Splitter 50 MB/1,000 pages/100 outputs/128 MB; Compressor 20/50 MB/100 MB/2,000 pages/64 MB streams/12,000 px; PDF→Word 50/25 MB/250 MB/300 pages; PDF→Image 25 MB/100 pages/72–600 DPI/36 MP; Images→PDF & Image→Image 15 MB/24 MP/8,192 px/20 files/150 MB. pdf.js (`/pdfjs`) and tesseract (`/ocr`) confirmed self-hosted, with `eng`/`hin`/`guj` data present. |
| Mobile UI | ⚠️ Static only. Longest page on the site (23 sections) — the mobile disclosure is the primary navigation path and is the main beneficiary of the un-rendered polish. |
| Link verification | ✅ Includes the `/privacy#hosting`, `/privacy#rights`, `/disclaimer#ocr` cross-references. |
| SEO | ✅ Title 53, description 139. |
| Accessibility | ⚠️ Static: tables captioned with column headers. |
| Tests passed | ✅ |
| Pending owner inputs | None code-side; semantic drift if any pipeline changes — the page must be updated in the same commit. |

### 12. `/intellectual-property` — Intellectual Property Policy

| Field | Result |
|---|---|
| Route | ✅ 200. 17 h2, 9 ToC entries. |
| Content accuracy | ✅ Brand ownership stated without inventing a registration. Open-source components and licences listed; the repository is UNLICENSED and the page does not claim an open-source grant that does not exist. |
| Mobile UI | ⚠️ Static only. |
| Link verification | ✅ `/intellectual-property#open-source` (linked from `/privacy` §8) resolves. |
| SEO | ✅ Title 39, description 143. |
| Accessibility | ⚠️ Static only. |
| Tests passed | ✅ |
| Pending owner inputs | Source licence decision; confirmed third-party notice inventory; business inbox. |

---

## 4. Aggregate results

```
12 routes        → all 200, each independently routable, prerendered static
Audit            → 0 problems, 11 notes (all expected: no published address ×10, indexing gated ×1)
Internal links   → 383 checked across the 12 routes, target page + fragment, 0 broken
Site crawl       → 53 routes, 53 × 200, 0 dead links, 0 placeholder hrefs
Metadata         → titles 26–69 ch, descriptions 135–160 ch, OG + Twitter on all 12
Dates            → <time datetime="…"> valid lowercase on all 12
Static a11y      → one h1 per page, no heading skips, no empty links, tables captioned
                   with column headers, no duplicate ids, lang="en", skip link present
TypeScript       → clean
ESLint           → clean
Prettier         → clean
Unit tests       → 942 passed / 50 files
Build            → pass
Playwright E2E   → NOT RUN (browser binaries unavailable — see §2)
```

With `SITE_URL` + `LAUNCH_APPROVED=true` on a scratch build: canonicals emitted per route, `robots`
became `index, follow`, `sitemap.xml` listed 52 URLs **including all 12 legal routes**, `robots.txt`
switched to `Allow: /`. Rebuilt without them afterwards and confirmed back to `noindex, nofollow`.

---

## 5. Approval request

Phase 2 changes are in the working tree only — nothing has been committed, pushed, merged or deployed.

To unblock release, the owner needs to decide:

1. **A verified, monitored contact address** — currently nothing is published and the contact form is disabled. Setting `ownerDetails.publicEmail` restores every surface with no page edits.
2. Real social profile URLs, and removal of the demo values in `lib/site.ts`.
3. Operator entity, jurisdiction, postal address/registration if required, and the four dedicated inboxes (or acceptance of one).
4. Hosting provider, region, log retention and subprocessors, to finish `/privacy` §9.
5. Legal review of the flagged provisions, then removal of the draft notices and a `LEGAL_LAST_UPDATED` bump.
6. **A run of `npm run test:e2e` on a machine with browsers**, since the responsive and keyboard checks could not be performed here.

Awaiting approval before any commit, push or release action.
