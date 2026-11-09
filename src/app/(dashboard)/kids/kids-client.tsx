'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AlertTriangle, Baby, Check, KeyRound, Pencil, Plus, Printer, Search, ShieldCheck, Stethoscope } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { PageHeader } from '@/components/layout/page-header'
import { cn } from '@/lib/utils'
import { ageLabel, groupByFamily, matchesChildSearch, normalizePickupCode, suggestRoom } from '@/lib/kids'
import { formatTimeIn } from '@/lib/timezone'
import type { Child, ChildCheckin } from '@/types'

interface MemberOption {
  id: string
  first_name: string
  last_name: string
  phone: string | null
}

interface Props {
  initialChildren: Child[]
  initialOpen: ChildCheckin[]
  initialToday: ChildCheckin[]
  lastRooms: Record<string, string>
  events: { id: string; title: string; starts_at: string }[]
  members: MemberOption[]
  timeZone: string
  canDesk: boolean
  canEdit: boolean
  canDelete: boolean
}

interface PickupMatch {
  id: string
  room: string | null
  checked_in_at: string
  child: {
    first_name: string
    last_name: string
    guardian_name: string
    guardian_phone: string | null
    authorized_pickups: string | null
    allergies: string | null
  } | null
}

type Tab = 'desk' | 'children' | 'log'

const DEFAULT_ROOMS = ['Nursery', 'Toddlers', 'Preschool', 'Kindergarten', 'Elementary']

const emptyForm = {
  first_name: '',
  last_name: '',
  birth_date: '',
  grade: '',
  allergies: '',
  medical_notes: '',
  guardian_member_id: '',
  guardian_name: '',
  guardian_phone: '',
  authorized_pickups: '',
  notes: '',
}

const selectClass =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-canopy-600'

// The event happening now, else the next one today, else the last one today.
function defaultEventId(events: Props['events']): string {
  if (events.length === 0) return ''
  const now = Date.now()
  const started = events.filter((e) => new Date(e.starts_at).getTime() <= now)
  const next = events.find((e) => new Date(e.starts_at).getTime() > now)
  const current = started[started.length - 1]
  if (current && now - new Date(current.starts_at).getTime() < 3 * 60 * 60 * 1000) return current.id
  return (next || current).id
}

export function KidsClient(props: Props) {
  const { lastRooms, events, members, timeZone, canDesk, canEdit, canDelete } = props
  const router = useRouter()
  const [tab, setTab] = useState<Tab>(canDesk ? 'desk' : 'children')
  const [children, setChildren] = useState<Child[]>(props.initialChildren)
  const [open, setOpen] = useState<ChildCheckin[]>(props.initialOpen)
  const [today, setToday] = useState<ChildCheckin[]>(props.initialToday)

  const byId = useMemo(() => new Map(children.map((c) => [c.id, c])), [children])
  const openChildIds = useMemo(() => new Set(open.map((o) => o.child_id)), [open])
  const activeChildren = useMemo(() => children.filter((c) => c.is_active), [children])
  const roomOptions = useMemo(() => {
    const set = new Set<string>(DEFAULT_ROOMS)
    Object.values(lastRooms).forEach((r) => set.add(r))
    today.forEach((t) => t.room && set.add(t.room))
    return [...set].sort()
  }, [lastRooms, today])

  // ---------- Check-in desk ----------
  const [eventId, setEventId] = useState(() => defaultEventId(events))
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [rooms, setRooms] = useState<Record<string, string>>({})
  const [checkingIn, setCheckingIn] = useState(false)
  const [deskError, setDeskError] = useState('')

  const families = useMemo(() => {
    if (!search.trim()) return []
    return groupByFamily(activeChildren)
      .filter((family) => family.some((c) => matchesChildSearch(c, search)))
      .slice(0, 8)
  }, [activeChildren, search])

  // What staff typed, else the child's last room, else a room for their age.
  function roomFor(id: string) {
    return rooms[id] ?? lastRooms[id] ?? suggestRoom(byId.get(id)?.birth_date)
  }

  const selectedIds = Object.keys(selected).filter((id) => selected[id] && !openChildIds.has(id))

  async function checkIn() {
    setCheckingIn(true)
    setDeskError('')
    const res = await fetch('/api/kids/checkins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_id: eventId || null,
        children: selectedIds.map((id) => ({ id, room: roomFor(id) })),
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setDeskError(data.error || 'Could not check in. Please try again.')
      setCheckingIn(false)
      return
    }
    const ids = (data.checkins as { id: string }[]).map((c) => c.id)
    router.push(`/print/kids-labels?ids=${ids.join(',')}`)
  }

  // ---------- Pickup ----------
  const [code, setCode] = useState('')
  const [matches, setMatches] = useState<PickupMatch[] | null>(null)
  const [going, setGoing] = useState<Record<string, boolean>>({})
  const [pickedUpBy, setPickedUpBy] = useState('')
  const [pickupBusy, setPickupBusy] = useState(false)
  const [pickupError, setPickupError] = useState('')
  const [pickupDone, setPickupDone] = useState('')

  async function lookUp() {
    setPickupBusy(true)
    setPickupError('')
    setPickupDone('')
    setMatches(null)
    const res = await fetch('/api/kids/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })
    const data = await res.json().catch(() => ({}))
    setPickupBusy(false)
    if (!res.ok) {
      setPickupError(data.error || 'Could not look up that code.')
      return
    }
    const found = data.checkins as PickupMatch[]
    setMatches(found)
    setGoing(Object.fromEntries(found.map((m) => [m.id, true])))
    setPickedUpBy(found[0]?.child?.guardian_name || '')
  }

  function markCheckedOut(ids: string[], by: string, method: 'code' | 'override', note?: string) {
    const now = new Date().toISOString()
    setOpen((prev) => prev.filter((o) => !ids.includes(o.id)))
    setToday((prev) =>
      prev.map((t) =>
        ids.includes(t.id)
          ? { ...t, checked_out_at: now, picked_up_by: by, checkout_method: method, checkout_note: note ?? null }
          : t
      )
    )
  }

  async function confirmPickup() {
    if (!matches) return
    const ids = matches.filter((m) => going[m.id]).map((m) => m.id)
    setPickupBusy(true)
    setPickupError('')
    const res = await fetch('/api/kids/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, action: 'confirm', checkin_ids: ids, picked_up_by: pickedUpBy }),
    })
    const data = await res.json().catch(() => ({}))
    setPickupBusy(false)
    if (!res.ok) {
      setPickupError(data.error || 'Could not check out. Please try again.')
      return
    }
    const done = data.checked_out as string[]
    markCheckedOut(done, pickedUpBy.trim(), 'code')
    const names = matches.filter((m) => done.includes(m.id)).map((m) => m.child?.first_name).filter(Boolean)
    setPickupDone(`${names.join(' and ')} checked out to ${pickedUpBy.trim()}.`)
    setMatches(null)
    setCode('')
    router.refresh()
  }

  // ---------- Lost tag ----------
  const [overrideFor, setOverrideFor] = useState<ChildCheckin | null>(null)
  const [overrideBy, setOverrideBy] = useState('')
  const [overrideNote, setOverrideNote] = useState('')
  const [overrideBusy, setOverrideBusy] = useState(false)
  const [overrideError, setOverrideError] = useState('')

  function openOverride(checkin: ChildCheckin) {
    setOverrideFor(checkin)
    setOverrideBy(byId.get(checkin.child_id)?.guardian_name || '')
    setOverrideNote('')
    setOverrideError('')
  }

  async function confirmOverride() {
    if (!overrideFor) return
    setOverrideBusy(true)
    setOverrideError('')
    const res = await fetch(`/api/kids/checkins/${overrideFor.id}/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ picked_up_by: overrideBy, note: overrideNote }),
    })
    const data = await res.json().catch(() => ({}))
    setOverrideBusy(false)
    if (!res.ok) {
      setOverrideError(data.error || 'Could not check out. Please try again.')
      return
    }
    markCheckedOut([overrideFor.id], overrideBy.trim(), 'override', overrideNote.trim())
    setOverrideFor(null)
    router.refresh()
  }

  // ---------- Children records ----------
  const [childSearch, setChildSearch] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const listed = children.filter(
    (c) => (showArchived || c.is_active) && (!childSearch.trim() || matchesChildSearch(c, childSearch))
  )

  function openNew(prefill: Partial<typeof emptyForm> = {}) {
    setEditingId(null)
    setForm({ ...emptyForm, ...prefill })
    setFormError('')
    setFormOpen(true)
  }

  function openEditChild(child: Child) {
    setEditingId(child.id)
    setForm({
      first_name: child.first_name,
      last_name: child.last_name,
      birth_date: child.birth_date || '',
      grade: child.grade || '',
      allergies: child.allergies || '',
      medical_notes: child.medical_notes || '',
      guardian_member_id: child.guardian_member_id || '',
      guardian_name: child.guardian_name,
      guardian_phone: child.guardian_phone || '',
      authorized_pickups: child.authorized_pickups || '',
      notes: child.notes || '',
    })
    setFormError('')
    setFormOpen(true)
  }

  function chooseGuardian(memberId: string) {
    const member = members.find((m) => m.id === memberId)
    setForm((f) => ({
      ...f,
      guardian_member_id: memberId,
      guardian_name: member ? `${member.first_name} ${member.last_name}`.trim() : f.guardian_name,
      guardian_phone: member?.phone || f.guardian_phone,
      last_name: f.last_name || member?.last_name || '',
    }))
  }

  async function saveChild(addSibling: boolean) {
    setSaving(true)
    setFormError('')
    const res = await fetch(editingId ? `/api/kids/children/${editingId}` : '/api/kids/children', {
      method: editingId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json().catch(() => ({}))
    setSaving(false)
    if (!res.ok) {
      setFormError(data.error || 'Could not save. Please try again.')
      return
    }
    const saved = data.child as Child
    setChildren((prev) => {
      const next = editingId ? prev.map((c) => (c.id === saved.id ? saved : c)) : [...prev, saved]
      return next.sort((a, b) => a.first_name.localeCompare(b.first_name))
    })
    if (addSibling) {
      openNew({
        last_name: form.last_name,
        guardian_member_id: form.guardian_member_id,
        guardian_name: form.guardian_name,
        guardian_phone: form.guardian_phone,
        authorized_pickups: form.authorized_pickups,
      })
    } else {
      setFormOpen(false)
    }
  }

  async function setArchived(child: Child, archived: boolean) {
    const res = await fetch(`/api/kids/children/${child.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !archived }),
    })
    const data = await res.json().catch(() => ({}))
    if (res.ok) setChildren((prev) => prev.map((c) => (c.id === child.id ? (data.child as Child) : c)))
    else alert(data.error || 'Could not save. Please try again.')
  }

  async function deleteChild(child: Child) {
    if (!confirm(`Delete ${child.first_name} ${child.last_name} and their check-in history for good? This can’t be undone.`)) return
    const res = await fetch(`/api/kids/children/${child.id}`, { method: 'DELETE' })
    const data = await res.json().catch(() => ({}))
    if (res.ok) {
      setChildren((prev) => prev.filter((c) => c.id !== child.id))
      setFormOpen(false)
    } else alert(data.error || 'Could not delete. Please try again.')
  }

  // ---------- Render helpers ----------
  const childName = (id: string) => {
    const c = byId.get(id)
    return c ? `${c.first_name} ${c.last_name}` : 'Removed child'
  }

  const openByRoom = useMemo(() => {
    const groups = new Map<string, ChildCheckin[]>()
    for (const o of open) {
      const key = o.room || 'No room'
      groups.set(key, [...(groups.get(key) || []), o])
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [open])

  const tabs: { key: Tab; label: string; show: boolean }[] = [
    { key: 'desk', label: 'Check-in desk', show: canDesk },
    { key: 'children', label: `Children (${activeChildren.length})`, show: true },
    { key: 'log', label: `Today (${today.length})`, show: true },
  ]

  return (
    <div>
      <PageHeader
        title="Kids check-in"
        description="Check children in, print name labels with a pickup code, and hand them back only to someone with the matching tag."
        action={
          canEdit ? (
            <Button onClick={() => openNew()}>
              <Plus className="h-4 w-4" /> Add child
            </Button>
          ) : undefined
        }
      />

      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-gray-200">
        {tabs.filter((t) => t.show).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              '-mb-px whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium',
              tab === t.key ? 'border-canopy-600 text-canopy-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <datalist id="kids-rooms">
        {roomOptions.map((r) => (
          <option key={r} value={r} />
        ))}
      </datalist>

      {tab === 'desk' && canDesk && (
        <div className="space-y-6">
          {children.length === 0 && (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-10 text-center">
              <Baby className="mx-auto mb-3 h-10 w-10 text-canopy-600" />
              <h2 className="text-lg font-semibold text-gray-900">Add your first family</h2>
              <p className="mx-auto mt-1 max-w-md text-sm text-gray-500">
                Add each child with their parent or guardian, allergies and who else may pick them up. Then check them
                in here on Sunday.
              </p>
              {canEdit && (
                <Button className="mt-5" onClick={() => openNew()}>
                  <Plus className="h-4 w-4" /> Add child
                </Button>
              )}
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Check in */}
            <section className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
              <h2 className="mb-3 font-semibold text-gray-900">Check in</h2>
              <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="kids-event">Service or event</label>
              <select id="kids-event" className={cn(selectClass, 'mb-3')} value={eventId} onChange={(e) => setEventId(e.target.value)}>
                <option value="">No event</option>
                {events.map((e) => (
                  <option key={e.id} value={e.id}>
                    {formatTimeIn(e.starts_at, timeZone)} · {e.title}
                  </option>
                ))}
              </select>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  autoFocus
                  className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-canopy-600"
                  placeholder="Name, or last 4 digits of phone"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setDeskError('')
                  }}
                />
              </div>

              <div className="mt-3 space-y-3">
                {search.trim() && families.length === 0 && (
                  <p className="py-4 text-center text-sm text-gray-500">
                    No family found.{' '}
                    {canEdit && (
                      <button className="font-medium text-canopy-700 hover:underline" onClick={() => openNew()}>
                        Add a child
                      </button>
                    )}
                  </p>
                )}
                {families.map((family) => (
                  <div key={family[0].id} className="rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between gap-2 border-b border-gray-100 bg-gray-50 px-3 py-2 text-xs text-gray-600">
                      <span className="font-medium text-gray-800">{family[0].guardian_name}</span>
                      <span>{family[0].guardian_phone}</span>
                    </div>
                    {family.map((child) => {
                      const isIn = openChildIds.has(child.id)
                      return (
                        <div key={child.id} className="flex flex-wrap items-center gap-3 px-3 py-2">
                          <label className="flex min-w-0 flex-1 items-center gap-3">
                            <input
                              type="checkbox"
                              className="h-5 w-5 rounded border-gray-300 text-canopy-600"
                              disabled={isIn}
                              checked={!isIn && !!selected[child.id]}
                              onChange={(e) => setSelected((s) => ({ ...s, [child.id]: e.target.checked }))}
                            />
                            <span className="min-w-0">
                              <span className="block font-medium text-gray-900">
                                {child.first_name} {child.last_name}
                              </span>
                              <span className="block text-xs text-gray-500">
                                {[ageLabel(child.birth_date), child.grade].filter(Boolean).join(' · ')}
                              </span>
                            </span>
                          </label>
                          {child.allergies && (
                            <Badge variant="destructive" title={child.allergies}>
                              <AlertTriangle className="mr-1 h-3 w-3" /> Allergy
                            </Badge>
                          )}
                          {isIn ? (
                            <Badge variant="default">Checked in</Badge>
                          ) : (
                            <input
                              list="kids-rooms"
                              aria-label={`Room for ${child.first_name}`}
                              className="w-32 rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-canopy-600"
                              placeholder="Room"
                              value={roomFor(child.id)}
                              onChange={(e) => setRooms((r) => ({ ...r, [child.id]: e.target.value }))}
                            />
                          )}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>

              {deskError && (
                <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{deskError}</div>
              )}
              {selectedIds.length > 0 && (
                <Button className="mt-4 w-full" onClick={checkIn} loading={checkingIn}>
                  <Printer className="h-4 w-4" /> Check in {selectedIds.length} &amp; print labels
                </Button>
              )}
            </section>

            {/* Pickup */}
            <section className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
              <h2 className="mb-1 font-semibold text-gray-900">Pick up</h2>
              <p className="mb-3 text-sm text-gray-500">Type the code on the parent&rsquo;s tag. It must match the child&rsquo;s label.</p>
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault()
                  lookUp()
                }}
              >
                <input
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-lg uppercase tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-canopy-600"
                  placeholder="CODE"
                  maxLength={6}
                  autoComplete="off"
                  aria-label="Pickup code"
                  value={code}
                  onChange={(e) => {
                    setCode(normalizePickupCode(e.target.value))
                    setPickupError('')
                  }}
                />
                <Button type="submit" variant="outline" loading={pickupBusy && !matches} disabled={code.length < 4}>
                  <KeyRound className="h-4 w-4" /> Find
                </Button>
              </form>

              {pickupError && (
                <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{pickupError}</div>
              )}
              {pickupDone && (
                <div className="mt-3 flex items-center gap-2 rounded-lg border border-canopy-200 bg-canopy-50 px-4 py-3 text-sm text-canopy-800">
                  <Check className="h-4 w-4" /> {pickupDone}
                </div>
              )}

              {matches && (
                <div className="mt-4 space-y-3">
                  {matches.map((m) => (
                    <label key={m.id} className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2">
                      <input
                        type="checkbox"
                        className="h-5 w-5 rounded border-gray-300 text-canopy-600"
                        checked={!!going[m.id]}
                        onChange={(e) => setGoing((g) => ({ ...g, [m.id]: e.target.checked }))}
                      />
                      <span className="flex-1">
                        <span className="block font-medium text-gray-900">
                          {m.child?.first_name} {m.child?.last_name}
                        </span>
                        <span className="block text-xs text-gray-500">
                          {m.room || 'No room'} · in at {formatTimeIn(m.checked_in_at, timeZone)}
                        </span>
                      </span>
                    </label>
                  ))}
                  <div className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">
                    <p className="flex items-center gap-1.5 font-medium">
                      <ShieldCheck className="h-4 w-4 text-canopy-600" /> Who may pick up
                    </p>
                    <p className="mt-1">
                      {matches[0]?.child?.guardian_name}
                      {matches[0]?.child?.guardian_phone ? ` (${matches[0].child.guardian_phone})` : ''}
                    </p>
                    {matches[0]?.child?.authorized_pickups && (
                      <p className="mt-0.5 text-gray-600">Also: {matches[0].child.authorized_pickups}</p>
                    )}
                  </div>
                  <Input label="Picked up by" value={pickedUpBy} onChange={(e) => setPickedUpBy(e.target.value)} />
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => setMatches(null)}>
                      Cancel
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={confirmPickup}
                      loading={pickupBusy}
                      disabled={!pickedUpBy.trim() || !matches.some((m) => going[m.id])}
                    >
                      Check out
                    </Button>
                  </div>
                </div>
              )}
            </section>
          </div>

          {/* In rooms now */}
          <section>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">In rooms now ({open.length})</h2>
            {open.length === 0 ? (
              <p className="rounded-xl border border-gray-200 bg-white px-4 py-6 text-center text-sm text-gray-500">
                No children are checked in.
              </p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {openByRoom.map(([room, list]) => (
                  <div key={room} className="rounded-xl border border-gray-200 bg-white">
                    <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2">
                      <span className="font-medium text-gray-900">{room}</span>
                      <Badge variant="secondary">{list.length}</Badge>
                    </div>
                    <ul className="divide-y divide-gray-100">
                      {list.map((o) => {
                        const child = byId.get(o.child_id)
                        return (
                          <li key={o.id} className="flex items-center gap-2 px-4 py-2 text-sm">
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-medium text-gray-900">{childName(o.child_id)}</span>
                              <span className="block text-xs text-gray-500">
                                {[ageLabel(child?.birth_date), `in ${formatTimeIn(o.checked_in_at, timeZone)}`].filter(Boolean).join(' · ')}
                              </span>
                            </span>
                            {child?.allergies && (
                              <span title={`Allergy: ${child.allergies}`}>
                                <AlertTriangle className="h-4 w-4 text-red-600" />
                              </span>
                            )}
                            {child?.medical_notes && (
                              <span title={child.medical_notes}>
                                <Stethoscope className="h-4 w-4 text-amber-600" />
                              </span>
                            )}
                            <Link href={`/print/kids-labels?ids=${o.id}&parent=0`} title="Print label again">
                              <Button variant="ghost" size="sm">
                                <Printer className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button variant="ghost" size="sm" onClick={() => openOverride(o)}>
                              Lost tag
                            </Button>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {tab === 'children' && (
        <div>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-canopy-600"
                placeholder="Search children or parents..."
                value={childSearch}
                onChange={(e) => setChildSearch(e.target.value)}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
              Show archived
            </label>
          </div>

          {listed.length === 0 ? (
            <p className="rounded-xl border border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-500">
              {children.length === 0 ? 'No children yet.' : 'No children match.'}
            </p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              <ul className="divide-y divide-gray-100">
                {listed.map((child) => (
                  <li key={child.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900">
                        {child.first_name} {child.last_name}
                        {!child.is_active && <Badge variant="secondary" className="ml-2">Archived</Badge>}
                      </p>
                      <p className="text-xs text-gray-500">
                        {[ageLabel(child.birth_date), child.grade, `Parent: ${child.guardian_name}`, child.guardian_phone]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    </div>
                    {child.allergies && <Badge variant="destructive">Allergy: {child.allergies}</Badge>}
                    {canEdit && (
                      <Button variant="ghost" size="sm" onClick={() => openEditChild(child)}>
                        <Pencil className="h-4 w-4" /> Edit
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {tab === 'log' && (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          {today.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-gray-500">No check-ins yet today.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-2 font-semibold">Child</th>
                  <th className="px-4 py-2 font-semibold">Room</th>
                  <th className="px-4 py-2 font-semibold">In</th>
                  <th className="px-4 py-2 font-semibold">Out</th>
                  <th className="px-4 py-2 font-semibold">Picked up by</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {today.map((t) => (
                  <tr key={t.id}>
                    <td className="px-4 py-2 font-medium text-gray-900">{childName(t.child_id)}</td>
                    <td className="px-4 py-2 text-gray-600">{t.room || '—'}</td>
                    <td className="px-4 py-2 text-gray-600">{formatTimeIn(t.checked_in_at, timeZone)}</td>
                    <td className="px-4 py-2 text-gray-600">
                      {t.checked_out_at ? formatTimeIn(t.checked_out_at, timeZone) : <Badge variant="default">In room</Badge>}
                    </td>
                    <td className="px-4 py-2 text-gray-600">
                      {t.picked_up_by || '—'}
                      {t.checkout_method === 'override' && (
                        <span className="mt-0.5 block text-xs text-amber-700">Without tag: {t.checkout_note}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Lost tag dialog */}
      <Dialog open={!!overrideFor} onOpenChange={(o) => !o && setOverrideFor(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Check out without the tag</DialogTitle>
          </DialogHeader>
          {overrideFor && (
            <div className="space-y-4 text-sm">
              <p className="text-gray-600">
                Only hand <strong>{childName(overrideFor.child_id)}</strong> to someone on this list, after checking a photo ID.
              </p>
              <div className="rounded-lg bg-gray-50 px-3 py-2 text-gray-700">
                <p>{byId.get(overrideFor.child_id)?.guardian_name}</p>
                {byId.get(overrideFor.child_id)?.authorized_pickups && (
                  <p className="text-gray-600">Also: {byId.get(overrideFor.child_id)?.authorized_pickups}</p>
                )}
              </div>
              <Input label="Picked up by" value={overrideBy} onChange={(e) => setOverrideBy(e.target.value)} />
              <Input
                label="How you checked who they are"
                placeholder="Checked driver’s license"
                value={overrideNote}
                onChange={(e) => setOverrideNote(e.target.value)}
              />
              {overrideError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">{overrideError}</div>
              )}
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setOverrideFor(null)}>
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={confirmOverride}
                  loading={overrideBusy}
                  disabled={!overrideBy.trim() || !overrideNote.trim()}
                >
                  Check out
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add / edit child */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit child' : 'Add child'}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-1">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="First name *" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
              <Input label="Last name *" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Birth date" type="date" value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} />
              <Input label="Grade or class" placeholder="Pre-K" value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} />
            </div>
            <Input
              label="Allergies (printed on the label)"
              placeholder="Peanuts, dairy"
              value={form.allergies}
              onChange={(e) => setForm({ ...form, allergies: e.target.value })}
            />
            <Textarea
              label="Medical or care notes (staff only, not printed)"
              rows={2}
              value={form.medical_notes}
              onChange={(e) => setForm({ ...form, medical_notes: e.target.value })}
            />
            {members.length > 0 && (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="kids-guardian">
                  Parent or guardian from your members (optional)
                </label>
                <select id="kids-guardian" className={selectClass} value={form.guardian_member_id} onChange={(e) => chooseGuardian(e.target.value)}>
                  <option value="">Not a member yet</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.first_name} {m.last_name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Parent or guardian *" value={form.guardian_name} onChange={(e) => setForm({ ...form, guardian_name: e.target.value })} />
              <Input label="Their phone" type="tel" value={form.guardian_phone} onChange={(e) => setForm({ ...form, guardian_phone: e.target.value })} />
            </div>
            <Input
              label="Also allowed to pick up"
              placeholder="Grandma Jo Lee, Mark Lee"
              value={form.authorized_pickups}
              onChange={(e) => setForm({ ...form, authorized_pickups: e.target.value })}
            />
            <Textarea label="Notes" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          {formError && <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{formError}</div>}
          <div className="mt-4 flex flex-wrap gap-2">
            {editingId ? (
              <>
                {(() => {
                  const child = children.find((c) => c.id === editingId)
                  if (!child) return null
                  return (
                    <>
                      <Button variant="ghost" size="sm" onClick={() => setArchived(child, child.is_active).then(() => setFormOpen(false))}>
                        {child.is_active ? 'Archive' : 'Restore'}
                      </Button>
                      {canDelete && (
                        <Button variant="ghost" size="sm" className="text-red-600" onClick={() => deleteChild(child)}>
                          Delete for good
                        </Button>
                      )}
                    </>
                  )
                })()}
                <Button className="ml-auto" onClick={() => saveChild(false)} loading={saving}>
                  Save
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" className="flex-1" onClick={() => saveChild(true)} loading={saving}>
                  Save &amp; add a sibling
                </Button>
                <Button className="flex-1" onClick={() => saveChild(false)} loading={saving}>
                  Save
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
