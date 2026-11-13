import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createBillingPortalSession } from '@/lib/stripe'
import { getUserAccess } from '@/lib/permissions'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // The billing portal can cancel the plan or change the card, so it is
    // only for people whose role includes "Manage billing".
    const access = await getUserAccess(supabase, user.id)
    if (!access.organizationId) return NextResponse.json({ error: 'No organization' }, { status: 400 })
    if (!access.permissions.manage_billing) {
      return NextResponse.json({ error: 'Only people who manage billing can open billing.' }, { status: 403 })
    }

    const { data: org } = await supabase
      .from('organizations').select('stripe_customer_id').eq('id', access.organizationId).single()
    if (!org?.stripe_customer_id) {
      return NextResponse.json({ error: 'Choose a plan first to set up billing.' }, { status: 400 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin
    const session = await createBillingPortalSession(org.stripe_customer_id, `${appUrl}/settings`)
    return NextResponse.json({ url: session.url })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Could not open billing'
    console.error('POST /api/stripe/portal:', msg)
    return NextResponse.json({ error: 'Could not open billing right now. Please try again.' }, { status: 500 })
  }
}
