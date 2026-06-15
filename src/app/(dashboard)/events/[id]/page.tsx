import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserAccess } from '@/lib/permissions'
import { AttendanceClient } from './attendance-client'

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile?.organization_id) redirect('/onboarding')

  const { data: event } = await supabase
    .from('events')
    .select('*, team:teams(name)')
    .eq('id', id)
    .eq('organization_id', profile.organization_id)
    .single()

  if (!event) notFound()

  const { data: members } = await supabase
    .from('members')
    .select('id, first_name, last_name, email, status')
    .eq('organization_id', profile.organization_id)
    .eq('status', 'active')
    .order('first_name')

  const { data: attended } = await supabase
    .from('attendance')
    .select('*, member:members(first_name, last_name, email)')
    .eq('event_id', id)

  const { permissions } = await getUserAccess(supabase, user.id)

  return (
    <AttendanceClient
      event={event}
      members={members || []}
      initialAttendance={attended || []}
      orgId={profile.organization_id}
      canEdit={permissions.manage_events}
    />
  )
}
