import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getPermissionsFromProfile, PROFILE_WITH_ROLE } from '@/lib/permissions'
import { nullifyEmptyStrings, pickAllowedFields } from '@/lib/utils'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select(PROFILE_WITH_ROLE)
    .eq('id', user.id).single()
  const { permissions, organizationId: orgId } = getPermissionsFromProfile(profile)
  if (!permissions.manage_events) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 403 })

  const admin = await createServiceClient()
  const body = pickAllowedFields(nullifyEmptyStrings(await req.json()), ['event_id', 'title', 'amount', 'currency', 'category', 'expense_date', 'paid_to', 'notes'])
  const { data: expense, error } = await admin.from('expenses').update(body).eq('id', id).eq('organization_id', orgId).select('*, event:events(title)').single()
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
    .select(PROFILE_WITH_ROLE)
    .eq('id', user.id).single()
  const { permissions, organizationId: orgId } = getPermissionsFromProfile(profile)
  if (!permissions.manage_events) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 403 })

  const admin = await createServiceClient()
  const { error } = await admin.from('expenses').delete().eq('id', id).eq('organization_id', orgId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
