# Domain migration — `www.quickkit.live` is the canonical public identity

**Status:** repository-side work complete. Vercel and Supabase configuration applied and read-back-verified (2026-11-21). Google Search Console and end-to-end email delivery remain owner-only steps (§5).

QUICKKIT's public identity is the **www** host of the registered domain:

```
https://www.quickkit.live
```

The apex `https://quickkit.live` **301-redirects to `https://www.quickkit.live`**
(configured at the Vercel domain level — a permanent redirect that preserves the
path and query). The old Vercel alias `https://quickkit-rosy.vercel.app` is
**retired and detached from the project** — nothing the site publishes may name
it as a canonical origin, and `tests/published-origin.test.ts` keeps it that way.

> **Migration history.** The site originally published on the Vercel alias
> `quickkit-rosy.vercel.app`, then on the apex `quickkit.live` (see the §8
> history and the dated audit reports). This document supersedes both for
> current-state guidance. Dated reports are annotated, not rewritten.

---

## 1. The one variable that controls everything

There is exactly one source of the published origin: `productionOrigin()` in
`lib/seo.ts`. It parses `process.env.SITE_URL`, requires `https:`, rejects
credentials/path/search/hash, and returns `url.origin` — so a trailing slash or a
path can never leak into a canonical.

Everything derives from it:

| Output                                | Derivation                                            |
| ------------------------------------- | ----------------------------------------------------- |
| `<link rel="canonical">`              | `absoluteUrl(path)`                                   |
| `og:url`, `og:image`, `twitter:image` | `${siteOrigin}/opengraph-image`                       |
| JSON-LD `@id` / `url`                 | `${siteOrigin}/#website`, `#organization`, `#webpage` |
| `sitemap.xml` `<loc>`                 | `absoluteUrl(path)` per route                         |
| `robots.txt` `Sitemap:`               | `siteOrigin + "/sitemap.xml"`                         |
| `metadataBase`                        | `new URL(siteOrigin)`                                 |

No other module may hardcode a production origin. `tests/published-origin.test.ts`
enforces that: it asserts the publisher modules do not contain the retired alias
or unowned domains, that generated links come from `SITE_URL`, and that the
explicitly-pinned server recovery origin equals the same canonical origin.

The two deliberate exceptions to "no literal", both guarded by tests:

- `lib/tools/qr/data-template.ts` `DEFAULT_PUBLIC_ORIGIN` — client-side module
  that cannot read server env; falls back to `https://www.quickkit.live` only
  outside a browser (unit tests, prerender).
- `lib/supabase/recovery.ts` `recoveryOrigin()` — a security boundary (the
  verifier cookie must land on the exact callback host), so the production
  origin is pinned explicitly as `https://www.quickkit.live`, and the preview
  guard rejects **both** `https://www.quickkit.live` and `https://quickkit.live`
  being borrowed as a preview origin.

### Production environment

```bash
SITE_URL=https://www.quickkit.live
LAUNCH_APPROVED=true
```

`app/robots.ts` and `app/sitemap.ts` are gated by `indexingEnabled`
(`lib/launch.ts`): `SITE_URL` set **and** `LAUNCH_APPROVED=true` **and**
`VERCEL_ENV` unset or `production`. Preview deployments therefore stay
`noindex` and never compete with production for the same URLs.

**Note the distinction:** a configured `SITE_URL` is not domain approval.
`LAUNCH_APPROVED` is the separate indexing switch. Do not set it in Preview.

---

## 2. Verified live dashboard state (2026-11-21, read-back confirmed)

| Where         | Setting                             | Was                                             | Now                                                     | Verdict                     |
| ------------- | ----------------------------------- | ----------------------------------------------- | ------------------------------------------------------- | --------------------------- |
| Vercel env    | `SITE_URL` (Production only)        | `https://quickkit.live`                         | `https://www.quickkit.live`                             | ✅ **fixed**                |
| Vercel env    | `LAUNCH_APPROVED` (Production only) | `true`                                          | `true`                                                  | ✅ unchanged                |
| Vercel domain | `www.quickkit.live`                 | serving (verified, DNS A 216.198.79.1/64.29.17.1) | primary production host                                 | ✅                          |
| Vercel domain | `quickkit.live`                     | verified, 301 → `www.quickkit.live`             | same — permanent apex redirect                          | ✅                          |
| Vercel domain | `quickkit-rosy.vercel.app`          | attached (branch alias `arena/a468ee2f-quickkit`) | **detached** (`remove_project_domain`) after verification | ✅ **removed**              |
| Supabase Auth | `site_url`                          | `https://quickkit.live`                         | `https://www.quickkit.live`                             | ✅ **fixed**                |
| Supabase Auth | `uri_allow_list`                    | apex + old-alias + localhost callbacks          | + `https://www.quickkit.live/auth/callback`, `…/auth/recovery` | ✅ **extended** (old entries retained as compatibility) |

Unchanged and untouched: signup disabled, JWT 3,600 s, refresh-token rotation,
password policy, MFA/TOTP, RLS, SMTP settings and credentials, verification
email templates. The custom recovery template's footer already brands
`https://www.quickkit.live`.

**One field note (still true):** `update_auth_config` echoes your requested
values, but the stored config lags. Verify with a **re-read after a pause**
rather than trusting the write response. Done here — the final read confirms
the new values and confirms unrelated fields (`sms_provider`,
`security_captcha_provider`, session timeouts) were preserved.

---

## 3. URL reference inventory and classification

The full migration is more than a find-and-replace. Every occurrence was
classified before touching it:

| Category                                                                                                    | Class | Action                                                     |
| ----------------------------------------------------------------------------------------------------------- | ----- | ---------------------------------------------------------- |
| `SITE_URL`-derived output (canonicals, OG/Twitter, JSON-LD, sitemap, robots, `metadataBase`)                 | 1     | Repointed via `SITE_URL=https://www.quickkit.live`          |
| Origin publishers & samples (`data-template.ts`, `payload.ts`, `bulk.ts`, `twod.ts`, `product-lookup.ts`, two components) | 1 | Repointed to `https://www.quickkit.live`                   |
| `lib/supabase/recovery.ts` production origin + preview guard                                                | 1/2   | Production origin → www; guard now rejects **both** spellings |
| `.env.example`, `scripts/gsc-analyse.mts`, runbooks (`supabase/email-templates/README.md`, `docs/RELEASE_READINESS_OPERATIONS.md`, `docs/page-weight.md`, GSC data-request doc) | 1 | Corrected |
| Test fixtures that stub `SITE_URL` or assert canonicals                                                     | 1     | Repointed to `https://www.quickkit.live`                    |
| Vercel domain `quickkit.live`                                                                               | 2     | Kept — intentional 301 redirect to www                      |
| Supabase allowlist apex / old-alias / localhost entries                                                     | 2/3   | Kept as compatibility URLs during the migration window      |
| `http://localhost:3000/3001` callbacks and dev config                                                       | 3     | Untouched — legitimate local development                    |
| Vercel deployment URLs, automatic aliases (`quickkit-….vercel.app`)                                         | 4     | Untouched — generated deployment/preview URLs               |
| Dated audit reports (measurements on the old hosts)                                                         | 5     | **Annotated, not rewritten** — banners now point at the www canonical |
| `https://quickkit.invalid` sentinel in `app/auth/callback/route.ts`                                          | 2     | Untouched — deliberate non-resolvable redirect-guard origin |
| `quickkit.tools` / `quickkit.online` inside tests that prove they are rejected                               | 2     | Untouched — negative assertions                             |

`quickkit.tools` and `quickkit.online` are not owned or served by this codebase;
no code that *publishes* a URL may mention them (enforced by
`tests/published-origin.test.ts`).

---

## 4. What was verified before the old alias was detached

Order was load-bearing — the alias was removed only after every item passed:

1. `www.quickkit.live` domain: `verified: true`, `misconfigured: false`, DNS
   A records on Vercel nameservers (`ipStatus: no-change`), HTTPS certificate
   provisioned by Vercel.
2. `quickkit.live` domain: `verified: true`, 301 redirect configured to
   `www.quickkit.live` with `redirect_status_code: 301`.
3. Production deployment `dpl_3UE3Lt4aDjZxELLwhx5rBdGeNEJQ` `READY / PROMOTED`
   on both custom domains.
4. Local production build (`SITE_URL=https://www.quickkit.live LAUNCH_APPROVED=true npm run build`)
   served over real HTTP (`next start`) verified:
   - canonical + `og:url` on `/`, `/tools`, `/tools/merge-pdf`, `/tools/qr-code-generator` — all `https://www.quickkit.live…`
   - `robots.txt` → `Sitemap: https://www.quickkit.live/sitemap.xml`, `Allow: /`, `Disallow: /api/` only
   - `sitemap.xml` — 157 `<loc>` entries, every one on `https://www.quickkit.live`,
     homepage stated as the bare origin (no trailing-slash duplicate), zero
     apex / alias / localhost URLs
   - JSON-LD `@id`s (`#organization`, `#website`, `#webpage`) and breadcrumb
     items on www
   - `X-Robots-Tag` noindex on `/saved`, `/qr`, `/admin`, `/auth/callback`
   - 404 status on unknown routes; `opengraph-image` 200 `image/png`
   - legacy 308 redirects intact (`/tools/image-converter`, `/tools/words-to-pdf`, `/copyright`)
   - zero `quickkit-rosy` and zero bare-apex URL occurrences in served output
5. Full unit suite green: **241 files / 3,522 tests**, `tsc --noEmit`, `eslint .`,
   Prettier all clean.
6. Only then: `quickkit-rosy.vercel.app` removed from the project domains
   (`remove_project_domain`, project `prj_CIR5iP3vxbNRLcP9EApup7b7iHq1`).

Not deleted: the Vercel project, any immutable deployment URL, automatic
aliases, preview deployments, or DNS records.

---

## 5. Owner action checklist (dashboard-only)

### 5.1 Google Search Console — required

This is a **www/non-www host preference change on the same registered domain**.
Do **not** submit a Change of Address request — that tool is for moves between
registered domains.

1. <https://search.google.com/search-console> → add/confirm the **URL-prefix**
   property `https://www.quickkit.live/` (exact string, trailing slash), or use
   a **domain** property for `quickkit.live` which covers both hosts.
   - Verification: if DNS TXT is already in place for the apex domain property,
     the www URL-prefix property can be verified via the same DNS record or via
     the HTML file/`google-site-verification` meta already emitted
     (`GOOGLE_SITE_VERIFICATION` in `app/layout.tsx`). Preserve existing
     verification methods — do not delete the old property.
2. Keep the existing `https://quickkit.live/` URL-prefix property (history) and
   the retired `https://quickkit-rosy.vercel.app` property until its data ages
   out; do not delete their data during the host-preference change.
3. Sitemaps → submit exactly:
   ```
   https://www.quickkit.live/sitemap.xml
   ```
   Remove any previously submitted apex/alias sitemap entries after the www one
   processes successfully.
4. URL Inspection on representative pages (`/`, `/tools`, `/tools/merge-pdf`,
   `/tools/qr-code-generator`, `/category/pdf-tools`) → confirm "URL is on
   Google-selected canonical host" showing `www`, then Request Indexing for a
   small sample (respecting daily quotas).
5. Page Indexing report: watch for "Duplicate without user-selected canonical"
   and "Alternate page with proper canonical tag" entries for apex/alias URLs —
   they should resolve to the www canonical as Google recrawls. No action
   needed while the 301s are in place.
6. Do not claim Search Console changes as complete until the interface confirms
   them.

### 5.2 End-to-end auth email verification — required

Configuration is not proof. After the production deployment carrying this
migration is `READY`:

1. Request a fresh password-reset email from
   `https://www.quickkit.live/admin` recovery flow and open the link **in the
   same browser**. The link host must be `www.quickkit.live` and the reset must
   complete. (Existing emails and dashboard-triggered links are not proof.)
2. Confirm the administrator sign-in at `https://www.quickkit.live/admin` works
   with MFA unchanged.
3. Only after both pass, the owner may prune the compatibility entries
   (`https://quickkit.live/auth/callback`, `https://quickkit.live/auth/recovery`,
   `https://quickkit-rosy.vercel.app/auth/callback`) from the Supabase redirect
   allowlist. Keep `http://localhost:3000/auth/callback` for local development.

### 5.3 Live smoke test (automated evidence)

`.github/workflows/live-smoke.yml` runs `scripts/live-smoke.mjs` from a GitHub
runner (the agent sandbox cannot reach the live host). After the production
deployment is `READY`:

```bash
gh workflow run live-smoke.yml
gh run watch   # then: gh run view --log
```

It asserts the full redirect matrix (apex/http variants → https www, permanent,
single-hop), canonical + `og:url` on key pages, robots.txt sitemap declaration,
sitemap URL hygiene, indexing headers, 404 behaviour, OG image and the legacy
in-app redirects. It can be re-run any time.

### 5.4 No DNS changes required

Records already point at Vercel (`A 216.198.79.1`, `A 64.29.17.1`, Vercel
nameservers) and both hosts are served and verified. **No DNS edit is part of
this migration.** Do not change nameservers or A/CNAME records.

### Not required

- No API allowed-origin list exists to update (the app is same-origin).
- CSP is origin-agnostic (`'self'`, relative URLs) and needs no edit.
- Cookies are host-only (no `Domain` attribute) and work on any hostname —
  **do not add** a `Domain` attribute.
- Email templates use `{{ .ConfirmationURL }}`; the Site URL drives the host.

---

## 6. Separate security finding — not part of this migration

Recorded in `supabase/email-templates/README.md`: the configured SMTP credential
is compromised and must be rotated at the provider before delivery can be
trusted. This migration did not and must not be used to "tidy" SMTP settings.
The sender is `hello@quickkit.live` over Zoho — SPF/DKIM/DMARC alignment should
be verified by the owner. Out of scope here.

---

## 7. Branch-state gates

```bash
SITE_URL=https://www.quickkit.live LAUNCH_APPROVED=true npm run build
npx vitest run
npx tsc --noEmit
npx eslint .
```

All four are green on the migration branch. `next build` in the agent sandbox
cannot reach the live domain; live HTTP claims are covered by the §5.3 workflow
and must not be reported as verified until it has actually run.

---

## 8. Migration history (recorded, superseded)

1. **rosy → apex (2026-11-15 … 2026-11-21):** production moved off
   `quickkit-rosy.vercel.app` to `https://quickkit.live` (apex canonical, www
   301 → apex). See the annotated dated reports (`AUDIT_REPORT_2026-11-15.md`,
   `SEO_MASTER_AUDIT.md`, `docs/technical-seo-indexing-audit-2026-11-19.md`).
2. **apex → www (2026-11-21, this document):** canonical flipped to
   `https://www.quickkit.live`; apex 301 → www; old alias detached.

Cross-browser CI note (from the first migration, still true): the full
`npm run test:e2e` Playwright suite has not been observed green end-to-end on a
single run inside its runner budget; the two explicit cross-browser gates pass
and the `verify` job (format, lint, unit tests, build, typecheck, audit) is the
required gate for this migration.
