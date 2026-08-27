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

  login(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
    this.tokenSignal.set(token);
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    this.tokenSignal.set(null);
  }

  private readStoredToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }
}
