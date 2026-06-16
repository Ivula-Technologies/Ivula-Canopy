import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPermissionsFromProfile } from '@/lib/permissions'
import { EventsClient } from './events-client'

export default async function EventsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, assigned_role:roles(name, manage_members, delete_members, manage_teams, manage_events, manage_announcements, manage_billing, manage_staff)')
    .eq('id', user.id)
    .single()
  if (!profile?.organization_id) redirect('/onboarding')

  const [{ data: events }, { data: teams }] = await Promise.all([
    supabase.from('events').select('*, team:teams(name)').eq('organization_id', profile.organization_id).order('starts_at', { ascending: false }),
    supabase.from('teams').select('id, name').eq('organization_id', profile.organization_id).eq('is_active', true),
  ])

  const { permissions } = getPermissionsFromProfile(profile)

  return (
    <EventsClient
      initialEvents={events || []}
      teams={teams || []}
      orgId={profile.organization_id}
      canEdit={permissions.manage_events}
      appUrl={process.env.NEXT_PUBLIC_APP_URL || ''}
    />
  )
}
