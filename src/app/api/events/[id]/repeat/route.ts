import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getUserAccess } from '@/lib/permissions'
import { enforceSubscription } from '@/lib/subscription-guard'
import { orgTimeZone } from '@/lib/timezone'
import { moveByDays, parseRepeatRequest, repeatDayOffsets } from '@/lib/repeat'

// POST — copies an event onto later dates, with its volunteer shifts, keeping
// the same local time each week. Dates that already have an event with the
// same title at the same time are skipped, so pressing it twice is harmless.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const blocked = await enforceSubscription(supabase, user.id)
  if (blocked) return blocked

  const access = await getUserAccess(supabase, user.id)
  if (!access.permissions.manage_events) return NextResponse.json({ error: 'You do not have permission to manage events' }, { status: 403 })
  const orgId = access.organizationId
  if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 403 })

  const request = parseRepeatRequest(await req.json().catch(() => ({})))
  if ('error' in request) return NextResponse.json({ error: request.error }, { status: 400 })

  const admin = await createServiceClient()
  const [{ data: event }, { data: org }] = await Promise.all([
    admin.from('events').select('*').eq('id', id).eq('organization_id', orgId).maybeSingle(),
    admin.from('organizations').select('*').eq('id', orgId).single(),
  ])
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  const timeZone = orgTimeZone(org)

  const dates = repeatDayOffsets(request.everyWeeks, request.count).map((days) => ({
    days,
    starts_at: moveByDays(event.starts_at, days, timeZone),
    ends_at: moveByDays(event.ends_at, days, timeZone),
  })).filter((d): d is { days: number; starts_at: string; ends_at: string | null } => !!d.starts_at)

  // Skip dates that already have this event, e.g. from an earlier repeat.
  const { data: existing } = await admin
    .from('events')
    .select('starts_at')
    .eq('organization_id', orgId)
    .eq('title', event.title)
    .gte('starts_at', dates[0].starts_at)
    .lte('starts_at', dates[dates.length - 1].starts_at)
  const taken = new Set((existing || []).map((e) => new Date(e.starts_at).getTime()))
  const todo = dates.filter((d) => !taken.has(new Date(d.starts_at).getTime()))
  if (todo.length === 0) return NextResponse.json({ created: [], skipped: dates.length })

  const { data: created, error } = await admin
    .from('events')
    .insert(todo.map((d) => ({
      organization_id: orgId,
      team_id: event.team_id,
      title: event.title,
      description: event.description,
      event_type: event.event_type,
      location: event.location,
      budget: event.budget ?? null,
      checkin_enabled: event.checkin_enabled,
      starts_at: d.starts_at,
      ends_at: d.ends_at,
      status: 'upcoming',
      created_by: user.id,
    })))
    .select('id, starts_at')
  if (error || !created) {
    console.error('POST /api/events/[id]/repeat:', error?.message)
    return NextResponse.json({ error: 'Could not add the new dates. Please try again.' }, { status: 500 })
  }

  if (request.copyShifts) {
    const { data: shifts } = await admin
      .from('shifts')
      .select('title, description, starts_at, ends_at, capacity')
      .eq('event_id', event.id)
      .eq('organization_id', orgId)

    if (shifts?.length) {
      const daysByStart = new Map(todo.map((d) => [new Date(d.starts_at).getTime(), d.days]))
      const rows = created.flatMap((copy) => {
        const days = daysByStart.get(new Date(copy.starts_at).getTime())
        if (days === undefined) return []
        return shifts.map((s) => ({
          event_id: copy.id,
          organization_id: orgId,
          title: s.title,
          description: s.description,
          capacity: s.capacity,
          starts_at: moveByDays(s.starts_at, days, timeZone),
          ends_at: moveByDays(s.ends_at, days, timeZone),
        }))
      })
      const { error: shiftError } = await admin.from('shifts').insert(rows)
      if (shiftError) {
        // Don't leave events without the shifts the coordinator asked for.
        console.error('POST /api/events/[id]/repeat shifts:', shiftError.message)
        await admin.from('events').delete().in('id', created.map((c) => c.id)).eq('organization_id', orgId)
        return NextResponse.json({ error: 'Could not copy the volunteer shifts. Nothing was added.' }, { status: 500 })
      }
    }
  }

  return NextResponse.json({ created, skipped: dates.length - todo.length }, { status: 201 })
}
