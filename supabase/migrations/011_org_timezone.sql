-- 011_org_timezone.sql
-- Each organization keeps its own time zone, so event and shift times show
-- the same on the dashboard, the public sign-up page and in volunteer emails.
-- New organizations get the admin's browser time zone at sign-up; existing
-- ones show Eastern Time until an admin picks theirs in Settings.
-- Safe to run more than once.

alter table organizations add column if not exists timezone text;
