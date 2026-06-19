import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getPermissionsFromProfile } from '@/lib/permissions'
import { ExpensesClient } from './expenses-client'

export default async function ExpensesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, assigned_role:roles(name, manage_members, delete_members, manage_teams, manage_events, manage_announcements, manage_billing, manage_staff)')
    .eq('id', user.id).single()
  if (!profile?.organization_id) redirect('/onboarding')

  const { permissions } = getPermissionsFromProfile(profile)
  const admin = await createServiceClient()

  const [{ data: expenses }, { data: events }] = await Promise.all([
    admin.from('expenses').select('*, event:events(title)').eq('organization_id', profile.organization_id).order('expense_date', { ascending: false }),
    admin.from('events').select('id, title').eq('organization_id', profile.organization_id).order('starts_at', { ascending: false }).limit(50),
  ])

  return (
    <ExpensesClient
      initialExpenses={expenses || []}
      events={events || []}
      canEdit={permissions.manage_events}
    />
  )
}
