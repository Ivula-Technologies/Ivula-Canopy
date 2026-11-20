import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { errorMessage, logEvent, reportError } from '@/lib/monitoring'

// Daily jobs (run by cPanel cron) record when they last finished in
// job_runs (migration 015). /api/health reads it, so an uptime monitor
// notices when a cron line was deleted or a job keeps failing, instead of
// reminders quietly stopping.

type Admin = Awaited<ReturnType<typeof createServiceClient>>

export const DAILY_JOBS = ['shift-reminders', 'trial-reminders'] as const
export type JobName = (typeof DAILY_JOBS)[number]

export type JobRow = {
  name: string
  last_ok_at: string | null
  last_error_at: string | null
  last_error?: string | null
}

export type JobStatus = 'ok' | 'not_run_yet' | 'late' | 'failing'

const HOUR = 3_600_000
// A daily job may run up to two hours late before it counts as missed.
const LATE_AFTER_MS = 26 * HOUR

export function jobStatus(row: JobRow | undefined, now = Date.now()): JobStatus {
  if (!row || (!row.last_ok_at && !row.last_error_at)) return 'not_run_yet'
  const ok = row.last_ok_at ? Date.parse(row.last_ok_at) : 0
  const failed = row.last_error_at ? Date.parse(row.last_error_at) : 0
  if (failed > ok) return 'failing'
  if (now - ok > LATE_AFTER_MS) return 'late'
  return 'ok'
}

function isMissingTable(error: { code?: string; message?: string }) {
  return error.code === '42P01' || error.code === 'PGRST205' || /job_runs/.test(error.message ?? '')
}

async function record(admin: Admin, row: Record<string, unknown>) {
  const { error } = await admin.from('job_runs').upsert(row, { onConflict: 'name' })
  // Before migration 015 the table doesn't exist; the job itself still ran.
  if (error && !isMissingTable(error)) logEvent('warn', 'job_runs write failed', { job: row.name, error: error.message })
}

/**
 * Runs a daily job, records the result in job_runs and reports a failure.
 * The job returns a summary (counts only) and any per-item errors; per-item
 * errors still count as a finished run, but they are reported once.
 */
export async function runDailyJob(
  name: JobName,
  job: (admin: Admin) => Promise<{ summary: Record<string, unknown>; errors?: string[] }>
): Promise<NextResponse> {
  const admin = await createServiceClient()
  try {
    const { summary, errors = [] } = await job(admin)
    await record(admin, { name, last_ok_at: new Date().toISOString(), last_summary: { ...summary, errors: errors.length } })
    logEvent('info', `job ${name} finished`, { ...summary, errors: errors.length })
    if (errors.length) await reportError(`job ${name}`, `${errors.length} item(s) failed: ${errors[0]}`, { failed: errors.length })
    return NextResponse.json({ ...summary, errors }, { status: errors.length ? 207 : 200 })
  } catch (err) {
    await record(admin, { name, last_error_at: new Date().toISOString(), last_error: errorMessage(err) })
    await reportError(`job ${name}`, err)
    return NextResponse.json({ error: 'Job failed' }, { status: 500 })
  }
}

/** Reads every daily job's status; `null` means migration 015 isn't run yet. */
export async function readJobStatuses(admin: Admin, now = Date.now()): Promise<Record<JobName, JobStatus> | null> {
  const { data, error } = await admin.from('job_runs').select('name, last_ok_at, last_error_at')
  if (error) return null
  const rows = new Map((data as JobRow[]).map((r) => [r.name, r]))
  return Object.fromEntries(DAILY_JOBS.map((n) => [n, jobStatus(rows.get(n), now)])) as Record<JobName, JobStatus>
}
