import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPermissionsFromProfile, PROFILE_WITH_ROLE } from '@/lib/permissions'
import { AttendanceClient } from './attendance-client'
import { orgTimeZone } from '@/lib/timezone'

export default async function EventDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const { id } = await params
  const { tab } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select(PROFILE_WITH_ROLE)
    .eq('id', user.id)
    .single()
  if (!profile?.organization_id) redirect('/onboarding')

  const [{ data: event }, { data: members }, { data: attended }, { data: org }] = await Promise.all([
    supabase.from('events').select('*, team:teams(name)').eq('id', id).eq('organization_id', profile.organization_id).single(),
    supabase.from('members').select('id, first_name, last_name, email, status').eq('organization_id', profile.organization_id).eq('status', 'active').order('first_name'),
    supabase.from('attendance').select('*, member:members(first_name, last_name, email)').eq('event_id', id),
    supabase.from('organizations').select('*').eq('id', profile.organization_id).single(),
  ])

  if (!event) notFound()

  const { permissions } = getPermissionsFromProfile(profile)

  return (
    <AttendanceClient
      event={event}
      members={members || []}
      initialAttendance={attended || []}
      orgId={profile.organization_id}
      canEdit={permissions.manage_events}
      appUrl={process.env.NEXT_PUBLIC_APP_URL || ''}
      timeZone={orgTimeZone(org)}
      // Upcoming events open on volunteer sign-ups; past ones on attendance.
      initialTab={
        tab === 'shifts' || tab === 'attendance'
          ? tab
          : new Date(event.ends_at || event.starts_at) > new Date() ? 'shifts' : 'attendance'
      }
    />
  )
}
