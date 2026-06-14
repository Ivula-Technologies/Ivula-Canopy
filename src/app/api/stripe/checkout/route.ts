import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createCheckoutSession, createStripeCustomer } from '@/lib/stripe'

export async function POST(_req: NextRequest) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Billing is not configured (missing Stripe secret key).' }, { status: 500 })
    }
    if (!process.env.STRIPE_PRICE_ID) {
      return NextResponse.json({ error: 'Billing is not configured (missing price ID).' }, { status: 500 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles').select('organization_id').eq('id', user.id).single()
    if (!profile?.organization_id) return NextResponse.json({ error: 'No organization' }, { status: 400 })

    const { data: org } = await supabase
      .from('organizations').select('*').eq('id', profile.organization_id).single()
    if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 })

    // Create Stripe customer now if it wasn't created at signup
    let customerId = org.stripe_customer_id
    if (!customerId) {
      const customer = await createStripeCustomer(user.email!, org.name)
      customerId = customer.id
      await supabase
        .from('organizations')
        .update({ stripe_customer_id: customerId })
        .eq('id', org.id)
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(_req.url).origin
    const session = await createCheckoutSession({
      customerId,
      priceId: process.env.STRIPE_PRICE_ID,
      orgId: org.id,
      successUrl: `${appUrl}/settings?billing=success`,
      cancelUrl: `${appUrl}/settings?billing=cancelled`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Checkout failed'
    console.error('POST /api/stripe/checkout:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
