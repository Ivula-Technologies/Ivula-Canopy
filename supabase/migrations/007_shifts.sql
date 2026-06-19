-- 007_shifts.sql
-- Volunteer shift scheduling and public sign-up.

create or replace function update_updated_at_column()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

-- ================================================================
-- SHIFTS — sub-slots within an event (e.g. "Morning shift, max 5")
-- ================================================================
create table if not exists shifts (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references events(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  title text not null,
  description text,
  starts_at timestamptz,
  ends_at timestamptz,
  capacity int not null default 10,  -- max volunteers for this slot
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists shifts_event_idx on shifts(event_id);
create index if not exists shifts_org_idx on shifts(organization_id);

create trigger shifts_updated_at before update on shifts
  for each row execute function update_updated_at_column();

-- ================================================================
-- SHIFT SIGNUPS — public, no login required
-- ================================================================
create table if not exists shift_signups (
  id uuid primary key default uuid_generate_v4(),
  shift_id uuid not null references shifts(id) on delete cascade,
  event_id uuid not null references events(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  -- Linked to a member if they matched by email
  member_id uuid references members(id) on delete set null,
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text,
  notes text,
  status text default 'confirmed',   -- confirmed | cancelled
  -- Token lets the volunteer cancel without logging in
  cancel_token uuid default uuid_generate_v4(),
  signed_up_at timestamptz default now(),
  created_at timestamptz default now()
);

create index if not exists shift_signups_shift_idx on shift_signups(shift_id);
create index if not exists shift_signups_event_idx on shift_signups(event_id);
create index if not exists shift_signups_org_idx  on shift_signups(organization_id);
create index if not exists shift_signups_email_idx on shift_signups(email);

-- ================================================================
-- RLS
-- ================================================================
alter table shifts enable row level security;
alter table shift_signups enable row level security;

-- Anyone can read shifts (needed for the public signup page via service key)
-- Org members can read their own shifts
create policy "shifts_read" on shifts for select
  using (organization_id = my_org_id() or my_role() = 'super_admin');

create policy "shifts_write" on shifts for all
  using (organization_id = my_org_id() and my_role() in ('org_admin', 'org_leader', 'super_admin'));

create policy "shift_signups_read" on shift_signups for select
  using (organization_id = my_org_id() or my_role() = 'super_admin');

-- Inserts come from the public API (service role), so no anon insert policy needed
create policy "shift_signups_write" on shift_signups for all
  using (organization_id = my_org_id() and my_role() in ('org_admin', 'org_leader', 'super_admin'));

grant all on shifts to anon, authenticated, service_role;
grant all on shift_signups to anon, authenticated, service_role;
