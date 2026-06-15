'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Search, QrCode, Users, MapPin, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { PageHeader } from '@/components/layout/page-header'
import { formatDateTime, formatDate } from '@/lib/utils'
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
  completed: 'secondary',
  cancelled: 'destructive',
} as never

export function EventsClient({ initialEvents, teams, orgId, canEdit, appUrl }: Props) {
  const [events, setEvents] = useState<Event[]>(initialEvents)
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [qrEvent, setQrEvent] = useState<Event | null>(null)
  const [form, setForm] = useState({
    title: '', description: '', event_type: 'general',
    location: '', starts_at: '', ends_at: '', team_id: '',
  })

  const filtered = events.filter((e) =>
    e.title.toLowerCase().includes(search.toLowerCase())
  )

  async function handleSave() {
    setSaving(true)
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, organization_id: orgId }),
    })
    if (res.ok) {
      const { event } = await res.json()
      setEvents((prev) => [event, ...prev])
      setOpen(false)
      setForm({ title: '', description: '', event_type: 'general', location: '', starts_at: '', ends_at: '', team_id: '' })
    }
    setSaving(false)
  }

  const checkinUrl = (token: string) => `${appUrl}/checkin/${token}`

  return (
    <div>
      <PageHeader
        title={`Events (${events.length})`}
        description="Schedule events and track attendance"
        action={
          canEdit && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4" /> New Event</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>Create Event</DialogTitle></DialogHeader>
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
                  <Textarea label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
                </div>
                <div className="flex gap-3 mt-4">
                  <Button variant="outline" onClick={() => setOpen(false)} className="flex-1">Cancel</Button>
                  <Button onClick={handleSave} loading={saving} disabled={!form.title || !form.starts_at} className="flex-1">Create Event</Button>
                </div>
              </DialogContent>
            </Dialog>
          )
        }
      />

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
                  <Badge variant={statusVariant[event.status] || 'secondary'}>{event.status}</Badge>
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
