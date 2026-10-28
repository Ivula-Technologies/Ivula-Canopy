'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { MapPin, Clock, Users, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { dateBadgeIn, formatDayIn, formatTimeIn } from '@/lib/timezone'
import { MAX_SHIFTS_PER_SIGNUP } from '@/lib/volunteer-link'

export type ServeShift = {
  id: string
  title: string
  description?: string | null
  starts_at?: string | null
  ends_at?: string | null
  spots_left: number
}

export type ServeEvent = {
  id: string
  title: string
  description?: string | null
  location?: string | null
  starts_at: string
  shifts: ServeShift[]
}

interface Props {
  token: string
  orgName: string
  timeZone: string
  events: ServeEvent[]
}

export function ServeClient({ token, orgName, timeZone, events }: Props) {
  const fmtTime = (iso?: string | null) => (iso ? formatTimeIn(iso, timeZone) : '')
  const [selected, setSelected] = useState<string[]>([])
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ booked: string[]; problems: { shift_id: string; error: string }[] } | null>(null)
  const detailsRef = useRef<HTMLDivElement>(null)

  const lookup = new Map(events.flatMap((event) => event.shifts.map((shift) => [shift.id, { event, shift }] as const)))
  const describe = (id: string) => {
    const hit = lookup.get(id)
    if (!hit) return 'A shift'
    return `${hit.shift.title}, ${hit.event.title} · ${formatDayIn(hit.shift.starts_at || hit.event.starts_at, timeZone)}${hit.shift.starts_at ? `, ${fmtTime(hit.shift.starts_at)}` : ''}`
  }

  function toggle(id: string) {
    setError('')
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= MAX_SHIFTS_PER_SIGNUP) {
        setError(`You can pick up to ${MAX_SHIFTS_PER_SIGNUP} shifts at a time.`)
        return prev
      }
      return [...prev, id]
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (selected.length === 0) { setError('Please pick at least one shift.'); return }
    setSaving(true)
    setError('')
    const res = await fetch(`/api/public/serve/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, shift_ids: selected }),
    })
    const data = await res.json().catch(() => ({}))
    if (res.ok) {
      setResult({ booked: data.booked || [], problems: data.problems || [] })
      window.scrollTo({ top: 0 })
    } else {
      setError(data.error || 'Something went wrong. Please try again.')
    }
    setSaving(false)
  }

  const header = (
    <div className="flex items-center gap-3 mb-6">
      <Image src="/canopy-mark.svg" alt="Canopy" width={41} height={32} className="h-8 w-auto object-contain" />
      <span className="text-sm text-gray-500">{orgName}</span>
    </div>
  )

  if (result) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-10">
        <div className="max-w-lg mx-auto">
          {header}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
            <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-4 text-center">You&apos;re signed up!</h1>
            <ul className="space-y-2 text-sm text-gray-700">
              {result.booked.map((id) => (
                <li key={id} className="flex gap-2"><CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />{describe(id)}</li>
              ))}
            </ul>
            {result.problems.length > 0 && (
              <div className="mt-5 rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900">
                <p className="font-medium mb-1">These didn&apos;t go through:</p>
                <ul className="space-y-1">
                  {result.problems.map((p) => <li key={p.shift_id}>{describe(p.shift_id)}: {p.error}</li>)}
                </ul>
              </div>
            )}
            <p className="text-xs text-gray-400 mt-5 text-center">
              A confirmation email is on its way to <strong>{form.email}</strong>, and you&apos;ll get a reminder the day before each shift.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10 pb-28">
      <div className="max-w-lg mx-auto">
        {header}

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Volunteer with {orgName}</h1>
          <p className="text-sm text-gray-500">
            Pick one or more shifts, then add your name and email. You&apos;ll get a confirmation right away and a
            reminder the day before each shift. No account needed.
          </p>
        </div>

        {events.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-400">
            <p>No volunteer shifts are open right now.</p>
            <p className="text-xs mt-1">Check back soon or contact {orgName} for details.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {events.map((event) => {
              const badge = dateBadgeIn(event.starts_at, timeZone)
              return (
                <section key={event.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5" aria-labelledby={`ev-${event.id}`}>
                  <div className="flex items-start gap-4 mb-3">
                    <div className="flex flex-col items-center min-w-[44px] border-r border-gray-100 pr-4">
                      <span className="text-xs text-gray-400 uppercase font-medium">{badge.month}</span>
                      <span className="text-2xl font-bold text-gray-900 leading-none">{badge.day}</span>
                    </div>
                    <div className="min-w-0">
                      <h2 id={`ev-${event.id}`} className="font-semibold text-gray-900">{event.title}</h2>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-canopy-600" />{formatDayIn(event.starts_at, timeZone)}, {fmtTime(event.starts_at)}</span>
                        {event.location && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-canopy-600" />{event.location}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {event.shifts.map((shift) => {
                      const full = shift.spots_left <= 0
                      const checked = selected.includes(shift.id)
                      return (
                        <label
                          key={shift.id}
                          className={`flex items-start gap-3 p-3 rounded-xl border-2 transition-colors ${
                            full ? 'opacity-50 cursor-not-allowed border-gray-100 bg-gray-50' :
                            checked ? 'cursor-pointer border-canopy-600 bg-canopy-50' : 'cursor-pointer border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            value={shift.id}
                            disabled={full}
                            checked={checked}
                            onChange={() => toggle(shift.id)}
                            className="mt-0.5 accent-canopy-600"
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
                </section>
              )
            })}

            <div ref={detailsRef} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4 scroll-mt-6">
              <h2 className="text-sm font-semibold text-gray-700">Your details</h2>
              <div className="grid grid-cols-2 gap-4">
                <Input label="First name *" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} required />
                <Input label="Last name *" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} required />
              </div>
              <Input label="Email *" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              <Input label="Phone (optional)" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>

            {error && (
              <div className="flex gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />{error}
              </div>
            )}

            <Button type="submit" className="w-full" loading={saving} disabled={selected.length === 0}>
              {selected.length > 1 ? `Sign me up for ${selected.length} shifts` : 'Sign me up'}
            </Button>

            <p className="text-center text-xs text-gray-400">
              Your details will only be shared with {orgName}.
            </p>
          </form>
        )}
      </div>

      {selected.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-10 border-t border-gray-200 bg-white/95 backdrop-blur px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="max-w-lg mx-auto flex items-center justify-between gap-3">
            <p className="text-sm text-gray-700">
              <strong>{selected.length}</strong> shift{selected.length !== 1 ? 's' : ''} picked
            </p>
            <Button type="button" size="sm" onClick={() => detailsRef.current?.scrollIntoView({ behavior: 'smooth' })}>
              Add your details
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
