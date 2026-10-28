import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getUserAccess } from '@/lib/permissions'

// DELETE — a coordinator takes someone off a shift. The sign-up is marked
// cancelled rather than deleted, the same as when a volunteer cancels.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; signupId: string }> }) {
  const { id, signupId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const access = await getUserAccess(supabase, user.id)
  if (!access.permissions.manage_events) return NextResponse.json({ error: 'You do not have permission to manage events' }, { status: 403 })
  const orgId = access.organizationId
  if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 403 })

  const admin = await createServiceClient()
  const { data, error } = await admin
    .from('shift_signups')
    .update({ status: 'cancelled' })
    .eq('id', signupId)
    .eq('shift_id', id)
    .eq('organization_id', orgId)
    .select('id')
  if (error) return NextResponse.json({ error: 'Could not remove this volunteer.' }, { status: 500 })
  if (!data?.length) return NextResponse.json({ error: 'Sign-up not found' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
