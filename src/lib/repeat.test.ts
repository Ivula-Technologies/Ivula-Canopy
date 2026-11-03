import { describe, expect, it } from 'vitest'
import { MAX_REPEATS, moveByDays, parseRepeatRequest, repeatDayOffsets } from './repeat'

describe('parseRepeatRequest', () => {
  it('accepts every 1, 2 or 4 weeks and copies shifts by default', () => {
    expect(parseRepeatRequest({ every_weeks: 1, count: 8 })).toEqual({ everyWeeks: 1, count: 8, copyShifts: true })
    expect(parseRepeatRequest({ every_weeks: '2', count: '3', copy_shifts: false })).toEqual({ everyWeeks: 2, count: 3, copyShifts: false })
    expect(parseRepeatRequest({ every_weeks: 4, count: MAX_REPEATS })).toEqual({ everyWeeks: 4, count: MAX_REPEATS, copyShifts: true })
  })

  it('rejects other intervals', () => {
    expect(parseRepeatRequest({ every_weeks: 3, count: 2 })).toHaveProperty('error')
    expect(parseRepeatRequest({ count: 2 })).toHaveProperty('error')
  })

  it('rejects too few, too many or fractional dates', () => {
    expect(parseRepeatRequest({ every_weeks: 1, count: 0 })).toHaveProperty('error')
    expect(parseRepeatRequest({ every_weeks: 1, count: MAX_REPEATS + 1 })).toHaveProperty('error')
    expect(parseRepeatRequest({ every_weeks: 1, count: 2.5 })).toHaveProperty('error')
  })

  it('treats a missing body as invalid', () => {
    expect(parseRepeatRequest(null)).toHaveProperty('error')
  })
})

describe('repeatDayOffsets', () => {
  it('lists the days after the original date', () => {
    expect(repeatDayOffsets(1, 3)).toEqual([7, 14, 21])
    expect(repeatDayOffsets(2, 3)).toEqual([14, 28, 42])
  })
})

describe('moveByDays', () => {
  it('keeps a missing time missing', () => {
    expect(moveByDays(null, 7, 'America/Chicago')).toBeNull()
    expect(moveByDays(undefined, 7, 'America/Chicago')).toBeNull()
  })

  it('moves a shift across the end of daylight saving at the same local time', () => {
    // 8:30 AM Eastern greeters' shift on Oct 25 and on Nov 1.
    expect(moveByDays('2026-10-25T12:30:00.000Z', 7, 'America/New_York')).toBe('2026-11-01T13:30:00.000Z')
  })
})
