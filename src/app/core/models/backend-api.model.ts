export type AdminRole = 'super_admin' | 'admin' | 'user';

export interface AdminLoginRequest {
  username: string;
  password: string;
}

export interface AdminIdentity {
  id: string;
  email: string;
  display_name?: string;
  full_name?: string;
  name?: string;
  photo_url?: string | null;
  role: AdminRole;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface BackendSession {
  session_token: string;
  user?: AdminIdentity;
  token_type?: string;
  expires_at?: string;
}

export interface ApiStatusResponse<T> {
  status?: string;
  settings?: T;
  [key: string]: unknown;
}

export interface PaginatedResponse<T> {
  items: T[];
  total?: number;
  limit?: number;
  offset?: number;
  users?: T[];
  logs?: T[];
  responsables?: T[];
  data?: T[] | PaginatedResponse<T>;
  results?: T[];
  records?: T[];
}

export interface AdminOverview {
  generated_at?: string;
  users?: {
    total?: number;
    active?: number;
    inactive?: number;
    super_admins?: number;
    admins?: number;
    regular_users?: number;
  };
  email?: {
    total?: number;
    unread?: number;
    awaiting_review?: number;
    urgent?: number;
    analysed?: number;
    pending?: number;
    ignored?: number;
    sent_replies?: number;
    received_today?: number;
    received_last_7_days?: number;
  };
  notifications?: {
    total?: number;
    unread?: number;
  };
  training?: {
    available?: boolean;
    source?: string;
    message?: string | null;
    total_sessions?: number;
    total_participants?: number;
    drafts_waiting_review?: number;
    missing_responsibles?: number;
    sent_drafts?: number;
  };
  system?: {
    api_prefix?: string;
    admin_api_prefix?: string;
    admin_base_path?: string;
  };
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
  username?: string;
  name?: string;
  email: string;
  display_name?: string;
  full_name?: string;
  photo_url?: string | null;
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
  actor_role?: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  status?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface AdminUsageAdminSummary {
  id?: string;
  user_id?: string;
  username?: string;
  email?: string;
  display_name?: string;
  full_name?: string;
  name?: string;
  role?: AdminRole;
  actions?: number;
  total_actions?: number;
  login_count?: number;
  create_count?: number;
  update_count?: number;
  delete_count?: number;
  health_check_count?: number;
  failed_actions?: number;
  last_activity_at?: string;
  [key: string]: unknown;
}

export interface AdminUsageOverview {
  generated_at?: string;
  total_actions?: number;
  login_count?: number;
  create_count?: number;
  update_count?: number;
  delete_count?: number;
  health_check_count?: number;
  failed_actions?: number;
  active_admins?: number;
  most_active_admin?: AdminUsageAdminSummary;
  by_action?: Record<string, number> | Record<string, unknown>[];
  by_status?: Record<string, number> | Record<string, unknown>[];
  important_actions?: number;
  [key: string]: unknown;
}

export interface AdminUsageAction extends AuditLog {
  admin_id?: string;
  admin_email?: string;
  admin_name?: string;
  summary?: string;
  ip_address?: string;
  user_agent?: string;
  request_method?: string;
  request_path?: string;
  [key: string]: unknown;
}

export interface AdminUsageAdmin {
  id?: string;
  user_id?: string;
  username?: string;
  email: string;
  display_name?: string;
  full_name?: string;
  name?: string;
  role: AdminRole;
  is_active: boolean;
  last_login_at?: string;
  actions_count?: number;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export interface AdminAccountPayload {
  username?: string;
  password?: string;
  email?: string;
  display_name?: string;
  role?: AdminRole;
  is_active?: boolean;
}

export interface AdminPasswordPayload {
  password: string;
}

export interface AdminHealthService {
  name: string;
  status: string;
  message?: string;
  [key: string]: unknown;
}

export interface AdminHealth {
  status: string;
  checked_at?: string;
  latency_ms?: number;
  services?: AdminHealthService[];
  [key: string]: unknown;
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
  id?: string;
  responsable_id?: string;
  contact_key?: string;
  nom_complet?: string;
  fonction?: string;
  grande_residence?: string;
  role?: string;
  residence?: string;
  email?: string;
  full_name?: string;
  direction?: string;
  hr_responsible?: boolean;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export interface ResponsablePayload {
  nom_complet: string;
  fonction: string;
  grande_residence: string;
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
  status?: string;
  totals?: {
    imports?: number;
    files?: number;
    sessions?: number;
    participants?: number;
    drafts?: number;
    sent?: number;
  };
  drafts?: {
    waiting_review?: number;
    approved?: number;
    sent?: number;
    rejected?: number;
  };
  admin_usage?: {
    imports_created?: number;
    drafts_generated?: number;
    drafts_reviewed?: number;
    drafts_sent?: number;
  };
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
  imported_at?: string;
  created_at?: string;
  completed_at?: string;
  treated_at?: string;
  rows_total?: number;
  [key: string]: unknown;
}

export interface PlanningAnalyticsFiles {
  status?: string;
  summary?: {
    treated_files?: number;
    successful_files?: number;
    failed_files?: number;
  };
  by_status?: Record<string, number> | Record<string, unknown>[];
  by_extension?: Record<string, number> | Record<string, unknown>[];
  recent_treated_files?: PlanningAnalyticsFileStat[];
  recent_files?: PlanningAnalyticsFileStat[];
  files?: PlanningAnalyticsFileStat[];
  [key: string]: unknown;
}

export interface PlanningAnalyticsDrafts {
  status?: string;
  summary?: {
    total_drafts?: number;
    waiting_review?: number;
    approved?: number;
    sent?: number;
    rejected?: number;
  };
  by_status?: Record<string, number> | Record<string, unknown>[];
  by_email_type?: Record<string, number> | Record<string, unknown>[];
  by_day?: Record<string, unknown>[];
  by_import_batch?: Record<string, unknown>[];
  recent_batches?: Record<string, unknown>[];
  [key: string]: unknown;
}

export interface PlanningAnalyticsUser {
  user_id?: string;
  actor_email?: string;
  email?: string;
  full_name?: string;
  name?: string;
  drafts_generated?: number;
  drafts_prepared?: number;
  files_treated?: number;
  imports_created?: number;
  drafts_reviewed?: number;
  drafts_sent?: number;
  total_planning_actions?: number;
  last_activity_at?: string;
  [key: string]: unknown;
}

export interface AdminDashboardPolicies {
  review_warning_threshold?: number;
  audit_retention_days?: number;
  support_email?: string;
  [key: string]: unknown;
}

export interface AdminPlanningAutomationSettings {
  auto_draft_generation_after_import?: boolean;
  default_draft_type?: string;
  include_participants?: boolean;
  max_drafts_per_run?: number;
  [key: string]: unknown;
}

export interface AdminEmailPipelineSettings {
  enabled?: boolean;
  interval_minutes?: number;
  max_emails?: number;
  [key: string]: unknown;
}

export interface AdminSettings {
  policies?: AdminDashboardPolicies;
  planning_automation?: AdminPlanningAutomationSettings;
  email_pipeline?: AdminEmailPipelineSettings;
  [key: string]: unknown;
}

export interface AdminSettingsSystem {
  api_prefixes?: string[] | Record<string, unknown>;
  cors_origins?: string[];
  db_configured?: boolean;
  connector_configured?: boolean;
  outlook_app_configured?: boolean;
  [key: string]: unknown;
}

export interface AdminCredentialStatus {
  username_configured?: boolean;
  password_configured?: boolean;
  email_configured?: boolean;
  display_name_configured?: boolean;
  [key: string]: unknown;
}

export interface AdminSettingsSupervision {
  admin_credentials?: AdminCredentialStatus;
  policies?: AdminDashboardPolicies;
  planning_automation?: AdminPlanningAutomationSettings;
  email_pipeline?: AdminEmailPipelineSettings;
  [key: string]: unknown;
}
