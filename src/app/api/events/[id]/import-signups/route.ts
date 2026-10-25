import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getPermissionsFromProfile, PROFILE_WITH_ROLE } from '@/lib/permissions'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

  const { data: signups } = await admin
    .from('shift_signups')
    .select('member_id, shifts(starts_at, ends_at)')
    .eq('event_id', id)
    .eq('organization_id', orgId)
    .eq('status', 'confirmed')
    .not('member_id', 'is', null)

  const records = signups?.map((s) => {
    const shift = s.shifts as { starts_at?: string | null; ends_at?: string | null } | null
    let hours: number | null = null
    if (shift?.starts_at && shift?.ends_at) {
      hours = Math.round((new Date(shift.ends_at).getTime() - new Date(shift.starts_at).getTime()) / 360000) / 10
    }
    return { event_id: id, member_id: s.member_id, organization_id: orgId, method: 'qr' as const, checked_in_at: new Date().toISOString(), hours }
  }) || []

  if (records.length === 0) return NextResponse.json({ imported: 0 })

  const { error } = await admin.from('attendance').upsert(records, { onConflict: 'event_id,member_id' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ imported: records.length })
}
