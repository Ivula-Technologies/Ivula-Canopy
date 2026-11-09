import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getUserAccess } from '@/lib/permissions'
import { canRunKidsDesk, isUuid } from '@/lib/kids-server'
import { ageLabel } from '@/lib/kids'
import { formatDayIn, formatTimeIn, orgTimeZone } from '@/lib/timezone'
import { LabelSheet, type ChildLabel, type ParentTag } from './label-sheet'

export const metadata = { title: 'Print kids labels', robots: { index: false } }

const MAX_LABELS = 20

type Row = {
  id: string
  room: string | null
  pickup_code: string
  checked_in_at: string
  event: { title: string } | { title: string }[] | null
  child:
    | { first_name: string; last_name: string; birth_date: string | null; allergies: string | null; medical_notes: string | null }
    | { first_name: string; last_name: string; birth_date: string | null; allergies: string | null; medical_notes: string | null }[]
    | null
}

function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

// Labels for children who are checked in right now. The pickup code is only
// ever shown here, on paper: the child's label and the parent's tag carry the
// same code, and staff match them at pickup.
export default async function KidsLabelsPage({ searchParams }: { searchParams: Promise<{ ids?: string; parent?: string }> }) {
  const { ids: idsParam, parent } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const access = await getUserAccess(supabase, user.id)
  if (!access.organizationId) redirect('/onboarding')
  if (!canRunKidsDesk(access.permissions)) redirect('/kids')

  const ids = [...new Set((idsParam || '').split(','))].filter(isUuid).slice(0, MAX_LABELS)
  if (ids.length === 0) redirect('/kids')

  const admin = await createServiceClient()
  const [{ data: rows }, { data: org }] = await Promise.all([
    admin
      .from('child_checkins')
      .select('id, room, pickup_code, checked_in_at, event:events(title), child:children(first_name, last_name, birth_date, allergies, medical_notes)')
      .eq('organization_id', access.organizationId)
      .in('id', ids)
      .is('checked_out_at', null)
      .order('checked_in_at'),
    admin.from('organizations').select('name, timezone').eq('id', access.organizationId).single(),
  ])

  const timeZone = orgTimeZone(org)
  const labels: ChildLabel[] = []
  for (const row of (rows || []) as Row[]) {
    const child = one(row.child)
    if (!child) continue
    const event = one(row.event)
    labels.push({
      id: row.id,
      firstName: child.first_name,
      lastName: child.last_name,
      room: row.room,
      age: ageLabel(child.birth_date),
      allergies: child.allergies?.trim() || null,
      hasMedical: Boolean(child.medical_notes?.trim()),
      code: row.pickup_code,
      when: `${formatDayIn(row.checked_in_at, timeZone)} · ${formatTimeIn(row.checked_in_at, timeZone)}`,
      eventTitle: event?.title || null,
    })
  }

  // Keep brothers and sisters next to each other, then one parent tag per code.
  labels.sort((a, b) => a.code.localeCompare(b.code) || a.firstName.localeCompare(b.firstName))
  const tags: ParentTag[] = []
  for (const label of labels) {
    const tag = tags.find((t) => t.code === label.code)
    if (tag) tag.names.push(label.firstName)
    else tags.push({ code: label.code, names: [label.firstName], when: label.when })
  }

  if (labels.length === 0) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-lg font-semibold text-gray-900">Nothing to print</h1>
        <p className="mt-2 text-sm text-gray-600">These children are no longer checked in, so their labels can’t be printed.</p>
        <Link href="/kids" className="mt-6 inline-block text-sm font-medium text-canopy-700 hover:text-canopy-800">
          Back to check-in
        </Link>
      </div>
    )
  }

  return <LabelSheet orgName={org?.name || ''} labels={labels} tags={tags} includeParentTags={parent !== '0'} />
}
