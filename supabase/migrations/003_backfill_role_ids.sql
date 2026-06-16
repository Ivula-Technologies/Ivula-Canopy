-- 003_backfill_role_ids.sql
-- One-time cleanup: assign every profile that still has a NULL role_id the
-- matching system role for its organization, based on the legacy text role.
-- Safe to run multiple times.

-- org_admin -> the org's "Administrator" system role
update profiles p
set role_id = r.id
from roles r
where p.role_id is null
  and p.role = 'org_admin'
  and r.organization_id = p.organization_id
  and r.name = 'Administrator';

-- org_leader -> the org's "Leader" role
update profiles p
set role_id = r.id
from roles r
where p.role_id is null
  and p.role = 'org_leader'
  and r.organization_id = p.organization_id
  and r.name = 'Leader';

-- plain members -> the org's "Member" role
update profiles p
set role_id = r.id
from roles r
where p.role_id is null
  and p.role = 'org_member'
  and r.organization_id = p.organization_id
  and r.name = 'Member';
