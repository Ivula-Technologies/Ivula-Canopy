import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { orgTimeZone } from '@/lib/timezone'
import { clientIp, rateLimit } from '@/lib/rate-limit'
import { cleanVolunteer, parseShiftIds, sendSignupConfirmation, signUpForShift, type ConfirmedShift } from '@/lib/shift-signup'
import { orgByVolunteerToken } from '@/lib/volunteer-link'

// POST — public: a volunteer signs up for one or more shifts from the
// church-wide link (no auth). Each shift is booked on its own, so one full
// shift doesn't stop the others; the reply says which ones didn't go through.
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  // Same budget as the one-event link: enough for a congregation on church Wi-Fi.
  const limited = rateLimit(`serve:${clientIp(req)}`, 100, 10 * 60_000)
  if (limited) return limited
  const { token } = await params
  const admin = await createServiceClient()

  const org = await orgByVolunteerToken(admin, token)
  if (!org) return NextResponse.json({ error: 'This sign-up page was not found.' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const volunteer = cleanVolunteer(body)
  if ('error' in volunteer) return NextResponse.json({ error: volunteer.error }, { status: 400 })
  const shiftIds = parseShiftIds(body.shift_ids)
  if ('error' in shiftIds) return NextResponse.json({ error: shiftIds.error }, { status: 400 })

  const { data: shifts } = await admin
    .from('shifts')
    .select('id, event_id, title, capacity, starts_at, ends_at')
    .in('id', shiftIds)
    .eq('organization_id', org.id)
  const eventIds = [...new Set((shifts || []).map((s) => s.event_id))]
  const { data: events } = eventIds.length
    ? await admin.from('events').select('id, title, location, starts_at, status').in('id', eventIds).eq('organization_id', org.id)
    : { data: [] }

  const now = Date.now()
  const booked: ConfirmedShift[] = []
  const bookedIds: string[] = []
  const problems: { shift_id: string; error: string }[] = []

  for (const shiftId of shiftIds) {
    const shift = shifts?.find((s) => s.id === shiftId)
    const event = shift && events?.find((e) => e.id === shift.event_id)
    const startsAt = shift?.starts_at || event?.starts_at
    if (!shift || !event || event.status === 'cancelled' || !startsAt || new Date(startsAt).getTime() < now) {
      problems.push({ shift_id: shiftId, error: 'This shift is no longer open.' })
      continue
    }
    const result = await signUpForShift(admin, { orgId: org.id, eventId: event.id, shift, volunteer })
    if (!result.ok) {
      problems.push({ shift_id: shiftId, error: result.error })
      continue
    }
    bookedIds.push(shiftId)
    booked.push({ shiftTitle: shift.title, eventTitle: event.title, startsAt: shift.starts_at || event.starts_at, location: event.location, cancelToken: result.signup.cancel_token })
  }

  if (booked.length === 0) {
    return NextResponse.json({ error: problems[0]?.error || 'None of those shifts are open.', problems }, { status: 409 })
  }

  // Send one confirmation email for everything booked (non-blocking).
  sendSignupConfirmation({
    to: volunteer.email,
    firstName: volunteer.first_name,
    orgName: org.name,
    timeZone: orgTimeZone(org),
    shifts: booked,
  }).catch(console.error)

  return NextResponse.json({ booked: bookedIds, problems }, { status: 201 })
}
