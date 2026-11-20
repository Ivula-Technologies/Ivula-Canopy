import { describe, expect, it } from 'vitest'
import { buildSchedule } from './volunteer-schedule'

const now = new Date('2026-11-20T15:00:00Z')
const event = (id: string, starts_at: string, status: string | null = 'upcoming') => ({ id, title: id, starts_at, status })
const shift = (id: string, event_id: string, capacity: number, starts_at: string | null = null) => ({ id, event_id, title: id, capacity, starts_at, ends_at: null })
const person = (id: string, shift_id: string, first_name = id) => ({ id, shift_id, member_id: null, first_name, last_name: 'X', email: `${id}@example.com` })

describe('buildSchedule', () => {
  it('counts who is signed up and how many spots are still open', () => {
    const s = buildSchedule(
      [event('sunday', '2026-11-22T15:00:00Z')],
      [shift('greeters', 'sunday', 3), shift('parking', 'sunday', 2)],
      [person('a', 'greeters'), person('b', 'parking'), person('c', 'parking')],
      now
    )
    expect(s.totals).toEqual({ shifts: 2, signedUp: 3, openSpots: 2, shiftsNeedingPeople: 1 })
    expect(s.events[0].open).toBe(2)
    expect(s.events[0].shifts.find((x) => x.id === 'parking')?.open).toBe(0)
  })

  it('never counts an overbooked shift as negative spots', () => {
    const s = buildSchedule([event('e', '2026-11-22T15:00:00Z')], [shift('s', 'e', 1)], [person('a', 's'), person('b', 's')], now)
    expect(s.totals.openSpots).toBe(0)
    expect(s.totals.signedUp).toBe(2)
  })

  it('leaves out cancelled events and shifts that already started, like the public sign-up page', () => {
    const s = buildSchedule(
      [event('gone', '2026-11-22T15:00:00Z', 'cancelled'), event('today', '2026-11-20T13:00:00Z')],
      [shift('x', 'gone', 5), shift('morning', 'today', 5, '2026-11-20T13:00:00Z'), shift('evening', 'today', 5, '2026-11-20T23:00:00Z')],
      [],
      now
    )
    expect(s.events.map((e) => e.id)).toEqual(['today'])
    expect(s.events[0].shifts.map((x) => x.id)).toEqual(['evening'])
    expect(s.totals.openSpots).toBe(5)
  })

  it('lists events soonest first and people by name', () => {
    const s = buildSchedule(
      [event('later', '2026-12-01T15:00:00Z'), event('sooner', '2026-11-25T15:00:00Z')],
      [shift('s1', 'later', 4), shift('s2', 'sooner', 4)],
      [person('1', 's2', 'Zoe'), person('2', 's2', 'Ann')],
      now
    )
    expect(s.events.map((e) => e.id)).toEqual(['sooner', 'later'])
    expect(s.events[0].shifts[0].people.map((p) => p.first_name)).toEqual(['Ann', 'Zoe'])
  })
})
