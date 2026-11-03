import { describe, expect, it } from 'vitest'
import { cleanMessage, messageHtml, senderName, uniqueEmails } from './volunteer-message'
import { MAX_MESSAGE, MAX_SUBJECT } from './volunteer-message-limits'

describe('cleanMessage', () => {
  it('trims the subject and message and reads an optional shift', () => {
    expect(cleanMessage({ subject: '  Parking   moved ', message: ' Use the north lot.\n' })).toEqual({
      subject: 'Parking moved',
      message: 'Use the north lot.',
      shiftId: null,
    })
    expect(cleanMessage({ subject: 'Hi', message: 'Hello', shift_id: 's-1' })).toMatchObject({ shiftId: 's-1' })
  })

  it('needs a subject and a message', () => {
    expect(cleanMessage({ subject: ' ', message: 'Hello' })).toHaveProperty('error')
    expect(cleanMessage({ subject: 'Hi', message: '' })).toHaveProperty('error')
    expect(cleanMessage(null)).toHaveProperty('error')
  })

  it('rejects overly long text', () => {
    expect(cleanMessage({ subject: 'a'.repeat(MAX_SUBJECT + 1), message: 'Hello' })).toHaveProperty('error')
    expect(cleanMessage({ subject: 'Hi', message: 'a'.repeat(MAX_MESSAGE + 1) })).toHaveProperty('error')
  })
})

describe('uniqueEmails', () => {
  it('emails each person once, ignoring case and blanks', () => {
    expect(uniqueEmails([{ email: 'Ana@Example.com' }, { email: 'ana@example.com ' }, { email: null }, { email: 'tom@example.com' }]))
      .toEqual(['ana@example.com', 'tom@example.com'])
  })
})

describe('senderName', () => {
  it('keeps letters and drops characters that break the From line', () => {
    expect(senderName('Grace Fellowship <Dallas>')).toBe('Grace Fellowship Dallas')
    expect(senderName('St. Mary\'s & St. John')).toBe("St. Mary's & St. John")
    expect(senderName('"<>"')).toBe('Canopy')
  })
})

describe('messageHtml', () => {
  it('escapes what the coordinator typed and keeps their line breaks', () => {
    const html = messageHtml({ orgName: 'Grace', eventTitle: 'Food Drive', message: 'Bring <gloves>\nThanks!' })
    expect(html).toContain('Bring &lt;gloves&gt;<br/>Thanks!')
    expect(html).not.toContain('<gloves>')
  })
})
