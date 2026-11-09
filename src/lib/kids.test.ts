import { describe, expect, it } from 'vitest'
import {
  PICKUP_ALPHABET,
  ageLabel,
  cleanChild,
  familyKey,
  generatePickupCode,
  groupByFamily,
  isPickupCodeShape,
  matchesChildSearch,
  normalizePickupCode,
  suggestRoom,
  uniquePickupCode,
  validateChild,
} from './kids'

const child = (over: Partial<Parameters<typeof familyKey>[0]> = {}) => ({
  id: 'c1',
  first_name: 'Emma',
  last_name: 'Lee',
  guardian_name: 'Sarah Lee',
  guardian_phone: '(512) 555-4321',
  guardian_member_id: null,
  ...over,
})

describe('pickup codes', () => {
  it('uses four characters from the unambiguous alphabet', () => {
    for (let i = 0; i < 200; i++) {
      const code = generatePickupCode()
      expect(code).toHaveLength(4)
      expect(isPickupCodeShape(code)).toBe(true)
    }
    for (const c of '0O1IL2Z5S8B') expect(PICKUP_ALPHABET.includes(c)).toBe(false)
  })

  it('normalizes what staff type', () => {
    expect(normalizePickupCode(' k7p-3 ')).toBe('K7P3')
    expect(normalizePickupCode(undefined)).toBe('')
  })

  it('skips codes already in use', () => {
    let call = 0
    // First draw gives AAAA, second gives CCCC
    const random = () => new Uint32Array(4).fill(call++ === 0 ? 0 : 1)
    expect(uniquePickupCode(new Set(['AAAA']), random)).toBe('CCCC')
  })
})

describe('families', () => {
  it('groups by guardian member, then phone, then name', () => {
    expect(familyKey(child({ guardian_member_id: 'm9' }))).toBe('m:m9')
    expect(familyKey(child())).toBe('p:5125554321')
    expect(familyKey(child({ guardian_phone: null, guardian_name: '  Sarah   Lee ' }))).toBe('n:sarah lee')
  })

  it('puts siblings together', () => {
    const groups = groupByFamily([
      child({ id: 'a' }),
      child({ id: 'b', first_name: 'Noah', guardian_phone: '512-555-4321' }),
      child({ id: 'c', guardian_name: 'Ana Ruiz', guardian_phone: '9195550000' }),
    ])
    expect(groups.map((g) => g.map((c) => c.id))).toEqual([['a', 'b'], ['c']])
  })
})

describe('desk search', () => {
  it('finds by child or guardian name and by phone digits', () => {
    expect(matchesChildSearch(child(), 'emma')).toBe(true)
    expect(matchesChildSearch(child(), 'sarah lee')).toBe(true)
    expect(matchesChildSearch(child(), '4321')).toBe(true)
    expect(matchesChildSearch(child(), '555-4321')).toBe(true)
    expect(matchesChildSearch(child(), '9999')).toBe(false)
    expect(matchesChildSearch(child(), 'noah')).toBe(false)
    expect(matchesChildSearch(child(), '  ')).toBe(false)
  })
})

describe('ageLabel', () => {
  const today = new Date(2026, 10, 9) // Nov 9, 2026
  it('shows months under two and years after', () => {
    expect(ageLabel('2025-05-09', today)).toBe('18 mo')
    expect(ageLabel('2022-11-10', today)).toBe('3 yrs')
    expect(ageLabel('2022-11-09', today)).toBe('4 yrs')
    expect(ageLabel(null, today)).toBe('')
    expect(ageLabel('2027-01-01', today)).toBe('')
  })
})

describe('suggestRoom', () => {
  const today = new Date(2026, 10, 9) // Nov 9, 2026
  it('picks a room for the child\'s age', () => {
    expect(suggestRoom('2025-08-01', today)).toBe('Nursery')
    expect(suggestRoom('2024-06-01', today)).toBe('Toddlers')
    expect(suggestRoom('2022-11-09', today)).toBe('Preschool')
    expect(suggestRoom('2021-06-01', today)).toBe('Kindergarten')
    expect(suggestRoom('2018-01-01', today)).toBe('Elementary')
  })

  it('leaves the room empty when it cannot tell', () => {
    expect(suggestRoom(null, today)).toBe('')
    expect(suggestRoom('2010-01-01', today)).toBe('')
    expect(suggestRoom('2027-01-01', today)).toBe('')
  })
})

describe('child records', () => {
  it('needs the child and guardian names', () => {
    expect(validateChild({ first_name: 'Emma', last_name: 'Lee', guardian_name: 'Sarah' })).toBeNull()
    expect(validateChild({ first_name: 'Emma', last_name: '', guardian_name: 'Sarah' })).toMatch(/first and last/)
    expect(validateChild({ first_name: 'Emma', last_name: 'Lee', guardian_name: ' ' })).toMatch(/guardian/)
    expect(validateChild({ allergies: 'Peanuts' }, { partial: true })).toBeNull()
  })

  it('rejects bad dates and very long text', () => {
    const base = { first_name: 'E', last_name: 'L', guardian_name: 'S' }
    expect(validateChild({ ...base, birth_date: 'soon' })).toMatch(/date/)
    expect(validateChild({ ...base, birth_date: '2999-01-01' })).toMatch(/future/)
    expect(validateChild({ ...base, allergies: 'x'.repeat(301) })).toMatch(/too long/)
  })

  it('keeps only child fields and blanks empty strings', () => {
    expect(cleanChild({ first_name: ' Emma ', grade: '', organization_id: 'other', id: 'x' })).toEqual({
      first_name: 'Emma',
      grade: null,
    })
  })
})
