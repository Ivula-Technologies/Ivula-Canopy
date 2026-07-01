import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getAccessState } from '@/lib/subscription'

// Server-side gate for write/critical API routes. Returns a ready-to-return
// 402 NextResponse when the org's trial has expired (or subscription lapsed),
// or null when the org is allowed to proceed. Reads never call this.
//
// Usage inside a route handler:
//   const blocked = await enforceSubscription(supabase, user.id)
//   if (blocked) return blocked
export async function enforceSubscription(
  supabase: SupabaseClient,
  userId: string
): Promise<NextResponse | null> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', userId)
    .single()

  // Super admins are never gated.
  if (profile?.role === 'super_admin') return null
  if (!profile?.organization_id) return null

  const { data: org } = await supabase
    .from('organizations')
    .select('subscription_status, trial_ends_at, current_period_end')
    .eq('id', profile.organization_id)
    .single()

  if (!org) return null

  const access = getAccessState(org)
  if (!access.locked) return null

  const message =
    access.reason === 'trial_expired'
      ? 'Your free trial has ended. Upgrade to continue using this feature.'
      : 'Your subscription is inactive. Please update billing to continue.'

  return NextResponse.json(
    { error: message, code: 'subscription_required', reason: access.reason },
    { status: 402 }
  )
}
