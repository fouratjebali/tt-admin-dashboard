import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  AdminIdentity,
  AdminOverview,
  AdminRole,
  AdminUser,
  AuditLog,
  AutomationJob,
  AutomationRunRequest,
  AutomationSettings,
  BackendSession,
  BulkDraftActionRequest,
  BulkSendRequest,
  DraftEmail,
  AdminLoginRequest,
  PaginatedResponse,
  PlanningContact,
  PlanningImport,
  PlanningSession,
  ResponsableContact,
} from '../models/backend-api.model';

type ApiFilters = Record<string, string | number | boolean | null | undefined>;

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl.replace(/\/$/, '');

  loginAdmin(payload: AdminLoginRequest): Observable<BackendSession> {
    return this.http.post<BackendSession>(this.apiUrl('/auth/admin/login'), payload);
  }

  refreshSession(): Observable<BackendSession> {
    return this.http.post<BackendSession>(this.apiUrl('/auth/refresh'), {});
  }

  getAuthenticatedUser(): Observable<AdminIdentity> {
    return this.http.get<AdminIdentity>(this.apiUrl('/auth/me'));
  }

  getCurrentAdmin(): Observable<AdminIdentity> {
    return this.http.get<AdminIdentity>(this.adminUrl('/me'));
  }

  getOverview(): Observable<AdminOverview> {
    return this.http.get<AdminOverview>(this.adminUrl('/overview'));
  }

  listUsers(filters?: ApiFilters): Observable<PaginatedResponse<AdminUser>> {
    return this.http.get<PaginatedResponse<AdminUser>>(this.adminUrl('/users'), {
      params: this.buildParams(filters),
    });
  }

  updateUserRole(userId: string, role: AdminRole): Observable<AdminUser> {
    return this.http.patch<AdminUser>(this.adminUrl(`/users/${userId}/role`), { role });
  }

  updateUserActive(userId: string, isActive: boolean): Observable<AdminUser> {
    return this.http.patch<AdminUser>(this.adminUrl(`/users/${userId}/active`), {
      is_active: isActive,
    });
  }

  listAuditLogs(filters?: ApiFilters): Observable<PaginatedResponse<AuditLog>> {
    return this.http.get<PaginatedResponse<AuditLog>>(this.adminUrl('/audit-logs'), {
      params: this.buildParams(filters),
    });
  }

  getAuditLog(logId: string): Observable<AuditLog> {
    return this.http.get<AuditLog>(this.adminUrl(`/audit-logs/${logId}`));
  }

  previewPlanningImport(files: File[]): Observable<PlanningImport> {
    return this.http.post<PlanningImport>(
      this.planningUrl('/imports/preview'),
      this.filesFormData(files),
    );
  }

  createPlanningImport(files: File[]): Observable<PlanningImport> {
    return this.http.post<PlanningImport>(this.planningUrl('/imports'), this.filesFormData(files));
  }

  listPlanningImports(filters?: ApiFilters): Observable<PaginatedResponse<PlanningImport>> {
    return this.http.get<PaginatedResponse<PlanningImport>>(this.planningUrl('/imports'), {
      params: this.buildParams(filters),
    });
  }

  getPlanningImport(importId: string): Observable<PlanningImport> {
    return this.http.get<PlanningImport>(this.planningUrl(`/imports/${importId}`));
  }

  listPlanningSessions(filters?: ApiFilters): Observable<PaginatedResponse<PlanningSession>> {
    return this.http.get<PaginatedResponse<PlanningSession>>(this.planningUrl('/sessions'), {
      params: this.buildParams(filters),
    });
  }

  getPlanningSession(
    sessionKey: string,
    filters?: Pick<ApiFilters, 'import_id'>,
  ): Observable<PlanningSession> {
    return this.http.get<PlanningSession>(this.planningUrl(`/sessions/${sessionKey}`), {
      params: this.buildParams(filters),
    });
  }

  importResponsables(files: File[]): Observable<PlanningImport> {
    return this.http.post<PlanningImport>(
      this.planningUrl('/responsables/import'),
      this.filesFormData(files),
    );
  }

  listResponsables(filters?: ApiFilters): Observable<PaginatedResponse<ResponsableContact>> {
    return this.http.get<PaginatedResponse<ResponsableContact>>(this.planningUrl('/responsables'), {
      params: this.buildParams(filters),
    });
  }

  createResponsable(
    payload: Omit<ResponsableContact, 'contact_key'>,
  ): Observable<ResponsableContact> {
    return this.http.post<ResponsableContact>(this.planningUrl('/responsables'), payload);
  }

  getResponsable(contactKey: string): Observable<ResponsableContact> {
    return this.http.get<ResponsableContact>(this.planningUrl(`/responsables/${contactKey}`));
  }

  deleteResponsable(contactKey: string): Observable<void> {
    return this.http.delete<void>(this.planningUrl(`/responsables/${contactKey}`));
  }

  listMissingContacts(filters?: ApiFilters): Observable<PaginatedResponse<PlanningContact>> {
    return this.http.get<PaginatedResponse<PlanningContact>>(
      this.planningUrl('/missing-contacts'),
      {
        params: this.buildParams(filters),
      },
    );
  }

  listContactReview(filters?: ApiFilters): Observable<PaginatedResponse<PlanningContact>> {
    return this.http.get<PaginatedResponse<PlanningContact>>(this.planningUrl('/contact-review'), {
      params: this.buildParams(filters),
    });
  }

  listContacts(filters?: ApiFilters): Observable<PaginatedResponse<PlanningContact>> {
    return this.http.get<PaginatedResponse<PlanningContact>>(this.planningUrl('/contacts'), {
      params: this.buildParams(filters),
    });
  }

  createContact(payload: PlanningContact): Observable<PlanningContact> {
    return this.http.post<PlanningContact>(this.planningUrl('/contacts'), payload);
  }

  importContacts(files: File[]): Observable<PlanningImport> {
    return this.http.post<PlanningImport>(
      this.planningUrl('/contacts/import'),
      this.filesFormData(files),
    );
  }

  applyContacts(payload: Record<string, unknown>): Observable<void> {
    return this.http.post<void>(this.planningUrl('/contacts/apply'), payload);
  }

  listDrafts(filters?: ApiFilters): Observable<PaginatedResponse<DraftEmail>> {
    return this.http.get<PaginatedResponse<DraftEmail>>(this.planningUrl('/drafts'), {
      params: this.buildParams(filters),
    });
  }

  listDraftReview(filters?: ApiFilters): Observable<PaginatedResponse<DraftEmail>> {
    return this.http.get<PaginatedResponse<DraftEmail>>(this.planningUrl('/drafts/review'), {
      params: this.buildParams(filters),
    });
  }

  getDraft(draftId: string): Observable<DraftEmail> {
    return this.http.get<DraftEmail>(this.planningUrl(`/drafts/${draftId}`));
  }

  updateDraft(draftId: string, payload: Partial<DraftEmail>): Observable<DraftEmail> {
    return this.http.patch<DraftEmail>(this.planningUrl(`/drafts/${draftId}`), payload);
  }

  regenerateDraft(draftId: string): Observable<DraftEmail> {
    return this.http.post<DraftEmail>(this.planningUrl(`/drafts/${draftId}/regenerate`), {});
  }

  approveDraft(draftId: string): Observable<DraftEmail> {
    return this.http.post<DraftEmail>(this.planningUrl(`/drafts/${draftId}/approve`), {});
  }

  rejectDraft(draftId: string, reviewNotes?: string): Observable<DraftEmail> {
    return this.http.post<DraftEmail>(this.planningUrl(`/drafts/${draftId}/reject`), {
      review_notes: reviewNotes,
    });
  }

  sendDraft(draftId: string, confirmation: string): Observable<DraftEmail> {
    return this.http.post<DraftEmail>(this.planningUrl(`/drafts/${draftId}/send`), {
      confirmation,
    });
  }

  bulkDraftAction(payload: BulkDraftActionRequest): Observable<DraftEmail[]> {
    return this.http.post<DraftEmail[]>(this.planningUrl('/drafts/bulk-action'), payload);
  }

  bulkSendDrafts(payload: BulkSendRequest): Observable<DraftEmail[]> {
    return this.http.post<DraftEmail[]>(this.planningUrl('/drafts/bulk-send'), payload);
  }

  listSendHistory(filters?: ApiFilters): Observable<PaginatedResponse<DraftEmail>> {
    return this.http.get<PaginatedResponse<DraftEmail>>(this.planningUrl('/send-history'), {
      params: this.buildParams(filters),
    });
  }

  getAutomationSettings(): Observable<AutomationSettings> {
    return this.http.get<AutomationSettings>(this.planningUrl('/automation/settings'));
  }

  updateAutomationSettings(payload: Partial<AutomationSettings>): Observable<AutomationSettings> {
    return this.http.patch<AutomationSettings>(this.planningUrl('/automation/settings'), payload);
  }

  runAutomation(payload: AutomationRunRequest): Observable<AutomationJob> {
    return this.http.post<AutomationJob>(this.planningUrl('/automation/run'), payload);
  }

  listAutomationJobs(filters?: ApiFilters): Observable<PaginatedResponse<AutomationJob>> {
    return this.http.get<PaginatedResponse<AutomationJob>>(this.planningUrl('/automation/jobs'), {
      params: this.buildParams(filters),
    });
  }

  getAutomationJob(jobId: string): Observable<AutomationJob> {
    return this.http.get<AutomationJob>(this.planningUrl(`/automation/jobs/${jobId}`));
  }

  getAutomationJobLogs(jobId: string): Observable<string[]> {
    return this.http.get<string[]>(this.planningUrl(`/automation/jobs/${jobId}/logs`));
  }

  private apiUrl(path: string): string {
    return `${this.baseUrl}${path}`;
  }

  private adminUrl(path: string): string {
    return `${this.baseUrl}/admin${path}`;
  }

  private planningUrl(path: string): string {
    return `${this.baseUrl}/admin/planning${path}`;
  }

  private filesFormData(files: File[]): FormData {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    return formData;
  }

  private buildParams(filters?: ApiFilters): HttpParams {
    if (!filters) {
      return new HttpParams();
    }

    return Object.entries(filters).reduce((params, [key, value]) => {
      if (value === undefined || value === null || value === '') {
        return params;
      }

      return params.set(key, String(value));
    }, new HttpParams());
  }
}
