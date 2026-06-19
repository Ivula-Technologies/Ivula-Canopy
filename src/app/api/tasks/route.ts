import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getPermissionsFromProfile } from '@/lib/permissions'
import { nullifyEmptyStrings } from '@/lib/utils'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single()
  if (!profile?.organization_id) return NextResponse.json({ error: 'No organization' }, { status: 403 })

  const admin = await createServiceClient()
  const { data: tasks } = await admin
    .from('tasks')
    .select('*, team:teams(name), assigned_to:members(first_name, last_name)')
    .eq('organization_id', profile.organization_id)
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })

  return NextResponse.json({ tasks })
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
  if (!permissions.manage_members && !permissions.manage_events) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = await createServiceClient()
  const body = nullifyEmptyStrings(await req.json())
  const { data: task, error } = await admin
    .from('tasks')
    .insert({ ...body, created_by: user.id })
    .select('*, team:teams(name), assigned_to:members(first_name, last_name)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ task }, { status: 201 })
}
