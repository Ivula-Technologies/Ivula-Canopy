import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserAccess } from '@/lib/permissions'
import { MembersClient } from './members-client'

export default async function MembersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile?.organization_id) redirect('/onboarding')

  const { data: members } = await supabase
    .from('members')
    .select('*')
    .eq('organization_id', profile.organization_id)
    .order('first_name')

  const { data: teams } = await supabase
    .from('teams')
    .select('id, name')
    .eq('organization_id', profile.organization_id)
    .eq('is_active', true)
    .order('name')

  const { permissions } = await getUserAccess(supabase, user.id)

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
