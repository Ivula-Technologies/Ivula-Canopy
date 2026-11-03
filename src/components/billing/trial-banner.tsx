import Link from 'next/link'
import { AlertTriangle, Clock } from 'lucide-react'
import type { AccessState } from '@/lib/subscription'

interface Props {
  access: AccessState
  canManageBilling: boolean
  /** The org has already given Stripe a card, so there is nothing to upgrade. */
  subscribed: boolean
}

// Shown at the top of every dashboard page. A quiet countdown during the
// trial, a nudge in the last 3 days, and a hard stop once it has expired or
// the subscription lapsed. Plans are chosen in Settings, where all three are
// side by side. Inside the Google Play app the plan links and "choose a plan"
// wording are hidden (src/lib/app-platform.ts): plans are chosen on the website.
export function TrialBanner({ access, canManageBilling, subscribed }: Props) {
  const action = canManageBilling ? (
    <Link
      href="/settings#billing"
      data-hide-in-app
      className="shrink-0 rounded-lg bg-white/90 px-4 py-1.5 text-sm font-semibold text-gray-900 hover:bg-white"
    >
      {access.locked ? 'Choose a plan' : 'See plans'}
    </Link>
  ) : (
    <span data-hide-in-app className="shrink-0 text-sm opacity-90">Ask an admin to choose a plan.</span>
  )

  if (subscribed && access.status === 'past_due') {
    return (
      <div className="bg-red-600 text-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>
              Your last payment didn&apos;t go through.
              <span data-hide-in-app> Update your card to keep using Canopy.</span>
            </span>
          </div>
          {canManageBilling && (
            <Link href="/settings#billing" data-hide-in-app className="shrink-0 rounded-lg bg-white/90 px-4 py-1.5 text-sm font-semibold text-gray-900 hover:bg-white">
              Update card
            </Link>
          )}
        </div>
      </div>
    )
  }

  if (subscribed) return null

  // Locked: trial expired or subscription cancelled.
  if (access.locked) {
    return (
      <div className="bg-red-600 text-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>
              {access.reason === 'trial_expired'
                ? 'Your free trial has ended. Everything is saved, but adding or editing is paused'
                : 'Your subscription is inactive. Adding or editing is paused'}
              <span data-hide-in-app>{access.reason === 'trial_expired' ? ' until you choose a plan' : ' until billing is updated'}</span>
              .
            </span>
          </div>
          {action}
        </div>
      </div>
    )
  }

  if (!access.onTrial) return null

  const daysText = access.trialDaysLeft <= 1 ? 'Your free trial ends today.' : `${access.trialDaysLeft} days left in your free trial.`

  // Last 3 days: a clear nudge.
  if (access.trialDaysLeft <= 3) {
    return (
      <div className="bg-amber-500 text-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 shrink-0" />
            <span>
              {daysText}
              <span data-hide-in-app> Choose a plan to keep full access.</span>
            </span>
          </div>
          {action}
        </div>
      </div>
    )
  }

  // Earlier in the trial: a quiet line, so nobody is surprised on day 14.
  return (
    <div className="border-b border-canopy-100 bg-canopy-50 text-canopy-800">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2 text-sm">
        <span className="flex items-center gap-2">
          <Clock className="h-4 w-4 shrink-0" />
          {daysText}
        </span>
        {canManageBilling && (
          <Link href="/settings#billing" data-hide-in-app className="shrink-0 font-medium underline-offset-4 hover:underline">
            See plans
          </Link>
        )}
      </div>
    </div>
  )
}
