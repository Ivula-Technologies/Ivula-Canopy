import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { orgTimeZone } from '@/lib/timezone'
import { orgByVolunteerToken, SERVE_DAYS_AHEAD } from '@/lib/volunteer-link'
import { ServeClient, type ServeEvent } from './serve-client'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params
  const org = await orgByVolunteerToken(await createServiceClient(), token)
  return {
    title: org ? `Volunteer with ${org.name}` : 'Volunteer sign-up',
    // The link is shared on purpose but shouldn't turn up in search results.
    robots: { index: false, follow: false },
  }
}

// The church-wide sign-up page: every upcoming event that has volunteer
// shifts, on one link the church can share all season.
export default async function ServePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const admin = await createServiceClient()
  const org = await orgByVolunteerToken(admin, token)
  if (!org) notFound()

  const now = new Date()
  const until = new Date(now.getTime() + SERVE_DAYS_AHEAD * 86_400_000)
  const { data: eventRows } = await admin
    .from('events')
    .select('id, title, description, location, starts_at, ends_at, status')
    .eq('organization_id', org.id)
    .gte('starts_at', now.toISOString())
    .lte('starts_at', until.toISOString())
    .order('starts_at', { ascending: true })
    .limit(60)
  const events = (eventRows || []).filter((e) => e.status !== 'cancelled')
  const eventIds = events.map((e) => e.id)

  const [{ data: shiftRows }, { data: counts }] = eventIds.length
    ? await Promise.all([
        admin
          .from('shifts')
          .select('id, event_id, title, description, starts_at, ends_at, capacity')
          .in('event_id', eventIds)
          .order('starts_at', { ascending: true, nullsFirst: true })
          .order('created_at'),
        admin.from('shift_signups').select('shift_id').in('event_id', eventIds).eq('status', 'confirmed'),
      ])
    : [{ data: [] }, { data: [] }]

  const taken: Record<string, number> = {}
  counts?.forEach(({ shift_id }) => { taken[shift_id] = (taken[shift_id] || 0) + 1 })

  const serveEvents: ServeEvent[] = events
    .map((event) => ({
      id: event.id,
      title: event.title,
      description: event.description,
      location: event.location,
      starts_at: event.starts_at,
      shifts: (shiftRows || [])
        .filter((s) => s.event_id === event.id && (!s.starts_at || new Date(s.starts_at) > now))
        .map((s) => ({
          id: s.id,
          title: s.title,
          description: s.description,
          starts_at: s.starts_at,
          ends_at: s.ends_at,
          spots_left: Math.max(0, s.capacity - (taken[s.id] || 0)),
        })),
    }))
    .filter((event) => event.shifts.length > 0)

  return <ServeClient token={token} orgName={org.name} timeZone={orgTimeZone(org)} events={serveEvents} />
}
