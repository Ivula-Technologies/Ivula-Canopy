import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { nullifyEmptyStrings, pickAllowedFields } from '@/lib/utils'
import { getUserAccess } from '@/lib/permissions'
import { enforceSubscription } from '@/lib/subscription-guard'

// Fields the event form may set; ids, tokens and ownership come from the server.
const EVENT_FIELDS = ['team_id', 'title', 'description', 'event_type', 'location', 'budget', 'starts_at', 'ends_at', 'checkin_enabled'] as const

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const blocked = await enforceSubscription(supabase, user.id)
  if (blocked) return blocked

  const access = await getUserAccess(supabase, user.id)
  if (!access.permissions.manage_events) return NextResponse.json({ error: 'You do not have permission to manage events' }, { status: 403 })
  const orgId = access.organizationId
  if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 403 })

  const admin = await createServiceClient()
  const body = pickAllowedFields(nullifyEmptyStrings(await req.json()), EVENT_FIELDS)
  const { data: event, error } = await admin
    .from('events')
    .insert({ ...body, organization_id: orgId, created_by: user.id, status: 'upcoming' })
    .select()
    .single()

  if (error) {
    console.error('POST /api/events:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ event }, { status: 201 })
}
