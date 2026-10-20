import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// Public: the QR code at the door opens this. It returns the event, plus
// people matching what was typed (names only, a few at a time), so anyone
// holding the link can't download the church's whole directory.
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = await createServiceClient()

  const { data: event } = await supabase
    .from('events')
    .select('id, title, starts_at, location, organization_id, checkin_enabled, organizations(*)')
    .eq('checkin_token', token)
    .single()

  if (!event || !event.checkin_enabled) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const org = event.organizations as unknown as { name: string; timezone?: string | null } | null
  const words = (req.nextUrl.searchParams.get('q') || '')
    .replace(/[^\p{L}\s'-]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 0)
    .slice(0, 3)

  let members: { id: string; first_name: string; last_name: string }[] = []
  if (words.join('').length >= 2) {
    let query = supabase
      .from('members')
      .select('id, first_name, last_name')
      .eq('organization_id', event.organization_id)
      .eq('status', 'active')
    for (const w of words) query = query.or(`first_name.ilike.%${w}%,last_name.ilike.%${w}%`)
    const { data } = await query.order('first_name').limit(8)
    members = data || []
  }

  return NextResponse.json({
    event: {
      id: event.id,
      title: event.title,
      starts_at: event.starts_at,
      location: event.location,
      organization: { name: org?.name || '', timezone: org?.timezone ?? null },
    },
    members,
  })
}
