import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getPermissionsFromProfile } from '@/lib/permissions'
import { nullifyEmptyStrings } from '@/lib/utils'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = await createServiceClient()
  const { data: shifts } = await admin
    .from('shifts')
    .select('*, signups:shift_signups(id, first_name, last_name, email, phone, status, signed_up_at)')
    .eq('event_id', id)
    .order('starts_at', { ascending: true, nullsFirst: true })
    .order('created_at')

  const enriched = (shifts || []).map((s) => ({
    ...s,
    signup_count: (s.signups || []).filter((r: { status: string }) => r.status === 'confirmed').length,
  }))

  return NextResponse.json({ shifts: enriched })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, assigned_role:roles(name, manage_members, delete_members, manage_teams, manage_events, manage_announcements, manage_billing, manage_staff)')
    .eq('id', user.id).single()
  const { permissions } = getPermissionsFromProfile(profile)
  if (!permissions.manage_events) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = await createServiceClient()
  const body = nullifyEmptyStrings(await req.json())
  const { data: shift, error } = await admin
    .from('shifts')
    .insert({ ...body, event_id: id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ shift: { ...shift, signup_count: 0, signups: [] } }, { status: 201 })
}
