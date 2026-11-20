'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, Download, UserPlus, Pencil, Trash2, Upload, Users, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/layout/page-header'
import { MemberFormDialog } from '@/components/members/member-form-dialog'
import { getInitials, formatDate } from '@/lib/utils'
import { dropQueryParams, links } from '@/lib/links'
import type { Member } from '@/types'
import { toCsv } from '@/lib/csv'
import { ImportMembersDialog } from './import-members'

interface Props {
  initialMembers: Member[]
  teams: { id: string; name: string }[]
  orgId: string
  canEdit: boolean
  canDelete: boolean
  /** Filters a link arrived with, e.g. the dashboard's "Active Members" box. */
  initialStatus?: string
  initialSearch?: string
  /** "New this month": only people added on or after this moment. */
  addedSince?: string | null
  /** ?edit=<id>: open that person's form straight away. */
  editId?: string
}

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'warning'> = {
  active: 'default',
  inactive: 'secondary',
  pending: 'warning',
}

export function MembersClient({ initialMembers, orgId, canEdit, canDelete, initialStatus, initialSearch, addedSince, editId }: Props) {
  const router = useRouter()
  const [members, setMembers] = useState<Member[]>(initialMembers)
  const [search, setSearch] = useState(initialSearch || '')
  const [statusFilter, setStatusFilter] = useState(initialStatus || 'all')
  const [onlyAddedSince, setOnlyAddedSince] = useState(addedSince || null)
  // Arrived with ?edit=<id> (from that person's page): start with their form open.
  const [editing, setEditing] = useState<Member | null>(() => (canEdit && editId ? initialMembers.find((m) => m.id === editId) ?? null : null))
  const [open, setOpen] = useState(() => editing !== null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [notice, setNotice] = useState('')

  // router.refresh() re-renders the page with fresh rows; keep the list in step.
  useEffect(() => { setMembers(initialMembers) }, [initialMembers])

  // Reloading shouldn't open the form again.
  useEffect(() => { if (editId) dropQueryParams('edit') }, [editId])

  function handleImported(imported: number, skipped: number) {
    setNotice(
      `${imported} ${imported === 1 ? 'person' : 'people'} imported` +
      (skipped ? `, ${skipped} skipped (no name, or already in Canopy).` : '.')
    )
    router.refresh()
  }

  const filtered = members
    .filter((m) => {
      const matchSearch = `${m.first_name} ${m.last_name} ${m.email}`.toLowerCase().includes(search.toLowerCase())
      const matchStatus = statusFilter === 'all' || m.status === statusFilter
      const matchAdded = !onlyAddedSince || new Date(m.created_at).getTime() >= new Date(onlyAddedSince).getTime()
      return matchSearch && matchStatus && matchAdded
    })
    // Newest first when looking at who joined this month.
    .sort((a, b) => (onlyAddedSince ? b.created_at.localeCompare(a.created_at) : 0))

  function openCreate() {
    setEditing(null)
    setOpen(true)
  }

  function openEdit(member: Member) {
    setEditing(member)
    setOpen(true)
  }

  function handleSaved(saved: Member, created: boolean) {
    setMembers((prev) => (created ? [saved, ...prev] : prev.map((m) => (m.id === saved.id ? saved : m))))
    setEditing(null)
    router.refresh()
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    const res = await fetch(`/api/members/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setMembers((prev) => prev.filter((m) => m.id !== id))
      router.refresh()
    }
    setDeletingId(null)
  }

  function handleExport() {
    const csv = toCsv([
      ['First Name', 'Last Name', 'Email', 'Phone', 'Status', 'Join Date'],
      ...filtered.map((m) => [m.first_name, m.last_name, m.email, m.phone, m.status, m.join_date]),
    ])
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
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
                <Upload className="h-4 w-4" /> Import
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport} disabled={members.length === 0}>
                <Download className="h-4 w-4" /> Export
              </Button>
              <Button size="sm" onClick={openCreate}>
                <UserPlus className="h-4 w-4" /> Add Member
              </Button>
            </div>
          )
        }
      />

      <ImportMembersDialog open={importOpen} onOpenChange={setImportOpen} onImported={handleImported} />

      {notice && (
        <div className="mb-4 rounded-lg bg-canopy-50 border border-canopy-200 px-4 py-3 text-sm text-canopy-800">{notice}</div>
      )}

      <MemberFormDialog open={open} onOpenChange={setOpen} member={editing} orgId={orgId} onSaved={handleSaved} />

      {onlyAddedSince && (
        <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-gray-600">
          <span>Showing people added this month.</span>
          <button
            onClick={() => { setOnlyAddedSince(null); dropQueryParams('added') }}
            className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200"
          >
            Show everyone <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {members.length <= 1 && !search && canEdit && (
        <div className="mb-6 rounded-xl border border-dashed border-gray-300 bg-white px-6 py-10 text-center">
          <Users className="mx-auto mb-3 h-10 w-10 text-canopy-600" />
          <h2 className="text-lg font-semibold text-gray-900">Bring in your people</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-gray-500">
            Import the spreadsheet you already keep, or add people one at a time. Volunteers who sign up for shifts
            are matched to these records by email.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Button onClick={() => setImportOpen(true)}><Upload className="h-4 w-4" /> Import a spreadsheet</Button>
            <Button variant="outline" onClick={openCreate}><UserPlus className="h-4 w-4" /> Add one person</Button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[12rem] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-canopy-600"
            placeholder="Search members..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-canopy-600"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      {/* Phones: one card per person, with the actions in reach */}
      <div className="space-y-2 sm:hidden">
        {filtered.length === 0 ? (
          <p className="rounded-xl border border-gray-200 bg-white px-4 py-10 text-center text-sm text-gray-400">
            {search || statusFilter !== 'all' || onlyAddedSince ? 'No members match these filters' : 'No members yet.'}
          </p>
        ) : (
          filtered.map((member) => (
            <div key={member.id} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3">
              <Link href={links.member(member.id)} className="flex min-w-0 flex-1 items-center gap-3">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-canopy-100 text-xs font-bold text-canopy-900">
                  {getInitials(`${member.first_name} ${member.last_name}`)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-gray-900">{member.first_name} {member.last_name}</p>
                  <p className="truncate text-xs text-gray-500">{member.email || member.phone || 'No contact details'}</p>
                </div>
              </Link>
              {member.status !== 'active' && (
                <Badge variant={statusVariant[member.status] || 'secondary'}>{member.status}</Badge>
              )}
              {canEdit && (
                <Button variant="ghost" size="sm" onClick={() => openEdit(member)} title="Edit">
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Table for wider screens */}
      <div className="hidden sm:block bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
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
                  {search || statusFilter !== 'all' || onlyAddedSince ? 'No members match these filters' : 'No members yet. Add your first member!'}
                </td>
              </tr>
            ) : (
              filtered.map((member) => (
                <tr
                  key={member.id}
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={(e) => {
                    // The whole row opens the person; buttons and links inside keep their own job.
                    if (!(e.target as HTMLElement).closest('a, button')) router.push(links.member(member.id))
                  }}
                >
                  <td className="px-4 py-3">
                    <Link href={links.member(member.id)} className="group flex items-center gap-3">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-canopy-100 text-xs font-bold text-canopy-900">
                        {getInitials(`${member.first_name} ${member.last_name}`)}
                      </div>
                      <span className="font-medium text-gray-900 group-hover:text-canopy-700 group-hover:underline">
                        {member.first_name} {member.last_name}
                      </span>
                    </Link>
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
