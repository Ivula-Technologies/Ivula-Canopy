import type { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { memoryHit, tooManyRequests } from '@/lib/rate-limit'

// Rate limits kept in the database (migration 015), so they hold across
// restarts and across every server process cPanel starts. If the database
// call fails, or 015 hasn't been run yet, it falls back to the in-memory
// limiter: a limiter problem should never stop a volunteer signing up.

const MISSING_RETRY_MS = 10 * 60_000
let functionMissingUntil = 0

function isMissingFunction(error: { code?: string; message?: string }): boolean {
  return error.code === 'PGRST202' || error.code === '42883' || /rate_limit_hit/.test(error.message ?? '')
}

/** Counts one hit. Returns 0 when allowed, otherwise the seconds until the window resets. */
export async function durableHit(key: string, limit: number, windowMs: number, now = Date.now()): Promise<number> {
  if (now >= functionMissingUntil && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const admin = await createServiceClient()
      const { data, error } = await admin.rpc('rate_limit_hit', {
        p_key: key,
        p_limit: limit,
        p_window_seconds: Math.max(1, Math.ceil(windowMs / 1000)),
      })
      if (!error && typeof data === 'number') return data
      if (error && isMissingFunction(error)) functionMissingUntil = now + MISSING_RETRY_MS
    } catch {
      // Database unreachable: count in memory instead.
    }
  }
  return memoryHit(key, limit, windowMs, now)
}

/** Returns a 429 response once `key` has been used `limit` times in `windowMs`, otherwise null. */
export async function durableRateLimit(key: string, limit: number, windowMs: number): Promise<NextResponse | null> {
  const wait = await durableHit(key, limit, windowMs)
  return wait > 0 ? tooManyRequests(wait) : null
}

/** Test helper: forget that the database function was missing. */
export function resetDurableRateLimitForTests() {
  functionMissingUntil = 0
}
