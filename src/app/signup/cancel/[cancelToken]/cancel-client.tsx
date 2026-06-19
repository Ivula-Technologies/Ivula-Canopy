'use client'

import Image from 'next/image'
import { CheckCircle, XCircle, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

interface Props {
  signup: {
    id: string
    first_name: string
    email: string
    status: string
    shifts: { title: string; starts_at?: string | null; ends_at?: string | null } | null
    events: { title: string } | null
  } | null
  cancelToken: string
}

function formatTime(iso?: string | null) {
  if (!iso) return null
  return new Date(iso).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
}

export default function CancelClient({ signup, cancelToken }: Props) {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function handleCancel() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/public/cancel/${cancelToken}`, { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setDone(true)
      } else {
        setError(data.error || 'Something went wrong')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const invalid = !signup || signup.status === 'cancelled'

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full mx-auto">
        <div className="flex items-center gap-2 mb-6 justify-center">
          <Image src="/ivula.png" alt="Ivula" width={32} height={32} className="h-8 w-8 object-contain" />
          <span className="font-semibold text-gray-900 text-lg">Ivula Canopy</span>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
          {done ? (
            <div className="text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h1 className="text-xl font-semibold text-gray-900 mb-2">Spot cancelled</h1>
              <p className="text-gray-500 text-sm">Your spot has been cancelled. We've let the organizer know.</p>
            </div>
          ) : invalid ? (
            <div className="text-center">
              <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h1 className="text-xl font-semibold text-gray-900 mb-2">Link not valid</h1>
              <p className="text-gray-500 text-sm">
                This cancellation link is no longer valid or your spot was already cancelled.
              </p>
            </div>
          ) : (
            <div>
              <h1 className="text-xl font-semibold text-gray-900 mb-1">Cancel your spot?</h1>
              <p className="text-gray-500 text-sm mb-6">
                Hi {signup.first_name}, you're about to cancel your sign-up for the following shift.
              </p>

              <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 mb-6 space-y-1">
                <p className="font-medium text-gray-900">{signup.shifts?.title || 'Shift'}</p>
                {signup.events?.title && (
                  <p className="text-sm text-gray-500">{signup.events.title}</p>
                )}
                {(signup.shifts?.starts_at || signup.shifts?.ends_at) && (
                  <div className="flex items-center gap-1 text-sm text-gray-500 pt-1">
                    <Clock className="h-3.5 w-3.5" />
                    <span>
                      {formatTime(signup.shifts?.starts_at)}
                      {signup.shifts?.ends_at ? ` – ${formatTime(signup.shifts.ends_at)}` : ''}
                    </span>
                  </div>
                )}
              </div>

              {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

              <Button
                className="w-full bg-red-600 hover:bg-red-700 text-white"
                onClick={handleCancel}
                disabled={loading}
              >
                {loading ? 'Cancelling…' : 'Cancel my spot'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
