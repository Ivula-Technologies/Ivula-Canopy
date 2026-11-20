import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { readJobStatuses } from '@/lib/job-runs'

export const dynamic = 'force-dynamic'

// Uptime check for UptimeRobot (or any monitor). Returns 200 only when:
// - the required settings are present (names only, never values),
// - the database answers,
// - every Canopy SQL file has been run (sqlNotRun lists any that weren't),
// - no daily cron job has stopped running or keeps failing.
// A job that has never run yet doesn't fail the check, so a new install
// isn't flagged before its first night; job status that can't be read does.
const REQUIRED = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_PRICE_ID_STARTER',
  'STRIPE_PRICE_ID_GROWTH',
  'STRIPE_PRICE_ID_PRO',
  'NEXT_PUBLIC_APP_URL',
  'RESEND_API_KEY',
  'CRON_SECRET',
]

// Optional, but worth knowing about: without it nobody hears about errors.
const RECOMMENDED = ['ALERT_EMAIL']

const LATEST_SQL = '015_reliability.sql'

export async function GET() {
  const missing = REQUIRED.filter((name) => !process.env[name])
  if (!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY && !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    missing.push('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')
  }
  const recommended = RECOMMENDED.filter((name) => !process.env[name])

  let database = 'skipped'
  let sqlNotRun: string[] = []
  let jobs: Record<string, string> | 'unknown' = 'unknown'

  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const supabase = await createServiceClient()
      const { error } = await supabase.from('organizations').select('id', { head: true, count: 'exact' }).limit(1)
      database = error ? 'error' : 'ok'

      if (database === 'ok') {
        const [schema, jobStatuses] = await Promise.all([
          supabase.rpc('canopy_schema_check'),
          readJobStatuses(supabase),
        ])
        // canopy_schema_check() itself arrives with 015, so if it is missing
        // the earlier files can't be checked yet: run them in order.
        sqlNotRun = schema.error
          ? [`${LATEST_SQL} (and any earlier ones not run yet)`]
          : ((schema.data as string[] | null) ?? [])
        if (jobStatuses) jobs = jobStatuses
      }
    } catch {
      database = 'error'
    }
  }

  // 'unknown' means job_runs couldn't be read, so nobody would notice the
  // reminders stopping: that counts as a failure too.
  const jobsOk = jobs !== 'unknown' && Object.values(jobs).every((s) => s === 'ok' || s === 'not_run_yet')
  const ok = missing.length === 0 && database === 'ok' && sqlNotRun.length === 0 && jobsOk
  return NextResponse.json(
    {
      ok,
      database,
      missing,
      recommended,
      sqlNotRun,
      jobs,
      build: process.env.CANOPY_BUILD || 'dev',
      time: new Date().toISOString(),
    },
    { status: ok ? 200 : 503, headers: { 'Cache-Control': 'no-store' } }
  )
}
