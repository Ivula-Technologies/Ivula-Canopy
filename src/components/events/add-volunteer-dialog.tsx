'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { Member } from '@/types'

export type AddedSignup = { id: string; first_name: string; last_name: string; email: string; phone?: string; status: string; signed_up_at: string }

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  shift: { id: string; title: string }
  members: Pick<Member, 'id' | 'first_name' | 'last_name' | 'email'>[]
  /** Emails already on this shift, so they can't be picked twice. */
  takenEmails: Set<string>
  onAdded: (signup: AddedSignup) => void
}

const emptyPerson = { first_name: '', last_name: '', email: '', phone: '' }

// Puts someone on a shift for them: a member who said yes after the service,
// or someone who isn't in Canopy yet.
export function AddVolunteerDialog({ open, onOpenChange, shift, members, takenEmails, onAdded }: Props) {
  const [mode, setMode] = useState<'member' | 'new'>('member')
  const [search, setSearch] = useState('')
  const [memberId, setMemberId] = useState('')
  const [person, setPerson] = useState(emptyPerson)
  const [notify, setNotify] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const matches = members
    .filter((m) => `${m.first_name} ${m.last_name} ${m.email || ''}`.toLowerCase().includes(search.trim().toLowerCase()))
    .slice(0, 8)

  function close(next: boolean) {
    onOpenChange(next)
    if (!next) { setSearch(''); setMemberId(''); setPerson(emptyPerson); setError(''); setMode('member') }
  }

  async function submit() {
    setSaving(true)
    setError('')
    const res = await fetch(`/api/shifts/${shift.id}/signups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mode === 'member' ? { member_id: memberId, notify } : { ...person, notify }),
    })
    const data = await res.json().catch(() => ({}))
    setSaving(false)
    if (!res.ok) { setError(data.error || 'Could not add this volunteer.'); return }
    onAdded(data.signup)
    close(false)
  }

  const ready = mode === 'member' ? !!memberId : !!(person.first_name && person.last_name && person.email)

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add a volunteer to {shift.title}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-gray-100 p-1 text-sm font-medium">
            {(['member', 'new'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setError('') }}
                className={`rounded-md py-1.5 ${mode === m ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
              >
                {m === 'member' ? 'One of your members' : 'Someone else'}
              </button>
            ))}
          </div>

          {mode === 'member' ? (
            <div className="space-y-2">
              <Input placeholder="Search by name or email" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search members" />
              <div className="max-h-64 divide-y divide-gray-100 overflow-y-auto rounded-lg border border-gray-200" role="radiogroup" aria-label="Members">
                {matches.length === 0 && <p className="px-3 py-3 text-sm text-gray-400">No members match.</p>}
                {matches.map((m) => {
                  const taken = !!m.email && takenEmails.has(m.email.toLowerCase())
                  const disabled = !m.email || taken
                  return (
                    <label key={m.id} className={`flex items-center gap-3 px-3 py-2 text-sm ${disabled ? 'opacity-50' : 'cursor-pointer hover:bg-gray-50'}`}>
                      <input
                        type="radio"
                        name="member"
                        value={m.id}
                        checked={memberId === m.id}
                        disabled={disabled}
                        onChange={() => setMemberId(m.id)}
                        className="accent-canopy-600"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium text-gray-900">{m.first_name} {m.last_name}</span>
                        <span className="block truncate text-xs text-gray-500">
                          {taken ? 'Already on this shift' : m.email || 'No email on file'}
                        </span>
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Input label="First name *" value={person.first_name} onChange={(e) => setPerson({ ...person, first_name: e.target.value })} />
                <Input label="Last name *" value={person.last_name} onChange={(e) => setPerson({ ...person, last_name: e.target.value })} />
              </div>
              <Input label="Email *" type="email" value={person.email} onChange={(e) => setPerson({ ...person, email: e.target.value })} />
              <Input label="Phone" type="tel" value={person.phone} onChange={(e) => setPerson({ ...person, phone: e.target.value })} />
            </div>
          )}

          <label className="flex items-start gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="mt-0.5 accent-canopy-600" />
            <span>Email them a confirmation (with a reminder the day before and a link to cancel)</span>
          </label>

          {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => close(false)}>Cancel</Button>
            <Button className="flex-1" loading={saving} disabled={!ready} onClick={submit}>Add to shift</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
