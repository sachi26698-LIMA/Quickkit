-- QUICKKIT Master Admin Panel.
-- Additive only: no application tables are dropped or replaced. Existing tool
-- and category records stay in the code catalogue; these tables store sparse
-- administrator overrides keyed by the existing stable slugs.
begin;

alter table public.quickkit_contact_submissions
  add column status text not null default 'new'
    check (status in ('new', 'in_progress', 'resolved')),
  add column internal_notes text not null default ''
    check (char_length(internal_notes) <= 10000);

alter table public.quickkit_feedback_submissions
  add column status text not null default 'new'
    check (status in ('new', 'in_progress', 'resolved')),
  add column feedback_type text not null default 'unclassified'
    check (feedback_type in ('unclassified', 'general', 'bug', 'feature_request', 'other')),
  add column internal_notes text not null default ''
    check (char_length(internal_notes) <= 10000);

create index quickkit_contact_status_created_idx
  on public.quickkit_contact_submissions (status, created_at desc);
create index quickkit_feedback_status_created_idx
  on public.quickkit_feedback_submissions (status, created_at desc);
create index quickkit_feedback_type_created_idx
  on public.quickkit_feedback_submissions (feedback_type, created_at desc);

create table public.quickkit_admin_tool_overrides (
  tool_slug text primary key
    check (tool_slug ~ '^[a-z0-9][a-z0-9-]{0,79}$'),
  name_override text null check (name_override is null or char_length(name_override) between 1 and 120),
  description_override text null check (description_override is null or char_length(description_override) <= 1000),
  category_override text null check (category_override is null or char_length(category_override) between 1 and 80),
  icon_override text null check (icon_override is null or char_length(icon_override) <= 40),
  metadata_override jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata_override) = 'object'),
  is_published boolean not null default true,
  is_enabled boolean not null default true,
  is_featured boolean not null default false,
  seo_title text null check (seo_title is null or char_length(seo_title) <= 180),
  seo_description text null check (seo_description is null or char_length(seo_description) <= 320),
  canonical_path text null check (
    canonical_path is null or (
      char_length(canonical_path) between 1 and 500 and
      left(canonical_path, 1) = '/' and
      left(canonical_path, 2) <> '//' and
      position('?' in canonical_path) = 0 and
      position('#' in canonical_path) = 0 and
      position(chr(92) in canonical_path) = 0
    )
  ),
  is_indexable boolean not null default true,
  updated_by uuid null references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.quickkit_admin_category_overrides (
  category_slug text primary key
    check (category_slug ~ '^[a-z0-9][a-z0-9-]{0,79}$'),
  name_override text null check (name_override is null or char_length(name_override) between 1 and 80),
  description_override text null check (description_override is null or char_length(description_override) <= 1000),
  display_order integer null check (display_order is null or display_order between 0 and 1000),
  is_published boolean not null default true,
  seo_title text null check (seo_title is null or char_length(seo_title) <= 180),
  icon_override text null check (icon_override is null or char_length(icon_override) <= 40),
  updated_by uuid null references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.quickkit_admin_site_settings (
  setting_key text primary key check (setting_key in (
    'website_name', 'tagline', 'contact_email', 'social_links',
    'footer_links', 'announcement', 'maintenance', 'homepage_content'
  )),
  setting_value jsonb not null check (jsonb_typeof(setting_value) in ('object', 'array', 'string', 'number', 'boolean')),
  updated_by uuid null references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.quickkit_admin_activity (
  id bigint generated always as identity primary key,
  actor_id uuid null references auth.users (id) on delete set null,
  actor_email text not null check (char_length(actor_email) between 3 and 254),
  action text not null check (char_length(action) between 1 and 80),
  entity_type text not null check (char_length(entity_type) between 1 and 80),
  entity_id text null check (entity_id is null or char_length(entity_id) <= 120),
  details jsonb not null default '{}'::jsonb
    check (jsonb_typeof(details) = 'object'),
  created_at timestamptz not null default now()
);

create index quickkit_admin_activity_created_idx
  on public.quickkit_admin_activity (created_at desc);
create index quickkit_admin_activity_actor_idx
  on public.quickkit_admin_activity (actor_id, created_at desc);

alter table public.quickkit_admin_tool_overrides enable row level security;
alter table public.quickkit_admin_category_overrides enable row level security;
alter table public.quickkit_admin_site_settings enable row level security;
alter table public.quickkit_admin_activity enable row level security;

-- Explicit deny policies document the intended RLS boundary in addition to
-- the table/column revokes. The server-only service_role bypasses RLS by design
-- and receives only the grants below; anon/authenticated cannot use these
-- policies to read, write, or delete private data even if a grant regresses.
create policy "Deny browser access to contact submissions"
  on public.quickkit_contact_submissions for all to anon, authenticated
  using (false) with check (false);
create policy "Deny browser access to feedback submissions"
  on public.quickkit_feedback_submissions for all to anon, authenticated
  using (false) with check (false);
create policy "Deny browser access to submission limits"
  on public.quickkit_submission_limits for all to anon, authenticated
  using (false) with check (false);
create policy "Deny browser access to admin tool overrides"
  on public.quickkit_admin_tool_overrides for all to anon, authenticated
  using (false) with check (false);
create policy "Deny browser access to admin category overrides"
  on public.quickkit_admin_category_overrides for all to anon, authenticated
  using (false) with check (false);
create policy "Deny browser access to admin site settings"
  on public.quickkit_admin_site_settings for all to anon, authenticated
  using (false) with check (false);
create policy "Deny browser access to admin activity"
  on public.quickkit_admin_activity for all to anon, authenticated
  using (false) with check (false);

-- No browser role (anon/authenticated/public) receives any access to private
-- submissions, overrides, settings, or audit events. Admin operations are
-- performed only by the server after the email allowlist/session check.
revoke all on table public.quickkit_admin_tool_overrides,
  public.quickkit_admin_category_overrides,
  public.quickkit_admin_site_settings,
  public.quickkit_admin_activity
  from public, anon, authenticated, service_role;
grant select, insert, update on public.quickkit_admin_tool_overrides
  to service_role;
grant select, insert, update on public.quickkit_admin_category_overrides
  to service_role;
grant select, insert, update on public.quickkit_admin_site_settings
  to service_role;
grant select, insert on public.quickkit_admin_activity
  to service_role;
revoke all on sequence public.quickkit_admin_activity_id_seq
  from public, anon, authenticated, service_role;
grant usage, select on sequence public.quickkit_admin_activity_id_seq
  to service_role;

-- Only the allowlisted server-side admin API uses these privileges. The
-- service-role key is never sent to the browser.
revoke all on table public.quickkit_contact_submissions,
  public.quickkit_feedback_submissions
  from public, anon, authenticated;
grant select, update (status, internal_notes), delete
  on public.quickkit_contact_submissions to service_role;
grant select, update (status, feedback_type, internal_notes), delete
  on public.quickkit_feedback_submissions to service_role;

commit;
