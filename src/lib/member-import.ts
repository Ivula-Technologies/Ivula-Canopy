// Turns a spreadsheet export (Excel, Google Sheets, Planning Center, Breeze,
// ChurchTrac...) into member rows by recognising common column names.

export interface ImportedMember {
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  address: string | null
  status: 'active' | 'inactive' | 'pending'
  notes: string | null
}

const COLUMN_NAMES: Record<keyof ImportedMember | 'full_name', string[]> = {
  first_name: ['first name', 'firstname', 'first', 'given name', 'preferred name'],
  last_name: ['last name', 'lastname', 'last', 'surname', 'family name'],
  full_name: ['name', 'full name', 'fullname', 'member name', 'member'],
  email: ['email', 'email address', 'e-mail', 'home email', 'primary email', 'personal email'],
  phone: ['phone', 'phone number', 'mobile', 'mobile phone', 'cell', 'cell phone', 'home phone', 'primary phone', 'telephone'],
  address: ['address', 'street address', 'home address', 'address line 1', 'street'],
  status: ['status', 'membership status', 'member status'],
  notes: ['notes', 'note', 'comments'],
}

const normalize = (h: string) => h.toLowerCase().replace(/[_.]/g, ' ').replace(/\s+/g, ' ').trim()

export function detectColumns(header: string[]) {
  const names = header.map(normalize)
  const find = (key: keyof typeof COLUMN_NAMES) => {
    for (const alias of COLUMN_NAMES[key]) {
      const i = names.indexOf(alias)
      if (i !== -1) return i
    }
    return -1
  }
  return {
    first_name: find('first_name'),
    last_name: find('last_name'),
    full_name: find('full_name'),
    email: find('email'),
    phone: find('phone'),
    address: find('address'),
    status: find('status'),
    notes: find('notes'),
  }
}

export type DetectedColumns = ReturnType<typeof detectColumns>

export function hasNameColumns(cols: DetectedColumns) {
  return cols.full_name !== -1 || cols.first_name !== -1
}

function toStatus(value: string): ImportedMember['status'] {
  const v = value.toLowerCase()
  if (/inactive|former|deceased|moved|archived/.test(v)) return 'inactive'
  if (/pending|prospect|visitor|guest/.test(v)) return 'pending'
  return 'active'
}

export function rowsToMembers(rows: string[][], cols: DetectedColumns) {
  const members: ImportedMember[] = []
  let skipped = 0
  const cell = (row: string[], i: number) => (i === -1 ? '' : (row[i] ?? '').trim())

  for (const row of rows) {
    let first = cell(row, cols.first_name)
    let last = cell(row, cols.last_name)
    if (!first && !last && cols.full_name !== -1) {
      const full = cell(row, cols.full_name)
      // "Smith, John" or "John Smith"
      if (full.includes(',')) {
        const [l, f] = full.split(',', 2)
        first = (f || '').trim(); last = l.trim()
      } else {
        const parts = full.split(/\s+/)
        first = parts.shift() || ''; last = parts.join(' ')
      }
    }
    if (!first) { skipped++; continue }
    const email = cell(row, cols.email).toLowerCase()
    members.push({
      first_name: first.slice(0, 100),
      last_name: last.slice(0, 100),
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null,
      phone: cell(row, cols.phone).slice(0, 40) || null,
      address: cell(row, cols.address).slice(0, 300) || null,
      status: toStatus(cell(row, cols.status)),
      notes: cell(row, cols.notes).slice(0, 2000) || null,
    })
  }
  return { members, skipped }
}
