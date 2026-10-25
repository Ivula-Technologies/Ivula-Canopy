import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { nullifyEmptyStrings } from '@/lib/utils'
import { sendAnnouncementEmail } from '@/lib/email'
import { getUserAccess } from '@/lib/permissions'
import { enforceSubscription } from '@/lib/subscription-guard'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const blocked = await enforceSubscription(supabase, user.id)
  if (blocked) return blocked

  const access = await getUserAccess(supabase, user.id)
  if (!access.permissions.manage_announcements) return NextResponse.json({ error: 'You do not have permission to post announcements' }, { status: 403 })
  const orgId = access.organizationId
  if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 403 })

  const admin = await createServiceClient()
  // send_email is a UI-only flag — strip it before inserting into the table
  const { send_email, ...rest } = await req.json()
  const body = nullifyEmptyStrings(rest)
  // A team from another organization would email that organization's members.
  if (body.team_id) {
    const { data: team } = await admin.from('teams').select('id').eq('id', body.team_id).eq('organization_id', orgId).maybeSingle()
    if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 })
  }
  const { data: announcement, error } = await admin
    .from('announcements')
    .insert({ ...body, organization_id: orgId, created_by: user.id })
    .select()
    .single()

  if (error) {
    console.error('POST /api/announcements:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let emailResult: { sent: number; failed?: number } | null = null
  if (send_email) {
    emailResult = await emailAnnouncement(admin, announcement)
  }

  return NextResponse.json({ announcement, email: emailResult }, { status: 201 })
}

// Email an announcement to its audience — the whole org, or a single team if targeted.
async function emailAnnouncement(
  admin: Awaited<ReturnType<typeof createServiceClient>>,
  announcement: { id: string; organization_id: string; team_id: string | null; title: string; body: string }
) {
  const { data: org } = await admin
    .from('organizations')
    .select('name')
    .eq('id', announcement.organization_id)
    .single()

  let recipients: string[] = []
  if (announcement.team_id) {
    // Members of the targeted team
    const { data: rows } = await admin
      .from('team_memberships')
      .select('member:members(email)')
      .eq('team_id', announcement.team_id)
    recipients = (rows || [])
      .map((r) => (r.member as { email?: string } | null)?.email)
      .filter((e): e is string => !!e)
  } else {
    // Whole active organization
    const { data: rows } = await admin
      .from('members')
      .select('email')
      .eq('organization_id', announcement.organization_id)
      .eq('status', 'active')
    recipients = (rows || []).map((r) => r.email).filter((e): e is string => !!e)
  }

  try {
    return await sendAnnouncementEmail(
      recipients,
      org?.name || 'Your organization',
      announcement.title,
      announcement.body
    )
  } catch (e) {
    console.error('Announcement email failed:', e instanceof Error ? e.message : e)
    return { sent: 0, failed: recipients.length }
  }
}
