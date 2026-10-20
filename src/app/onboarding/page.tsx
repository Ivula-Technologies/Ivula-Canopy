'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { browserTimeZone } from '@/lib/timezone'

export default function OnboardingPage() {
  const router = useRouter()
  const [needsOrg, setNeedsOrg] = useState(false)
  const [checking, setChecking] = useState(true)
  const [orgName, setOrgName] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  // Users who signed up while org creation was failing land here with no
  // organization — give them a way to create one instead of looping back.
  // Everyone else goes straight to the dashboard, whose setup checklist
  // walks them through their first week.
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single()
      if (profile?.organization_id) { router.replace('/dashboard'); return }
      setNeedsOrg(true)
      setChecking(false)
    })
  }, [router])

  async function createOrg(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    setError('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const res = await fetch('/api/organizations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: orgName,
        adminId: user.id,
        adminEmail: user.email,
        adminName: (user.user_metadata?.full_name as string) || '',
        timezone: browserTimeZone(),
      }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Failed to create organization. Please try again.')
      setCreating(false)
      return
    }

    router.replace('/dashboard')
  }

  if (checking || !needsOrg) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-canopy-50 to-white">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-canopy-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-canopy-50 to-white px-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Image src="/canopy-mark.svg" alt="Canopy" width={51} height={40} className="h-10 w-auto object-contain" />
          <span className="font-display text-2xl font-bold text-canopy-900">Canopy</span>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">Set up your organization</h1>
          <p className="text-gray-500 text-sm mb-6 text-center">
            One last step — give your organization a name to get started.
          </p>
          <form onSubmit={createOrg} className="space-y-4">
            <Input
              label="Organization name"
              placeholder="e.g. Hope Community Church"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              required
            />
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
            <Button type="submit" className="w-full" loading={creating}>
              Create organization
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
