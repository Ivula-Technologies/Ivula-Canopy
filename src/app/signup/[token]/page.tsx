import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { SignupClient } from './signup-client'

export default async function PublicSignupPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const admin = await createServiceClient()

  const { data: event } = await admin
    .from('events')
    .select('id, title, description, location, starts_at, ends_at, organization_id, organizations(name)')
    .eq('checkin_token', token)
    .single()

  if (!event) notFound()

  const { data: shifts } = await admin
    .from('shifts')
    .select('id, title, description, starts_at, ends_at, capacity')
    .eq('event_id', event.id)
    .order('starts_at', { ascending: true, nullsFirst: true })
    .order('created_at')

  const { data: counts } = await admin
    .from('shift_signups')
    .select('shift_id')
    .eq('event_id', event.id)
    .eq('status', 'confirmed')

  const countMap: Record<string, number> = {}
  counts?.forEach(({ shift_id }) => {
    countMap[shift_id] = (countMap[shift_id] || 0) + 1
  })

  const shiftsWithSpots = (shifts || []).map((s) => ({
    ...s,
    signup_count: countMap[s.id] || 0,
    spots_left: s.capacity - (countMap[s.id] || 0),
  }))

  const orgName = (event.organizations as unknown as { name: string } | null)?.name || ''
  const { organizations: _orgs, ...eventInfo } = event as typeof event & { organizations?: unknown }

  return (
    <SignupClient
      token={token}
      event={eventInfo}
      shifts={shiftsWithSpots}
      orgName={orgName}
    />
  )
}
