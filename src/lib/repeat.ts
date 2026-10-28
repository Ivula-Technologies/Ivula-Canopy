import { addDaysInZone } from './timezone'

// Repeating an event copies it, and its volunteer shifts, onto later dates so
// a church can set up a season of Sunday services in one step.

export const REPEAT_EVERY_WEEKS = [1, 2, 4] as const
export const MAX_REPEATS = 26

export type RepeatRequest = { everyWeeks: number; count: number; copyShifts: boolean }

export function parseRepeatRequest(body: unknown): RepeatRequest | { error: string } {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>
  const everyWeeks = Number(b.every_weeks)
  const count = Number(b.count)
  if (!(REPEAT_EVERY_WEEKS as readonly number[]).includes(everyWeeks)) {
    return { error: 'Choose every week, every 2 weeks or every 4 weeks.' }
  }
  if (!Number.isInteger(count) || count < 1 || count > MAX_REPEATS) {
    return { error: `Choose between 1 and ${MAX_REPEATS} more dates.` }
  }
  return { everyWeeks, count, copyShifts: b.copy_shifts !== false }
}

/** Days from the original date to each copy: every 2 weeks, 3 times -> [14, 28, 42]. */
export function repeatDayOffsets(everyWeeks: number, count: number): number[] {
  return Array.from({ length: count }, (_, i) => everyWeeks * 7 * (i + 1))
}

/** Moves an optional timestamp by whole days in the zone; a missing time stays missing. */
export function moveByDays(iso: string | null | undefined, days: number, timeZone: string): string | null {
  return iso ? addDaysInZone(iso, days, timeZone) : null
}
