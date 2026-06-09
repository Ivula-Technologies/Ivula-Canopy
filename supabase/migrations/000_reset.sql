-- ================================================================
-- RESET SCRIPT — Drop everything before applying fresh schema
-- Run this FIRST in Supabase SQL Editor, then run 001_initial_schema.sql
-- ================================================================

-- Drop views
drop view if exists member_engagement_summary cascade;

-- Drop triggers
drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists organizations_updated_at on organizations;
drop trigger if exists profiles_updated_at on profiles;
drop trigger if exists members_updated_at on members;
drop trigger if exists teams_updated_at on teams;
drop trigger if exists events_updated_at on events;

-- Drop functions
drop function if exists handle_new_user() cascade;
drop function if exists update_updated_at() cascade;
drop function if exists my_org_id() cascade;
drop function if exists my_role() cascade;

-- Drop tables (order matters — foreign keys)
drop table if exists audit_logs cascade;
drop table if exists announcements cascade;
drop table if exists attendance cascade;
drop table if exists events cascade;
drop table if exists team_memberships cascade;
drop table if exists teams cascade;
drop table if exists members cascade;
drop table if exists profiles cascade;
drop table if exists organizations cascade;

-- Done. Now run 001_initial_schema.sql
