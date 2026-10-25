// Event and shift times are shown in the organization's own time zone, so the
// dashboard, the public sign-up page and volunteer emails always agree, no
// matter where the server or the person reading sits.

export const DEFAULT_TIME_ZONE = 'America/New_York'

export const US_TIME_ZONES = [
  { id: 'America/New_York', label: 'Eastern Time' },
  { id: 'America/Chicago', label: 'Central Time' },
  { id: 'America/Denver', label: 'Mountain Time' },
  { id: 'America/Phoenix', label: 'Arizona (no daylight saving)' },
  { id: 'America/Los_Angeles', label: 'Pacific Time' },
  { id: 'America/Anchorage', label: 'Alaska Time' },
  { id: 'Pacific/Honolulu', label: 'Hawaii Time' },
] as const

export function isValidTimeZone(tz: unknown): tz is string {
  if (typeof tz !== 'string' || !tz) return false
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz })
    return true
  } catch {
    return false
  }
}

// organizations.timezone arrives with migration 011; until it runs (and for
// orgs created before it) we fall back to Eastern Time.
export function orgTimeZone(org?: { timezone?: string | null } | null): string {
  return isValidTimeZone(org?.timezone) ? org!.timezone! : DEFAULT_TIME_ZONE
}

export function browserTimeZone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    return isValidTimeZone(tz) ? tz : DEFAULT_TIME_ZONE
  } catch {
    return DEFAULT_TIME_ZONE
  }
}

function fmt(iso: string | Date, timeZone: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('en-US', { timeZone, ...options }).format(new Date(iso))
}

/** "Oct 25, 2026, 9:00 AM" */
export function formatDateTimeIn(iso: string | Date, timeZone: string) {
  return fmt(iso, timeZone, { dateStyle: 'medium', timeStyle: 'short' })
}

/** "Sun, Oct 25, 9:00 AM CDT" for emails, where the reader may be anywhere. */
export function formatForEmail(iso: string | Date, timeZone: string) {
  return fmt(iso, timeZone, {
    weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  })
}

/** "9:00 AM" */
export function formatTimeIn(iso: string | Date, timeZone: string) {
  return fmt(iso, timeZone, { hour: 'numeric', minute: '2-digit' })
}

/** "Oct 25, 2026", the calendar day in that zone (same shape as formatDate) */
export function formatDateIn(iso: string | Date, timeZone: string) {
  return fmt(iso, timeZone, { month: 'short', day: 'numeric', year: 'numeric' })
}

/** "Sun, Oct 25" */
export function formatDayIn(iso: string | Date, timeZone: string) {
  return fmt(iso, timeZone, { weekday: 'short', month: 'short', day: 'numeric' })
}

/** Month and day for calendar-style date badges: { month: 'Oct', day: '25' } */
export function dateBadgeIn(iso: string | Date, timeZone: string) {
  return {
    month: fmt(iso, timeZone, { month: 'short' }),
    day: fmt(iso, timeZone, { day: 'numeric' }),
  }
}

function zonedParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(date)
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value)
  return { year: get('year'), month: get('month'), day: get('day'), hour: get('hour'), minute: get('minute'), second: get('second') }
}

// How far the zone's wall clock is ahead of UTC at a given instant, in ms.
function offsetMs(date: Date, timeZone: string) {
  const p = zonedParts(date, timeZone)
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second)
  return asUtc - Math.floor(date.getTime() / 1000) * 1000
}

/** ISO timestamp -> "YYYY-MM-DDTHH:mm" in the zone, for datetime-local inputs. */
export function toZonedInput(iso: string | null | undefined, timeZone: string): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (isNaN(date.getTime())) return ''
  const p = zonedParts(date, timeZone)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`
}

/**
 * "YYYY-MM-DDTHH:mm" typed into a datetime-local input, read as wall-clock
 * time in the zone -> ISO timestamp. Sending the bare input value would make
 * the database read it as UTC and move every event by hours.
 */
export function fromZonedInput(value: string | null | undefined, timeZone: string): string | null {
  if (!value) return null
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value)
  if (!match) return null
  const [, y, mo, d, h, mi] = match.map(Number)
  const wallAsUtc = Date.UTC(y, mo - 1, d, h, mi)
  let ts = wallAsUtc - offsetMs(new Date(wallAsUtc), timeZone)
  // Correct once more in case the guess landed on the other side of a DST change.
  const corrected = wallAsUtc - offsetMs(new Date(ts), timeZone)
  if (corrected !== ts) ts = corrected
  return new Date(ts).toISOString()
}

/** Adds hours to a datetime-local value, used to suggest an end time. */
export function addHoursToInput(value: string, hours: number): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value)
  if (!match) return ''
  const [, y, mo, d, h, mi] = match.map(Number)
  const t = new Date(Date.UTC(y, mo - 1, d, h + hours, mi))
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}T${pad(t.getUTCHours())}:${pad(t.getUTCMinutes())}`
}
