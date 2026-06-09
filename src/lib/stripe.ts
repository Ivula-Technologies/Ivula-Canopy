import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-05-27.dahlia',
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
