import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Users, CalendarDays, UsersRound, TrendingUp, UserCheck, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/layout/page-header'
import { formatDate, formatDateTime } from '@/lib/utils'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single()
  if (!profile?.organization_id) redirect('/onboarding')

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
    { data: atRiskMembers },
  ] = await Promise.all([
    supabase.from('members').select('*', { count: 'exact', head: true }).eq('organization_id', orgId),
    supabase.from('members').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).eq('status', 'active'),
    supabase.from('teams').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).eq('is_active', true),
    supabase.from('events').select('id, title, starts_at, location, event_type').eq('organization_id', orgId).gte('starts_at', now.toISOString()).order('starts_at').limit(5),
    supabase.from('attendance').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).gte('checked_in_at', monthStart),
    supabase.from('members').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).gte('created_at', monthStart),
    supabase.from('announcements').select('id, title, published_at, is_pinned').eq('organization_id', orgId).order('published_at', { ascending: false }).limit(3),
    // Members with no attendance in last 60 days
    supabase.from('members').select('id, first_name, last_name, email').eq('organization_id', orgId).eq('status', 'active').limit(5),
  ])

  const engagementRate = totalMembers && totalMembers > 0
    ? Math.round(((attendanceThisMonth || 0) / totalMembers) * 100)
    : 0

  const stats = [
    { label: 'Total Members', value: totalMembers || 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', href: '/members' },
    { label: 'Active Members', value: activeMembers || 0, icon: UserCheck, color: 'text-emerald-600', bg: 'bg-emerald-50', href: '/members' },
    { label: 'Active Teams', value: totalTeams || 0, icon: UsersRound, color: 'text-purple-600', bg: 'bg-purple-50', href: '/teams' },
    { label: 'New This Month', value: newMembersThisMonth || 0, icon: TrendingUp, color: 'text-orange-600', bg: 'bg-orange-50', href: '/members' },
    { label: 'Attendance / Month', value: attendanceThisMonth || 0, icon: CalendarDays, color: 'text-cyan-600', bg: 'bg-cyan-50', href: '/events' },
    { label: 'Engagement Rate', value: `${engagementRate}%`, icon: TrendingUp, color: 'text-pink-600', bg: 'bg-pink-50', href: '/reports' },
  ]

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Your organization at a glance"
      />

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, color, bg, href }) => (
          <Link key={label} href={href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${bg}`}>
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
                          {new Date(event.starts_at).toLocaleDateString('en', { month: 'short' })}
                        </span>
                        <span className="text-xl font-bold text-gray-900 leading-none">
                          {new Date(event.starts_at).getDate()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{event.title}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(event.starts_at).toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' })}
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
