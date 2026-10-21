import { describe, expect, it } from 'vitest'
import { formatDate, parseDate } from './utils'
import { safeNextPath } from './site-url'

describe('dates', () => {
  it('reads a date-only value on the local calendar, not as UTC midnight', () => {
    const d = parseDate('2026-10-25')
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 9, 25])
    expect(formatDate('2026-10-25')).toBe('Oct 25, 2026')
  })

  it('shows a blank for a missing or malformed date', () => {
    expect(formatDate(null)).toBe('')
    expect(formatDate('not a date')).toBe('')
  })
})

describe('safeNextPath', () => {
  it('keeps redirects on this site', () => {
    expect(safeNextPath('/reset-password')).toBe('/reset-password')
    expect(safeNextPath('//evil.example')).toBe('/dashboard')
    expect(safeNextPath('/\\evil.example')).toBe('/dashboard')
    expect(safeNextPath('https://evil.example')).toBe('/dashboard')
    expect(safeNextPath(null)).toBe('/dashboard')
  })
})
