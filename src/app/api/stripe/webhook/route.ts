import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase/server'
import type Stripe from 'stripe'

// Every billing event is handled the same way: fetch the subscription's
// current state from Stripe and copy it onto the organization. That makes
// the handler safe to run twice and immune to events arriving out of order
// (Stripe guarantees neither). If saving fails we answer 500 so Stripe
// retries instead of the org silently keeping a stale status.
export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret || !process.env.STRIPE_SECRET_KEY) {
    console.error('Stripe webhook: STRIPE_WEBHOOK_SECRET or STRIPE_SECRET_KEY is not set')
    return NextResponse.json({ error: 'Billing is not configured' }, { status: 500 })
  }

  const body = await req.text()
  const sig = req.headers.get('stripe-signature')
  if (!sig) return NextResponse.json({ error: 'Missing signature' }, { status: 400 })

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const subscriptionId = subscriptionIdFor(event)
  if (!subscriptionId) return NextResponse.json({ received: true, ignored: event.type })

  try {
    const sub = await stripe.subscriptions.retrieve(subscriptionId)
    await syncSubscription(sub)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`Stripe webhook ${event.type} ${event.id}:`, msg)
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

function idOf(value: unknown): string | null {
  if (!value) return null
  if (typeof value === 'string') return value
  return (value as { id?: string }).id ?? null
}

function subscriptionIdFor(event: Stripe.Event): string | null {
  const obj = event.data.object as unknown as Record<string, unknown>
  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
    case 'customer.subscription.paused':
    case 'customer.subscription.resumed':
    case 'customer.subscription.trial_will_end':
      return idOf(obj.id)
    case 'checkout.session.completed':
      return idOf(obj.subscription)
    case 'invoice.paid':
    case 'invoice.payment_succeeded':
    case 'invoice.payment_failed': {
      // Newer API versions moved the subscription under invoice.parent.
      const parent = obj.parent as { subscription_details?: { subscription?: unknown } } | undefined
      return idOf(parent?.subscription_details?.subscription) ?? idOf(obj.subscription)
    }
    default:
      return null
  }
}

function toIso(seconds: unknown): string | null {
  return typeof seconds === 'number' ? new Date(seconds * 1000).toISOString() : null
}

async function syncSubscription(sub: Stripe.Subscription) {
  const supabase = await createServiceClient()
  const item = sub.items.data[0] as unknown as Record<string, unknown> | undefined
  const subAny = sub as unknown as Record<string, unknown>
  const customerId = idOf(sub.customer)
  const orgId = (sub.metadata?.organization_id as string | undefined) || null

  // Stripe statuses map onto ours; anything that can't be billed is "canceled".
  const status =
    sub.status === 'active' || sub.status === 'trialing' || sub.status === 'past_due'
      ? sub.status
      : sub.status === 'incomplete'
        ? 'incomplete'
        : 'canceled'

  const updates: Record<string, unknown> = {
    stripe_customer_id: customerId,
    stripe_subscription_id: sub.id,
    stripe_price_id: (item?.price as { id?: string } | undefined)?.id ?? null,
    subscription_status: status,
    current_period_end: toIso(item?.current_period_end ?? subAny.current_period_end),
  }
  // Keep the app's trial clock in step with Stripe's, so a card-on-file
  // trial never shows as "trial expired".
  if (sub.status === 'trialing' && sub.trial_end) updates.trial_ends_at = toIso(sub.trial_end)

  let query = supabase.from('organizations').update(updates)
  query = orgId ? query.eq('id', orgId) : query.eq('stripe_customer_id', customerId)
  const { data, error } = await query.select('id')
  if (error) throw error
  if (!data?.length) {
    // Subscriptions made outside Canopy (e.g. other Ivula products on the
    // same Stripe account) have no org; that's not an error.
    console.warn(`Stripe webhook: no organization for subscription ${sub.id} (customer ${customerId})`)
  }
}
