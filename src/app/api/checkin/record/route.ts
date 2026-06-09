import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createServiceClient()
  const { token, member_id } = await req.json()

  if (!token || !member_id) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Get event by token
  const { data: event } = await supabase
    .from('events')
    .select('id, organization_id, checkin_enabled')
    .eq('checkin_token', token)
    .single()

  if (!event || !event.checkin_enabled) {
    return NextResponse.json({ error: 'Check-in not available' }, { status: 400 })
  }

  // Verify member belongs to same org
  const { data: member } = await supabase
    .from('members')
    .select('id')
    .eq('id', member_id)
    .eq('organization_id', event.organization_id)
    .single()

  if (!member) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  }

  // Record attendance
  const { error } = await supabase.from('attendance').upsert(
    {
      event_id: event.id,
      member_id,
      organization_id: event.organization_id,
      method: 'qr',
    },
    { onConflict: 'event_id,member_id' }
  )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
