'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, Clock } from 'lucide-react'
import type { AccessState } from '@/lib/subscription'

interface Props {
  access: AccessState
  canManageBilling: boolean
}

// Shown at the top of every dashboard page. Warns while the trial is running
// low and hard-blocks (visually) once it has expired / the subscription lapsed.
export function TrialBanner({ access, canManageBilling }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function upgrade() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/stripe/checkout', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.url) throw new Error(data.error || 'Could not start checkout')
      window.location.href = data.url
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setLoading(false)
    }
  }

  const UpgradeButton = canManageBilling ? (
    <button
      onClick={upgrade}
      disabled={loading}
      className="shrink-0 rounded-lg bg-white/90 px-4 py-1.5 text-sm font-semibold text-gray-900 hover:bg-white disabled:opacity-60"
    >
      {loading ? 'Loading…' : 'Upgrade now'}
    </button>
  ) : (
    <span className="shrink-0 text-sm opacity-90">Ask an admin to upgrade.</span>
  )

  // Locked — trial expired or subscription cancelled.
  if (access.locked) {
    return (
      <div className="bg-red-600 text-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>
              {access.reason === 'trial_expired'
                ? 'Your free trial has ended. Adding or editing data is disabled until you upgrade.'
                : 'Your subscription is inactive. Adding or editing data is disabled until billing is updated.'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {error && <span className="text-xs text-red-100">{error}</span>}
            {UpgradeButton}
          </div>
        </div>
      </div>
    )
  }

  // Trial ending soon — gentle nudge in the last 3 days.
  if (access.onTrial && access.trialDaysLeft <= 3) {
    return (
      <div className="bg-amber-500 text-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 shrink-0" />
            <span>
              {access.trialDaysLeft <= 1
                ? 'Your free trial ends today.'
                : `Your free trial ends in ${access.trialDaysLeft} days.`}{' '}
              Upgrade to keep full access.
            </span>
          </div>
          <div className="flex items-center gap-3">
            {error && <span className="text-xs">{error}</span>}
            {canManageBilling ? (
              UpgradeButton
            ) : (
              <Link href="/settings" className="shrink-0 text-sm font-medium underline">
                View billing
              </Link>
            )}
          </div>
        </div>
      </div>
    )
  }

  return null
}
