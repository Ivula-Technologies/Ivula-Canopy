import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getResend } from '@/lib/email'

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = await createServiceClient()
  const now = Date.now()
  const windowStart = new Date(now + 20 * 3600000).toISOString()
  const windowEnd = new Date(now + 28 * 3600000).toISOString()

  const { data: shifts } = await admin
    .from('shifts')
    .select('id, title, starts_at, ends_at, events(title, location)')
    .gte('starts_at', windowStart)
    .lte('starts_at', windowEnd)

  if (!shifts?.length) return NextResponse.json({ shifts: 0, emails: 0 })

  const resend = getResend()
  let emailCount = 0

  for (const shift of shifts) {
    const event = (Array.isArray(shift.events) ? shift.events[0] : shift.events) as { title: string; location?: string | null } | null
    const { data: signups } = await admin
      .from('shift_signups')
      .select('first_name, email')
      .eq('shift_id', shift.id)
      .eq('status', 'confirmed')

    const shiftTime = shift.starts_at
      ? new Date(shift.starts_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
      : ''

    await Promise.allSettled(
      (signups || []).map((s) =>
        resend.emails.send({
          from: 'Ivula Canopy <no-reply@ivulatechnologies.com>',
          to: s.email,
          subject: `Reminder: ${shift.title} is tomorrow`,
          html: `
            <p>Hi ${s.first_name},</p>
            <p>Just a reminder that you're signed up for <strong>${shift.title}</strong>${event?.title ? ` at <strong>${event.title}</strong>` : ''} tomorrow.</p>
            ${shiftTime ? `<p><strong>When:</strong> ${shiftTime}</p>` : ''}
            ${event?.location ? `<p><strong>Where:</strong> ${event.location}</p>` : ''}
            <p>We'll see you there!</p>
            <p style="color:#9ca3af;font-size:12px;">Sent via Ivula Canopy.</p>
          `,
        })
      )
    )
    emailCount += signups?.length || 0
  }

  return NextResponse.json({ shifts: shifts.length, emails: emailCount })
}
