-- 004_secure_engagement_view.sql
-- Fix Supabase linter warning: member_engagement_summary was created as a
-- SECURITY DEFINER view (the Postgres default), meaning it ran with the
-- creator's privileges and BYPASSED row-level security. In a multi-tenant
-- app that means a user could read members from other organizations.
--
-- Recreating with security_invoker = on makes the view run as the querying
-- user, so the existing RLS policies on members/attendance/team_memberships
-- are enforced and each org only sees its own data. Safe to run repeatedly.

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
  max(a.checked_in_at) as last_attended_at,
  count(tm.id) as team_count
from members m
left join attendance a on a.member_id = m.id
left join team_memberships tm on tm.member_id = m.id
group by m.organization_id, m.id, m.first_name, m.last_name, m.email, m.status;
