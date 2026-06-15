'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { slugify } from '@/lib/utils'

export default function SignupPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [confirmEmail, setConfirmEmail] = useState(false)

  const [orgName, setOrgName] = useState('')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (step === 1) { setStep(2); return }

    setLoading(true)
    setError('')

    const supabase = createClient()

    // 1. Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role: 'org_admin' },
        emailRedirectTo: `${window.location.origin}/callback?next=/onboarding`,
      },
    })

    if (authError || !authData.user) {
      setError(authError?.message || 'Failed to create account')
      setLoading(false)
      return
    }

    // 2. Create organization via API
    const res = await fetch('/api/organizations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: orgName,
        slug: slugify(orgName),
        adminId: authData.user.id,
        adminEmail: email,
        adminName: fullName,
      }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Failed to create organization. Please try again.')
      setLoading(false)
      return
    }

    // If email confirmation is required (no session returned), show confirmation screen
    if (!authData.session) {
      setConfirmEmail(true)
      setLoading(false)
      return
    }

    router.push('/onboarding')
  }

  if (confirmEmail) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Image src="/ivula.png" alt="Ivula" width={40} height={40} className="h-10 w-10 object-contain" />
            <span className="text-2xl font-bold text-[#1B2559]">Ivula</span>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
            <div className="text-4xl mb-4">📧</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Check your email</h1>
            <p className="text-gray-500 text-sm mb-6">
              We sent a confirmation link to <strong>{email}</strong>.
              Click the link to activate your account and get started.
            </p>
            <p className="text-xs text-gray-400">
              Didn&apos;t receive it? Check your spam folder or{' '}
              <button
                onClick={() => { setConfirmEmail(false); setStep(2) }}
                className="text-[#00C4F4] hover:underline"
              >
                try again
              </button>.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Image src="/ivula.png" alt="Ivula" width={40} height={40} className="h-10 w-10 object-contain" />
            <span className="text-2xl font-bold text-[#1B2559]">Ivula</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {step === 1 ? 'Start your free trial' : 'Create your account'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {step === 1 ? '14 days free, no credit card required' : 'Almost done!'}
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6">
          {[1, 2].map((s) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                s <= step ? 'bg-[#00C4F4]' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {step === 1 && (
              <>
                <Input
                  label="Organization name"
                  placeholder="e.g. Hope Community Church"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  required
                />
                <Input
                  label="Your full name"
                  placeholder="e.g. Sarah Johnson"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
                <Button type="submit" className="w-full">
                  Continue →
                </Button>
              </>
            )}

            {step === 2 && (
              <>
                <Input
                  label="Work email"
                  type="email"
                  placeholder="you@yourorg.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <Input
                  label="Password"
                  type="password"
                  placeholder="At least 8 characters"
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                {error && (
                  <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button type="submit" className="flex-1" loading={loading}>
                    Create account
                  </Button>
                </div>
              </>
            )}
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-4">
          Already have an account?{' '}
          <Link href="/login" className="text-[#00C4F4] font-medium hover:underline">
            Sign in
          </Link>
        </p>

        <p className="text-center text-xs text-gray-400 mt-4">
          By signing up, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  )
}
