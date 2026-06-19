-- 008_expenses.sql

create or replace function update_updated_at_column()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create table if not exists expenses (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  event_id uuid references events(id) on delete set null,
  title text not null,
  amount numeric(12,2) not null,
  currency text not null default 'USD',
  category text not null default 'other',
  expense_date date not null default current_date,
  paid_to text,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists expenses_org_idx on expenses(organization_id);
create index if not exists expenses_event_idx on expenses(event_id);

create trigger expenses_updated_at before update on expenses
  for each row execute function update_updated_at_column();

alter table expenses enable row level security;

create policy "expenses_read" on expenses for select
  using (organization_id = my_org_id() or my_role() = 'super_admin');

create policy "expenses_write" on expenses for all
  using (organization_id = my_org_id() and my_role() in ('org_admin', 'org_leader', 'super_admin'));

grant all on expenses to anon, authenticated, service_role;
