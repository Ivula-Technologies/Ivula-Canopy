'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, CheckSquare, Pencil, Trash2, Circle, Clock, AlertTriangle, ChevronDown, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { PageHeader } from '@/components/layout/page-header'
import type { Task, TaskStatus, TaskPriority } from '@/types'

type TaskRow = Task & {
  team?: { name: string } | null
  assigned_to?: { first_name: string; last_name: string } | null
}
type MemberOption = { id: string; first_name: string; last_name: string }
type TeamOption = { id: string; name: string }

interface Props {
  initialTasks: TaskRow[]
  teams: TeamOption[]
  members: MemberOption[]
  orgId: string
  canEdit: boolean
}

const PRIORITY_META: Record<TaskPriority, { label: string; color: string }> = {
  low:    { label: 'Low',    color: 'bg-gray-100 text-gray-600' },
  medium: { label: 'Medium', color: 'bg-blue-100 text-blue-700' },
  high:   { label: 'High',   color: 'bg-orange-100 text-orange-700' },
  urgent: { label: 'Urgent', color: 'bg-red-100 text-red-700' },
}

const STATUS_COLS: { key: TaskStatus; label: string; icon: React.ReactNode }[] = [
  { key: 'todo',        label: 'To Do',       icon: <Circle className="h-4 w-4 text-gray-400" /> },
  { key: 'in_progress', label: 'In Progress', icon: <Clock  className="h-4 w-4 text-blue-500" /> },
  { key: 'done',        label: 'Done',        icon: <CheckSquare className="h-4 w-4 text-emerald-500" /> },
]

const emptyForm = {
  title: '', description: '', priority: 'medium' as TaskPriority,
  status: 'todo' as TaskStatus, due_date: '', team_id: '', assigned_to_member_id: '',
}

function isOverdue(task: TaskRow) {
  return task.due_date && task.status !== 'done' && new Date(task.due_date) < new Date()
}

export function TasksClient({ initialTasks, teams, members, orgId, canEdit }: Props) {
  const router = useRouter()
  const [tasks, setTasks] = useState<TaskRow[]>(initialTasks)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [filter, setFilter] = useState<TaskStatus | 'all'>('all')
  const [collapsedDone, setCollapsedDone] = useState(true)

  const todo       = tasks.filter((t) => t.status === 'todo')
  const inProgress = tasks.filter((t) => t.status === 'in_progress')
  const done       = tasks.filter((t) => t.status === 'done')

  const counts = { todo: todo.length, in_progress: inProgress.length, done: done.length }

  function openCreate() {
    setEditingId(null)
    setForm(emptyForm)
    setSaveError('')
    setOpen(true)
  }

  function openEdit(task: TaskRow) {
    setEditingId(task.id)
    setForm({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      status: task.status,
      due_date: task.due_date || '',
      team_id: task.team_id || '',
      assigned_to_member_id: task.assigned_to_member_id || '',
    })
    setSaveError('')
    setOpen(true)
  }

  async function handleSave() {
    setSaving(true)
    setSaveError('')
    const res = await fetch(
      editingId ? `/api/tasks/${editingId}` : '/api/tasks',
      {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, organization_id: orgId }),
      }
    )
    const data = await res.json().catch(() => ({}))
    if (res.ok) {
      if (editingId) {
        setTasks((prev) => prev.map((t) => t.id === editingId ? data.task : t))
      } else {
        setTasks((prev) => [data.task, ...prev])
      }
      setOpen(false)
      router.refresh()
    } else {
      setSaveError(data.error || 'Could not save task.')
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
    if (res.ok) { setTasks((prev) => prev.filter((t) => t.id !== id)); router.refresh() }
    setDeletingId(null)
  }

  async function cycleStatus(task: TaskRow) {
    if (!canEdit) return
    const next: Record<TaskStatus, TaskStatus> = { todo: 'in_progress', in_progress: 'done', done: 'todo' }
    const newStatus = next[task.status]
    // Optimistic
    setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, status: newStatus } : t))
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    if (res.ok) {
      const { task: updated } = await res.json()
      setTasks((prev) => prev.map((t) => t.id === task.id ? updated : t))
      router.refresh()
    } else {
      // Revert
      setTasks((prev) => prev.map((t) => t.id === task.id ? task : t))
    }
  }

  function TaskCard({ task }: { task: TaskRow }) {
    const overdue = isOverdue(task)
    const pm = PRIORITY_META[task.priority]
    return (
      <div className={`bg-white rounded-xl border p-4 transition-shadow hover:shadow-sm ${overdue ? 'border-red-200' : 'border-gray-200'}`}>
        <div className="flex items-start gap-3">
          {/* Status toggle button */}
          <button
            onClick={() => cycleStatus(task)}
            className="mt-0.5 flex-shrink-0 focus:outline-none"
            title="Click to advance status"
          >
            {STATUS_COLS.find((s) => s.key === task.status)?.icon}
          </button>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium ${task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-900'}`}>
              {task.title}
            </p>
            {task.description && (
              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{task.description}</p>
            )}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${pm.color}`}>{pm.label}</span>
              {task.team && <Badge variant="secondary" className="text-xs">{task.team.name}</Badge>}
              {task.assigned_to && (
                <span className="text-xs text-gray-500">
                  → {task.assigned_to.first_name} {task.assigned_to.last_name}
                </span>
              )}
              {task.due_date && (
                <span className={`flex items-center gap-1 text-xs ${overdue ? 'text-red-600 font-medium' : 'text-gray-400'}`}>
                  {overdue && <AlertTriangle className="h-3 w-3" />}
                  {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              )}
            </div>
          </div>
          {canEdit && (
            <div className="flex items-center gap-1 flex-shrink-0">
              <button onClick={() => openEdit(task)} className="p-1 text-gray-400 hover:text-gray-700">
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => { if (confirm('Delete this task?')) handleDelete(task.id) }}
                disabled={deletingId === task.id}
                className="p-1 text-gray-400 hover:text-red-600"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  const overdueTasks = tasks.filter((t) => isOverdue(t))

  function exportCSV() {
    const allTasks = [...tasks.filter((t) => t.status === 'todo'), ...tasks.filter((t) => t.status === 'in_progress'), ...tasks.filter((t) => t.status === 'done')]
    const rows = [
      ['Title', 'Status', 'Priority', 'Due Date', 'Assigned To', 'Team'].join(','),
      ...allTasks.map((t) => [
        t.title,
        t.status,
        t.priority,
        t.due_date || '',
        t.assigned_to ? `${t.assigned_to.first_name} ${t.assigned_to.last_name}` : '',
        t.team?.name || ''
      ].join(','))
    ].join('\n')
    const url = URL.createObjectURL(new Blob([rows], { type: 'text/csv' }))
    const a = document.createElement('a'); a.href = url; a.download = 'tasks.csv'; a.click()
  }

  return (
    <div>
      <PageHeader
        title="Tasks"
        description="Track what needs to get done across your organization"
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <Download className="h-4 w-4" /> Export CSV
            </Button>
            {canEdit && (
              <Button size="sm" onClick={openCreate}>
                <Plus className="h-4 w-4" /> New Task
              </Button>
            )}
          </div>
        }
      />

      {/* Status tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {[{ key: 'all' as const, label: 'All', count: tasks.length }, ...STATUS_COLS.map((s) => ({ key: s.key, label: s.label, count: counts[s.key] }))].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === tab.key ? 'bg-[#00C4F4] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {tab.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${filter === tab.key ? 'bg-white/20' : 'bg-gray-100'}`}>{tab.count}</span>
          </button>
        ))}
      </div>

      {overdueTasks.length > 0 && (filter === 'all' || filter === 'todo' || filter === 'in_progress') && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-sm font-medium text-red-700 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> {overdueTasks.length} overdue task{overdueTasks.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}

      {tasks.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center text-gray-400">
          <CheckSquare className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p>No tasks yet. Create your first task!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {STATUS_COLS.filter((col) => filter === 'all' || filter === col.key).map((col) => {
            const colTasks = tasks.filter((t) => t.status === col.key)
            if (colTasks.length === 0 && filter !== 'all') return null
            const isDoneCol = col.key === 'done'
            const isCollapsed = isDoneCol && collapsedDone
            return (
              <div key={col.key}>
                <button
                  className="flex items-center gap-2 mb-3 w-full text-left"
                  onClick={() => isDoneCol && setCollapsedDone((v) => !v)}
                >
                  {col.icon}
                  <span className="text-sm font-semibold text-gray-700">{col.label}</span>
                  <span className="text-xs text-gray-400">({colTasks.length})</span>
                  {isDoneCol && (
                    <ChevronDown className={`h-4 w-4 text-gray-400 ml-auto transition-transform ${isCollapsed ? '' : 'rotate-180'}`} />
                  )}
                </button>
                {!isCollapsed && (
                  <div className="space-y-2">
                    {colTasks.length === 0 ? (
                      <p className="text-sm text-gray-400 pl-6">Nothing here</p>
                    ) : (
                      colTasks.map((task) => <TaskCard key={task.id} task={task} />)
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Create / Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Task' : 'New Task'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              label="Title *"
              placeholder="What needs to be done?"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            <Textarea
              label="Description"
              placeholder="Any extra details…"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
            />
            <div className="grid grid-cols-2 gap-4">
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as TaskPriority })}>
                <SelectTrigger label="Priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIORITY_META).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as TaskStatus })}>
                <SelectTrigger label="Status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_COLS.map((s) => (
                    <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Input
              label="Due date"
              type="date"
              value={form.due_date}
              onChange={(e) => setForm({ ...form, due_date: e.target.value })}
            />
            <Select value={form.assigned_to_member_id} onValueChange={(v) => setForm({ ...form, assigned_to_member_id: v === '__none__' ? '' : v })}>
              <SelectTrigger label="Assign to">
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Unassigned</SelectItem>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.first_name} {m.last_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={form.team_id} onValueChange={(v) => setForm({ ...form, team_id: v === '__none__' ? '' : v })}>
              <SelectTrigger label="Team (optional)">
                <SelectValue placeholder="No team" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No team</SelectItem>
                {teams.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {saveError && (
            <div className="mt-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{saveError}</div>
          )}
          <div className="flex gap-3 mt-4">
            <Button variant="outline" onClick={() => setOpen(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleSave} loading={saving} disabled={!form.title} className="flex-1">
              {editingId ? 'Save Changes' : 'Create Task'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
