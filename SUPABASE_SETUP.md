# QUICKKIT Supabase integration — current verified status

**Disposition (16 November 2026): connected and in use by production.** The production site reads and writes this project through server-only code. This guide records what was verified read-only on that date and what still needs the owner; it supersedes earlier conflicting snapshots retained elsewhere in the repository.

## Existing project and migration ledger

- Supabase project: `Quick_kit`, ref `oevjmxcoyibkonousdoh`, region `eu-west-1`.
- Auth, database and REST report `ACTIVE_HEALTHY`.
- Applied migrations, each recorded once (repository file → recorded version):
  - `202611100001_quickkit_account_data.sql` → `20261113045854`
  - `202611100002_quickkit_master_admin.sql` → `20261114190425`
  - `202611160001_quickkit_tool_feedback.sql` → `20261116035647`
  - `202611160002_quickkit_feedback_rating.sql` → `20261116060044`
  - `202611160003_quickkit_system_health.sql` → `20261116064143`
  - `202611160004_quickkit_visitor_flood_guard.sql` → `20261116071310`
- **Do not rerun or duplicate any of these. Do not create another project, branch or table set.** The only Supabase DB branch is the default `main`; no isolated staging branch is available.

## Live schema and RLS inspection

Fifteen QUICKKIT tables are present, all with RLS enabled and no table privilege for the `anon` role:

1. `quickkit_profiles`
2. `quickkit_favorites`
3. `quickkit_contact_submissions`
4. `quickkit_feedback_submissions`
5. `quickkit_submission_limits`
6. `quickkit_admin_tool_overrides`
7. `quickkit_admin_category_overrides`
8. `quickkit_admin_site_settings`
9. `quickkit_admin_activity`
10. `quickkit_tool_feedback`
11. `quickkit_tool_feedback_limits`
12. `quickkit_visitor_totals`
13. `quickkit_visitor_ids`
14. `quickkit_visitor_sessions`
15. `quickkit_error_events`

Profiles and favorites have self-scoped policies; every other table has an explicit deny policy for browser roles and is reached only by server code. The Admin → Overview "System health" panel repeats this check against the live catalog (`quickkit_system_health()`) and names any table that fails it. This is catalog evidence, not a two-user JWT isolation test. No private row content was read for this document.

## Application data boundaries

- **Public tool/category catalogue:** version-controlled tool and base-category definitions are projected with sparse DB overrides by server-rendered Next.js routes. Public projection applies publication/enabled filters and field validation; browser code does not receive a service-role key or query the private override tables directly. Unknown/unpublished route behavior has local tests.
- **Admin settings and metadata:** supported keys are validated in `/api/admin/*` and persisted in existing override/settings tables. Home, layout, contact and catalog consumers render supported values through normal escaped React text/attributes and validated links.
- **Contact/feedback:** public submissions are validated, consented and same-origin checked; server-only HMAC limiting uses the `quickkit_submission_limits` RPC/table. Private inbox reads/updates/deletes require the authorized Admin API.
- **Admin activity:** events are written/read through server-only database access.
- **Profiles/favorites:** existing tables are legacy/dormant in the visitor UI; favorites remain browser-local and no visitor account/login feature is enabled. Preserve existing records.
- **Visitor statistics and error events:** stored in this Supabase project by migration `202611160003_quickkit_system_health.sql` (tables `quickkit_visitor_totals`, `quickkit_visitor_ids`, `quickkit_visitor_sessions`, `quickkit_error_events`). RLS denies browser roles and only `service_role` may call the four functions. Migration `202611160004_quickkit_visitor_flood_guard.sql` limits new visits to 120 per minute. A libSQL/Turso database (`ANALYTICS_DATABASE_URL`) is an optional alternative for the visitor counter.

`SUPABASE_SERVICE_ROLE_KEY` is privileged and bypasses RLS; its only valid use is server-only, post-authorization Admin/server code. Do not expose it through `NEXT_PUBLIC_*`, logs, docs, browser code, or client calls. No policies were weakened or changed during this audit.

## Configuration status

Vercel Production has these variables set (names only; values were not read): `QUICKKIT_ADMIN_EMAILS`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_SUBMISSION_HMAC_SECRET`, `SITE_URL`, `LAUNCH_APPROVED`, `ERROR_MONITORING_ENABLED` and `AUTH_SMTP_VERIFIED_ON`. Preview and Development have none of them, so those builds fail closed (Admin API `503`, no indexing).

The production site answers `GET /api/visitor-stats` from this project, which shows the server-only key is working there. Supabase Auth has public signup disabled, a custom SMTP sender configured and TOTP MFA available.

## Owner actions still open

1. Send yourself one sign-in email from `/admin/login` to confirm delivery. `AUTH_SMTP_VERIFIED_ON` records the date the SMTP settings were confirmed present; no test email is sent by the application.
2. Keep public signup off and review Auth URL configuration, password policy and backups in the Supabase dashboard; the application does not read or change them.
3. Role-boundary tests with real sessions (anon and authenticated PostgREST denial on private tables) have not been run against Production and need an approved isolated target or explicit approval.
4. Any future schema change is a new, separately reviewed migration file; never edit or rerun an applied one.

## Safe local setup

Use an owner-approved isolated project/runtime and a local ignored `.env.local`; obtain variables from the owner-managed dashboard/secret store. Never put values in `.env.example`, commit `.env.local`, paste credentials into chat, or run this shared workspace with Production service-role credentials. A workspace without these variables fails closed.

For exact current branch, test and deployment evidence, see [QUICKKIT_FINAL_MASTER_COMPLETION_REPORT.md](./QUICKKIT_FINAL_MASTER_COMPLETION_REPORT.md). For Admin route behavior and unsupported tool creation/archive, see [ADMIN_SETUP.md](./ADMIN_SETUP.md).
