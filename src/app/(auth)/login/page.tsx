'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState('')

  // Set by /callback when an email link can't sign someone in directly.
  useEffect(() => {
    const link = new URLSearchParams(window.location.search).get('link')
    if (link === 'used') setNotice('Your email is confirmed. Sign in with your email and password to continue.')
    if (link === 'expired') setNotice('That link has expired. Sign in below, or reset your password if you need to.')
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(
        error.message === 'Invalid login credentials'
          ? 'That email and password don’t match. Check them, or reset your password.'
          : error.message
      )
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Image src="/canopy-mark.svg" alt="Canopy" width={51} height={40} className="h-10 w-auto object-contain" />
            <span className="font-display text-2xl font-bold text-canopy-900">Canopy</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
          <p className="text-sm text-gray-500 mt-1">Sign in to your organization</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          <form onSubmit={handleLogin} className="space-y-4">
            {notice && (
              <div className="rounded-lg bg-canopy-50 border border-canopy-200 px-4 py-3 text-sm text-canopy-800">
                {notice}
              </div>
            )}
            <Input
              label="Email address"
              type="email"
              placeholder="you@org.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <div className="-mt-2 text-right">
              <Link href="/forgot-password" className="text-sm text-canopy-600 hover:underline">
                Forgot password?
              </Link>
            </div>
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
            <Button type="submit" className="w-full" loading={loading}>
              Sign in
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-4">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-canopy-600 font-medium hover:underline">
            Start free trial
          </Link>
        </p>
      </div>
    </div>
  )
}
