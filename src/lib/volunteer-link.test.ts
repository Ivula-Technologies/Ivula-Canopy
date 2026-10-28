import { describe, expect, it } from 'vitest'
import { isVolunteerToken, volunteerLinkFor } from './volunteer-link'

const token = '0123456789abcdef0123456789abcdef'

describe('isVolunteerToken', () => {
  it('accepts 32 lowercase hex characters only', () => {
    expect(isVolunteerToken(token)).toBe(true)
    expect(isVolunteerToken(token.toUpperCase())).toBe(false)
    expect(isVolunteerToken(token.slice(1))).toBe(false)
    expect(isVolunteerToken("x' or 1=1")).toBe(false)
    expect(isVolunteerToken(null)).toBe(false)
  })
})

describe('volunteerLinkFor', () => {
  it('builds the church-wide link', () => {
    expect(volunteerLinkFor({ volunteer_token: token }, 'https://canopy.ivulatechnologies.com')).toBe(
      `https://canopy.ivulatechnologies.com/serve/${token}`
    )
  })

  it('is null before the church has a token', () => {
    expect(volunteerLinkFor({}, 'https://canopy.ivulatechnologies.com')).toBeNull()
    expect(volunteerLinkFor(null, 'https://canopy.ivulatechnologies.com')).toBeNull()
  })
})
