-- 005_volunteer_hours_and_donors.sql
-- Adds volunteer hours to attendance and a full donors/giving section.

-- ================================================================
-- 1. VOLUNTEER HOURS on attendance
-- ================================================================
alter table attendance add column if not exists hours decimal(5,2);

-- Update the engagement summary to include total volunteer hours
create or replace view member_engagement_summary
with (security_invoker = on) as
select
  m.organization_id,
  m.id as member_id,
  m.first_name,
  m.last_name,
  m.email,
  m.status,
  count(a.id) as total_attendance,
  coalesce(sum(a.hours), 0) as total_hours,
  max(a.checked_in_at) as last_attended_at,
  count(tm.id) as team_count
from members m
left join attendance a on a.member_id = m.id
left join team_memberships tm on tm.member_id = m.id
group by m.organization_id, m.id, m.first_name, m.last_name, m.email, m.status;

-- ================================================================
-- 2. DONORS table
-- ================================================================
create table if not exists donors (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  -- Donor may or may not be a member of the org
  member_id uuid references members(id) on delete set null,
  first_name text not null,
  last_name text not null,
  email text,
  phone text,
  address text,
  notes text,
  is_anonymous boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists donors_org_idx on donors(organization_id);
create index if not exists donors_member_idx on donors(member_id);

create trigger donors_updated_at before update on donors
  for each row execute function update_updated_at_column();

-- ================================================================
-- 3. DONATIONS table
-- ================================================================
create table if not exists donations (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  donor_id uuid references donors(id) on delete set null,
  amount decimal(12,2) not null,
  currency text default 'USD',
  donated_at date not null default current_date,
  method text default 'cash', -- cash | cheque | bank_transfer | online | other
  campaign text,              -- e.g. "Annual Fundraiser 2025"
  notes text,
  is_anonymous boolean default false,
  receipt_number text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists donations_org_idx on donations(organization_id);
create index if not exists donations_donor_idx on donations(donor_id);
create index if not exists donations_date_idx on donations(organization_id, donated_at desc);

create trigger donations_updated_at before update on donations
  for each row execute function update_updated_at_column();

-- ================================================================
-- RLS
-- ================================================================
alter table donors enable row level security;
alter table donations enable row level security;

-- Org members can read; writes go through the service role
create policy "donors_read" on donors for select
  using (organization_id = my_org_id() or my_role() = 'super_admin');

create policy "donors_write" on donors for all
  using (organization_id = my_org_id() and my_role() in ('org_admin', 'org_leader', 'super_admin'));

create policy "donations_read" on donations for select
  using (organization_id = my_org_id() or my_role() = 'super_admin');

create policy "donations_write" on donations for all
  using (organization_id = my_org_id() and my_role() in ('org_admin', 'org_leader', 'super_admin'));

-- Grants
grant all on donors to anon, authenticated, service_role;
grant all on donations to anon, authenticated, service_role;
