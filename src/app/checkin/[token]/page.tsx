'use client'

import { useState, useEffect, use } from 'react'
import { CheckCircle, XCircle, Search } from 'lucide-react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatDateTime } from '@/lib/utils'

interface EventData {
  id: string
  title: string
  starts_at: string
  location?: string
  organization: { name: string }
}

interface Member {
  id: string
  first_name: string
  last_name: string
  email?: string
}

export default function CheckinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const [event, setEvent] = useState<EventData | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [checkedIn, setCheckedIn] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/checkin/${token}`)
      if (res.ok) {
        const data = await res.json()
        setEvent(data.event)
        setMembers(data.members)
      } else {
        setError('Event not found or check-in is not enabled.')
      }
      setLoading(false)
    }
    load()
  }, [token])

  const filtered = members.filter((m) =>
    `${m.first_name} ${m.last_name} ${m.email}`.toLowerCase().includes(search.toLowerCase())
  )

  async function handleCheckin(memberId: string) {
    const res = await fetch('/api/checkin/record', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, member_id: memberId }),
    })
    if (res.ok) {
      setCheckedIn(memberId)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-4 border-[#00C4F4] border-t-transparent animate-spin" />
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Check-in Unavailable</h1>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    )
  }

  if (checkedIn) {
    const member = members.find((m) => m.id === checkedIn)
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-cyan-50">
        <div className="text-center">
          <CheckCircle className="h-16 w-16 text-[#00C4F4] mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Checked in!</h1>
          <p className="text-lg text-gray-700 mb-1">
            {member?.first_name} {member?.last_name}
          </p>
          <p className="text-gray-500">{event.title}</p>
          <Button className="mt-6" variant="outline" onClick={() => setCheckedIn(null)}>
            Check in another person
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-md mx-auto">
          <div className="flex items-center gap-2 mb-3">
            <Image src="/logo.svg" alt="Ivula Technologies" width={60} height={20} className="h-5 w-auto" />
            <span className="text-sm text-gray-500">{event.organization?.name}</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">{event.title}</h1>
          <p className="text-sm text-gray-500">{formatDateTime(event.starts_at)}</p>
          {event.location && <p className="text-sm text-gray-500">{event.location}</p>}
        </div>
      </div>

      {/* Search + list */}
      <div className="max-w-md mx-auto px-4 py-6">
        <p className="text-sm text-gray-600 mb-4 font-medium">
          Find your name to check in:
        </p>
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            className="w-full pl-9 pr-4 py-3 text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#00C4F4] bg-white"
            placeholder="Search your name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>

        <div className="space-y-2">
          {filtered.slice(0, 20).map((member) => (
            <button
              key={member.id}
              onClick={() => handleCheckin(member.id)}
              className="w-full flex items-center gap-3 bg-white rounded-xl border border-gray-200 px-4 py-3 text-left hover:border-[#00C4F4] hover:shadow-sm transition-all"
            >
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-cyan-100 text-sm font-bold text-[#1B2559]">
                {member.first_name[0]}{member.last_name[0]}
              </div>
              <div>
                <p className="font-medium text-gray-900">{member.first_name} {member.last_name}</p>
                {member.email && <p className="text-xs text-gray-500">{member.email}</p>}
              </div>
            </button>
          ))}
          {search && filtered.length === 0 && (
            <p className="text-center text-gray-400 py-8 text-sm">
              No members found. Contact your organization admin.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
