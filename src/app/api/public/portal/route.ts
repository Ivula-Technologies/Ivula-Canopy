import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const { email } = await req.json()
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

  const admin = await createServiceClient()

  // Look up shift signups for this email across all orgs
  const { data: signups } = await admin
    .from('shift_signups')
    .select('id, shift_id, status, signed_up_at, shifts(title, starts_at, ends_at, events(title, location))')
    .eq('email', email.toLowerCase().trim())
    .order('signed_up_at', { ascending: false })

  if (!signups?.length) {
    return NextResponse.json({ error: 'No records found for this email.' }, { status: 404 })
  }

  // Try to find a member record
  const { data: member } = await admin
    .from('members')
    .select('first_name, last_name, email, organization_id')
    .eq('email', email.toLowerCase().trim())
    .limit(1)
    .single()

  // Get attendance records if they're a member
  let attendance: { id: string; event_id: string; hours?: number | null; checked_in_at: string; events: { title: string } | null }[] = []
  if (member) {
    const { data: att } = await admin
      .from('attendance')
      .select('id, event_id, hours, checked_in_at, events(title)')
      .eq('organization_id', member.organization_id)
      .order('checked_in_at', { ascending: false })
    attendance = (att || []) as unknown as typeof attendance
  }

  const totalHours = attendance.reduce((sum, a) => sum + (a.hours || 0), 0)

  return NextResponse.json({ member: member || null, signups, attendance, totalHours })
}
