'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { Member } from '@/types'

const emptyForm = {
  first_name: '', last_name: '', email: '', phone: '',
  status: 'active', notes: '', gender: '', address: '',
}

function formFor(member: Member | null) {
  if (!member) return emptyForm
  return {
    first_name: member.first_name || '',
    last_name: member.last_name || '',
    email: member.email || '',
    phone: member.phone || '',
    status: member.status || 'active',
    notes: member.notes || '',
    gender: member.gender || '',
    address: member.address || '',
  }
}

/** Add a person, or edit one when `member` is given. Used on the members list and on a person's page. */
export function MemberFormDialog({
  open,
  onOpenChange,
  member,
  orgId,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  member: Member | null
  orgId: string
  onSaved: (member: Member, created: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{member ? 'Edit Member' : 'Add New Member'}</DialogTitle>
        </DialogHeader>
        {/* Mounted only while open, so each opening starts from the person it opened on. */}
        <MemberForm member={member} orgId={orgId} onSaved={onSaved} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}

function MemberForm({
  member,
  orgId,
  onSaved,
  onClose,
}: {
  member: Member | null
  orgId: string
  onSaved: (member: Member, created: boolean) => void
  onClose: () => void
}) {
  const [form, setForm] = useState(() => formFor(member))
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  async function handleSave() {
    setSaving(true)
    setSaveError('')
    const res = await fetch(member ? `/api/members/${member.id}` : '/api/members', {
      method: member ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, organization_id: orgId }),
    })
    const data = await res.json().catch(() => ({}))
    setSaving(false)
    if (res.ok && data.member) {
      onSaved(data.member, !member)
      onClose()
    } else {
      setSaveError(data.error || 'Could not save member. Please try again.')
    }
  }

  return (
    <>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="First name *" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
          <Input label="Last name *" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
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
        <Input label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        <Textarea label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
        {saveError && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{saveError}</div>
        )}
        <div className="flex gap-3 mt-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSave} loading={saving} disabled={!form.first_name || !form.last_name} className="flex-1">
            {member ? 'Save Changes' : 'Add Member'}
          </Button>
        </div>
    </>
  )
}

/** The Edit button on a person's page: opens the same form and reloads the page after saving. */
export function EditMemberButton({ member, orgId, children }: { member: Member; orgId: string; children: React.ReactNode }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>{children}</Button>
      <MemberFormDialog
        open={open}
        onOpenChange={setOpen}
        member={member}
        orgId={orgId}
        onSaved={() => router.refresh()}
      />
    </>
  )
}
