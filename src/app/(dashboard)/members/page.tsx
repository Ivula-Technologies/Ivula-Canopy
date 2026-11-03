import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPermissionsFromProfile, PROFILE_WITH_ROLE } from '@/lib/permissions'
import { MembersClient } from './members-client'

export default async function MembersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select(PROFILE_WITH_ROLE)
    .eq('id', user.id)
    .single()
  if (!profile?.organization_id) redirect('/onboarding')

  const [{ data: members }, { data: teams }] = await Promise.all([
    supabase.from('members').select('*').eq('organization_id', profile.organization_id).order('first_name'),
    supabase.from('teams').select('id, name').eq('organization_id', profile.organization_id).eq('is_active', true).order('name'),
  ])

  const { permissions } = getPermissionsFromProfile(profile)

  return (
    <div>
      <MembersClient
        initialMembers={members || []}
        teams={teams || []}
        orgId={profile.organization_id}
        canEdit={permissions.manage_members}
        canDelete={permissions.delete_members}
      />
    </div>
  )
}
