import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getPermissionsFromProfile } from '@/lib/permissions'
import { DonorsClient } from './donors-client'

export default async function DonorsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, assigned_role:roles(name, manage_members, delete_members, manage_teams, manage_events, manage_announcements, manage_billing, manage_staff)')
    .eq('id', user.id)
    .single()
  if (!profile?.organization_id) redirect('/onboarding')

  const admin = await createServiceClient()
  const [{ data: donors }, { data: donations }, { data: members }] = await Promise.all([
    admin.from('donors').select('*, member:members(first_name, last_name)').eq('organization_id', profile.organization_id).order('last_name'),
    admin.from('donations').select('donor_id, amount').eq('organization_id', profile.organization_id),
    admin.from('members').select('id, first_name, last_name').eq('organization_id', profile.organization_id).eq('status', 'active').order('first_name'),
  ])

  // Aggregate per-donor totals
  const totalMap: Record<string, { total: number; count: number }> = {}
  donations?.forEach(({ donor_id, amount }) => {
    if (!donor_id) return
    if (!totalMap[donor_id]) totalMap[donor_id] = { total: 0, count: 0 }
    totalMap[donor_id].total += Number(amount)
    totalMap[donor_id].count += 1
  })

  const enrichedDonors = (donors || []).map((d) => ({
    ...d,
    total_donated: totalMap[d.id]?.total || 0,
    donation_count: totalMap[d.id]?.count || 0,
  }))

  const { permissions } = getPermissionsFromProfile(profile)

  return (
    <DonorsClient
      initialDonors={enrichedDonors}
      members={members || []}
      orgId={profile.organization_id}
      canEdit={permissions.manage_members}
      canDelete={permissions.delete_members}
    />
  )
}
