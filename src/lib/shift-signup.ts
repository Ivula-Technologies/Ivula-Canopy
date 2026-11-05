import type { createServiceClient } from '@/lib/supabase/server'
import { escapeHtml, getResend } from './email'
import { formatForEmail } from './timezone'
import { MAX_SHIFTS_PER_SIGNUP } from './volunteer-link'
import { senderName } from './volunteer-message'

// Public volunteer sign-ups, shared by the one-event link (/signup/[token])
// and the church-wide link (/serve/[token]).

type Admin = Awaited<ReturnType<typeof createServiceClient>>

export type Volunteer = {
  first_name: string
  last_name: string
  email: string
  phone: string | null
  notes: string | null
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Trims the public form and checks the required fields. */
export function cleanVolunteer(body: Record<string, unknown>): Volunteer | { error: string } {
  const text = (value: unknown, max: number) => (typeof value === 'string' ? value.trim().slice(0, max) : '')
  const volunteer = {
    first_name: text(body.first_name, 80),
    last_name: text(body.last_name, 80),
    email: text(body.email, 254).toLowerCase(),
    phone: text(body.phone, 40) || null,
    notes: text(body.notes, 1000) || null,
  }
  if (!volunteer.first_name || !volunteer.last_name || !volunteer.email) return { error: 'Missing required fields' }
  if (!EMAIL.test(volunteer.email)) return { error: 'Please enter a valid email address.' }
  return volunteer
}

/** The shifts picked on the church-wide page: unique ids, at least one, at most MAX_SHIFTS_PER_SIGNUP. */
export function parseShiftIds(value: unknown): string[] | { error: string } {
  if (!Array.isArray(value)) return { error: 'Please choose at least one shift.' }
  const ids = [...new Set(value.filter((id): id is string => typeof id === 'string' && id.length > 0 && id.length <= 64))]
  if (ids.length === 0) return { error: 'Please choose at least one shift.' }
  if (ids.length > MAX_SHIFTS_PER_SIGNUP) return { error: `Please choose ${MAX_SHIFTS_PER_SIGNUP} shifts or fewer at a time.` }
  return ids
}

export type SignupResult =
  | { ok: true; signup: { id: string; cancel_token: string } }
  | { ok: false; status: number; error: string }

/**
 * Books one volunteer onto one shift if it has room and they aren't already
 * on it. The caller has already checked the shift belongs to the event and
 * organization.
 */
export async function signUpForShift(
  admin: Admin,
  { orgId, eventId, shift, volunteer }: { orgId: string; eventId: string; shift: { id: string; capacity: number }; volunteer: Volunteer }
): Promise<SignupResult> {
  const { count } = await admin
    .from('shift_signups')
    .select('id', { count: 'exact', head: true })
    .eq('shift_id', shift.id)
    .eq('status', 'confirmed')
  if ((count || 0) >= shift.capacity) {
    return { ok: false, status: 409, error: 'This shift is full. Please choose another.' }
  }

  const { data: existing } = await admin
    .from('shift_signups')
    .select('id')
    .eq('shift_id', shift.id)
    .eq('email', volunteer.email)
    .eq('status', 'confirmed')
    .maybeSingle()
  if (existing) return { ok: false, status: 409, error: 'You are already signed up for this shift.' }

  // Link the sign-up to a member record when the email matches one.
  const { data: member } = await admin
    .from('members')
    .select('id')
    .eq('organization_id', orgId)
    .eq('email', volunteer.email)
    .maybeSingle()

  const { data: signup, error } = await admin
    .from('shift_signups')
    .insert({
      shift_id: shift.id,
      event_id: eventId,
      organization_id: orgId,
      member_id: member?.id || null,
      ...volunteer,
      status: 'confirmed',
    })
    .select()
    .single()

  if (error || !signup) return { ok: false, status: 500, error: error?.message || 'Could not save your sign-up.' }
  return { ok: true, signup }
}

export type ConfirmedShift = {
  shiftTitle: string
  eventTitle: string
  startsAt?: string | null
  location?: string | null
  cancelToken: string
}

/** One confirmation email for everything a volunteer just signed up for, each with its own cancel link. */
export async function sendSignupConfirmation({
  to, firstName, orgName, timeZone, shifts,
}: { to: string; firstName: string; orgName: string; timeZone: string; shifts: ConfirmedShift[] }) {
  if (shifts.length === 0) return
  const e = escapeHtml
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  const when = (s: ConfirmedShift) => (s.startsAt ? formatForEmail(s.startsAt, timeZone) : '')
  const cancelUrl = (s: ConfirmedShift) => `${appUrl}/signup/cancel/${s.cancelToken}`
  const [first] = shifts

  const html = shifts.length === 1
    ? `
      <p>Hi ${e(firstName)},</p>
      <p>You're confirmed for <strong>${e(first.shiftTitle)}</strong> at <strong>${e(first.eventTitle)}</strong> with ${e(orgName)}.</p>
      ${when(first) ? `<p><strong>When:</strong> ${when(first)}</p>` : ''}
      ${first.location ? `<p><strong>Where:</strong> ${e(first.location)}</p>` : ''}
      <p>We'll email you a reminder the day before. Thank you for serving!</p>
      <p style="margin-top:24px;font-size:12px;color:#999;">
        Can't make it anymore? <a href="${cancelUrl(first)}">Cancel your spot</a> so someone else can take it.
      </p>
    `
    : `
      <p>Hi ${e(firstName)},</p>
      <p>You're confirmed for ${shifts.length} shifts with ${e(orgName)}:</p>
      <ul style="padding-left:18px;">
        ${shifts.map((s) => `
          <li style="margin-bottom:14px;">
            <strong>${e(s.shiftTitle)}</strong> at <strong>${e(s.eventTitle)}</strong><br/>
            ${when(s) ? `${when(s)}<br/>` : ''}
            ${s.location ? `${e(s.location)}<br/>` : ''}
            <a href="${cancelUrl(s)}" style="font-size:12px;">Can't make this one? Cancel this spot</a>
          </li>`).join('')}
      </ul>
      <p>We'll email you a reminder the day before each one. Thank you for serving!</p>
    `

  await getResend().emails.send({
    from: `${senderName(orgName)} <no-reply@ivulatechnologies.com>`,
    to,
    subject: shifts.length === 1
      ? `You're signed up: ${first.shiftTitle}, ${first.eventTitle}`
      : `You're signed up for ${shifts.length} shifts with ${orgName}`,
    html,
  })
}
