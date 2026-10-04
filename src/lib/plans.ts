// Canopy pricing tiers. Every plan includes every feature; plans differ only in
// how many people (members, volunteers, donors) an organization can keep.
// Stripe price IDs come from env so test and live mode can differ.

export type PlanId = 'starter' | 'growth' | 'pro'

export interface Plan {
  id: PlanId
  name: string
  monthlyPrice: number
  /** Max people records; null means unlimited. */
  peopleLimit: number | null
  tagline: string
}

export const PLANS: Plan[] = [
  { id: 'starter', name: 'Starter', monthlyPrice: 29, peopleLimit: 150, tagline: 'For small churches and volunteer groups' },
  { id: 'growth', name: 'Growth', monthlyPrice: 59, peopleLimit: 750, tagline: 'For growing congregations and nonprofits' },
  { id: 'pro', name: 'Pro', monthlyPrice: 119, peopleLimit: null, tagline: 'For large and multi-site organizations' },
]

export function getPlan(id: string | null | undefined): Plan | undefined {
  return PLANS.find((p) => p.id === id)
}

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === 'string' && PLANS.some((p) => p.id === value)
}

// Server only: env vars without NEXT_PUBLIC_ are not available in the browser.
export function priceIdForPlan(id: PlanId): string | undefined {
  const byPlan: Record<PlanId, string | undefined> = {
    starter: process.env.STRIPE_PRICE_ID_STARTER,
    growth: process.env.STRIPE_PRICE_ID_GROWTH,
    pro: process.env.STRIPE_PRICE_ID_PRO,
  }
  return byPlan[id]
}

// Maps a subscription's Stripe price back to a plan. Organizations on a price
// we don't recognise (such as the original $25 plan) are grandfathered with
// no people limit, so existing customers are never locked out.
export function planForPriceId(priceId: string | null | undefined): Plan | undefined {
  if (!priceId) return undefined
  return PLANS.find((p) => priceIdForPlan(p.id) === priceId)
}

export function formatPeopleLimit(plan: Plan) {
  return plan.peopleLimit === null ? 'Unlimited people' : `Up to ${plan.peopleLimit.toLocaleString('en-US')} people`
}
