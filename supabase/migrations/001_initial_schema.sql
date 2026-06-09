-- ================================================================
-- Ivula Canopy - Initial Schema
-- Multi-tenant SaaS with Row-Level Security
-- ================================================================

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ================================================================
-- ORGANIZATIONS (tenants)
-- ================================================================
create table organizations (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text not null unique,
  description text,
  logo_url text,
  website text,
  phone text,
  address text,
  -- Stripe billing
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  stripe_price_id text,
  subscription_status text default 'trialing', -- trialing | active | past_due | canceled
  trial_ends_at timestamptz default (now() + interval '14 days'),
  current_period_end timestamptz,
  -- Meta
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ================================================================
-- PROFILES (extends auth.users)
-- ================================================================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid references organizations(id) on delete cascade,
  email text not null,
  full_name text,
  phone text,
  avatar_url text,
  role text not null default 'member', -- super_admin | org_admin | org_leader | member
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ================================================================
-- MEMBERS (managed records — may or may not have a profile/login)
-- ================================================================
create table members (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  profile_id uuid references profiles(id) on delete set null, -- null if no login
  first_name text not null,
  last_name text not null,
  email text,
  phone text,
  date_of_birth date,
  gender text,
  address text,
  join_date date default current_date,
  status text default 'active', -- active | inactive | pending
  notes text,
  custom_fields jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index members_org_idx on members(organization_id);
create index members_email_idx on members(organization_id, email);

-- ================================================================
-- TEAMS / DEPARTMENTS
-- ================================================================
create table teams (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  description text,
  team_type text default 'department', -- department | committee | ministry | project | program | volunteer_group
  leader_id uuid references members(id) on delete set null,
  parent_team_id uuid references teams(id) on delete set null,
  color text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index teams_org_idx on teams(organization_id);

create table team_memberships (
  id uuid primary key default uuid_generate_v4(),
  team_id uuid not null references teams(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  role text default 'member', -- leader | co-leader | member
  joined_at timestamptz default now(),
  unique(team_id, member_id)
);

create index team_memberships_team_idx on team_memberships(team_id);
create index team_memberships_member_idx on team_memberships(member_id);

-- ================================================================
-- EVENTS
-- ================================================================
create table events (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  team_id uuid references teams(id) on delete set null,
  title text not null,
  description text,
  event_type text default 'general', -- general | meeting | service | volunteer | training | social
  location text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  is_recurring boolean default false,
  recurrence_rule text,
  -- QR check-in
  checkin_token text unique default encode(gen_random_bytes(16), 'hex'),
  checkin_enabled boolean default true,
  -- Meta
  status text default 'upcoming', -- upcoming | active | completed | cancelled
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index events_org_idx on events(organization_id);
create index events_starts_at_idx on events(organization_id, starts_at);
create index events_token_idx on events(checkin_token);

-- ================================================================
-- ATTENDANCE
-- ================================================================
create table attendance (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references events(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  checked_in_at timestamptz default now(),
  method text default 'admin', -- admin | qr | self
  notes text,
  unique(event_id, member_id)
);

create index attendance_event_idx on attendance(event_id);
create index attendance_member_idx on attendance(member_id);
create index attendance_org_idx on attendance(organization_id);

-- ================================================================
-- ANNOUNCEMENTS
-- ================================================================
create table announcements (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  team_id uuid references teams(id) on delete set null, -- null = org-wide
  title text not null,
  body text not null,
  is_pinned boolean default false,
  published_at timestamptz default now(),
  expires_at timestamptz,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz default now()
);

create index announcements_org_idx on announcements(organization_id, published_at desc);

-- ================================================================
-- AUDIT LOG
-- ================================================================
create table audit_logs (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid references organizations(id) on delete cascade,
  actor_id uuid references profiles(id) on delete set null,
  action text not null,
  resource_type text,
  resource_id uuid,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

create index audit_logs_org_idx on audit_logs(organization_id, created_at desc);

-- ================================================================
-- FUNCTIONS & TRIGGERS
-- ================================================================

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger organizations_updated_at before update on organizations
  for each row execute function update_updated_at();
create trigger profiles_updated_at before update on profiles
  for each row execute function update_updated_at();
create trigger members_updated_at before update on members
  for each row execute function update_updated_at();
create trigger teams_updated_at before update on teams
  for each row execute function update_updated_at();
create trigger events_updated_at before update on events
  for each row execute function update_updated_at();

-- Auto-create profile on new user signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'org_admin')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ================================================================
-- ROW LEVEL SECURITY
-- ================================================================

alter table organizations enable row level security;
alter table profiles enable row level security;
alter table members enable row level security;
alter table teams enable row level security;
alter table team_memberships enable row level security;
alter table events enable row level security;
alter table attendance enable row level security;
alter table announcements enable row level security;
alter table audit_logs enable row level security;

-- Helper: get current user's org
create or replace function my_org_id()
returns uuid language sql stable security definer as $$
  select organization_id from profiles where id = auth.uid()
$$;

-- Helper: get current user's role
create or replace function my_role()
returns text language sql stable security definer as $$
  select role from profiles where id = auth.uid()
$$;

-- Organizations: members see their own org, super_admin sees all
create policy "org_read" on organizations for select
  using (id = my_org_id() or my_role() = 'super_admin');

create policy "org_update" on organizations for update
  using (id = my_org_id() and my_role() in ('org_admin', 'super_admin'));

-- Profiles: see own profile or same org
create policy "profiles_read" on profiles for select
  using (organization_id = my_org_id() or id = auth.uid() or my_role() = 'super_admin');

create policy "profiles_insert" on profiles for insert
  with check (id = auth.uid());

create policy "profiles_update" on profiles for update
  using (id = auth.uid() or (organization_id = my_org_id() and my_role() in ('org_admin', 'super_admin')));

-- Members: org-scoped
create policy "members_read" on members for select
  using (organization_id = my_org_id() or my_role() = 'super_admin');

create policy "members_insert" on members for insert
  with check (organization_id = my_org_id() and my_role() in ('org_admin', 'org_leader', 'super_admin'));

create policy "members_update" on members for update
  using (organization_id = my_org_id() and my_role() in ('org_admin', 'org_leader', 'super_admin'));

create policy "members_delete" on members for delete
  using (organization_id = my_org_id() and my_role() in ('org_admin', 'super_admin'));

-- Teams
create policy "teams_read" on teams for select
  using (organization_id = my_org_id() or my_role() = 'super_admin');

create policy "teams_write" on teams for all
  using (organization_id = my_org_id() and my_role() in ('org_admin', 'org_leader', 'super_admin'));

-- Team memberships
create policy "team_memberships_read" on team_memberships for select
  using (exists (select 1 from teams t where t.id = team_id and t.organization_id = my_org_id()));

create policy "team_memberships_write" on team_memberships for all
  using (exists (select 1 from teams t where t.id = team_id and t.organization_id = my_org_id())
    and my_role() in ('org_admin', 'org_leader', 'super_admin'));

-- Events
create policy "events_read" on events for select
  using (organization_id = my_org_id() or my_role() = 'super_admin');

create policy "events_write" on events for all
  using (organization_id = my_org_id() and my_role() in ('org_admin', 'org_leader', 'super_admin'));

-- Attendance
create policy "attendance_read" on attendance for select
  using (organization_id = my_org_id() or my_role() = 'super_admin');

create policy "attendance_write" on attendance for all
  using (organization_id = my_org_id() and my_role() in ('org_admin', 'org_leader', 'super_admin'));

-- Public check-in (anyone with valid token can insert)
create policy "attendance_public_checkin" on attendance for insert
  with check (
    exists (
      select 1 from events e
      where e.id = event_id
        and e.checkin_enabled = true
        and e.checkin_token is not null
    )
  );

-- Announcements
create policy "announcements_read" on announcements for select
  using (organization_id = my_org_id() or my_role() = 'super_admin');

create policy "announcements_write" on announcements for all
  using (organization_id = my_org_id() and my_role() in ('org_admin', 'org_leader', 'super_admin'));

-- Audit logs: read own org
create policy "audit_logs_read" on audit_logs for select
  using (organization_id = my_org_id() and my_role() in ('org_admin', 'super_admin'));

create policy "audit_logs_insert" on audit_logs for insert
  with check (organization_id = my_org_id());

-- ================================================================
-- VIEWS for analytics
-- ================================================================

create or replace view member_engagement_summary as
select
  m.organization_id,
  m.id as member_id,
  m.first_name,
  m.last_name,
  m.email,
  m.status,
  count(a.id) as total_attendance,
  max(a.checked_in_at) as last_attended_at,
  count(tm.id) as team_count
from members m
left join attendance a on a.member_id = m.id
left join team_memberships tm on tm.member_id = m.id
group by m.organization_id, m.id, m.first_name, m.last_name, m.email, m.status;

-- ================================================================
-- SEED: super_admin role for platform owner
-- (Run after you create your account)
-- UPDATE profiles SET role = 'super_admin' WHERE email = 'your@email.com';
-- ================================================================
