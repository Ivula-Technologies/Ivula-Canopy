import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getUserAccess } from '@/lib/permissions'
import { isValidTimeZone } from '@/lib/timezone'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Administrators only: anyone whose role can manage staff or billing. This
  // used to rest on the old admin/leader label, so an Administrator invited
  // from Settings saw "Saved" while nothing changed.
  const access = await getUserAccess(supabase, user.id)
  if (!access.organizationId || (access.organizationId !== id && !access.isSuperAdmin)) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
  }
  if (!access.permissions.manage_staff && !access.permissions.manage_billing) {
    return NextResponse.json({ error: 'Only administrators can change the organization profile.' }, { status: 403 })
  }

  // Only the profile fields on the Settings page. Billing columns are owned
  // by the Stripe webhook and must never come from the browser.
  const body = await req.json().catch(() => ({}))
  const updates: Record<string, string | null> = {}
  for (const key of ['name', 'description', 'logo_url', 'website', 'phone', 'address'] as const) {
    if (typeof body?.[key] === 'string') updates[key] = body[key].trim() || null
  }
  if (body?.timezone !== undefined) {
    if (!isValidTimeZone(body.timezone)) return NextResponse.json({ error: 'Unknown time zone' }, { status: 400 })
    updates.timezone = body.timezone
  }
  if ('name' in updates && !updates.name) {
    return NextResponse.json({ error: 'Organization name is required' }, { status: 400 })
  }
  if (!Object.keys(updates).length) return NextResponse.json({ ok: true })

  const admin = await createServiceClient()
  const { data, error } = await admin
    .from('organizations')
    .update(updates)
    .eq('id', id)
    .select('id')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data?.length) return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
