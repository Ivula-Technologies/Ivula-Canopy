import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPermissionsFromProfile, PROFILE_WITH_ROLE } from '@/lib/permissions'
import { SettingsClient } from './settings-client'
import { planForPriceId } from '@/lib/plans'
import { syncCheckoutSession } from '@/lib/stripe-sync'

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const { session_id: sessionId } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select(PROFILE_WITH_ROLE)
    .eq('id', user.id)
    .single()
  if (!profile?.organization_id) redirect('/onboarding')

  const { permissions } = getPermissionsFromProfile(profile)

  // Back from Stripe Checkout: save the new plan now rather than waiting for
  // the webhook, so the church sees it straight away.
  if (sessionId && permissions.manage_billing) await syncCheckoutSession(sessionId, profile.organization_id)

  const [{ data: org }, { count: peopleCount }] = await Promise.all([
    supabase.from('organizations').select('*').eq('id', profile.organization_id).single(),
    supabase.from('members').select('id', { count: 'exact', head: true }).eq('organization_id', profile.organization_id),
  ])

  return (
    <SettingsClient
      org={org!}
      profile={profile}
      canManageStaff={permissions.manage_staff}
      canManageBilling={permissions.manage_billing}
      canEditOrg={permissions.manage_staff || permissions.manage_billing}
      currentPlanId={planForPriceId(org?.stripe_price_id)?.id ?? null}
      peopleCount={peopleCount ?? 0}
    />
  )
}
