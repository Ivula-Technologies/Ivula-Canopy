'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Users, Pencil, Trash2, UserCog } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { PageHeader } from '@/components/layout/page-header'
import { getInitials } from '@/lib/utils'
import type { Team } from '@/types'

const TEAM_TYPES = ['department', 'committee', 'ministry', 'project', 'program', 'volunteer_group']
const TEAM_COLORS = ['#00C4F4', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#84cc16']

type TeamCard = Team & { leader?: { first_name: string; last_name: string } | null; member_count: number }
type MemberOption = { id: string; first_name: string; last_name: string }

interface Props {
  initialTeams: TeamCard[]
  members: MemberOption[]
  orgId: string
  canEdit: boolean
}

const emptyForm = {
  name: '', description: '', team_type: 'department', leader_id: '', color: TEAM_COLORS[0],
}

export function TeamsClient({ initialTeams, members, orgId, canEdit }: Props) {
  const router = useRouter()
  const [teams, setTeams] = useState(initialTeams)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)

  // Manage members state
  const [managingTeam, setManagingTeam] = useState<TeamCard | null>(null)
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set())
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [memberSearch, setMemberSearch] = useState('')

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

  async function openManageMembers(team: TeamCard) {
    setManagingTeam(team)
    setMemberSearch('')
    setLoadingMembers(true)
    const res = await fetch(`/api/teams/${team.id}/members`)
    if (res.ok) {
      const { memberIds } = await res.json()
      setSelectedMemberIds(new Set(memberIds))
    }
    setLoadingMembers(false)
  }

  function toggleMember(id: string) {
    setSelectedMemberIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleSaveMembers() {
    if (!managingTeam) return
    const teamId = managingTeam.id
    const newCount = selectedMemberIds.size
    const prevCount = managingTeam.member_count

    // Close dialog immediately — feels instant to the user
    setManagingTeam(null)
    // Optimistically update the count on the card
    setTeams((prev) =>
      prev.map((t) => (t.id === teamId ? { ...t, member_count: newCount } : t))
    )

    // Persist to DB in the background
    const res = await fetch(`/api/teams/${teamId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberIds: [...selectedMemberIds] }),
    })

    if (res.ok) {
      // Bust Next.js router cache so the server re-fetches on next navigation
      router.refresh()
    } else {
      // Revert the optimistic update if the save failed
      setTeams((prev) =>
        prev.map((t) => (t.id === teamId ? { ...t, member_count: prevCount } : t))
      )
    }
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
          prev.map((t) => (t.id === editingId ? { ...t, ...data.team, member_count: t.member_count } : t))
        )
      } else {
        setTeams((prev) => [...prev, { ...data.team, member_count: 0 }])
      }
      setOpen(false)
      setForm(emptyForm)
      setEditingId(null)
      router.refresh()
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
      router.refresh()
    }
    setDeletingId(null)
  }

  const filteredMembers = members.filter((m) =>
    `${m.first_name} ${m.last_name}`.toLowerCase().includes(memberSearch.toLowerCase())
  )

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

      {/* Create / Edit team dialog */}
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

      {/* Manage members dialog */}
      <Dialog open={!!managingTeam} onOpenChange={(v) => { if (!v) setManagingTeam(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Members — {managingTeam?.name}</DialogTitle>
          </DialogHeader>
          {loadingMembers ? (
            <div className="py-8 text-center text-sm text-gray-400">Loading…</div>
          ) : (
            <>
              <p className="text-sm text-gray-500 mb-3">
                Check the members you want in this team. Unchecked members will be removed.
              </p>
              <input
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#00C4F4] mb-3"
                placeholder="Search members…"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
              />
              <div className="max-h-72 overflow-y-auto space-y-1 border border-gray-100 rounded-lg p-2">
                {filteredMembers.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">No members found</p>
                ) : (
                  filteredMembers.map((m) => {
                    const checked = selectedMemberIds.has(m.id)
                    return (
                      <label
                        key={m.id}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${checked ? 'bg-cyan-50' : 'hover:bg-gray-50'}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleMember(m.id)}
                          className="rounded"
                        />
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-cyan-100 text-xs font-bold text-[#1B2559]">
                            {getInitials(`${m.first_name} ${m.last_name}`)}
                          </div>
                          <span className="text-sm font-medium text-gray-800">
                            {m.first_name} {m.last_name}
                          </span>
                        </div>
                      </label>
                    )
                  })
                )}
              </div>
              <p className="text-xs text-gray-400 mt-2">{selectedMemberIds.size} member{selectedMemberIds.size !== 1 ? 's' : ''} selected</p>
              <div className="flex gap-3 mt-4">
                <Button variant="outline" onClick={() => setManagingTeam(null)} className="flex-1">Cancel</Button>
                <Button onClick={handleSaveMembers} className="flex-1">Save Members</Button>
              </div>
            </>
          )}
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
                    <Button variant="ghost" size="sm" onClick={() => openEdit(team)} title="Edit team">
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
                      title="Delete team"
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
                  <span>{team.member_count} member{team.member_count !== 1 ? 's' : ''}</span>
                </div>
                {team.leader && (
                  <span className="text-xs text-gray-400">
                    Lead: {team.leader.first_name} {team.leader.last_name}
                  </span>
                )}
              </div>
              {canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-3"
                  onClick={() => openManageMembers(team)}
                >
                  <UserCog className="h-4 w-4" /> Manage Members
                </Button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
