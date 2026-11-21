-- Recovery proofs are consumed atomically before a password update. No raw
-- tokens, email addresses or user identifiers are stored. This migration must
-- be applied and tested in an isolated project before any production release.
create table public.quickkit_recovery_consumptions (
  proof_hash text primary key check (proof_hash ~ '^[a-f0-9]{64}$'),
  expires_at timestamptz not null
);
alter table public.quickkit_recovery_consumptions enable row level security;
revoke all on public.quickkit_recovery_consumptions from public, anon, authenticated, service_role;

create function public.quickkit_consume_recovery_proof(p_proof_hash text, p_expires_at timestamptz)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if p_proof_hash is null or p_proof_hash !~ '^[a-f0-9]{64}$'
     or p_expires_at is null or p_expires_at <= clock_timestamp()
     or p_expires_at > clock_timestamp() + interval '11 minutes' then
    return false;
  end if;
  delete from public.quickkit_recovery_consumptions where expires_at <= clock_timestamp();
  insert into public.quickkit_recovery_consumptions (proof_hash, expires_at)
  values (p_proof_hash, p_expires_at)
  on conflict (proof_hash) do nothing;
  return found;
end;
$$;
revoke all on function public.quickkit_consume_recovery_proof(text, timestamptz)
  from public, anon, authenticated, service_role;
grant execute on function public.quickkit_consume_recovery_proof(text, timestamptz)
  to service_role;
notify pgrst, 'reload schema';
