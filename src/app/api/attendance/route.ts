import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
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
