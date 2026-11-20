import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { allRows } from '@/lib/all-rows'
import { choice, links } from '@/lib/links'
import { dateBadgeIn, formatDayIn, formatTimeIn, orgTimeZone } from '@/lib/timezone'
import { loadVolunteerSchedule } from '@/lib/volunteer-schedule'
import { SERVE_DAYS_AHEAD } from '@/lib/volunteer-link'
import { PageHeader } from '@/components/layout/page-header'

export const metadata = { title: 'Volunteer schedule' }

// Every upcoming shift across events: who is on it and how many spots are
// still open. The dashboard's volunteer box opens this page.
export default async function VolunteerSchedulePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const query = await searchParams
  const onlyOpen = choice(query, 'show', ['open'] as const) === 'open'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single()
  if (!profile?.organization_id) redirect('/onboarding')
  const orgId = profile.organization_id as string

  const [{ data: org }, schedule, members] = await Promise.all([
    supabase.from('organizations').select('timezone').eq('id', orgId).single(),
    loadVolunteerSchedule(supabase, orgId),
    allRows<{ id: string; email: string | null }>((from, to) =>
      supabase.from('members').select('id, email').eq('organization_id', orgId).not('email', 'is', null).order('id').range(from, to)
    ),
  ])
  const timeZone = orgTimeZone(org)
  const memberByEmail = new Map(members.filter((m) => m.email).map((m) => [m.email!.toLowerCase(), m.id]))

  const events = schedule.events
    .map((event) => ({ ...event, shifts: onlyOpen ? event.shifts.filter((s) => s.open > 0) : event.shifts }))
    .filter((event) => event.shifts.length > 0)
  const { totals } = schedule

  const boxes = [
    { label: 'Upcoming shifts', value: totals.shifts, href: links.volunteerSchedule(), active: !onlyOpen },
    { label: 'Signed up', value: totals.signedUp, href: links.volunteerSchedule(), active: !onlyOpen },
    { label: 'Spots still open', value: totals.openSpots, href: links.volunteerSchedule('open'), active: onlyOpen, warn: totals.openSpots > 0 },
  ]

  return (
    <div>
      <Link href="/events" className="mb-4 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4" /> Back to Events
      </Link>
      <PageHeader
        title="Volunteer schedule"
        description={`Every shift in the next ${SERVE_DAYS_AHEAD} days, who is on it and what is still open.`}
      />

      <div className="mb-6 grid grid-cols-3 gap-3">
        {boxes.map((b) => (
          <Link
            key={b.label}
            href={b.href}
            className={`rounded-xl border bg-white p-4 transition-shadow hover:shadow-md ${b.active && b.warn ? 'border-amber-300 ring-1 ring-amber-200' : 'border-gray-200'}`}
          >
            <p className={`text-2xl font-bold ${b.warn ? 'text-amber-600' : 'text-gray-900'}`}>{b.value}</p>
            <p className="text-xs text-gray-500">{b.label}</p>
          </Link>
        ))}
      </div>

      <div className="mb-4 flex gap-2 text-sm">
        <Link
          href={links.volunteerSchedule()}
          className={`rounded-lg px-3 py-1.5 font-medium ${!onlyOpen ? 'bg-canopy-600 text-white' : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
        >
          All shifts
        </Link>
        <Link
          href={links.volunteerSchedule('open')}
          className={`rounded-lg px-3 py-1.5 font-medium ${onlyOpen ? 'bg-canopy-600 text-white' : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
        >
          Need people ({totals.shiftsNeedingPeople})
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center text-sm text-gray-500">
          {onlyOpen
            ? 'Every upcoming shift is full.'
            : 'No upcoming shifts yet. Open an event and add shifts like greeters, nursery or parking.'}
          <div className="mt-4">
            <Link href="/events" className="font-medium text-canopy-700 hover:underline">Go to Events</Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((event) => {
            const badge = dateBadgeIn(event.starts_at, timeZone)
            return (
              <section key={event.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                <Link href={links.event(event.id, 'shifts')} className="flex items-center gap-4 border-b border-gray-100 px-4 py-3 hover:bg-gray-50">
                  <span className="flex min-w-[40px] flex-col items-center text-center">
                    <span className="text-xs uppercase text-gray-400">{badge.month}</span>
                    <span className="text-xl font-bold leading-none text-gray-900">{badge.day}</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-gray-900">{event.title}</span>
                    <span className="block truncate text-xs text-gray-500">
                      {formatDayIn(event.starts_at, timeZone)} · {formatTimeIn(event.starts_at, timeZone)}
                      {event.location ? ` · ${event.location}` : ''}
                    </span>
                  </span>
                  <span className={`hidden rounded-full px-2 py-1 text-xs font-medium sm:inline ${event.open > 0 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-700'}`}>
                    {event.open > 0 ? `${event.open} open` : 'All filled'}
                  </span>
                  <ChevronRight className="h-4 w-4 flex-shrink-0 text-gray-400" />
                </Link>
                <ul className="divide-y divide-gray-50">
                  {event.shifts.map((shift) => (
                    <li key={shift.id} className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="min-w-0 flex-1 text-sm font-medium text-gray-900">
                          {shift.title}
                          {shift.starts_at && (
                            <span className="ml-2 text-xs font-normal text-gray-400">
                              {formatTimeIn(shift.starts_at, timeZone)}{shift.ends_at ? ` – ${formatTimeIn(shift.ends_at, timeZone)}` : ''}
                            </span>
                          )}
                        </p>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${shift.open > 0 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-700'}`}>
                          {shift.filled}/{shift.capacity} filled{shift.open > 0 ? ` · ${shift.open} open` : ''}
                        </span>
                      </div>
                      {shift.people.length > 0 && (
                        <p className="mt-1 text-xs text-gray-500">
                          {shift.people.map((p, i) => {
                            const memberId = p.member_id || memberByEmail.get(p.email.toLowerCase())
                            const name = `${p.first_name} ${p.last_name}`
                            return (
                              <span key={p.id}>
                                {i > 0 && ', '}
                                {memberId ? (
                                  <Link href={links.member(memberId)} className="text-gray-700 hover:text-canopy-700 hover:underline">{name}</Link>
                                ) : (
                                  name
                                )}
                              </span>
                            )
                          })}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
