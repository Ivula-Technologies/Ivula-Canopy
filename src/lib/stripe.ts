import Stripe from 'stripe'

// Lazy init — constructing Stripe without a key throws at import time,
// which crashes every route that imports this module (and the build)
let _stripe: Stripe | null = null
function getStripe() {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_missing_key', {
      apiVersion: '2026-05-27.dahlia',
    })
  }
  return _stripe
}

export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    return getStripe()[prop as keyof Stripe]
  },
})

export async function createStripeCustomer(email: string, orgName: string) {
  return stripe.customers.create({
    email,
    name: orgName,
    metadata: { platform: 'ivula-canopy' },
  })
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
    subscription_data: {
      trial_period_days: trialDays,
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
