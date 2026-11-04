# Legal pages checklist

Use this before any public launch. Order matters: content → links → tests → owner sign-off.

Legend: ✅ done and verified · ⬜ outstanding · 👤 owner decision · ⚖️ needs a lawyer

## 1. Pages

| # | Route | Independent route | Unique title + description | Canonical + OG | Breadcrumbs | Table of contents | Last-updated date | Related pages | Back to top | Feedback link |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `/terms` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 2 | `/privacy` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 3 | `/cookies` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 4 | `/disclaimer` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 5 | `/about` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | n/a |
| 6 | `/contact` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | n/a |
| 7 | `/faq` | ✅ | ✅ | ✅ | ✅ | ✅ (topics) | ✅ | — (nav by topic) | ✅ | ✅ |
| 8 | `/copyright` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 9 | `/accessibility` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 10 | `/security` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 11 | `/file-handling` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 12 | `/intellectual-property` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

Canonicals and OG URLs are emitted only when `SITE_URL` is configured; verified on a scratch build with a test origin (14 routes checked), and the production build was restored to unconfigured afterwards.

## 2. Navigation & hyperlinks

- ✅ Footer rebuilt into four groups: **Tools** (6), **Company** (4), **Legal** (6), **Trust & Security** (4).
- ✅ No duplicate footer links (asserted in `tests/legal-pages.test.tsx` and `tests/e2e/legal-pages.spec.ts`).
- ✅ No `href="#"` or empty hrefs anywhere in the crawled site.
- ✅ Breadcrumbs on every page, with `aria-current="page"` on the leaf.
- ✅ Header active state: legal routes mark **About**; `/faq` marks **Help**.
- ✅ Every in-page table-of-contents anchor resolves to a real heading id.
- ✅ Related-page lists never link to the current page.
- ✅ Sitemap page lists every legal route exactly once.
- ✅ Mobile navigation unchanged and still closes on Escape with focus returned to the menu button.

## 3. SEO & technical

- ✅ Semantic HTML: one `<h1>` per page, ordered headings, `article`, `nav`, `aside`, `time`.
- ✅ Unique `<title>` and meta description per route.
- ✅ `robots` inherits the launch gate: `noindex, nofollow` until `SITE_URL` **and** `LAUNCH_APPROVED=true` are set in production.
- ✅ XML sitemap derived from the registry; empty while indexing is disabled; 52 URLs when approved.
- ✅ `robots.txt` disallows everything until approved.
- ✅ Categories with no published tools are excluded from the sitemap.
- ✅ No draft or unfinished page is listed for indexing.

## 4. Honesty & legal accuracy

- ✅ No invented company name, registration number, address, jurisdiction or email — missing values render as a marked *Owner to supply* placeholder.
- ✅ No compliance or certification claim anywhere (asserted by a test that renders all twelve pages and rejects certification phrasing).
- ✅ No policy copied from another site; each page describes QUICKKIT's own implementation.
- ✅ "Files are not uploaded" is backed by the architecture (no API routes, self-hosted engines, `connect-src 'self'`), not asserted on faith.
- ✅ The hosting-metadata caveat, browser storage, and the optional contact-form endpoint are documented rather than glossed over.
- ✅ Every page carries the "Draft — pending owner details and legal review" note and a review note distinguishing information from legal advice.
- ⚖️ Liability cap and consumer carve-outs (`/terms` §12).
- ⚖️ Governing law, forum and dispute steps (`/terms` §14).
- ⚖️ DMCA safe-harbour position, agent registration, counter-notice process (`/copyright` §5–§6).
- ⚖️ Whether the existing `localStorage`/IndexedDB entries need a consent mechanism in the target markets (`/cookies` §8).
- ⚖️ Privacy-request procedure, identity verification and statutory deadlines (`/privacy` §13).
- ⚖️ Minimum age for independent use (`/privacy` §12).
- ⚖️ Which accessibility and security obligations apply to the operator (`/accessibility` §12, `/security` §11).

## 5. Verification commands

```sh
npx tsc --noEmit
npx eslint .
npx prettier --check "app/**/*.{ts,tsx,css}" "components/**/*.tsx" "lib/**/*.ts" "tests/**/*.{ts,tsx}" "scripts/**/*.mjs"
npm test
npm run build
node scripts/check-site-links.mjs http://127.0.0.1:3001   # against `npm start`
npx playwright install --with-deps chromium firefox webkit && npm run test:e2e
```

Last recorded results: typecheck, lint, format, unit suite (942 tests / 50 files) and build pass; crawler reports 53/53 routes 200 with 0 dead links. Playwright suites were **not** run in the sandbox that produced this work (browser download blocked) — run them before merge.

## 6. Owner sign-off

- 👤 Supply `ownerDetails` in `lib/site.ts` (entity, jurisdiction, address/registration if required, privacy/security/copyright/business inboxes, minimum age).
- 👤 Replace the demo contact address and demo social URLs.
- 👤 Confirm hosting provider, region, log retention and subprocessors so `/privacy` §9 can be completed.
- 👤 Decide the source licence (currently UNLICENSED) and the third-party notice inventory.
- 👤 Commission independent accessibility and security review; name contacts and response commitments.
- 👤 Obtain legal review of every ⚖️ item, then delete the draft notices, bump `LEGAL_LAST_UPDATED`, and only then set `LAUNCH_APPROVED=true`.
