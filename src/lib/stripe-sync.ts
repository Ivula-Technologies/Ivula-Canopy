import type Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase/server'

export function stripeId(value: unknown): string | null {
  if (!value) return null
  if (typeof value === 'string') return value
  return (value as { id?: string }).id ?? null
}

function toIso(seconds: unknown): string | null {
  return typeof seconds === 'number' ? new Date(seconds * 1000).toISOString() : null
}

/** Our status for a Stripe subscription status: anything that can't be billed is "canceled". */
export function appStatusFor(status: Stripe.Subscription.Status): 'active' | 'trialing' | 'past_due' | 'incomplete' | 'canceled' {
  if (status === 'active' || status === 'trialing' || status === 'past_due') return status
  return status === 'incomplete' ? 'incomplete' : 'canceled'
}

// Copies a subscription's current state from Stripe onto its organization.
// Used by the webhook and when someone comes back from Checkout, so a paid
// church is unlocked even if the webhook is late or misconfigured.
export async function syncSubscription(sub: Stripe.Subscription) {
  const supabase = await createServiceClient()
  const item = sub.items.data[0] as unknown as Record<string, unknown> | undefined
  const subAny = sub as unknown as Record<string, unknown>
  const customerId = stripeId(sub.customer)
  const orgId = (sub.metadata?.organization_id as string | undefined) || null

  const updates: Record<string, unknown> = {
    stripe_customer_id: customerId,
    stripe_subscription_id: sub.id,
    stripe_price_id: (item?.price as { id?: string } | undefined)?.id ?? null,
    subscription_status: appStatusFor(sub.status),
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
    console.warn(`Stripe sync: no organization for subscription ${sub.id} (customer ${customerId})`)
  }
}

// After Checkout, Stripe sends people back with the session id. Saves the new
// subscription right away instead of waiting for the webhook. Only a session
// that belongs to this organization counts; any problem is left to the webhook.
export async function syncCheckoutSession(sessionId: string, orgId: string): Promise<boolean> {
  if (!process.env.STRIPE_SECRET_KEY || !/^cs_[A-Za-z0-9_]+$/.test(sessionId)) return false
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    if (session.metadata?.organization_id !== orgId) return false
    const subscriptionId = stripeId(session.subscription)
    if (!subscriptionId) return false
    const sub = await stripe.subscriptions.retrieve(subscriptionId)
    if (sub.metadata?.organization_id !== orgId) return false
    await syncSubscription(sub)
    return true
  } catch (err) {
    console.error('Checkout return sync:', err instanceof Error ? err.message : String(err))
    return false
  }
}
