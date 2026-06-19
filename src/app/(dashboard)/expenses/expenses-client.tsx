'use client'

import { useState } from 'react'
import { Plus, Trash2, Search, Receipt } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { PageHeader } from '@/components/layout/page-header'
import type { Expense } from '@/types'

const CATEGORIES = ['program', 'operations', 'staffing', 'travel', 'supplies', 'other']

const CATEGORY_COLORS: Record<string, string> = {
  program: 'bg-blue-100 text-blue-700',
  operations: 'bg-purple-100 text-purple-700',
  staffing: 'bg-cyan-100 text-cyan-700',
  travel: 'bg-orange-100 text-orange-700',
  supplies: 'bg-emerald-100 text-emerald-700',
  other: 'bg-gray-100 text-gray-700',
}

const emptyForm = { title: '', amount: '', category: 'other', expense_date: new Date().toISOString().slice(0, 10), paid_to: '', notes: '', event_id: '' }

interface Props {
  initialExpenses: (Expense & { event?: { title: string } | null })[]
  events: { id: string; title: string }[]
  canEdit: boolean
}

export function ExpensesClient({ initialExpenses, events, canEdit }: Props) {
  const [expenses, setExpenses] = useState(initialExpenses)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState<string | null>(null)

  const filtered = expenses.filter((e) => {
    const matchSearch = `${e.title} ${e.paid_to || ''} ${e.notes || ''}`.toLowerCase().includes(search.toLowerCase())
    const matchCat = categoryFilter === 'all' || e.category === categoryFilter
    return matchSearch && matchCat
  })

  const total = filtered.reduce((s, e) => s + Number(e.amount), 0)
  const totalAll = expenses.reduce((s, e) => s + Number(e.amount), 0)

  function openAdd() { setForm(emptyForm); setEditId(null); setError(''); setOpen(true) }
  function openEdit(exp: Expense) {
    setForm({ title: exp.title, amount: String(exp.amount), category: exp.category, expense_date: exp.expense_date, paid_to: exp.paid_to || '', notes: exp.notes || '', event_id: exp.event_id || '' })
    setEditId(exp.id); setError(''); setOpen(true)
  }

  async function handleSave() {
    if (!form.title || !form.amount) { setError('Title and amount are required.'); return }
    setSaving(true); setError('')
    const body = { ...form, amount: parseFloat(form.amount), event_id: form.event_id || null }
    const url = editId ? `/api/expenses/${editId}` : '/api/expenses'
    const method = editId ? 'PATCH' : 'POST'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const data = await res.json().catch(() => ({}))
    if (res.ok) {
      if (editId) setExpenses((prev) => prev.map((e) => e.id === editId ? data.expense : e))
      else setExpenses((prev) => [data.expense, ...prev])
      setOpen(false)
    } else { setError(data.error || 'Something went wrong.') }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this expense?')) return
    const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' })
    if (res.ok) setExpenses((prev) => prev.filter((e) => e.id !== id))
  }

  function exportCSV() {
    const rows = [
      ['Title', 'Amount', 'Category', 'Date', 'Paid To', 'Event', 'Notes'].join(','),
      ...expenses.map((e) => [e.title, e.amount, e.category, e.expense_date, e.paid_to || '', (e.event as { title: string } | null)?.title || '', e.notes || ''].join(','))
    ].join('\n')
    const url = URL.createObjectURL(new Blob([rows], { type: 'text/csv' }))
    const a = document.createElement('a'); a.href = url; a.download = 'expenses.csv'; a.click()
  }

  return (
    <div>
      <PageHeader
        title="Expenses"
        description="Track spending across your organization"
        action={canEdit ? <Button onClick={openAdd}><Plus className="h-4 w-4" /> Add Expense</Button> : undefined}
      />

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Total Expenses</p>
          <p className="text-2xl font-bold text-gray-900">${totalAll.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Records</p>
          <p className="text-2xl font-bold text-gray-900">{expenses.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 col-span-2 sm:col-span-1">
          <p className="text-xs text-gray-500 mb-1">Filtered Total</p>
          <p className="text-2xl font-bold text-[#00C4F4]">${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#00C4F4]" placeholder="Search expenses..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="rounded-lg border border-gray-300 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#00C4F4]" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="all">All categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
        </select>
        <Button variant="outline" size="sm" onClick={exportCSV}>Export CSV</Button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <Receipt className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No expenses yet.</p>
            {canEdit && <Button variant="link" size="sm" className="mt-1" onClick={openAdd}>Add your first expense →</Button>}
          </div>
        ) : (
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs text-gray-500">
                <th className="text-left px-4 py-3 font-medium">Title</th>
                <th className="text-left px-4 py-3 font-medium">Category</th>
                <th className="text-left px-4 py-3 font-medium">Date</th>
                <th className="text-left px-4 py-3 font-medium">Paid To</th>
                <th className="text-left px-4 py-3 font-medium">Event</th>
                <th className="text-right px-4 py-3 font-medium">Amount</th>
                {canEdit && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((exp) => (
                <tr key={exp.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => canEdit && openEdit(exp)}>
                  <td className="px-4 py-3 font-medium text-gray-900">{exp.title}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[exp.category] || CATEGORY_COLORS.other}`}>
                      {exp.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{new Date(exp.expense_date).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-gray-500">{exp.paid_to || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{(exp.event as { title: string } | null)?.title || '—'}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">${Number(exp.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  {canEdit && (
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => handleDelete(exp.id)} className="text-gray-400 hover:text-red-500 p-1"><Trash2 className="h-4 w-4" /></button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editId ? 'Edit Expense' : 'Add Expense'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Input label="Title *" placeholder="e.g. Venue deposit" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Amount (USD) *" type="number" min="0" step="0.01" placeholder="0.00" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select className="w-full rounded-lg border border-gray-300 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#00C4F4]" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Date *" type="date" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} />
              <Input label="Paid To" placeholder="Vendor name" value={form.paid_to} onChange={(e) => setForm({ ...form, paid_to: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Link to Event (optional)</label>
              <select className="w-full rounded-lg border border-gray-300 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#00C4F4]" value={form.event_id} onChange={(e) => setForm({ ...form, event_id: e.target.value })}>
                <option value="">— No event —</option>
                {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
              </select>
            </div>
            <Input label="Notes" placeholder="Optional notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          {error && <div className="mt-3 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}
          <div className="flex gap-3 mt-4">
            <Button variant="outline" onClick={() => setOpen(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleSave} loading={saving} className="flex-1">{editId ? 'Save Changes' : 'Add Expense'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
