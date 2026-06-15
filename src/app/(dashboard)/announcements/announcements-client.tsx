'use client'

import { useState } from 'react'
import { Plus, Pin, Megaphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { PageHeader } from '@/components/layout/page-header'
import { formatDate } from '@/lib/utils'
import type { Announcement } from '@/types'

interface Props {
  initialAnnouncements: (Announcement & { team?: { name: string } | null })[]
  teams: { id: string; name: string }[]
  orgId: string
  canEdit: boolean
}

export function AnnouncementsClient({ initialAnnouncements, teams, orgId, canEdit }: Props) {
  const [announcements, setAnnouncements] = useState(initialAnnouncements)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ title: '', body: '', team_id: '', is_pinned: false })

  async function handleSave() {
    setSaving(true)
    const res = await fetch('/api/announcements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, organization_id: orgId }),
    })
    if (res.ok) {
      const { announcement } = await res.json()
      setAnnouncements((prev) => [announcement, ...prev])
      setOpen(false)
      setForm({ title: '', body: '', team_id: '', is_pinned: false })
    }
    setSaving(false)
  }

  return (
    <div>
      <PageHeader
        title="Announcements"
        description="Communicate with your organization"
        action={
          canEdit && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4" /> New Announcement</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>New Announcement</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <Input label="Title *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                  <Textarea label="Message *" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={4} />
                  <Select value={form.team_id} onValueChange={(v) => setForm({ ...form, team_id: v })}>
                    <SelectTrigger label="Audience (optional — defaults to all)">
                      <SelectValue placeholder="Entire organization" />
                    </SelectTrigger>
                    <SelectContent>
                      {teams.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.is_pinned}
                      onChange={(e) => setForm({ ...form, is_pinned: e.target.checked })}
                      className="rounded"
                    />
                    Pin this announcement
                  </label>
                </div>
                <div className="flex gap-3 mt-4">
                  <Button variant="outline" onClick={() => setOpen(false)} className="flex-1">Cancel</Button>
                  <Button onClick={handleSave} loading={saving} disabled={!form.title || !form.body} className="flex-1">Publish</Button>
                </div>
              </DialogContent>
            </Dialog>
          )
        }
      />

      <div className="space-y-3">
        {announcements.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Megaphone className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p>No announcements yet.</p>
          </div>
        ) : (
          announcements.map((a) => (
            <div key={a.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start gap-3">
                {a.is_pinned && <Pin className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900">{a.title}</h3>
                    {a.team && <Badge variant="secondary" className="text-xs">{a.team.name}</Badge>}
                    {a.is_pinned && <Badge variant="warning" className="text-xs">Pinned</Badge>}
                  </div>
                  <p className="text-sm text-gray-600 whitespace-pre-line">{a.body}</p>
                  <p className="text-xs text-gray-400 mt-2">{formatDate(a.published_at)}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
