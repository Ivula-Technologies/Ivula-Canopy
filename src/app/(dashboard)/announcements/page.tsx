import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AnnouncementsClient } from './announcements-client'

export default async function AnnouncementsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile?.organization_id) redirect('/onboarding')

  const { data: announcements } = await supabase
    .from('announcements')
    .select('*, team:teams(name)')
    .eq('organization_id', profile.organization_id)
    .order('is_pinned', { ascending: false })
    .order('published_at', { ascending: false })

  const { data: teams } = await supabase
    .from('teams')
    .select('id, name')
    .eq('organization_id', profile.organization_id)
    .eq('is_active', true)

  return (
    <AnnouncementsClient
      initialAnnouncements={announcements || []}
      teams={teams || []}
      orgId={profile.organization_id}
      canEdit={['org_admin', 'org_leader', 'super_admin'].includes(profile.role)}
    />
  )
}
