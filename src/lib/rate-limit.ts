import { NextResponse, type NextRequest } from 'next/server'

// A small in-memory limiter. Counts live in this server process only, so a
// restart clears them and each process counts on its own. That is fine for
// the busy, low-risk endpoints (door check-in). For anything that creates
// rows or sends email, use durableRateLimit() from durable-rate-limit.ts,
// which keeps its counts in the database and falls back to this.

const buckets = new Map<string, { count: number; resetAt: number }>()

export function clientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown'
}

/** Counts one hit. Returns 0 when allowed, otherwise the seconds until the window resets. */
export function memoryHit(key: string, limit: number, windowMs: number, now = Date.now()): number {
  if (buckets.size > 10_000) {
    for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k)
  }
  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return 0
  }
  bucket.count++
  if (bucket.count <= limit) return 0
  return Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))
}

export function tooManyRequests(retryAfterSeconds: number): NextResponse {
  return NextResponse.json(
    { error: 'Too many requests. Please wait a few minutes and try again.' },
    { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } }
  )
}

/** Returns a 429 response once `key` has been used `limit` times in `windowMs`, otherwise null. */
export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()): NextResponse | null {
  const wait = memoryHit(key, limit, windowMs, now)
  return wait > 0 ? tooManyRequests(wait) : null
}
