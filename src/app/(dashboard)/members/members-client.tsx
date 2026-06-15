'use client'

import { useState } from 'react'
import { Search, Download, UserPlus, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { PageHeader } from '@/components/layout/page-header'
import { getInitials, formatDate } from '@/lib/utils'
import type { Member } from '@/types'

interface Props {
  initialMembers: Member[]
  teams: { id: string; name: string }[]
  orgId: string
  canEdit: boolean
  canDelete: boolean
}

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'warning'> = {
  active: 'default',
  inactive: 'secondary',
  pending: 'warning',
}

const emptyForm = {
  first_name: '', last_name: '', email: '', phone: '',
  status: 'active', notes: '', gender: '', address: '',
}

export function MembersClient({ initialMembers, orgId, canEdit, canDelete }: Props) {
  const [members, setMembers] = useState<Member[]>(initialMembers)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)

  const filtered = members.filter((m) => {
    const matchSearch = `${m.first_name} ${m.last_name} ${m.email}`.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || m.status === statusFilter
    return matchSearch && matchStatus
  })

  function openCreate() {
    setEditingId(null)
    setForm(emptyForm)
    setSaveError('')
    setOpen(true)
  }

  function openEdit(member: Member) {
    setEditingId(member.id)
    setForm({
      first_name: member.first_name || '',
      last_name: member.last_name || '',
      email: member.email || '',
      phone: member.phone || '',
      status: member.status || 'active',
      notes: member.notes || '',
      gender: member.gender || '',
      address: member.address || '',
    })
    setSaveError('')
    setOpen(true)
  }

  async function handleSave() {
    setSaving(true)
    setSaveError('')
    const res = await fetch(
      editingId ? `/api/members/${editingId}` : '/api/members',
      {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, organization_id: orgId }),
      }
    )
    const data = await res.json().catch(() => ({}))
    if (res.ok) {
      if (editingId) {
        setMembers((prev) => prev.map((m) => (m.id === editingId ? data.member : m)))
      } else {
        setMembers((prev) => [data.member, ...prev])
      }
      setOpen(false)
      setForm(emptyForm)
      setEditingId(null)
    } else {
      setSaveError(data.error || 'Could not save member. Please try again.')
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    const res = await fetch(`/api/members/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setMembers((prev) => prev.filter((m) => m.id !== id))
    }
    setDeletingId(null)
  }

  function handleExport() {
    const csv = [
      ['First Name', 'Last Name', 'Email', 'Phone', 'Status', 'Join Date'].join(','),
      ...filtered.map((m) =>
        [m.first_name, m.last_name, m.email || '', m.phone || '', m.status, m.join_date].join(',')
      ),
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'members.csv'
    a.click()
  }

  return (
    <div>
      <PageHeader
        title={`Members (${members.length})`}
        description="Manage your organization's members and volunteers"
        action={
          canEdit && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4" /> Export
              </Button>
              <Button size="sm" onClick={openCreate}>
                <UserPlus className="h-4 w-4" /> Add Member
              </Button>
            </div>
          )
        }
      />

      {/* Create / Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Member' : 'Add New Member'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First name *"
              value={form.first_name}
              onChange={(e) => setForm({ ...form, first_name: e.target.value })}
            />
            <Input
              label="Last name *"
              value={form.last_name}
              onChange={(e) => setForm({ ...form, last_name: e.target.value })}
            />
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <Input
              label="Phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
              <SelectTrigger label="Gender">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="other">Other</SelectItem>
                <SelectItem value="prefer_not">Prefer not to say</SelectItem>
              </SelectContent>
            </Select>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger label="Status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Input
            label="Address"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
          <Textarea
            label="Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={2}
          />
          {saveError && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{saveError}</div>
          )}
          <div className="flex gap-3 mt-2">
            <Button variant="outline" onClick={() => setOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              loading={saving}
              disabled={!form.first_name || !form.last_name}
              className="flex-1"
            >
              {editingId ? 'Save Changes' : 'Add Member'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#00C4F4]"
            placeholder="Search members..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00C4F4]"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Member</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Contact</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Joined</th>
              {(canEdit || canDelete) && <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={canEdit || canDelete ? 5 : 4} className="px-4 py-12 text-center text-gray-400">
                  {search ? 'No members match your search' : 'No members yet. Add your first member!'}
                </td>
              </tr>
            ) : (
              filtered.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-cyan-100 text-xs font-bold text-[#1B2559]">
                        {getInitials(`${member.first_name} ${member.last_name}`)}
                      </div>
                      <span className="font-medium text-gray-900">
                        {member.first_name} {member.last_name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    <div>{member.email}</div>
                    {member.phone && <div className="text-xs">{member.phone}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariant[member.status] || 'secondary'}>
                      {member.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(member.join_date)}</td>
                  {(canEdit || canDelete) && (
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {canEdit && (
                          <Button variant="ghost" size="sm" onClick={() => openEdit(member)} title="Edit">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="sm"
                            loading={deletingId === member.id}
                            onClick={() => {
                              if (confirm(`Delete ${member.first_name} ${member.last_name}? This cannot be undone.`)) {
                                handleDelete(member.id)
                              }
                            }}
                            title="Delete"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
