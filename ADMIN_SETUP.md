# QUICKKIT Master Admin setup

This guide configures the private admin panel in the existing QUICKKIT deployment. It does not authorize a deployment, change production environment variables, or apply a database migration. Public tools remain anonymous; there is no visitor registration, login, profile, or cloud-favorites feature.

**Current live-state correction (10 November 2026 UTC):** migrations `202611100001_quickkit_account_data` (`20261113045854`) and `quickkit_master_admin` (`20261114190425`) are already present in the existing project. Do not run either migration again. Migration 002 has already created the Admin tables; this guide is for owner-controlled configuration and verification, not migration application. Keep public signup disabled. The SMTP exposure remains owner-reported mitigation with independent revocation/log review/delivery pending.

## Routes

- `/admin/login` — administrator password sign-in.
- `/admin` — dashboard with tool/category counts, private submission totals, and latest audit events.
- `/admin/tools`, `/admin/categories` — edit allowlisted catalog metadata and visibility state.
- `/admin/submissions`, `/admin/feedback` — read/manage private records, status, feedback classification, private notes, and individually confirmed deletion.
- `/admin/seo`, `/admin/site-settings`, `/admin/security`, `/admin/activity`, `/admin/profile` — SEO inventory, supported persisted settings, configuration status, audit history, and current admin identity.
- `/api/admin/*` — private data API. Each request checks the Supabase Auth user and the server-side email allowlist. A client-only role/visibility check is not an authorization boundary.

No admin link is included in public navigation. Legacy visitor account paths redirect to public tools.

## Required server environment variable names

Set names in the hosting environment's server runtime only; do not copy values into docs, source, screenshots, or chat.

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` — secret; server-only; never add a `NEXT_PUBLIC_` prefix.
- `QUICKKIT_ADMIN_EMAILS` — server-only comma- or semicolon-separated allowlist. Use the exact verified administrator email addresses; do not add a broad domain wildcard.
- `SUPABASE_SUBMISSION_HMAC_SECRET` — server-only; required for existing public submission throttling.

`SITE_URL`, `LAUNCH_APPROVED`, and the existing ad controls continue to govern public SEO/ad behavior and are not admin credentials. Do not place live values in `.env.example`.

## Owner-controlled setup sequence

1. Confirm the target is the existing Supabase project and existing Vercel project; do not create a duplicate project.
2. Do not apply migration `202611100002_quickkit_master_admin.sql` again: it is already recorded as applied once. If the migration ledger disagrees, stop and have the database owner reconcile it; do not rerun or repair by guessing. Before any future schema change or rollback, require an owner-reviewed backup/recovery point and explicit approval.
3. Configure server environment variable names above in an owner-authorized environment. Keep the service-role key and HMAC secret in secret storage. Do not print or retrieve their values into a build log.
4. Configure Supabase Auth only for the administrator workflow. Disable public signups in the Supabase Auth dashboard; create/invite administrator identities through the owner-controlled Supabase dashboard. Add only those exact addresses to `QUICKKIT_ADMIN_EMAILS`. The application itself rejects all non-allowlisted sign-ins and all protected requests, but dashboard signup settings must also be verified by the owner.
5. Use a strong unique password and enable supported MFA from the Supabase Auth configuration/identity provider where available. Ensure the Supabase Site URL and redirect allow-list include only the actual deployment callback and required local development callback; do not add wildcard redirect domains.
6. After a separately approved migration, sign in at `/admin/login`. Verify security status and read/write a non-sensitive catalog override. Confirm protected API requests return an authentication error when logged out and a forbidden response for a signed-in, non-allowlisted user.
7. Verify dashboard counts and private inbox queries against real database records. If the migration or server service is unavailable, the admin UI should show a safe unavailable state rather than fabricated values.
8. Confirm public tools, public URLs, robots/sitemap settings, anonymous favorites, and public feedback/contact forms continue to work without a visitor Auth session.

### Local development

The public site and browser-local tools can run with no Supabase environment configured. Admin sign-in/data endpoints intentionally fail closed until the server variables, administrator allowlist, and migration are set. Never commit `.env.local` or paste secrets into a terminal transcript. `npm run dev` binds on all interfaces for the Arena preview.

## Migration and rollback

The migration adds workflow columns to existing private contact/feedback tables and creates sparse tool/category overrides, supported site settings, and admin activity tables. It enables RLS, revokes browser-role access, and grants only server `service_role` access needed by the API. It does not seed data or replace/drop application tables. It must not be applied until approved.

Rollback is a data-destructive operational change because it removes audit events, saved admin overrides/settings, and the contact/feedback status/notes added by this migration. If the migration has been applied and rollback is approved:

1. Stop or disable the new admin application/API first; confirm no process is writing to these tables.
2. Take and verify a current backup/export. Preserve audit and override data separately if required.
3. Obtain explicit database-owner approval and review exact target project/ref plus migration version. Do not run this rollback against a guessed or different project.
4. In a transaction, revoke any temporary grants; drop only the three browser-deny policies this migration adds to the pre-existing `quickkit_contact_submissions` (`Deny browser access to contact submissions`), `quickkit_feedback_submissions` (`Deny browser access to feedback submissions`), and `quickkit_submission_limits` (`Deny browser access to submission limits`); drop only the four `quickkit_admin_*` tables created by this migration (their policies and the activity identity sequence are table-owned); then remove only the three indexes and status/notes/feedback-type columns introduced on the existing contact/feedback tables. Never drop the pre-existing submission tables or `quickkit_profiles`/`quickkit_favorites` from migration 001.
5. Verify schema and data restoration from the backup, then record the rollback version in the migration ledger. A rollback SQL is intentionally not auto-applied or run by the application.

Both migrations are already present in the existing project; this guide does not authorize a repeat migration or rollback.

## Current public propagation and live preflight (10 November 2026 UTC)

Public server rendering now projects catalog overrides into the home/search/listing/category views, public header and HTML/XML sitemap. Text settings and validated HTTPS links are rendered using normal escaped React text/attributes; no arbitrary HTML rendering is used. Public pages are dynamic so a refresh reads current database rows. Individual tool-page metadata/content and direct-route hiding for unpublished tools remain incomplete. Do not assume every SEO field in the admin form changes the detail page.

Read-only Supabase inspection of the existing project found only migration `202611100001_quickkit_account_data` (version `20261113045854`); do not rerun it. `202611100002_quickkit_master_admin.sql` remains unapplied, and its override/settings/activity tables are absent. The existing contact/feedback tables have RLS enabled, no policies, and no `anon`/`authenticated` table privileges in the inspected catalog. Live session-based RLS and PostgREST behavior have not been exercised. Apply migration 002 only after the owner explicitly approves the exact SQL, backup/recovery point, and target. Auth config readback showed signup disabled, email enabled, auto-confirm disabled, and password minimum 12; the exact deployed allowlist remains unverified.
