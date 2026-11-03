import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getUserAccess } from '@/lib/permissions'
import { enforceSubscription } from '@/lib/subscription-guard'
import { rateLimit } from '@/lib/rate-limit'
import { cleanMessage, messageHtml, sendVolunteerMessage, uniqueEmails } from '@/lib/volunteer-message'

// POST — emails everyone signed up for this event, or for one of its shifts.
// Replies go to the coordinator who sent it.
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

  // Plenty for real use; stops a stuck button or a script from spamming volunteers.
  const limited = rateLimit(`message:${user.id}`, 10, 10 * 60_000)
  if (limited) return limited

  const request = cleanMessage(await req.json().catch(() => ({})))
  if ('error' in request) return NextResponse.json({ error: request.error }, { status: 400 })

  const admin = await createServiceClient()
  const [{ data: event }, { data: org }] = await Promise.all([
    admin.from('events').select('id, title').eq('id', id).eq('organization_id', orgId).maybeSingle(),
    admin.from('organizations').select('name').eq('id', orgId).single(),
  ])
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

  let query = admin
    .from('shift_signups')
    .select('email')
    .eq('event_id', event.id)
    .eq('organization_id', orgId)
    .eq('status', 'confirmed')
  if (request.shiftId) query = query.eq('shift_id', request.shiftId)
  const { data: rows } = await query

  const recipients = uniqueEmails(rows || [])
  if (recipients.length === 0) {
    return NextResponse.json({ error: 'Nobody is signed up yet, so there is no one to email.' }, { status: 400 })
  }

  const orgName = org?.name || 'Your church'
  const result = await sendVolunteerMessage({
    recipients,
    orgName,
    subject: request.subject,
    html: messageHtml({ orgName, eventTitle: event.title, message: request.message }),
    replyTo: user.email,
  })
  if (result.sent === 0) {
    return NextResponse.json({ error: 'The email could not be sent. Please try again in a minute.', ...result }, { status: 502 })
  }
  return NextResponse.json(result)
}
