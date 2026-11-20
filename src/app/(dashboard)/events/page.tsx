import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPermissionsFromProfile, PROFILE_WITH_ROLE } from '@/lib/permissions'
import { EventsClient } from './events-client'
import { monthRangeInZone, orgTimeZone } from '@/lib/timezone'
import { volunteerLinkFor } from '@/lib/volunteer-link'
import { param } from '@/lib/links'

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const query = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select(PROFILE_WITH_ROLE)
    .eq('id', user.id)
    .single()
  if (!profile?.organization_id) redirect('/onboarding')

  const [{ data: events }, { data: teams }, { data: org }, { data: counted, error: countError }] = await Promise.all([
    supabase.from('events').select('*, team:teams(name)').eq('organization_id', profile.organization_id).order('starts_at', { ascending: false }),
    supabase.from('teams').select('id, name').eq('organization_id', profile.organization_id).eq('is_active', true),
    supabase.from('organizations').select('*').eq('id', profile.organization_id).single(),
    // How many people checked in at each event, counted by the database. Kept
    // apart from the list itself so the list still shows if this count fails.
    supabase.from('events').select('id, attendance(count)').eq('organization_id', profile.organization_id),
  ])

  const attendanceCounts: Record<string, number> = {}
  if (!countError) {
    for (const row of (counted || []) as { id: string; attendance: { count: number }[] | null }[]) {
      attendanceCounts[row.id] = row.attendance?.[0]?.count ?? 0
    }
  }

  const { permissions } = getPermissionsFromProfile(profile)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''
  const timeZone = orgTimeZone(org)
  // ?when=this-month: the dashboard's "Attendance / Month" box.
  const month = param(query, 'when') === 'this-month' ? monthRangeInZone(new Date(), timeZone) : null

  return (
    <EventsClient
      key={month?.start || 'all'}
      initialEvents={events || []}
      attendanceCounts={attendanceCounts}
      month={month}
      teams={teams || []}
      orgId={profile.organization_id}
      canEdit={permissions.manage_events}
      appUrl={appUrl}
      timeZone={timeZone}
      volunteerUrl={volunteerLinkFor(org, appUrl)}
    />
  )
}
