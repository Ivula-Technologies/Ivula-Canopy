-- 014_kids_checkin.sql
-- Kids check-in for children's ministry: child records with a guardian, and
-- one row per check-in with a pickup code that is printed on the child's
-- label and the parent's tag. Only staff (org_admin / org_leader) can read
-- these rows, never the pickup code; the app writes them through the API
-- with the service role.
-- Safe to run more than once.

create table if not exists children (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  birth_date date,
  grade text,
  allergies text,
  medical_notes text,
  guardian_member_id uuid references members(id) on delete set null,
  guardian_name text not null,
  guardian_phone text,
  authorized_pickups text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists children_org_idx on children(organization_id);
create index if not exists children_guardian_idx on children(guardian_member_id);

drop trigger if exists children_updated_at on children;
create trigger children_updated_at before update on children
  for each row execute function update_updated_at();

create table if not exists child_checkins (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  child_id uuid not null references children(id) on delete cascade,
  event_id uuid references events(id) on delete set null,
  room text,
  pickup_code text not null,
  checked_in_at timestamptz not null default now(),
  checked_in_by uuid references profiles(id) on delete set null,
  checked_out_at timestamptz,
  checked_out_by uuid references profiles(id) on delete set null,
  picked_up_by text,
  checkout_method text check (checkout_method in ('code', 'override')),
  checkout_note text
);

create index if not exists child_checkins_org_time_idx on child_checkins(organization_id, checked_in_at desc);
create index if not exists child_checkins_child_idx on child_checkins(child_id, checked_in_at desc);
create index if not exists child_checkins_open_code_idx on child_checkins(organization_id, pickup_code)
  where checked_out_at is null;

-- A child can only be checked in once at a time.
create unique index if not exists child_checkins_one_open
  on child_checkins(child_id) where checked_out_at is null;

alter table children enable row level security;
alter table child_checkins enable row level security;

drop policy if exists "children_staff_read" on children;
create policy "children_staff_read" on children for select
  using (
    (organization_id = my_org_id() and my_role() in ('org_admin', 'org_leader'))
    or my_role() = 'super_admin'
  );

drop policy if exists "child_checkins_staff_read" on child_checkins;
create policy "child_checkins_staff_read" on child_checkins for select
  using (
    (organization_id = my_org_id() and my_role() in ('org_admin', 'org_leader'))
    or my_role() = 'super_admin'
  );

-- No insert/update/delete policies: every write goes through the API, which
-- checks the user's permissions and uses the service role.
revoke all on children from authenticated, anon;
grant select on children to authenticated;
-- Staff logins can read every check-in column except the pickup code, which
-- only the server reads (to print labels and match a parent's tag).
revoke all on child_checkins from authenticated, anon;
grant select (id, organization_id, child_id, event_id, room, checked_in_at, checked_in_by,
  checked_out_at, checked_out_by, picked_up_by, checkout_method, checkout_note)
  on child_checkins to authenticated;
grant all on children to service_role;
grant all on child_checkins to service_role;
