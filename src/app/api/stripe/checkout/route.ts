import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createCheckoutSession, createStripeCustomer } from '@/lib/stripe'

export async function POST(_req: NextRequest) {
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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!
  const session = await createCheckoutSession({
    customerId,
    priceId: process.env.STRIPE_PRICE_ID!,
    orgId: org.id,
    successUrl: `${appUrl}/settings?billing=success`,
    cancelUrl: `${appUrl}/settings?billing=cancelled`,
    trialDays: 0,
  })

  return NextResponse.json({ url: session.url })
}
