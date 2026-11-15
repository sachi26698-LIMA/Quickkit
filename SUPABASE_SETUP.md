# QUICKKIT Supabase integration — current verified status

**Disposition: NEEDS ATTENTION for production use.** This guide supersedes earlier conflicting snapshots retained elsewhere in the repository. It records current read-only evidence for the existing project and owner setup steps; it does not authorize a migration, row mutation, Vercel setting change, or deployment.

## Existing project and migration ledger

- Supabase project: `Quick_kit`, ref `oevjmxcoyibkonousdoh`, region `eu-west-1`.
- Auth, database and REST currently report `ACTIVE_HEALTHY`.
- Existing migrations, each recorded once:
  - `202611100001_quickkit_account_data` (version `20261113045854`)
  - `quickkit_master_admin` (version `20261114190425`)
- **Do not rerun or duplicate either migration. Do not create another project, branch or table set.** The only Supabase DB branch listed is the existing default `main`; no isolated staging branch is available.

## Live schema and RLS inspection

Nine QUICKKIT tables are present with RLS enabled:

1. `quickkit_profiles`
2. `quickkit_favorites`
3. `quickkit_contact_submissions`
4. `quickkit_feedback_submissions`
5. `quickkit_submission_limits`
6. `quickkit_admin_tool_overrides`
7. `quickkit_admin_category_overrides`
8. `quickkit_admin_site_settings`
9. `quickkit_admin_activity`

The live catalog shows self-scoped policies on profile/favorites and explicit browser-role deny policies on the four Admin tables, contact, feedback and submission-limit tables. Schema constraints include stable slug/key primary keys, bounded content fields, supported setting keys/status/type checks and owner/updater foreign keys to Supabase Auth. This is read-only catalog evidence—not real JWT/PostgREST isolation or a two-user access test. No private row content was queried.

Read-only row counts showed zero rows in eight tables and one existing `quickkit_profiles` row. That row was not read or changed; no cleanup is authorized. Admin overrides/settings/activity and contact/feedback inboxes are empty, so there is no live saved content to verify propagating to public pages.

## Application data boundaries

- **Public tool/category catalogue:** version-controlled tool and base-category definitions are projected with sparse DB overrides by server-rendered Next.js routes. Public projection applies publication/enabled filters and field validation; browser code does not receive a service-role key or query the private override tables directly. Unknown/unpublished route behavior has local tests. Save/reload/public propagation has not been executed against real DB data.
- **Admin settings and metadata:** supported keys are validated in `/api/admin/*` and persisted in existing override/settings tables. Home, layout, contact and catalog consumers render supported values through normal escaped React text/attributes and validated links. Current tables are empty and the local runtime is unconfigured.
- **Contact/feedback:** public submissions are validated, consented and same-origin checked; server-only HMAC limiting uses the `quickkit_submission_limits` RPC/table. Private inbox reads/updates/deletes require the authorized Admin API. No live HTTP submission or synthetic DB row was created in this task.
- **Admin activity:** events are written/read through server-only database access. No real Admin mutation was made; live activity table is empty.
- **Profiles/favorites:** existing tables are legacy/dormant in the visitor UI; favorites remain browser-local and no visitor account/login feature is enabled. Preserve existing records.
- **Visitor statistics:** separate libSQL/Turso database, not Supabase. `ANALYTICS_DATABASE_URL` and optional `ANALYTICS_DATABASE_TOKEN` are absent from local runtime and were not listed in Vercel project metadata. No analytics table was read or written.

`SUPABASE_SERVICE_ROLE_KEY` is privileged and bypasses RLS; its only valid use is server-only, post-authorization Admin/server code. Do not expose it through `NEXT_PUBLIC_*`, logs, docs, browser code, or client calls. No policies were weakened or changed during this audit.

## Configuration finding

The local built Admin API was previously reproduced as HTTP 503 `Administrator email allowlist is not configured.` The local allowlist is checked first and missing local `QUICKKIT_ADMIN_EMAILS` causes the response before Supabase client creation. All local dotenv files are absent.

Vercel metadata confirms `QUICKKIT_ADMIN_EMAILS` exists in Production, Preview and Development and matches the requested owner identity. A filtered, read-only query confirms exactly one `auth.users` account matches that identity; no password, account profile or other auth-user rows were queried. Active/confirmed status and successful login remain unverified. Production `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` entries are present; Preview/Development entries are absent. Production `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_SUBMISSION_HMAC_SECRET` entries exist but are empty; Preview/Development entries are absent. These two empty entries are the current production Admin/intake configuration blocker. `SITE_URL` and `LAUNCH_APPROVED` entries are present in Production metadata. No analytics DB variables were listed. No Vercel setting was changed. The latest Production deployment remains from `main`, not this local branch. No values are reproduced.

## Owner actions required

1. The existing owner Auth identity and Vercel allowlist match, but session authentication is not verified. The owner should use that existing account to test login/logout and account status; no password was accessed.
2. Securely populate the existing empty Production entries for server-only `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_SUBMISSION_HMAC_SECRET`; do not create duplicates. Resolve missing Preview/Development public Supabase scopes only after selecting an approved isolated target. Do not point Preview to Production or reuse production secrets without approval.
3. Review Supabase Auth signup/callback/MFA settings directly in the dashboard. The Auth configuration connector was not used because its response may include sensitive settings. Keep public signup disabled unless the owner explicitly changes policy.
4. After an approved non-production target/configuration exists, run authenticated Admin login/logout and role-boundary tests; test public anon/authenticated PostgREST denial on private data; perform controlled Admin edits and verify save → reload → public propagation with disposable synthetic data. Do not mutate live Production data without separate explicit approval.
5. Do not apply migrations again. If a future schema change is proposed, create a distinct owner-reviewed migration only after backup/recovery approval and test it in an approved isolated target.
6. Consider provisioning an approved persistent libSQL/Turso target separately if the visitor-statistics feature is to be enabled.

## Safe local setup

Use an owner-approved isolated project/runtime and a local ignored `.env.local`; obtain variables from the owner-managed dashboard/secret store. Never put values in `.env.example`, commit `.env.local`, paste credentials into chat, or run this shared workspace with Production service-role credentials. This workspace currently has none of the listed Supabase/Admin/analytics variables and is expected to fail closed. No write test was attempted.

For exact current branch, test and deployment evidence, see [QUICKKIT_FINAL_MASTER_COMPLETION_REPORT.md](./QUICKKIT_FINAL_MASTER_COMPLETION_REPORT.md). For Admin route behavior and unsupported tool creation/archive, see [ADMIN_SETUP.md](./ADMIN_SETUP.md).
