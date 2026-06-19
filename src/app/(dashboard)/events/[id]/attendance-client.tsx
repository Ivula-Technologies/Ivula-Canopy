'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Check, Search, Users, Clock, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getInitials, formatDateTime } from '@/lib/utils'
import type { Event, Attendance, Member } from '@/types'

interface Props {
  event: Event & { team?: { name: string } }
  members: Pick<Member, 'id' | 'first_name' | 'last_name' | 'email' | 'status'>[]
  initialAttendance: (Attendance & { member?: { first_name: string; last_name: string; email?: string } })[]
  orgId: string
  canEdit: boolean
}

export function AttendanceClient({ event, members, initialAttendance, orgId, canEdit }: Props) {
  const [attendance, setAttendance] = useState(initialAttendance)
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState<string | null>(null)
  // Track hours inputs per member (keyed by member id)
  const [hoursInput, setHoursInput] = useState<Record<string, string>>({})

  const attendedIds = new Set(attendance.map((a) => a.member_id))
  const totalHours = attendance.reduce((sum, a) => sum + (a.hours || 0), 0)

  const filtered = members.filter((m) =>
    `${m.first_name} ${m.last_name} ${m.email}`.toLowerCase().includes(search.toLowerCase())
  )

  async function toggle(memberId: string, isCheckedIn: boolean) {
    if (!canEdit) return
    setSaving(memberId)

    if (isCheckedIn) {
      await fetch(`/api/attendance?event_id=${event.id}&member_id=${memberId}`, { method: 'DELETE' })
      setAttendance((prev) => prev.filter((a) => a.member_id !== memberId))
    } else {
      const hours = parseFloat(hoursInput[memberId] || '') || null
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: event.id,
          member_id: memberId,
          organization_id: orgId,
          method: 'admin',
          hours,
        }),
      })
      if (res.ok) {
        const { record } = await res.json()
        setAttendance((prev) => [...prev, record])
      }
    }
    setSaving(null)
  }

  async function updateHours(memberId: string, hours: number | null) {
    const res = await fetch('/api/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_id: event.id,
        member_id: memberId,
        organization_id: orgId,
        method: 'admin',
        hours,
      }),
    })
    if (res.ok) {
      const { record } = await res.json()
      setAttendance((prev) => prev.map((a) => (a.member_id === memberId ? record : a)))
    }
  }

  async function markAll() {
    const unattended = members.filter((m) => !attendedIds.has(m.id))
    for (const m of unattended) {
      await toggle(m.id, false)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/events" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to Events
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{event.title}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-gray-500">
              <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{formatDateTime(event.starts_at)}</span>
              {event.location && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{event.location}</span>}
              {event.team && <Badge variant="secondary">{event.team.name}</Badge>}
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-[#00C4F4]">{attendance.length}</p>
              <p className="text-xs text-gray-500">of {members.length} attended</p>
            </div>
            {totalHours > 0 && (
              <div className="text-center">
                <p className="text-2xl font-bold text-emerald-600">{totalHours.toFixed(1)}</p>
                <p className="text-xs text-gray-500">volunteer hours</p>
              </div>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#00C4F4] rounded-full transition-all"
            style={{ width: members.length ? `${(attendance.length / members.length) * 100}%` : '0%' }}
          />
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#00C4F4]"
            placeholder="Search members..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {canEdit && (
          <Button variant="outline" size="sm" onClick={markAll}>
            <Users className="h-4 w-4" /> Mark all present
          </Button>
        )}
      </div>

      {/* Member list */}
      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        {filtered.map((member) => {
          const checked = attendedIds.has(member.id)
          const isSaving = saving === member.id
          const record = attendance.find((a) => a.member_id === member.id)

          return (
            <div key={member.id} className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-cyan-100 text-sm font-bold text-[#1B2559]">
                {getInitials(`${member.first_name} ${member.last_name}`)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{member.first_name} {member.last_name}</p>
                {member.email && <p className="text-xs text-gray-500">{member.email}</p>}
              </div>

              {/* Hours input — shown when present */}
              {canEdit && checked && (
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="0"
                    max="24"
                    step="0.5"
                    placeholder="hrs"
                    className="w-16 rounded-md border border-gray-300 px-2 py-1 text-xs text-center focus:outline-none focus:ring-2 focus:ring-[#00C4F4]"
                    defaultValue={record?.hours ?? ''}
                    onBlur={(e) => {
                      const val = e.target.value ? parseFloat(e.target.value) : null
                      if (val !== (record?.hours ?? null)) updateHours(member.id, val)
                    }}
                  />
                  <span className="text-xs text-gray-400">hrs</span>
                </div>
              )}
              {!canEdit && checked && record?.hours && (
                <span className="text-xs text-emerald-600 font-medium">{record.hours}h</span>
              )}

              {checked && (
                <span className="text-xs text-[#00C4F4] font-medium">Present</span>
              )}
              {canEdit && (
                <button
                  onClick={() => toggle(member.id, checked)}
                  disabled={isSaving}
                  className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                    checked
                      ? 'bg-[#00C4F4] border-[#00C4F4] text-white hover:bg-[#00A8D8]'
                      : 'border-gray-300 text-gray-300 hover:border-[#00C4F4] hover:text-[#00C4F4]'
                  }`}
                >
                  {isSaving ? (
                    <div className="h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
