'use client'

import { useState, useEffect, useCallback } from 'react'
import { UserPlus, Pencil, Trash2, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PageHeader } from '@/components/layout/page-header'
import { getSubscriptionLabel, formatDate, getInitials } from '@/lib/utils'
import type { Organization, Profile } from '@/types'

interface StaffMember {
  id: string
  email: string
  full_name: string
  role: string
  created_at: string
  is_active: boolean
}

interface Props {
  org: Organization
  profile: Profile
  isAdmin: boolean
}

export function SettingsClient({ org, profile, isAdmin }: Props) {
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

  // Staff management state
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [staffLoaded, setStaffLoaded] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'org_leader' })
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [inviteSuccess, setInviteSuccess] = useState('')
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null)
  const [newRole, setNewRole] = useState('')
  const [savingRole, setSavingRole] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)

  const loadStaff = useCallback(async () => {
    const res = await fetch('/api/staff')
    if (res.ok) {
      const { staff: data } = await res.json()
      setStaff(data)
      setStaffLoaded(true)
    }
  }, [])

  useEffect(() => {
    if (isAdmin) loadStaff()
  }, [isAdmin, loadStaff])

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
      setInviteSuccess(`Invitation sent to ${inviteForm.email}. They will receive a link to set up their account.`)
      setInviteForm({ email: '', role: 'org_leader' })
      loadStaff()
    } else {
      setInviteError(data.error || 'Could not send invitation. Try again.')
    }
    setInviting(false)
  }

  async function handleChangeRole() {
    if (!editingStaff) return
    setSavingRole(true)
    const res = await fetch(`/api/staff/${editingStaff.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole }),
    })
    if (res.ok) {
      setStaff((prev) => prev.map((s) => (s.id === editingStaff.id ? { ...s, role: newRole } : s)))
      setEditingStaff(null)
    }
    setSavingRole(false)
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

  const subLabel = getSubscriptionLabel(org.subscription_status, org.trial_ends_at)
  const hasStripe = !!org.stripe_customer_id

  return (
    <div>
      <PageHeader title="Settings" description="Manage your organization and billing" />

      <div className="space-y-6 max-w-2xl">
        {/* Organization details */}
        <Card>
          <CardHeader>
            <CardTitle>Organization Profile</CardTitle>
            <CardDescription>Update your organization&apos;s public information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Organization name"
              value={orgForm.name}
              onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })}
            />
            <Textarea
              label="Description"
              value={orgForm.description}
              onChange={(e) => setOrgForm({ ...orgForm, description: e.target.value })}
              rows={2}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Website"
                type="url"
                value={orgForm.website}
                onChange={(e) => setOrgForm({ ...orgForm, website: e.target.value })}
              />
              <Input
                label="Phone"
                value={orgForm.phone}
                onChange={(e) => setOrgForm({ ...orgForm, phone: e.target.value })}
              />
            </div>
            <Input
              label="Address"
              value={orgForm.address}
              onChange={(e) => setOrgForm({ ...orgForm, address: e.target.value })}
            />
            <Button onClick={saveOrg} loading={saving}>
              {saved ? '✓ Saved' : 'Save Changes'}
            </Button>
          </CardContent>
        </Card>

        {/* Billing */}
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
              <Badge
                variant={
                  org.subscription_status === 'active'
                    ? 'default'
                    : org.subscription_status === 'trialing'
                    ? 'warning'
                    : 'destructive'
                }
              >
                {subLabel}
              </Badge>
            </div>

            {billingError && (
              <div className="mb-3 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {billingError}
              </div>
            )}

            {org.subscription_status === 'active' ? (
              <Button variant="outline" onClick={manageSubscription} loading={billingLoading}>
                Manage Subscription
              </Button>
            ) : (
              <Button onClick={startSubscription} loading={billingLoading}>
                Upgrade to Paid Plan
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Staff accounts — org_admin only */}
        {isAdmin && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Staff Accounts</CardTitle>
                  <CardDescription>Invite people who need dashboard access and manage their roles</CardDescription>
                </div>
                <Button size="sm" onClick={() => { setInviteOpen(true); setInviteError(''); setInviteSuccess('') }}>
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
                    <p className="text-sm text-gray-500">
                      They&apos;ll receive an email with a link to set a password and access the dashboard.
                    </p>
                    <Input
                      label="Email address *"
                      type="email"
                      value={inviteForm.email}
                      onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                      placeholder="pastor@church.org"
                    />
                    <Select value={inviteForm.role} onValueChange={(v) => setInviteForm({ ...inviteForm, role: v })}>
                      <SelectTrigger label="Role">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="org_leader">
                          <div>
                            <div className="font-medium">Org Leader</div>
                            <div className="text-xs text-gray-500">Can manage members, teams, events, announcements. Cannot delete members or access billing.</div>
                          </div>
                        </SelectItem>
                        <SelectItem value="org_admin">
                          <div>
                            <div className="font-medium">Org Admin</div>
                            <div className="text-xs text-gray-500">Full access — same as you. Can also invite staff and manage billing.</div>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {inviteError && (
                    <div className="mt-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{inviteError}</div>
                  )}
                  {inviteSuccess && (
                    <div className="mt-2 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">{inviteSuccess}</div>
                  )}
                  <div className="flex gap-3 mt-4">
                    <Button variant="outline" onClick={() => setInviteOpen(false)} className="flex-1">Cancel</Button>
                    <Button onClick={handleInvite} loading={inviting} disabled={!inviteForm.email} className="flex-1">
                      <Mail className="h-4 w-4" /> Send Invitation
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Change role dialog */}
              <Dialog open={!!editingStaff} onOpenChange={(v) => { if (!v) setEditingStaff(null) }}>
                <DialogContent className="max-w-sm">
                  <DialogHeader><DialogTitle>Change Role — {editingStaff?.email}</DialogTitle></DialogHeader>
                  <Select value={newRole} onValueChange={setNewRole}>
                    <SelectTrigger label="New role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="org_leader">Org Leader</SelectItem>
                      <SelectItem value="org_admin">Org Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex gap-3 mt-4">
                    <Button variant="outline" onClick={() => setEditingStaff(null)} className="flex-1">Cancel</Button>
                    <Button onClick={handleChangeRole} loading={savingRole} className="flex-1">Save</Button>
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
                      <Badge variant={s.role === 'org_admin' ? 'default' : 'secondary'}>
                        {s.role === 'org_admin' ? 'Admin' : 'Leader'}
                      </Badge>
                      {s.id !== profile.id && (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Change role"
                            onClick={() => { setEditingStaff(s); setNewRole(s.role) }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Remove"
                            loading={removingId === s.id}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleRemoveStaff(s.id, s.email)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                      {s.id === profile.id && (
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
          <CardHeader>
            <CardTitle>Your Account</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Email</span>
                <span className="text-gray-900">{profile.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Role</span>
                <Badge variant="secondary">{profile.role.replace('_', ' ')}</Badge>
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
