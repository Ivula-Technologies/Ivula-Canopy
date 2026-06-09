'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Leaf, Users, CalendarDays, BarChart3, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

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

  function next() {
    if (current < steps.length - 1) {
      setCurrent(current + 1)
    } else {
      router.push('/dashboard')
    }
  }

  const step = steps[current]
  const Icon = step.icon

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-white px-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600">
              <Leaf className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold">Ivula Canopy</span>
          </div>
        </div>

        {/* Welcome card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100">
              <Icon className="h-8 w-8 text-emerald-600" />
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
                  i <= current ? 'bg-emerald-600' : 'bg-gray-200'
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
