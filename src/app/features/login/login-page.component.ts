import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';

import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { Language, PreferencesService } from '../../core/services/preferences.service';
import { TtIconComponent } from '../../shared/components/icon/icon.component';

const LOGIN_COPY = {
  en: {
    secureAccess: 'Secure admin access',
    headline: 'Supervise AI-assisted mail operations with confidence.',
    summary:
      'Monitor employee access, Gmail agent health, global controls, and audit activity from one focused internal workspace.',
    emailsTriaged: 'Emails triaged',
    agentUptime: 'Agent uptime',
    reviewFlags: 'Review flags',
    signIn: 'Sign in',
    instruction: 'Use your administrator account.',
    email: 'Email address',
    emailPlaceholder: 'admin@tt.tn',
    emailError: 'Enter a valid admin email address.',
    password: 'Password',
    passwordPlaceholder: 'Minimum 6 characters',
    passwordError: 'Password must be at least 6 characters.',
    rememberDevice: 'Remember this device',
    needAccess: 'Need access?',
    signingIn: 'Signing in',
    submit: 'Sign in to dashboard',
    footnote: 'Access is limited to authorized Tunisie Telecom IT administrators.',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    darkMode: 'Switch to dark mode',
    lightMode: 'Switch to light mode',
    displayPreferences: 'Display preferences',
    languageSelector: 'Language selector',
    errorGeneric: 'Sign-in failed. Please try again.',
    errorNetwork: 'Unable to reach the admin API. Check the backend URL and network.',
    errorCredentials: 'The email or password is incorrect.',
    errorApi: 'The admin API could not complete sign-in. Please try again.',
  },
  fr: {
    secureAccess: 'Accès admin sécurisé',
    headline: 'Supervisez les opérations mail assistées par IA en toute confiance.',
    summary:
      'Surveillez les accès employés, la santé des agents Gmail, les contrôles globaux et les audits depuis un espace interne clair.',
    emailsTriaged: 'Emails triés',
    agentUptime: 'Disponibilité agent',
    reviewFlags: 'Alertes à vérifier',
    signIn: 'Connexion',
    instruction: 'Utilisez votre compte administrateur.',
    email: 'Adresse email',
    emailPlaceholder: 'admin@tt.tn',
    emailError: 'Saisissez une adresse email admin valide.',
    password: 'Mot de passe',
    passwordPlaceholder: 'Minimum 6 caractères',
    passwordError: 'Le mot de passe doit contenir au moins 6 caractères.',
    rememberDevice: 'Mémoriser cet appareil',
    needAccess: "Besoin d'accès ?",
    signingIn: 'Connexion',
    submit: 'Acceder au tableau de bord',
    footnote: 'Accès réservé aux administrateurs IT autorisés de Tunisie Telecom.',
    showPassword: 'Afficher le mot de passe',
    hidePassword: 'Masquer le mot de passe',
    darkMode: 'Activer le mode sombre',
    lightMode: 'Activer le mode clair',
    displayPreferences: "Préférences d'affichage",
    languageSelector: 'Sélecteur de langue',
    errorGeneric: 'La connexion a échoué. Veuillez réessayer.',
    errorNetwork: "API admin inaccessible. Vérifiez l'URL backend et le réseau.",
    errorCredentials: 'Email ou mot de passe incorrect.',
    errorApi: "L'API admin n'a pas pu finaliser la connexion. Veuillez réessayer.",
  },
};

@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule, TtIconComponent],
  templateUrl: './login-page.component.html',
})
export class LoginPageComponent {
  private readonly apiService = inject(ApiService);
  private readonly authService = inject(AuthService);
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly preferences = inject(PreferencesService);

  protected readonly isSubmitting = signal(false);
  protected readonly passwordVisible = signal(false);
  protected readonly authError = signal('');
  protected readonly copy = computed(() => LOGIN_COPY[this.preferences.language()]);

  protected readonly loginForm = this.formBuilder.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    rememberDevice: [true],
  });

  constructor() {
    if (this.authService.isAuthenticated()) {
      void this.router.navigateByUrl(this.returnUrl());
    }
  }

  protected submit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    const { email, password, rememberDevice } = this.loginForm.getRawValue();

    this.authError.set('');
    this.isSubmitting.set(true);

    this.apiService
      .login(email, password)
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: ({ token }) => {
          this.authService.login(token, rememberDevice);
          void this.router.navigateByUrl(this.returnUrl());
        },
        error: (error: unknown) => {
          this.authError.set(this.errorMessage(error));
        },
      });
  }

  protected togglePasswordVisibility(): void {
    this.passwordVisible.update((visible) => !visible);
  }

  protected setLanguage(language: Language): void {
    this.preferences.setLanguage(language);
  }

  protected hasError(controlName: 'email' | 'password'): boolean {
    const control = this.loginForm.controls[controlName];
    return control.invalid && (control.dirty || control.touched);
  }

  private returnUrl(): string {
    return this.route.snapshot.queryParamMap.get('returnUrl') || '/';
  }

  private errorMessage(error: unknown): string {
    if (!(error instanceof HttpErrorResponse)) {
      return this.copy().errorGeneric;
    }

    if (error.status === 0) {
      return this.copy().errorNetwork;
    }

    if (error.status === 401 || error.status === 403) {
      return this.copy().errorCredentials;
    }

    return this.copy().errorApi;
  }
}
