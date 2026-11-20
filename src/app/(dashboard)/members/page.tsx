import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPermissionsFromProfile, PROFILE_WITH_ROLE } from '@/lib/permissions'
import { choice, idParam, MEMBER_STATUSES, param } from '@/lib/links'
import { monthRangeInZone, orgTimeZone } from '@/lib/timezone'
import { MembersClient } from './members-client'

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const query = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select(PROFILE_WITH_ROLE)
    .eq('id', user.id)
    .single()
  if (!profile?.organization_id) redirect('/onboarding')

  const [{ data: members }, { data: teams }, { data: org }] = await Promise.all([
    supabase.from('members').select('*').eq('organization_id', profile.organization_id).order('first_name'),
    supabase.from('teams').select('id, name').eq('organization_id', profile.organization_id).eq('is_active', true).order('name'),
    supabase.from('organizations').select('timezone').eq('id', profile.organization_id).single(),
  ])

  const { permissions } = getPermissionsFromProfile(profile)

  // Filters a link can open this list with (see links.members).
  const status = choice(query, 'status', MEMBER_STATUSES)
  const addedSince = param(query, 'added') === 'this-month' ? monthRangeInZone(new Date(), orgTimeZone(org)).start : null
  const search = param(query, 'q').slice(0, 100)

  return (
    <div>
      <MembersClient
        // A new filter in the address bar starts the list fresh.
        key={`${status}|${addedSince}|${search}`}
        initialMembers={members || []}
        teams={teams || []}
        orgId={profile.organization_id}
        canEdit={permissions.manage_members}
        canDelete={permissions.delete_members}
        initialStatus={status}
        initialSearch={search}
        addedSince={addedSince}
        editId={idParam(query, 'edit')}
      />
    </div>
  )
}
