import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { nullifyEmptyStrings } from '@/lib/utils'
import { getUserAccess } from '@/lib/permissions'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const access = await getUserAccess(supabase, user.id)
  if (!access.permissions.manage_events) return NextResponse.json({ error: 'You do not have permission to manage events' }, { status: 403 })

  const admin = await createServiceClient()
  const body = nullifyEmptyStrings(await req.json())
  const { data: event, error } = await admin
    .from('events')
    .update(body)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('PATCH /api/events:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ event })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const access = await getUserAccess(supabase, user.id)
  if (!access.permissions.manage_events) return NextResponse.json({ error: 'You do not have permission to manage events' }, { status: 403 })

  const admin = await createServiceClient()
  const { error } = await admin.from('events').delete().eq('id', id)

  if (error) {
    console.error('DELETE /api/events:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
