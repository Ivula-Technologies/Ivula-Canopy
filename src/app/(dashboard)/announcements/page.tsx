import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPermissionsFromProfile, PROFILE_WITH_ROLE } from '@/lib/permissions'
import { orgTimeZone } from '@/lib/timezone'
import { AnnouncementsClient } from './announcements-client'

export default async function AnnouncementsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select(PROFILE_WITH_ROLE)
    .eq('id', user.id)
    .single()
  if (!profile?.organization_id) redirect('/onboarding')

  const [{ data: announcements }, { data: teams }, { data: org }] = await Promise.all([
    supabase.from('announcements').select('*, team:teams(name)').eq('organization_id', profile.organization_id).order('is_pinned', { ascending: false }).order('published_at', { ascending: false }),
    supabase.from('teams').select('id, name').eq('organization_id', profile.organization_id).eq('is_active', true),
    supabase.from('organizations').select('*').eq('id', profile.organization_id).single(),
  ])

  const { permissions } = getPermissionsFromProfile(profile)

  return (
    <AnnouncementsClient
      initialAnnouncements={announcements || []}
      teams={teams || []}
      orgId={profile.organization_id}
      orgName={org?.name || 'Our organization'}
      timeZone={orgTimeZone(org)}
      canEdit={permissions.manage_announcements}
    />
  )
}
