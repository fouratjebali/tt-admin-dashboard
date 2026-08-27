import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AdminAccount } from '../models/admin-account.model';
import { AuditLogEntry } from '../models/audit-log-entry.model';
import { GlobalDashboardStat } from '../models/global-dashboard-stat.model';
import { GlobalSettings } from '../models/global-settings.model';
import { SystemHealthStatus } from '../models/system-health-status.model';
import { UserAccountSummary } from '../models/user-account-summary.model';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl.replace(/\/$/, '');

  login(email: string, password: string): Observable<{ token: string; role: string }> {
    return this.http.post<{ token: string; role: string }>(this.url('/auth/login'), {
      email,
      password,
    });
  }

  listUsers(): Observable<UserAccountSummary[]> {
    return this.http.get<UserAccountSummary[]>(this.url('/users'));
  }

  getUser(id: string): Observable<UserAccountSummary> {
    return this.http.get<UserAccountSummary>(this.url(`/users/${id}`));
  }

  suspendUser(id: string): Observable<UserAccountSummary> {
    return this.http.put<UserAccountSummary>(this.url(`/users/${id}/suspend`), {});
  }

  reactivateUser(id: string): Observable<UserAccountSummary> {
    return this.http.put<UserAccountSummary>(this.url(`/users/${id}/reactivate`), {});
  }

  checkHealth(): Observable<SystemHealthStatus[]> {
    return this.http.get<SystemHealthStatus[]>(this.url('/health'));
  }

  getSettings(): Observable<GlobalSettings> {
    return this.http.get<GlobalSettings>(this.url('/settings'));
  }

  updateSettings(settings: Partial<GlobalSettings>): Observable<GlobalSettings> {
    return this.http.put<GlobalSettings>(this.url('/settings'), settings);
  }

  listAuditLog(filters?: object): Observable<AuditLogEntry[]> {
    return this.http.get<AuditLogEntry[]>(this.url('/audit'), {
      params: this.buildParams(filters),
    });
  }

  listAdmins(): Observable<AdminAccount[]> {
    return this.http.get<AdminAccount[]>(this.url('/admins'));
  }

  createAdmin(admin: Partial<AdminAccount>): Observable<AdminAccount> {
    return this.http.post<AdminAccount>(this.url('/admins'), admin);
  }

  updateAdminRole(id: string, role: string): Observable<AdminAccount> {
    return this.http.put<AdminAccount>(this.url(`/admins/${id}/role`), { role });
  }

  removeAdmin(id: string): Observable<void> {
    return this.http.delete<void>(this.url(`/admins/${id}`));
  }

  getGlobalStats(period: string): Observable<GlobalDashboardStat> {
    return this.http.get<GlobalDashboardStat>(this.url('/dashboard'), {
      params: new HttpParams().set('period', period),
    });
  }

  private url(path: string): string {
    return `${this.baseUrl}/admin${path}`;
  }

  private buildParams(filters?: object): HttpParams {
    if (!filters) {
      return new HttpParams();
    }

    return Object.entries(filters as Record<string, unknown>).reduce((params, [key, value]) => {
      if (value === undefined || value === null) {
        return params;
      }

      if (Array.isArray(value)) {
        return value.reduce((nextParams, item) => nextParams.append(key, String(item)), params);
      }

      return params.set(key, String(value));
    }, new HttpParams());
  }
}
