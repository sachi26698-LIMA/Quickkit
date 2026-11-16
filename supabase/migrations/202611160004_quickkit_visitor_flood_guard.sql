-- QUICKKIT visitor statistics: bound how fast the opt-in counter can grow.
--
-- POST /api/visitor-stats is public by design (a browser that opted in reports
-- its own visit), so a script could invent visits. The counter already limits
-- the time credited per heartbeat; this migration also limits how many NEW
-- visits are accepted per minute, which bounds both the stored rows and how far
-- an automated burst can inflate the homepage numbers. Heartbeats for a visit
-- that was already accepted are never limited.
--
-- Changes: one new column and index on quickkit_visitor_sessions, and a new
-- body for quickkit_record_visit (same name, arguments and privileges). No row
-- is changed or removed.
begin;

alter table public.quickkit_visitor_sessions
  add column created_at timestamptz not null default now();
create index quickkit_visitor_sessions_created_idx
  on public.quickkit_visitor_sessions (created_at);

create or replace function public.quickkit_record_visit(
  p_visitor text,
  p_session text,
  p_active_ms bigint
) returns void
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  -- New visits accepted per minute across the whole site. Real opt-in traffic
  -- is far below this; above it, extra new visits are simply not counted.
  c_new_visits_per_minute constant integer := 120;
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
    if (
      select count(*) from public.quickkit_visitor_sessions
      where created_at >= now() - interval '1 minute'
    ) >= c_new_visits_per_minute then
      -- Over the limit: store nothing and count nothing for this visit.
      return;
    end if;
    insert into public.quickkit_visitor_sessions (id, visitor, reported_ms)
      values (p_session, p_visitor, p_active_ms)
      on conflict (id) do nothing;
    get diagnostics v_first = row_count;
    if v_first > 0 and (
      select visitors from public.quickkit_visitor_totals where id = 1
    ) < 1000000 then
      insert into public.quickkit_visitor_ids (id) values (p_visitor)
        on conflict (id) do nothing;
      get diagnostics v_new = row_count;
    end if;
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

-- CREATE OR REPLACE keeps the existing privileges; restate them so this file
-- is correct on its own.
revoke all on function public.quickkit_record_visit(text, text, bigint)
  from public, anon, authenticated;
grant execute on function public.quickkit_record_visit(text, text, bigint)
  to service_role;

notify pgrst, 'reload schema';

commit;
