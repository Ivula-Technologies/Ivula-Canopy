import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getUserAccess } from '@/lib/permissions'
import { enforceSubscription } from '@/lib/subscription-guard'
import { planForPriceId } from '@/lib/plans'

const MAX_ROWS = 2000
const STATUSES = ['active', 'inactive', 'pending']

type Row = {
  first_name?: unknown; last_name?: unknown; email?: unknown; phone?: unknown
  address?: unknown; status?: unknown; notes?: unknown
}

const text = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null)

// POST { members: [...] } — bulk-adds people from a spreadsheet. People whose
// email is already in Canopy (or repeated in the file) are skipped, so
// importing the same file twice doesn't create duplicates.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const blocked = await enforceSubscription(supabase, user.id)
  if (blocked) return blocked

  const access = await getUserAccess(supabase, user.id)
  if (!access.permissions.manage_members) return NextResponse.json({ error: 'You do not have permission to add members' }, { status: 403 })
  const orgId = access.organizationId
  if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 403 })

  const body = await req.json().catch(() => null)
  const rows: Row[] = Array.isArray(body?.members) ? body.members : []
  if (rows.length === 0) return NextResponse.json({ error: 'No people to import' }, { status: 400 })
  if (rows.length > MAX_ROWS) {
    return NextResponse.json({ error: `Please import at most ${MAX_ROWS} people at a time.` }, { status: 400 })
  }

  const admin = await createServiceClient()
  const [{ count: existingCount }, { data: org }] = await Promise.all([
    admin.from('members').select('id', { count: 'exact', head: true }).eq('organization_id', orgId),
    admin.from('organizations').select('subscription_status, stripe_price_id').eq('id', orgId).single(),
  ])

  // Emails from the file that are already in Canopy, looked up in batches
  // (a church can have more people than one query returns).
  const fileEmails = [...new Set(rows.map((r) => text(r.email, 200)?.toLowerCase()).filter((e): e is string => !!e))]
  const seen = new Set<string>()
  for (let i = 0; i < fileEmails.length; i += 200) {
    const { data } = await admin.from('members').select('email').eq('organization_id', orgId).in('email', fileEmails.slice(i, i + 200))
    for (const m of data || []) if (m.email) seen.add(m.email.toLowerCase())
  }
  let skipped = 0
  const toInsert = []
  for (const r of rows) {
    const first = text(r.first_name, 100)
    if (!first) { skipped++; continue }
    const email = text(r.email, 200)?.toLowerCase() || null
    if (email && seen.has(email)) { skipped++; continue }
    if (email) seen.add(email)
    toInsert.push({
      organization_id: orgId,
      first_name: first,
      last_name: text(r.last_name, 100) || '',
      email,
      phone: text(r.phone, 40),
      address: text(r.address, 300),
      status: typeof r.status === 'string' && STATUSES.includes(r.status) ? r.status : 'active',
      notes: text(r.notes, 2000),
    })
  }

  // Same rule as adding one person: paid plans have a people limit, trials don't.
  const plan = org && org.subscription_status !== 'trialing' ? planForPriceId(org.stripe_price_id) : undefined
  if (plan?.peopleLimit != null) {
    const room = plan.peopleLimit - (existingCount || 0)
    if (toInsert.length > room) {
      return NextResponse.json(
        {
          error: `Your ${plan.name} plan includes up to ${plan.peopleLimit} people and you have room for ${Math.max(room, 0)} more. Upgrade your plan in Settings to import everyone.`,
          code: 'plan_limit_reached',
        },
        { status: 402 }
      )
    }
  }

  if (toInsert.length > 0) {
    const { error } = await admin.from('members').insert(toInsert)
    if (error) {
      console.error('POST /api/members/import:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  return NextResponse.json({ imported: toInsert.length, skipped }, { status: 201 })
}
