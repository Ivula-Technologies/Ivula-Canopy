import { NextRequest, NextResponse } from 'next/server'
import { enforceSubscription } from '@/lib/subscription-guard'
import { groupByFamily, uniquePickupCode } from '@/lib/kids'
import { isUuid, kidsContext } from '@/lib/kids-server'

const MAX_CHILDREN = 20

// Check in one family (or several children) at once. Children who share a
// guardian get one pickup code, printed on each child's label and on the
// parent's tag.
export async function POST(req: NextRequest) {
  const ctx = await kidsContext('desk')
  if (ctx instanceof NextResponse) return ctx

  const blocked = await enforceSubscription(ctx.supabase, ctx.userId)
  if (blocked) return blocked

  const body = await req.json().catch(() => ({}))
  const picks: { id: unknown; room?: unknown }[] = Array.isArray(body?.children) ? body.children : []
  if (picks.length === 0) return NextResponse.json({ error: 'Choose at least one child.' }, { status: 400 })
  if (picks.length > MAX_CHILDREN) return NextResponse.json({ error: `Check in at most ${MAX_CHILDREN} children at once.` }, { status: 400 })

  const rooms = new Map<string, string | null>()
  for (const pick of picks) {
    if (!isUuid(pick?.id)) return NextResponse.json({ error: 'Child not found' }, { status: 400 })
    const room = typeof pick.room === 'string' ? pick.room.trim().slice(0, 60) : ''
    rooms.set(pick.id, room || null)
  }

  let eventId: string | null = null
  if (body?.event_id) {
    if (!isUuid(body.event_id)) return NextResponse.json({ error: 'Event not found' }, { status: 400 })
    const { data: event } = await ctx.admin
      .from('events')
      .select('id')
      .eq('id', body.event_id)
      .eq('organization_id', ctx.orgId)
      .maybeSingle()
    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 400 })
    eventId = event.id
  }

  const [{ data: children }, { data: open }] = await Promise.all([
    ctx.admin
      .from('children')
      .select('id, first_name, last_name, guardian_member_id, guardian_name, guardian_phone')
      .eq('organization_id', ctx.orgId)
      .eq('is_active', true)
      .in('id', [...rooms.keys()]),
    ctx.admin
      .from('child_checkins')
      .select('child_id, pickup_code')
      .eq('organization_id', ctx.orgId)
      .is('checked_out_at', null),
  ])

  if (!children || children.length !== rooms.size) {
    return NextResponse.json({ error: 'One of these children was not found. Refresh and try again.' }, { status: 400 })
  }

  const openChildIds = new Set((open || []).map((o) => o.child_id))
  const already = children.filter((c) => openChildIds.has(c.id))
  if (already.length > 0) {
    return NextResponse.json(
      { error: `${already.map((c) => c.first_name).join(' and ')} ${already.length === 1 ? 'is' : 'are'} already checked in.` },
      { status: 409 }
    )
  }

  const codesInUse = new Set((open || []).map((o) => o.pickup_code))
  const rows: Record<string, unknown>[] = []
  for (const family of groupByFamily(children)) {
    const code = uniquePickupCode(codesInUse)
    codesInUse.add(code)
    for (const child of family) {
      rows.push({
        organization_id: ctx.orgId,
        child_id: child.id,
        event_id: eventId,
        room: rooms.get(child.id) ?? null,
        pickup_code: code,
        checked_in_by: ctx.userId,
      })
    }
  }

  const { data: checkins, error } = await ctx.admin.from('child_checkins').insert(rows).select('id, child_id, pickup_code, room, checked_in_at')
  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'One of these children was just checked in at another desk.' }, { status: 409 })
    }
    console.error('POST /api/kids/checkins:', error.message)
    return NextResponse.json({ error: 'Could not check in. Please try again.' }, { status: 500 })
  }
  return NextResponse.json({ checkins }, { status: 201 })
}
