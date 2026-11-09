import { NextRequest, NextResponse } from 'next/server'
import { isUuid, kidsContext } from '@/lib/kids-server'

// Lost tag: staff check the adult's ID against the guardian and authorized
// pickups, then check the child out without the code. The record keeps who
// did it and the note they wrote, so it can be reviewed later.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!isUuid(id)) return NextResponse.json({ error: 'Check-in not found' }, { status: 404 })

  const ctx = await kidsContext('desk')
  if (ctx instanceof NextResponse) return ctx

  const body = await req.json().catch(() => ({}))
  const pickedUpBy = typeof body?.picked_up_by === 'string' ? body.picked_up_by.trim().slice(0, 120) : ''
  const note = typeof body?.note === 'string' ? body.note.trim().slice(0, 500) : ''
  if (!pickedUpBy) return NextResponse.json({ error: 'Add the name of the person picking up.' }, { status: 400 })
  if (!note) return NextResponse.json({ error: 'Say how you checked who they are, for example “Checked driver’s license”.' }, { status: 400 })

  const { data: checkin, error } = await ctx.admin
    .from('child_checkins')
    .update({
      checked_out_at: new Date().toISOString(),
      checked_out_by: ctx.userId,
      picked_up_by: pickedUpBy,
      checkout_method: 'override',
      checkout_note: note,
    })
    .eq('id', id)
    .eq('organization_id', ctx.orgId)
    .is('checked_out_at', null)
    .select('id')
    .maybeSingle()

  if (error) {
    console.error('POST /api/kids/checkins/[id]/checkout:', error.message)
    return NextResponse.json({ error: 'Could not check out. Please try again.' }, { status: 500 })
  }
  if (!checkin) return NextResponse.json({ error: 'This child is not checked in.' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
