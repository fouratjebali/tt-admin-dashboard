import { computed, Injectable, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, of, throwError, tap } from 'rxjs';

import { AdminIdentity, AdminRole, BackendSession } from '../models/backend-api.model';
import { ApiService } from './api.service';

const TOKEN_KEY = 'tt_admin_session_token';
const DASHBOARD_ROLES: AdminRole[] = ['super_admin', 'admin'];

export class DashboardAccessError extends Error {
  constructor() {
    super('DASHBOARD_ACCESS_DENIED');
  }
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly apiService = inject(ApiService);
  private readonly tokenSignal = signal<string | null>(this.readStoredToken());
  private readonly currentAdminSignal = signal<AdminIdentity | null>(null);

  readonly isAuthenticated = computed(() => Boolean(this.tokenSignal()));
  readonly currentAdmin = computed(() => this.currentAdminSignal());
  readonly hasDashboardAccess = computed(() => this.canAccessDashboard(this.currentAdminSignal()));

  token(): string | null {
    return this.tokenSignal();
  }

  login(token: string, rememberDevice = true, admin?: AdminIdentity): void {
    this.storeSessionToken(token, rememberDevice);
    this.currentAdminSignal.set(admin ?? this.currentAdminSignal());
  }

  signInWithCredentials(
    username: string,
    password: string,
    rememberDevice = true,
  ): Observable<BackendSession> {
    return this.apiService.loginAdmin({ username, password }).pipe(
      tap((session) => {
        if (!session.user || !this.canAccessDashboard(session.user)) {
          throw new DashboardAccessError();
        }

        this.login(session.session_token, rememberDevice, session.user);
      }),
    );
  }

  refreshSession(): Observable<AdminIdentity> {
    return this.apiService.refreshSession().pipe(
      tap((admin) => {
        this.currentAdminSignal.set(admin);
      }),
    );
  }

  loadAuthenticatedUser(): Observable<AdminIdentity> {
    return this.apiService.getCurrentAdmin().pipe(
      catchError((error: unknown) => {
        if (error instanceof HttpErrorResponse && error.status === 404) {
          return this.apiService.getAuthenticatedUser();
        }

        return throwError(() => error);
      }),
      tap((admin) => {
        if (!this.canAccessDashboard(admin)) {
          throw new DashboardAccessError();
        }

        this.currentAdminSignal.set(admin);
      }),
    );
  }

  signOut(): Observable<void> {
    this.logout();

    return of(void 0);
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    this.tokenSignal.set(null);
    this.currentAdminSignal.set(null);
  }

  canAccessDashboard(admin: AdminIdentity | null | undefined): boolean {
    return Boolean(admin?.is_active && DASHBOARD_ROLES.includes(admin.role));
  }

  canAccessRoles(roles: AdminRole[] | undefined, admin = this.currentAdminSignal()): boolean {
    if (!this.canAccessDashboard(admin)) {
      return false;
    }

    if (!roles || roles.length === 0) {
      return true;
    }

    return Boolean(admin && roles.includes(admin.role));
  }

  private storeSessionToken(token: string, rememberDevice: boolean): void {
    const storage = rememberDevice ? localStorage : sessionStorage;
    const storageToClear = rememberDevice ? sessionStorage : localStorage;

    storageToClear.removeItem(TOKEN_KEY);
    storage.setItem(TOKEN_KEY, token);
    this.tokenSignal.set(token);
  }

  private readStoredToken(): string | null {
    return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
  }
}
