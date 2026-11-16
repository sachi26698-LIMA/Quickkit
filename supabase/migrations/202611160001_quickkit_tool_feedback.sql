-- QUICKKIT tool ratings.
-- Additive only: two new private tables and one rate-limit function. No
-- existing table, column, policy, trigger, or function is changed or dropped.
-- A visitor's star rating for a tool (sent only when they press Send in the
-- rating prompt) is stored here for the administrator's Feedback inbox.
begin;

create table public.quickkit_tool_feedback (
  id uuid primary key default gen_random_uuid(),
  tool_slug text not null
    check (tool_slug ~ '^[a-z0-9][a-z0-9-]{0,79}$'),
  rating smallint not null check (rating between 1 and 5),
  tags text[] not null default '{}'::text[]
    check (cardinality(tags) <= 4),
  comment text not null default ''
    check (char_length(comment) <= 600),
  status text not null default 'new'
    check (status in ('new', 'in_progress', 'resolved')),
  internal_notes text not null default ''
    check (char_length(internal_notes) <= 10000),
  consent_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Contains only a keyed digest of the ingress address, never the raw address.
create table public.quickkit_tool_feedback_limits (
  bucket_hash text primary key check (bucket_hash ~ '^[a-f0-9]{64}$'),
  window_started_at timestamptz not null default now(),
  attempt_count integer not null default 0 check (attempt_count >= 0)
);

create index quickkit_tool_feedback_created_idx
  on public.quickkit_tool_feedback (created_at desc);
create index quickkit_tool_feedback_tool_created_idx
  on public.quickkit_tool_feedback (tool_slug, created_at desc);
create index quickkit_tool_feedback_status_created_idx
  on public.quickkit_tool_feedback (status, created_at desc);
create index quickkit_tool_feedback_limits_window_idx
  on public.quickkit_tool_feedback_limits (window_started_at);

alter table public.quickkit_tool_feedback enable row level security;
alter table public.quickkit_tool_feedback_limits enable row level security;

-- Explicit deny policies document the intended RLS boundary in addition to
-- the revokes below. Browsers never read or write these tables directly.
create policy "Deny browser access to tool feedback"
  on public.quickkit_tool_feedback for all to anon, authenticated
  using (false) with check (false);
create policy "Deny browser access to tool feedback limits"
  on public.quickkit_tool_feedback_limits for all to anon, authenticated
  using (false) with check (false);

revoke all on table public.quickkit_tool_feedback,
  public.quickkit_tool_feedback_limits
  from public, anon, authenticated, service_role;

-- The public intake handler may insert only the visitor-supplied columns. The
-- allowlisted server-side admin API may read, triage, and delete ratings.
grant insert (tool_slug, rating, tags, comment)
  on public.quickkit_tool_feedback to service_role;
grant select, update (status, internal_notes), delete
  on public.quickkit_tool_feedback to service_role;
-- The rate-limit table has no API-role table grants. Its definer RPC is the
-- only database entry point available to the server's service_role client.

create function public.quickkit_consume_tool_feedback_limit(
  p_bucket_hash text
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_count integer;
  v_limit constant integer := 30;
  v_now timestamptz := clock_timestamp();
begin
  if p_bucket_hash is null
    or p_bucket_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'Invalid tool feedback rate-limit key';
  end if;

  delete from public.quickkit_tool_feedback_limits
  where window_started_at < v_now - interval '1 day';

  insert into public.quickkit_tool_feedback_limits as current_limit (
    bucket_hash, window_started_at, attempt_count
  ) values (
    p_bucket_hash, v_now, 1
  )
  on conflict (bucket_hash) do update
  set window_started_at = case
        when current_limit.window_started_at < v_now - interval '1 hour'
          then v_now
        else current_limit.window_started_at
      end,
      attempt_count = case
        when current_limit.window_started_at < v_now - interval '1 hour'
          then 1
        else least(current_limit.attempt_count + 1, v_limit + 1)
      end
  returning attempt_count into v_count;

  return v_count <= v_limit;
end;
$$;

-- PUBLIC/anon/authenticated cannot invoke the definer. The server-only service
-- role gets EXECUTE only; it has no direct table access to the limiter store.
revoke all on function public.quickkit_consume_tool_feedback_limit(text)
  from public, anon, authenticated, service_role;
grant execute on function public.quickkit_consume_tool_feedback_limit(text)
  to service_role;

notify pgrst, 'reload schema';

commit;
