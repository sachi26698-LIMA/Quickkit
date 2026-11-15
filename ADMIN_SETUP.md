# QUICKKIT Master Admin — current setup and verification guide

**Current disposition: NEEDS ATTENTION.** The Admin routes, server-side Auth gates, and database operations are implemented locally, but no real Admin login or CRUD was run. This is not production enablement. Do not change production configuration, apply migrations, or deploy without separate owner approval.

## Current verified state

- Use the existing Supabase project `Quick_kit` (`oevjmxcoyibkonousdoh`) and existing Vercel project `quickkit`. Both expected Supabase migrations are already recorded as applied once: `202611100001_quickkit_account_data` / `20261113045854`, and `quickkit_master_admin` / `20261114190425`. **Do not replay, duplicate, reset, or create migrations/projects.**
- Auth, database and REST health are `ACTIVE_HEALTHY`. All nine `quickkit_*` tables exist with RLS enabled. Browser-deny policies are present on private submissions, submission limits and Admin tables; profile/favorites tables retain self-scoped policies. This is catalog evidence, not live JWT/PostgREST isolation testing.
- The live data check read counts only: eight tables are empty; `quickkit_profiles` has one existing row. No row content was inspected or changed.
- Current local checkout has no dotenv files. Its Admin endpoints fail closed because `QUICKKIT_ADMIN_EMAILS` is absent locally. No local Auth login or real database save was attempted.
- Vercel project metadata shows the allowlist configured for Production/Preview/Development; its value is not included here. Supabase public URL/publishable-key entries exist for Production only. Production service-role and HMAC entries have empty values; matching Preview/Development Supabase/server entries are absent. The exact matching Auth identity and password were not verified.
- Production still deploys `main` commit `2aeea2bc9af633cbf4108cd5b560945d36fb2e0f`; the current local integration is not deployed. Node is aligned at 26.x in package, CI and Vercel project settings. This sandbox uses Node 22.22.3.
- The full current report is [QUICKKIT_FINAL_MASTER_COMPLETION_REPORT.md](./QUICKKIT_FINAL_MASTER_COMPLETION_REPORT.md). Older report snapshots are historical and may conflict with the verified state above.

## Admin routes and implemented operations

- `/admin/login` — Supabase Auth password sign-in for an allowlisted administrator; `/api/admin/auth/logout` clears the local session.
- `/admin` — dashboard counts and recent activity from database queries when configured; unavailable state is used when services are missing.
- `/admin/tools` — edit existing code-defined tool metadata, visibility/publication, category, icon, feature flag and SEO fields. Existing tools have a separately confirmed Archive action that disables/unpublishes without deleting the catalogue definition; Reset overrides restores shipped defaults and is not archive. There is **no tool creation API/UI**.
- `/admin/categories` — create custom category, edit name/description/icon/SEO, order and publication; soft-archive an empty category. Categories with assigned tools cannot be archived until reassigned/unpublished.
- `/admin/site-settings` — supported validated site name/tagline/contact/links/announcement/maintenance/homepage fields.
- `/admin/submissions` and `/admin/feedback` — private inbox, filtering, status/notes; feedback classification; individually confirmed deletion.
- `/admin/activity`, `/admin/security`, `/admin/seo`, `/admin/profile` — audit activity, configuration/system state, public SEO projection and current administrator profile.

The custom tool limitation is architectural: executable tool definitions, routes and processing components are code-defined; the current sparse override table can edit the shipped catalogue but does not create a new tool implementation. Do not represent new-tool creation or archive as supported until a separately designed and tested feature is added.

## Required environment variable names

Use the approved environment's secret manager. Never copy values into this document, source code, screenshots, terminal transcripts, or chat.

- `QUICKKIT_ADMIN_EMAILS` — server-only exact email allowlist; use only the existing owner-approved identity.
- `NEXT_PUBLIC_SUPABASE_URL` — existing project URL.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — public anon/publishable key; still subject to RLS.
- `SUPABASE_SERVICE_ROLE_KEY` — highly privileged, server-only; never prefix with `NEXT_PUBLIC_`.
- `SUPABASE_SUBMISSION_HMAC_SECRET` — server-only key for form submission rate limiting.

Do not configure the Production service-role key in this shared workspace. Do not create a new Auth user, reset a password, enable public signup, alter SMTP/Auth settings, or change Vercel variables on behalf of the owner.

## Owner-only verification sequence

1. Confirm the exact existing project and the approved non-production target. Supabase currently exposes only its default `main` branch; no isolated branch or staging target was found. Do not create a project/branch or point Preview to Production without explicit approval.
2. In the owner-controlled Supabase dashboard, verify that the existing approved administrator account is active and its email matches the existing Vercel allowlist. Sign in yourself with that existing account; do not send the password to the agent/chat. No user list or password was accessed here.
3. Securely provision missing nonempty service-role/HMAC values in the approved runtime. Confirm Production/Preview/Development scopes intentionally; ensure service credentials remain server-side.
4. Keep public signup disabled as owner policy. Auth configuration was not reread here because the available connector can return sensitive Auth configuration material. Verify signup, callbacks and MFA directly in the dashboard without copying any secret values.
5. After owner-approved test target/configuration exists, use disposable synthetic data to verify login/logout/session refresh, authorized and non-allowlisted responses, data CRUD/reload, public propagation, inbox privacy, audit logs, RLS/PostgREST denial, validation and error/empty states. Do not write to Production without explicit approval.
6. Run responsive and accessibility checks in supported Chromium after obtaining the pinned Playwright browser in a standard Linux runner with CDN access: `npx playwright install --with-deps chromium`; then `npx playwright test --project=chromium` under Node 26.x.

## Database safety boundary

No migration needs to be applied for the current Admin schema; both existing migrations are already present. No migration was replayed. Never change/drop/seed tables or inspect private submission/profile content for routine verification. The live count of one profile row is not permission to inspect/delete it. Service-role access bypasses RLS and must remain behind the server-only module and verified Admin authorization. Catalog checks do not prove real HTTP/Auth behavior.

## Visitor statistics are separate

The visitor chart is implemented using libSQL/Turso (`ANALYTICS_DATABASE_URL`, optional `ANALYTICS_DATABASE_TOKEN`), not Supabase. These variables were not present in local configuration or Vercel project metadata. Without an approved persistent DB, the endpoint intentionally reports unavailable rather than demo data. No live analytics database operation was run.
