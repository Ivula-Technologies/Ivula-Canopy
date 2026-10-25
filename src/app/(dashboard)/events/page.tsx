import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPermissionsFromProfile, PROFILE_WITH_ROLE } from '@/lib/permissions'
import { EventsClient } from './events-client'
import { orgTimeZone } from '@/lib/timezone'

export default async function EventsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select(PROFILE_WITH_ROLE)
    .eq('id', user.id)
    .single()
  if (!profile?.organization_id) redirect('/onboarding')

  const [{ data: events }, { data: teams }, { data: org }] = await Promise.all([
    supabase.from('events').select('*, team:teams(name)').eq('organization_id', profile.organization_id).order('starts_at', { ascending: false }),
    supabase.from('teams').select('id, name').eq('organization_id', profile.organization_id).eq('is_active', true),
    supabase.from('organizations').select('*').eq('id', profile.organization_id).single(),
  ])

  const { permissions } = getPermissionsFromProfile(profile)

  return (
    <EventsClient
      initialEvents={events || []}
      teams={teams || []}
      orgId={profile.organization_id}
      canEdit={permissions.manage_events}
      appUrl={process.env.NEXT_PUBLIC_APP_URL || ''}
      timeZone={orgTimeZone(org)}
    />
  )
}
