import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getUserAccess } from '@/lib/permissions'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const access = await getUserAccess(supabase, user.id)
  if (!access.permissions.manage_events || !access.organizationId) {
    return NextResponse.json({ error: 'You do not have permission to log hours' }, { status: 403 })
  }

  const { signup_id, email, hours } = await req.json()
  if (!signup_id || !email || !hours) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const admin = await createServiceClient()

  // Verify the signup belongs to this email
  const { data: signup } = await admin
    .from('shift_signups')
    .select('id, event_id, organization_id, member_id, status')
    .eq('id', signup_id)
    .eq('organization_id', access.organizationId)
    .eq('email', email.toLowerCase().trim())
    .eq('status', 'confirmed')
    .single()

  if (!signup) return NextResponse.json({ error: 'Signup not found' }, { status: 404 })
  if (!signup.member_id) return NextResponse.json({ error: 'Hours can only be logged for registered members.' }, { status: 400 })

  // Upsert attendance record with hours
  const { error } = await admin.from('attendance').upsert({
    event_id: signup.event_id,
    member_id: signup.member_id,
    organization_id: signup.organization_id,
    method: 'qr',
    checked_in_at: new Date().toISOString(),
    hours,
  }, { onConflict: 'event_id,member_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
