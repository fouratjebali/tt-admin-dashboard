export type AdminRole = 'admin' | 'reviewer' | 'viewer' | 'user';

export interface AdminLoginRequest {
  username: string;
  password: string;
}

export interface AdminIdentity {
  id: string;
  email: string;
  full_name?: string;
  name?: string;
  role: AdminRole;
  is_active: boolean;
}

export interface BackendSession {
  session_token: string;
  user?: AdminIdentity;
  expires_at?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total?: number;
  limit?: number;
  offset?: number;
}

export interface AdminOverview {
  users_total?: number;
  active_users?: number;
  inactive_users?: number;
  admins_total?: number;
  planning_imports_total?: number;
  drafts_pending_review?: number;
  drafts_sent?: number;
  audit_events_total?: number;
  [key: string]: unknown;
}

export interface AdminUser {
  id?: string;
  user_id?: string;
  email: string;
  full_name?: string;
  role: AdminRole;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  last_login_at?: string;
}

export interface AuditLog {
  id: string;
  actor_user_id?: string;
  actor_email?: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface PlanningImport {
  id: string;
  filename?: string;
  status: string;
  rows_total?: number;
  rows_valid?: number;
  rows_invalid?: number;
  created_at?: string;
  completed_at?: string;
  [key: string]: unknown;
}

export interface PlanningSession {
  session_key: string;
  import_id?: string;
  subject?: string;
  planned_for?: string;
  status?: string;
  direction?: string;
  residence?: string;
  [key: string]: unknown;
}

export interface ResponsableContact {
  contact_key: string;
  role: string;
  residence?: string;
  email: string;
  full_name: string;
  direction?: string;
  hr_responsible?: boolean;
  [key: string]: unknown;
}

export interface PlanningContact {
  contact_key?: string;
  email: string;
  full_name: string;
  role?: string;
  direction?: string;
  residence?: string;
  [key: string]: unknown;
}

export interface DraftEmail {
  id: string;
  session_key?: string;
  import_id?: string;
  recipient_email?: string;
  subject?: string;
  body?: string;
  status: string;
  review_notes?: string;
  created_at?: string;
  updated_at?: string;
  sent_at?: string;
  [key: string]: unknown;
}

export interface BulkDraftActionRequest {
  draft_ids: string[];
  action: 'approve' | 'reject' | 'regenerate';
  review_notes?: string;
}

export interface BulkSendRequest {
  draft_ids: string[];
  confirmation: string;
}

export interface AutomationSettings {
  enabled: boolean;
  schedule?: string;
  timezone?: string;
  [key: string]: unknown;
}

export interface AutomationRunRequest {
  import_id?: string;
  dry_run?: boolean;
  [key: string]: unknown;
}

export interface AutomationJob {
  id: string;
  status: string;
  started_at?: string;
  completed_at?: string;
  [key: string]: unknown;
}

export interface PlanningAnalyticsOverview {
  imports_total?: number;
  excel_files_total?: number;
  csv_files_total?: number;
  drafts_total?: number;
  drafts_prepared?: number;
  drafts_pending_review?: number;
  drafts_reviewed?: number;
  drafts_sent?: number;
  send_history_total?: number;
  automation_jobs_total?: number;
  admin_users_total?: number;
  active_admins?: number;
  total_planning_actions?: number;
  [key: string]: unknown;
}

export interface PlanningAnalyticsFileStat {
  filename?: string;
  name?: string;
  status?: string;
  extension?: string;
  created_at?: string;
  completed_at?: string;
  treated_at?: string;
  rows_total?: number;
  [key: string]: unknown;
}

export interface PlanningAnalyticsFiles {
  by_status?: Record<string, number> | Record<string, unknown>[];
  by_extension?: Record<string, number> | Record<string, unknown>[];
  recent_treated_files?: PlanningAnalyticsFileStat[];
  recent_files?: PlanningAnalyticsFileStat[];
  files?: PlanningAnalyticsFileStat[];
  [key: string]: unknown;
}

export interface PlanningAnalyticsDrafts {
  by_status?: Record<string, number> | Record<string, unknown>[];
  by_email_type?: Record<string, number> | Record<string, unknown>[];
  by_day?: Record<string, unknown>[];
  by_import_batch?: Record<string, unknown>[];
  [key: string]: unknown;
}

export interface PlanningAnalyticsUser {
  user_id?: string;
  email?: string;
  full_name?: string;
  name?: string;
  drafts_prepared?: number;
  files_treated?: number;
  imports_created?: number;
  drafts_reviewed?: number;
  drafts_sent?: number;
  total_planning_actions?: number;
  [key: string]: unknown;
}
