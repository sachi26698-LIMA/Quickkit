# QUICKKIT — Supabase migration history reconciliation

**Status:** reconciled. The schema was **never** wrong; only the version
bookkeeping in `supabase_migrations.schema_migrations` was. No DDL, no data, no
RLS policy, no function and no grant was changed by this work.

| | |
|---|---|
| Project | `Quick_kit` — `oevjmxcoyibkonousdoh` (eu-west-1, ACTIVE_HEALTHY) |
| Failing check | `Supabase Preview` on `32a6b23` (PR #66 merge commit) |
| Reported error | "Remote migration versions not found in local migrations directory" |
| Effect on site | none — the app was and is fully functional |

---

## 1. What the error actually meant

Supabase's Preview check compares the **versions** in the remote ledger against
the **file-name prefixes** in `supabase/migrations/`. The six migrations had been
applied through the transactional migration tool, which stamped each one with its
apply-time timestamp instead of the date-prefix from the committed file:

| Remote version (before) | Remote `name` (before) | Committed file |
|---|---|---|
| `20261113045854` | `202611100001_quickkit_account_data` | `202611100001_quickkit_account_data.sql` |
| `20261114190425` | `quickkit_master_admin` | `202611100002_quickkit_master_admin.sql` |
| `20261116035647` | `quickkit_tool_feedback` | `202611160001_quickkit_tool_feedback.sql` |
| `20261116060044` | `quickkit_feedback_rating` | `202611160002_quickkit_feedback_rating.sql` |
| `20261116064143` | `quickkit_system_health` | `202611160003_quickkit_system_health.sql` |
| `20261116071310` | `quickkit_visitor_flood_guard` | `202611160004_quickkit_visitor_flood_guard.sql` |

Not one of those six versions existed as a local file prefix, so the checker
concluded the remote database had six migrations the repository did not know
about — hence "remote migration versions not found in local migrations
directory". The reverse complaint (local files never applied) was *also* true for
the same reason.

This is why the check failed on `main` **and** on the earlier `33ea9c4`, while
the release itself touched zero `.sql` files: the mismatch predates the release.

## 2. Proof that the schema was already correct

Before changing anything, each applied statement was compared with its committed
file after normalising whitespace, stripping comment lines, and dropping the
surrounding `begin;` / `commit;`. Statement bodies matched on **all six**:

| Migration | Normalised MD5 (remote) | Normalised MD5 (file) |
|---|---|---|
| `202611100001_quickkit_account_data` | `36274127e98ce2c0a68c9fe520b3a8d8` | `36274127e98ce2c0a68c9fe520b3a8d8` |
| `202611100002_quickkit_master_admin` | `3ab5ee6dd1cf80a89325631dc88e728d` | `3ab5ee6dd1cf80a89325631dc88e728d` |
| `202611160001_quickkit_tool_feedback` | `610d40858b842d742a97d82078aedcff` | `610d40858b842d742a97d82078aedcff` |
| `202611160002_quickkit_feedback_rating` | `bab3b88eb63ef329aaa85dad8a687873` | `bab3b88eb63ef329aaa85dad8a687873` |
| `202611160003_quickkit_system_health` | `1bba7e060ad6464446830d81168333fe` | `1bba7e060ad6464446830d81168333fe` |
| `202611160004_quickkit_visitor_flood_guard` | `242ad86f0535d9361b07b93b28e9b360` | `242ad86f0535d9361b07b93b28e9b360` |

Raw byte lengths differ (for example 4,677 vs 4,332) because the ledger stores
the statement text without the `begin;` / `commit;` wrapper and without some
comment lines. The **executed SQL is identical**, which is the only thing that
matters for correctness.

The live catalogue confirmed the applied result: 15 `quickkit%` tables, **0**
without row level security, 19 policies, 9 functions in `public`.

## 3. What was changed

Only the two bookkeeping columns of the six ledger rows — `version` set to the
committed file prefix and `name` set to the committed file stem. Run in a single
transaction with the ledger's user triggers disabled for the update:

```sql
update supabase_migrations.schema_migrations set version = ... where version = ...;
update supabase_migrations.schema_migrations set name    = ... where version = ...;
```

`statements`, `created_by`, `idempotency_key` and `rollback` were left untouched,
so the audit trail of *what was executed* is preserved verbatim.

### Safety measures

- **Backup first:** the pre-change ledger was copied to
  `supabase_migrations._quickkit_history_backup_20261118` before the update.
  That table is the exact rollback source for this operation.
- **No re-run:** the migrations were *not* re-executed. Several of them contain
  bare `create table` with no `IF NOT EXISTS` by design ("it intentionally fails
  on object-name collisions"), so replaying them would have errored or, worse,
  half-applied. Reconciling bookkeeping is the correct fix precisely because it
  risks nothing.
- **Version collisions checked:** no old version is a prefix of, or equal to, a
  target version, so the in-place `update` could not create duplicate primary
  keys. Order is unchanged (the new versions sort in the same order as the old).
- **Schema verified afterwards:** 15 tables, 0 without RLS, 19 policies, 9
  functions — identical to the pre-change counts.

## 4. Rollback

If the ledger must return to its previous shape:

```sql
begin;
alter table supabase_migrations.schema_migrations disable trigger user;

update supabase_migrations.schema_migrations m
   set version = b.version,
       name    = b.name
  from (
    values
      ('202611100001', '20261113045854'),
      ('202611100002', '20261114190425'),
      ('202611160001', '20261116035647'),
      ('202611160002', '20261116060044'),
      ('202611160003', '20261116064143'),
      ('202611160004', '20261116071310')
  ) as map(applied_version, original_version)
  join supabase_migrations._quickkit_history_backup_20261118 b
    on b.version = map.original_version
 where m.version = map.applied_version;

alter table supabase_migrations.schema_migrations enable trigger user;
commit;
```

Because `statements` were never modified, this restores the original rows exactly
— the mapping is explicit so it cannot silently match the wrong row. No ordering
hazard exists: the six original versions and the six applied versions are
disjoint sets, so no intermediate state can collide on the primary key.

The backup table can be dropped once the Preview check has been observed passing
on `main`.

## 5. How to add migrations from now on

The mismatch arose because migrations were applied through the transactional
tool, which stamps its own version. To keep the ledger and the directory in step,
either:

1. Apply through the CLI so the version comes from the file name:
   `supabase link --project-ref oevjmxcoyibkonousdoh` then
   `supabase db push`; or
2. If a migration must be applied through the dashboard/tool, reconcile its row
   immediately afterwards so `version` equals the file-name prefix.

**Rule of thumb:** for every file `supabase/migrations/<VERSION>_<name>.sql`
there must be exactly one ledger row with `version = <VERSION>`.

## 6. What this document does not claim

- It does **not** claim the Preview check has been re-observed passing. The check
  belongs to Supabase's GitHub App and could not be re-requested from this
  environment (the API returned `403 Resource not accessible by integration`).
  It will re-run on the next push to a branch Supabase tracks. Evidence that the
  underlying mismatch is gone is the remote ledger now matching the committed
  file names one-for-one (§3).
- It does not claim anything about preview *database branches*. This project has
  no branching set up as far as this work observed, and none was created.
