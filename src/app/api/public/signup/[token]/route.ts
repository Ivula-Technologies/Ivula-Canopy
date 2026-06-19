import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

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
  const { token } = await params
  const admin = await createServiceClient()

  const { data: event } = await admin
    .from('events')
    .select('id, title, organization_id, organizations(name)')
    .eq('checkin_token', token)
    .single()

  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

  const body = await req.json()
  const { shift_id, first_name, last_name, email, phone, notes } = body

  if (!shift_id || !first_name || !last_name || !email) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Check the shift belongs to this event and has capacity
  const { data: shift } = await admin
    .from('shifts')
    .select('id, title, capacity, starts_at, ends_at')
    .eq('id', shift_id)
    .eq('event_id', event.id)
    .single()

  if (!shift) return NextResponse.json({ error: 'Shift not found' }, { status: 404 })

  const { count } = await admin
    .from('shift_signups')
    .select('id', { count: 'exact', head: true })
    .eq('shift_id', shift_id)
    .eq('status', 'confirmed')

  if ((count || 0) >= shift.capacity) {
    return NextResponse.json({ error: 'This shift is full. Please choose another.' }, { status: 409 })
  }

  // Prevent double-signup by same email for same shift
  const { data: existing } = await admin
    .from('shift_signups')
    .select('id')
    .eq('shift_id', shift_id)
    .eq('email', email.toLowerCase().trim())
    .eq('status', 'confirmed')
    .single()

  if (existing) {
    return NextResponse.json({ error: 'You are already signed up for this shift.' }, { status: 409 })
  }

  // Match to a member by email if possible
  const { data: member } = await admin
    .from('members')
    .select('id')
    .eq('organization_id', event.organization_id)
    .eq('email', email.toLowerCase().trim())
    .single()

  const { data: signup, error } = await admin
    .from('shift_signups')
    .insert({
      shift_id,
      event_id: event.id,
      organization_id: event.organization_id,
      member_id: member?.id || null,
      first_name: first_name.trim(),
      last_name: last_name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone?.trim() || null,
      notes: notes?.trim() || null,
      status: 'confirmed',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Send confirmation email (non-blocking)
  const orgName = (event.organizations as unknown as { name: string } | null)?.name || 'The organization'
  sendConfirmationEmail(signup, shift, event.title, orgName).catch(console.error)

  return NextResponse.json({ signup }, { status: 201 })
}

async function sendConfirmationEmail(
  signup: { first_name: string; email: string; cancel_token: string },
  shift: { title: string; starts_at?: string | null; ends_at?: string | null },
  eventTitle: string,
  orgName: string
) {
  const { getResend } = await import('@/lib/email')
  const resend = getResend()
  if (!resend) return

  const shiftTime = shift.starts_at
    ? new Date(shift.starts_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
    : ''

  await resend.emails.send({
    from: `${orgName} <no-reply@ivulatechnologies.com>`,
    to: signup.email,
    subject: `You're signed up — ${eventTitle}`,
    html: `
      <p>Hi ${signup.first_name},</p>
      <p>You're confirmed for <strong>${shift.title}</strong>${shiftTime ? ` on ${shiftTime}` : ''} at <strong>${eventTitle}</strong> with ${orgName}.</p>
      <p>We'll see you there!</p>
      <p style="margin-top:24px;font-size:12px;color:#999;">
        Need to cancel? <a href="${process.env.NEXT_PUBLIC_APP_URL}/signup/cancel/${signup.cancel_token}">Click here to cancel your spot</a>.
      </p>
    `,
  })
}
