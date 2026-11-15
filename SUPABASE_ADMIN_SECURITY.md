# QUICKKIT Supabase admin security notes

**Current status:** both existing migrations are applied once; nine QUICKKIT tables exist with RLS enabled and zero rows. The older pending-migration sections below are historical; do not rerun either migration. See [QUICKKIT_FINAL_MASTER_COMPLETION_REPORT.md](./QUICKKIT_FINAL_MASTER_COMPLETION_REPORT.md) for current evidence, Vercel configuration findings, and remaining owner actions.

**Scope:** private Master Admin Panel, server-side submissions, and the existing Supabase project only. This is an implementation/security review, not a compliance certification or proof of production configuration.

## Trust boundary

- Every protected `/admin/*` page resolves a server Supabase session and checks its normalized email against `QUICKKIT_ADMIN_EMAILS`. Every `/api/admin/*` request repeats the server-side session/allowlist check before reading or writing data.
- Supabase Auth is used only for allowlisted administrators. Public visitor signup/login/account/password recovery pages now redirect away. Public tools and browser-local favorites do not depend on Supabase Auth.
- `SUPABASE_SERVICE_ROLE_KEY` is read only from a `server-only` module. It is not returned in responses or used in browser modules. No browser role or client-side state grants admin access.
- Admin mutation requests require same-origin `Origin`, JSON content type, bounded body size, strict key allowlists, type/range/length validation, and catalog identifiers drawn from the static QUICKKIT catalogue.
- Admin responses use `Cache-Control: no-store`; private submissions are only available after authorization. Public APIs accept new consented contact/feedback records only, with validation/rate limiting; they do not provide inbox reads.
- Audit events contain the allowlisted actor identity, operation, entity identifiers, and explicitly selected metadata. Form message bodies, passwords, session tokens, and secret values are not passed to audit logging.

## Database controls implemented by the applied admin migration

`supabase/migrations/202611100002_quickkit_master_admin.sql`:

- Adds constrained status and private internal-note columns to the existing contact/feedback tables.
- Adds sparse catalog override tables, supported site settings, and append-oriented admin activity.
- Enables RLS on the four new admin tables and adds explicit `USING (false) WITH CHECK (false)` policies for `anon`/`authenticated` on all seven private/admin tables (the four new tables plus existing contact, feedback, and submission-limit tables). It revokes browser-role table privileges; it also revokes `service_role` from new admin tables before granting only the selects/writes the handler needs. Contact/feedback service-role privileges remain column-limited for the new admin writes.
- Revokes all sequence privileges from `public`, `anon`, `authenticated`, and `service_role`, then grants only `USAGE, SELECT` on the activity identity sequence to `service_role` for event inserts. This counters the live default-ACL observation that future public-schema sequences can inherit broad `anon`/`authenticated` privileges.
- Static regression tests verify additive transaction shape, RLS, explicit table and identity-sequence revoke lists, and least-privilege grants. These do not substitute for owner review or post-migration live privilege/RLS tests.
- Does not install visitor-facing policies or expose inbox data through public routes.

The service role bypasses RLS by design. It is constrained by the server module boundary and request authorization, so it remains a high-impact secret. Review its use and deployment scope before release. The migration is additive, but its rollback deletes all overrides/settings/audit rows created after application and removes workflow columns; see `ADMIN_SETUP.md` before any rollback.

## Configuration and status

`QUICKKIT_ADMIN_EMAILS` is a server-only allowlist of complete email addresses. Empty/unset allowlist, missing Supabase configuration, unavailable database, and missing admin tables all fail closed. Auth provider settings (public signup disabled, email/password policy, MFA/SMTP, exact callback URLs) are externally managed and must be checked directly by the project owner. The status page deliberately reports signup as “Verify in Supabase dashboard”; it does not assert a live value it cannot safely introspect.

The environment example contains names/placeholders only. Never paste actual keys, passwords, SMTP credentials, user tokens, or private submission content into source, docs, logs, issues, or chat. Do not use a real end-user submission as an admin test record.

## Verification still required before production use

- Apply the pending admin migration only after explicit approval and a verified backup/recovery plan.
- Verify the exact production email allowlist and Auth signup-disabled configuration in the owner dashboard; the application cannot prove the hosted signup setting from its public API.
- Run logged-out and signed-in non-allowlisted negative requests against all admin routes. Verify direct public PostgREST requests cannot read admin tables or private submissions.
- Test allowlisted admin login/logout/session expiry/cookie refresh, including the callback and a non-admin Supabase identity.
- Exercise catalog/settings/submission mutations, invalid fields, cross-origin requests, delete confirmation, audit ordering, no-store responses, and database-unavailable behavior against a non-production approved environment.
- Review public settings behavior and metadata changes before enabling any field that can change public output. Arbitrary HTML/scripts are not supported settings.
- Perform a privacy review, independent security review, dependency scanning, and responsive browser testing. Do not infer certification or production readiness from local unit tests.

No production deployment, production environment-variable change, production migration application, or live admin submission inspection was performed by this implementation turn. A prior Supabase Auth configuration update is unresolved and was not modified or rolled back; the owner must verify current settings directly before proceeding.

## Latest continuation correction — 10 November 2026 UTC

See [QUICKKIT_FINAL_MASTER_COMPLETION_REPORT.md](./QUICKKIT_FINAL_MASTER_COMPLETION_REPORT.md) for the authoritative current blocker list. Fresh read-only checks show the admin tables/migration remain absent, and Vercel Production service-role/HMAC values are empty with no `QUICKKIT_ADMIN_EMAILS`. Supabase Auth currently reports signup disabled, password minimum 12, and populated SMTP configuration; email delivery was not tested. A connector response unexpectedly included the SMTP credential, so the owner must rotate it immediately. No production change was made.

## Current read-only live preflight — 10 November 2026 UTC

Project `Quick_kit` (`oevjmxcoyibkonousdoh`) is healthy. Migration history lists only `202611100001_quickkit_account_data`, version `20261113045854`; `202611100002_quickkit_master_admin.sql` is not applied. Read-only catalog inspection found only `quickkit_contact_submissions` and `quickkit_feedback_submissions` among the six expected admin/submission tables. Both existing submission tables have RLS enabled, no policies, and no `anon`/`authenticated` table privileges in the inspected catalog. The four admin override/settings/activity tables are absent. This is metadata/grant evidence, not a session-based test of anonymous, unauthorized, or authorized requests; no direct PostgREST or authenticated-role test was performed.

Auth configuration readback showed public signup disabled, email enabled, email auto-confirm disabled, and password minimum 12. The deployed `QUICKKIT_ADMIN_EMAILS` allowlist and server-side env presence were not verified. No login/logout, protected page/API matrix, submission privacy mutation, RLS session test, migration, or data-changing SQL was run. Never rerun account-data migration 001. Migration 002 requires explicit owner approval and backup/recovery review before execution.

## Live state and pending migration refresh — 10 November 2026 UTC

Verified exact target: existing `Quick_kit` / `oevjmxcoyibkonousdoh` in `eu-west-1`; Auth/DB/REST/Storage healthy. Remote ledger has migration 001 only; all five existing QUICKKIT relations have RLS enabled and zero rows, and all four Master Admin tables are absent. Existing profile/favorite user policies were found; contact, feedback, and limiter have no client policies in migration 001 and have no anonymous table privileges. The last read-only default-ACL check found broad default grants for future public tables/sequences under certain object-creator roles. Do not infer current data exposure from defaults.

Pending migration 002 now adds explicit deny-all RLS policies for `anon`/`authenticated` on the three pre-existing private intake/limiter tables and four new admin tables, and explicitly revokes/grants its table and identity-sequence privileges. Local static tests pass. It has **not** been applied; no live policy test is claimed. A live catalog review after an approved apply must verify each policy and ACL, followed by anon/private PostgREST denials and owner-authorized session tests.

The connector has no backup/export/restore inventory capability. No verified owner backup is available as evidence, so migration application is blocked until the owner supplies/confirms a restorable recovery point. A previous Auth connector response exposed SMTP credential material; do not re-read Auth config through that connector. Rotation/revocation remains unverified and the incident is open. Vercel's last Production check showed service-role/HMAC empty and `QUICKKIT_ADMIN_EMAILS` absent; the live Admin and form server operations cannot be claimed connected. No secret values were read in this refresh.

## Resume verification from checkpoint `4e46464` — 10 November 2026 UTC

Fresh catalog check confirms migration 002 and the four Admin tables are still absent. The five existing tables remain RLS-enabled and empty. The six existing self-owned policies are intact. A direct `anon` SQL-role test was denied on all five current application tables. Synthetic contact/feedback inserts through `service_role` succeeded within a transaction rolled back immediately; this did not test the public API or expose any data. No two-user Auth/PostgREST or Admin CRUD test was possible without test identities, deployed server configuration, and migration 002.

The owner reports SMTP credential update. This is recorded as owner-reported mitigation, not independently verified revocation: the safe Auth configuration reader returns credential material and was not called again. No credential values were retrieved. Migration 002 remains blocked by absence of a verified backup/recovery point; the connector has no backup/export/restore inventory tool. Vercel environment metadata was not refreshed because the only listing may return values; see the prior Production status in the current completion report.

## Authoritative migration-002 verification update

The pending-migration language in the historical notes above is superseded: `quickkit_master_admin` was applied exactly once to `oevjmxcoyibkonousdoh` at version `20261114190425`. All nine expected tables and their RLS, expected indexes/constraints, functions/triggers, and private-table browser-deny policies were verified live. SQL-role `anon` reads were denied on all nine; `authenticated` reads were denied on private intake/limiter/Admin tables. These are database SQL role tests, not Auth JWT/PostgREST two-user isolation. All nine tables remain empty. Contact/feedback service-role UPDATE column grants were confirmed limited to their workflow and notes fields. Do not reapply either migration. Live HTTP Admin/intake verification and independent SMTP incident closure remain outstanding; see `SUPABASE_INTEGRATION_REPORT.md`.
