import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// GET — list all staff accounts in this org
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role, organization_id').eq('id', user.id).single()
  if (!profile?.organization_id) return NextResponse.json({ error: 'No organization' }, { status: 400 })
  if (!['org_admin', 'super_admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = await createServiceClient()
  const { data: staff } = await admin
    .from('profiles')
    .select('id, email, full_name, role, created_at, is_active')
    .eq('organization_id', profile.organization_id)
    .order('created_at')

  return NextResponse.json({ staff: staff || [] })
}

// POST — invite a new staff member by email
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role, organization_id').eq('id', user.id).single()
  if (!profile?.organization_id) return NextResponse.json({ error: 'No organization' }, { status: 400 })
  if (!['org_admin', 'super_admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { email, role } = await req.json() as { email: string; role: string }
  if (!email || !['org_admin', 'org_leader'].includes(role)) {
    return NextResponse.json({ error: 'Invalid email or role' }, { status: 400 })
  }

  const admin = await createServiceClient()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${appUrl}/callback`,
    data: {
      role,
      organization_id: profile.organization_id,
    },
  })

  if (error) {
    console.error('POST /api/staff invite:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Pre-create the profile row so the person appears in the staff list immediately,
  // even before they accept the invite.
  await admin.from('profiles').upsert({
    id: data.user.id,
    email,
    full_name: '',
    role,
    organization_id: profile.organization_id,
  }, { onConflict: 'id' })

  return NextResponse.json({ ok: true }, { status: 201 })
}
