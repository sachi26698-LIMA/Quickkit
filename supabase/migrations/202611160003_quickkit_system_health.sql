-- QUICKKIT system health: connects the three Admin health items that used to
-- need an outside service to this Supabase project instead.
--   1. RLS verification  - a read-only report of row level security per table.
--   2. Visitor statistics - the opt-in homepage graph (totals only; no URL, IP,
--      user agent or file data; visitor and session ids arrive already hashed).
--   3. Error monitoring   - scrubbed error events from the error screens.
-- Additive only: no existing table, column, policy or function is changed.
begin;

create table public.quickkit_visitor_totals (
  id smallint primary key default 1 check (id = 1),
  visitors bigint not null default 0 check (visitors >= 0),
  visits bigint not null default 0 check (visits >= 0),
  active_ms bigint not null default 0 check (active_ms >= 0),
  since timestamptz not null default now()
);
insert into public.quickkit_visitor_totals (id) values (1);

create table public.quickkit_visitor_ids (
  id text primary key check (id ~ '^[0-9a-f]{64}$')
);

create table public.quickkit_visitor_sessions (
  id text primary key check (id ~ '^[0-9a-f]{64}$'),
  visitor text not null check (visitor ~ '^[0-9a-f]{64}$'),
  last_seen timestamptz not null default now(),
  reported_ms bigint not null default 0 check (reported_ms >= 0),
  credited_ms bigint not null default 0 check (credited_ms >= 0)
);
create index quickkit_visitor_sessions_last_seen_idx
  on public.quickkit_visitor_sessions (last_seen);

create table public.quickkit_error_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  scope text not null check (char_length(scope) between 1 and 64),
  name text not null check (char_length(name) between 1 and 64),
  message text not null check (char_length(message) between 1 and 240),
  digest text null check (digest is null or char_length(digest) <= 64)
);
create index quickkit_error_events_created_idx
  on public.quickkit_error_events (created_at desc);

alter table public.quickkit_visitor_totals enable row level security;
alter table public.quickkit_visitor_ids enable row level security;
alter table public.quickkit_visitor_sessions enable row level security;
alter table public.quickkit_error_events enable row level security;

create policy "Deny browser access to visitor totals"
  on public.quickkit_visitor_totals for all to anon, authenticated
  using (false) with check (false);
create policy "Deny browser access to visitor ids"
  on public.quickkit_visitor_ids for all to anon, authenticated
  using (false) with check (false);
create policy "Deny browser access to visitor sessions"
  on public.quickkit_visitor_sessions for all to anon, authenticated
  using (false) with check (false);
create policy "Deny browser access to error events"
  on public.quickkit_error_events for all to anon, authenticated
  using (false) with check (false);

-- No API role reads or writes these tables directly; the definer functions
-- below are the only way in, and only the server role may call them.
revoke all on table public.quickkit_visitor_totals,
  public.quickkit_visitor_ids,
  public.quickkit_visitor_sessions,
  public.quickkit_error_events
  from public, anon, authenticated, service_role;
grant select, delete on table public.quickkit_error_events to service_role;

-- One heartbeat from a browser that opted in. Credits only visible-tab time
-- since the previous heartbeat, capped at 30 seconds, so a repeated or
-- invented payload cannot inflate the totals. New browser ids stop being
-- added at one million so automated traffic cannot fill the database.
create function public.quickkit_record_visit(
  p_visitor text,
  p_session text,
  p_active_ms bigint
) returns void
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_new integer := 0;
  v_first integer := 0;
  v_delta bigint := 0;
  v_row public.quickkit_visitor_sessions%rowtype;
begin
  if p_visitor is null or p_visitor !~ '^[0-9a-f]{64}$'
    or p_session is null or p_session !~ '^[0-9a-f]{64}$'
    or p_active_ms is null or p_active_ms < 0 then
    raise exception 'invalid visit';
  end if;

  if (select visitors from public.quickkit_visitor_totals where id = 1)
    < 1000000 then
    insert into public.quickkit_visitor_ids (id) values (p_visitor)
      on conflict (id) do nothing;
    get diagnostics v_new = row_count;
  end if;

  select * into v_row from public.quickkit_visitor_sessions
    where id = p_session for update;
  if found then
    if v_row.visitor <> p_visitor then
      raise exception 'session identity mismatch';
    end if;
    v_delta := greatest(0, least(
      p_active_ms - v_row.reported_ms,
      (extract(epoch from (now() - v_row.last_seen)) * 1000)::bigint,
      30000
    ));
    update public.quickkit_visitor_sessions
      set last_seen = now(),
          reported_ms = greatest(reported_ms, p_active_ms),
          credited_ms = credited_ms + v_delta
      where id = p_session;
  else
    insert into public.quickkit_visitor_sessions (id, visitor, reported_ms)
      values (p_session, p_visitor, p_active_ms)
      on conflict (id) do nothing;
    get diagnostics v_first = row_count;
  end if;

  update public.quickkit_visitor_totals
    set visitors = visitors + v_new,
        visits = visits + v_first,
        active_ms = active_ms + v_delta
    where id = 1;

  delete from public.quickkit_visitor_sessions
    where last_seen < now() - interval '1 day';
end;
$$;

create function public.quickkit_visitor_stats() returns jsonb
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select jsonb_build_object(
    'online', (
      select count(distinct visitor) from public.quickkit_visitor_sessions
      where last_seen >= now() - interval '45 seconds'
    ),
    'visitors', t.visitors,
    'visits', t.visits,
    'active_ms', t.active_ms,
    'since', t.since
  )
  from public.quickkit_visitor_totals t
  where t.id = 1;
$$;

-- Stores one scrubbed error event. Returns false, storing nothing, once 200
-- events have arrived within an hour, so a crash loop cannot fill the table.
-- Events older than 30 days are removed as new ones arrive.
create function public.quickkit_record_error(
  p_scope text,
  p_name text,
  p_message text,
  p_digest text
) returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  delete from public.quickkit_error_events
    where created_at < now() - interval '30 days';
  if (
    select count(*) from public.quickkit_error_events
    where created_at >= now() - interval '1 hour'
  ) >= 200 then
    return false;
  end if;
  insert into public.quickkit_error_events (scope, name, message, digest)
    values (p_scope, p_name, p_message, nullif(p_digest, ''));
  return true;
end;
$$;

-- Read-only report for the Admin health panel: every quickkit_ table with
-- whether row level security is on, how many policies it has and whether the
-- signed-out browser role holds any table privilege; plus recent error counts.
create function public.quickkit_system_health() returns jsonb
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select jsonb_build_object(
    'tables', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'name', c.relname,
        'rls', c.relrowsecurity,
        'policies', (
          select count(*) from pg_catalog.pg_policy p where p.polrelid = c.oid
        ),
        'anon_grants',
          has_table_privilege('anon', c.oid, 'select, insert, update, delete')
      ) order by c.relname), '[]'::jsonb)
      from pg_catalog.pg_class c
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relkind in ('r', 'p')
        and c.relname like 'quickkit\_%'
    ),
    'errors_24h', (
      select count(*) from public.quickkit_error_events
      where created_at >= now() - interval '1 day'
    ),
    'errors_7d', (
      select count(*) from public.quickkit_error_events
      where created_at >= now() - interval '7 days'
    ),
    'last_error_at', (select max(created_at) from public.quickkit_error_events)
  );
$$;

revoke all on function public.quickkit_record_visit(text, text, bigint),
  public.quickkit_visitor_stats(),
  public.quickkit_record_error(text, text, text, text),
  public.quickkit_system_health()
  from public, anon, authenticated;
grant execute on function public.quickkit_record_visit(text, text, bigint),
  public.quickkit_visitor_stats(),
  public.quickkit_record_error(text, text, text, text),
  public.quickkit_system_health()
  to service_role;

notify pgrst, 'reload schema';

commit;
