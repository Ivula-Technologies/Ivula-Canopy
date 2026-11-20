import type { ReactNode } from 'react'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, CalendarCheck, CheckSquare, Clock, Heart, Mail, Pencil, Phone, UserPlus, UsersRound } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getPermissionsFromProfile, PROFILE_WITH_ROLE } from '@/lib/permissions'
import { canRunKidsDesk } from '@/lib/kids-server'
import { allRows } from '@/lib/all-rows'
import { isUuid, links } from '@/lib/links'
import { formatDate, getInitials, parseDate, todayISODate } from '@/lib/utils'
import { formatDateIn, formatDayIn, formatTimeIn, orgTimeZone } from '@/lib/timezone'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EditMemberButton } from '@/components/members/member-form-dialog'
import type { Member } from '@/types'

export const metadata = { title: 'Member' }

type Embedded<T> = T | T[] | null
// Supabase types a to-one join as an object or a one-item array; read either.
function one<T>(value: Embedded<T>): T | null {
  return Array.isArray(value) ? value[0] ?? null : value
}

type AttendanceRow = { id: string; checked_in_at: string; hours: number | null; event: Embedded<{ id: string; title: string; starts_at: string }> }
type SignupRow = {
  id: string
  signed_up_at: string
  shift: Embedded<{ id: string; title: string; starts_at: string | null }>
  event: Embedded<{ id: string; title: string; starts_at: string; status: string | null }>
}

const statusVariant: Record<string, 'default' | 'secondary' | 'warning'> = {
  active: 'default',
  inactive: 'secondary',
  pending: 'warning',
}

const PRIORITY_COLOR: Record<string, string> = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
}

function money(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

// A person's page: everything Canopy knows about them, each piece one tap from its own page.
export default async function MemberPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!isUuid(id)) notFound()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select(PROFILE_WITH_ROLE).eq('id', user.id).single()
  if (!profile?.organization_id) redirect('/onboarding')
  const orgId = profile.organization_id as string
  const { permissions } = getPermissionsFromProfile(profile)

  const { data: member } = await supabase.from('members').select('*').eq('id', id).eq('organization_id', orgId).maybeSingle<Member>()
  if (!member) notFound()

  const email = member.email?.trim().toLowerCase() || ''
  const showKids = canRunKidsDesk(permissions)

  // Everything below is read with the signed-in person's own access, so it
  // shows exactly what their role may see elsewhere in Canopy.
  const [
    { data: org },
    { data: memberships },
    { data: ledTeams },
    attendance,
    linkedSignups,
    emailSignups,
    { data: tasks },
    { data: donors },
    { data: children },
  ] = await Promise.all([
    supabase.from('organizations').select('timezone').eq('id', orgId).single(),
    supabase.from('team_memberships').select('role, team:teams(id, name, color, is_active)').eq('member_id', id),
    supabase.from('teams').select('id, name, color').eq('organization_id', orgId).eq('leader_id', id),
    allRows<AttendanceRow>((from, to) =>
      supabase
        .from('attendance')
        .select('id, checked_in_at, hours, event:events(id, title, starts_at)')
        .eq('organization_id', orgId)
        .eq('member_id', id)
        .order('checked_in_at', { ascending: false })
        .range(from, to)
    ),
    allRows<SignupRow>((from, to) =>
      supabase
        .from('shift_signups')
        .select('id, signed_up_at, shift:shifts(id, title, starts_at), event:events(id, title, starts_at, status)')
        .eq('organization_id', orgId)
        .eq('member_id', id)
        .eq('status', 'confirmed')
        .order('signed_up_at', { ascending: false })
        .range(from, to)
    ),
    // Sign-ups made before this person was in Canopy carry only their email.
    email
      ? allRows<SignupRow>((from, to) =>
          supabase
            .from('shift_signups')
            .select('id, signed_up_at, shift:shifts(id, title, starts_at), event:events(id, title, starts_at, status)')
            .eq('organization_id', orgId)
            .is('member_id', null)
            .eq('email', email)
            .eq('status', 'confirmed')
            .order('signed_up_at', { ascending: false })
            .range(from, to)
        )
      : Promise.resolve([] as SignupRow[]),
    supabase
      .from('tasks')
      .select('id, title, status, priority, due_date')
      .eq('organization_id', orgId)
      .eq('assigned_to_member_id', id)
      .neq('status', 'done')
      .order('due_date', { ascending: true, nullsFirst: false })
      .limit(50),
    supabase.from('donors').select('id').eq('organization_id', orgId).eq('member_id', id),
    showKids
      ? supabase.from('children').select('id, first_name, last_name, is_active').eq('organization_id', orgId).eq('guardian_member_id', id).order('first_name')
      : Promise.resolve({ data: [] as { id: string; first_name: string; last_name: string; is_active: boolean }[] }),
  ])

  const donorIds = (donors || []).map((d) => d.id)
  const donations = donorIds.length
    ? await allRows<{ amount: number; donated_at: string }>((from, to) =>
        supabase.from('donations').select('amount, donated_at').eq('organization_id', orgId).in('donor_id', donorIds).order('donated_at', { ascending: false }).range(from, to)
      )
    : []

  const timeZone = orgTimeZone(org)
  const now = new Date().getTime()
  const name = `${member.first_name} ${member.last_name}`.trim()

  const teams = [
    ...(memberships || []).map((m) => ({ ...one(m.team as Embedded<{ id: string; name: string; color: string | null; is_active: boolean }>), role: m.role })),
  ].filter((t): t is { id: string; name: string; color: string | null; is_active: boolean; role: string } => !!t.id)
  const ledIds = new Set((ledTeams || []).map((t) => t.id))
  for (const t of ledTeams || []) {
    if (!teams.some((x) => x.id === t.id)) teams.push({ ...t, is_active: true, role: 'leader' })
  }

  const hours = attendance.reduce((sum, a) => sum + (Number(a.hours) || 0), 0)
  const signups = [...linkedSignups, ...emailSignups]
    .map((s) => ({ ...s, shift: one(s.shift), event: one(s.event) }))
    .filter((s) => s.event && s.event.status !== 'cancelled')
    .map((s) => ({ ...s, startsAt: s.shift?.starts_at || s.event!.starts_at }))
  const upcomingShifts = signups.filter((s) => new Date(s.startsAt).getTime() > now).sort((a, b) => a.startsAt.localeCompare(b.startsAt))
  const pastShifts = signups.filter((s) => new Date(s.startsAt).getTime() <= now).sort((a, b) => b.startsAt.localeCompare(a.startsAt))
  const given = donations.reduce((sum, d) => sum + Number(d.amount || 0), 0)
  const today = parseDate(todayISODate())

  const stats: { label: string; value: string | number; href: string; icon: ReactNode; show: boolean }[] = [
    { label: 'Upcoming shifts', value: upcomingShifts.length, href: '#shifts', icon: <UserPlus className="h-4 w-4 text-emerald-600" />, show: true },
    { label: 'Events attended', value: attendance.length, href: '#attendance', icon: <CalendarCheck className="h-4 w-4 text-canopy-600" />, show: true },
    { label: 'Volunteer hours', value: Number.isInteger(hours) ? hours : hours.toFixed(1), href: '#attendance', icon: <Clock className="h-4 w-4 text-emerald-600" />, show: true },
    { label: 'Open tasks', value: tasks?.length || 0, href: links.tasks({ assignee: id }), icon: <CheckSquare className="h-4 w-4 text-amber-600" />, show: true },
    { label: 'Given', value: money(given), href: donorIds[0] ? links.donor(donorIds[0]) : '/donors', icon: <Heart className="h-4 w-4 text-rose-600" />, show: donorIds.length > 0 },
  ]

  return (
    <div>
      <Link href="/members" className="mb-4 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4" /> Back to Members
      </Link>

      <div className="mb-6 flex flex-wrap items-start gap-4">
        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-canopy-100 text-lg font-bold text-canopy-900">
          {getInitials(name)}
        </div>
        <div className="min-w-[12rem] flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">{name}</h1>
            <Badge variant={statusVariant[member.status] || 'secondary'}>{member.status}</Badge>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Member since {formatDate(member.join_date || member.created_at)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {member.email && (
            <a href={`mailto:${member.email}`} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
              <Mail className="h-4 w-4" /> Email
            </a>
          )}
          {member.phone && (
            <a href={`tel:${member.phone}`} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
              <Phone className="h-4 w-4" /> Call
            </a>
          )}
          {permissions.manage_members && (
            <EditMemberButton member={member} orgId={orgId}>
              <Pencil className="h-4 w-4" /> Edit
            </EditMemberButton>
          )}
        </div>
      </div>

      {/* Each number opens the list it counts. */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {stats.filter((s) => s.show).map((s) => (
          <Link key={s.label} href={s.href} className="rounded-xl border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md">
            <div className="flex items-center gap-2 text-xs text-gray-500">{s.icon}{s.label}</div>
            <p className="mt-1 text-2xl font-bold text-gray-900">{s.value}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card id="shifts" className="scroll-mt-20">
            <CardHeader>
              <CardTitle>Volunteer shifts</CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingShifts.length === 0 && pastShifts.length === 0 ? (
                <p className="text-sm text-gray-400">
                  Not signed up for any shifts yet. When {member.first_name} signs up from a sign-up link, or a coordinator adds them, the shift shows here.
                </p>
              ) : (
                <div className="space-y-4">
                  {upcomingShifts.length > 0 && (
                    <ul className="divide-y divide-gray-100">
                      {upcomingShifts.map((s) => (
                        <li key={s.id}>
                          <Link href={links.event(s.event!.id, 'shifts')} className="flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-gray-50">
                            <span className="w-24 flex-shrink-0 text-xs font-medium text-canopy-700">{formatDayIn(s.startsAt, timeZone)}</span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium text-gray-900">{s.shift?.title || 'Shift'}</span>
                              <span className="block truncate text-xs text-gray-500">{s.event!.title} · {formatTimeIn(s.startsAt, timeZone)}</span>
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                  {pastShifts.length > 0 && (
                    <div>
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">Served before</p>
                      <ul className="divide-y divide-gray-100">
                        {pastShifts.slice(0, 10).map((s) => (
                          <li key={s.id}>
                            <Link href={links.event(s.event!.id, 'shifts')} className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm hover:bg-gray-50">
                              <span className="w-24 flex-shrink-0 text-xs text-gray-400">{formatDateIn(s.startsAt, timeZone)}</span>
                              <span className="min-w-0 flex-1 truncate text-gray-700">{s.shift?.title || 'Shift'} · {s.event!.title}</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card id="attendance" className="scroll-mt-20">
            <CardHeader>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <CardTitle>Attendance</CardTitle>
                {attendance.length > 0 && (
                  <span className="text-sm text-gray-500">
                    {attendance.length} event{attendance.length !== 1 ? 's' : ''}
                    {hours > 0 ? ` · ${Number.isInteger(hours) ? hours : hours.toFixed(1)} volunteer hours` : ''}
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {attendance.length === 0 ? (
                <p className="text-sm text-gray-400">No check-ins yet.</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {attendance.slice(0, 25).map((a) => {
                    const event = one(a.event)
                    const row = (
                      <>
                        <span className="w-24 flex-shrink-0 text-xs text-gray-500">{formatDateIn(event?.starts_at || a.checked_in_at, timeZone)}</span>
                        <span className="min-w-0 flex-1 truncate text-sm text-gray-900">{event?.title || 'Event'}</span>
                        {a.hours ? <span className="text-xs font-medium text-emerald-600">{a.hours}h</span> : null}
                      </>
                    )
                    return (
                      <li key={a.id}>
                        {event ? (
                          <Link href={links.event(event.id, 'attendance')} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-gray-50">{row}</Link>
                        ) : (
                          <div className="flex items-center gap-3 px-2 py-2">{row}</div>
                        )}
                      </li>
                    )
                  })}
                  {attendance.length > 25 && (
                    <li className="px-2 pt-2 text-xs text-gray-400">Showing the latest 25 of {attendance.length}.</li>
                  )}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3 text-sm">
                {[
                  ['Email', member.email ? <a key="e" href={`mailto:${member.email}`} className="text-canopy-700 hover:underline">{member.email}</a> : null],
                  ['Phone', member.phone ? <a key="p" href={`tel:${member.phone}`} className="text-canopy-700 hover:underline">{member.phone}</a> : null],
                  ['Address', member.address],
                  ['Joined', formatDate(member.join_date || member.created_at)],
                  ['Notes', member.notes],
                ]
                  .filter(([, value]) => value)
                  .map(([label, value]) => (
                    <div key={label as string}>
                      <dt className="text-xs text-gray-500">{label}</dt>
                      <dd className="whitespace-pre-line break-words text-gray-900">{value}</dd>
                    </div>
                  ))}
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Teams</CardTitle>
            </CardHeader>
            <CardContent>
              {teams.length === 0 ? (
                <p className="text-sm text-gray-400">Not on a team yet.</p>
              ) : (
                <ul className="space-y-1">
                  {teams.map((t) => (
                    <li key={t.id}>
                      <Link href={links.team(t.id)} className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-gray-50">
                        <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: t.color || '#2f6552' }} />
                        <span className="min-w-0 flex-1 truncate font-medium text-gray-900">{t.name}</span>
                        {(ledIds.has(t.id) || t.role === 'leader') && <Badge variant="secondary">Leads</Badge>}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              {permissions.manage_teams && (
                <Link href="/teams" className="mt-2 inline-flex items-center gap-1 px-2 text-xs text-gray-500 hover:text-canopy-700">
                  <UsersRound className="h-3.5 w-3.5" /> Add to a team from Teams
                </Link>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Open tasks</CardTitle>
                {(tasks?.length || 0) > 0 && (
                  <Link href={links.tasks({ assignee: id })} className="text-xs text-gray-500 hover:text-canopy-700">See all</Link>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!tasks?.length ? (
                <p className="text-sm text-gray-400">Nothing assigned.</p>
              ) : (
                <ul className="space-y-1">
                  {tasks.map((t) => {
                    const overdue = t.due_date && parseDate(t.due_date) < today
                    return (
                      <li key={t.id}>
                        <Link href={links.tasks({ assignee: id, open: t.id })} className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-gray-50">
                          <span className="min-w-0 flex-1 truncate text-gray-900">{t.title}</span>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_COLOR[t.priority] || PRIORITY_COLOR.low}`}>{t.priority}</span>
                          {t.due_date && (
                            <span className={`text-xs ${overdue ? 'font-medium text-red-600' : 'text-gray-400'}`}>
                              {parseDate(t.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          {donorIds.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Giving</CardTitle>
              </CardHeader>
              <CardContent>
                <Link href={links.donor(donorIds[0])} className="block rounded-lg px-2 py-2 hover:bg-gray-50">
                  <p className="text-xl font-bold text-emerald-600">{money(given)}</p>
                  <p className="text-xs text-gray-500">
                    {donations.length} gift{donations.length !== 1 ? 's' : ''}
                    {donations[0] ? ` · last on ${formatDate(donations[0].donated_at)}` : ''}
                  </p>
                </Link>
              </CardContent>
            </Card>
          )}

          {(children?.length || 0) > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Children</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1">
                  {children!.map((c) => (
                    <li key={c.id}>
                      <Link href={links.child(`${c.first_name} ${c.last_name}`)} className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-gray-50">
                        <span className="min-w-0 flex-1 truncate font-medium text-gray-900">{c.first_name} {c.last_name}</span>
                        {!c.is_active && <Badge variant="secondary">Archived</Badge>}
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
