'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Search, QrCode, Users, MapPin, Clock, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { PageHeader } from '@/components/layout/page-header'
import type { Event } from '@/types'

interface Props {
  initialEvents: Event[]
  teams: { id: string; name: string }[]
  orgId: string
  canEdit: boolean
  appUrl: string
}

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'warning'> = {
  upcoming: 'info',
  active: 'default',
  past: 'secondary',
  completed: 'secondary',
  cancelled: 'destructive',
} as never

// Derive a display status from real timestamps so past events never show "upcoming"
function getEffectiveStatus(event: Event): string {
  if (event.status === 'cancelled') return 'cancelled'
  const now = new Date()
  const start = new Date(event.starts_at)
  const end = event.ends_at ? new Date(event.ends_at) : null
  if (end && now > end) return 'past'
  if (!end && now > start) return 'past'
  if (now >= start && (!end || now <= end)) return 'active'
  return 'upcoming'
}

const emptyForm = {
  title: '', description: '', event_type: 'general',
  location: '', starts_at: '', ends_at: '', team_id: '', budget: '',
}

// Convert an ISO timestamp to the value a datetime-local input expects (YYYY-MM-DDTHH:mm in local time)
function toLocalInput(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function EventsClient({ initialEvents, teams, orgId, canEdit, appUrl }: Props) {
  const router = useRouter()
  const [events, setEvents] = useState<Event[]>(initialEvents)
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [qrEvent, setQrEvent] = useState<Event | null>(null)
  const [form, setForm] = useState(emptyForm)

  const filtered = events.filter((e) =>
    e.title.toLowerCase().includes(search.toLowerCase())
  )

  function openCreate() {
    setEditingId(null)
    setForm(emptyForm)
    setSaveError('')
    setOpen(true)
  }

  function openEdit(event: Event) {
    setEditingId(event.id)
    setForm({
      title: event.title || '',
      description: event.description || '',
      event_type: event.event_type || 'general',
      location: event.location || '',
      starts_at: toLocalInput(event.starts_at),
      ends_at: toLocalInput(event.ends_at),
      team_id: event.team_id || '',
      budget: event.budget != null ? String(event.budget) : '',
    })
    setSaveError('')
    setOpen(true)
  }

  async function handleSave() {
    setSaving(true)
    setSaveError('')
    const res = await fetch(
      editingId ? `/api/events/${editingId}` : '/api/events',
      {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          budget: form.budget === '' ? null : parseFloat(form.budget),
          organization_id: orgId,
        }),
      }
    )
    const data = await res.json().catch(() => ({}))
    if (res.ok) {
      if (editingId) {
        setEvents((prev) => prev.map((e) => (e.id === editingId ? { ...e, ...data.event } : e)))
      } else {
        setEvents((prev) => [data.event, ...prev])
      }
      setOpen(false)
      setForm(emptyForm)
      setEditingId(null)
      router.refresh()
    } else {
      setSaveError(data.error || 'Failed to save event. Please try again.')
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    const res = await fetch(`/api/events/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setEvents((prev) => prev.filter((e) => e.id !== id))
      router.refresh()
    }
    setDeletingId(null)
  }

  const checkinUrl = (token: string) => `${appUrl}/checkin/${token}`

  return (
    <div>
      <PageHeader
        title={`Events (${events.length})`}
        description="Schedule events and track attendance"
        action={
          canEdit && (
            <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4" /> New Event</Button>
          )
        }
      />

      {/* Create / Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingId ? 'Edit Event' : 'Create Event'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Input label="Event title *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Start date & time *" type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
              <Input label="End date & time" type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} />
            </div>
            <Input label="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Address or 'Online'" />
            <div className="grid grid-cols-2 gap-4">
              <Select value={form.event_type} onValueChange={(v) => setForm({ ...form, event_type: v })}>
                <SelectTrigger label="Event type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['general', 'meeting', 'service', 'volunteer', 'training', 'social'].map((t) => (
                    <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={form.team_id} onValueChange={(v) => setForm({ ...form, team_id: v })}>
                <SelectTrigger label="Team (optional)">
                  <SelectValue placeholder="All members" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Input label="Budget (USD)" type="number" min="0" step="0.01" placeholder="Optional" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} />
            <Textarea label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
          </div>
          {saveError && (
            <div className="mt-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{saveError}</div>
          )}
          <div className="flex gap-3 mt-4">
            <Button variant="outline" onClick={() => setOpen(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleSave} loading={saving} disabled={!form.title || !form.starts_at} className="flex-1">
              {editingId ? 'Save Changes' : 'Create Event'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="relative mb-6 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#00C4F4]"
          placeholder="Search events..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p>No events yet. Create your first event!</p>
          </div>
        ) : (
          filtered.map((event) => (
            <div key={event.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4 hover:shadow-sm transition-shadow">
              <div className="flex flex-col items-center text-center min-w-[50px] border-r border-gray-100 pr-4">
                <span className="text-xs text-gray-400 uppercase font-medium">
                  {new Date(event.starts_at).toLocaleDateString('en', { month: 'short' })}
                </span>
                <span className="text-2xl font-bold text-gray-900 leading-none">
                  {new Date(event.starts_at).getDate()}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Link href={`/events/${event.id}`} className="font-semibold text-gray-900 hover:text-[#00C4F4] transition-colors">
                    {event.title}
                  </Link>
                  <Badge variant={statusVariant[getEffectiveStatus(event)] || 'secondary'}>{getEffectiveStatus(event)}</Badge>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(event.starts_at).toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' })}
                  </span>
                  {event.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />{event.location}
                    </span>
                  )}
                  <Badge variant="secondary" className="text-xs">{event.event_type}</Badge>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link href={`/events/${event.id}`}>
                  <Button variant="outline" size="sm">
                    <Users className="h-4 w-4" /> Attendance
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setQrEvent(event)}
                  title="QR Check-in"
                >
                  <QrCode className="h-4 w-4" />
                </Button>
                {canEdit && (
                  <>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(event)} title="Edit">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      loading={deletingId === event.id}
                      onClick={() => {
                        if (confirm(`Delete event "${event.title}"? This also removes its attendance records and cannot be undone.`)) {
                          handleDelete(event.id)
                        }
                      }}
                      title="Delete"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* QR Dialog */}
      {qrEvent && (
        <Dialog open={!!qrEvent} onOpenChange={() => setQrEvent(null)}>
          <DialogContent className="max-w-sm text-center">
            <DialogHeader>
              <DialogTitle>QR Check-in — {qrEvent.title}</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-gray-500 mb-4">
              Members scan this QR code to self-check-in at the event.
            </p>
            <div className="flex justify-center">
              {/* QR code rendered via API route */}
              <img
                src={`/api/events/${qrEvent.id}/qr`}
                alt="QR Code"
                className="w-48 h-48 border border-gray-200 rounded-lg"
              />
            </div>
            <p className="text-xs text-gray-400 mt-3 break-all">{checkinUrl(qrEvent.checkin_token)}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => navigator.clipboard.writeText(checkinUrl(qrEvent.checkin_token))}
            >
              Copy link
            </Button>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
