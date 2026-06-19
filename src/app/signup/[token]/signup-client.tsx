'use client'

import { useState } from 'react'
import Image from 'next/image'
import { MapPin, Clock, Users, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type ShiftWithSpots = {
  id: string
  title: string
  description?: string | null
  starts_at?: string | null
  ends_at?: string | null
  capacity: number
  signup_count: number
  spots_left: number
}

type EventInfo = {
  id: string
  title: string
  description?: string | null
  location?: string | null
  starts_at?: string | null
  ends_at?: string | null
}

interface Props {
  token: string
  event: EventInfo
  shifts: ShiftWithSpots[]
  orgName: string
}

function fmt(iso?: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
}

function fmtTime(iso?: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export function SignupClient({ token, event, shifts, orgName }: Props) {
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null)
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [confirmedShift, setConfirmedShift] = useState<ShiftWithSpots | null>(null)

  const noShifts = shifts.length === 0
  const allFull = shifts.length > 0 && shifts.every((s) => s.spots_left <= 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedShiftId) { setError('Please select a shift first.'); return }
    setSaving(true)
    setError('')

    const res = await fetch(`/api/public/signup/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, shift_id: selectedShiftId }),
    })

    const data = await res.json().catch(() => ({}))
    if (res.ok) {
      setConfirmedShift(shifts.find((s) => s.id === selectedShiftId) || null)
      setDone(true)
    } else {
      setError(data.error || 'Something went wrong. Please try again.')
    }
    setSaving(false)
  }

  if (done) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
            <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">You're signed up!</h1>
            <p className="text-gray-500 text-sm mb-1">
              <strong>{confirmedShift?.title}</strong>
              {confirmedShift?.starts_at && ` · ${fmtTime(confirmedShift.starts_at)}${confirmedShift.ends_at ? ` – ${fmtTime(confirmedShift.ends_at)}` : ''}`}
            </p>
            <p className="text-gray-500 text-sm mb-4">{event.title} · {orgName}</p>
            <p className="text-xs text-gray-400">A confirmation email has been sent to <strong>{form.email}</strong>.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="max-w-lg mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Image src="/ivula.png" alt="Ivula" width={32} height={32} className="h-8 w-8 object-contain" />
          <span className="text-sm text-gray-500">{orgName}</span>
        </div>

        {/* Event card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{event.title}</h1>
          {event.description && <p className="text-sm text-gray-500 mb-3">{event.description}</p>}
          <div className="flex flex-wrap gap-3 text-sm text-gray-500">
            {event.starts_at && (
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-[#00C4F4]" />
                {fmt(event.starts_at)}
              </span>
            )}
            {event.location && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-[#00C4F4]" />
                {event.location}
              </span>
            )}
          </div>
        </div>

        {noShifts ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-400">
            <p>No shifts have been set up for this event yet.</p>
            <p className="text-xs mt-1">Check back soon or contact {orgName} for details.</p>
          </div>
        ) : allFull ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-400">
            <p className="font-medium text-gray-600">All shifts are full</p>
            <p className="text-xs mt-1">Sorry, there are no more spots available. Contact {orgName} to be added to the waitlist.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Shift selection */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Select a shift</h2>
              <div className="space-y-2">
                {shifts.map((shift) => {
                  const full = shift.spots_left <= 0
                  const selected = selectedShiftId === shift.id
                  return (
                    <label
                      key={shift.id}
                      className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${
                        full ? 'opacity-50 cursor-not-allowed border-gray-100 bg-gray-50' :
                        selected ? 'border-[#00C4F4] bg-cyan-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="shift"
                        value={shift.id}
                        disabled={full}
                        checked={selected}
                        onChange={() => setSelectedShiftId(shift.id)}
                        className="mt-0.5 accent-[#00C4F4]"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{shift.title}</p>
                        {shift.description && <p className="text-xs text-gray-500 mt-0.5">{shift.description}</p>}
                        {(shift.starts_at || shift.ends_at) && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            {fmtTime(shift.starts_at)}{shift.ends_at ? ` – ${fmtTime(shift.ends_at)}` : ''}
                          </p>
                        )}
                      </div>
                      <span className={`flex items-center gap-1 text-xs flex-shrink-0 font-medium ${full ? 'text-red-500' : 'text-emerald-600'}`}>
                        <Users className="h-3.5 w-3.5" />
                        {full ? 'Full' : `${shift.spots_left} spot${shift.spots_left !== 1 ? 's' : ''} left`}
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>

            {/* Personal details */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
              <h2 className="text-sm font-semibold text-gray-700">Your details</h2>
              <div className="grid grid-cols-2 gap-4">
                <Input label="First name *" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} required />
                <Input label="Last name *" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} required />
              </div>
              <Input label="Email *" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              <Input label="Phone (optional)" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
            )}

            <Button type="submit" className="w-full" loading={saving} disabled={!selectedShiftId}>
              Sign me up
            </Button>

            <p className="text-center text-xs text-gray-400">
              Your details will only be shared with {orgName}.
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
