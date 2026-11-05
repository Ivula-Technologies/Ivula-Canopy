import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { orgTimeZone } from '@/lib/timezone'
import { clientIp, rateLimit } from '@/lib/rate-limit'
import { cleanVolunteer, sendSignupConfirmation, signUpForShift } from '@/lib/shift-signup'

// GET — public: fetch event + shifts for the signup page (no auth)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const admin = await createServiceClient()

  const { data: event } = await admin
    .from('events')
    .select('id, title, description, location, starts_at, ends_at, organization_id, organizations(name)')
    .eq('checkin_token', token)
    .single()

  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

  const { data: shifts } = await admin
    .from('shifts')
    .select('id, title, description, starts_at, ends_at, capacity')
    .eq('event_id', event.id)
    .order('starts_at', { ascending: true, nullsFirst: true })
    .order('created_at')

  // Count confirmed signups per shift so the page can show spots remaining
  const { data: counts } = await admin
    .from('shift_signups')
    .select('shift_id')
    .eq('event_id', event.id)
    .eq('status', 'confirmed')

  const countMap: Record<string, number> = {}
  counts?.forEach(({ shift_id }) => {
    countMap[shift_id] = (countMap[shift_id] || 0) + 1
  })

  const shiftsWithSpots = (shifts || []).map((s) => ({
    ...s,
    signup_count: countMap[s.id] || 0,
    spots_left: s.capacity - (countMap[s.id] || 0),
  }))

  return NextResponse.json({ event, shifts: shiftsWithSpots })
}

// POST — public: volunteer signs up for a shift (no auth)
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  // High enough for a whole congregation signing up on church Wi-Fi after an
  // announcement; low enough to stop a script filling every shift.
  const limited = rateLimit(`signup:${clientIp(req)}`, 100, 10 * 60_000)
  if (limited) return limited
  const { token } = await params
  const admin = await createServiceClient()

  const { data: event } = await admin
    .from('events')
    .select('id, title, location, organization_id, organizations(*)')
    .eq('checkin_token', token)
    .single()

  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const volunteer = cleanVolunteer(body)
  if ('error' in volunteer || !body.shift_id) {
    return NextResponse.json({ error: 'error' in volunteer ? volunteer.error : 'Missing required fields' }, { status: 400 })
  }

  // Check the shift belongs to this event
  const { data: shift } = await admin
    .from('shifts')
    .select('id, title, capacity, starts_at, ends_at')
    .eq('id', body.shift_id)
    .eq('event_id', event.id)
    .single()

  if (!shift) return NextResponse.json({ error: 'Shift not found' }, { status: 404 })

  const result = await signUpForShift(admin, { orgId: event.organization_id, eventId: event.id, shift, volunteer })
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })

  // Send confirmation email (non-blocking)
  const org = event.organizations as unknown as { name: string; timezone?: string | null } | null
  sendSignupConfirmation({
    to: volunteer.email,
    firstName: volunteer.first_name,
    orgName: org?.name || 'The organization',
    timeZone: orgTimeZone(org),
    shifts: [{ shiftTitle: shift.title, eventTitle: event.title, startsAt: shift.starts_at, location: event.location, cancelToken: result.signup.cancel_token }],
  }).catch(console.error)

  return NextResponse.json({ signup: result.signup }, { status: 201 })
}
