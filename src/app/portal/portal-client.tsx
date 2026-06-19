'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Clock, CheckCircle, CalendarDays, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Signup = {
  id: string
  shift_id: string
  status: string
  signed_up_at: string
  shifts: { title: string; starts_at?: string | null; ends_at?: string | null; events: { title: string; location?: string | null } | null } | null
}

type AttendanceRecord = {
  id: string
  event_id: string
  hours?: number | null
  checked_in_at: string
  events: { title: string } | null
}

type PortalData = {
  member: { first_name: string; last_name: string; email: string } | null
  signups: Signup[]
  attendance: AttendanceRecord[]
  totalHours: number
}

function fmtDate(iso?: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}
function fmtTime(iso?: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export function PortalClient() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<PortalData | null>(null)
  const [error, setError] = useState('')
  const [hoursInput, setHoursInput] = useState<Record<string, string>>({})
  const [savingHours, setSavingHours] = useState<string | null>(null)
  const [savedHours, setSavedHours] = useState<Record<string, number>>({})

  async function lookup() {
    if (!email.trim()) return
    setLoading(true); setError('')
    const res = await fetch('/api/public/portal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    })
    const json = await res.json().catch(() => ({}))
    if (res.ok) setData(json)
    else setError(json.error || 'No record found for that email.')
    setLoading(false)
  }

  async function logHours(signupId: string, shiftId: string) {
    const hours = parseFloat(hoursInput[signupId] || '')
    if (!hours || hours <= 0) return
    setSavingHours(signupId)
    const res = await fetch('/api/public/portal/hours', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signup_id: signupId, shift_id: shiftId, email: email.trim().toLowerCase(), hours }),
    })
    if (res.ok) setSavedHours((prev) => ({ ...prev, [signupId]: hours }))
    setSavingHours(null)
  }

  const upcoming = data?.signups.filter((s) => s.status === 'confirmed' && s.shifts?.starts_at && new Date(s.shifts.starts_at) > new Date()) || []
  const past = data?.signups.filter((s) => s.status === 'confirmed' && s.shifts?.starts_at && new Date(s.shifts.starts_at) <= new Date()) || []

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Image src="/ivula.png" alt="Ivula" width={32} height={32} className="h-8 w-8 object-contain" />
          <div>
            <h1 className="text-lg font-bold text-gray-900">Volunteer Portal</h1>
            <p className="text-xs text-gray-500">View your shifts and track your hours</p>
          </div>
        </div>

        {!data ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Enter your email to get started</h2>
            <div className="flex gap-3">
              <div className="flex-1">
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && lookup()}
                />
              </div>
              <Button onClick={lookup} loading={loading} disabled={!email.trim()}>
                <Search className="h-4 w-4" /> Look up
              </Button>
            </div>
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          </div>
        ) : (
          <div className="space-y-5">
            {/* Profile card */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900">{data.member ? `${data.member.first_name} ${data.member.last_name}` : email}</p>
                  <p className="text-xs text-gray-500">{email}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-emerald-600">{(data.totalHours + Object.values(savedHours).reduce((a, b) => a + b, 0)).toFixed(1)}</p>
                  <p className="text-xs text-gray-500">total hours</p>
                </div>
              </div>
            </div>

            {/* Upcoming shifts */}
            {upcoming.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-700 mb-2">Upcoming shifts</h2>
                <div className="space-y-2">
                  {upcoming.map((s) => (
                    <div key={s.id} className="bg-white rounded-xl border border-gray-200 p-4">
                      <p className="text-sm font-medium text-gray-900">{s.shifts?.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{s.shifts?.events?.title}</p>
                      <p className="text-xs text-[#00C4F4] mt-1 flex items-center gap-1">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {fmtDate(s.shifts?.starts_at)}{s.shifts?.starts_at ? ` · ${fmtTime(s.shifts.starts_at)}` : ''}
                        {s.shifts?.ends_at ? ` – ${fmtTime(s.shifts.ends_at)}` : ''}
                      </p>
                      {s.shifts?.events?.location && <p className="text-xs text-gray-400 mt-0.5">{s.shifts.events.location}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Past shifts — log hours */}
            {past.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-700 mb-2">Past shifts</h2>
                <div className="space-y-2">
                  {past.map((s) => {
                    const existingHours = data.attendance.find((a) => a.events?.title === s.shifts?.events?.title)?.hours
                    const logged = savedHours[s.id] || existingHours
                    return (
                      <div key={s.id} className="bg-white rounded-xl border border-gray-200 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">{s.shifts?.title}</p>
                            <p className="text-xs text-gray-500">{s.shifts?.events?.title} · {fmtDate(s.shifts?.starts_at)}</p>
                          </div>
                          {logged ? (
                            <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                              <CheckCircle className="h-3.5 w-3.5" /> {logged}h logged
                            </span>
                          ) : (
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <input
                                type="number" min="0" max="24" step="0.5" placeholder="hrs"
                                className="w-16 rounded-md border border-gray-300 px-2 py-1 text-xs text-center focus:outline-none focus:ring-2 focus:ring-[#00C4F4]"
                                value={hoursInput[s.id] || ''}
                                onChange={(e) => setHoursInput((prev) => ({ ...prev, [s.id]: e.target.value }))}
                              />
                              <Button size="sm" variant="outline" onClick={() => logHours(s.id, s.shift_id)} loading={savingHours === s.id} disabled={!hoursInput[s.id]}>
                                <Clock className="h-3.5 w-3.5" /> Log
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {upcoming.length === 0 && past.length === 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-400">
                <p className="text-sm">No shift sign-ups found for this email.</p>
              </div>
            )}

            <button onClick={() => { setData(null); setEmail('') }} className="text-xs text-gray-400 hover:text-gray-600 w-full text-center mt-2">
              Look up a different email →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
