'use client'

import { useState } from 'react'
import { Plus, Pin, Megaphone, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { PageHeader } from '@/components/layout/page-header'
import { formatDate } from '@/lib/utils'
import type { Announcement } from '@/types'

type AnnouncementCard = Announcement & { team?: { name: string } | null }

interface Props {
  initialAnnouncements: AnnouncementCard[]
  teams: { id: string; name: string }[]
  orgId: string
  canEdit: boolean
}

const emptyForm = { title: '', body: '', team_id: '', is_pinned: false, send_email: true }

export function AnnouncementsClient({ initialAnnouncements, teams, orgId, canEdit }: Props) {
  const [announcements, setAnnouncements] = useState(initialAnnouncements)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  const [form, setForm] = useState(emptyForm)

  function openCreate() {
    setEditingId(null)
    setForm(emptyForm)
    setSaveError('')
    setOpen(true)
  }

  function openEdit(a: AnnouncementCard) {
    setEditingId(a.id)
    setForm({
      title: a.title || '',
      body: a.body || '',
      team_id: a.team_id || '',
      is_pinned: a.is_pinned || false,
      send_email: false, // editing doesn't re-send by default
    })
    setSaveError('')
    setOpen(true)
  }

  async function handleSave() {
    setSaving(true)
    setSaveError('')
    const res = await fetch(
      editingId ? `/api/announcements/${editingId}` : '/api/announcements',
      {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, organization_id: orgId }),
      }
    )
    const data = await res.json().catch(() => ({}))
    if (res.ok) {
      const teamObj = form.team_id ? teams.find((t) => t.id === form.team_id) || null : null
      const saved = { ...data.announcement, team: teamObj }
      if (editingId) {
        setAnnouncements((prev) => prev.map((a) => (a.id === editingId ? saved : a)))
      } else {
        setAnnouncements((prev) => [saved, ...prev])
      }
      setOpen(false)
      setForm(emptyForm)
      setEditingId(null)
      if (data.email) {
        if (data.email.sent > 0) {
          setNotice(`Announcement emailed to ${data.email.sent} member${data.email.sent !== 1 ? 's' : ''}.`)
        } else {
          setNotice('Published, but no members had an email address to send to.')
        }
        setTimeout(() => setNotice(''), 6000)
      }
    } else {
      setSaveError(data.error || 'Could not save announcement. Please try again.')
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    const res = await fetch(`/api/announcements/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setAnnouncements((prev) => prev.filter((a) => a.id !== id))
    }
    setDeletingId(null)
  }

  return (
    <div>
      <PageHeader
        title="Announcements"
        description="Communicate with your organization"
        action={
          canEdit && (
            <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4" /> New Announcement</Button>
          )
        }
      />

      {notice && (
        <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
          {notice}
        </div>
      )}

      {/* Create / Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingId ? 'Edit Announcement' : 'New Announcement'}</DialogTitle></DialogHeader>
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
            <label className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer rounded-lg bg-cyan-50 border border-cyan-100 px-3 py-2.5">
              <input
                type="checkbox"
                checked={form.send_email}
                onChange={(e) => setForm({ ...form, send_email: e.target.checked })}
                className="rounded mt-0.5"
              />
              <span>
                <span className="font-medium">Email this to members</span>
                <span className="block text-xs text-gray-500">
                  {form.team_id
                    ? 'Sends to members of the selected team who have an email address.'
                    : 'Sends to every active member who has an email address.'}
                </span>
              </span>
            </label>
          </div>
          {saveError && (
            <div className="mt-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{saveError}</div>
          )}
          <div className="flex gap-3 mt-4">
            <Button variant="outline" onClick={() => setOpen(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleSave} loading={saving} disabled={!form.title || !form.body} className="flex-1">
              {editingId ? 'Save Changes' : 'Publish'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
                {canEdit && (
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(a)} title="Edit">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      loading={deletingId === a.id}
                      onClick={() => {
                        if (confirm(`Delete announcement "${a.title}"? This cannot be undone.`)) {
                          handleDelete(a.id)
                        }
                      }}
                      title="Delete"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
