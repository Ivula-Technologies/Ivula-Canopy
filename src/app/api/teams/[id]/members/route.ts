import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getUserAccess } from '@/lib/permissions'

// GET /api/teams/[id]/members — list current memberships
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single()
  if (!profile?.organization_id) return NextResponse.json({ error: 'No organization' }, { status: 403 })
  const admin = await createServiceClient()
  const { data: team } = await admin.from('teams').select('id').eq('id', id).eq('organization_id', profile.organization_id).maybeSingle()
  if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 })

  const { data, error } = await admin
    .from('team_memberships')
    .select('member_id')
    .eq('team_id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ memberIds: data.map((r) => r.member_id) })
}

// POST /api/teams/[id]/members — set memberships (replace all)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const access = await getUserAccess(supabase, user.id)
  if (!access.permissions.manage_teams) return NextResponse.json({ error: 'You do not have permission to manage teams' }, { status: 403 })

  const orgId = access.organizationId
  if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 403 })

  const { memberIds: requested } = await req.json() as { memberIds: string[] }
  const admin = await createServiceClient()

  const { data: team } = await admin.from('teams').select('id').eq('id', id).eq('organization_id', orgId).maybeSingle()
  if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 })

  // Only people from this organization can join its teams.
  const { data: ownMembers } = requested?.length
    ? await admin.from('members').select('id').eq('organization_id', orgId).in('id', requested)
    : { data: [] as { id: string }[] }
  const memberIds = (ownMembers || []).map((m) => m.id)

  // Delete all existing memberships for this team, then insert new ones
  const { error: delError } = await admin.from('team_memberships').delete().eq('team_id', id)
  if (delError) return NextResponse.json({ error: delError.message }, { status: 500 })

  if (memberIds.length > 0) {
    const { error: insError } = await admin.from('team_memberships').insert(
      memberIds.map((member_id) => ({ team_id: id, member_id, role: 'member' }))
    )
    if (insError) return NextResponse.json({ error: insError.message }, { status: 500 })
  }

  return NextResponse.json({ count: memberIds.length })
}
