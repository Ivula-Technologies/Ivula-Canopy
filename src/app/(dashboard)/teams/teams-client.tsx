'use client'

import { useState } from 'react'
import { Plus, Users, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { PageHeader } from '@/components/layout/page-header'
import type { Team } from '@/types'

const TEAM_TYPES = ['department', 'committee', 'ministry', 'project', 'program', 'volunteer_group']
const TEAM_COLORS = ['#00C4F4', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#84cc16']

type TeamCard = Team & { leader?: { first_name: string; last_name: string } | null; member_count: number }

interface Props {
  initialTeams: TeamCard[]
  members: { id: string; first_name: string; last_name: string }[]
  orgId: string
  canEdit: boolean
}

const emptyForm = {
  name: '', description: '', team_type: 'department', leader_id: '', color: TEAM_COLORS[0],
}

export function TeamsClient({ initialTeams, members, orgId, canEdit }: Props) {
  const [teams, setTeams] = useState(initialTeams)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)

  function openCreate() {
    setEditingId(null)
    setForm(emptyForm)
    setSaveError('')
    setOpen(true)
  }

  function openEdit(team: TeamCard) {
    setEditingId(team.id)
    setForm({
      name: team.name || '',
      description: team.description || '',
      team_type: team.team_type || 'department',
      leader_id: team.leader_id || '',
      color: team.color || TEAM_COLORS[0],
    })
    setSaveError('')
    setOpen(true)
  }

  async function handleSave() {
    setSaving(true)
    setSaveError('')
    const res = await fetch(
      editingId ? `/api/teams/${editingId}` : '/api/teams',
      {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, organization_id: orgId }),
      }
    )
    const data = await res.json().catch(() => ({}))
    if (res.ok) {
      if (editingId) {
        setTeams((prev) =>
          prev.map((t) => (t.id === editingId ? { ...t, ...data.team } : t))
        )
      } else {
        setTeams((prev) => [...prev, { ...data.team, member_count: 0 }])
      }
      setOpen(false)
      setForm(emptyForm)
      setEditingId(null)
    } else {
      setSaveError(data.error || 'Could not save team. Please try again.')
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    const res = await fetch(`/api/teams/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setTeams((prev) => prev.filter((t) => t.id !== id))
    }
    setDeletingId(null)
  }

  return (
    <div>
      <PageHeader
        title={`Teams (${teams.length})`}
        description="Organize your members into departments, committees, and groups"
        action={
          canEdit && (
            <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4" /> New Team</Button>
          )
        }
      />

      {/* Create / Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingId ? 'Edit Team' : 'Create Team'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Input label="Team name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Select value={form.team_type} onValueChange={(v) => setForm({ ...form, team_type: v })}>
              <SelectTrigger label="Team type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TEAM_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t.replace('_', ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={form.leader_id} onValueChange={(v) => setForm({ ...form, leader_id: v })}>
              <SelectTrigger label="Team leader (optional)">
                <SelectValue placeholder="No leader assigned" />
              </SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.first_name} {m.last_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
              <div className="flex gap-2">
                {TEAM_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setForm({ ...form, color: c })}
                    className={`h-7 w-7 rounded-full border-2 transition-transform ${form.color === c ? 'border-gray-900 scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>
          {saveError && (
            <div className="mt-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{saveError}</div>
          )}
          <div className="flex gap-3 mt-4">
            <Button variant="outline" onClick={() => setOpen(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleSave} loading={saving} disabled={!form.name} className="flex-1">
              {editingId ? 'Save Changes' : 'Create Team'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {teams.length === 0 ? (
          <div className="col-span-full text-center py-16 text-gray-400">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p>No teams yet. Create your first team!</p>
          </div>
        ) : (
          teams.map((team) => (
            <div key={team.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3 mb-3">
                <div
                  className="h-10 w-10 flex-shrink-0 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: team.color + '20' }}
                >
                  <div className="h-5 w-5 rounded-full" style={{ backgroundColor: team.color || '#00C4F4' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{team.name}</h3>
                  <Badge variant="secondary" className="text-xs mt-0.5">{team.team_type.replace('_', ' ')}</Badge>
                </div>
                {canEdit && (
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(team)} title="Edit">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      loading={deletingId === team.id}
                      onClick={() => {
                        if (confirm(`Delete team "${team.name}"? This cannot be undone.`)) {
                          handleDelete(team.id)
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
              {team.description && (
                <p className="text-xs text-gray-500 mb-3 line-clamp-2">{team.description}</p>
              )}
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1 text-gray-500">
                  <Users className="h-4 w-4" />
                  <span>{team.member_count} members</span>
                </div>
                {team.leader && (
                  <span className="text-xs text-gray-400">
                    Lead: {team.leader.first_name} {team.leader.last_name}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
