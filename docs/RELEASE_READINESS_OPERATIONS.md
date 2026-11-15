# QUICKKIT Release Readiness & Operations Guide

This runbook documents the verified operational posture, security boundaries,
optional integrations, and owner-only dashboard checks for QUICKKIT.

---

## 1. Admin Configuration & Intentional Fail-Closed `503` Behavior

All protected `/api/admin/*` endpoints execute `authorizeAdminApi()` (`lib/supabase/admin-api.ts`)
and `verifyAdminSession()` (`lib/supabase/admin-auth.ts`) **before** instantiating the
server-only `service_role` database client:

1. If `QUICKKIT_ADMIN_EMAILS` is unset or contains no valid email addresses, `/api/admin/*`
   returns `503 Service Unavailable` with `Cache-Control: no-store`.
2. If `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is unset,
   `/api/admin/*` returns `503 Service Unavailable` with `Cache-Control: no-store`.
3. Only after both configuration checks pass does the server validate the Supabase Auth
   session cookie (`401` if unauthenticated, `403` if email is not in `QUICKKIT_ADMIN_EMAILS`).
4. Only after an allowlisted owner session is verified does the server require
   `SUPABASE_SERVICE_ROLE_KEY` (`503` if missing).

Authentication and authorization checks are **never bypassed**. On `/admin/login`,
unconfigured environments render an actionable **Administrator setup required** checklist
displaying boolean presence for required variable names only (never secret values) and
disable form submission until configured. Properly configured production environments do not
display this checklist to unauthenticated visitors.

### Environment Variable Scope Note (Vercel)

- **Production**: `QUICKKIT_ADMIN_EMAILS`, `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
  `SUPABASE_SUBMISSION_HMAC_SECRET`, `SITE_URL`, and `LAUNCH_APPROVED` are configured.
- **Preview / Development**: Supabase keys are scoped to `production` only, so preview
  builds intentionally fail closed with `503` on `/api/admin/*` and disallow indexing.

---

## 2. Supabase Verification & Owner-Only Dashboard Checks

### Verified via Read-Only Catalog Inspection (Production Supabase Project)

- Both migrations are applied (`202611100001_quickkit_account_data` and `quickkit_master_admin`).
- Row Level Security (RLS) is enabled on all 9 `public.quickkit_*` tables.
- All 7 private/admin/submission tables have explicit `FOR ALL TO anon, authenticated USING (false) WITH CHECK (false)` deny policies and zero `anon`/`authenticated` table or column grants.
- `quickkit_profiles` and `quickkit_favorites` allow `authenticated` access strictly to `(SELECT auth.uid()) = id / user_id` with column-scoped grants and zero `anon` privileges.
- `service_role` has least-privilege grants:
  - `quickkit_admin_activity`: `SELECT, INSERT` only (append-only audit trail).
  - `quickkit_admin_tool_overrides`, `quickkit_admin_category_overrides`, `quickkit_admin_site_settings`: `SELECT, INSERT, UPDATE` only.
  - `quickkit_contact_submissions` & `quickkit_feedback_submissions`: column-scoped `INSERT`, `SELECT`, column-scoped `UPDATE`, and `DELETE`.
  - `quickkit_submission_limits`: zero table grants for any API role (accessible only through `SECURITY DEFINER` RPC `quickkit_consume_submission_limit` with `search_path = pg_catalog`, granted solely to `service_role`).

### Checks Requiring Supabase Dashboard Owner Access

The following settings are intentionally managed in the Supabase Dashboard and are not read
or mutated by this application:

1. **Public Signup Disabled**: `Authentication → Sign In / Providers → Allow new users to sign up` must remain **OFF**.
2. **Auth Site URL & Redirect URLs**: `Authentication → URL Configuration` must match the owner-verified production origin (`https://quickkit-rosy.vercel.app`) with no wildcard open redirects.
3. **Custom SMTP Configuration**: `Project Settings → Authentication → SMTP Settings` — verify host, port, TLS, SPF/DKIM/DMARC records, and sender domain directly in the Dashboard. Never commit or log SMTP credentials.
4. **Password Policy & MFA**: Verify strong password policy and enable MFA on the owner administrator account.
5. **Backups & PITR**: Verify automated database backup schedule and retention policy in `Database → Backups`.
6. **API Key Hygiene**: Confirm `SUPABASE_SERVICE_ROLE_KEY` is never exposed to client bundles and rotate keys if ever shared outside Vercel Production secrets.

---

## 3. Sitemap, `robots.txt`, and Safe Test-Email Policy

### Sitemap & `robots.txt`

- `app/robots.ts` allows `/` for `*`, `Googlebot`, and `Mediapartners-Google`, disallows `/api/`, and advertises `Sitemap: <SITE_URL>/sitemap.xml` when `LAUNCH_APPROVED=true` on production. Private `/admin/*` routes emit `noindex, nofollow, noarchive` via `app/admin/layout.tsx`.
- `app/sitemap.ts` derives `<lastmod>` exclusively from real, non-shallow Git history (`gitLastModifiedForFiles`). In shallow or `.git`-stripped deployment runtimes (such as Vercel serverless builds), `<lastmod>` is intentionally **omitted** rather than fabricated with `new Date()`.

### SMTP & Owner-Triggered Test Email Safeguard

- No SMTP credentials exist in Next.js code or Vercel environment variables; email delivery is handled externally by Supabase Auth.
- Any future owner-triggered test-email action MUST validate input through `validateOwnerTestEmailRequest()` (`lib/email-test-guard.ts`), which enforces:
  - Explicit owner approval (`explicitOwnerApproval === true`), never automatic execution.
  - Signed-in actor belongs to `QUICKKIT_ADMIN_EMAILS`.
  - Exact typed recipient confirmation (`confirmedRecipient === recipient`).
  - Single valid allowlisted owner recipient (no batch lists, no CR/LF header injection).

---

## 4. Recommended Analytics Setup (Currently `Not configured`)

Visitor analytics remain explicitly marked **`Not configured`** across the Admin Control Center until genuinely provisioned. No synthetic or placeholder visitor metrics are rendered.

When the owner chooses to enable optional first-party visitor statistics:

1. Provision a persistent libSQL/Turso database outside this repository.
2. Configure server-only Vercel Production secrets (never `NEXT_PUBLIC_`):
   - `ANALYTICS_DATABASE_URL=libsql://<database>.turso.io`
   - `ANALYTICS_DATABASE_TOKEN=<server-only-token>`
3. Add a dedicated **read-only** query helper for the Admin Control Center before wiring totals into `/admin/analytics`, because `lib/visitor-analytics.ts` initializes DDL tables on first call (`analyticsDatabase()`).
4. Configure hosting WAF/rate limits on `POST /api/visitor-stats` and database spending caps.
5. Complete legal/privacy review of the opt-in consent copy, retention window, and hosting region (see `docs/VISITOR_STATISTICS.md`).

---

## 5. Safe Opt-In Error Monitoring Setup (Currently `Not configured`)

Error monitoring is prepared cleanly via `lib/monitoring/error-reporter.ts` along with safe Next.js error boundaries (`app/admin/error.tsx` and `app/global-error.tsx`):

- Remains strictly **`Not configured`** and performs zero network calls by default.
- `sanitizeErrorForMonitoring()` strips bearer tokens, JWTs, API key prefixes, email addresses, URL credentials, and sensitive query parameters (`token`, `key`, `secret`, `password`, `auth`, `code`, `session`, `email`) before forwarding any event.
- Browser-first tool files and user payloads are never attached to error reports.

To activate monitoring after owner approval:

1. Select a privacy-respecting provider (e.g., Sentry with IP anonymization and data scrubbing enabled) and obtain an HTTPS DSN.
2. Set `ERROR_MONITORING_ENABLED=true` and `ERROR_MONITORING_DSN=<https-dsn>` in Vercel Production secrets (never commit DSN values).
3. Register the provider SDK adapter through `registerErrorReporterAdapter()` inside an owner-approved client/server instrumentation module, keeping `sanitizeErrorForMonitoring()` in front of all outgoing events.

---

## 6. Real-Browser (Playwright) Verification Checklist

Because headless Chromium/Firefox/WebKit binaries are unavailable in the offline CI sandbox, the following checks must be executed by the owner in a Playwright-capable environment (or real desktop/mobile browsers) prior to production promotion:

1. Run `npx playwright install chromium` and execute existing specs under `tests/e2e/` against a configured preview/local build.
2. Verify responsive layout visually across **375×812 (mobile)**, **768×1024 (tablet)**, and **1440×900 (desktop)** in both **Light** and **Dark** themes on `/admin/login` and all `/admin/*` screens.
3. Confirm interactive Admin login with real Supabase Auth cookies (`HttpOnly`, `SameSite=Lax`, `Secure` on HTTPS), navigation across all 10 routes, tool/category edit forms, `AdminConfirmDialog` delete confirmations, Dashboard Customize modal, and live periodic refresh + offline/online recovery in Chrome, Safari, and Firefox.
4. Confirm zero console errors, zero hydration mismatches, and zero horizontal page overflow at 375px width.
