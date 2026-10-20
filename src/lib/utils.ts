import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, isAfter } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

// Convert empty-string fields to null so Postgres can accept them in
// nullable uuid/date/timestamp columns ('' is not a valid uuid or date)
export function nullifyEmptyStrings<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    out[key] = value === '' ? null : value
  }
  return out as T
}



// Keep API PATCH/POST payloads aligned with database columns. Client forms can
// include UI-only values (for example, send_email) or joined objects that should
// never be passed to Supabase updates.
export function pickAllowedFields<T extends Record<string, unknown>>(obj: T, allowedFields: readonly string[]): Partial<T> {
  const allowed = new Set(allowedFields)
  const out: Partial<T> = {}
  for (const [key, value] of Object.entries(obj)) {
    if (allowed.has(key)) out[key as keyof T] = value as T[keyof T]
  }
  return out
}

// Date-only values ("2026-10-20", from date columns such as donated_at) are
// calendar days, not instants. new Date() reads them as UTC midnight, which is
// the previous evening anywhere in the US, so parse them as local dates.
export function parseDate(date: string | Date): Date {
  if (typeof date === 'string') {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  }
  return new Date(date)
}

export function formatDate(date: string | Date): string {
  return format(parseDate(date), 'MMM d, yyyy')
}

// Today's date as YYYY-MM-DD on the viewer's own calendar (toISOString()
// would give tomorrow's date on a US evening).
export function todayISODate(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

export function formatDateTime(date: string | Date): string {
  return format(new Date(date), 'MMM d, yyyy h:mm a')
}

export function timeAgo(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

export function isFuture(date: string | Date): boolean {
  return isAfter(new Date(date), new Date())
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function isTrialActive(trialEndsAt?: string): boolean {
  if (!trialEndsAt) return false
  return isAfter(new Date(trialEndsAt), new Date())
}

export function getSubscriptionLabel(status: string, trialEndsAt?: string): string {
  if (status === 'trialing' && trialEndsAt) {
    const daysLeft = Math.ceil(
      (new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    )
    return daysLeft > 0 ? `Trial (${daysLeft}d left)` : 'Trial expired'
  }
  const labels: Record<string, string> = {
    active: 'Active',
    past_due: 'Past due',
    canceled: 'Canceled',
    incomplete: 'Incomplete',
  }
  return labels[status] || status
}
