import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import { Language, PreferencesService } from '../../core/services/preferences.service';
import { TtIconComponent } from '../../shared/components/icon/icon.component';

const LOGIN_COPY = {
  en: {
    secureAccess: 'Secure admin access',
    headline: 'Supervise AI-assisted mail operations with confidence.',
    summary:
      'Monitor employee access, Outlook agent health, global controls, and audit activity from one focused internal workspace.',
    emailsTriaged: 'Emails triaged',
    agentUptime: 'Agent uptime',
    reviewFlags: 'Review flags',
    signIn: 'Admin sign in',
    instruction: 'Continue with your Microsoft Outlook account to start a backend admin session.',
    rememberDevice: 'Remember this device',
    needAccess: 'Need access?',
    signingIn: 'Opening Microsoft',
    submit: 'Continue with Microsoft',
    footnote: 'Access is limited to active users with admin, reviewer, or viewer roles.',
    darkMode: 'Switch to dark mode',
    lightMode: 'Switch to light mode',
    displayPreferences: 'Display preferences',
    languageSelector: 'Language selector',
    errorGeneric: 'Microsoft sign-in failed. Please try again.',
    errorMissingConfig: 'Microsoft OAuth is not configured yet. Add the Azure client ID.',
    errorNetwork: 'Unable to reach the admin API. Check the backend URL and network.',
    errorCredentials: 'Your account is not authorized for this admin dashboard.',
    errorApi: 'The admin API could not complete sign-in. Please try again.',
  },
  fr: {
    secureAccess: 'Acces admin securise',
    headline: 'Supervisez les operations mail assistees par IA en toute confiance.',
    summary:
      'Surveillez les acces employes, la sante des agents Outlook, les controles globaux et les audits depuis un espace interne clair.',
    emailsTriaged: 'Emails tries',
    agentUptime: 'Disponibilite agent',
    reviewFlags: 'Alertes a verifier',
    signIn: 'Connexion admin',
    instruction:
      'Continuez avec votre compte Microsoft Outlook pour ouvrir une session admin backend.',
    rememberDevice: 'Memoriser cet appareil',
    needAccess: "Besoin d'acces ?",
    signingIn: 'Ouverture Microsoft',
    submit: 'Continuer avec Microsoft',
    footnote: 'Acces limite aux utilisateurs actifs avec les roles admin, reviewer ou viewer.',
    darkMode: 'Activer le mode sombre',
    lightMode: 'Activer le mode clair',
    displayPreferences: "Preferences d'affichage",
    languageSelector: 'Selecteur de langue',
    errorGeneric: 'La connexion Microsoft a echoue. Veuillez reessayer.',
    errorMissingConfig: "Microsoft OAuth n'est pas encore configure. Ajoutez le client ID Azure.",
    errorNetwork: "API admin inaccessible. Verifiez l'URL backend et le reseau.",
    errorCredentials: "Votre compte n'est pas autorise pour ce tableau de bord admin.",
    errorApi: "L'API admin n'a pas pu finaliser la connexion. Veuillez reessayer.",
  },
};

@Component({
  selector: 'app-login-page',
  imports: [TtIconComponent],
  templateUrl: './login-page.component.html',
})
export class LoginPageComponent {
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly preferences = inject(PreferencesService);

  protected readonly isSubmitting = signal(false);
  protected readonly rememberDevice = signal(true);
  protected readonly authError = signal('');
  protected readonly copy = computed(() => LOGIN_COPY[this.preferences.language()]);

  constructor() {
    if (this.authService.isAuthenticated()) {
      void this.router.navigateByUrl(this.returnUrl());
    }
  }

  protected signInWithMicrosoft(): void {
    this.authError.set('');
    this.isSubmitting.set(true);

    this.authService
      .signInWithMicrosoft(this.rememberDevice())
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

  protected setRememberDevice(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.rememberDevice.set(input.checked);
  }

  protected setLanguage(language: Language): void {
    this.preferences.setLanguage(language);
  }

  private returnUrl(): string {
    return this.route.snapshot.queryParamMap.get('returnUrl') || '/';
  }

  private errorMessage(error: unknown): string {
    if (error instanceof Error && error.message.includes('Microsoft OAuth is not configured')) {
      return this.copy().errorMissingConfig;
    }

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
