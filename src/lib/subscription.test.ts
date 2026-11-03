import { describe, expect, it } from 'vitest'
import { getAccessState, hasSubscription } from './subscription'

const now = new Date('2026-10-21T12:00:00Z')
const days = (n: number) => new Date(now.getTime() + n * 86_400_000).toISOString()

describe('getAccessState', () => {
  it('keeps a trial open until it ends and counts whole days left', () => {
    const state = getAccessState({ subscription_status: 'trialing', trial_ends_at: days(2.5), current_period_end: undefined }, now)
    expect(state).toMatchObject({ locked: false, onTrial: true, trialDaysLeft: 3 })
  })

  it('locks an expired trial and a cancelled subscription', () => {
    expect(getAccessState({ subscription_status: 'trialing', trial_ends_at: days(-1), current_period_end: undefined }, now).reason).toBe('trial_expired')
    expect(getAccessState({ subscription_status: 'canceled', trial_ends_at: undefined, current_period_end: undefined }, now).locked).toBe(true)
  })

  it('does not lock a paying church whose card was declined', () => {
    expect(getAccessState({ subscription_status: 'past_due', trial_ends_at: undefined, current_period_end: undefined }, now).locked).toBe(false)
  })
})

describe('hasSubscription', () => {
  it('is true only once Stripe holds a live subscription', () => {
    expect(hasSubscription({ subscription_status: 'trialing', stripe_subscription_id: undefined })).toBe(false)
    expect(hasSubscription({ subscription_status: 'trialing', stripe_subscription_id: 'sub_1' })).toBe(true)
    expect(hasSubscription({ subscription_status: 'canceled', stripe_subscription_id: 'sub_1' })).toBe(false)
  })
})
