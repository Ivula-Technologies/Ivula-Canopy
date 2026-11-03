import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getUserAccess } from '@/lib/permissions'
import { enforceSubscription } from '@/lib/subscription-guard'
import { orgTimeZone } from '@/lib/timezone'
import { cleanVolunteer, sendSignupConfirmation, signUpForShift } from '@/lib/shift-signup'

// POST — a coordinator puts someone on a shift: a member picked from the list,
// or anyone by name and email (e.g. someone who said yes in the hallway).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const blocked = await enforceSubscription(supabase, user.id)
  if (blocked) return blocked

  const access = await getUserAccess(supabase, user.id)
  if (!access.permissions.manage_events) return NextResponse.json({ error: 'You do not have permission to manage events' }, { status: 403 })
  const orgId = access.organizationId
  if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 403 })

  const admin = await createServiceClient()
  const { data: shift } = await admin
    .from('shifts')
    .select('id, event_id, title, capacity, starts_at')
    .eq('id', id)
    .eq('organization_id', orgId)
    .maybeSingle()
  if (!shift) return NextResponse.json({ error: 'Shift not found' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  let fields: Record<string, unknown> = body
  if (typeof body.member_id === 'string' && body.member_id) {
    const { data: member } = await admin
      .from('members')
      .select('first_name, last_name, email, phone')
      .eq('id', body.member_id)
      .eq('organization_id', orgId)
      .maybeSingle()
    if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    if (!member.email) return NextResponse.json({ error: 'Add an email address to this member first.' }, { status: 400 })
    fields = member
  }
  const volunteer = cleanVolunteer(fields)
  if ('error' in volunteer) return NextResponse.json({ error: volunteer.error }, { status: 400 })

  const result = await signUpForShift(admin, { orgId, eventId: shift.event_id, shift, volunteer })
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })

  if (body.notify !== false) {
    const [{ data: event }, { data: org }] = await Promise.all([
      admin.from('events').select('title, location, starts_at').eq('id', shift.event_id).single(),
      admin.from('organizations').select('*').eq('id', orgId).single(),
    ])
    sendSignupConfirmation({
      to: volunteer.email,
      firstName: volunteer.first_name,
      orgName: org?.name || 'Your church',
      timeZone: orgTimeZone(org),
      shifts: [{
        shiftTitle: shift.title,
        eventTitle: event?.title || '',
        startsAt: shift.starts_at || event?.starts_at,
        location: event?.location,
        cancelToken: result.signup.cancel_token,
      }],
    }).catch(console.error)
  }

  return NextResponse.json({ signup: result.signup }, { status: 201 })
}
