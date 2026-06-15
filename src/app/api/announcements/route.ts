import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = await createServiceClient()
  const body = await req.json()
  const { data: announcement, error } = await admin
    .from('announcements')
    .insert({ ...body, created_by: user.id })
    .select()
    .single()

  if (error) {
    console.error('POST /api/announcements:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ announcement }, { status: 201 })
}
