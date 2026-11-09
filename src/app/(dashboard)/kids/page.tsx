import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPermissionsFromProfile, PROFILE_WITH_ROLE } from '@/lib/permissions'
import { canManageChildren, canRunKidsDesk } from '@/lib/kids-server'
import { addDaysInZone, orgTimeZone, startOfDayInZone } from '@/lib/timezone'
import { PageHeader } from '@/components/layout/page-header'
import { KidsClient } from './kids-client'

export const metadata = { title: 'Kids check-in' }

export default async function KidsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select(PROFILE_WITH_ROLE)
    .eq('id', user.id)
    .single()
  if (!profile?.organization_id) redirect('/onboarding')
  const orgId = profile.organization_id as string

  const { permissions } = getPermissionsFromProfile(profile)
  const canDesk = canRunKidsDesk(permissions)
  const canEdit = canManageChildren(permissions)

  if (!canDesk && !canEdit) {
    return (
      <div>
        <PageHeader title="Kids check-in" />
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-600">
          Kids check-in needs the &ldquo;Manage events&rdquo; or &ldquo;Manage members&rdquo; permission. Ask an admin to
          add it to your role in Settings.
        </div>
      </div>
    )
  }

  const { data: org } = await supabase.from('organizations').select('id, name, timezone').eq('id', orgId).single()
  const timeZone = orgTimeZone(org)
  const dayStart = startOfDayInZone(new Date(), timeZone)
  const dayEnd = addDaysInZone(dayStart, 1, timeZone) || dayStart
  const recentSince = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString()

  // Pickup codes stay on the printed labels: none of these selects reads them.
  const CHECKIN_FIELDS = 'id, child_id, event_id, room, checked_in_at, checked_out_at, picked_up_by, checkout_method, checkout_note'

  const [{ data: children }, { data: open }, { data: today }, { data: recent }, { data: events }, { data: members }] =
    await Promise.all([
      supabase.from('children').select('*').eq('organization_id', orgId).order('first_name'),
      supabase.from('child_checkins').select(CHECKIN_FIELDS).eq('organization_id', orgId).is('checked_out_at', null).order('checked_in_at'),
      supabase.from('child_checkins').select(CHECKIN_FIELDS).eq('organization_id', orgId).gte('checked_in_at', dayStart).order('checked_in_at', { ascending: false }),
      supabase.from('child_checkins').select('child_id, room').eq('organization_id', orgId).gte('checked_in_at', recentSince).not('room', 'is', null).order('checked_in_at', { ascending: false }).limit(1000),
      supabase.from('events').select('id, title, starts_at').eq('organization_id', orgId).gte('starts_at', dayStart).lt('starts_at', dayEnd).or('status.is.null,status.neq.cancelled').order('starts_at'),
      canEdit
        ? supabase.from('members').select('id, first_name, last_name, phone').eq('organization_id', orgId).order('first_name')
        : Promise.resolve({ data: [] as { id: string; first_name: string; last_name: string; phone: string | null }[] }),
    ])

  // Each child's most recent room, to prefill the desk.
  const lastRooms: Record<string, string> = {}
  for (const row of recent || []) {
    if (row.room && !lastRooms[row.child_id]) lastRooms[row.child_id] = row.room
  }

  return (
    <KidsClient
      initialChildren={children || []}
      initialOpen={open || []}
      initialToday={today || []}
      lastRooms={lastRooms}
      events={events || []}
      members={members || []}
      timeZone={timeZone}
      canDesk={canDesk}
      canEdit={canEdit}
      canDelete={permissions.delete_members}
    />
  )
}
