import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { nullifyEmptyStrings } from '@/lib/utils'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = await createServiceClient()
  const body = nullifyEmptyStrings(await req.json())
  const { data: event, error } = await admin
    .from('events')
    .insert({ ...body, created_by: user.id, status: 'upcoming' })
    .select()
    .single()

  if (error) {
    console.error('POST /api/events:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ event }, { status: 201 })
}
