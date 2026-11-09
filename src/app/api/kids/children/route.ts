import { NextRequest, NextResponse } from 'next/server'
import { enforceSubscription } from '@/lib/subscription-guard'
import { cleanChild, validateChild } from '@/lib/kids'
import { isUuid, kidsContext } from '@/lib/kids-server'

export async function POST(req: NextRequest) {
  const ctx = await kidsContext('records')
  if (ctx instanceof NextResponse) return ctx

  const blocked = await enforceSubscription(ctx.supabase, ctx.userId)
  if (blocked) return blocked

  const body = cleanChild(await req.json().catch(() => ({})))
  delete body.is_active
  const invalid = validateChild(body)
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 })

  if (body.guardian_member_id != null) {
    if (!isUuid(body.guardian_member_id)) return NextResponse.json({ error: 'Guardian not found' }, { status: 400 })
    const { data: guardian } = await ctx.admin
      .from('members')
      .select('id')
      .eq('id', body.guardian_member_id)
      .eq('organization_id', ctx.orgId)
      .maybeSingle()
    if (!guardian) return NextResponse.json({ error: 'Guardian not found' }, { status: 400 })
  }

  const { data: child, error } = await ctx.admin
    .from('children')
    .insert({ ...body, organization_id: ctx.orgId })
    .select()
    .single()

  if (error) {
    console.error('POST /api/kids/children:', error.message)
    return NextResponse.json({ error: 'Could not save the child. Please try again.' }, { status: 500 })
  }
  return NextResponse.json({ child }, { status: 201 })
}
