-- ================================================================
-- 002_custom_roles.sql — Custom, org-defined roles with permissions
-- ================================================================
-- Run this in the Supabase SQL Editor after 001_initial_schema.sql.
-- Safe to re-run (idempotent where practical).

-- ----------------------------------------------------------------
-- ROLES: each organization defines its own named roles
-- ----------------------------------------------------------------
create table if not exists roles (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  description text,
  -- permission flags
  manage_members boolean not null default false,
  delete_members boolean not null default false,
  manage_teams boolean not null default false,
  manage_events boolean not null default false,
  manage_announcements boolean not null default false,
  manage_billing boolean not null default false,
  manage_staff boolean not null default false,
  -- is_system roles (Administrator) cannot be deleted
  is_system boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(organization_id, name)
);

create index if not exists roles_org_idx on roles(organization_id);

-- Link profiles to a role
alter table profiles add column if not exists role_id uuid references roles(id) on delete set null;

-- ----------------------------------------------------------------
-- Seed default roles for every existing organization
-- ----------------------------------------------------------------
insert into roles (organization_id, name, description, manage_members, delete_members, manage_teams, manage_events, manage_announcements, manage_billing, manage_staff, is_system)
select o.id, 'Administrator', 'Full access to everything', true, true, true, true, true, true, true, true
from organizations o
on conflict (organization_id, name) do nothing;

insert into roles (organization_id, name, description, manage_members, delete_members, manage_teams, manage_events, manage_announcements, manage_billing, manage_staff, is_system)
select o.id, 'Leader', 'Manage members, teams, events and announcements', true, false, true, true, true, false, false, false
from organizations o
on conflict (organization_id, name) do nothing;

insert into roles (organization_id, name, description, manage_members, delete_members, manage_teams, manage_events, manage_announcements, manage_billing, manage_staff, is_system)
select o.id, 'Member', 'View-only access', false, false, false, false, false, false, false, false
from organizations o
on conflict (organization_id, name) do nothing;

-- ----------------------------------------------------------------
-- Backfill role_id on existing profiles based on their old text role
-- ----------------------------------------------------------------
update profiles p set role_id = r.id
from roles r
where r.organization_id = p.organization_id
  and p.role_id is null
  and r.name = case
    when p.role in ('org_admin', 'super_admin') then 'Administrator'
    when p.role = 'org_leader' then 'Leader'
    else 'Member'
  end;

-- ----------------------------------------------------------------
-- Helper: does the current user have a given permission?
-- ----------------------------------------------------------------
create or replace function has_perm(perm text)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((
    select case perm
      when 'manage_members' then r.manage_members
      when 'delete_members' then r.delete_members
      when 'manage_teams' then r.manage_teams
      when 'manage_events' then r.manage_events
      when 'manage_announcements' then r.manage_announcements
      when 'manage_billing' then r.manage_billing
      when 'manage_staff' then r.manage_staff
      else false
    end
    from profiles p join roles r on r.id = p.role_id
    where p.id = auth.uid()
  ), false) or coalesce((select role = 'super_admin' from profiles where id = auth.uid()), false);
$$;

-- ----------------------------------------------------------------
-- RLS for roles: org members can read; writes go through service role
-- ----------------------------------------------------------------
alter table roles enable row level security;

drop policy if exists "roles_read" on roles;
create policy "roles_read" on roles for select
  using (organization_id = my_org_id() or my_role() = 'super_admin');

-- ----------------------------------------------------------------
-- Grants
-- ----------------------------------------------------------------
grant all privileges on roles to postgres, anon, authenticated, service_role;
