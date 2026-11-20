-- 015: reliability basics. Safe to run more than once.
--
-- 1. rate_limits + rate_limit_hit(): sign-up and email limits that survive a
--    restart and are shared by every server process. Until this runs, the app
--    falls back to the per-process limits it already had.
-- 2. job_runs: each daily job (shift reminders, trial reminders) records when
--    it last finished, so /api/health can say when one stops running.
-- 3. Indexes for lookups that scanned whole tables.
-- 4. canopy_schema_check(): lets /api/health say which SQL files are missing.
--
-- Only the server (service role) can touch any of this. Row level security is
-- on with no policies, so signed-in users and visitors see nothing.

-- 1. Rate limits -------------------------------------------------------------

create table if not exists public.rate_limits (
  key text primary key,
  hits integer not null default 0,
  reset_at timestamptz not null
);

alter table public.rate_limits enable row level security;
revoke all on table public.rate_limits from anon, authenticated;

-- Counts one hit for p_key. Returns 0 when the hit is allowed, otherwise the
-- number of seconds until the window resets.
create or replace function public.rate_limit_hit(p_key text, p_limit integer, p_window_seconds integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hits integer;
  v_reset timestamptz;
begin
  insert into public.rate_limits as r (key, hits, reset_at)
  values (p_key, 1, now() + make_interval(secs => p_window_seconds))
  on conflict (key) do update
    set hits = case when r.reset_at <= now() then 1 else r.hits + 1 end,
        reset_at = case when r.reset_at <= now()
                        then now() + make_interval(secs => p_window_seconds)
                        else r.reset_at end
  returning hits, reset_at into v_hits, v_reset;

  -- Clear out old keys now and then, so the table stays small on its own.
  if random() < 0.01 then
    delete from public.rate_limits where reset_at < now() - interval '1 day';
  end if;

  if v_hits <= p_limit then
    return 0;
  end if;
  return greatest(1, ceil(extract(epoch from (v_reset - now())))::integer);
end;
$$;

revoke all on function public.rate_limit_hit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text, integer, integer) to service_role;

-- 2. Daily job heartbeats ----------------------------------------------------

create table if not exists public.job_runs (
  name text primary key,
  last_ok_at timestamptz,
  last_summary jsonb,
  last_error_at timestamptz,
  last_error text
);

alter table public.job_runs enable row level security;
revoke all on table public.job_runs from anon, authenticated;

-- 3. Indexes -----------------------------------------------------------------

-- "Cancel my spot" links look sign-ups up by their cancel token.
create index if not exists shift_signups_cancel_token_idx on public.shift_signups(cancel_token);
-- The daily shift reminder looks across every church's upcoming shifts.
create index if not exists shifts_starts_at_idx on public.shifts(starts_at);
-- Staff lists and trial reminders look people up by organization.
create index if not exists profiles_org_idx on public.profiles(organization_id);

-- 4. Schema check for /api/health ---------------------------------------------

-- Returns the names of earlier Canopy SQL files that have not been run.
create or replace function public.canopy_schema_check()
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select array_remove(array[
    case when not exists (select 1 from pg_trigger where tgname = 'organizations_guard_billing')
          or not exists (select 1 from pg_trigger where tgname = 'profiles_guard_privileges')
         then '010_lock_roles_and_billing.sql' end,
    case when not exists (select 1 from information_schema.columns
                          where table_schema = 'public' and table_name = 'organizations' and column_name = 'timezone')
         then '011_org_timezone.sql' end,
    case when not exists (select 1 from information_schema.columns
                          where table_schema = 'public' and table_name = 'shift_signups' and column_name = 'reminder_sent_at')
         then '012_shift_reminder_sent.sql' end,
    case when not exists (select 1 from information_schema.columns
                          where table_schema = 'public' and table_name = 'organizations' and column_name = 'volunteer_token')
         then '013_volunteer_link.sql' end,
    case when to_regclass('public.child_checkins') is null
         then '014_kids_checkin.sql' end
  ], null);
$$;

revoke all on function public.canopy_schema_check() from public, anon, authenticated;
grant execute on function public.canopy_schema_check() to service_role;
