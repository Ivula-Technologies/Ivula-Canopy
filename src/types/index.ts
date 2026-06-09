export type UserRole = 'super_admin' | 'org_admin' | 'org_leader' | 'member'
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete'
export type MemberStatus = 'active' | 'inactive' | 'pending'
export type EventStatus = 'upcoming' | 'active' | 'completed' | 'cancelled'
export type AttendanceMethod = 'admin' | 'qr' | 'self'

export interface Organization {
  id: string
  name: string
  slug: string
  description?: string
  logo_url?: string
  website?: string
  phone?: string
  address?: string
  stripe_customer_id?: string
  stripe_subscription_id?: string
  subscription_status: SubscriptionStatus
  trial_ends_at?: string
  current_period_end?: string
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  organization_id?: string
  email: string
  full_name?: string
  phone?: string
  avatar_url?: string
  role: UserRole
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Member {
  id: string
  organization_id: string
  profile_id?: string
  first_name: string
  last_name: string
  email?: string
  phone?: string
  date_of_birth?: string
  gender?: string
  address?: string
  join_date: string
  status: MemberStatus
  notes?: string
  custom_fields?: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface Team {
  id: string
  organization_id: string
  name: string
  description?: string
  team_type: string
  leader_id?: string
  parent_team_id?: string
  color?: string
  is_active: boolean
  created_at: string
  updated_at: string
  leader?: Member
  member_count?: number
}

export interface TeamMembership {
  id: string
  team_id: string
  member_id: string
  role: string
  joined_at: string
  member?: Member
  team?: Team
}

export interface Event {
  id: string
  organization_id: string
  team_id?: string
  title: string
  description?: string
  event_type: string
  location?: string
  starts_at: string
  ends_at?: string
  checkin_token: string
  checkin_enabled: boolean
  status: EventStatus
  created_by?: string
  created_at: string
  updated_at: string
  team?: Team
  attendance_count?: number
}

export interface Attendance {
  id: string
  event_id: string
  member_id: string
  organization_id: string
  checked_in_at: string
  method: AttendanceMethod
  notes?: string
  member?: Member
  event?: Event
}

export interface Announcement {
  id: string
  organization_id: string
  team_id?: string
  title: string
  body: string
  is_pinned: boolean
  published_at: string
  expires_at?: string
  created_by?: string
  created_at: string
  team?: Team
}

export interface DashboardStats {
  total_members: number
  active_members: number
  total_teams: number
  upcoming_events: number
  attendance_this_month: number
  new_members_this_month: number
  engagement_rate: number
}
