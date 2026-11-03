import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// Looks up one volunteer's sign-ups and hours by email. An email address alone
// proves nothing about who is asking, so only signed-in staff can search, and
// only within their own organization.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Please sign in to look up volunteers.' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single()
  const orgId = profile?.organization_id
  if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 403 })

  const { email } = await req.json()
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

  const admin = await createServiceClient()

  const { data: signups } = await admin
    .from('shift_signups')
    .select('id, shift_id, status, signed_up_at, shifts(title, starts_at, ends_at, events(title, location))')
    .eq('organization_id', orgId)
    .eq('email', email.toLowerCase().trim())
    .order('signed_up_at', { ascending: false })

  if (!signups?.length) {
    return NextResponse.json({ error: 'No records found for this email.' }, { status: 404 })
  }

  // Try to find a member record
  const { data: member } = await admin
    .from('members')
    .select('id, first_name, last_name, email')
    .eq('organization_id', orgId)
    .eq('email', email.toLowerCase().trim())
    .limit(1)
    .maybeSingle()

  // Get attendance records if they're a member
  let attendance: { id: string; event_id: string; hours?: number | null; checked_in_at: string; events: { title: string } | null }[] = []
  if (member) {
    const { data: att } = await admin
      .from('attendance')
      .select('id, event_id, hours, checked_in_at, events(title)')
      .eq('organization_id', orgId)
      .eq('member_id', member.id)
      .order('checked_in_at', { ascending: false })
    attendance = (att || []) as unknown as typeof attendance
  }

  const totalHours = attendance.reduce((sum, a) => sum + (a.hours || 0), 0)

  const { id: _memberId, ...memberInfo } = member || { id: null }
  return NextResponse.json({ member: member ? memberInfo : null, signups, attendance, totalHours })
}
