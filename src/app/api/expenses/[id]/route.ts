import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getPermissionsFromProfile } from '@/lib/permissions'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
  const body = await req.json()
  const { data: expense, error } = await admin.from('expenses').update(body).eq('id', id).select('*, event:events(title)').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ expense })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
  const { error } = await admin.from('expenses').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
