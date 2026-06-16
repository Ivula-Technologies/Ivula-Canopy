import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPermissionsFromProfile } from '@/lib/permissions'
import { AnnouncementsClient } from './announcements-client'

export default async function AnnouncementsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, assigned_role:roles(name, manage_members, delete_members, manage_teams, manage_events, manage_announcements, manage_billing, manage_staff)')
    .eq('id', user.id)
    .single()
  if (!profile?.organization_id) redirect('/onboarding')

  const [{ data: announcements }, { data: teams }, { data: org }] = await Promise.all([
    supabase.from('announcements').select('*, team:teams(name)').eq('organization_id', profile.organization_id).order('is_pinned', { ascending: false }).order('published_at', { ascending: false }),
    supabase.from('teams').select('id, name').eq('organization_id', profile.organization_id).eq('is_active', true),
    supabase.from('organizations').select('name').eq('id', profile.organization_id).single(),
  ])

  const { permissions } = getPermissionsFromProfile(profile)

  return (
    <AnnouncementsClient
      initialAnnouncements={announcements || []}
      teams={teams || []}
      orgId={profile.organization_id}
      orgName={org?.name || 'Our organization'}
      canEdit={permissions.manage_announcements}
    />
  )
}
