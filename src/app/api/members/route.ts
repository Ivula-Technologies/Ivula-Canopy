import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { nullifyEmptyStrings } from '@/lib/utils'
import { getUserAccess } from '@/lib/permissions'
import { enforceSubscription } from '@/lib/subscription-guard'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const blocked = await enforceSubscription(supabase, user.id)
  if (blocked) return blocked

  const access = await getUserAccess(supabase, user.id)
  if (!access.permissions.manage_members) return NextResponse.json({ error: 'You do not have permission to add members' }, { status: 403 })

  const admin = await createServiceClient()
  const body = nullifyEmptyStrings(await req.json())
  const { data: member, error } = await admin
    .from('members')
    .insert(body)
    .select()
    .single()

  if (error) {
    console.error('POST /api/members:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ member }, { status: 201 })
}
