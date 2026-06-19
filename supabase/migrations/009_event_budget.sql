-- 009_event_budget.sql
alter table events add column if not exists budget numeric(12,2);
