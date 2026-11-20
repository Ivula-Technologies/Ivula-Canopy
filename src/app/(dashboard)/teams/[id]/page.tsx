import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, CalendarDays, Megaphone, Pencil } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getPermissionsFromProfile, PROFILE_WITH_ROLE } from '@/lib/permissions'
import { isUuid, links } from '@/lib/links'
import { getInitials, parseDate, todayISODate } from '@/lib/utils'
import { dateBadgeIn, formatDateIn, formatTimeIn, orgTimeZone } from '@/lib/timezone'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ManageTeamMembersButton } from '@/components/teams/team-members-dialog'

export const metadata = { title: 'Team' }

type Embedded<T> = T | T[] | null
function one<T>(value: Embedded<T>): T | null {
  return Array.isArray(value) ? value[0] ?? null : value
}

type TeamMember = { id: string; first_name: string; last_name: string; email: string | null; phone: string | null; status: string }

// A team's page: who is on it, what it has coming up and what it still has to do.
export default async function TeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!isUuid(id)) notFound()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select(PROFILE_WITH_ROLE).eq('id', user.id).single()
  if (!profile?.organization_id) redirect('/onboarding')
  const orgId = profile.organization_id as string
  const { permissions } = getPermissionsFromProfile(profile)

  const { data: team } = await supabase
    .from('teams')
    .select('*, leader:members(id, first_name, last_name)')
    .eq('id', id)
    .eq('organization_id', orgId)
    .maybeSingle()
  if (!team) notFound()

  const nowIso = new Date().toISOString()
  const [{ data: org }, { data: memberships }, { data: events }, { data: tasks }, { data: announcements }, { data: activeMembers }] = await Promise.all([
    supabase.from('organizations').select('timezone').eq('id', orgId).single(),
    supabase.from('team_memberships').select('role, member:members(id, first_name, last_name, email, phone, status)').eq('team_id', id),
    supabase.from('events').select('id, title, starts_at, location').eq('organization_id', orgId).eq('team_id', id).gte('starts_at', nowIso).order('starts_at').limit(5),
    supabase
      .from('tasks')
      .select('id, title, priority, due_date, assigned_to:members(first_name, last_name)')
      .eq('organization_id', orgId)
      .eq('team_id', id)
      .neq('status', 'done')
      .order('due_date', { ascending: true, nullsFirst: false })
      .limit(10),
    supabase.from('announcements').select('id, title, published_at').eq('organization_id', orgId).eq('team_id', id).order('published_at', { ascending: false }).limit(3),
    permissions.manage_teams
      ? supabase.from('members').select('id, first_name, last_name').eq('organization_id', orgId).eq('status', 'active').order('first_name')
      : Promise.resolve({ data: [] as { id: string; first_name: string; last_name: string }[] }),
  ])

  const timeZone = orgTimeZone(org)
  const leader = one(team.leader as Embedded<{ id: string; first_name: string; last_name: string }>)
  const people = (memberships || [])
    .map((m) => ({ ...one(m.member as Embedded<TeamMember>), role: m.role }))
    .filter((m): m is TeamMember & { role: string } => !!m.id)
    .sort((a, b) => `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`))
  const today = parseDate(todayISODate())

  return (
    <div>
      <Link href="/teams" className="mb-4 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4" /> Back to Teams
      </Link>

      <div className="mb-6 flex flex-wrap items-start gap-4">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: (team.color || '#2f6552') + '20' }}>
          <div className="h-6 w-6 rounded-full" style={{ backgroundColor: team.color || '#2f6552' }} />
        </div>
        <div className="min-w-[12rem] flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">{team.name}</h1>
            <Badge variant="secondary">{String(team.team_type || '').replace('_', ' ')}</Badge>
            {!team.is_active && <Badge variant="secondary">Inactive</Badge>}
          </div>
          {team.description && <p className="mt-1 max-w-2xl text-sm text-gray-500">{team.description}</p>}
          {leader && (
            <p className="mt-1 text-sm text-gray-500">
              Led by{' '}
              <Link href={links.member(leader.id)} className="font-medium text-canopy-700 hover:underline">
                {leader.first_name} {leader.last_name}
              </Link>
            </p>
          )}
        </div>
        {permissions.manage_teams && (
          <div className="flex flex-wrap items-start gap-2">
            <Link href={links.editTeam(id)} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
              <Pencil className="h-4 w-4" /> Edit
            </Link>
            <div>
              <ManageTeamMembersButton team={{ id, name: team.name }} members={activeMembers || []} />
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>People ({people.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {people.length === 0 ? (
              <p className="text-sm text-gray-400">
                Nobody on this team yet.{permissions.manage_teams ? ' Use Manage members to add people.' : ''}
              </p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {people.map((p) => (
                  <li key={p.id}>
                    <Link href={links.member(p.id)} className="flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-gray-50">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-canopy-100 text-xs font-bold text-canopy-900">
                        {getInitials(`${p.first_name} ${p.last_name}`)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-900">{p.first_name} {p.last_name}</p>
                        <p className="truncate text-xs text-gray-500">{p.email || p.phone || 'No contact details'}</p>
                      </div>
                      {(p.id === leader?.id || p.role === 'leader') && <Badge variant="secondary">Leads</Badge>}
                      {p.status !== 'active' && <Badge variant="secondary">{p.status}</Badge>}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Coming up</CardTitle>
            </CardHeader>
            <CardContent>
              {!events?.length ? (
                <p className="flex items-center gap-2 text-sm text-gray-400"><CalendarDays className="h-4 w-4" /> No upcoming events for this team.</p>
              ) : (
                <ul className="space-y-1">
                  {events.map((e) => {
                    const badge = dateBadgeIn(e.starts_at, timeZone)
                    return (
                      <li key={e.id}>
                        <Link href={links.event(e.id)} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-gray-50">
                          <span className="flex min-w-[36px] flex-col items-center text-center">
                            <span className="text-[10px] uppercase text-gray-400">{badge.month}</span>
                            <span className="text-lg font-bold leading-none text-gray-900">{badge.day}</span>
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-gray-900">{e.title}</span>
                            <span className="block truncate text-xs text-gray-500">{formatTimeIn(e.starts_at, timeZone)}{e.location ? ` · ${e.location}` : ''}</span>
                          </span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Open tasks</CardTitle>
                {(tasks?.length || 0) > 0 && (
                  <Link href={links.tasks({ team: id })} className="text-xs text-gray-500 hover:text-canopy-700">See all</Link>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!tasks?.length ? (
                <p className="text-sm text-gray-400">Nothing open for this team.</p>
              ) : (
                <ul className="space-y-1">
                  {tasks.map((t) => {
                    const who = one(t.assigned_to as Embedded<{ first_name: string; last_name: string }>)
                    const overdue = t.due_date && parseDate(t.due_date) < today
                    return (
                      <li key={t.id}>
                        <Link href={links.tasks({ team: id, open: t.id })} className="block rounded-lg px-2 py-2 hover:bg-gray-50">
                          <span className="block truncate text-sm text-gray-900">{t.title}</span>
                          <span className="block text-xs text-gray-500">
                            {who ? `${who.first_name} ${who.last_name}` : 'Unassigned'}
                            {t.due_date && (
                              <span className={overdue ? 'font-medium text-red-600' : ''}>
                                {' · due '}{parseDate(t.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </span>
                            )}
                          </span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          {(announcements?.length || 0) > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Announcements</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1">
                  {announcements!.map((a) => (
                    <li key={a.id}>
                      <Link href={links.announcement(a.id)} className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-gray-50">
                        <Megaphone className="h-4 w-4 flex-shrink-0 text-gray-400" />
                        <span className="min-w-0 flex-1 truncate text-sm text-gray-900">{a.title}</span>
                        <span className="text-xs text-gray-400">{formatDateIn(a.published_at, timeZone)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
