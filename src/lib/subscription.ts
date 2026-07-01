import type { Organization, SubscriptionStatus } from '@/types'

// A minimal shape so this works with either a full Organization or a partial
// row that only selected the billing columns.
export type BillingInfo = Pick<
  Organization,
  'subscription_status' | 'trial_ends_at' | 'current_period_end'
>

export interface AccessState {
  /** true when critical/write features must be blocked */
  locked: boolean
  /** true while the org is on an active (not-yet-expired) free trial */
  onTrial: boolean
  /** whole days left in the trial (0 when expired or not on trial) */
  trialDaysLeft: number
  status: SubscriptionStatus
  /** short human reason, used for banners / API error messages */
  reason: 'active' | 'trialing' | 'trial_expired' | 'past_due' | 'canceled'
}

// Single source of truth for "can this org use paid features right now?".
// Reads are always allowed; only critical/write features consult `locked`.
export function getAccessState(org: BillingInfo, now: Date = new Date()): AccessState {
  const status = (org.subscription_status || 'trialing') as SubscriptionStatus
  const trialEnds = org.trial_ends_at ? new Date(org.trial_ends_at) : null

  const msLeft = trialEnds ? trialEnds.getTime() - now.getTime() : 0
  const trialDaysLeft = msLeft > 0 ? Math.ceil(msLeft / 86_400_000) : 0

  // Paid & in good standing — full access.
  if (status === 'active') {
    return { locked: false, onTrial: false, trialDaysLeft: 0, status, reason: 'active' }
  }

  // Payment failed but Stripe is still retrying — keep a short grace window
  // rather than locking a paying customer out over a transient decline.
  if (status === 'past_due') {
    return { locked: false, onTrial: false, trialDaysLeft: 0, status, reason: 'past_due' }
  }

  // Explicitly cancelled — lock.
  if (status === 'canceled' || status === 'incomplete') {
    return { locked: true, onTrial: false, trialDaysLeft: 0, status, reason: 'canceled' }
  }

  // Trialing — locked only once the trial window has elapsed.
  const expired = !trialEnds || msLeft <= 0
  return {
    locked: expired,
    onTrial: !expired,
    trialDaysLeft,
    status,
    reason: expired ? 'trial_expired' : 'trialing',
  }
}

export function isLocked(org: BillingInfo, now?: Date): boolean {
  return getAccessState(org, now).locked
}
