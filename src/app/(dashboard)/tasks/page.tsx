import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getPermissionsFromProfile, PROFILE_WITH_ROLE } from '@/lib/permissions'
import { TasksClient } from './tasks-client'

export default async function TasksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select(PROFILE_WITH_ROLE)
    .eq('id', user.id)
    .single()
  if (!profile?.organization_id) redirect('/onboarding')

  const admin = await createServiceClient()
  const [{ data: tasks }, { data: teams }, { data: members }] = await Promise.all([
    admin.from('tasks')
      .select('*, team:teams(name), assigned_to:members(first_name, last_name)')
      .eq('organization_id', profile.organization_id)
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false }),
    admin.from('teams').select('id, name').eq('organization_id', profile.organization_id).eq('is_active', true).order('name'),
    admin.from('members').select('id, first_name, last_name').eq('organization_id', profile.organization_id).eq('status', 'active').order('first_name'),
  ])

  const { permissions } = getPermissionsFromProfile(profile)
  const canEdit = permissions.manage_members || permissions.manage_events

  return (
    <TasksClient
      initialTasks={tasks || []}
      teams={teams || []}
      members={members || []}
      orgId={profile.organization_id}
      canEdit={canEdit}
    />
  )
}
