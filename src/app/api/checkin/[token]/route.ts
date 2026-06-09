import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = await createServiceClient()

  const { data: event } = await supabase
    .from('events')
    .select('id, title, starts_at, location, organization_id, checkin_enabled, organizations(name)')
    .eq('checkin_token', token)
    .single()

  if (!event || !event.checkin_enabled) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { data: members } = await supabase
    .from('members')
    .select('id, first_name, last_name, email')
    .eq('organization_id', event.organization_id)
    .eq('status', 'active')
    .order('first_name')

  return NextResponse.json({
    event: {
      id: event.id,
      title: event.title,
      starts_at: event.starts_at,
      location: event.location,
      organization: (event.organizations as unknown as { name: string }),
    },
    members: members || [],
  })
}
