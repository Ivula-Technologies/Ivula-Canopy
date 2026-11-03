import { describe, expect, it } from 'vitest'
import { parseCsv, toCsv } from './csv'

describe('parseCsv', () => {
  it('handles quotes, embedded commas, line breaks and escaped quotes', () => {
    const text = 'Name,Notes\r\n"Smith, John","Says ""hi""\nsecond line"\r\n'
    expect(parseCsv(text)).toEqual([
      ['Name', 'Notes'],
      ['Smith, John', 'Says "hi"\nsecond line'],
    ])
  })

  it('strips the Excel byte-order mark and skips blank rows', () => {
    expect(parseCsv('﻿First,Last\n\n,\nAna,Ruiz')).toEqual([
      ['First', 'Last'],
      ['Ana', 'Ruiz'],
    ])
  })
})

describe('toCsv', () => {
  it('quotes only the cells that need it and round-trips through parseCsv', () => {
    const rows = [['Name', 'Email'], ['Lee, Marcus', 'marcus@example.com'], ['Quote "Q"', null]]
    const csv = toCsv(rows)
    expect(csv).toBe('Name,Email\r\n"Lee, Marcus",marcus@example.com\r\n"Quote ""Q""",')
    expect(parseCsv(csv)).toEqual([['Name', 'Email'], ['Lee, Marcus', 'marcus@example.com'], ['Quote "Q"', '']])
  })
})
