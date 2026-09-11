import { computed, Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { AdminIdentity, BackendSession } from '../models/backend-api.model';
import { ApiService } from './api.service';

const TOKEN_KEY = 'tt_admin_session_token';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly apiService = inject(ApiService);
  private readonly tokenSignal = signal<string | null>(this.readStoredToken());
  private readonly currentAdminSignal = signal<AdminIdentity | null>(null);

  readonly isAuthenticated = computed(() => Boolean(this.tokenSignal()));
  readonly currentAdmin = computed(() => this.currentAdminSignal());

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
        this.login(session.session_token, rememberDevice, session.user);
      }),
    );
  }

  refreshSession(): Observable<BackendSession> {
    return this.apiService.refreshSession().pipe(
      tap((session) => {
        this.login(session.session_token, this.isRememberedSession(), session.user);
      }),
    );
  }

  loadAuthenticatedUser(): Observable<AdminIdentity> {
    return this.apiService.getAuthenticatedUser().pipe(
      tap((admin) => {
        this.currentAdminSignal.set(admin);
      }),
    );
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    this.tokenSignal.set(null);
    this.currentAdminSignal.set(null);
  }

  private storeSessionToken(token: string, rememberDevice: boolean): void {
    const storage = rememberDevice ? localStorage : sessionStorage;
    const storageToClear = rememberDevice ? sessionStorage : localStorage;

    storageToClear.removeItem(TOKEN_KEY);
    storage.setItem(TOKEN_KEY, token);
    this.tokenSignal.set(token);
  }

  private isRememberedSession(): boolean {
    return localStorage.getItem(TOKEN_KEY) === this.tokenSignal();
  }

  private readStoredToken(): string | null {
    return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
  }
}
