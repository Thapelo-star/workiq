export type Role = 'Employee' | 'Manager' | 'Executive' | 'Admin' | 'Project Lead'

export type Category =
  | 'Development' | 'Design' | 'Meetings'
  | 'Research' | 'Admin' | 'Client' | 'Training'
  | 'Test Work' | 'Test Work Admin' | 'Test Work Setup' | 'Consulting' | 'Mine Visit' | 'Other'

export const CATEGORIES: Category[] = [
  'Development','Design','Meetings','Research','Admin','Client','Training',
  'Test Work','Test Work Admin','Test Work Setup','Consulting','Mine Visit','Other',
]
export const BILLABLE_CATEGORIES: Category[] = ['Development','Design','Client','Test Work','Test Work Setup']
export const ALL_ROLES: Role[] = ['Employee','Project Lead','Manager','Executive','Admin']
export const CAN_INVOICE: Role[] = ['Project Lead','Manager','Executive','Admin']
export const CAN_SEE_PROFITABILITY: Role[] = ['Manager','Executive','Admin']
export const CAN_SEE_TEAM: Role[] = ['Manager','Executive','Admin','Project Lead']

export interface Profile {
  id: string; name: string; role: Role; team: string
  hourly_rate: number; leave_allowance: number; created_at: string
}
export interface TimeLog {
  id: string; user_id: string; date: string; project: string
  task: string; category: Category; hours: number; notes: string
  created_at: string; profiles?: Profile
}
export interface KpiRules {
  id: string; daily_hours_threshold: number; billable_target: number
  category_targets: Record<string,number>; updated_at: string
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
  reminded_at: string
  outcome_text: string
  outcome_status: '' | 'Improved' | 'No Change' | 'Worsened'
  outcome_measured_at: string
  learning_text: string
  review_date: string
  completed_at: string
  profiles?: Profile
}
export interface Learning {
  id: string
  decision_id: string
  title: string
  context: string
  what_worked: string
  what_didnt: string
  recommendation: string
  outcome_status: '' | 'Improved' | 'No Change' | 'Worsened'
  category: string
  created_by: string
  created_at: string
  decisions?: Decision
}
export interface Insight {
  id: string; severity: 'High'|'Med'|'Low'; title: string; detail: string; related: string
}
export interface KpiData {
  totalHours: number; activeDays: number; avgPerDay: number
  billableHours: number; billablePct: number
  topCategory: [string,number]|null; topProject: [string,number]|null
  catMap: Record<string,number>; projMap: Record<string,number>
}
export interface Invoice {
  id: string; invoice_number: string; client_name: string; project: string
  period_from: string; period_to: string; hours: number; rate: number
  amount: number; status: 'Draft'|'Sent'|'Paid'; notes: string
  created_by: string; created_at: string
}
export interface ProjectRate { id: string; project: string; rate: number; client: string }
export interface OrgSettings { id: string; org_name: string }
export interface Timesheet {
  id: string; user_id: string; week_start: string
  status: 'Draft'|'Submitted'|'Approved'|'Rejected'
  submitted_at: string; reviewed_by: string; reviewed_at: string
  reviewer_note: string; total_hours: number; created_at: string; profiles?: Profile
}
export interface LeaveRequest {
  id: string; user_id: string; leave_type: string; date_from: string
  date_to: string; days: number; reason: string
  status: 'Pending'|'Approved'|'Rejected'; reviewed_by: string
  reviewed_at: string; created_at: string; profiles?: Profile
}
export interface LeaveBalance {
  id: string; user_id: string; annual_allowance: number
  annual_used: number; sick_used: number
}
export interface Notification {
  id: string; user_id: string; title: string; body: string
  type: 'info'|'warning'|'success'|'error'; read: boolean; link: string; created_at: string
}
export interface Project {
  id: string; name: string; client_id: string; description: string
  budget: number; status: 'Active'|'On Hold'|'Completed'|'Cancelled'
  start_date: string; end_date: string; created_by: string; created_at: string
  clients?: Client
}
export interface ProjectMember {
  id: string; project_id: string; user_id: string
  role_on_project: string; profiles?: Profile
}
export interface Client {
  id: string; name: string; contact_name: string; contact_email: string
  contact_phone: string; industry: string; notes: string
  status: 'Active'|'Inactive'; created_at: string
}
export interface Goal {
  id: string; user_id: string; month: string
  target_hours: number; target_billable_pct: number
  notes: string; set_by: string; profiles?: Profile
}


