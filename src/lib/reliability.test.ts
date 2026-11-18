import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Database-backed rate limits, error alerts and daily job heartbeats.
// Supabase and Resend are faked; each test sets what the database answers.

const state = vi.hoisted(() => ({
  rpc: null as null | ((fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>),
  upserts: [] as Record<string, unknown>[],
  jobRows: [] as Record<string, unknown>[],
  sent: [] as { to: string; subject: string; html: string }[],
}))

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: async () => ({
    rpc: (fn: string, args: Record<string, unknown>) => {
      if (!state.rpc) throw new Error('database unreachable')
      return state.rpc(fn, args)
    },
    from: () => ({
      upsert: async (row: Record<string, unknown>) => { state.upserts.push(row); return { error: null } },
      select: async () => ({ data: state.jobRows, error: null }),
    }),
  }),
}))
vi.mock('@/lib/email', () => ({
  escapeHtml: (v: string) => v.replace(/</g, '&lt;'),
  getResend: () => ({ emails: { send: async (m: { to: string; subject: string; html: string }) => { state.sent.push(m); return { error: null } } } }),
}))

import { durableHit, resetDurableRateLimitForTests } from './durable-rate-limit'
import { alertSignature, redactPath, reportError } from './monitoring'
import { jobStatus, readJobStatuses, runDailyJob } from './job-runs'

const env = process.env
beforeEach(() => {
  process.env = { ...env, NEXT_PUBLIC_SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'service' }
  state.rpc = null
  state.upserts = []
  state.jobRows = []
  state.sent = []
  resetDurableRateLimitForTests()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'log').mockImplementation(() => {})
})
afterEach(() => {
  process.env = env
  vi.restoreAllMocks()
})

describe('durableHit', () => {
  it('uses the database answer when the function exists', async () => {
    const calls: Record<string, unknown>[] = []
    state.rpc = async (_fn, args) => { calls.push(args); return { data: calls.length > 2 ? 42 : 0, error: null } }
    expect(await durableHit('db:a', 2, 60_000)).toBe(0)
    expect(await durableHit('db:a', 2, 60_000)).toBe(0)
    expect(await durableHit('db:a', 2, 60_000)).toBe(42)
    expect(calls[0]).toEqual({ p_key: 'db:a', p_limit: 2, p_window_seconds: 60 })
  })

  it('falls back to memory before SQL 015, and stops asking the database for a while', async () => {
    let asked = 0
    state.rpc = async () => { asked++; return { data: null, error: { code: 'PGRST202', message: 'Could not find the function public.rate_limit_hit' } } }
    const t = Date.now()
    expect(await durableHit('mem:a', 1, 60_000, t)).toBe(0)
    expect(await durableHit('mem:a', 1, 60_000, t + 1)).toBeGreaterThan(0)
    expect(asked).toBe(1)
  })

  it('falls back to memory when the database is unreachable', async () => {
    state.rpc = null
    const t = Date.now()
    expect(await durableHit('down:a', 1, 60_000, t)).toBe(0)
    expect(await durableHit('down:a', 1, 60_000, t + 1)).toBeGreaterThan(0)
  })
})

describe('monitoring', () => {
  it('takes tokens and query strings out of paths', () => {
    expect(redactPath('/api/public/signup/4f9c2a1b8e7d6c5b4a39?email=a@b.org')).toBe('/api/public/signup/:id')
    expect(redactPath('/dashboard/events')).toBe('/dashboard/events')
  })

  it('groups errors that differ only by ids or numbers', () => {
    expect(alertSignature('job', 'row 12 failed for 3f2b1c4d-1111-2222-3333-444455556666'))
      .toBe(alertSignature('job', 'row 98 failed for 9a8b7c6d-aaaa-bbbb-cccc-ddddeeeeffff'))
  })

  it('emails an error once, not on every repeat, and only when ALERT_EMAIL is set', async () => {
    await reportError('Stripe webhook', new Error('boom'))
    expect(state.sent).toHaveLength(0)

    process.env.ALERT_EMAIL = 'owner@example.org'
    process.env.RESEND_API_KEY = 're_test'
    await reportError('Stripe webhook', new Error('boom <b>'), { event: 'invoice.paid' })
    await reportError('Stripe webhook', new Error('boom <b>'), { event: 'invoice.paid' })
    expect(state.sent).toHaveLength(1)
    expect(state.sent[0].to).toBe('owner@example.org')
    expect(state.sent[0].subject).toBe('Canopy error: Stripe webhook')
    expect(state.sent[0].html).toContain('boom &lt;b>')
    expect(state.sent[0].html).toContain('invoice.paid')
  })
})

describe('daily jobs', () => {
  const now = Date.parse('2026-11-18T12:00:00Z')
  const hoursAgo = (h: number) => new Date(now - h * 3_600_000).toISOString()

  it('says when a job is fine, late, failing or has never run', () => {
    expect(jobStatus(undefined, now)).toBe('not_run_yet')
    expect(jobStatus({ name: 'j', last_ok_at: hoursAgo(20), last_error_at: null }, now)).toBe('ok')
    expect(jobStatus({ name: 'j', last_ok_at: hoursAgo(30), last_error_at: null }, now)).toBe('late')
    expect(jobStatus({ name: 'j', last_ok_at: hoursAgo(30), last_error_at: hoursAgo(2) }, now)).toBe('failing')
    expect(jobStatus({ name: 'j', last_ok_at: hoursAgo(1), last_error_at: hoursAgo(2) }, now)).toBe('ok')
  })

  it('reads every daily job, including ones with no row yet', async () => {
    state.jobRows = [{ name: 'shift-reminders', last_ok_at: hoursAgo(3), last_error_at: null }]
    const { createServiceClient } = await import('@/lib/supabase/server')
    expect(await readJobStatuses(await createServiceClient(), now)).toEqual({
      'shift-reminders': 'ok',
      'trial-reminders': 'not_run_yet',
    })
  })

  it('records a finished run and a failed one', async () => {
    const ok = await runDailyJob('trial-reminders', async () => ({ summary: { sent: 2 } }))
    expect(ok.status).toBe(200)
    expect(await ok.json()).toEqual({ sent: 2, errors: [] })
    expect(state.upserts[0]).toMatchObject({ name: 'trial-reminders', last_summary: { sent: 2, errors: 0 } })
    expect(state.upserts[0].last_ok_at).toBeTruthy()

    const failed = await runDailyJob('shift-reminders', async () => { throw new Error('Resend is down') })
    expect(failed.status).toBe(500)
    expect(state.upserts[1]).toMatchObject({ name: 'shift-reminders', last_error: 'Resend is down' })
    expect(state.upserts[1].last_ok_at).toBeUndefined()
  })

  it('counts a run with some failed emails as finished but reports them', async () => {
    const res = await runDailyJob('shift-reminders', async () => ({ summary: { emails: 4 }, errors: ['signup s1: bounced'] }))
    expect(res.status).toBe(207)
    expect(state.upserts[0].last_ok_at).toBeTruthy()
    expect(console.error).toHaveBeenCalled()
  })
})
