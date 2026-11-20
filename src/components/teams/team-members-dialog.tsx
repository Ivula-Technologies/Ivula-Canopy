'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserCog } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { getInitials } from '@/lib/utils'

type MemberOption = { id: string; first_name: string; last_name: string }

/** Tick who is on a team. Used on the Teams list and on a team's own page. */
export function TeamMembersDialog({
  team,
  members,
  onClose,
  onSaving,
  onSaved,
}: {
  team: { id: string; name: string } | null
  members: MemberOption[]
  onClose: () => void
  /** Right away, with the new head count, so the screen can update before the save finishes. */
  onSaving?: (teamId: string, count: number) => void
  /** Once the save has gone through, or failed. */
  onSaved: (teamId: string, ok: boolean) => void
}) {
  return (
    <Dialog open={!!team} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Members — {team?.name}</DialogTitle>
        </DialogHeader>
        {team && <TeamMembersPicker team={team} members={members} onClose={onClose} onSaving={onSaving} onSaved={onSaved} />}
      </DialogContent>
    </Dialog>
  )
}

// Mounted only while the dialog is open, so it loads the team's people fresh each time.
function TeamMembersPicker({
  team,
  members,
  onClose,
  onSaving,
  onSaved,
}: {
  team: { id: string; name: string }
  members: MemberOption[]
  onClose: () => void
  onSaving?: (teamId: string, count: number) => void
  onSaved: (teamId: string, ok: boolean) => void
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    let cancelled = false
    fetch(`/api/teams/${team.id}/members`)
      .then((res) => (res.ok ? res.json() : { memberIds: [] }))
      .then(({ memberIds }) => { if (!cancelled) setSelected(new Set(memberIds || [])) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [team.id])

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function save() {
    const teamId = team.id
    const ids = [...selected]
    // Close straight away; the list updates while the save finishes.
    onClose()
    onSaving?.(teamId, ids.length)
    const res = await fetch(`/api/teams/${teamId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberIds: ids }),
    }).catch(() => null)
    onSaved(teamId, !!res?.ok)
  }

  const filtered = members.filter((m) => `${m.first_name} ${m.last_name}`.toLowerCase().includes(search.toLowerCase()))

  return (
    <>
        {loading ? (
          <div className="py-8 text-center text-sm text-gray-400">Loading…</div>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-3">
              Check the members you want in this team. Unchecked members will be removed.
            </p>
            <input
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-canopy-600 mb-3"
              placeholder="Search members…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="max-h-72 overflow-y-auto space-y-1 border border-gray-100 rounded-lg p-2">
              {filtered.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No members found</p>
              ) : (
                filtered.map((m) => {
                  const checked = selected.has(m.id)
                  return (
                    <label
                      key={m.id}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${checked ? 'bg-canopy-50' : 'hover:bg-gray-50'}`}
                    >
                      <input type="checkbox" checked={checked} onChange={() => toggle(m.id)} className="rounded" />
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-canopy-100 text-xs font-bold text-canopy-900">
                          {getInitials(`${m.first_name} ${m.last_name}`)}
                        </div>
                        <span className="text-sm font-medium text-gray-800">{m.first_name} {m.last_name}</span>
                      </div>
                    </label>
                  )
                })
              )}
            </div>
            <p className="text-xs text-gray-400 mt-2">{selected.size} member{selected.size !== 1 ? 's' : ''} selected</p>
            <div className="flex gap-3 mt-4">
              <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
              <Button onClick={save} className="flex-1">Save Members</Button>
            </div>
          </>
        )}
    </>
  )
}

/** The Manage members button on a team's page: same dialog, then the page reloads its list. */
export function ManageTeamMembersButton({ team, members }: { team: { id: string; name: string }; members: MemberOption[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => { setError(''); setOpen(true) }}>
        <UserCog className="h-4 w-4" /> Manage members
      </Button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      <TeamMembersDialog
        team={open ? team : null}
        members={members}
        onClose={() => setOpen(false)}
        onSaved={(_id, ok) => {
          if (ok) router.refresh()
          else setError('Could not save the team. Please try again.')
        }}
      />
    </>
  )
}
