import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Users, CalendarDays, UsersRound, TrendingUp, UserCheck, AlertTriangle, UserPlus, Heart, CheckSquare, Check, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/layout/page-header'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { dateBadgeIn, formatTimeIn, orgTimeZone } from '@/lib/timezone'
import { getPermissionsFromProfile } from '@/lib/permissions'
import { hasSubscription } from '@/lib/subscription'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, assigned_role:roles(name, manage_members, delete_members, manage_teams, manage_events, manage_announcements, manage_billing, manage_staff)')
    .eq('id', user.id)
    .single()
  if (!profile?.organization_id) redirect('/onboarding')
  const { permissions } = getPermissionsFromProfile(profile)

  const orgId = profile.organization_id
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  // Parallel data fetches
  const [
    { count: totalMembers },
    { count: activeMembers },
    { count: totalTeams },
    { data: upcomingEvents },
    { count: attendanceThisMonth },
    { count: newMembersThisMonth },
    { data: recentAnnouncements },
    { count: totalSignups },
    { data: donationRows },
    { count: openTasks },
    { data: org },
    { count: totalEvents },
    { count: totalShifts },
    { count: staffCount },
    { data: nextEvent },
  ] = await Promise.all([
    supabase.from('members').select('*', { count: 'exact', head: true }).eq('organization_id', orgId),
    supabase.from('members').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).eq('status', 'active'),
    supabase.from('teams').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).eq('is_active', true),
    supabase.from('events').select('id, title, starts_at, location, event_type').eq('organization_id', orgId).gte('starts_at', now.toISOString()).order('starts_at').limit(5),
    supabase.from('attendance').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).gte('checked_in_at', monthStart),
    supabase.from('members').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).gte('created_at', monthStart),
    supabase.from('announcements').select('id, title, published_at, is_pinned').eq('organization_id', orgId).order('published_at', { ascending: false }).limit(3),
    supabase.from('shift_signups').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).eq('status', 'confirmed'),
    supabase.from('donations').select('amount').eq('organization_id', orgId),
    supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).neq('status', 'done'),
    supabase.from('organizations').select('*').eq('id', orgId).single(),
    supabase.from('events').select('id', { count: 'exact', head: true }).eq('organization_id', orgId),
    supabase.from('shifts').select('id', { count: 'exact', head: true }).eq('organization_id', orgId),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('organization_id', orgId),
    // The event the setup steps point at: the next one, or else the newest.
    supabase.from('events').select('id').eq('organization_id', orgId).order('starts_at', { ascending: false }).limit(1).maybeSingle(),
  ])

  const timeZone = orgTimeZone(org)
  const eventLink = (upcomingEvents?.[0]?.id ?? nextEvent?.id) ? `/events/${upcomingEvents?.[0]?.id ?? nextEvent?.id}?tab=shifts` : '/events'

  // First-week checklist: the path from an empty account to volunteers
  // signing themselves up, then the plan. It disappears once every step is done.
  const setupSteps = [
    { done: (totalMembers || 0) > 1, title: 'Add your people', detail: 'Import your member spreadsheet or add people one by one.', href: '/members', show: permissions.manage_members },
    { done: (totalEvents || 0) > 0, title: 'Create an event', detail: 'Sunday service, a food drive, youth night: anything that needs people.', href: '/events', show: permissions.manage_events },
    { done: (totalShifts || 0) > 0, title: 'Add volunteer shifts', detail: 'One shift per role, like greeters, nursery or parking, with how many you need.', href: eventLink, show: permissions.manage_events },
    { done: (totalSignups || 0) > 0, title: 'Share your sign-up link', detail: 'Volunteers pick a shift without an account and get a reminder the day before.', href: eventLink, show: permissions.manage_events },
    { done: (staffCount || 0) > 1, title: 'Invite a teammate', detail: 'Give your pastor or coordinator their own login.', href: '/settings', show: permissions.manage_staff },
    { done: !!org && hasSubscription(org), title: 'Choose a plan', detail: 'Plans start at $29 a month. Your trial keeps going until it ends.', href: '/settings#billing', show: permissions.manage_billing },
  ].filter((step) => step.show)
  const stepsDone = setupSteps.filter((step) => step.done).length
  const showSetup = setupSteps.length > 0 && stepsDone < setupSteps.length

  const totalRaised = donationRows?.reduce((sum, d) => sum + (d.amount || 0), 0) || 0

  const engagementRate = totalMembers && totalMembers > 0
    ? Math.round(((attendanceThisMonth || 0) / totalMembers) * 100)
    : 0

  const stats = [
    { label: 'Total Members', value: totalMembers || 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', href: '/members' },
    { label: 'Active Members', value: activeMembers || 0, icon: UserCheck, color: 'text-canopy-600', bg: 'bg-canopy-50', href: '/members' },
    { label: 'Active Teams', value: totalTeams || 0, icon: UsersRound, color: 'text-purple-600', bg: 'bg-purple-50', href: '/teams' },
    { label: 'New This Month', value: newMembersThisMonth || 0, icon: TrendingUp, color: 'text-orange-600', bg: 'bg-orange-50', href: '/members' },
    { label: 'Attendance / Month', value: attendanceThisMonth || 0, icon: CalendarDays, color: 'text-canopy-600', bg: 'bg-canopy-50', href: '/events' },
    { label: 'Engagement Rate', value: `${engagementRate}%`, icon: TrendingUp, color: 'text-pink-600', bg: 'bg-pink-50', href: '/reports' },
    { label: 'Volunteer Sign-ups', value: totalSignups || 0, icon: UserPlus, color: 'text-emerald-600', bg: 'bg-emerald-50', href: '/events' },
    { label: 'Total Raised', value: `$${totalRaised.toLocaleString()}`, icon: Heart, color: 'text-rose-600', bg: 'bg-rose-50', href: '/donors' },
    { label: 'Open Tasks', value: openTasks || 0, icon: CheckSquare, color: 'text-amber-600', bg: 'bg-amber-50', href: '/tasks' },
  ]

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Your organization at a glance"
      />

      {showSetup && (
        <Card className="mb-8 border-canopy-200">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>Get {org?.name || 'your organization'} ready</CardTitle>
              <span className="text-sm text-gray-500">{stepsDone} of {setupSteps.length} done</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">
              <div className="h-full rounded-full bg-canopy-600" style={{ width: `${(stepsDone / setupSteps.length) * 100}%` }} />
            </div>
          </CardHeader>
          <CardContent>
            <ol className="divide-y divide-gray-100">
              {setupSteps.map((step, i) => (
                <li key={step.title}>
                  <Link href={step.href} className="flex items-center gap-3 py-3 group">
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                        step.done ? 'bg-canopy-600 text-white' : 'border-2 border-gray-300 text-gray-500'
                      }`}
                    >
                      {step.done ? <Check className="h-4 w-4" /> : i + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block text-sm font-medium ${step.done ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                        {step.title}
                      </span>
                      {!step.done && <span className="block text-xs text-gray-500">{step.detail}</span>}
                    </span>
                    {!step.done && <ArrowRight className="h-4 w-4 shrink-0 text-gray-400 group-hover:text-canopy-600" />}
                  </Link>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, color, bg, href }) => (
          <Link key={label} href={href}>
            <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className={`hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${bg}`}>
                    <Icon className={`h-5 w-5 ${color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{value}</p>
                    <p className="text-xs text-gray-500">{label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Upcoming Events */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Upcoming Events</CardTitle>
              <Link href="/events">
                <Button variant="ghost" size="sm">View all</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {!upcomingEvents?.length ? (
              <div className="text-center py-8 text-gray-400">
                <CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No upcoming events</p>
                <Link href="/events">
                  <Button variant="link" size="sm" className="mt-2">Schedule one →</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingEvents.map((event) => (
                  <Link key={event.id} href={`/events/${event.id}`} className="block">
                    <div className="flex items-start gap-3 rounded-lg p-3 hover:bg-gray-50 transition-colors">
                      <div className="flex flex-col items-center text-center min-w-[40px]">
                        <span className="text-xs text-gray-400 uppercase">
                          {dateBadgeIn(event.starts_at, timeZone).month}
                        </span>
                        <span className="text-xl font-bold text-gray-900 leading-none">
                          {dateBadgeIn(event.starts_at, timeZone).day}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{event.title}</p>
                        <p className="text-xs text-gray-500">
                          {formatTimeIn(event.starts_at, timeZone)}
                          {event.location && ` · ${event.location}`}
                        </p>
                      </div>
                      <Badge variant="secondary" className="flex-shrink-0 text-xs">
                        {event.event_type}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Announcements */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Announcements</CardTitle>
              <Link href="/announcements">
                <Button variant="ghost" size="sm">View all</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {!recentAnnouncements?.length ? (
              <div className="text-center py-8 text-gray-400">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No announcements yet</p>
                <Link href="/announcements">
                  <Button variant="link" size="sm" className="mt-2">Create one →</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentAnnouncements.map((a) => (
                  <div key={a.id} className="flex items-start gap-3 rounded-lg p-3 hover:bg-gray-50">
                    {a.is_pinned && <Badge variant="warning" className="flex-shrink-0 mt-0.5">Pinned</Badge>}
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{a.title}</p>
                      <p className="text-xs text-gray-500">{formatDate(a.published_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
