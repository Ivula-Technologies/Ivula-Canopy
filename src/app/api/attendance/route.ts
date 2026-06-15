import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getUserAccess } from '@/lib/permissions'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const access = await getUserAccess(supabase, user.id)
  if (!access.permissions.manage_events) return NextResponse.json({ error: 'You do not have permission to record attendance' }, { status: 403 })

  const admin = await createServiceClient()
  const body = await req.json()

  const { data: record, error } = await admin
    .from('attendance')
    .upsert(body, { onConflict: 'event_id,member_id' })
    .select()
    .single()

  if (error) {
    console.error('POST /api/attendance:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ record }, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const access = await getUserAccess(supabase, user.id)
  if (!access.permissions.manage_events) return NextResponse.json({ error: 'You do not have permission to record attendance' }, { status: 403 })

  const admin = await createServiceClient()
  const { searchParams } = new URL(req.url)
  const event_id = searchParams.get('event_id')
  const member_id = searchParams.get('member_id')

  if (!event_id || !member_id) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  }

  const { error } = await admin
    .from('attendance')
    .delete()
    .eq('event_id', event_id)
    .eq('member_id', member_id)

  if (error) {
    console.error('DELETE /api/attendance:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
