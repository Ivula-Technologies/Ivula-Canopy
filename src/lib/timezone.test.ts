import { describe, expect, it } from 'vitest'
import { addHoursToInput, formatDateIn, fromZonedInput, isValidTimeZone, orgTimeZone, toZonedInput } from './timezone'

describe('fromZonedInput', () => {
  it('reads the typed time as wall-clock time in the zone', () => {
    // 9 AM Central in October is daylight time, UTC-5.
    expect(fromZonedInput('2026-10-25T09:00', 'America/Chicago')).toBe('2026-10-25T14:00:00.000Z')
    // 9 AM Central in December is standard time, UTC-6.
    expect(fromZonedInput('2026-12-06T09:00', 'America/Chicago')).toBe('2026-12-06T15:00:00.000Z')
  })

  it('handles the day daylight saving ends', () => {
    expect(fromZonedInput('2026-11-01T09:00', 'America/Chicago')).toBe('2026-11-01T15:00:00.000Z')
  })

  it('handles the day daylight saving starts', () => {
    expect(fromZonedInput('2026-03-08T09:00', 'America/New_York')).toBe('2026-03-08T13:00:00.000Z')
  })

  it('handles zones without daylight saving', () => {
    expect(fromZonedInput('2026-07-04T18:30', 'America/Phoenix')).toBe('2026-07-05T01:30:00.000Z')
  })

  it('returns null for empty or malformed input', () => {
    expect(fromZonedInput('', 'America/Chicago')).toBeNull()
    expect(fromZonedInput(null, 'America/Chicago')).toBeNull()
    expect(fromZonedInput('next sunday', 'America/Chicago')).toBeNull()
  })
})

describe('toZonedInput', () => {
  it('is the inverse of fromZonedInput', () => {
    for (const value of ['2026-10-25T09:00', '2026-11-01T09:00', '2026-03-08T13:45', '2026-12-31T23:30']) {
      const iso = fromZonedInput(value, 'America/Los_Angeles')!
      expect(toZonedInput(iso, 'America/Los_Angeles')).toBe(value)
    }
  })

  it('returns an empty string for missing or invalid timestamps', () => {
    expect(toZonedInput(null, 'America/Chicago')).toBe('')
    expect(toZonedInput('not a date', 'America/Chicago')).toBe('')
  })
})

describe('addHoursToInput', () => {
  it('rolls over midnight and month ends', () => {
    expect(addHoursToInput('2026-10-31T23:00', 2)).toBe('2026-11-01T01:00')
  })
})

describe('orgTimeZone', () => {
  it('uses the org zone when valid and Eastern otherwise', () => {
    expect(orgTimeZone({ timezone: 'America/Denver' })).toBe('America/Denver')
    expect(orgTimeZone({ timezone: 'Not/AZone' })).toBe('America/New_York')
    expect(orgTimeZone(null)).toBe('America/New_York')
    expect(isValidTimeZone('')).toBe(false)
  })
})

describe('formatDateIn', () => {
  it('gives the calendar day in the church time zone, not the server one', () => {
    // 3:30 AM UTC on Nov 3 is still the evening of Nov 2 in Chicago.
    expect(formatDateIn('2026-11-03T03:30:00Z', 'America/Chicago')).toBe('Nov 2, 2026')
    expect(formatDateIn('2026-11-03T03:30:00Z', 'UTC')).toBe('Nov 3, 2026')
  })
})
