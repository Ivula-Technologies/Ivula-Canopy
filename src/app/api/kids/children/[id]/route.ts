import { NextRequest, NextResponse } from 'next/server'
import { cleanChild, validateChild } from '@/lib/kids'
import { isUuid, kidsContext } from '@/lib/kids-server'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!isUuid(id)) return NextResponse.json({ error: 'Child not found' }, { status: 404 })

  const ctx = await kidsContext('records')
  if (ctx instanceof NextResponse) return ctx

  const body = cleanChild(await req.json().catch(() => ({})))
  if (Object.keys(body).length === 0) return NextResponse.json({ error: 'Nothing to change' }, { status: 400 })
  const invalid = validateChild(body, { partial: true })
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
    .update(body)
    .eq('id', id)
    .eq('organization_id', ctx.orgId)
    .select()
    .maybeSingle()

  if (error) {
    console.error('PATCH /api/kids/children:', error.message)
    return NextResponse.json({ error: 'Could not save the child. Please try again.' }, { status: 500 })
  }
  if (!child) return NextResponse.json({ error: 'Child not found' }, { status: 404 })
  return NextResponse.json({ child })
}

// Permanent delete, for a family that asks for their details to be removed.
// It also removes the child's check-in history, so it needs "Delete members".
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!isUuid(id)) return NextResponse.json({ error: 'Child not found' }, { status: 404 })

  const ctx = await kidsContext('records')
  if (ctx instanceof NextResponse) return ctx
  if (!ctx.permissions.delete_members) {
    return NextResponse.json({ error: 'You do not have permission to delete records' }, { status: 403 })
  }

  const { data: open } = await ctx.admin
    .from('child_checkins')
    .select('id')
    .eq('child_id', id)
    .eq('organization_id', ctx.orgId)
    .is('checked_out_at', null)
    .limit(1)
  if (open && open.length > 0) {
    return NextResponse.json({ error: 'This child is checked in right now. Check them out first.' }, { status: 409 })
  }

  const { error } = await ctx.admin.from('children').delete().eq('id', id).eq('organization_id', ctx.orgId)
  if (error) {
    console.error('DELETE /api/kids/children:', error.message)
    return NextResponse.json({ error: 'Could not delete the record. Please try again.' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
