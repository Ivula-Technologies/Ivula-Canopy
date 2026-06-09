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

export function formatDate(date: string | Date): string {
  return format(new Date(date), 'MMM d, yyyy')
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
