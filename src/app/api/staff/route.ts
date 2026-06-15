import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getUserAccess } from '@/lib/permissions'

// GET — list all staff accounts in this org, with their role
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const access = await getUserAccess(supabase, user.id)
  if (!access.permissions.manage_staff) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: profile } = await supabase
    .from('profiles').select('organization_id').eq('id', user.id).single()
  if (!profile?.organization_id) return NextResponse.json({ error: 'No organization' }, { status: 400 })

  const admin = await createServiceClient()
  const { data: staff } = await admin
    .from('profiles')
    .select('id, email, full_name, role_id, created_at, is_active, assigned_role:roles(name)')
    .eq('organization_id', profile.organization_id)
    .order('created_at')

  const shaped = (staff || []).map((s) => ({
    id: s.id,
    email: s.email,
    full_name: s.full_name,
    role_id: s.role_id,
    role_name: (Array.isArray(s.assigned_role) ? s.assigned_role[0]?.name : (s.assigned_role as { name?: string } | null)?.name) || 'No role',
    created_at: s.created_at,
    is_active: s.is_active,
  }))

  return NextResponse.json({ staff: shaped })
}

// POST — invite a new staff member by email, assigning a role
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const access = await getUserAccess(supabase, user.id)
  if (!access.permissions.manage_staff) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: profile } = await supabase
    .from('profiles').select('organization_id').eq('id', user.id).single()
  if (!profile?.organization_id) return NextResponse.json({ error: 'No organization' }, { status: 400 })

  const { email, role_id } = await req.json() as { email: string; role_id: string }
  if (!email || !role_id) return NextResponse.json({ error: 'Email and role are required' }, { status: 400 })

  const admin = await createServiceClient()

  // Verify the role belongs to this org
  const { data: role } = await admin
    .from('roles').select('id').eq('id', role_id).eq('organization_id', profile.organization_id).single()
  if (!role) return NextResponse.json({ error: 'Invalid role' }, { status: 400 })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${appUrl}/callback`,
    data: { role_id, organization_id: profile.organization_id },
  })

  if (error) {
    console.error('POST /api/staff invite:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Pre-create the profile so the invitee shows in the list immediately
  await admin.from('profiles').upsert({
    id: data.user.id,
    email,
    full_name: '',
    role: 'org_leader',
    role_id,
    organization_id: profile.organization_id,
  }, { onConflict: 'id' })

  return NextResponse.json({ ok: true }, { status: 201 })
}
