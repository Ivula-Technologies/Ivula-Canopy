import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TeamsClient } from './teams-client'

export default async function TeamsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile?.organization_id) redirect('/onboarding')

  const { data: teams } = await supabase
    .from('teams')
    .select('*, leader:members(first_name, last_name)')
    .eq('organization_id', profile.organization_id)
    .order('name')

  // Get member count per team
  const { data: memberCounts } = await supabase
    .from('team_memberships')
    .select('team_id')

  const countMap: Record<string, number> = {}
  memberCounts?.forEach(({ team_id }) => {
    countMap[team_id] = (countMap[team_id] || 0) + 1
  })

  const { data: members } = await supabase
    .from('members')
    .select('id, first_name, last_name')
    .eq('organization_id', profile.organization_id)
    .eq('status', 'active')
    .order('first_name')

  const teamsWithCounts = (teams || []).map((t) => ({ ...t, member_count: countMap[t.id] || 0 }))

  return (
    <TeamsClient
      initialTeams={teamsWithCounts}
      members={members || []}
      orgId={profile.organization_id}
      canEdit={['org_admin', 'org_leader', 'super_admin'].includes(profile.role)}
    />
  )
}
