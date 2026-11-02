-- 013_volunteer_link.sql
-- One public sign-up link per organization (/serve/<token>) that lists every
-- upcoming volunteer shift. Each organization gets its own random token.
-- Safe to run more than once.

alter table organizations
  add column if not exists volunteer_token text unique default encode(gen_random_bytes(16), 'hex');

update organizations
  set volunteer_token = encode(gen_random_bytes(16), 'hex')
  where volunteer_token is null;
