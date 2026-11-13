import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { stripeId as idOf, syncSubscription } from '@/lib/stripe-sync'
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
