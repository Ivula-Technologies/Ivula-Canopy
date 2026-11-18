import { beforeEach, describe, expect, it, vi } from 'vitest'

// Two admins choosing a plan at once must end up on one Stripe customer.

const state = vi.hoisted(() => ({
  created: [] as string[],
  deleted: [] as string[],
  savedRows: [] as { id: string }[],
  current: null as string | null,
  saveFilters: [] as string[],
}))

vi.mock('@/lib/stripe', () => ({
  createStripeCustomer: async () => {
    const id = `cus_${state.created.length + 1}`
    state.created.push(id)
    return { id }
  },
  deleteStripeCustomer: async (id: string) => { state.deleted.push(id) },
}))

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: async () => ({
    from: () => {
      const builder: Record<string, unknown> = {}
      builder.update = () => builder
      builder.eq = () => builder
      builder.is = (col: string, value: unknown) => { state.saveFilters.push(`${col} is ${value}`); return builder }
      builder.select = (cols: string) => {
        if (cols === 'id') return Promise.resolve({ data: state.savedRows, error: null })
        return builder
      }
      builder.single = async () => ({ data: { stripe_customer_id: state.current }, error: null })
      return builder
    },
  }),
}))

import { ensureStripeCustomer } from './stripe-customer'

beforeEach(() => {
  state.created = []
  state.deleted = []
  state.savedRows = []
  state.current = null
  state.saveFilters = []
})

describe('ensureStripeCustomer', () => {
  it('uses the saved customer without calling Stripe', async () => {
    expect(await ensureStripeCustomer({ id: 'o1', name: 'Hope', stripe_customer_id: 'cus_old' }, 'a@x.org')).toBe('cus_old')
    expect(state.created).toEqual([])
  })

  it('saves a new customer only into an empty column', async () => {
    state.savedRows = [{ id: 'o1' }]
    expect(await ensureStripeCustomer({ id: 'o1', name: 'Hope' }, 'a@x.org')).toBe('cus_1')
    expect(state.saveFilters).toEqual(['stripe_customer_id is null'])
    expect(state.deleted).toEqual([])
  })

  it("switches to the other admin's customer when it was saved first, and deletes its own", async () => {
    state.savedRows = []
    state.current = 'cus_winner'
    expect(await ensureStripeCustomer({ id: 'o1', name: 'Hope' }, 'b@x.org')).toBe('cus_winner')
    expect(state.deleted).toEqual(['cus_1'])
  })

  it('keeps the customer when a double click got the same one back from Stripe', async () => {
    state.savedRows = []
    state.current = 'cus_1'
    expect(await ensureStripeCustomer({ id: 'o1', name: 'Hope' }, 'a@x.org')).toBe('cus_1')
    expect(state.deleted).toEqual([])
  })
})
