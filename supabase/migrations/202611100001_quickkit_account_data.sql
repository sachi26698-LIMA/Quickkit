-- QUICKKIT account data and explicitly consented public submissions.
-- This migration intentionally fails on object-name collisions. It does not
-- skip existing objects or replace unexpected policies, triggers, or functions.

create table public.quickkit_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text null check (display_name is null or char_length(display_name) <= 60),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.quickkit_favorites (
  user_id uuid not null references auth.users (id) on delete cascade,
  tool_slug text not null check (tool_slug ~ '^[a-z0-9][a-z0-9-]{0,79}$'),
  created_at timestamptz not null default now(),
  primary key (user_id, tool_slug)
);

create table public.quickkit_contact_submissions (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  email text not null check (char_length(email) between 3 and 254),
  subject text not null check (char_length(subject) between 1 and 150),
  message text not null check (char_length(message) between 10 and 5000),
  consent_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.quickkit_feedback_submissions (
  id uuid primary key default gen_random_uuid(),
  name text null check (name is null or char_length(name) <= 35),
  message text not null check (char_length(message) between 1 and 180),
  consent_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Contains only a keyed digest of the ingress address, never the raw address.
create table public.quickkit_submission_limits (
  scope text not null check (scope in ('contact', 'feedback')),
  bucket_hash text not null check (bucket_hash ~ '^[a-f0-9]{64}$'),
  window_started_at timestamptz not null default now(),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  primary key (scope, bucket_hash)
);

create index quickkit_contact_created_at_idx
  on public.quickkit_contact_submissions (created_at desc);
create index quickkit_feedback_created_at_idx
  on public.quickkit_feedback_submissions (created_at desc);
create index quickkit_submission_limits_window_idx
  on public.quickkit_submission_limits (window_started_at);

alter table public.quickkit_profiles enable row level security;
alter table public.quickkit_favorites enable row level security;
alter table public.quickkit_contact_submissions enable row level security;
alter table public.quickkit_feedback_submissions enable row level security;
alter table public.quickkit_submission_limits enable row level security;

-- Remove default/API-role privileges first. The column grants below intentionally
-- omit ownership fields on UPDATE and all client/server-managed timestamps.
revoke all on table public.quickkit_profiles
  from public, anon, authenticated, service_role;
revoke all on table public.quickkit_favorites
  from public, anon, authenticated, service_role;
revoke all on table public.quickkit_contact_submissions
  from public, anon, authenticated, service_role;
revoke all on table public.quickkit_feedback_submissions
  from public, anon, authenticated, service_role;
revoke all on table public.quickkit_submission_limits
  from public, anon, authenticated, service_role;

-- Users can view only their profile's public fields and edit only its display name.
grant select (id, display_name)
  on public.quickkit_profiles to authenticated;
grant insert (id, display_name)
  on public.quickkit_profiles to authenticated;
grant update (display_name)
  on public.quickkit_profiles to authenticated;

-- Favorites are append/remove only. There is no UPDATE grant or policy.
grant select (user_id, tool_slug)
  on public.quickkit_favorites to authenticated;
grant insert (user_id, tool_slug)
  on public.quickkit_favorites to authenticated;
grant delete
  on public.quickkit_favorites to authenticated;

-- Anonymous public intake is intentional. Browser roles cannot access these
-- tables; only the Node server handlers receive column-limited INSERT grants.
grant insert (name, email, subject, message)
  on public.quickkit_contact_submissions to service_role;
grant insert (name, message)
  on public.quickkit_feedback_submissions to service_role;
-- The rate-limit table has no API-role table grants. Its definer RPC is the
-- only database entry point available to the server's service_role client.

create policy "Users read own QUICKKIT profile"
  on public.quickkit_profiles for select to authenticated
  using ((select auth.uid()) = id);

create policy "Users create own QUICKKIT profile"
  on public.quickkit_profiles for insert to authenticated
  with check ((select auth.uid()) = id);

create policy "Users update own QUICKKIT profile"
  on public.quickkit_profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "Users read own QUICKKIT favorites"
  on public.quickkit_favorites for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users add own QUICKKIT favorites"
  on public.quickkit_favorites for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users remove own QUICKKIT favorites"
  on public.quickkit_favorites for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Contact, feedback, and rate-limit tables intentionally have no client
-- policies. RLS therefore denies anon/authenticated even if a future grant is
-- accidentally added; the contact/feedback server role remains insert-only.

create function public.quickkit_consume_submission_limit(
  p_scope text,
  p_bucket_hash text
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_count integer;
  v_limit integer;
  v_now timestamptz := clock_timestamp();
begin
  if p_scope is null
    or p_bucket_hash is null
    or p_scope not in ('contact', 'feedback')
    or p_bucket_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'Invalid submission rate-limit key';
  end if;

  v_limit := case p_scope when 'contact' then 4 else 5 end;

  delete from public.quickkit_submission_limits
  where window_started_at < v_now - interval '1 day';

  insert into public.quickkit_submission_limits as current_limit (
    scope, bucket_hash, window_started_at, attempt_count
  ) values (
    p_scope, p_bucket_hash, v_now, 1
  )
  on conflict (scope, bucket_hash) do update
  set window_started_at = case
        when current_limit.window_started_at < v_now - interval '15 minutes'
          then v_now
        else current_limit.window_started_at
      end,
      attempt_count = case
        when current_limit.window_started_at < v_now - interval '15 minutes'
          then 1
        else least(current_limit.attempt_count + 1, v_limit + 1)
      end
  returning attempt_count into v_count;

  return v_count <= v_limit;
end;
$$;

-- PUBLIC/anon/authenticated cannot invoke the definer. The server-only service
-- role gets EXECUTE only; it has no direct table access to the limiter store.
revoke all on function public.quickkit_consume_submission_limit(text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.quickkit_consume_submission_limit(text, text)
  to service_role;

create function public.quickkit_create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  insert into public.quickkit_profiles (id, display_name)
  values (
    new.id,
    nullif(left(trim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), 60), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function public.quickkit_create_profile_for_new_user()
  from public, anon, authenticated, service_role;

create trigger quickkit_create_profile_after_signup
  after insert on auth.users
  for each row execute function public.quickkit_create_profile_for_new_user();

create function public.quickkit_set_profile_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  -- Defense in depth: clients cannot change identity or creation metadata.
  new.id := old.id;
  new.created_at := old.created_at;
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.quickkit_set_profile_updated_at()
  from public, anon, authenticated, service_role;

create trigger quickkit_profile_updated_at
  before update on public.quickkit_profiles
  for each row execute function public.quickkit_set_profile_updated_at();

notify pgrst, 'reload schema';
