import { NextRequest, NextResponse } from 'next/server'
import { isPickupCodeShape, normalizePickupCode } from '@/lib/kids'
import { isUuid, kidsContext } from '@/lib/kids-server'
import { rateLimit } from '@/lib/rate-limit'

// Pickup by code. Step 1 ("lookup") shows staff which children the parent's
// tag belongs to, with the guardian and anyone else allowed to collect them.
// Step 2 ("confirm") checks out the children staff ticked.
// Checkout is never blocked by billing: a child must always be able to go home.
export async function POST(req: NextRequest) {
  const ctx = await kidsContext('desk')
  if (ctx instanceof NextResponse) return ctx

  // Stops anyone working through every possible code from one login.
  const limited = rateLimit(`kids-checkout:${ctx.userId}`, 60, 10 * 60 * 1000)
  if (limited) return limited

  const body = await req.json().catch(() => ({}))
  const code = normalizePickupCode(body?.code)
  if (!isPickupCodeShape(code)) {
    return NextResponse.json({ error: 'Pickup codes are 4 letters and numbers, as printed on the parent’s tag.' }, { status: 400 })
  }

  const { data: matches, error } = await ctx.admin
    .from('child_checkins')
    .select('id, room, checked_in_at, child:children(first_name, last_name, guardian_name, guardian_phone, authorized_pickups, allergies)')
    .eq('organization_id', ctx.orgId)
    .eq('pickup_code', code)
    .is('checked_out_at', null)
    .order('checked_in_at')

  if (error) {
    console.error('POST /api/kids/checkout:', error.message)
    return NextResponse.json({ error: 'Could not look up that code. Please try again.' }, { status: 500 })
  }
  if (!matches || matches.length === 0) {
    return NextResponse.json({ error: 'No child is checked in with that code. Check the tag and try again.' }, { status: 404 })
  }

  if (body?.action !== 'confirm') return NextResponse.json({ checkins: matches })

  const ids: unknown[] = Array.isArray(body?.checkin_ids) ? body.checkin_ids : []
  const allowed = new Set(matches.map((m) => m.id))
  const chosen = ids.filter((id): id is string => isUuid(id) && allowed.has(id))
  if (chosen.length === 0) return NextResponse.json({ error: 'Choose the children going home.' }, { status: 400 })

  const pickedUpBy = typeof body?.picked_up_by === 'string' ? body.picked_up_by.trim().slice(0, 120) : ''
  if (!pickedUpBy) return NextResponse.json({ error: 'Add the name of the person picking up.' }, { status: 400 })

  const { data: done, error: updateError } = await ctx.admin
    .from('child_checkins')
    .update({
      checked_out_at: new Date().toISOString(),
      checked_out_by: ctx.userId,
      picked_up_by: pickedUpBy,
      checkout_method: 'code',
    })
    .in('id', chosen)
    .eq('organization_id', ctx.orgId)
    .is('checked_out_at', null)
    .select('id')

  if (updateError) {
    console.error('POST /api/kids/checkout confirm:', updateError.message)
    return NextResponse.json({ error: 'Could not check out. Please try again.' }, { status: 500 })
  }
  return NextResponse.json({ checked_out: (done || []).map((d) => d.id) })
}
