import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isValidTimeZone } from '@/lib/timezone'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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

  const { error } = await supabase
    .from('organizations')
    .update(updates)
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
