import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { nullifyEmptyStrings } from '@/lib/utils'
import { getUserAccess } from '@/lib/permissions'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const access = await getUserAccess(supabase, user.id)
  if (!access.permissions.manage_teams) return NextResponse.json({ error: 'You do not have permission to manage teams' }, { status: 403 })

  const admin = await createServiceClient()
  const body = nullifyEmptyStrings(await req.json())
  const { data: team, error } = await admin
    .from('teams')
    .insert(body)
    .select()
    .single()

  if (error) {
    console.error('POST /api/teams:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ team }, { status: 201 })
}
