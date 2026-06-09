import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'

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

  // Top attended events
  const { data: topEvents } = await supabase
    .from('events')
    .select('id, title, starts_at')
    .eq('organization_id', orgId)
    .eq('status', 'completed')
    .order('starts_at', { ascending: false })
    .limit(10)

  const eventAttendanceCounts: { title: string; count: number; date: string }[] = []
  if (topEvents) {
    for (const ev of topEvents) {
      const { count } = await supabase
        .from('attendance')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', ev.id)
      eventAttendanceCounts.push({ title: ev.title, count: count || 0, date: ev.starts_at })
    }
    eventAttendanceCounts.sort((a, b) => b.count - a.count)
  }

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
                    className="w-full rounded-t-sm bg-emerald-500 transition-all"
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
          </CardHeader>
          <CardContent>
            {eventAttendanceCounts.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No completed events yet.</p>
            ) : (
              <div className="space-y-3">
                {eventAttendanceCounts.slice(0, 8).map((ev, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <span className="text-xs text-gray-400 w-4">{i + 1}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-900">{ev.title}</span>
                        <span className="text-sm text-gray-500">{ev.count} attended</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${(ev.count / (eventAttendanceCounts[0]?.count || 1)) * 100}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-xs text-gray-400 w-20 text-right">{formatDate(ev.date)}</span>
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
