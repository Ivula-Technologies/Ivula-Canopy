'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [expired, setExpired] = useState(false)

  useEffect(() => {
    setExpired(new URLSearchParams(window.location.search).has('expired'))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/callback?next=/reset-password`,
    })
    setLoading(false)
    // Rate limits are worth showing; "no such user" is not, so nobody can use
    // this form to find out who has an account.
    if (error && error.status === 429) {
      setError('Too many attempts. Please wait a minute and try again.')
      return
    }
    setSent(true)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Image src="/canopy-mark.svg" alt="Canopy" width={51} height={40} className="h-10 w-auto object-contain" />
            <span className="font-display text-2xl font-bold text-canopy-900">Canopy</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Reset your password</h1>
          <p className="text-sm text-gray-500 mt-1">We&apos;ll email you a link to choose a new one.</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          {sent ? (
            <div className="text-center">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Check your email</h2>
              <p className="text-sm text-gray-500">
                If <strong>{email}</strong> has a Canopy account, a reset link is on its way. Open it on this
                device. It can take a minute to arrive, so check your spam folder too.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {expired && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
                  That link has expired or was opened in a different browser. Request a new one below.
                </div>
              )}
              <Input
                label="Email address"
                type="email"
                placeholder="you@yourchurch.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
              )}
              <Button type="submit" className="w-full" loading={loading}>
                Send reset link
              </Button>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-gray-500 mt-4">
          <Link href="/login" className="text-canopy-600 font-medium hover:underline">Back to sign in</Link>
        </p>
      </div>
    </div>
  )
}
