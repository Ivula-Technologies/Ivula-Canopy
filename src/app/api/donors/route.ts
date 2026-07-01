import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getPermissionsFromProfile } from '@/lib/permissions'
import { enforceSubscription } from '@/lib/subscription-guard'
import { nullifyEmptyStrings } from '@/lib/utils'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('organization_id, role').eq('id', user.id).single()
  if (!profile?.organization_id) return NextResponse.json({ error: 'No organization' }, { status: 403 })

  const admin = await createServiceClient()
  const { data: donors } = await admin
    .from('donors')
    .select('*, member:members(first_name, last_name)')
    .eq('organization_id', profile.organization_id)
    .order('last_name')

  // Aggregate donation totals per donor
  const { data: totals } = await admin
    .from('donations')
    .select('donor_id, amount')
    .eq('organization_id', profile.organization_id)

  const totalMap: Record<string, { total: number; count: number }> = {}
  totals?.forEach(({ donor_id, amount }) => {
    if (!donor_id) return
    if (!totalMap[donor_id]) totalMap[donor_id] = { total: 0, count: 0 }
    totalMap[donor_id].total += Number(amount)
    totalMap[donor_id].count += 1
  })

  const enriched = (donors || []).map((d) => ({
    ...d,
    total_donated: totalMap[d.id]?.total || 0,
    donation_count: totalMap[d.id]?.count || 0,
  }))

  return NextResponse.json({ donors: enriched })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const blocked = await enforceSubscription(supabase, user.id)
  if (blocked) return blocked

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, assigned_role:roles(name, manage_members, delete_members, manage_teams, manage_events, manage_announcements, manage_billing, manage_staff)')
    .eq('id', user.id).single()
  const { permissions } = getPermissionsFromProfile(profile)
  if (!permissions.manage_members) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = await createServiceClient()
  const body = nullifyEmptyStrings(await req.json())
  const { data: donor, error } = await admin.from('donors').insert(body).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ donor }, { status: 201 })
}
