import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getPermissionsFromProfile } from '@/lib/permissions'

export async function GET(_req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single()
  if (!profile?.organization_id) return NextResponse.json({ error: 'No org' }, { status: 403 })

  const admin = await createServiceClient()
  const { data: expenses, error } = await admin
    .from('expenses')
    .select('*, event:events(title)')
    .eq('organization_id', profile.organization_id)
    .order('expense_date', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ expenses })
}

export async function POST(req: NextRequest) {
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
  const body = await req.json()
  const { data: expense, error } = await admin
    .from('expenses')
    .insert({ ...body, organization_id: profile.organization_id, created_by: user.id })
    .select('*, event:events(title)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ expense }, { status: 201 })
}
