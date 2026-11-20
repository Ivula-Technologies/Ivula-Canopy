import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate } from '@/lib/utils'
import { links } from '@/lib/links'

export default async function ReportsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile?.organization_id) redirect('/onboarding')

  const orgId = profile.organization_id
  const now = new Date()

  // Last 6 months of attendance data
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)
  const { data: attendanceData } = await supabase
    .from('attendance')
    .select('checked_in_at')
    .eq('organization_id', orgId)
    .gte('checked_in_at', sixMonthsAgo.toISOString())
    .order('checked_in_at')

  // Monthly member growth
  const { data: memberGrowth } = await supabase
    .from('members')
    .select('created_at')
    .eq('organization_id', orgId)
    .order('created_at')

  // Top attended of the last 10 events that have happened. Events keep the
  // status they were created with, so "happened" means started before now and
  // not cancelled; counting status = 'completed' found none.
  type RecentEvent = { id: string; title: string; starts_at: string; status: string | null; attendance?: { count: number }[] | null }
  const recentQuery = (fields: string) =>
    supabase
      .from('events')
      .select(fields)
      .eq('organization_id', orgId)
      .lt('starts_at', now.toISOString())
      .order('starts_at', { ascending: false })
      .limit(15)
      .overrideTypes<RecentEvent[], { merge: false }>()
  // The database counts check-ins per event in one go; if that form of query
  // isn't available, count each of the ten events on its own instead.
  const counted = await recentQuery('id, title, starts_at, status, attendance(count)')
  let recentEvents = counted.data
  if (counted.error) {
    const { data: plain } = await recentQuery('id, title, starts_at, status')
    recentEvents = await Promise.all(
      (plain || []).filter((ev) => ev.status !== 'cancelled').slice(0, 10).map(async (ev) => {
        const { count } = await supabase.from('attendance').select('id', { count: 'exact', head: true }).eq('event_id', ev.id)
        return { ...ev, attendance: [{ count: count || 0 }] }
      })
    )
  }

  const eventAttendanceCounts = (recentEvents || [])
    .filter((ev) => ev.status !== 'cancelled')
    .slice(0, 10)
    .map((ev) => ({ id: ev.id, title: ev.title, count: ev.attendance?.[0]?.count ?? 0, date: ev.starts_at }))
    .sort((a, b) => b.count - a.count)

  // Build monthly buckets
  const months: Record<string, number> = {}
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = d.toLocaleDateString('en', { month: 'short', year: '2-digit' })
    months[key] = 0
  }
  attendanceData?.forEach(({ checked_in_at }) => {
    const d = new Date(checked_in_at)
    const key = d.toLocaleDateString('en', { month: 'short', year: '2-digit' })
    if (key in months) months[key]++
  })

  const maxAttendance = Math.max(...Object.values(months), 1)

  // Member growth by month
  const memberMonths: Record<string, number> = {}
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = d.toLocaleDateString('en', { month: 'short', year: '2-digit' })
    memberMonths[key] = 0
  }
  memberGrowth?.forEach(({ created_at }) => {
    const d = new Date(created_at)
    const key = d.toLocaleDateString('en', { month: 'short', year: '2-digit' })
    if (key in memberMonths) memberMonths[key]++
  })
  const maxMembers = Math.max(...Object.values(memberMonths), 1)

  return (
    <div>
      <PageHeader title="Reports" description="Organizational health and engagement analytics" />

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Attendance trend */}
        <Card>
          <CardHeader>
            <CardTitle>Attendance Trend (6 months)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 h-40">
              {Object.entries(months).map(([month, count]) => (
                <div key={month} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-gray-500">{count}</span>
                  <div
                    className="w-full rounded-t-sm bg-canopy-600 transition-all"
                    style={{ height: `${(count / maxAttendance) * 100}%`, minHeight: count > 0 ? '4px' : '2px' }}
                  />
                  <span className="text-xs text-gray-400">{month}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Member growth */}
        <Card>
          <CardHeader>
            <CardTitle>New Members (6 months)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 h-40">
              {Object.entries(memberMonths).map(([month, count]) => (
                <div key={month} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-gray-500">{count}</span>
                  <div
                    className="w-full rounded-t-sm bg-blue-500 transition-all"
                    style={{ height: `${(count / maxMembers) * 100}%`, minHeight: count > 0 ? '4px' : '2px' }}
                  />
                  <span className="text-xs text-gray-400">{month}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top events by attendance */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Top Events by Attendance</CardTitle>
            <p className="text-sm text-gray-500">Your last 10 events. Open one to see who came.</p>
          </CardHeader>
          <CardContent>
            {eventAttendanceCounts.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No past events yet.</p>
            ) : (
              <div className="space-y-1">
                {eventAttendanceCounts.slice(0, 8).map((ev, i) => (
                  <Link key={ev.id} href={links.event(ev.id, 'attendance')} className="flex items-center gap-4 rounded-lg px-2 py-2 hover:bg-gray-50">
                    <span className="text-xs text-gray-400 w-4">{i + 1}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-900">{ev.title}</span>
                        <span className="text-sm text-gray-500">{ev.count} attended</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-canopy-600 rounded-full"
                          style={{ width: `${(ev.count / (eventAttendanceCounts[0]?.count || 1)) * 100}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-xs text-gray-400 w-20 text-right">{formatDate(ev.date)}</span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
