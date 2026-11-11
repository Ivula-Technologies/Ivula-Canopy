import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { UserAccess } from './permissions'
import { NO_PERMISSIONS, PERMISSION_KEYS } from './permissions'

// Billing and organization settings are admin-only on the server, not just
// hidden in the page. These tests call the route handlers with a fake
// Supabase and check who gets through.

const state = vi.hoisted(() => ({
  access: null as unknown as UserAccess,
  org: { id: 'org1', name: 'Hope Church', stripe_customer_id: 'cus_1', stripe_subscription_id: null, subscription_status: 'trialing', trial_ends_at: null } as Record<string, unknown>,
  writes: [] as { table: string; values: unknown }[],
}))

// A query builder that answers every chain with the organization row.
function query(table: string) {
  const result = { data: table === 'organizations' ? state.org : null, error: null }
  const builder: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'is', 'ilike', 'limit', 'order']) builder[m] = () => builder
  builder.update = (values: unknown) => { state.writes.push({ table, values }); return builder }
  builder.single = async () => result
  builder.maybeSingle = async () => result
  builder.then = (resolve: (v: unknown) => unknown) => resolve({ data: [state.org], error: null })
  return builder
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: 'u1', email: 'a@church.org' } } }) }, from: query }),
  createServiceClient: async () => ({ from: query }),
}))
vi.mock('@/lib/permissions', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./permissions')>()),
  getUserAccess: async () => state.access,
}))
vi.mock('@/lib/stripe', () => ({
  createBillingPortalSession: async () => ({ url: 'https://billing.stripe.test/session' }),
  createCheckoutSession: async () => ({ url: 'https://checkout.stripe.test/session' }),
  createStripeCustomer: async () => ({ id: 'cus_new' }),
}))

const all = PERMISSION_KEYS.reduce((acc, k) => ({ ...acc, [k]: true }), { ...NO_PERMISSIONS })
const administrator: UserAccess = { permissions: all, roleName: 'Administrator', isSuperAdmin: false, organizationId: 'org1' }
const leader: UserAccess = {
  permissions: { ...NO_PERMISSIONS, manage_members: true, manage_teams: true, manage_events: true, manage_announcements: true },
  roleName: 'Leader', isSuperAdmin: false, organizationId: 'org1',
}

const post = (body?: unknown) =>
  new Request('https://canopy.test/api', { method: 'POST', body: body ? JSON.stringify(body) : undefined, headers: { 'content-type': 'application/json' } }) as never
const patch = (body: unknown) =>
  new Request('https://canopy.test/api', { method: 'PATCH', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } }) as never

beforeEach(() => {
  state.writes = []
  process.env.STRIPE_SECRET_KEY = 'sk_test_x'
  process.env.STRIPE_PRICE_ID_STARTER = 'price_starter'
})

describe('billing portal', () => {
  it('is closed to people without Manage billing', async () => {
    state.access = leader
    const { POST } = await import('@/app/api/stripe/portal/route')
    expect((await POST(post())).status).toBe(403)
  })

  it('opens for people with Manage billing', async () => {
    state.access = administrator
    const { POST } = await import('@/app/api/stripe/portal/route')
    const res = await POST(post())
    expect(res.status).toBe(200)
    expect((await res.json()).url).toContain('billing.stripe.test')
  })
})

describe('choosing a plan', () => {
  it('is closed to people without Manage billing', async () => {
    state.access = leader
    const { POST } = await import('@/app/api/stripe/checkout/route')
    expect((await POST(post({ plan: 'starter' }))).status).toBe(403)
  })

  it('opens Checkout for people with Manage billing', async () => {
    state.access = administrator
    const { POST } = await import('@/app/api/stripe/checkout/route')
    const res = await POST(post({ plan: 'starter' }))
    expect(res.status).toBe(200)
    expect((await res.json()).url).toContain('checkout.stripe.test')
  })
})

describe('organization profile', () => {
  const params = { params: Promise.resolve({ id: 'org1' }) }

  it('is read-only for leaders', async () => {
    state.access = leader
    const { PATCH } = await import('@/app/api/organizations/[id]/route')
    expect((await PATCH(patch({ name: 'New name' }), params)).status).toBe(403)
    expect(state.writes).toEqual([])
  })

  it('saves for administrators, profile fields only', async () => {
    state.access = administrator
    const { PATCH } = await import('@/app/api/organizations/[id]/route')
    const res = await PATCH(patch({ name: ' Grace Church ', subscription_status: 'active', trial_ends_at: '2099-01-01' }), params)
    expect(res.status).toBe(200)
    expect(state.writes).toEqual([{ table: 'organizations', values: { name: 'Grace Church' } }])
  })

  it('refuses another organization', async () => {
    state.access = administrator
    const { PATCH } = await import('@/app/api/organizations/[id]/route')
    const res = await PATCH(patch({ name: 'X' }), { params: Promise.resolve({ id: 'org2' }) })
    expect(res.status).toBe(404)
    expect(state.writes).toEqual([])
  })
})
