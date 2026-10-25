import { describe, expect, it } from 'vitest'
import { detectColumns, hasNameColumns, rowsToMembers } from './member-import'

describe('detectColumns', () => {
  it('recognises common export headers regardless of case and separators', () => {
    const cols = detectColumns(['First_Name', 'LAST NAME', 'E-mail', 'Cell Phone', 'Member Status', 'Something else'])
    expect(cols).toMatchObject({ first_name: 0, last_name: 1, email: 2, phone: 3, status: 4, notes: -1 })
    expect(hasNameColumns(cols)).toBe(true)
  })

  it('needs a first name or full name column', () => {
    expect(hasNameColumns(detectColumns(['Email', 'Phone']))).toBe(false)
  })
})

describe('rowsToMembers', () => {
  it('splits a single name column in either order', () => {
    const cols = detectColumns(['Name'])
    const { members } = rowsToMembers([['Johnson, Sarah'], ['Marcus de la Cruz']], cols)
    expect(members.map((m) => [m.first_name, m.last_name])).toEqual([
      ['Sarah', 'Johnson'],
      ['Marcus', 'de la Cruz'],
    ])
  })

  it('drops invalid emails, maps statuses and skips rows without a name', () => {
    const cols = detectColumns(['First name', 'Last name', 'Email', 'Status'])
    const { members, skipped } = rowsToMembers([
      ['Ana', 'Ruiz', 'ANA@Example.com', 'Visitor'],
      ['Tom', 'Becker', 'tom@example', 'Moved away'],
      ['', 'Nobody', 'x@example.com', ''],
    ], cols)
    expect(skipped).toBe(1)
    expect(members[0]).toMatchObject({ email: 'ana@example.com', status: 'pending' })
    expect(members[1]).toMatchObject({ email: null, status: 'inactive' })
  })
})
