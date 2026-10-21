import { NextResponse, type NextRequest } from 'next/server'

// A small in-memory limiter for the public endpoints (volunteer sign-up and
// door check-in), so one script can't flood a church with fake sign-ups or
// burn through the email quota. Counts live in this server process only,
// which is enough for a single cPanel Node app.

const buckets = new Map<string, { count: number; resetAt: number }>()

export function clientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown'
}

/** Returns a 429 response once `key` has been used `limit` times in `windowMs`, otherwise null. */
export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()): NextResponse | null {
  if (buckets.size > 10_000) {
    for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k)
  }
  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return null
  }
  bucket.count++
  if (bucket.count <= limit) return null
  return NextResponse.json(
    { error: 'Too many requests. Please wait a few minutes and try again.' },
    { status: 429, headers: { 'Retry-After': String(Math.ceil((bucket.resetAt - now) / 1000)) } }
  )
}
