# Domain migration — `quickkit.live` is the canonical public identity

**Status:** repository-side work complete. **Dashboard-side work is owner-only and pending.**

QUICKKIT's public identity is the apex domain:

```
https://quickkit.live
```

`https://www.quickkit.live` 301-redirects to the apex. The old Vercel alias
`https://quickkit-rosy.vercel.app` is **retired as an SEO identity** — it may keep
serving the application (it is still a valid Vercel deployment alias), but nothing
the site publishes may name it as a canonical origin.

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

No other module may hardcode an origin. `tests/published-origin.test.ts` enforces
that: it asserts the three publisher modules (`lib/tools/qr/data-template.ts`,
`lib/tools/qr/payload.ts`, `lib/tools/barcode-scanner/product-lookup.ts`) do not
contain the retired alias, and that generated links come from `SITE_URL`.

### Production environment

```bash
SITE_URL=https://quickkit.live
LAUNCH_APPROVED=true
```

`app/robots.ts` and `app/sitemap.ts` are gated by `indexingEnabled`
(`lib/launch.ts`): `SITE_URL` set **and** `LAUNCH_APPROVED=true` **and**
`VERCEL_ENV` unset or `production`. Preview deployments therefore stay
`noindex` and never compete with production for the same URLs.

**Note the distinction:** a configured `SITE_URL` is not domain approval.
`LAUNCH_APPROVED` is the separate indexing switch. Do not set it in Preview.

### Verified live dashboard state (read-only, 2026-11-15)

| Where         | Setting                             | Was                      | Now                                           | Verdict                        |
| ------------- | ----------------------------------- | ------------------------ | --------------------------------------------- | ------------------------------ |
| Vercel env    | `SITE_URL` (Production only)        | `…rosy.vercel.app`       | `https://quickkit.live`                       | ✅ **fixed**                   |
| Vercel env    | `LAUNCH_APPROVED` (Production only) | `true`                   | `true`                                        | ✅ unchanged, correctly scoped |
| Vercel domain | `quickkit.live`                     | verified, primary        | same                                          | ✅                             |
| Vercel domain | `www.quickkit.live`                 | `301` → apex             | same                                          | ✅                             |
| Vercel domain | `quickkit-rosy.vercel.app`          | still serving            | same                                          | ⏳ keep until verified         |
| Supabase Auth | `site_url`                          | `…rosy.vercel.app`       | `https://quickkit.live`                       | ✅ **fixed**                   |
| Supabase Auth | `uri_allow_list`                    | `…rosy.vercel.app/admin` | apex + old-alias + localhost `/auth/callback` | ✅ **fixed**                   |

No DNS or domain work was needed — the `www` 301 and the domain assignments were
already correct. Only the two origin values were wrong.

**One field note:** `update_auth_config` echoes your requested values, but the
stored config lags. A read immediately after the write still showed the old
`site_url`; it only showed the new one after a later read. So **verify with a
re-read after a pause** rather than trusting the write response — otherwise you
will "confirm" a change that has not landed, or re-send a write that already did.

---

## 2. Why this migration was not just a find-and-replace

The audit found the old alias in 44 files. Only some were defects.

| Category                                                                                                 | Action                                         | Reason                                                                                                                           |
| -------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Origin publishers / samples (7 files)                                                                    | **Repointed** to `https://quickkit.live`       | These generate user-visible URLs and public sample content                                                                       |
| `.env.example`                                                                                           | **Repointed** + documented as the single lever | It is the template owners copy                                                                                                   |
| Test fixtures that stub `SITE_URL`                                                                       | **Repointed**                                  | They stand in for the production origin; pointing them at the retired alias would have let a regression pass                     |
| Live runbooks (`docs/RELEASE_READINESS_OPERATIONS.md`, `supabase/email-templates/README.md`)             | **Corrected**                                  | They instruct the owner; wrong values there re-introduce the bug                                                                 |
| Dated audit reports (`AUDIT_REPORT_2026-11-15.md`, `docs/technical-seo-indexing-audit-2026-11-19.md`, …) | **Annotated, not rewritten**                   | They record measurements taken on the old domain. Rewriting them would falsify history                                           |
| `https://quickkit.invalid` sentinels                                                                     | **Untouched**                                  | Security boundary in `app/auth/callback/route.ts` — a deliberately non-resolvable origin used to reject unsafe `next=` redirects |
| `http://localhost:3000/3001` callbacks                                                                   | **Untouched**                                  | Legitimate local development                                                                                                     |
| `quickkit-git-arena-….vercel.app` in docs                                                                | **Untouched**                                  | A real preview deployment URL being cited as evidence                                                                            |

Dated reports carry a banner pointing here rather than altered numbers.

---

## 3. Owner action checklist (dashboard-only — the repo cannot do these)

Do these **in order**. Steps 1–2 are the fix for the live SEO defect described in
§4; the rest complete the migration.

### 3.1 Vercel — the critical one ✅ DONE

1. Vercel → project **`quickkit`** → Settings → Environment Variables.
   Set for the **Production** environment:

   ```
   SITE_URL = https://quickkit.live
   ```

   If a `SITE_URL` variable already exists for Production, **edit it** — do not add
   a second one (duplicate keys resolve unpredictably). Leave Preview/Development
   untouched or unset; unset means those deployments stay `noindex`.

2. Confirm `LAUNCH_APPROVED=true` exists for **Production only**.
3. **Redeploy production.** Env changes do not apply to already-built deployments —
   the origin is baked into the build output at build time. Use _Redeploy_ on the
   latest production deployment, unchecking "use existing build cache" if offered.
   **Still outstanding** — the env value is correct, but no production build has
   been compiled since it changed.
4. Verify (see §5) before touching the domain.

### 3.2 Supabase — auth email links ✅ DONE (verified live 2026-11-15)

Read-only inspection of project `oevjmxcoyibkonousdoh` returned:

| Setting          | Current value                            |
| ---------------- | ---------------------------------------- |
| `site_url`       | `https://quickkit-rosy.vercel.app`       |
| `uri_allow_list` | `https://quickkit-rosy.vercel.app/admin` |

Two things follow, and both matter:

1. **`site_url` is still the old alias.** The app never passes `emailRedirectTo`
   or `redirectTo` (there is no such call anywhere in `app/`, `lib/` or
   `components/` — admin login is password-based via
   `app/api/admin/auth/login/route.ts`), so Supabase falls back to `site_url` for
   `{{ .ConfirmationURL }}`. Every confirmation and recovery email therefore
   links to the old domain today.
2. **The allowlist has no `/auth/callback` entry** — only `…/admin`. Do not assume
   a previous draft's allowlist is in place.

3. Supabase → project `oevjmxcoyibkonousdoh` → Authentication → URL Configuration.
   - **Site URL:** `https://quickkit.live`
   - **Redirect URLs** — replace the single `/admin` entry with these three:

     ```
     https://quickkit.live/auth/callback
     https://quickkit-rosy.vercel.app/auth/callback
     http://localhost:3000/auth/callback
     ```

     Keep the old-alias callback while that alias still serves, then remove it.
     Keep the localhost one for local development. **Never** use a wildcard
     (`https://*.vercel.app/**`) — that turns the auth server into an open
     redirector.

     Add `https://quickkit.live/admin` only if you rely on `/admin` as a redirect
     target; the app itself never requests it.
4. The six templates in `supabase/email-templates/templates/` use only
   `{{ .ConfirmationURL }}`. They contain no hardcoded origin, so they pick up the
   new Site URL automatically — **no template edit needed**. Verify by triggering a
   password reset and confirming the link host is `quickkit.live`.

### 3.3 Vercel domains

7. Vercel → Settings → Domains. Confirm:
   - `quickkit.live` — **primary** for Production
   - `www.quickkit.live` — 301 redirect to `quickkit.live`
   - `quickkit-rosy.vercel.app` — still present (do not remove yet)
8. **Do not remove `quickkit-rosy.vercel.app` until §5 passes.** Removing an alias
   is disruptive and instantly visible if anything still points at it.

### 3.4 Search Console

9. Property for `https://quickkit.live` — resubmit `https://quickkit.live/sitemap.xml`.
10. Keep the old-domain property for historical comparison; do not delete its data
    while the redirect is being processed.

### 3.5 No DNS changes required

Records already point at Vercel, and the apex + `www` are served. **No DNS edit is
part of this migration.** Do not change nameservers or A/CNAME records.

### Not required

- No API allowed-origin list exists to update (the app is same-origin; `next.config.ts`
  builds `connect-src` per route).
- No webhooks are configured.
- CSP is origin-agnostic (relative URLs, `'self'`) and needs no edit.
- Cookies are host-only and set without a `Domain` attribute, so they work on any
  hostname without change. **Do not add a `Domain` attribute** — that would widen
  cookie scope for no benefit.

---

## 3.6 Separate security finding — not part of this migration, but found by it

While reading the Auth config for the migration I saw the SMTP credential fields.
**`supabase/email-templates/README.md` already records that this credential is
compromised and must not be reused** — the value was not copied into the repo and
is not reproduced here. This domain migration does not change it and must not be
used as an occasion to "tidy" SMTP settings.

Action (owner, separately, when convenient — not required to complete the domain
migration): rotate the Gmail app password for the sender account, then update
`Project Settings → Authentication → SMTP` in Supabase and Vercel's
`AUTH_SMTP_VERIFIED_ON` date. Until then treat mail delivery as unverified.

Also note `smtp_admin_email` and `smtp_user` are both `quickkit96@gmail.com`, a
**gmail.com** address, while the site now publishes `quickkit.live`. Sending
transactional mail as a free-mail domain weakens SPF/DKIM/DMARC alignment and
hurts deliverability. Consider a sender on a domain you own once SPF/DKIM are
configured. Do not change this during the domain cutover.

---

## 4. The live defect this migration fixes

At audit time `quickkit.live` **was already serving production with correct
relative internal links**, but the production build had been compiled with
`SITE_URL=https://quickkit-rosy.vercel.app`. Consequences observed on the live
domain:

- `robots.txt` → `Sitemap: https://quickkit-rosy.vercel.app/sitemap.xml`
- every `<loc>` in `sitemap.xml` on the old origin (~157 URLs)
- `og:image` on `/` and on tool pages → `https://quickkit-rosy.vercel.app/opengraph-image`
- by construction, also every canonical, `og:url` and JSON-LD `@id`

Net effect: the apex domain was publishing "my canonical version is
`quickkit-rosy.vercel.app`", instructing crawlers to consolidate on the alias.
This is a **deployment/environment defect, not a code defect** — no code change
alone could fix it. Step 3.1 is the fix.

---

## 5. Verification after redeploy

Run against `https://quickkit.live` (production). `X` is _any_ tool slug.

```bash
# 1. Canonical origin — must be the apex everywhere
curl -s https://quickkit.live/ | grep -o '<link rel="canonical"[^>]*>'
curl -s https://quickkit.live/tools/merge-pdf | grep -o '<link rel="canonical"[^>]*>'

# 2. Retired alias must appear ZERO times in server output
for u in / /tools/merge-pdf /tools/qr-code-generator /robots.txt /sitemap.xml; do
  printf '%s -> %s\n' "$u" "$(curl -s "https://quickkit.live$u" | grep -c 'quickkit-rosy')"
done

# 3. robots.txt must point at the apex sitemap
curl -s https://quickkit.live/robots.txt | grep -i sitemap

# 4. Sitemap: only apex URLs, no slash-suffixed homepage duplicate
curl -s https://quickkit.live/sitemap.xml | grep -o '<loc>[^<]*</loc>' | sed 's|</\?loc>||g' \
  | grep -v '^https://quickkit.live/' | head        # expect: no output
curl -s https://quickkit.live/sitemap.xml | grep -c 'quickkit.live/"'   # expect: 0

# 5. Redirects
curl -sI https://www.quickkit.live/          | grep -iE '^(HTTP|location)'   # 301 -> apex
curl -sI https://quickkit.live/              | grep -iE '^HTTP'              # 200
curl -sI http://quickkit.live/               | grep -iE '^(HTTP|location)'   # -> https

# 6. OG image resolves on the apex
curl -sI https://quickkit.live/opengraph-image | grep -iE '^(HTTP|content-type)'
```

Expected: (1) apex canonicals; (2) all zeros; (3) `Sitemap: https://quickkit.live/sitemap.xml`;
(4) no non-apex URLs and no `quickkit.live/"` homepage-with-slash duplicate; (5) single
301 `www`→apex and `http`→`https`, both terminating in `200` (no loops); (6) `200` + image
content type.

### Only then

11. Remove the `quickkit-rosy.vercel.app` alias in Vercel, and drop its
    `/auth/callback` from the Supabase allowlist.
12. Keep the Vercel **project**, all immutable deployment URLs, and all preview
    deployments. Retiring an alias is not deleting a project.

---

## 6. Branch-state gates

Repository gates run with the production origin:

```bash
SITE_URL=https://quickkit.live LAUNCH_APPROVED=true npm run build
npx vitest run
npx tsc --noEmit
```

`next build` in this sandbox cannot reach the live domain, so the checks above in
§5 must be executed by the owner (or from a network that can reach it). Do not
report them as verified until they have actually been run.

---

## 7. Cross-browser `browser` job — what actually happened

Verified from the check-run annotations, not from guesswork:

| Evidence                     | Value                                              |
| ---------------------------- | -------------------------------------------------- |
| Annotation level/message     | `"The operation was canceled."`                    |
| Targeted cross-browser gates | `3 passed (24.1s)`, `8 passed (1.2m)` — both green |
| Job elapsed                  | 51.2 min                                           |
| Step conclusion              | `failure` on the full `npm run test:e2e` step      |
| Failure-artifact upload      | **skipped** — nothing to upload                    |
| Recent `browser` history     | 3 success / 1 failure / 2 failure (see below)      |

The two explicit cross-browser gates in that job — the PDF-compressor cancellation
regression (webkit + firefox, `--repeat-each=2`) and the PDF-to-Word preview
dialog (chromium + firefox + webkit) — **both passed**. The job then died partway
through the full suite with a runner cancellation and produced no traces.

### Why this is not attributable to the domain change

1. The job's own first step is `npm run build` with **no `SITE_URL`**, so every
   run builds with the site-wide-noindex configuration. My branch's build has been
   run in that exact shape here: exit 0.
2. No e2e spec references `quickkit-rosy` or `quickkit.live` (grep: zero hits), so
   no assertion can turn on the origin.
3. The only app code this branch changes is 7 strings in QR/barcode sample data.
   Those four routes were served from a local CI-style build and returned 200 with
   zero old-alias occurrences.
4. The same job also failed on PR #70 **after** that PR merged, on unchanged code,
   with exit 143 (SIGTERM) after 53 min.

### Scale of the suite

513 `test()` blocks across 73 spec files, with `retries: 1` in CI and five
projects (chromium = all; firefox and webkit = the 8 matched specs; Pixel 7 and
iPhone 13 = 4 matched specs). Chromium alone runs every spec. A two-core runner
doing that inside a 90-minute cap is the likely constraint — the observed
cancellation lands just past the 50-minute mark, and the successful runs on the
same code took 39–50 min. This is **not verified** as the root cause; it is the
most consistent explanation and it is a capacity problem, not a product one.

### Honest status

The full cross-browser suite has **not** been observed green on this branch, and
it cannot be run from the agent sandbox (the Playwright CDN is not reachable
there). The `verify` job — format, lint, 235 unit-test files / 3,495 tests,
build, typecheck, `npm audit` — **is** green on this branch.
