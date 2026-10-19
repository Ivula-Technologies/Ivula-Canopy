import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { createCheckoutSession, createStripeCustomer } from '@/lib/stripe'
import { isPlanId, priceIdForPlan } from '@/lib/plans'

export async function POST(_req: NextRequest) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Billing is not configured (missing Stripe secret key).' }, { status: 500 })
    }
    const body = await _req.json().catch(() => ({}))
    const plan = isPlanId(body?.plan) ? body.plan : 'starter'
    const priceId = priceIdForPlan(plan)
    if (!priceId) {
      return NextResponse.json({ error: `Billing is not configured (missing price ID for the ${plan} plan).` }, { status: 500 })
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

    // An org that already pays should change plans in the billing portal,
    // not start a second subscription.
    if (org.stripe_subscription_id && ['active', 'trialing', 'past_due'].includes(org.subscription_status)) {
      return NextResponse.json(
        { error: 'You already have a subscription. Use "Manage billing" to change plans.' },
        { status: 409 }
      )
    }

    // Create Stripe customer now if it wasn't created at signup. Billing
    // columns are writable only by the service role (migration 010).
    let customerId = org.stripe_customer_id
    if (!customerId) {
      const customer = await createStripeCustomer(user.email!, org.name)
      customerId = customer.id
      const admin = await createServiceClient()
      const { error: saveError } = await admin
        .from('organizations')
        .update({ stripe_customer_id: customerId })
        .eq('id', org.id)
      if (saveError) throw saveError
    }

    // Only the unused part of the 14-day app trial carries over. An org whose
    // trial already ended is charged today instead of getting 14 more free days.
    const trialMsLeft = org.trial_ends_at ? new Date(org.trial_ends_at).getTime() - Date.now() : 0
    const trialDays = org.subscription_status === 'trialing' && trialMsLeft > 0
      ? Math.ceil(trialMsLeft / 86_400_000)
      : 0

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(_req.url).origin
    const session = await createCheckoutSession({
      customerId,
      priceId,
      orgId: org.id,
      trialDays,
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
