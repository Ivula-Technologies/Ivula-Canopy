// Kids check-in: pickup codes, family grouping, search and validation.
// Shared by the API routes and the check-in desk so both agree.

// No 0/O, 1/I/L, 2/Z, 5/S or 8/B, so a code read aloud or off a smudged
// label can't be mistaken for another.
export const PICKUP_ALPHABET = 'ACDEFGHJKMNPQRTUVWXY34679'
export const PICKUP_CODE_LENGTH = 4

export function generatePickupCode(
  random: (n: number) => Uint32Array = (n) => crypto.getRandomValues(new Uint32Array(n))
): string {
  const values = random(PICKUP_CODE_LENGTH)
  let code = ''
  for (let i = 0; i < PICKUP_CODE_LENGTH; i++) {
    code += PICKUP_ALPHABET[values[i] % PICKUP_ALPHABET.length]
  }
  return code
}

/** Uppercase, without spaces or dashes, so "k7p-3" matches "K7P3". */
export function normalizePickupCode(value: unknown): string {
  return typeof value === 'string' ? value.toUpperCase().replace(/[\s-]/g, '') : ''
}

export function isPickupCodeShape(value: string): boolean {
  return value.length === PICKUP_CODE_LENGTH && [...value].every((c) => PICKUP_ALPHABET.includes(c))
}

/** A new code that no open check-in in the organization is using. */
export function uniquePickupCode(inUse: Set<string>, random?: (n: number) => Uint32Array): string {
  for (let i = 0; i < 50; i++) {
    const code = generatePickupCode(random)
    if (!inUse.has(code)) return code
  }
  throw new Error('Could not find a free pickup code')
}

export interface ChildLike {
  id: string
  first_name: string
  last_name: string
  guardian_member_id?: string | null
  guardian_name: string
  guardian_phone?: string | null
}

const digits = (s: string | null | undefined) => (s || '').replace(/\D/g, '')

/** Children with the same guardian share a family, and a family shares one pickup code. */
export function familyKey(child: ChildLike): string {
  if (child.guardian_member_id) return `m:${child.guardian_member_id}`
  const phone = digits(child.guardian_phone)
  if (phone.length >= 7) return `p:${phone.slice(-10)}`
  return `n:${child.guardian_name.trim().toLowerCase().replace(/\s+/g, ' ')}`
}

export function groupByFamily<T extends ChildLike>(children: T[]): T[][] {
  const groups = new Map<string, T[]>()
  for (const child of children) {
    const key = familyKey(child)
    const list = groups.get(key)
    if (list) list.push(child)
    else groups.set(key, [child])
  }
  return [...groups.values()]
}

/**
 * Match a desk search against child and guardian names, or the guardian's phone
 * number (any 3+ digits, so "4321" finds a phone ending in 4321).
 */
export function matchesChildSearch(child: ChildLike, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return false
  const qDigits = q.replace(/\D/g, '')
  if (qDigits.length >= 3 && qDigits.length === q.replace(/[\s()+.-]/g, '').length) {
    return digits(child.guardian_phone).includes(qDigits)
  }
  const haystack = `${child.first_name} ${child.last_name} ${child.guardian_name}`.toLowerCase()
  return q.split(/\s+/).every((word) => haystack.includes(word))
}

/** "3 yrs", "18 mo", or '' when there is no usable birth date. */
export function ageLabel(birthDate: string | null | undefined, today: Date = new Date()): string {
  if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return ''
  const [y, m, d] = birthDate.split('-').map(Number)
  let months = (today.getFullYear() - y) * 12 + (today.getMonth() + 1 - m)
  if (today.getDate() < d) months -= 1
  if (months < 0) return ''
  if (months < 24) return `${months} mo`
  return `${Math.floor(months / 12)} yrs`
}

/**
 * A starting room for a child the desk has never placed, from their age:
 * under 2 Nursery, 2 Toddlers, 3-4 Preschool, 5 Kindergarten, 6-11 Elementary.
 * Staff can type over it, and next time the child's last room is used.
 */
export function suggestRoom(birthDate: string | null | undefined, today: Date = new Date()): string {
  if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return ''
  const [y, m, d] = birthDate.split('-').map(Number)
  let months = (today.getFullYear() - y) * 12 + (today.getMonth() + 1 - m)
  if (today.getDate() < d) months -= 1
  if (months < 0) return ''
  const years = Math.floor(months / 12)
  if (years < 2) return 'Nursery'
  if (years < 3) return 'Toddlers'
  if (years < 5) return 'Preschool'
  if (years < 6) return 'Kindergarten'
  if (years < 12) return 'Elementary'
  return ''
}

export const CHILD_FIELDS = [
  'first_name',
  'last_name',
  'birth_date',
  'grade',
  'allergies',
  'medical_notes',
  'guardian_member_id',
  'guardian_name',
  'guardian_phone',
  'authorized_pickups',
  'notes',
  'is_active',
] as const

const MAX_LENGTH: Record<string, number> = {
  first_name: 80,
  last_name: 80,
  grade: 40,
  allergies: 300,
  medical_notes: 1000,
  guardian_name: 120,
  guardian_phone: 40,
  authorized_pickups: 500,
  notes: 1000,
}

/** Returns an error message, or null when the child record is fine to save. */
export function validateChild(body: Record<string, unknown>, { partial = false } = {}): string | null {
  for (const field of ['first_name', 'last_name', 'guardian_name'] as const) {
    if (partial && !(field in body)) continue
    const value = body[field]
    if (typeof value !== 'string' || !value.trim()) {
      return field === 'guardian_name' ? 'Add the parent or guardian’s name.' : 'Add the child’s first and last name.'
    }
  }
  for (const [field, max] of Object.entries(MAX_LENGTH)) {
    const value = body[field]
    if (value != null && (typeof value !== 'string' || value.length > max)) {
      return `${field.replace(/_/g, ' ')} is too long (${max} characters at most).`
    }
  }
  const birth = body.birth_date
  if (birth != null) {
    if (typeof birth !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(birth) || Number.isNaN(Date.parse(birth))) {
      return 'Birth date must be a date.'
    }
    if (new Date(birth) > new Date()) return 'Birth date can’t be in the future.'
  }
  if (body.is_active != null && typeof body.is_active !== 'boolean') return 'is_active must be true or false.'
  return null
}

/** Trim strings and turn empty ones into null, keeping only the fields a child record has. */
export function cleanChild(body: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const field of CHILD_FIELDS) {
    if (!(field in body)) continue
    const value = body[field]
    out[field] = typeof value === 'string' ? (value.trim() === '' ? null : value.trim()) : value
  }
  return out
}
