'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

// Two ways in: a password-reset link (signed in by /callback before we get
// here) or a staff invite, which Supabase sends with the session in the URL
// hash. The browser client won't read hash sessions, so we set it ourselves.
export default function ResetPasswordPage() {
  const router = useRouter()
  const [status, setStatus] = useState<'checking' | 'ready' | 'expired'>('checking')
  const [invited, setInvited] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const supabase = createClient()
    async function init() {
      const hash = new URLSearchParams(window.location.hash.slice(1))
      const accessToken = hash.get('access_token')
      const refreshToken = hash.get('refresh_token')
      if (hash.get('type') === 'invite') setInvited(true)
      if (accessToken && refreshToken) {
        await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
        window.history.replaceState(null, '', window.location.pathname)
      }
      const { data: { user } } = await supabase.auth.getUser()
      setStatus(user ? 'ready' : 'expired')
    }
    init()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match'); return }
    setSaving(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError(error.message)
      setSaving(false)
      return
    }
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Image src="/canopy-mark.svg" alt="Canopy" width={51} height={40} className="h-10 w-auto object-contain" />
            <span className="font-display text-2xl font-bold text-canopy-900">Canopy</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {invited ? 'Welcome to Canopy' : 'Choose a new password'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {invited ? 'Set a password so you can sign in any time.' : 'You’ll use it the next time you sign in.'}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          {status === 'checking' && (
            <div className="flex justify-center py-6">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-canopy-600 border-t-transparent" />
            </div>
          )}
          {status === 'expired' && (
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-4">
                This link has expired or was already used. Request a new one and open it on this device.
              </p>
              <Link href="/forgot-password">
                <Button className="w-full">Send a new link</Button>
              </Link>
            </div>
          )}
          {status === 'ready' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="New password"
                type="password"
                placeholder="At least 8 characters"
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Input
                label="Confirm password"
                type="password"
                minLength={8}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                error={confirm.length > 0 && password !== confirm ? 'Passwords do not match' : undefined}
                required
              />
              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
              )}
              <Button type="submit" className="w-full" loading={saving}>
                {invited ? 'Set password and continue' : 'Save new password'}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
