'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Check, Search, Users, Clock, MapPin, Plus, Trash2, Copy, ExternalLink, Download, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { getInitials } from '@/lib/utils'
import { formatDateTimeIn, formatTimeIn, fromZonedInput, toZonedInput } from '@/lib/timezone'
import type { Event, Attendance, Member, Shift } from '@/types'

interface Props {
  event: Event & { team?: { name: string } }
  members: Pick<Member, 'id' | 'first_name' | 'last_name' | 'email' | 'status'>[]
  initialAttendance: (Attendance & { member?: { first_name: string; last_name: string; email?: string } })[]
  orgId: string
  canEdit: boolean
  appUrl: string
  timeZone: string
  initialTab: 'attendance' | 'shifts'
}

type ShiftWithSignups = Shift & {
  signup_count: number
  signups: { id: string; first_name: string; last_name: string; email: string; phone?: string; status: string; signed_up_at: string }[]
}

const emptyShiftForm = { title: '', description: '', starts_at: '', ends_at: '', capacity: '10' }

// Quote every CSV cell so names with commas or quotes stay in their column.
function csvRow(cells: (string | number | null | undefined)[]) {
  return cells.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')
}

export function AttendanceClient({ event, members, initialAttendance, orgId, canEdit, appUrl, timeZone, initialTab }: Props) {
  const [tab, setTab] = useState<'attendance' | 'shifts'>(initialTab)
  const [attendance, setAttendance] = useState(initialAttendance)
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState<string | null>(null)

  // Shifts state
  const [shifts, setShifts] = useState<ShiftWithSignups[]>([])
  const [shiftsLoaded, setShiftsLoaded] = useState(false)
  const [shiftOpen, setShiftOpen] = useState(false)
  const [shiftSaving, setShiftSaving] = useState(false)
  const [shiftForm, setShiftForm] = useState(emptyShiftForm)
  const [shiftError, setShiftError] = useState('')
  const [copiedLink, setCopiedLink] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importMsg, setImportMsg] = useState('')

  const signupUrl = `${appUrl}/signup/${event.checkin_token}`

  const attendedIds = new Set(attendance.map((a) => a.member_id))
  const totalHours = attendance.reduce((sum, a) => sum + (a.hours || 0), 0)
  const filtered = members.filter((m) =>
    `${m.first_name} ${m.last_name} ${m.email}`.toLowerCase().includes(search.toLowerCase())
  )

  async function loadShifts() {
    if (shiftsLoaded) return
    const res = await fetch(`/api/events/${event.id}/shifts`)
    if (res.ok) { const { shifts: s } = await res.json(); setShifts(s) }
    setShiftsLoaded(true)
  }

  async function switchToShifts() {
    setTab('shifts')
    await loadShifts()
  }

  useEffect(() => {
    if (initialTab === 'shifts') loadShifts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // New shifts start with the event's own times, which most shifts share.
  function openNewShift() {
    setShiftForm({
      ...emptyShiftForm,
      starts_at: toZonedInput(event.starts_at, timeZone),
      ends_at: toZonedInput(event.ends_at, timeZone),
    })
    setShiftError('')
    setShiftOpen(true)
  }

  async function createShift() {
    setShiftSaving(true)
    setShiftError('')
    const res = await fetch(`/api/events/${event.id}/shifts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...shiftForm,
        capacity: parseInt(shiftForm.capacity) || 10,
        organization_id: orgId,
        starts_at: fromZonedInput(shiftForm.starts_at, timeZone),
        ends_at: fromZonedInput(shiftForm.ends_at, timeZone),
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (res.ok) {
      setShifts((prev) => [...prev, data.shift])
      setShiftOpen(false)
      setShiftForm(emptyShiftForm)
    } else {
      setShiftError(data.error || 'Could not create shift.')
    }
    setShiftSaving(false)
  }

  async function deleteShift(id: string) {
    const res = await fetch(`/api/shifts/${id}`, { method: 'DELETE' })
    if (res.ok) setShifts((prev) => prev.filter((s) => s.id !== id))
  }

  async function toggle(memberId: string, isCheckedIn: boolean) {
    if (!canEdit) return
    setSaving(memberId)
    if (isCheckedIn) {
      await fetch(`/api/attendance?event_id=${event.id}&member_id=${memberId}`, { method: 'DELETE' })
      setAttendance((prev) => prev.filter((a) => a.member_id !== memberId))
    } else {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: event.id, member_id: memberId, organization_id: orgId, method: 'admin' }),
      })
      if (res.ok) { const { record } = await res.json(); setAttendance((prev) => [...prev, record]) }
    }
    setSaving(null)
  }

  async function updateHours(memberId: string, hours: number | null) {
    const res = await fetch('/api/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_id: event.id, member_id: memberId, organization_id: orgId, method: 'admin', hours }),
    })
    if (res.ok) {
      const { record } = await res.json()
      setAttendance((prev) => prev.map((a) => a.member_id === memberId ? record : a))
    }
  }

  async function markAll() {
    const unattended = members.filter((m) => !attendedIds.has(m.id))
    for (const m of unattended) await toggle(m.id, false)
  }

  async function importSignups() {
    setImporting(true)
    setImportMsg('')
    const res = await fetch(`/api/events/${event.id}/import-signups`, { method: 'POST' })
    const data = await res.json().catch(() => ({}))
    if (res.ok) setImportMsg(`${data.imported} attendance record${data.imported !== 1 ? 's' : ''} imported`)
    else setImportMsg(data.error || 'Import failed')
    setImporting(false)
  }

  function copyLink() {
    navigator.clipboard.writeText(signupUrl)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  function exportSignups() {
    const rows = [
      csvRow(['Shift', 'First Name', 'Last Name', 'Email', 'Phone', 'Signed Up At']),
      ...shifts.flatMap((s) =>
        s.signups.filter((r) => r.status === 'confirmed').map((r) =>
          csvRow([s.title, r.first_name, r.last_name, r.email, r.phone, formatDateTimeIn(r.signed_up_at, timeZone)])
        )
      ),
    ].join('\n')
    const url = URL.createObjectURL(new Blob([rows], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `${event.title}-signups.csv`
    a.click()
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
              <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{formatDateTimeIn(event.starts_at, timeZone)}</span>
              {event.location && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{event.location}</span>}
              {event.team && <Badge variant="secondary">{event.team.name}</Badge>}
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-canopy-600">{attendance.length}</p>
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
        <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-canopy-600 rounded-full transition-all"
            style={{ width: members.length ? `${(attendance.length / members.length) * 100}%` : '0%' }} />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={switchToShifts}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'shifts' ? 'bg-canopy-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
        >
          Volunteer Sign-ups
        </button>
        <button
          onClick={() => setTab('attendance')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'attendance' ? 'bg-canopy-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
        >
          Attendance
        </button>
      </div>

      {/* ── ATTENDANCE TAB ── */}
      {tab === 'attendance' && (
        <>
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-canopy-600"
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
          {members.length === 0 && (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-10 text-center">
              <UserPlus className="mx-auto mb-3 h-8 w-8 text-canopy-600" />
              <p className="font-medium text-gray-900">No people to mark yet</p>
              <p className="mt-1 text-sm text-gray-500">Add your people (or import a spreadsheet) and they&apos;ll show up here to check in.</p>
              <Link href="/members" className="mt-4 inline-block">
                <Button size="sm" variant="outline">Go to Members</Button>
              </Link>
            </div>
          )}
          <div className={`bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 ${members.length === 0 ? 'hidden' : ''}`}>
            {filtered.map((member) => {
              const checked = attendedIds.has(member.id)
              const isSaving = saving === member.id
              const record = attendance.find((a) => a.member_id === member.id)
              return (
                <div key={member.id} className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-canopy-100 text-sm font-bold text-canopy-900">
                    {getInitials(`${member.first_name} ${member.last_name}`)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{member.first_name} {member.last_name}</p>
                    {member.email && <p className="text-xs text-gray-500">{member.email}</p>}
                  </div>
                  {canEdit && checked && (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number" min="0" max="24" step="0.5" placeholder="hrs"
                        className="w-16 rounded-md border border-gray-300 px-2 py-1 text-xs text-center focus:outline-none focus:ring-2 focus:ring-canopy-600"
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
                  {checked && <span className="text-xs text-canopy-600 font-medium">Present</span>}
                  {canEdit && (
                    <button
                      onClick={() => toggle(member.id, checked)}
                      disabled={isSaving}
                      className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                        checked ? 'bg-canopy-600 border-canopy-600 text-white hover:bg-canopy-700' : 'border-gray-300 text-gray-300 hover:border-canopy-600 hover:text-canopy-600'
                      }`}
                    >
                      {isSaving ? <div className="h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin" /> : <Check className="h-4 w-4" />}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* ── SHIFTS / SIGN-UPS TAB ── */}
      {tab === 'shifts' && (
        <div className="space-y-4">
          {/* Signup link card */}
          <div className="bg-canopy-50 border border-canopy-200 rounded-xl p-4">
            <p className="text-sm font-medium text-canopy-800 mb-1">Public volunteer sign-up link</p>
            <p className="text-xs text-canopy-700 mb-2">
              Send this link by email, text or your church app. Volunteers pick a shift without an account, get a
              confirmation and a reminder the day before, and can cancel from their email.
            </p>
            <p className="text-xs text-canopy-600 break-all mb-3">{signupUrl}</p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={copyLink}>
                <Copy className="h-4 w-4" /> {copiedLink ? 'Copied!' : 'Copy link'}
              </Button>
              <Button size="sm" variant="outline" onClick={() => window.open(signupUrl, '_blank')}>
                <ExternalLink className="h-4 w-4" /> Preview
              </Button>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap gap-2 justify-between items-center">
            <h2 className="text-sm font-semibold text-gray-700">
              Shifts ({shifts.length}) · {shifts.reduce((s, sh) => s + sh.signup_count, 0)} volunteer{shifts.reduce((s, sh) => s + sh.signup_count, 0) !== 1 ? 's' : ''} signed up
            </h2>
            <div className="flex flex-wrap gap-2">
              {shifts.some((s) => s.signups.length > 0) && (
                <Button size="sm" variant="outline" onClick={exportSignups}>Export CSV</Button>
              )}
              {canEdit && (
                <Button size="sm" variant="outline" onClick={importSignups} loading={importing}>
                  <Download className="h-4 w-4" /> Import as attendance
                </Button>
              )}
              {canEdit && (
                <Button size="sm" onClick={openNewShift}>
                  <Plus className="h-4 w-4" /> Add Shift
                </Button>
              )}
            </div>
          </div>

          {importMsg && <p className="text-xs text-gray-500">{importMsg}</p>}

          {shifts.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-gray-300 px-6 py-10 text-center">
              <p className="font-medium text-gray-900">No shifts yet</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500">
                Add one shift per role, like greeters, nursery or parking, with how many people you need. Then share
                the link above.
              </p>
              {canEdit && (
                <Button size="sm" className="mt-4" onClick={openNewShift}>
                  <Plus className="h-4 w-4" /> Add your first shift
                </Button>
              )}
            </div>
          ) : (
            shifts.map((shift) => {
              const confirmed = shift.signups.filter((r) => r.status === 'confirmed')
              const spotsLeft = shift.capacity - confirmed.length
              return (
                <div key={shift.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-gray-100">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{shift.title}</p>
                      {shift.description && <p className="text-xs text-gray-500 mt-0.5">{shift.description}</p>}
                      {(shift.starts_at || shift.ends_at) && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {shift.starts_at ? formatTimeIn(shift.starts_at, timeZone) : ''}
                          {shift.ends_at ? ` – ${formatTimeIn(shift.ends_at, timeZone)}` : ''}
                        </p>
                      )}
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${spotsLeft <= 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {confirmed.length}/{shift.capacity} filled · {spotsLeft > 0 ? `${spotsLeft} spot${spotsLeft !== 1 ? 's' : ''} left` : 'Full'}
                    </span>
                    {canEdit && (
                      <button onClick={() => { if (confirm(`Delete shift "${shift.title}"?`)) deleteShift(shift.id) }} className="text-gray-400 hover:text-red-500 p-1">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  {confirmed.length === 0 ? (
                    <p className="text-xs text-gray-400 px-4 py-3">No sign-ups yet.</p>
                  ) : (
                    <div className="divide-y divide-gray-50">
                      {confirmed.map((r) => (
                        <div key={r.id} className="flex items-center gap-3 px-4 py-2.5">
                          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-canopy-100 text-xs font-bold text-canopy-900">
                            {getInitials(`${r.first_name} ${r.last_name}`)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">{r.first_name} {r.last_name}</p>
                            <p className="text-xs text-gray-500">{r.email}{r.phone ? ` · ${r.phone}` : ''}</p>
                          </div>
                          <span className="text-xs text-gray-400">{formatDateTimeIn(r.signed_up_at, timeZone)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Add Shift dialog */}
      <Dialog open={shiftOpen} onOpenChange={setShiftOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Shift</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Input label="Shift name *" placeholder="e.g. Greeters, Nursery, Parking" value={shiftForm.title} onChange={(e) => setShiftForm({ ...shiftForm, title: e.target.value })} />
            <Input label="Description" placeholder="Optional details for volunteers" value={shiftForm.description} onChange={(e) => setShiftForm({ ...shiftForm, description: e.target.value })} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Start time" type="datetime-local" value={shiftForm.starts_at} onChange={(e) => setShiftForm({ ...shiftForm, starts_at: e.target.value })} />
              <Input label="End time" type="datetime-local" value={shiftForm.ends_at} onChange={(e) => setShiftForm({ ...shiftForm, ends_at: e.target.value })} />
            </div>
            <Input label="Max volunteers *" type="number" min="1" value={shiftForm.capacity} onChange={(e) => setShiftForm({ ...shiftForm, capacity: e.target.value })} />
          </div>
          {shiftError && <div className="mt-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{shiftError}</div>}
          <div className="flex gap-3 mt-4">
            <Button variant="outline" onClick={() => setShiftOpen(false)} className="flex-1">Cancel</Button>
            <Button onClick={createShift} loading={shiftSaving} disabled={!shiftForm.title} className="flex-1">Create Shift</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
