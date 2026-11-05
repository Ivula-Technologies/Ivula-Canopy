-- ================================================================
-- 010: Lock down roles, org membership and billing columns
--
-- Before this migration a signed-in user could, straight from the browser
-- with the public Supabase key:
--   * sign up with user metadata role = 'super_admin' and read every org;
--   * update their own profile's role / organization_id (join any org);
--   * update their organization's subscription_status or trial_ends_at
--     (free Canopy forever);
--   * insert organizations directly.
--
-- The app writes these columns only through the service role (signup,
-- staff invites, Stripe webhook), so blocking them for the `authenticated`
-- and `anon` roles changes nothing for real users. The SQL editor and the
-- service role are unaffected.
-- ================================================================

-- 1. New auth users never get super_admin from client-supplied metadata.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  requested text := new.raw_user_meta_data->>'role';
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    case when requested in ('org_admin', 'org_leader', 'member') then requested else 'org_admin' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- 2. Profiles: only the service role (or a super admin) may change who a
--    profile belongs to or what it can do.
create or replace function public.guard_profile_privileges()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.role = 'super_admin' or new.organization_id is not null or new.role_id is not null then
      raise exception 'Not allowed to set role or organization on a profile' using errcode = '42501';
    end if;
    return new;
  end if;

  if (new.role is distinct from old.role
      or new.organization_id is distinct from old.organization_id
      or new.role_id is distinct from old.role_id)
     and coalesce(public.my_role(), '') <> 'super_admin' then
    raise exception 'Not allowed to change role or organization' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_privileges on profiles;
create trigger profiles_guard_privileges
  before insert or update on profiles
  for each row execute function public.guard_profile_privileges();

-- 3. Organizations: billing state is written only by the Stripe webhook.
create or replace function public.guard_org_billing()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;
  if coalesce(public.my_role(), '') = 'super_admin' then
    return new;
  end if;
  if new.stripe_customer_id is distinct from old.stripe_customer_id
     or new.stripe_subscription_id is distinct from old.stripe_subscription_id
     or new.stripe_price_id is distinct from old.stripe_price_id
     or new.subscription_status is distinct from old.subscription_status
     or new.trial_ends_at is distinct from old.trial_ends_at
     or new.current_period_end is distinct from old.current_period_end then
    raise exception 'Billing fields can only be changed through Stripe' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists organizations_guard_billing on organizations;
create trigger organizations_guard_billing
  before update on organizations
  for each row execute function public.guard_org_billing();

-- 4. Organizations are created by /api/organizations with the service role.
drop policy if exists "org_insert" on organizations;

