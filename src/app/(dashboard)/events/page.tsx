import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EventsClient } from './events-client'

export default async function EventsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile?.organization_id) redirect('/onboarding')

  const { data: events } = await supabase
    .from('events')
    .select('*, team:teams(name)')
    .eq('organization_id', profile.organization_id)
    .order('starts_at', { ascending: false })

  const { data: teams } = await supabase
    .from('teams')
    .select('id, name')
    .eq('organization_id', profile.organization_id)
    .eq('is_active', true)

  return (
    <EventsClient
      initialEvents={events || []}
      teams={teams || []}
      orgId={profile.organization_id}
      canEdit={['org_admin', 'org_leader', 'super_admin'].includes(profile.role)}
      appUrl={process.env.NEXT_PUBLIC_APP_URL || ''}
    />
  )
}
