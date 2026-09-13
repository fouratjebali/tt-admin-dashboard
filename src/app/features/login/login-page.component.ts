import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';

import { DashboardAccessError, AuthService } from '../../core/services/auth.service';
import { Language, PreferencesService } from '../../core/services/preferences.service';
import { backendErrorMessage } from '../../core/utils/api-error.util';
import { TtIconComponent } from '../../shared/components/icon/icon.component';

const LOGIN_COPY = {
  en: {
    secureAccess: 'Secure admin access',
    headline: 'Supervise AI-assisted mail operations with confidence.',
    summary:
      'Monitor employee access, mail agent health, global controls, and audit activity from one focused internal workspace.',
    emailsTriaged: 'Emails triaged',
    agentUptime: 'Agent uptime',
    reviewFlags: 'Review flags',
    signIn: 'Admin sign in',
    instruction: 'Use the dashboard credentials configured on the backend.',
    username: 'Username',
    usernamePlaceholder: 'admin',
    usernameError: 'Enter the admin username.',
    password: 'Password',
    passwordPlaceholder: 'Enter your password',
    passwordError: 'Enter the admin password.',
    rememberDevice: 'Remember this device',
    needAccess: 'Need access?',
    signingIn: 'Signing in',
    submit: 'Sign in to dashboard',
    footnote: 'The backend creates or updates this admin account when it starts.',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    darkMode: 'Switch to dark mode',
    lightMode: 'Switch to light mode',
    displayPreferences: 'Display preferences',
    languageSelector: 'Language selector',
    errorGeneric: 'Sign-in failed. Please try again.',
    errorNetwork: 'Unable to reach the admin API. Check the backend URL and network.',
    errorCredentials: 'The username or password is incorrect.',
    errorApi: 'The admin API could not complete sign-in. Please try again.',
    errorAccess: 'This account does not have active admin dashboard access.',
  },
  fr: {
    secureAccess: 'Acces admin securise',
    headline: 'Supervisez les operations mail assistees par IA en toute confiance.',
    summary:
      'Surveillez les acces employes, la sante des agents mail, les controles globaux et les audits depuis un espace interne clair.',
    emailsTriaged: 'Emails tries',
    agentUptime: 'Disponibilite agent',
    reviewFlags: 'Alertes a verifier',
    signIn: 'Connexion admin',
    instruction: 'Utilisez les identifiants dashboard configures dans le backend.',
    username: 'Nom utilisateur',
    usernamePlaceholder: 'admin',
    usernameError: "Saisissez le nom d'utilisateur admin.",
    password: 'Mot de passe',
    passwordPlaceholder: 'Entrez votre mot de passe',
    passwordError: 'Saisissez le mot de passe admin.',
    rememberDevice: 'Memoriser cet appareil',
    needAccess: "Besoin d'acces ?",
    signingIn: 'Connexion',
    submit: 'Acceder au dashboard',
    footnote: 'Le backend cree ou met a jour ce compte admin au demarrage.',
    showPassword: 'Afficher le mot de passe',
    hidePassword: 'Masquer le mot de passe',
    darkMode: 'Activer le mode sombre',
    lightMode: 'Activer le mode clair',
    displayPreferences: "Preferences d'affichage",
    languageSelector: 'Selecteur de langue',
    errorGeneric: 'La connexion a echoue. Veuillez reessayer.',
    errorNetwork: "API admin inaccessible. Verifiez l'URL backend et le reseau.",
    errorCredentials: "Nom d'utilisateur ou mot de passe incorrect.",
    errorApi: "L'API admin n'a pas pu finaliser la connexion. Veuillez reessayer.",
    errorAccess: "Ce compte n'a pas d'acces actif au dashboard admin.",
  },
};

@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule, TtIconComponent],
  templateUrl: './login-page.component.html',
})
export class LoginPageComponent {
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
    username: ['admin', [Validators.required]],
    password: ['', [Validators.required]],
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

    const { username, password, rememberDevice } = this.loginForm.getRawValue();

    this.authError.set('');
    this.isSubmitting.set(true);

    this.authService
      .signInWithCredentials(username, password, rememberDevice)
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: () => {
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

  protected hasError(controlName: 'username' | 'password'): boolean {
    const control = this.loginForm.controls[controlName];
    return control.invalid && (control.dirty || control.touched);
  }

  private returnUrl(): string {
    return this.route.snapshot.queryParamMap.get('returnUrl') || '/';
  }

  private errorMessage(error: unknown): string {
    if (error instanceof DashboardAccessError) {
      return this.copy().errorAccess;
    }

    if (!(error instanceof HttpErrorResponse)) {
      return this.copy().errorGeneric;
    }

    if (error.status === 0) {
      return this.copy().errorNetwork;
    }

    if (error.status === 401 || error.status === 403) {
      return backendErrorMessage(error, this.copy().errorCredentials);
    }

    return backendErrorMessage(error, this.copy().errorApi);
  }
}
