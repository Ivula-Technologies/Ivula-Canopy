import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const body = await req.json()

  const { data: record, error } = await supabase
    .from('attendance')
    .upsert(body, { onConflict: 'event_id,member_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ record }, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(req.url)
  const event_id = searchParams.get('event_id')
  const member_id = searchParams.get('member_id')

  if (!event_id || !member_id) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  }

  const { error } = await supabase
    .from('attendance')
    .delete()
    .eq('event_id', event_id)
    .eq('member_id', member_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
