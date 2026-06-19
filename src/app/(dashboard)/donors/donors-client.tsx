'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, Heart, Pencil, Trash2, DollarSign, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { PageHeader } from '@/components/layout/page-header'
import type { Donor, Donation } from '@/types'

type DonorRow = Donor & { total_donated: number; donation_count: number }
type MemberOption = { id: string; first_name: string; last_name: string }

interface Props {
  initialDonors: DonorRow[]
  members: MemberOption[]
  orgId: string
  canEdit: boolean
  canDelete: boolean
}

const PAYMENT_METHODS = ['cash', 'cheque', 'bank_transfer', 'online', 'other']

const emptyDonorForm = {
  first_name: '', last_name: '', email: '', phone: '', address: '', notes: '', member_id: '', is_anonymous: false,
}
const emptyDonationForm = {
  amount: '', donated_at: new Date().toISOString().split('T')[0], method: 'cash', campaign: '', notes: '', receipt_number: '',
}

function formatCurrency(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })
}

export function DonorsClient({ initialDonors, members, orgId, canEdit, canDelete }: Props) {
  const router = useRouter()
  const [donors, setDonors] = useState<DonorRow[]>(initialDonors)
  const [search, setSearch] = useState('')
  const [donorOpen, setDonorOpen] = useState(false)
  const [donationOpen, setDonationOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [editingDonorId, setEditingDonorId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [donorForm, setDonorForm] = useState(emptyDonorForm)
  const [donationForm, setDonationForm] = useState(emptyDonationForm)
  const [activeDonor, setActiveDonor] = useState<DonorRow | null>(null)
  const [donations, setDonations] = useState<Donation[]>([])
  const [expandedDonorId, setExpandedDonorId] = useState<string | null>(null)
  const [loadingDonations, setLoadingDonations] = useState(false)

  const filtered = donors.filter((d) =>
    `${d.first_name} ${d.last_name} ${d.email ?? ''}`.toLowerCase().includes(search.toLowerCase())
  )

  const totalRaised = donors.reduce((s, d) => s + d.total_donated, 0)

  function openCreateDonor() {
    setEditingDonorId(null)
    setDonorForm(emptyDonorForm)
    setSaveError('')
    setDonorOpen(true)
  }

  function openEditDonor(d: DonorRow) {
    setEditingDonorId(d.id)
    setDonorForm({
      first_name: d.first_name, last_name: d.last_name, email: d.email || '',
      phone: d.phone || '', address: d.address || '', notes: d.notes || '',
      member_id: d.member_id || '', is_anonymous: d.is_anonymous,
    })
    setSaveError('')
    setDonorOpen(true)
  }

  async function saveDonor() {
    setSaving(true)
    setSaveError('')
    const res = await fetch(
      editingDonorId ? `/api/donors/${editingDonorId}` : '/api/donors',
      {
        method: editingDonorId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...donorForm, organization_id: orgId }),
      }
    )
    const data = await res.json().catch(() => ({}))
    if (res.ok) {
      if (editingDonorId) {
        setDonors((prev) => prev.map((d) => d.id === editingDonorId ? { ...d, ...data.donor } : d))
      } else {
        setDonors((prev) => [...prev, { ...data.donor, total_donated: 0, donation_count: 0 }])
      }
      setDonorOpen(false)
      router.refresh()
    } else {
      setSaveError(data.error || 'Could not save donor.')
    }
    setSaving(false)
  }

  async function deleteDonor(id: string) {
    setDeletingId(id)
    const res = await fetch(`/api/donors/${id}`, { method: 'DELETE' })
    if (res.ok) { setDonors((prev) => prev.filter((d) => d.id !== id)); router.refresh() }
    setDeletingId(null)
  }

  async function toggleDonorDonations(donor: DonorRow) {
    if (expandedDonorId === donor.id) { setExpandedDonorId(null); return }
    setExpandedDonorId(donor.id)
    setLoadingDonations(true)
    const res = await fetch(`/api/donations?donor_id=${donor.id}`)
    if (res.ok) { const { donations: d } = await res.json(); setDonations(d) }
    setLoadingDonations(false)
  }

  function openAddDonation(donor: DonorRow) {
    setActiveDonor(donor)
    setDonationForm({ ...emptyDonationForm, donated_at: new Date().toISOString().split('T')[0] })
    setSaveError('')
    setDonationOpen(true)
  }

  async function saveDonation() {
    if (!activeDonor) return
    setSaving(true)
    setSaveError('')
    const res = await fetch('/api/donations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...donationForm,
        amount: parseFloat(donationForm.amount),
        donor_id: activeDonor.id,
        organization_id: orgId,
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (res.ok) {
      const amount = parseFloat(donationForm.amount)
      setDonors((prev) => prev.map((d) =>
        d.id === activeDonor.id
          ? { ...d, total_donated: d.total_donated + amount, donation_count: d.donation_count + 1 }
          : d
      ))
      if (expandedDonorId === activeDonor.id) {
        setDonations((prev) => [data.donation, ...prev])
      }
      setDonationOpen(false)
      router.refresh()
    } else {
      setSaveError(data.error || 'Could not record donation.')
    }
    setSaving(false)
  }

  async function deleteDonation(id: string, amount: number, donorId: string) {
    const res = await fetch(`/api/donations/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setDonations((prev) => prev.filter((d) => d.id !== id))
      setDonors((prev) => prev.map((d) =>
        d.id === donorId ? { ...d, total_donated: d.total_donated - amount, donation_count: d.donation_count - 1 } : d
      ))
      router.refresh()
    }
  }

  return (
    <div>
      <PageHeader
        title="Donors & Giving"
        description="Track your donors and donation history"
        action={
          canEdit && (
            <Button size="sm" onClick={openCreateDonor}>
              <Plus className="h-4 w-4" /> Add Donor
            </Button>
          )
        }
      />

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">Total donors</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{donors.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">Total raised</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{formatCurrency(totalRaised)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 col-span-2 sm:col-span-1">
          <p className="text-xs text-gray-500">Avg. per donor</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {donors.length ? formatCurrency(totalRaised / donors.length) : '$0'}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#00C4F4]"
          placeholder="Search donors..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Donor list */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 py-16 text-center text-gray-400">
            <Heart className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p>{search ? 'No donors match your search' : 'No donors yet. Add your first donor!'}</p>
          </div>
        ) : (
          filtered.map((donor) => (
            <div key={donor.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
                  {donor.is_anonymous ? '?' : `${donor.first_name[0]}${donor.last_name[0]}`}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-gray-900">
                      {donor.is_anonymous ? 'Anonymous Donor' : `${donor.first_name} ${donor.last_name}`}
                    </p>
                    {donor.member_id && <Badge variant="secondary" className="text-xs">Member</Badge>}
                  </div>
                  {donor.email && <p className="text-xs text-gray-500">{donor.email}</p>}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-emerald-600">{formatCurrency(donor.total_donated)}</p>
                  <p className="text-xs text-gray-400">{donor.donation_count} gift{donor.donation_count !== 1 ? 's' : ''}</p>
                </div>
                <div className="flex items-center gap-1">
                  {canEdit && (
                    <>
                      <Button variant="ghost" size="sm" onClick={() => openAddDonation(donor)} title="Record donation">
                        <DollarSign className="h-4 w-4 text-emerald-600" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openEditDonor(donor)} title="Edit donor">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  {canDelete && (
                    <Button
                      variant="ghost" size="sm" loading={deletingId === donor.id}
                      onClick={() => { if (confirm(`Delete ${donor.first_name} ${donor.last_name}?`)) deleteDonor(donor.id) }}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => toggleDonorDonations(donor)}>
                    {expandedDonorId === donor.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {/* Donation history */}
              {expandedDonorId === donor.id && (
                <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
                  {loadingDonations ? (
                    <p className="text-sm text-gray-400">Loading…</p>
                  ) : donations.length === 0 ? (
                    <p className="text-sm text-gray-400">No donations recorded yet.</p>
                  ) : (
                    <div className="space-y-1">
                      {donations.map((don) => (
                        <div key={don.id} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-100 last:border-0">
                          <div>
                            <span className="font-medium text-gray-900">{formatCurrency(don.amount)}</span>
                            {don.campaign && <span className="text-gray-500 ml-2">· {don.campaign}</span>}
                            <span className="text-gray-400 ml-2 capitalize">via {don.method?.replace('_', ' ')}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-gray-400 text-xs">{new Date(don.donated_at).toLocaleDateString()}</span>
                            {canEdit && (
                              <button
                                onClick={() => { if (confirm('Delete this donation?')) deleteDonation(don.id, don.amount, donor.id) }}
                                className="text-red-400 hover:text-red-600"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Donor dialog */}
      <Dialog open={donorOpen} onOpenChange={setDonorOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingDonorId ? 'Edit Donor' : 'Add Donor'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input label="First name *" value={donorForm.first_name} onChange={(e) => setDonorForm({ ...donorForm, first_name: e.target.value })} />
              <Input label="Last name *" value={donorForm.last_name} onChange={(e) => setDonorForm({ ...donorForm, last_name: e.target.value })} />
            </div>
            <Input label="Email" type="email" value={donorForm.email} onChange={(e) => setDonorForm({ ...donorForm, email: e.target.value })} />
            <Input label="Phone" value={donorForm.phone} onChange={(e) => setDonorForm({ ...donorForm, phone: e.target.value })} />
            <Select value={donorForm.member_id} onValueChange={(v) => setDonorForm({ ...donorForm, member_id: v === '__none__' ? '' : v })}>
              <SelectTrigger label="Linked member (optional)">
                <SelectValue placeholder="Not a member" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Not a member</SelectItem>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.first_name} {m.last_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea label="Notes" value={donorForm.notes} onChange={(e) => setDonorForm({ ...donorForm, notes: e.target.value })} rows={2} />
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" checked={donorForm.is_anonymous} onChange={(e) => setDonorForm({ ...donorForm, is_anonymous: e.target.checked })} className="rounded" />
              Keep donor anonymous
            </label>
          </div>
          {saveError && <div className="mt-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{saveError}</div>}
          <div className="flex gap-3 mt-4">
            <Button variant="outline" onClick={() => setDonorOpen(false)} className="flex-1">Cancel</Button>
            <Button onClick={saveDonor} loading={saving} disabled={!donorForm.first_name || !donorForm.last_name} className="flex-1">
              {editingDonorId ? 'Save Changes' : 'Add Donor'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Record Donation dialog */}
      <Dialog open={donationOpen} onOpenChange={setDonationOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Record Donation — {activeDonor?.first_name} {activeDonor?.last_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input label="Amount *" type="number" min="0" step="0.01" placeholder="0.00" value={donationForm.amount} onChange={(e) => setDonationForm({ ...donationForm, amount: e.target.value })} />
            <Input label="Date *" type="date" value={donationForm.donated_at} onChange={(e) => setDonationForm({ ...donationForm, donated_at: e.target.value })} />
            <Select value={donationForm.method} onValueChange={(v) => setDonationForm({ ...donationForm, method: v })}>
              <SelectTrigger label="Payment method">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m} value={m}>{m.replace('_', ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input label="Campaign" placeholder="e.g. Annual Fundraiser 2025" value={donationForm.campaign} onChange={(e) => setDonationForm({ ...donationForm, campaign: e.target.value })} />
            <Input label="Receipt #" placeholder="Optional" value={donationForm.receipt_number} onChange={(e) => setDonationForm({ ...donationForm, receipt_number: e.target.value })} />
            <Textarea label="Notes" value={donationForm.notes} onChange={(e) => setDonationForm({ ...donationForm, notes: e.target.value })} rows={2} />
          </div>
          {saveError && <div className="mt-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{saveError}</div>}
          <div className="flex gap-3 mt-4">
            <Button variant="outline" onClick={() => setDonationOpen(false)} className="flex-1">Cancel</Button>
            <Button onClick={saveDonation} loading={saving} disabled={!donationForm.amount || !donationForm.donated_at} className="flex-1">Record Gift</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
