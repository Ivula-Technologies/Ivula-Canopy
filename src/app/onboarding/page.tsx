'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Users, CalendarDays, BarChart3 } from 'lucide-react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const steps = [
  {
    icon: Users,
    title: 'Add your first member',
    description: 'Start by adding a few members to your organization. You can also import from CSV later.',
    action: '/members',
    label: 'Go to Members',
  },
  {
    icon: Users,
    title: 'Create a team or department',
    description: 'Organize your members into teams, committees, or departments.',
    action: '/teams',
    label: 'Go to Teams',
  },
  {
    icon: CalendarDays,
    title: 'Schedule your first event',
    description: 'Create an event and start tracking attendance. Share the QR code for easy check-in.',
    action: '/events',
    label: 'Go to Events',
  },
  {
    icon: BarChart3,
    title: 'View your dashboard',
    description: 'See your organization\'s engagement, participation trends, and key metrics.',
    action: '/dashboard',
    label: 'View Dashboard',
  },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [current, setCurrent] = useState(0)
  const [needsOrg, setNeedsOrg] = useState(false)
  const [checking, setChecking] = useState(true)
  const [orgName, setOrgName] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  // Users who signed up while org creation was failing land here with no
  // organization — give them a way to create one instead of looping back
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single()
      setNeedsOrg(!profile?.organization_id)
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
      }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Failed to create organization. Please try again.')
      setCreating(false)
      return
    }

    setNeedsOrg(false)
    setCreating(false)
  }

  function next() {
    if (current < steps.length - 1) {
      setCurrent(current + 1)
    } else {
      router.push('/dashboard')
    }
  }

  const step = steps[current]
  const Icon = step.icon

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cyan-50 to-white">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#00C4F4] border-t-transparent" />
      </div>
    )
  }

  if (needsOrg) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cyan-50 to-white px-4">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-8">
            <Image src="/logo.svg" alt="Ivula Technologies" width={120} height={40} className="h-10 w-auto" />
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cyan-50 to-white px-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Image src="/logo.svg" alt="Ivula Technologies" width={120} height={40} className="h-10 w-auto" />
        </div>

        {/* Welcome card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-50">
              <Icon className="h-8 w-8 text-[#00C4F4]" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {current === 0 ? "Your organization is live! 🎉" : step.title}
          </h1>
          <p className="text-gray-500 mb-8">{step.description}</p>

          {/* Step dots */}
          <div className="flex justify-center gap-2 mb-8">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-2 w-2 rounded-full transition-colors ${
                  i <= current ? 'bg-[#00C4F4]' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => router.push(step.action)}
              className="flex-1"
            >
              {step.label}
            </Button>
            <Button onClick={next} className="flex-1">
              {current === steps.length - 1 ? 'Go to Dashboard' : 'Next →'}
            </Button>
          </div>
        </div>

        <p className="text-center text-sm text-gray-400 mt-4">
          You can revisit any section anytime from the sidebar.
        </p>
      </div>
    </div>
  )
}
