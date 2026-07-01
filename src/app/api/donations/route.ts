import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getPermissionsFromProfile } from '@/lib/permissions'
import { enforceSubscription } from '@/lib/subscription-guard'
import { nullifyEmptyStrings } from '@/lib/utils'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single()
  if (!profile?.organization_id) return NextResponse.json({ error: 'No organization' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const donor_id = searchParams.get('donor_id')

  const admin = await createServiceClient()
  let query = admin
    .from('donations')
    .select('*, donor:donors(id, first_name, last_name)')
    .eq('organization_id', profile.organization_id)
    .order('donated_at', { ascending: false })

  if (donor_id) query = query.eq('donor_id', donor_id)

  const { data: donations, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ donations })
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
  const { data: donation, error } = await admin.from('donations').insert(body).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ donation }, { status: 201 })
}
