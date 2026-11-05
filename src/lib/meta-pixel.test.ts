import { describe, expect, it } from 'vitest'
import { isPixelPage } from './meta-pixel'

describe('isPixelPage', () => {
  it('allows the home page and the organization sign-up page', () => {
    expect(isPixelPage('/')).toBe(true)
    expect(isPixelPage('/signup')).toBe(true)
    expect(isPixelPage('/signup/')).toBe(true)
  })

  it('never allows pages that hold church members or volunteers', () => {
    for (const path of [
      '/dashboard',
      '/members',
      '/settings',
      '/login',
      '/onboarding',
      '/portal',
      '/serve/abc123',
      '/signup/abc123',
      '/signup/cancel/abc123',
      '/checkin/abc123',
    ]) {
      expect(isPixelPage(path)).toBe(false)
    }
  })

  it('treats a missing path as not allowed', () => {
    expect(isPixelPage(null)).toBe(false)
    expect(isPixelPage(undefined)).toBe(false)
    expect(isPixelPage('')).toBe(false)
  })
})
