# QUICKKIT Supabase setup and current integration status

**Updated:** 10 November 2026 UTC
**Git branch:** `arena/73c3e289-quickkit`
**Supabase target:** existing `Quick_kit`, project ref `oevjmxcoyibkonousdoh`, `eu-west-1`
**Vercel target:** existing `quickkit`, project `prj_CIR5iP3vxbNRLcP9EApup7b7iHq1`
**Current status (supersedes historical setup notes below):** both existing migrations are recorded as applied once; do not rerun either. Fresh metadata confirms the Admin tables exist, all nine QUICKKIT tables have RLS enabled, and all nine tables are empty. Admin code is local only; production does not yet serve these routes. Vercel Production metadata contains sensitive service-role/HMAC entries whose values were not decrypted, but `QUICKKIT_ADMIN_EMAILS` is missing. The local runtime lacks all five required application env vars. See [QUICKKIT_FINAL_MASTER_COMPLETION_REPORT.md](./QUICKKIT_FINAL_MASTER_COMPLETION_REPORT.md) for current evidence and owner actions. SMTP rotation and delivery remain unverified; Auth configuration was not re-read through the unsafe connector. No data or environment configuration was changed in this continuation.

## What changed remotely and safety evidence

Immediately before migration, the existing project was `ACTIVE_HEALTHY`; Auth, DB and REST health were healthy, and `select 1` succeeded. Catalog inspection found no public relations, public policies, migration history table, or colliding QUICKKIT relation/function/trigger/index names. The migration tool's transactional `create_migration` applied the SQL to this existing project and returned migration name `202611100001_quickkit_account_data`, version `20261113045854`. The project migration list now records that version. Do **not** rerun the SQL manually: it deliberately fails on collisions rather than skipping or replacing objects.

Before migration, the inspected public schema had zero relations and no application rows. After migration, all five new QUICKKIT tables were verified empty. The migration adds tables/indexes/constraints, functions, policies and triggers; it has no drop/truncate/replace clauses. The Supabase connector exposes no backup/restore inventory, so backup retention/recovery availability was **not independently verified**. The migration tool rolls back on failure, and this additive migration did not overwrite or delete existing application data or unknown objects. The signup trigger affects future Auth user inserts only.

## Live database verification

All five relations exist in `public` with row-level security enabled:

- `quickkit_profiles` — id FK to `auth.users`, display name, creation/update timestamps.
- `quickkit_favorites` — `(user_id, tool_slug)` primary key, auth-user FK, slug check and creation time.
- `quickkit_contact_submissions` — consented name/email/subject/message with size checks and timestamps.
- `quickkit_feedback_submissions` — opt-in optional name/message with checks and timestamps.
- `quickkit_submission_limits` — scope + HMAC digest key, time window and nonnegative count.

The indexes, primary/foreign/check constraints, two triggers and three functions were inspected in PostgreSQL catalogs. Both `SECURITY DEFINER` functions are owned by `postgres` and pin `search_path=pg_catalog`; only the limiter function grants execute to `service_role`. No public/anon/authenticated execute grant is present. RLS policies live on profiles/favorites only; the three private tables intentionally have no client policies.

Live privilege checks confirmed:

- `anon` has no table/column access to profile/favorites and no access to contact/feedback/limiter data.
- `authenticated` can select/insert only allowed profile/favorite columns and update only `display_name`; profile `id`/timestamps are not updateable, favorites have no UPDATE, and contact/feedback remain unreadable.
- `service_role` can insert only the permitted columns in contact/feedback, cannot read those tables, and has no direct limiter table access. It can execute the limiter RPC; `anon` and `authenticated` cannot.
- Live, rolled-back RPC tests under `service_role` accepted the first four contact and first five feedback attempts, rejected the next attempt for each scope, and rejected invalid scope and malformed digest inputs. Transactions were rolled back and all five tables remain at zero rows.

These are real catalog/privilege/RPC checks, but not authenticated PostgREST requests by two real users. Cross-user RLS behavior still needs the disposable-account tests below.

## Current administrator-only authentication model

The current implementation uses Supabase Auth exclusively for authorized QUICKKIT administrators. Visitor signup/login/account/password-recovery pages have been removed from the public experience and legacy paths redirect to public tools. Browser-local favorites/preferences remain local and public tool routes do not require Supabase.

- Protected admin pages and each `/api/admin/*` request call server-side Auth and compare the verified email to `QUICKKIT_ADMIN_EMAILS`.
- The owner must verify public signup is disabled directly in the Supabase dashboard. The app’s allowlist blocks unauthorized admin use but cannot prove the provider’s public signup setting.
- Administrator identities should be created/invited through owner-controlled Auth administration; do not re-enable visitor signup to provision an admin.
- Callback handling allows only administrator destinations and signs out non-allowlisted identities.
- The pending admin migration is `supabase/migrations/202611100002_quickkit_master_admin.sql`; it has not been applied. Review `ADMIN_SETUP.md` and `SUPABASE_ADMIN_SECURITY.md` before an approved application.

### Prior external configuration warning

An earlier Supabase Auth configuration update is unresolved and was not approved for rollback. This implementation did not change it. Historical settings elsewhere in this document are not proof of the current live Auth configuration. The project owner must inspect the current dashboard directly and decide whether any correction is needed. Do not assume current values from old notes or rerun prior changes.

### Required environment variable names

Use names only in deployment configuration; do not store or reproduce values in documentation:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only secret)
- `QUICKKIT_ADMIN_EMAILS` (server-only allowlist)
- `SUPABASE_SUBMISSION_HMAC_SECRET` (server-only secret for public form throttling)

`ADMIN_SETUP.md` documents setup and safe rollback steps. No live key, HMAC value, password, SMTP credential, access token, or private submission is included here.

## Current application behavior and security boundaries

The public site provides anonymous tools and browser-local favorites/preferences. Public visitors have no Supabase Auth client, registration/login UI, profile, or cross-device favorites. Existing legacy profile/favorite schema from migration `202611100001_quickkit_account_data` is historical and is not used by the current public application; do not rerun or remove it as part of this admin work.

Contact and feedback submission endpoints remain public intake, not authenticated inbox endpoints. They require an exact same-origin `Origin`, JSON/body limits, strict field allowlists, validation and explicit consent. Origin is a CSRF/browser-origin check—not authentication. Server-side HMAC buckets use a validated ingress IP; RPC/database/config failures fail closed. Contact allows 4 and feedback 5 attempts per 15-minute bucket. Vercel's trusted ingress IP header behavior should still be confirmed in a deployed request before treating rate limits as robust against header spoofing.

The admin service-role client is marked `server-only`. Protected reads/writes require a verified Supabase session and email allowlist; the key is never sent to the browser. Admin submissions are private. The pending migration gives no public/anon/authenticated table access to new admin tables, and the app logs only explicitly allowed non-sensitive audit metadata.

## Remaining live security tests

### Safe administrator/Auth/RLS procedure

Use only an owner-approved non-production target if already available; do not create a second Supabase project. Do not enable public signup to create a test administrator. Have an owner-controlled administrator account and one deliberately non-allowlisted test identity provisioned through the Supabase dashboard. Keep credentials/tokens in a password manager or local process environment, never in this report, chat, shell history, or screenshots. Never use the service-role key from a browser.

**Prerequisites:** owner verifies current Auth settings (including public signup disabled), callback URL allowlist, strong admin password/MFA policy, and the pending migration has been separately approved and applied to the approved test target. No test writes should use real customer content.

1. With no Auth session, request every protected `/admin/*` page and `/api/admin/*` endpoint. Confirm pages redirect to `/admin/login`, APIs return safe 401/503 as appropriate, responses are no-store, and no private submission data is returned.
2. Sign in with the approved allowlisted administrator. Verify dashboard pages and API reads work only when the migration/database are available. Exercise catalog overrides, settings, submission status/notes, feedback classification, individually confirmed deletion, and audit records using synthetic data only.
3. Sign in with a provisioned non-allowlisted identity. Verify the login endpoint rejects it, callback signs it out, protected pages redirect, and APIs return 403. Try a forged client role/header/cookie and confirm it cannot grant access.
4. Test invalid JSON, missing/mismatched Origin, oversized requests, unknown keys, invalid enum values, identifier changes, and delete without explicit confirmation. Confirm no unexpected database mutation or audit entry occurs.
5. Query the new admin tables with `anon` and `authenticated` roles through PostgREST; reads and writes must fail. Verify public submission routes only create validated consented messages and cannot read submissions. Validate RLS/catalog privileges on the actual database after migration; do not infer them from application code alone.
6. Verify logout revokes the session, session expiration/cookie refresh behavior, callback same-origin admin-only `next` handling, and safe behavior when Supabase/allowlist/database configuration is missing.
7. Verify public tools and browser-local favorites remain usable without Auth and that no visitor signup/login/profile/favorites-sync entry points are exposed. Confirm submission records and admin events do not contain file contents, passwords, tokens, or other secrets.
8. Delete synthetic test rows and the temporary non-admin test identity only through explicit owner-approved, narrow cleanup steps. Recheck test markers and counts; never issue broad deletion queries.

**Current execution status:** no approved test administrator/non-allowlisted identity, non-production target, or tokens were provided for this turn. The admin migration was not applied. No live admin API/PostgREST request, migration verification, or live private submission inspection was performed. Local unit/integration tests are not a substitute for those checks.

## Current Master Admin implementation and QA checkpoint

The Master Admin pages/API and additive migration are local on the active Arena branch. `202611100002_quickkit_master_admin.sql` remains unapplied. Public catalog/SEO/site-setting overrides are persisted by the admin API but are not yet integrated into public rendering; do not treat edits as live public-site changes. See `MASTER_ADMIN_PANEL_REPORT.md` for the limitation and acceptance work.

- Node 26.13.1: typecheck, ESLint, Prettier `format:check`, production `next build` (84 static pages), and `git diff --check` passed.
- Full Vitest passed **109 files / 1,766 tests**.
- Focused Chromium E2E was blocked before assertions: all 21 selected tests could not launch because the Playwright headless-shell executable is absent at `/home/user/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell`. No E2E/manual responsive/accessibility result is claimed.
- No live admin Auth/RLS/PostgREST checks were run; the migration is unapplied and no approved test identities/target were provided.
- The earlier Supabase Auth configuration update remains unresolved. This implementation did not alter or attempt rollback. The owner must inspect the current Auth dashboard directly; historical settings above are not proof of current state.
- No production environment-variable change, migration/rollback, deployment, push, merge, or PR was performed.

See `ADMIN_SETUP.md` for owner setup and rollback cautions and `SUPABASE_ADMIN_SECURITY.md` for security boundaries. The required environment variable names are documented without values.

## Live state refresh — 10 November 2026 UTC

This block supersedes historical configuration claims above where they differ. The exact existing `Quick_kit` project ref `oevjmxcoyibkonousdoh` and `eu-west-1` region were verified against the project list and project details; no new project was created. Auth, DB, REST, and Storage health are `ACTIVE_HEALTHY`.

Migration history currently has only `202611100001_quickkit_account_data` (version `20261113045854`). All five existing application tables are present with RLS enabled and zero rows each. The four `quickkit_admin_*` tables and migration 002 are absent. Storage has zero buckets; no persistent uploads are required by current tools. `quickkit_profiles` and `quickkit_favorites` remain dormant legacy schema: the current product has no public account/signup UI and visitor favorites remain local.

The connector does not expose a backup inventory/export/restore workflow, so no verified backup point is evidenced. Migration 002 is **not applied**. Its SQL is locally reviewed and includes explicit false RLS policies for anon/authenticated on the private/admin tables, table/sequence revokes, and narrow server grants; static tests pass. Its rollback removes settings/overrides/audit data created after application and adds/removes workflow columns/policies, so apply only after an owner verifies a restorable backup and approves the exact migration on this project. Migration 001 must never be rerun.

Auth configuration was not re-read because a previous configuration response included the SMTP credential. Rotation/revocation is still unverified; owner must use the provider/Supabase dashboard and review mail logs without returning the old credential here. The last safely reviewed Auth metadata had public signup disabled, email confirmation retained, and password minimum 12, but treat those as last-known, not freshly revalidated. Vercel Production's last metadata check showed `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` present, `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_SUBMISSION_HMAC_SECRET` empty, and `QUICKKIT_ADMIN_EMAILS` absent. Preview/Development scopes were not re-read because the available listing may expose encrypted/plain values; never call a decrypt/get endpoint. No Vercel variables were changed.

The complete feature/data-source matrix and read-only schema evidence are in `SUPABASE_INTEGRATION_REPORT.md`. A zero row count and local API unit tests do not prove live application writes, PostgREST/RLS behavior, or production availability.

## Resume status from checkpoint `4e46464` — 10 November 2026 UTC

Owner reports that SMTP credentials were updated. No credential was fetched or repeated. Independent confirmation that the prior credential is invalid and the current SMTP setup/email behavior cannot be obtained safely with the available Auth connector: its configuration read previously returned the credential itself. Incident status is owner-reported mitigation; provider logs and safe delivery verification remain outstanding.

Fresh project/history check still shows the exact existing project healthy, migration 001 only, five existing tables with RLS enabled and zero rows, and all four migration-002 tables absent. A synthetic service-role contact and feedback insert succeeded in one transaction that ended with `ROLLBACK`; counts remained zero. A direct SQL read as `anon` was denied for all five existing tables. These are live database-role checks, not live app HTTP/PostgREST or two-user tests.

No backup inventory/export/restore tool is available; no verified restorable backup was found, so migration 002 remains unapplied. Vercel environment scopes were not queried because the available list can return values; last known Production status remains in the integration report. Do not use the Auth config connector or Vercel decryption endpoint to check these statuses. Current evidence and blockers are in `SUPABASE_INTEGRATION_REPORT.md`.

## Authoritative migration-002 completion update

The historical text above that says migration 002 remains unapplied is superseded. `quickkit_master_admin` has now been applied exactly once as version `20261114190425` to the existing project. Live checks verify nine expected RLS-enabled tables, indexes, constraints, triggers/functions, browser-deny policies, SQL-role read denials, restricted service-role contact/feedback update columns, and zero rows in all nine tables. Migration 001 remains at `20261113045854`; never rerun either migration. These database-role checks do not establish live PostgREST/two-user authorization or Admin HTTP CRUD. Current exact results and remaining owner/config blockers are in `SUPABASE_INTEGRATION_REPORT.md`.
