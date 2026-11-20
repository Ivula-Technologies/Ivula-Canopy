// Where each piece of data opens. Kept in one place so a dashboard box, a list
// row and a name that show the same thing all lead to the same page, and the
// list pages read back exactly the filters these links write.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID.test(value)
}

type Query = Record<string, string | undefined | null | false>

function withQuery(path: string, query: Query = {}, hash?: string) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value) params.set(key, value)
  }
  const search = params.toString()
  return `${path}${search ? `?${search}` : ''}${hash ? `#${hash}` : ''}`
}

export const MEMBER_STATUSES = ['active', 'inactive', 'pending'] as const
export type MemberStatusFilter = (typeof MEMBER_STATUSES)[number]

export const TASK_FILTERS = ['all', 'open', 'overdue', 'todo', 'in_progress', 'done'] as const
export type TaskFilter = (typeof TASK_FILTERS)[number]

export const links = {
  member: (id: string, section?: 'attendance' | 'shifts') => withQuery(`/members/${id}`, {}, section),
  members: (filter: { status?: MemberStatusFilter; added?: 'this-month'; q?: string } = {}) => withQuery('/members', filter),
  editMember: (id: string) => withQuery('/members', { edit: id }),

  team: (id: string) => `/teams/${id}`,
  editTeam: (id: string) => withQuery('/teams', { edit: id }),

  event: (id: string, tab?: 'shifts' | 'attendance') => withQuery(`/events/${id}`, { tab }),
  eventsThisMonth: () => withQuery('/events', { when: 'this-month' }),
  volunteerSchedule: (show?: 'open') => withQuery('/events/volunteers', { show }),

  tasks: (filter: { status?: TaskFilter; assignee?: string; team?: string; open?: string } = {}) =>
    withQuery('/tasks', { ...filter, status: filter.status === 'all' ? undefined : filter.status }),

  donor: (id: string) => withQuery('/donors', { open: id }, `donor-${id}`),
  announcement: (id: string) => withQuery('/announcements', {}, `announcement-${id}`),
  expensesForEvent: (id: string) => withQuery('/expenses', { event: id }),
  child: (name: string) => withQuery('/kids', { tab: 'children', q: name }),
}

type SearchParams = Record<string, string | string[] | undefined>

/** One query value as a plain string ('' when missing or repeated oddly). */
export function param(searchParams: SearchParams, name: string): string {
  const value = searchParams[name]
  return typeof value === 'string' ? value : Array.isArray(value) ? value[0] ?? '' : ''
}

/** A query value only if it is one of the allowed choices. */
export function choice<T extends string>(searchParams: SearchParams, name: string, allowed: readonly T[]): T | undefined {
  const value = param(searchParams, name)
  return (allowed as readonly string[]).includes(value) ? (value as T) : undefined
}

/** A query value only if it is a record id, so a mangled link opens the plain list. */
export function idParam(searchParams: SearchParams, name: string): string | undefined {
  const value = param(searchParams, name)
  return isUuid(value) ? value : undefined
}

/**
 * Takes a one-time instruction such as ?edit= out of the address bar once it
 * has been acted on, so reloading the page doesn't open the same dialog again.
 * Browser only.
 */
export function dropQueryParams(...names: string[]) {
  if (typeof window === 'undefined') return
  const url = new URL(window.location.href)
  let changed = false
  for (const name of names) {
    if (url.searchParams.has(name)) {
      url.searchParams.delete(name)
      changed = true
    }
  }
  if (changed) window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`)
}
