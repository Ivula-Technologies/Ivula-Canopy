import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendTrialReminderEmail } from '@/lib/email'

// Run once a day from a cPanel cron job (same CRON_SECRET as shift reminders).
// Emails org admins 3 days before the trial ends and on the day it ends. Each
// org falls into each 24-hour window exactly once, so a daily run sends each
// reminder once without storing anything.
const DAY = 86_400_000

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = await createServiceClient()
  const now = Date.now()
  const windows = [
    { kind: 'three_days' as const, from: now + 2 * DAY, to: now + 3 * DAY },
    { kind: 'ended' as const, from: now - DAY, to: now },
  ]

  let sent = 0
  const errors: string[] = []

  for (const w of windows) {
    const { data: orgs, error } = await admin
      .from('organizations')
      .select('id, name')
      .eq('subscription_status', 'trialing')
      .is('stripe_subscription_id', null)
      .gt('trial_ends_at', new Date(w.from).toISOString())
      .lte('trial_ends_at', new Date(w.to).toISOString())
    if (error) {
      errors.push(error.message)
      continue
    }

    for (const org of orgs ?? []) {
      const { data: admins } = await admin
        .from('profiles')
        .select('email')
        .eq('organization_id', org.id)
        .eq('role', 'org_admin')
      const results = await Promise.allSettled(
        (admins ?? []).filter((a) => a.email).map((a) => sendTrialReminderEmail(a.email, org.name, w.kind))
      )
      for (const r of results) {
        if (r.status === 'fulfilled' && !r.value.error) sent++
        else errors.push(`${org.id}: ${r.status === 'rejected' ? String(r.reason) : r.value.error?.message}`)
      }
    }
  }

  return NextResponse.json({ sent, errors }, { status: errors.length ? 207 : 200 })
}
