import { describe, expect, it } from 'vitest'
import { choice, idParam, isUuid, links, MEMBER_STATUSES, param, TASK_FILTERS } from './links'

const ID = '3f2b8c1e-4d5a-4b6c-8e7f-9a0b1c2d3e4f'

describe('links', () => {
  it('opens each dashboard box on the list of what it counts', () => {
    expect(links.members({ status: 'active' })).toBe('/members?status=active')
    expect(links.members({ added: 'this-month' })).toBe('/members?added=this-month')
    expect(links.eventsThisMonth()).toBe('/events?when=this-month')
    expect(links.volunteerSchedule('open')).toBe('/events/volunteers?show=open')
    expect(links.tasks({ status: 'open' })).toBe('/tasks?status=open')
  })

  it('leaves out empty filters so the plain list has a plain address', () => {
    expect(links.members()).toBe('/members')
    expect(links.tasks({ status: 'all' })).toBe('/tasks')
    expect(links.volunteerSchedule()).toBe('/events/volunteers')
    expect(links.event(ID)).toBe(`/events/${ID}`)
  })

  it('points at one record', () => {
    expect(links.member(ID)).toBe(`/members/${ID}`)
    expect(links.member(ID, 'shifts')).toBe(`/members/${ID}#shifts`)
    expect(links.event(ID, 'attendance')).toBe(`/events/${ID}?tab=attendance`)
    expect(links.tasks({ assignee: ID, open: ID })).toBe(`/tasks?assignee=${ID}&open=${ID}`)
    expect(links.donor(ID)).toBe(`/donors?open=${ID}#donor-${ID}`)
    expect(links.announcement(ID)).toBe(`/announcements#announcement-${ID}`)
    expect(links.child('Ana de la Cruz')).toBe('/kids?tab=children&q=Ana+de+la+Cruz')
  })
})

describe('reading links back', () => {
  it('accepts only the choices a list knows', () => {
    expect(choice({ status: 'active' }, 'status', MEMBER_STATUSES)).toBe('active')
    expect(choice({ status: 'archived' }, 'status', MEMBER_STATUSES)).toBeUndefined()
    expect(choice({ status: 'overdue' }, 'status', TASK_FILTERS)).toBe('overdue')
    expect(choice({}, 'status', TASK_FILTERS)).toBeUndefined()
  })

  it('accepts only record ids, so a mangled link opens the plain list', () => {
    expect(isUuid(ID)).toBe(true)
    expect(idParam({ open: ID }, 'open')).toBe(ID)
    expect(idParam({ open: 'not-an-id' }, 'open')).toBeUndefined()
    expect(idParam({ open: "x' or 1=1" }, 'open')).toBeUndefined()
  })

  it('reads the first of a repeated value', () => {
    expect(param({ q: ['a', 'b'] }, 'q')).toBe('a')
    expect(param({}, 'q')).toBe('')
  })
})
