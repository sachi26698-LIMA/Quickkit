# QUICKKIT — COMPLETE PLATFORM AUDIT & PRODUCTION READINESS


> **Historical report.** Measurements below were taken while the production
> origin was `quickkit-rosy.vercel.app`. The canonical public origin is now
> **`https://www.quickkit.live`** (the apex `quickkit.live` 301-redirects there) — see
> [`DOMAIN_MIGRATION_QUICKKIT_LIVE.md`](docs/DOMAIN_MIGRATION_QUICKKIT_LIVE.md).
> Numbers are left as recorded rather than rewritten.

**Audit date:** 15 November 2026
**Branch audited:** `arena/b9cb8e62-quickkit`
**Base commit:** `c647347ae82c194bdf40437000c1fc992606f330` (production `main`, also the deployed Vercel commit)
**Supabase project:** `oevjmxcoyibkonousdoh` ("Quick_kit", eu-west-1, PostgreSQL 17.11)
**Vercel project:** `quickkit` / `prj_CIR5iP3vxbNRLcP9EApup7b7iHq1`, production `https://quickkit-rosy.vercel.app`

Status vocabulary: **PASS** · **FAIL** · **WARNING** · **NOT TESTED** · **OWNER ACTION REQUIRED**

---

## 0. Headline findings

The four catalog inconsistencies in the brief were real, and they shared one root cause: **the site had no single source of truth for its own numbers.** `/tools` computed `tools.length`, but the hero eyebrow was a hand-typed string, the footer said "most tools run on your device", and the About page said "seven working categories" while the security category legitimately holds nine tools. The shipped catalogue actually contains **56** tools, not 43, 49 or 41.

The "Security & Privacy shows 1 tool" report could not be reproduced: that category renders **9** cards, identical to the Admin count. The likely cause of the earlier report is the multi-category design — a tool belongs to *every* category it lists, so per-category totals sum to more than the tool total (56 tools, 57 category assignments).

Everything below is evidence-backed. Nothing was pushed, merged, deployed or changed in production.

| # | Area | Verdict |
|---|---|---|
| 1 | Public website, 56 tool routes | **PASS** |
| 2 | Catalog count consistency | **FAIL → FIXED** (this branch) |
| 3 | Privacy claims vs actual behaviour | **FAIL → FIXED** (this branch) |
| 4 | Admin route + API protection | **PASS** |
| 5 | Supabase schema, RLS, auth config | **PASS** (2 owner actions) |
| 6 | Vercel project, env scopes, build | **PASS** (3 owner actions) |
| 7 | GitHub branch integration | **PASS** (merge not performed — approval required) |
| 8 | API surface & external services | **PASS** (1 warning) |
| 9 | Operational health centre | **WARNING → IMPROVED** (this branch) |
| 10 | SEO / indexing | **WARNING** (indexing off by design) |
| 11 | Tests, types, lint, build | **PASS** |
| 12 | Production reachability from this sandbox | **NOT TESTED** (network allowlist) |

---

## 1. Repository and architecture

**PASS.** Working tree was clean apart from `.next`-generated noise at the start; no untracked feature work existed.

- Canonical production branch: `main` @ `c647347` — confirmed by Vercel's `link.productionBranch` and by the deployed commit SHA in the production deployment metadata.
- Audit branch: `arena/b9cb8e62-quickkit`, branched from that exact commit. Zero divergence at start (`git diff main...HEAD` empty).
- Application modules: 56 public tool routes, 12 legal/informational pages, 7 category routes, 11 Admin routes (all protected) + 1 login page, 8 API routes.
- Migrations in repo: `202611100001_quickkit_account_data.sql`, `202611100002_quickkit_master_admin.sql` — both already applied, **not** duplicated or replayed.
- No obsolete/duplicate feature found. `lib/nav-categories.ts` and `lib/tool-palette.ts` are deliberate, test-locked duplicates of catalogue metadata for bundle-size reasons — documented in-file and guarded by tests.

### API surface inventory

| Route | Method | Auth | Evidence |
|---|---|---|---|
| `/api/admin/auth/login` | POST | same-origin + allowlist | 503 when unconfigured; allowlist checked twice |
| `/api/admin/auth/logout` | POST | session | — |
| `/api/admin/[resource]` | GET/POST/PATCH/DELETE | session + allowlist | 503 unauthenticated, `confirm:true` required for delete |
| `/api/contact` | POST | same-origin + HMAC rate limit | 403 with foreign origin, 400 with empty body |
| `/api/feedback` | POST | same-origin + HMAC rate limit | 400 with empty body |
| `/api/product-lookup` | GET | rate-limited proxy | Open Food Facts, server-side only |
| `/api/visitor-stats` | GET/POST | opt-in first-party | — |
| `/api/word-to-pdf` | POST | consent + size caps | — |

### External services actually used

| Service | Used by | Sent | Consent |
|---|---|---|---|
| Open Food Facts (via our proxy) | GTIN lookup, barcode scanner | one GTIN | click-only |
| `cloudflare-dns.com` (DoH) | DNS & email security | domain name | click-only |
| `api.ipify.org` / `api64.ipify.org` | URL/IP privacy | request only (reveals IP) | click-only |
| Supabase | Admin auth, private submissions | email/messages | n/a |
| Google AdSense | off unless `ADS_ENABLED=true` | — | off by default |
| LibreOffice worker | Word to PDF | DOCX bytes | explicit consent |

**WARNING (documented, not fixed):** the CSP for the DNS route is emitted only on `/tools/dns-email-security` and a few legacy redirect paths. The seven consolidated security workbenches (`/tools/website-security-review`, `/tools/privacy-metadata-manager`, etc.) that *contain* DNS operations are not in that host list, so a DNS lookup started from inside one of those pages will be blocked by the site-wide `connect-src`. This fails closed (no silent leak) and is visible only in the browser console. Fixing it means widening CSP on more routes — an owner decision, not something to change silently.

---

## 2. Catalog consistency — the four reported defects

### 2.1 Root cause

`/tools` title said 43 tools; the homepage said 49; the privacy page said "41 of 42 local". All three were **hard-coded prose**, while the array they described grew to 56 entries. This is a single class of defect: numbers that live in copy instead of code.

| Claim | Reported | Actual before fix | Evidence |
|---|---|---|---|
| `/tools` browser title | 43 tools | rendered "All 56 Free Online Tools" | `curl /tools` `<title>` |
| Homepage total | 49 tools | rendered "56 browser tools" | `curl /` |
| Privacy page | 41 of 42 local | said "Most tools process files…" | `curl /privacy` |
| Security & Privacy category | 1 tool | rendered **9** cards | `curl /category/security-privacy` |

Note: the numbers already differed from the brief because the catalogue grew between the report and this audit. That is exactly why they were wrong — they were never derived.

### 2.2 Fix — one authoritative source

New module **`lib/catalog-counts.ts`** derives every published number from `lib/catalog.ts`:

- `totalTools` — unique routed tools (56)
- `toolCountByCategory` — per category, counting multi-category tools in each
- `publishedCategoryCount` — categories that actually ship tools (7, excluding the AI Tools roadmap entry)
- `localToolCount` / `nonLocalToolCount` — from documented per-tool metadata, not prose

Every consumer now reads it: homepage (`app/(public)/page.tsx`), `/tools` (`app/(public)/tools/page.tsx`), the About page, the site footer, and the Admin inventory (`lib/supabase/admin-data.ts`).

Rendered evidence after the fix:

- `/` → "56 browser tools … and 51 of them never send a file anywhere"
- `/tools` → `<title>All 56 Free Online Tools`, eyebrow "56 FREE TOOLS · 51 FULLY LOCAL IN YOUR BROWSER"
- `/privacy` → "51 of the 56 published tools process everything in your browser and send nothing"
- footer → "51 of 56 tools run entirely on your device"
- `/category/security-privacy` → 9 cards, matching Admin

**No tool was deleted or hidden to make a number match.**

### 2.3 Locking it down

New test **`tests/catalog-counts.test.ts`** (7 assertions) fails if:

- a catalogue tool lacks a processing record,
- a non-local tool slug disappears from the catalogue,
- a category count drifts from the catalogue,
- AI Tools ever reports a non-zero count,
- **any of the five public pages re-introduces a hand-typed total** (regex guard for `NN tools`).

---

## 3. Privacy and data processing — claim accuracy

### 3.1 What was wrong

The File Handling Policy listed 27 numbered sections and covered the PDF and image tools thoroughly, but **never mentioned three of the five non-local tools**: the DNS lookups, the ipify IP lookup, and the Open Food Facts GTIN lookup. The Privacy Policy §8 described only AdSense and Supabase as third parties. Both pages carried a version of "no other third parties", which was untrue.

### 3.2 Fix — per-tool disclosure table

New module **`lib/tool-processing.ts`** records, for each non-local tool, what leaves the device and when:

| Tool | Class | Leaves the device |
|---|---|---|
| Word to PDF | consented upload | DOCX bytes, only after Convert/Refresh |
| DNS & Email Security | optional third party | domain name → `cloudflare-dns.com` |
| URL, IP & Browser Privacy | optional third party | request → `api.ipify.org` (reveals IP) |
| GTIN Product Lookup | optional third party | one GTIN → our proxy → Open Food Facts |
| Barcode Scanner | optional third party | one GTIN, only if you press lookup |

All other 51 tools are `local` by default, so a tool cannot silently opt out — it must be listed.

This table now feeds the public privacy counts **and** a new Admin column (`processing`, `processing_summary`, `processing_leaves` on every `AdminTool`), so Admin and the public site describe processing identically.

### 3.3 Text corrections

- **Privacy Policy** — intro now states "51 of the 56 … send nothing"; §1 summary carries the same computed numbers; §5 rewritten from "Most tools do not transmit" to "No file tool other than Word to PDF transmits a file", plus an accurate description of which CSP routes widen `connect-src`; §8 gained a full **"Optional lookups you can decline"** list naming Cloudflare, ipify and Open Food Facts with what each receives.
- **File Handling Policy** — new §24 "Optional lookups that leave the device" covering all five tools; §25 (engines) no longer claims Word to PDF is "the single server-assisted workflow". Sections renumbered 24→28.
- **Homepage** — "Most files never leave your device" replaced with the computed "51 of them never send a file anywhere"; the Privacy Focused card now names the exception and the four click-only lookups.
- **Footer** — "Most tools run on your device" replaced with the exact fraction.

**Multi-category totals are intentional and now documented:** `toolCountByCategory` sums to 57 for 56 tools because `hash-generator` is published in both Developer Tools and Security & Privacy. The test asserts `sum ≥ totalTools` so a future reader does not "fix" it.

---

## 4. Public website — all 56 tools

**PASS.** Every tool route was requested and inspected; not one 404, redirect loop or empty shell.

Sweep result (`curl` per route, production dev server): **56/56 returned HTTP 200** with a page-specific `<title>`, 147 KB–228 KB of server-rendered HTML. Sample:

```
/tools/advanced-cryptography   200  Ultimate Encryption & Cryptography | QUICKKIT
/tools/barcode-generator       200  Barcode Generator — Code 128, EAN-13 & GS1 | QUICKKIT
/tools/image-to-text           200  Image to Text (OCR) — extract text locally | QUICKKIT
/tools/pdf-lock-unlock         200  PDF Lock & Unlock — AES-256 Password Protection | QUICKKIT
/tools/word-to-pdf             200  Word to PDF Converter — DOCX to PDF with Consent | QUICKKIT
```

Category routes (`/category/{pdf,image,qr,text,dev,calc,security}-*`), `/tools`, `/qr`, `/guides/barcode`, `/saved`, `/help`, `/sitemap` all 200 with distinct titles.

Function-level tool verification is covered by the suite: **2,460 tests across 176 files**, exercising the real engines (PDF merge/split/compress/lock, image codec round-trips, barcode encode *and* independent decode, OCR, QR, calculators, hashing, regex) — see §11.

- Empty/error states: contact form returns `403` for foreign origin and `400` for an invalid body with a human message, never a fake success.
- Forms: `/api/contact` and `/api/feedback` reject empty payloads; both store privately and report failure honestly when the store is unavailable.
- Responsive: **NOT TESTED** at real viewports (§12 — no browser in this sandbox). Layout is exercised by the existing responsive/jest suites for Admin; public responsive claims remain unverified by me.

---

## 5. Admin Control Center

**PASS** on every testable boundary.

| Check | Evidence |
|---|---|
| Unauthenticated page access | all 11 protected routes → `307 /admin/login` |
| Unauthenticated API access | `/api/admin/{tools,categories,submissions,overview}` → `503` (fails closed when session/allowlist unconfigured) |
| Public signup | `/signup` redirects to `/tools?account=disabled`; Supabase `disable_signup=true` |
| Owner identity | exactly one `auth.users` row: `sachi26698@gmail.com`, email confirmed |
| Allowlist scope | `QUICKKIT_ADMIN_EMAILS` currently production+preview+development |
| Destructive actions | DELETE requires `confirm:true` in the body, else `400` |
| Same-origin enforcement | every mutating Admin route calls `assertSameOrigin` |
| Secrets leakage | `getMasterAdminServiceClient` is `server-only`; no key reaches the client bundle |

**Health-centre improvement (this branch).** Three rows were labelled in ways that implied work the app cannot do. They now use the requested vocabulary:

| Row | Before | After |
|---|---|---|
| RLS verification | "Verification required" | **OWNER ACTION REQUIRED** — states that the service-role client cannot introspect `pg_policies` |
| SMTP configuration | "External · unverified" | **NOT CONFIGURED** — no delivery probe exists, so no delivery claim |
| Sitemap & robots.txt | "Owner verification required" | **Indexing off (intentional)** / **Indexing enabled** / **WARNING · origin missing**, driven by real flags |

Admin↔public persistence chain: one real tool override (`word-counter`, enabled+published) and two category overrides exist in the database and are read by the same `getPublicCatalog()` the public pages use. **Live create→save→reload→propagate was NOT executed against production** — it would write to the owner's real data (§12).

---

## 6. Supabase

**PASS**, with two owner actions.

| Item | Finding |
|---|---|
| Project | `oevjmxcoyibkonousdoh`, eu-west-1, ACTIVE_HEALTHY, PG 17.11 |
| Public tables | 9 — activity, category_overrides, site_settings, tool_overrides, contact_submissions, feedback_submissions, favorites, profiles, submission_limits |
| RLS | **enabled on all 9** (0 tables without RLS) |
| Policies | 13 total. 6 deny-all policies (`qual=false`) on admin/private tables for `anon,authenticated`; 3 own-row policies each on `favorites` and `profiles` |
| Private data isolation | `contact_submissions`, `feedback_submissions`, `admin_activity`, `submission_limits` and all three admin tables are **unreadable from the browser** |
| Grants | `anon` holds **no** table privileges at all; `authenticated` only `DELETE` on favorites (the other verbs go through RLS-checked grants) |
| Rate-limit function | `quickkit_consume_submission_limit` SECURITY DEFINER, `search_path=pg_catalog`, ACL `postgres, service_role` — **not executable by anon** |
| Triggers | profile auto-create + `updated_at` guard that pins `id`/`created_at` against tampering |
| Auth | `disable_signup=true`, email provider on, phone/SSO/anon all off, password min 12 with 3 character classes, refresh rotation on, MFA TOTP available, `api_max_request_duration=10s` |
| Site URL | `https://quickkit-rosy.vercel.app`, redirect allowlist has prod callback + `localhost:3000` |
| Migrations | 2 in repo, 2 applied, no duplicates |
| Existing data | 1 contact, 1 feedback, 9 activity rows, 1 tool override, 2 category overrides — **untouched** |

### OWNER ACTION REQUIRED
1. **`smtp_pass` was returned in plaintext by the admin auth-config API.** It matches the credential named in `SECURITY_INCIDENT_2026-11-10_SMTP_CREDENTIAL_EXPOSURE.md`. Treat it as compromised: rotate the Gmail app password in Supabase → Auth → SMTP, then confirm no dashboard export or screenshot retains it. (Not repeated here.)
2. **Backups / PITR could not be evidenced.** The connector exposes no backup API and the plan is not visible from here. Do not claim a backup exists until it appears in the Supabase dashboard.

**Additive migration?** None required. Every defect found was fixable in application code. No schema change was proposed, no migration replayed.

---

## 7. Vercel

**PASS** on configuration; three owner actions.

| Item | Finding |
|---|---|
| Git link | `sachi26698-LIMA/Quickkit`, repoId 1440575522, production branch `main` |
| Production commit | `c647347` — **matches** the canonical `main` HEAD |
| Build | install `npm ci`, build `npm run build`, framework Next.js 16.4.3, Node **26.x** |
| Build evidence | "found 0 vulnerabilities", "added 603 packages", `✓ Compiled successfully` |
| Plan | Hobby; deployments expire after 30 days |
| Domains | production alias `quickkit-rosy.vercel.app`; preview alias for `arena/2d41e44c-quickkit` |
| HTTPS/HSTS | HSTS `max-age=31536000` emitted by the app |

### Environment variable scopes

| Variable | Targets | Type | Assessment |
|---|---|---|---|
| `SITE_URL` | production | plain | correct |
| `LAUNCH_APPROVED` | production | plain (`true`) | **WARNING** — claims approval; blocks preview/dev by design |
| `NEXT_PUBLIC_SUPABASE_URL` | production | plain | correct |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | production | plain | correct, publishable by design |
| `SUPABASE_SERVICE_ROLE_KEY` | production | sensitive | present, never read by me |
| `SUPABASE_SUBMISSION_HMAC_SECRET` | production | sensitive | present |
| `QUICKKIT_ADMIN_EMAILS` | production+preview+dev | plain | **WARNING** — see below |

### OWNER ACTION REQUIRED
1. **Admin allowlist is scoped to preview and development.** A preview build therefore passes the allowlist check. Today it still fails closed because the service-role key and Supabase URL are production-only, so `/api/admin/*` returns 503 — but the moment anyone copies the service key to preview (as the brief warns against), a preview deployment becomes a working admin surface. Restrict `QUICKKIT_ADMIN_EMAILS` to production.
2. **Use separate non-production Supabase credentials** if preview admin testing is ever needed. Do not clone production secrets into preview.
3. `LAUNCH_APPROVED=true` together with `SITE_URL` means the production build emits indexable metadata — see §10 before enabling Search Console.

**Not changed:** no Vercel setting, domain, env var or deployment was modified.

---

## 8. GitHub and deployment integration

**PASS**, nothing pushed.

- `origin` → `https://github.com/sachi26698-LIMA/Quickkit.git` (public repo).
- `arena/b9cb8e62-quickkit` was created from `c647347` and diverged by zero commits before this work.
- No secrets, generated assets or `.next` output are staged; `.gitignore` covers `node_modules/`, `.next/`, `/public/{pdfjs,qpdf,ocr,html-minifier}/`, `.env*`, `*.db`.
- Migration files are the same two already applied.

**Safe merge plan (awaiting your approval — nothing executed):**

1. Review the diff on this branch (9 modified files, 3 new).
2. Fast-forward `main` from `arena/b9cb8e62-quickkit` (no conflicts: `main` has not advanced).
3. Vercel redeploys `main` automatically; confirm the deployment's `githubCommitSha` equals the new `main` HEAD.
4. Smoke-test `/`, `/tools`, `/privacy`, `/file-handling`, `/category/security-privacy` on the new production URL, plus one Admin login.

---

## 9. SEO, performance, accessibility

### Indexing — WARNING (intentional)

This sandbox's `next build` ran without `SITE_URL`, which is the intended behaviour for a non-production environment:

- `robots.txt` → `Disallow: /` (only `/ads.txt` allowed)
- `sitemap.xml` → valid but **empty** `<urlset>`
- every response carries `X-Robots-Tag: noindex, nofollow, noarchive`

The production deployment has `SITE_URL` + `LAUNCH_APPROVED=true`, so it emits canonical URLs and a populated sitemap. **I could not fetch the production sitemap** — outbound HTTPS is allowlisted to GitHub/npm/PyPI in this sandbox (§12). Production indexing behaviour is therefore **NOT TESTED** from here.

### Other SEO findings — PASS

- Unique `<title>` + meta description per route (verified across all 56 tools and the legal pages).
- Canonical, Open Graph and Twitter metadata generated by `pageMetadata()` from one helper; og:image at 1200×630.
- Breadcrumb JSON-LD only where a visible breadcrumb exists; `collectionPageStructuredData` on `/tools`.
- `sitemap.ts` computes `lastmod` from actual source files, so it cannot advertise a stale date.
- No `#` placeholder links; no dead internal route found.
- **No Search Console or traffic data is asserted anywhere in this report** — none was available.

### Accessibility / performance — NOT TESTED
No browser in this sandbox, so Core Web Vitals, axe scans and keyboard/screen-reader passes could not run. `tests/` includes jsdom accessibility assertions and the repo ships Playwright specs, but a jsdom pass is not a WCAG audit. Treat the Accessibility Policy's own admission ("not every tool has been exercised…") as still accurate.

---

## 10. Operational monitoring

**WARNING → improved.** The Admin health centre reports nine rows with the requested states. It distinguishes verified facts (Admin API reachability, database reads, allowlist configured, analytics variables present, error-monitoring configured) from things it cannot verify (RLS policies, SMTP delivery, crawl reachability), and now labels the latter honestly instead of implying a pass.

Periodic refresh exists in the Admin overview; it is a client poll against `/api/admin/overview`, **not** Supabase Realtime, and is described as such. Stale/offline detection and manual refresh are present in `admin-overview-live.tsx`.

---

## 11. Testing — executed results

| Gate | Command | Result |
|---|---|---|
| TypeScript | `tsc --noEmit` | **PASS** — 0 errors |
| ESLint | `eslint .` | **PASS** — 0 findings |
| Prettier | `prettier --check` across `app`, `components`, `lib`, `tests` | **PASS** |
| Unit/integration | `vitest run` (176 files) | **PASS** — 2,460 tests, 1 fixed by this branch |
| Production build | `next build` | **PASS** — `✓ Compiled successfully`, BUILD_ID written, 90 routes emitted |
| Dependency audit | `npm audit --audit-level=moderate` | **PASS** — 0 vulnerabilities |
| Route sweep | 56 tool routes + 7 categories + legal pages | **PASS** — all 200 |
| Playwright E2E | `playwright test` | **NOT TESTED** — no browser binary in this environment |
| RLS live probing | anon-key requests against production | **NOT TESTED** — deliberately not executed against the owner's live project; policies were read from `pg_policies` instead |
| Admin write-through to production | create → save → reload → public | **NOT TESTED** — would write to real production data |

The one test I had to change was my own regression: `tests/admin-control-center-upgrade.test.tsx` pinned the old "Verification required" / "External · unverified" strings. It now asserts the new truthful labels. No assertion was weakened or deleted.

---

## 12. Explicitly unverified

- **Production HTTP responses** (`https://quickkit-rosy.vercel.app/...`) — the sandbox's outbound allowlist covers only GitHub/npm/PyPI. Every `curl` returned `000` (connection refused by policy), **not** a production outage. Production health was instead evidenced through the Vercel API: `READY`, `PROMOTED`, commit `c647347`.
- **Backups/PITR** — no API surface to check.
- **SMTP delivery** — no probe exists; not claimed.
- **Search Console, indexing status, traffic** — no data source.
- **Real-viewport responsive and WCAG 2.1 AA** — no browser.
- **AdSense runtime behaviour** — the loader is off unless `ADS_ENABLED=true`; not exercised.

---

## 13. Files changed on this branch

**New**

| File | Purpose |
|---|---|
| `lib/catalog-counts.ts` | Single source for totals, per-category counts, local/non-local split |
| `lib/tool-processing.ts` | Per-tool processing disclosure table (the privacy source of truth) |
| `tests/catalog-counts.test.ts` | 7 assertions pinning counts to the catalogue; blocks hand-typed totals |

**Modified**

| File | Change |
|---|---|
| `app/(public)/page.tsx` | Computed totals; removes "most files never leave" hedge; names exceptions |
| `app/(public)/tools/page.tsx` | Eyebrow derived from `localToolCount` |
| `app/(public)/about/page.tsx` | Uses `totalTools`; drops direct catalogue import |
| `app/(public)/privacy/page.tsx` | Computed counts; §5 rewritten; §8 gains the three real third parties |
| `app/(public)/file-handling/page.tsx` | New §24 "Optional lookups that leave the device"; sections renumbered |
| `components/footer.tsx` | Exact local fraction instead of "most tools" |
| `components/admin/admin-overview-live.tsx` | RLS / SMTP / sitemap rows use accurate states |
| `lib/supabase/admin-data.ts` | `AdminTool` gains `processing*` fields from the shared table |
| `tests/admin-control-center-upgrade.test.tsx` | Asserts the corrected health labels |

No dependency was added, removed or upgraded. No database object was created, altered or dropped. No production configuration was touched.

---

## 14. Remaining owner-only actions

| # | Action | Why it is yours |
|---|---|---|
| 1 | **Rotate the Supabase SMTP password** | Exposed in plaintext via the auth-config API and matches the 10 Nov incident note |
| 2 | **Restrict `QUICKKIT_ADMIN_EMAILS` to production** | Preview/development currently pass the allowlist check |
| 3 | **Provision non-production Supabase credentials** before any preview admin testing | Never clone production secrets forward |
| 4 | **Confirm backups/PITR** in the Supabase dashboard | Cannot be evidenced via API; do not claim it until seen |
| 5 | **Decide on the DNS CSP gap** for the consolidated security workbenches | Widening CSP on more routes is a security trade-off, not a bug fix |
| 6 | **Approve the merge to `main`** | Per your change-control instruction, nothing was pushed |
| 7 | **Re-run Playwright / axe / real-device checks** once a browser is available | Genuinely NOT TESTED here |
| 8 | **Legal review of the corrected privacy text** | Wording changed; the draft-pending-review stance is unchanged |

---

## 15. Final checkpoint

- **Branch:** `arena/b9cb8e62-quickkit`
- **Base:** `c647347ae82c194bdf40437000c1fc992606f330` (`main`)
- **Checkpoint commit:** `3b9e5ca86b36c824c8aef5230e025cbc9b0e09e3` on `arena/b9cb8e62-quickkit` — 9 modified files, 3 new (plus this report).
- **Not done, by instruction:** no push, no pull request, no merge, no deployment, no production settings change, no production data write.

Awaiting your approval.
