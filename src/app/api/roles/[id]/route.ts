import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getUserAccess, PERMISSION_KEYS } from '@/lib/permissions'

// PATCH — update a role's name/description/permissions
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const access = await getUserAccess(supabase, user.id)
  if (!access.permissions.manage_staff) {
    return NextResponse.json({ error: 'You do not have permission to manage roles' }, { status: 403 })
  }

  const { data: profile } = await supabase
    .from('profiles').select('organization_id').eq('id', user.id).single()

  const admin = await createServiceClient()

  // Don't allow editing the system Administrator role's permissions (keeps an org from locking itself out)
  const { data: existing } = await admin.from('roles').select('is_system').eq('id', id).single()
  if (!existing) return NextResponse.json({ error: 'Role not found' }, { status: 404 })

  const body = await req.json() as { name?: string; description?: string } & Record<string, boolean>
  const update: Record<string, unknown> = {}
  if (typeof body.name === 'string' && body.name.trim()) update.name = body.name.trim()
  if (typeof body.description === 'string') update.description = body.description
  // System role keeps full permissions; only name/description may change.
  if (!existing.is_system) {
    for (const k of PERMISSION_KEYS) {
      if (k in body) update[k] = !!body[k]
    }
  }

  const { data: role, error } = await admin
    .from('roles')
    .update(update)
    .eq('id', id)
    .eq('organization_id', profile!.organization_id)
    .select()
    .single()

  if (error) {
    const msg = error.code === '23505' ? 'A role with that name already exists' : error.message
    return NextResponse.json({ error: msg }, { status: 400 })
  }
  return NextResponse.json({ role })
}

// DELETE — remove a custom role (members on it fall back to no role)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const access = await getUserAccess(supabase, user.id)
  if (!access.permissions.manage_staff) {
    return NextResponse.json({ error: 'You do not have permission to manage roles' }, { status: 403 })
  }

  const { data: profile } = await supabase
    .from('profiles').select('organization_id').eq('id', user.id).single()

  const admin = await createServiceClient()
  const { data: existing } = await admin.from('roles').select('is_system').eq('id', id).single()
  if (existing?.is_system) {
    return NextResponse.json({ error: 'The Administrator role cannot be deleted' }, { status: 400 })
  }

  const { error } = await admin
    .from('roles')
    .delete()
    .eq('id', id)
    .eq('organization_id', profile!.organization_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
