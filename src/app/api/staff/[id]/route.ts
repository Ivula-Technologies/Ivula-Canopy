import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getUserAccess } from '@/lib/permissions'

// PATCH — change a staff member's assigned role
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const access = await getUserAccess(supabase, user.id)
  if (!access.permissions.manage_staff) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: profile } = await supabase
    .from('profiles').select('organization_id').eq('id', user.id).single()

  const { role_id } = await req.json() as { role_id: string }
  if (!role_id) return NextResponse.json({ error: 'Role is required' }, { status: 400 })

  const admin = await createServiceClient()
  const { data: role } = await admin
    .from('roles').select('id, manage_billing').eq('id', role_id).eq('organization_id', profile!.organization_id).single()
  if (!role) return NextResponse.json({ error: 'Invalid role' }, { status: 400 })

  // Keep the coarse text role roughly in sync for legacy RLS / super_admin checks
  const coarse = role.manage_billing ? 'org_admin' : 'org_leader'

  const { error } = await admin
    .from('profiles')
    .update({ role_id, role: coarse })
    .eq('id', id)
    .eq('organization_id', profile!.organization_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// DELETE — remove a staff member's access to this org
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (id === user.id) return NextResponse.json({ error: 'Cannot remove yourself' }, { status: 400 })

  const access = await getUserAccess(supabase, user.id)
  if (!access.permissions.manage_staff) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: profile } = await supabase
    .from('profiles').select('organization_id').eq('id', user.id).single()

  const admin = await createServiceClient()
  const { error } = await admin
    .from('profiles')
    .update({ organization_id: null, role_id: null, is_active: false })
    .eq('id', id)
    .eq('organization_id', profile!.organization_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
