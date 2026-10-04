import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { planForPriceId } from '@/lib/plans'

// Blocks adding people once an organization on a paid plan reaches its plan's
// people limit. Trials and grandfathered prices are never limited, so nobody
// is locked out before they have chosen a plan.
export async function enforcePeopleLimit(
  supabase: SupabaseClient,
  userId: string
): Promise<NextResponse | null> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', userId)
    .single()

  if (profile?.role === 'super_admin' || !profile?.organization_id) return null

  const { data: org } = await supabase
    .from('organizations')
    .select('subscription_status, stripe_price_id')
    .eq('id', profile.organization_id)
    .single()

  if (!org || org.subscription_status === 'trialing') return null

  const plan = planForPriceId(org.stripe_price_id)
  if (!plan || plan.peopleLimit === null) return null

  const { count } = await supabase
    .from('members')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', profile.organization_id)

  if ((count ?? 0) < plan.peopleLimit) return null

  return NextResponse.json(
    {
      error: `Your ${plan.name} plan includes up to ${plan.peopleLimit} people. Upgrade your plan in Settings to add more.`,
      code: 'plan_limit_reached',
    },
    { status: 402 }
  )
}
