-- 006_tasks.sql
-- Task/to-do management for organizations.

create table if not exists tasks (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  team_id uuid references teams(id) on delete set null,
  assigned_to_member_id uuid references members(id) on delete set null,
  created_by uuid references profiles(id) on delete set null,
  title text not null,
  description text,
  status text default 'todo',       -- todo | in_progress | done
  priority text default 'medium',   -- low | medium | high | urgent
  due_date date,
  completed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists tasks_org_idx on tasks(organization_id);
create index if not exists tasks_team_idx on tasks(team_id);
create index if not exists tasks_assigned_idx on tasks(assigned_to_member_id);
create index if not exists tasks_status_idx on tasks(organization_id, status);
create index if not exists tasks_due_idx on tasks(organization_id, due_date);

create trigger tasks_updated_at before update on tasks
  for each row execute function update_updated_at_column();

alter table tasks enable row level security;

create policy "tasks_read" on tasks for select
  using (organization_id = my_org_id() or my_role() = 'super_admin');

create policy "tasks_write" on tasks for all
  using (organization_id = my_org_id() and my_role() in ('org_admin', 'org_leader', 'super_admin'));

grant all on tasks to anon, authenticated, service_role;
