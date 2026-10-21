import { describe, expect, it } from 'vitest'
import { rateLimit } from './rate-limit'

describe('rateLimit', () => {
  it('allows up to the limit in a window, then refuses until it resets', () => {
    const t = 1_000_000
    expect(rateLimit('test:a', 2, 60_000, t)).toBeNull()
    expect(rateLimit('test:a', 2, 60_000, t + 1)).toBeNull()
    expect(rateLimit('test:a', 2, 60_000, t + 2)?.status).toBe(429)
    expect(rateLimit('test:b', 2, 60_000, t + 2)).toBeNull()
    expect(rateLimit('test:a', 2, 60_000, t + 60_001)).toBeNull()
  })
})
