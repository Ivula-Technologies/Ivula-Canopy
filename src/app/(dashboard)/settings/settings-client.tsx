'use client'

import { useState, useEffect, useCallback } from 'react'
import { UserPlus, Pencil, Trash2, Mail, Plus, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PageHeader } from '@/components/layout/page-header'
import { getSubscriptionLabel, formatDate, getInitials } from '@/lib/utils'
import { PERMISSION_META, PERMISSION_KEYS, type PermissionKey } from '@/lib/permissions'
import type { Organization, Profile } from '@/types'

interface StaffMember {
  id: string
  email: string
  full_name: string
  role_id: string | null
  role_name: string
  created_at: string
  is_active: boolean
}

interface Role {
  id: string
  name: string
  description: string
  is_system: boolean
  manage_members: boolean
  delete_members: boolean
  manage_teams: boolean
  manage_events: boolean
  manage_announcements: boolean
  manage_billing: boolean
  manage_staff: boolean
}

interface Props {
  org: Organization
  profile: Profile
  canManageStaff: boolean
  canManageBilling: boolean
}

const emptyRoleForm = {
  name: '',
  description: '',
  manage_members: false,
  delete_members: false,
  manage_teams: false,
  manage_events: false,
  manage_announcements: false,
  manage_billing: false,
  manage_staff: false,
}

export function SettingsClient({ org, profile, canManageStaff, canManageBilling }: Props) {
  const [orgForm, setOrgForm] = useState({
    name: org.name,
    description: org.description || '',
    website: org.website || '',
    phone: org.phone || '',
    address: org.address || '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [billingLoading, setBillingLoading] = useState(false)
  const [billingError, setBillingError] = useState('')

  // Roles state
  const [roles, setRoles] = useState<Role[]>([])
  const [roleDialogOpen, setRoleDialogOpen] = useState(false)
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null)
  const [roleForm, setRoleForm] = useState(emptyRoleForm)
  const [savingRole, setSavingRole] = useState(false)
  const [roleError, setRoleError] = useState('')

  // Staff state
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [staffLoaded, setStaffLoaded] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteForm, setInviteForm] = useState({ email: '', role_id: '' })
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [inviteSuccess, setInviteSuccess] = useState('')
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null)
  const [newRoleId, setNewRoleId] = useState('')
  const [savingStaffRole, setSavingStaffRole] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)

  const loadRoles = useCallback(async () => {
    const res = await fetch('/api/roles')
    if (res.ok) setRoles((await res.json()).roles)
  }, [])

  const loadStaff = useCallback(async () => {
    const res = await fetch('/api/staff')
    if (res.ok) {
      setStaff((await res.json()).staff)
      setStaffLoaded(true)
    }
  }, [])

  useEffect(() => {
    if (canManageStaff) { loadRoles(); loadStaff() }
  }, [canManageStaff, loadRoles, loadStaff])

  // --- Roles ---
  function openCreateRole() {
    setEditingRoleId(null)
    setRoleForm(emptyRoleForm)
    setRoleError('')
    setRoleDialogOpen(true)
  }

  function openEditRole(r: Role) {
    setEditingRoleId(r.id)
    setRoleForm({
      name: r.name,
      description: r.description || '',
      manage_members: r.manage_members,
      delete_members: r.delete_members,
      manage_teams: r.manage_teams,
      manage_events: r.manage_events,
      manage_announcements: r.manage_announcements,
      manage_billing: r.manage_billing,
      manage_staff: r.manage_staff,
    })
    setRoleError('')
    setRoleDialogOpen(true)
  }

  async function handleSaveRole() {
    setSavingRole(true)
    setRoleError('')
    const res = await fetch(editingRoleId ? `/api/roles/${editingRoleId}` : '/api/roles', {
      method: editingRoleId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(roleForm),
    })
    const data = await res.json().catch(() => ({}))
    if (res.ok) {
      await loadRoles()
      setRoleDialogOpen(false)
    } else {
      setRoleError(data.error || 'Could not save role.')
    }
    setSavingRole(false)
  }

  async function handleDeleteRole(r: Role) {
    if (!confirm(`Delete the "${r.name}" role? People with this role will lose its permissions.`)) return
    const res = await fetch(`/api/roles/${r.id}`, { method: 'DELETE' })
    if (res.ok) { await loadRoles(); await loadStaff() }
    else alert((await res.json().catch(() => ({}))).error || 'Could not delete role.')
  }

  // --- Staff ---
  async function handleInvite() {
    setInviting(true)
    setInviteError('')
    setInviteSuccess('')
    const res = await fetch('/api/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inviteForm),
    })
    const data = await res.json().catch(() => ({}))
    if (res.ok) {
      setInviteSuccess(`Invitation sent to ${inviteForm.email}. They'll get a link to set up their account.`)
      setInviteForm({ email: '', role_id: '' })
      loadStaff()
    } else {
      setInviteError(data.error || 'Could not send invitation. Try again.')
    }
    setInviting(false)
  }

  async function handleChangeStaffRole() {
    if (!editingStaff) return
    setSavingStaffRole(true)
    const res = await fetch(`/api/staff/${editingStaff.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role_id: newRoleId }),
    })
    if (res.ok) {
      const roleName = roles.find((r) => r.id === newRoleId)?.name || ''
      setStaff((prev) => prev.map((s) => (s.id === editingStaff.id ? { ...s, role_id: newRoleId, role_name: roleName } : s)))
      setEditingStaff(null)
    }
    setSavingStaffRole(false)
  }

  async function handleRemoveStaff(id: string, email: string) {
    if (!confirm(`Remove ${email} from your organization? They will lose dashboard access.`)) return
    setRemovingId(id)
    const res = await fetch(`/api/staff/${id}`, { method: 'DELETE' })
    if (res.ok) setStaff((prev) => prev.filter((s) => s.id !== id))
    setRemovingId(null)
  }

  async function saveOrg() {
    setSaving(true)
    await fetch(`/api/organizations/${org.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orgForm),
    })
    setSaved(true)
    setSaving(false)
    setTimeout(() => setSaved(false), 2000)
  }

  async function manageSubscription() {
    setBillingLoading(true)
    setBillingError('')
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.url) throw new Error(data.error || 'Could not open billing portal')
      window.location.href = data.url
    } catch (e) {
      setBillingError(e instanceof Error ? e.message : 'Something went wrong')
      setBillingLoading(false)
    }
  }

  async function startSubscription() {
    setBillingLoading(true)
    setBillingError('')
    try {
      const res = await fetch('/api/stripe/checkout', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.url) throw new Error(data.error || 'Could not start checkout')
      window.location.href = data.url
    } catch (e) {
      setBillingError(e instanceof Error ? e.message : 'Something went wrong')
      setBillingLoading(false)
    }
  }

  function permCount(r: Role) {
    return PERMISSION_KEYS.filter((k) => r[k]).length
  }

  const subLabel = getSubscriptionLabel(org.subscription_status, org.trial_ends_at)

  return (
    <div>
      <PageHeader title="Settings" description="Manage your organization, roles and billing" />

      <div className="space-y-6 max-w-2xl">
        {/* Organization details */}
        <Card>
          <CardHeader>
            <CardTitle>Organization Profile</CardTitle>
            <CardDescription>Update your organization&apos;s public information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input label="Organization name" value={orgForm.name} onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })} />
            <Textarea label="Description" value={orgForm.description} onChange={(e) => setOrgForm({ ...orgForm, description: e.target.value })} rows={2} />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Website" type="url" value={orgForm.website} onChange={(e) => setOrgForm({ ...orgForm, website: e.target.value })} />
              <Input label="Phone" value={orgForm.phone} onChange={(e) => setOrgForm({ ...orgForm, phone: e.target.value })} />
            </div>
            <Input label="Address" value={orgForm.address} onChange={(e) => setOrgForm({ ...orgForm, address: e.target.value })} />
            <Button onClick={saveOrg} loading={saving}>{saved ? '✓ Saved' : 'Save Changes'}</Button>
          </CardContent>
        </Card>

        {/* Billing — only if the role allows it */}
        {canManageBilling && (
          <Card>
            <CardHeader>
              <CardTitle>Billing & Subscription</CardTitle>
              <CardDescription>Manage your plan and payment method</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4 p-4 rounded-lg bg-gray-50">
                <div>
                  <p className="font-medium text-gray-900">Current plan</p>
                  <p className="text-sm text-gray-500">
                    {org.subscription_status === 'active'
                      ? `Renews ${org.current_period_end ? formatDate(org.current_period_end) : 'monthly'}`
                      : org.trial_ends_at
                      ? `Trial ends ${formatDate(org.trial_ends_at)}`
                      : 'No active subscription'}
                  </p>
                </div>
                <Badge variant={org.subscription_status === 'active' ? 'default' : org.subscription_status === 'trialing' ? 'warning' : 'destructive'}>
                  {subLabel}
                </Badge>
              </div>
              {billingError && (
                <div className="mb-3 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{billingError}</div>
              )}
              {org.subscription_status === 'active' ? (
                <Button variant="outline" onClick={manageSubscription} loading={billingLoading}>Manage Subscription</Button>
              ) : (
                <Button onClick={startSubscription} loading={billingLoading}>Upgrade to Paid Plan</Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Roles — manage_staff only */}
        {canManageStaff && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Roles & Permissions</CardTitle>
                  <CardDescription>Define what each role in your organization can do</CardDescription>
                </div>
                <Button size="sm" variant="outline" onClick={openCreateRole}><Plus className="h-4 w-4" /> New Role</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-gray-100">
                {roles.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 py-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-100 text-[#1B2559] flex-shrink-0">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900">{r.name}</p>
                        {r.is_system && <Badge variant="secondary" className="text-xs">System</Badge>}
                      </div>
                      <p className="text-xs text-gray-500">
                        {permCount(r) === PERMISSION_KEYS.length ? 'Full access' : permCount(r) === 0 ? 'View only' : `${permCount(r)} permission${permCount(r) !== 1 ? 's' : ''}`}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" title="Edit role" onClick={() => openEditRole(r)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {!r.is_system && (
                      <Button variant="ghost" size="sm" title="Delete role" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDeleteRole(r)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Role create/edit dialog */}
        <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>{editingRoleId ? 'Edit Role' : 'New Role'}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <Input label="Role name *" placeholder="e.g. Elder, Deacon, Usher" value={roleForm.name} onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })} />
              <Input label="Description" value={roleForm.description} onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })} />
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Permissions</p>
                <p className="text-xs text-gray-500 mb-3">Leave all unchecked for a view-only role.</p>
                <div className="space-y-2">
                  {PERMISSION_META.map((p) => (
                    <label key={p.key} className="flex items-start gap-2 text-sm cursor-pointer rounded-lg px-2 py-1.5 hover:bg-gray-50">
                      <input
                        type="checkbox"
                        className="rounded mt-0.5"
                        checked={roleForm[p.key as PermissionKey]}
                        onChange={(e) => setRoleForm({ ...roleForm, [p.key]: e.target.checked })}
                      />
                      <span>
                        <span className="font-medium text-gray-800">{p.label}</span>
                        <span className="block text-xs text-gray-500">{p.description}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            {roleError && <div className="mt-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{roleError}</div>}
            <div className="flex gap-3 mt-4">
              <Button variant="outline" onClick={() => setRoleDialogOpen(false)} className="flex-1">Cancel</Button>
              <Button onClick={handleSaveRole} loading={savingRole} disabled={!roleForm.name.trim()} className="flex-1">
                {editingRoleId ? 'Save Role' : 'Create Role'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Staff accounts — manage_staff only */}
        {canManageStaff && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Staff Accounts</CardTitle>
                  <CardDescription>Invite people who need dashboard access and assign their role</CardDescription>
                </div>
                <Button size="sm" onClick={() => { setInviteOpen(true); setInviteError(''); setInviteSuccess(''); setInviteForm({ email: '', role_id: roles.find((r) => !r.is_system)?.id || roles[0]?.id || '' }) }}>
                  <UserPlus className="h-4 w-4" /> Invite Staff
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Invite dialog */}
              <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
                <DialogContent className="max-w-md">
                  <DialogHeader><DialogTitle>Invite Staff Member</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <p className="text-sm text-gray-500">They&apos;ll receive an email with a link to set a password and access the dashboard.</p>
                    <Input label="Email address *" type="email" value={inviteForm.email} onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })} placeholder="pastor@church.org" />
                    <Select value={inviteForm.role_id} onValueChange={(v) => setInviteForm({ ...inviteForm, role_id: v })}>
                      <SelectTrigger label="Role">
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map((r) => (
                          <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {inviteError && <div className="mt-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{inviteError}</div>}
                  {inviteSuccess && <div className="mt-2 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">{inviteSuccess}</div>}
                  <div className="flex gap-3 mt-4">
                    <Button variant="outline" onClick={() => setInviteOpen(false)} className="flex-1">Cancel</Button>
                    <Button onClick={handleInvite} loading={inviting} disabled={!inviteForm.email || !inviteForm.role_id} className="flex-1">
                      <Mail className="h-4 w-4" /> Send Invitation
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Change staff role dialog */}
              <Dialog open={!!editingStaff} onOpenChange={(v) => { if (!v) setEditingStaff(null) }}>
                <DialogContent className="max-w-sm">
                  <DialogHeader><DialogTitle>Change Role — {editingStaff?.email}</DialogTitle></DialogHeader>
                  <Select value={newRoleId} onValueChange={setNewRoleId}>
                    <SelectTrigger label="New role">
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((r) => (
                        <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex gap-3 mt-4">
                    <Button variant="outline" onClick={() => setEditingStaff(null)} className="flex-1">Cancel</Button>
                    <Button onClick={handleChangeStaffRole} loading={savingStaffRole} disabled={!newRoleId} className="flex-1">Save</Button>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Staff list */}
              {!staffLoaded ? (
                <p className="text-sm text-gray-400">Loading…</p>
              ) : staff.length === 0 ? (
                <p className="text-sm text-gray-400">No other staff yet. Invite someone above.</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {staff.map((s) => (
                    <div key={s.id} className="flex items-center gap-3 py-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-100 text-xs font-bold text-[#1B2559] flex-shrink-0">
                        {s.full_name ? getInitials(s.full_name) : s.email[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {s.full_name || <span className="text-gray-400 italic">Pending</span>}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{s.email}</p>
                      </div>
                      <Badge variant="secondary">{s.role_name}</Badge>
                      {s.id !== profile.id ? (
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" title="Change role" onClick={() => { setEditingStaff(s); setNewRoleId(s.role_id || '') }}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" title="Remove" loading={removingId === s.id} className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleRemoveStaff(s.id, s.email)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 italic">You</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Account info */}
        <Card>
          <CardHeader><CardTitle>Your Account</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Email</span>
                <span className="text-gray-900">{profile.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Member since</span>
                <span className="text-gray-900">{formatDate(profile.created_at)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
