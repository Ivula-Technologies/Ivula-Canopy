import Stripe from 'stripe'

// Lazy init — constructing Stripe without a key throws at import time,
// which crashes every route that imports this module (and the build)
let _stripe: Stripe | null = null
function getStripe() {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_missing_key', {
      apiVersion: '2026-05-27.dahlia',
      // Retry brief network blips and Stripe 5xx answers. The SDK sends the
      // same idempotency key on each retry, so nothing is created twice.
      maxNetworkRetries: 2,
      // Fail in 20 seconds rather than leave a church admin waiting.
      timeout: 20_000,
    })
  }
  return _stripe
}

export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    return getStripe()[prop as keyof Stripe]
  },
})

export async function createStripeCustomer(email: string, orgName: string, orgId?: string) {
  return stripe.customers.create(
    {
      email,
      name: orgName,
      metadata: { platform: 'ivula-canopy', ...(orgId ? { organization_id: orgId } : {}) },
    },
    // A double click gets the same customer back from Stripe instead of a
    // second one (Stripe keeps keys for 24 hours). Two different admins at
    // once are handled by ensureStripeCustomer() in stripe-customer.ts.
    orgId ? { idempotencyKey: `canopy-customer-${orgId}-${email.toLowerCase()}-${orgName}`.slice(0, 255) } : undefined
  )
}

/** Best effort: removes a customer made by a request that lost a race. */
export async function deleteStripeCustomer(customerId: string) {
  try {
    await stripe.customers.del(customerId)
  } catch {
    // An unused customer with no subscription costs nothing; leave it.
  }
}

export async function createCheckoutSession({
  customerId,
  priceId,
  orgId,
  successUrl,
  cancelUrl,
  trialDays = 14,
}: {
  customerId: string
  priceId: string
  orgId: string
  successUrl: string
  cancelUrl: string
  trialDays?: number
}) {
  return stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    // Lets founding customers enter a discount code created in Stripe.
    allow_promotion_codes: true,
    subscription_data: {
      ...(trialDays > 0 ? { trial_period_days: trialDays } : {}),
      metadata: { organization_id: orgId },
    },
    metadata: { organization_id: orgId },
    success_url: successUrl,
    cancel_url: cancelUrl,
  })
}

export async function createBillingPortalSession(customerId: string, returnUrl: string) {
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  })
}
