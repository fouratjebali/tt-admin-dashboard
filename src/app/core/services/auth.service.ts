import { computed, Injectable, signal } from '@angular/core';

const TOKEN_KEY = 'tt_admin_jwt';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly tokenSignal = signal<string | null>(this.readStoredToken());

  readonly isAuthenticated = computed(() => Boolean(this.tokenSignal()));

  token(): string | null {
    return this.tokenSignal();
  }

  login(token: string, rememberDevice = true): void {
    const storage = rememberDevice ? localStorage : sessionStorage;
    const storageToClear = rememberDevice ? sessionStorage : localStorage;

    storageToClear.removeItem(TOKEN_KEY);
    storage.setItem(TOKEN_KEY, token);
    this.tokenSignal.set(token);
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    this.tokenSignal.set(null);
  }

  private readStoredToken(): string | null {
    return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
  }
}
