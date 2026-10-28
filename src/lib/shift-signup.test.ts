import { describe, expect, it } from 'vitest'
import { cleanVolunteer, parseShiftIds } from './shift-signup'
import { MAX_SHIFTS_PER_SIGNUP } from './volunteer-link'

describe('cleanVolunteer', () => {
  it('trims fields and lowercases the email', () => {
    expect(cleanVolunteer({ first_name: ' Ana ', last_name: 'Diaz', email: ' Ana@Example.COM ', phone: '' })).toEqual({
      first_name: 'Ana',
      last_name: 'Diaz',
      email: 'ana@example.com',
      phone: null,
      notes: null,
    })
  })

  it('requires a first name, last name and email', () => {
    expect(cleanVolunteer({ first_name: 'Ana', last_name: '', email: 'ana@example.com' })).toEqual({ error: 'Missing required fields' })
    expect(cleanVolunteer({ first_name: 'Ana', last_name: 'Diaz' })).toEqual({ error: 'Missing required fields' })
  })

  it('rejects an email without a domain', () => {
    expect(cleanVolunteer({ first_name: 'Ana', last_name: 'Diaz', email: 'ana@' })).toHaveProperty('error')
  })

  it('ignores non-text values and caps long ones', () => {
    const v = cleanVolunteer({ first_name: 'A'.repeat(200), last_name: 'Diaz', email: 'ana@example.com', phone: 5551234 })
    expect(v).toMatchObject({ phone: null })
    expect((v as { first_name: string }).first_name).toHaveLength(80)
  })
})

describe('parseShiftIds', () => {
  it('keeps unique text ids', () => {
    expect(parseShiftIds(['a', 'b', 'a', 7, ''])).toEqual(['a', 'b'])
  })

  it('needs at least one shift', () => {
    expect(parseShiftIds([])).toHaveProperty('error')
    expect(parseShiftIds('a')).toHaveProperty('error')
  })

  it('caps how many shifts one sign-up can take', () => {
    const ids = Array.from({ length: MAX_SHIFTS_PER_SIGNUP + 1 }, (_, i) => `s${i}`)
    expect(parseShiftIds(ids)).toHaveProperty('error')
    expect(parseShiftIds(ids.slice(0, MAX_SHIFTS_PER_SIGNUP))).toHaveLength(MAX_SHIFTS_PER_SIGNUP)
  })
})
