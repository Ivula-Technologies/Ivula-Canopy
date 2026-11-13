import { beforeEach, describe, expect, it, vi } from 'vitest'

// Coming back from Stripe Checkout saves the plan straight away, but only for
// a session and subscription that belong to the signed-in organization.

const state = vi.hoisted(() => ({
  session: {} as Record<string, unknown>,
  sub: {} as Record<string, unknown>,
  writes: [] as { values: unknown; filter: [string, unknown] }[],
}))

vi.mock('@/lib/stripe', () => ({
  stripe: {
    checkout: { sessions: { retrieve: async () => state.session } },
    subscriptions: { retrieve: async () => state.sub },
  },
}))
vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: async () => ({
    from: () => ({
      update: (values: unknown) => ({
        eq: (column: string, value: unknown) => {
          state.writes.push({ values, filter: [column, value] })
          return { select: async () => ({ data: [{ id: value }], error: null }) }
        },
      }),
    }),
  }),
}))

import { appStatusFor, syncCheckoutSession } from './stripe-sync'

const trialEnd = Math.floor(Date.UTC(2026, 11, 1) / 1000)
const subscription = (orgId: string) => ({
  id: 'sub_1',
  customer: 'cus_1',
  status: 'trialing',
  trial_end: trialEnd,
  metadata: { organization_id: orgId },
  items: { data: [{ price: { id: 'price_growth' }, current_period_end: trialEnd }] },
})

beforeEach(() => {
  state.writes = []
  process.env.STRIPE_SECRET_KEY = 'sk_test_x'
})

describe('syncCheckoutSession', () => {
  it('saves the subscription for the organization that paid', async () => {
    state.session = { metadata: { organization_id: 'org1' }, subscription: 'sub_1' }
    state.sub = subscription('org1')
    expect(await syncCheckoutSession('cs_test_abc123', 'org1')).toBe(true)
    expect(state.writes).toEqual([
      {
        filter: ['id', 'org1'],
        values: {
          stripe_customer_id: 'cus_1',
          stripe_subscription_id: 'sub_1',
          stripe_price_id: 'price_growth',
          subscription_status: 'trialing',
          current_period_end: '2026-12-01T00:00:00.000Z',
          trial_ends_at: '2026-12-01T00:00:00.000Z',
        },
      },
    ])
  })

  it("ignores another organization's session", async () => {
    state.session = { metadata: { organization_id: 'org2' }, subscription: 'sub_1' }
    state.sub = subscription('org2')
    expect(await syncCheckoutSession('cs_test_abc123', 'org1')).toBe(false)
    expect(state.writes).toEqual([])
  })

  it('ignores anything that is not a Checkout session id', async () => {
    expect(await syncCheckoutSession('../../v1/customers', 'org1')).toBe(false)
    expect(state.writes).toEqual([])
  })
})

describe('appStatusFor', () => {
  it('keeps billable statuses and treats the rest as canceled', () => {
    expect(appStatusFor('active')).toBe('active')
    expect(appStatusFor('past_due')).toBe('past_due')
    expect(appStatusFor('incomplete')).toBe('incomplete')
    expect(appStatusFor('unpaid')).toBe('canceled')
    expect(appStatusFor('incomplete_expired')).toBe('canceled')
  })
})
