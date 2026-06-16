import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPermissionsFromProfile } from '@/lib/permissions'
import { TeamsClient } from './teams-client'

export default async function TeamsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, assigned_role:roles(name, manage_members, delete_members, manage_teams, manage_events, manage_announcements, manage_billing, manage_staff)')
    .eq('id', user.id)
    .single()
  if (!profile?.organization_id) redirect('/onboarding')

  const { data: teams } = await supabase
    .from('teams')
    .select('*, leader:members(first_name, last_name)')
    .eq('organization_id', profile.organization_id)
    .order('name')

  const teamIds = (teams || []).map((t) => t.id)

  // Only count memberships for THIS org's teams. Previously this fetched
  // every team_membership row platform-wide and counted them in JS, which
  // gets slower for everyone as total membership grows.
  const [{ data: memberCounts }, { data: members }] = await Promise.all([
    teamIds.length
      ? supabase.from('team_memberships').select('team_id').in('team_id', teamIds)
      : Promise.resolve({ data: [] as { team_id: string }[] }),
    supabase.from('members').select('id, first_name, last_name').eq('organization_id', profile.organization_id).eq('status', 'active').order('first_name'),
  ])

  const countMap: Record<string, number> = {}
  memberCounts?.forEach(({ team_id }) => {
    countMap[team_id] = (countMap[team_id] || 0) + 1
  })

  const teamsWithCounts = (teams || []).map((t) => ({ ...t, member_count: countMap[t.id] || 0 }))
  const { permissions } = getPermissionsFromProfile(profile)

  return (
    <TeamsClient
      initialTeams={teamsWithCounts}
      members={members || []}
      orgId={profile.organization_id}
      canEdit={permissions.manage_teams}
    />
  )
}
