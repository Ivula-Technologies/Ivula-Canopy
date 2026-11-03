import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { escapeHtml, getResend } from '@/lib/email'
import { formatForEmail, orgTimeZone } from '@/lib/timezone'

// Run once a day from a cPanel cron job. Each run reminds volunteers whose
// shift starts 12 to 36 hours from now. The window is exactly 24 hours wide,
// so with one run a day every shift gets one reminder, whatever time of day
// it starts.
const HOUR = 3_600_000

type Admin = Awaited<ReturnType<typeof createServiceClient>>
type Signup = { id: string; first_name: string; email: string; cancel_token: string }

// Confirmed sign-ups that haven't had a reminder yet, so running the job twice
// (a retried cron, a manual run) never emails anyone twice. Until migration
// 012 adds reminder_sent_at, every confirmed sign-up is returned.
async function unremindedSignups(admin: Admin, shiftId: string, tracking: { on: boolean }): Promise<Signup[]> {
  const base = () => admin
    .from('shift_signups')
    .select('id, first_name, email, cancel_token')
    .eq('shift_id', shiftId)
    .eq('status', 'confirmed')
  if (tracking.on) {
    const { data, error } = await base().is('reminder_sent_at', null)
    if (!error) return data || []
    const missingColumn = error.code === '42703' || error.message?.includes('reminder_sent_at')
    if (!missingColumn) return []
    tracking.on = false
  }
  const { data } = await base()
  return data || []
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  const auth = req.headers.get('authorization')
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = await createServiceClient()
  const now = Date.now()
  const windowStart = new Date(now + 12 * HOUR).toISOString()
  const windowEnd = new Date(now + 36 * HOUR).toISOString()

  const { data: shifts } = await admin
    .from('shifts')
    .select('id, title, starts_at, ends_at, events(title, location), organizations(*)')
    .gte('starts_at', windowStart)
    .lt('starts_at', windowEnd)

  if (!shifts?.length) return NextResponse.json({ shifts: 0, emails: 0 })

  const resend = getResend()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://canopy.ivulatechnologies.com'
  const e = escapeHtml
  let emailCount = 0
  // Switched off for the rest of the run if migration 012 hasn't been applied.
  const tracking = { on: true }

  for (const shift of shifts) {
    const event = (Array.isArray(shift.events) ? shift.events[0] : shift.events) as { title: string; location?: string | null } | null
    const org = (Array.isArray(shift.organizations) ? shift.organizations[0] : shift.organizations) as { name?: string; timezone?: string | null } | null
    const signups = await unremindedSignups(admin, shift.id, tracking)

    const shiftTime = shift.starts_at ? formatForEmail(shift.starts_at, orgTimeZone(org)) : ''

    const results = await Promise.allSettled(
      signups.map((s) =>
        resend.emails.send({
          from: 'Ivula Canopy <no-reply@ivulatechnologies.com>',
          to: s.email,
          subject: `Reminder: ${shift.title}${shiftTime ? `, ${shiftTime}` : ''}`,
          html: `
            <p>Hi ${e(s.first_name)},</p>
            <p>A reminder that you're signed up for <strong>${e(shift.title)}</strong>${event?.title ? ` at <strong>${e(event.title)}</strong>` : ''}${org?.name ? ` with ${e(org.name)}` : ''}.</p>
            ${shiftTime ? `<p><strong>When:</strong> ${shiftTime}</p>` : ''}
            ${event?.location ? `<p><strong>Where:</strong> ${e(event.location)}</p>` : ''}
            <p>We'll see you there!</p>
            <p style="margin-top:24px;font-size:12px;color:#999;">
              Can't make it? <a href="${appUrl}/signup/cancel/${s.cancel_token}">Cancel your spot</a> so someone else can take it.
            </p>
          `,
        })
      )
    )
    const sentIds = signups.filter((_, i) => {
      const r = results[i]
      return r.status === 'fulfilled' && !r.value.error
    }).map((s) => s.id)
    emailCount += sentIds.length
    if (sentIds.length && tracking.on) {
      await admin.from('shift_signups').update({ reminder_sent_at: new Date().toISOString() }).in('id', sentIds)
    }
  }

  return NextResponse.json({ shifts: shifts.length, emails: emailCount })
}
