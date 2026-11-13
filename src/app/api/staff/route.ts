import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getUserAccess } from '@/lib/permissions'
import { siteUrl } from '@/lib/site-url'

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

  const body = await req.json().catch(() => ({})) as { email?: unknown; role_id?: unknown }
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const role_id = typeof body.role_id === 'string' ? body.role_id : ''
  if (!email || !role_id) return NextResponse.json({ error: 'Email and role are required' }, { status: 400 })

  const admin = await createServiceClient()

  // Verify the role belongs to this org
  const { data: role } = await admin
    .from('roles').select('id, manage_billing').eq('id', role_id).eq('organization_id', profile.organization_id).single()
  if (!role) return NextResponse.json({ error: 'Invalid role' }, { status: 400 })

  const appUrl = siteUrl(req)
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    // Invite links carry the session in the URL hash; /reset-password picks it
    // up and asks the new teammate to choose a password.
    redirectTo: `${appUrl}/reset-password`,
    data: { role_id, organization_id: profile.organization_id },
  })

  if (error) {
    console.error('POST /api/staff invite:', error.message)
    // Supabase won't invite an email that already has a Canopy login, such as
    // a teammate removed earlier and now coming back.
    if (/already (been )?registered|already exists/i.test(error.message)) {
      return addExistingLogin(admin, email, role_id, role.manage_billing, profile.organization_id)
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Pre-create the profile so the invitee shows in the list immediately
  await admin.from('profiles').upsert({
    id: data.user.id,
    email,
    full_name: '',
    // Same rule as changing a role later (staff/[id]): billing access means
    // the old admin label, which the trial emails and older checks still read.
    role: role.manage_billing ? 'org_admin' : 'org_leader',
    role_id,
    organization_id: profile.organization_id,
  }, { onConflict: 'id' })

  return NextResponse.json({ ok: true }, { status: 201 })
}

// Someone who already has a Canopy login but belongs to no organization (for
// example a teammate removed earlier) is added back straight away and signs
// in with their existing password. A login that belongs to another
// organization is never moved.
async function addExistingLogin(
  admin: Awaited<ReturnType<typeof createServiceClient>>,
  email: string,
  roleId: string,
  billing: boolean,
  orgId: string
) {
  const { data: existing } = await admin
    .from('profiles').select('id, organization_id').ilike('email', email.replace(/[\\%_]/g, '\\$&')).maybeSingle()
  if (existing?.organization_id === orgId) {
    return NextResponse.json({ error: 'This person already has a login for your organization.' }, { status: 409 })
  }
  if (!existing || existing.organization_id) {
    return NextResponse.json(
      { error: 'This email already uses Canopy with another organization. Please invite a different email for them.' },
      { status: 409 }
    )
  }
  const { error } = await admin
    .from('profiles')
    .update({ organization_id: orgId, role_id: roleId, role: billing ? 'org_admin' : 'org_leader', is_active: true })
    .eq('id', existing.id)
    .is('organization_id', null)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, existingLogin: true }, { status: 201 })
}
