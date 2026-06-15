import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getUserAccess, PERMISSION_KEYS } from '@/lib/permissions'

// GET — list all roles in the org
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('organization_id').eq('id', user.id).single()
  if (!profile?.organization_id) return NextResponse.json({ error: 'No organization' }, { status: 400 })

  const admin = await createServiceClient()
  const { data: roles } = await admin
    .from('roles')
    .select('*')
    .eq('organization_id', profile.organization_id)
    .order('is_system', { ascending: false })
    .order('name')

  return NextResponse.json({ roles: roles || [] })
}

// POST — create a new role
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const access = await getUserAccess(supabase, user.id)
  if (!access.permissions.manage_staff) {
    return NextResponse.json({ error: 'You do not have permission to manage roles' }, { status: 403 })
  }

  const { data: profile } = await supabase
    .from('profiles').select('organization_id').eq('id', user.id).single()
  if (!profile?.organization_id) return NextResponse.json({ error: 'No organization' }, { status: 400 })

  const body = await req.json() as { name?: string; description?: string } & Record<string, boolean>
  if (!body.name?.trim()) return NextResponse.json({ error: 'Role name is required' }, { status: 400 })

  const perms = PERMISSION_KEYS.reduce((acc, k) => ({ ...acc, [k]: !!body[k] }), {})

  const admin = await createServiceClient()
  const { data: role, error } = await admin
    .from('roles')
    .insert({
      organization_id: profile.organization_id,
      name: body.name.trim(),
      description: body.description || '',
      is_system: false,
      ...perms,
    })
    .select()
    .single()

  if (error) {
    const msg = error.code === '23505' ? 'A role with that name already exists' : error.message
    return NextResponse.json({ error: msg }, { status: 400 })
  }
  return NextResponse.json({ role }, { status: 201 })
}
