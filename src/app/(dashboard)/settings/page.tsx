import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPermissionsFromProfile, PROFILE_WITH_ROLE } from '@/lib/permissions'
import { SettingsClient } from './settings-client'
import { planForPriceId } from '@/lib/plans'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select(PROFILE_WITH_ROLE)
    .eq('id', user.id)
    .single()
  if (!profile?.organization_id) redirect('/onboarding')

  const [{ data: org }, { count: peopleCount }] = await Promise.all([
    supabase.from('organizations').select('*').eq('id', profile.organization_id).single(),
    supabase.from('members').select('id', { count: 'exact', head: true }).eq('organization_id', profile.organization_id),
  ])

  const { permissions } = getPermissionsFromProfile(profile)

  return (
    <SettingsClient
      org={org!}
      profile={profile}
      canManageStaff={permissions.manage_staff}
      canManageBilling={permissions.manage_billing}
      currentPlanId={planForPriceId(org?.stripe_price_id)?.id ?? null}
      peopleCount={peopleCount ?? 0}
    />
  )
}
