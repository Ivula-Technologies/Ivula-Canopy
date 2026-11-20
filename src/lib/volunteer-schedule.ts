import type { SupabaseClient } from '@supabase/supabase-js'
import { SERVE_DAYS_AHEAD } from './volunteer-link'
import { allRows } from './all-rows'

// Every upcoming volunteer shift across events, with who is on it and how many
// spots are still open. The dashboard counts it; /events/volunteers lists it.

export type ScheduleEventRow = { id: string; title: string; starts_at: string; location?: string | null; status?: string | null }
export type ScheduleShiftRow = {
  id: string
  event_id: string
  title: string
  starts_at?: string | null
  ends_at?: string | null
  capacity: number
}
export type ScheduleSignupRow = {
  id: string
  shift_id: string
  member_id?: string | null
  first_name: string
  last_name: string
  email: string
}

export type ScheduleShift = ScheduleShiftRow & { filled: number; open: number; people: ScheduleSignupRow[] }
export type ScheduleEvent = ScheduleEventRow & { shifts: ScheduleShift[]; filled: number; open: number }
export type Schedule = {
  events: ScheduleEvent[]
  totals: { shifts: number; signedUp: number; openSpots: number; shiftsNeedingPeople: number }
}

/**
 * Pure: puts upcoming shifts under their events. Leaves out cancelled events
 * and shifts that have already started, the same rule the public sign-up
 * page uses, so "open spots" here is what volunteers can still pick.
 */
export function buildSchedule(
  events: ScheduleEventRow[],
  shifts: ScheduleShiftRow[],
  signups: ScheduleSignupRow[],
  now: Date
): Schedule {
  const byShift = new Map<string, ScheduleSignupRow[]>()
  for (const signup of signups) byShift.set(signup.shift_id, [...(byShift.get(signup.shift_id) || []), signup])

  const listed = events
    .filter((event) => event.status !== 'cancelled')
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
    .map((event) => {
      const eventShifts = shifts
        .filter((shift) => shift.event_id === event.id)
        .filter((shift) => new Date(shift.starts_at || event.starts_at).getTime() > now.getTime())
        .map((shift) => {
          const people = (byShift.get(shift.id) || []).slice().sort((a, b) =>
            `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`)
          )
          return { ...shift, people, filled: people.length, open: Math.max(0, shift.capacity - people.length) }
        })
      return {
        ...event,
        shifts: eventShifts,
        filled: eventShifts.reduce((sum, s) => sum + s.filled, 0),
        open: eventShifts.reduce((sum, s) => sum + s.open, 0),
      }
    })
    .filter((event) => event.shifts.length > 0)

  const all = listed.flatMap((event) => event.shifts)
  return {
    events: listed,
    totals: {
      shifts: all.length,
      signedUp: all.reduce((sum, s) => sum + s.filled, 0),
      openSpots: all.reduce((sum, s) => sum + s.open, 0),
      shiftsNeedingPeople: all.filter((s) => s.open > 0).length,
    },
  }
}

/** Reads the next SERVE_DAYS_AHEAD days of shifts with the signed-in user's own access. */
export async function loadVolunteerSchedule(supabase: SupabaseClient, orgId: string, now = new Date()): Promise<Schedule> {
  const until = new Date(now.getTime() + SERVE_DAYS_AHEAD * 86_400_000)
  const { data: events } = await supabase
    .from('events')
    .select('id, title, starts_at, location, status')
    .eq('organization_id', orgId)
    .gte('starts_at', new Date(now.getTime() - 86_400_000).toISOString())
    .lte('starts_at', until.toISOString())
    .order('starts_at')
    .limit(200)
  const eventIds = (events || []).map((e) => e.id)
  if (eventIds.length === 0) return buildSchedule([], [], [], now)

  const [shifts, signups] = await Promise.all([
    allRows<ScheduleShiftRow>((from, to) =>
      supabase
        .from('shifts')
        .select('id, event_id, title, starts_at, ends_at, capacity')
        .eq('organization_id', orgId)
        .in('event_id', eventIds)
        .order('starts_at', { ascending: true, nullsFirst: true })
        .order('created_at')
        .range(from, to)
    ),
    allRows<ScheduleSignupRow>((from, to) =>
      supabase
        .from('shift_signups')
        .select('id, shift_id, member_id, first_name, last_name, email')
        .eq('organization_id', orgId)
        .in('event_id', eventIds)
        .eq('status', 'confirmed')
        .order('id')
        .range(from, to)
    ),
  ])
  return buildSchedule(events || [], shifts, signups, now)
}
