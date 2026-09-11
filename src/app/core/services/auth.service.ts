import { computed, Injectable, inject, signal } from '@angular/core';
import {
  AuthenticationResult,
  BrowserCacheLocation,
  PublicClientApplication,
} from '@azure/msal-browser';
import { Observable, defer, from, switchMap, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AdminIdentity, BackendSession, MicrosoftAuthRequest } from '../models/backend-api.model';
import { ApiService } from './api.service';

const TOKEN_KEY = 'tt_admin_session_token';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly apiService = inject(ApiService);
  private readonly tokenSignal = signal<string | null>(this.readStoredToken());
  private readonly currentAdminSignal = signal<AdminIdentity | null>(null);
  private microsoftApp?: PublicClientApplication;
  private microsoftReady?: Promise<PublicClientApplication>;

  readonly isAuthenticated = computed(() => Boolean(this.tokenSignal()));
  readonly currentAdmin = computed(() => this.currentAdminSignal());

  token(): string | null {
    return this.tokenSignal();
  }

  login(token: string, rememberDevice = true, admin?: AdminIdentity): void {
    this.storeSessionToken(token, rememberDevice);
    this.currentAdminSignal.set(admin ?? this.currentAdminSignal());
  }

  signInWithMicrosoft(rememberDevice = true): Observable<BackendSession> {
    return defer(() => from(this.microsoftClient())).pipe(
      switchMap((client) =>
        from(
          client.loginPopup({
            prompt: 'select_account',
            scopes: environment.microsoftAuth.scopes,
          }),
        ),
      ),
      switchMap((result) =>
        this.apiService.authenticateWithMicrosoft(this.toSessionRequest(result)),
      ),
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

  private microsoftClient(): Promise<PublicClientApplication> {
    if (!environment.microsoftAuth.clientId) {
      return Promise.reject(
        new Error('Microsoft OAuth is not configured. Add the Azure application clientId.'),
      );
    }

    if (!this.microsoftApp) {
      this.microsoftApp = new PublicClientApplication({
        auth: {
          clientId: environment.microsoftAuth.clientId,
          authority: `https://login.microsoftonline.com/${environment.microsoftAuth.tenantId}`,
          redirectUri: environment.microsoftAuth.redirectUri,
        },
        cache: {
          cacheLocation: BrowserCacheLocation.SessionStorage,
        },
      });
    }

    this.microsoftReady ??= this.microsoftApp.initialize().then(() => this.microsoftApp!);
    return this.microsoftReady;
  }

  private toSessionRequest(result: AuthenticationResult): MicrosoftAuthRequest {
    return {
      access_token: result.accessToken,
      id_token: result.idToken || undefined,
      expires_at: result.expiresOn?.toISOString(),
    };
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
