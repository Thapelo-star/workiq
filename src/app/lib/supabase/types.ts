export type Role = 'Employee' | 'Manager' | 'Executive' | 'Admin'

export type Category =
  | 'Development'
  | 'Design'
  | 'Meetings'
  | 'Research'
  | 'Admin'
  | 'Client'
  | 'Training'

export const CATEGORIES: Category[] = [
  'Development','Design','Meetings','Research','Admin','Client','Training',
]

export const BILLABLE_CATEGORIES: Category[] = ['Development','Design','Client']

export interface Profile {
  id: string
  name: string
  role: Role
  team: string
  created_at: string
}

export interface TimeLog {
  id: string
  user_id: string
  date: string
  project: string
  task: string
  category: Category
  hours: number
  notes: string
  created_at: string
  profiles?: Profile
}

export interface KpiRules {
  id: string
  daily_hours_threshold: number
  billable_target: number
  category_targets: Record<Category, number>
  updated_at: string
}

export interface Decision {
  id: string
  type: 'Decision' | 'Action'
  title: string
  owner_id: string
  due_date: string
  related_kpi: string
  reason: string
  expected_outcome: string
  status: 'Open' | 'In Progress' | 'Done'
  linked_insight_id: string
  created_by: string
  created_at: string
  profiles?: Profile
}

export interface Insight {
  id: string
  severity: 'High' | 'Med' | 'Low'
  title: string
  detail: string
  related: string
}

export interface KpiData {
  totalHours: number
  activeDays: number
  avgPerDay: number
  billableHours: number
  billablePct: number
  topCategory: [string, number] | null
  topProject: [string, number] | null
  catMap: Record<string, number>
  projMap: Record<string, number>
}