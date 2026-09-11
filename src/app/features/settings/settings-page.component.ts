import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import {
  LucideBell,
  LucideCheck,
  LucideCircleAlert,
  LucideClock,
  LucideKeyRound,
  LucideLanguages,
  LucideMail,
  LucideMonitor,
  LucideMoon,
  LucidePalette,
  LucideRefreshCw,
  LucideRotateCcw,
  LucideSave,
  LucideSettings,
  LucideShieldCheck,
  LucideSlidersHorizontal,
  LucideSun,
  LucideUser,
} from '@lucide/angular';
import { finalize } from 'rxjs';

import { AutomationSettings } from '../../core/models/backend-api.model';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { Language, PreferencesService, Theme } from '../../core/services/preferences.service';

const REVIEW_THRESHOLD_KEY = 'tt_admin_review_threshold';
const RETENTION_DAYS_KEY = 'tt_admin_retention_days';
const SUPPORT_EMAIL_KEY = 'tt_admin_support_email';

interface LocalPolicySettings {
  reviewThreshold: number;
  retentionDays: number;
  supportEmail: string;
}

const COPY = {
  en: {
    eyebrow: 'Controls',
    title: 'Global settings',
    body: 'Tune workspace preferences, automation schedule, review thresholds, and admin session details.',
    refresh: 'Refresh',
    save: 'Save',
    saved: 'Settings saved',
    loading: 'Loading settings',
    retry: 'Retry',
    browserOnly: 'Saved on this browser',
    connected: 'Connected to backend',
    notConnected: 'Backend settings unavailable',
    panels: {
      appearance: 'Workspace appearance',
      automation: 'Automation schedule',
      policy: 'Review policy',
      account: 'Admin profile',
    },
    fields: {
      language: 'Language',
      theme: 'Theme',
      english: 'English',
      french: 'French',
      light: 'Light',
      dark: 'Dark',
      automationEnabled: 'Enable scheduled automation',
      schedule: 'Daily run time',
      timezone: 'Timezone',
      reviewThreshold: 'Review queue warning',
      retentionDays: 'Audit retention days',
      supportEmail: 'Support mailbox',
      name: 'Name',
      email: 'Email',
      role: 'Role',
      session: 'Session',
    },
    hints: {
      language: 'Changes apply instantly across the admin dashboard.',
      theme: 'Choose the default visual mode for this browser.',
      automation: 'Persisted through the backend automation settings endpoint.',
      policy: 'Used as local dashboard defaults until backend policy storage is available.',
      session: 'Bearer token is available for protected admin requests.',
    },
    values: {
      active: 'Active',
      missing: 'Not available',
      tokenReady: 'Bearer token ready',
      noToken: 'No local token',
    },
    errors: {
      load: 'Unable to load automation settings from the admin API.',
      save: 'Unable to save automation settings.',
      network: 'Admin API is unreachable. Check backend URL, proxy, and network.',
    },
  },
  fr: {
    eyebrow: 'Controles',
    title: 'Parametres globaux',
    body: 'Ajustez les preferences, le planning automation, les seuils de revue et la session admin.',
    refresh: 'Actualiser',
    save: 'Enregistrer',
    saved: 'Parametres enregistres',
    loading: 'Chargement parametres',
    retry: 'Reessayer',
    browserOnly: 'Enregistre sur ce navigateur',
    connected: 'Connecte au backend',
    notConnected: 'Parametres backend indisponibles',
    panels: {
      appearance: 'Apparence espace',
      automation: 'Planning automation',
      policy: 'Politique de revue',
      account: 'Profil admin',
    },
    fields: {
      language: 'Langue',
      theme: 'Theme',
      english: 'Anglais',
      french: 'Francais',
      light: 'Clair',
      dark: 'Sombre',
      automationEnabled: "Activer l'automation planifiee",
      schedule: 'Heure execution',
      timezone: 'Fuseau horaire',
      reviewThreshold: 'Alerte file de revue',
      retentionDays: 'Retention audit jours',
      supportEmail: 'Mailbox support',
      name: 'Nom',
      email: 'Email',
      role: 'Role',
      session: 'Session',
    },
    hints: {
      language: "Le changement s'applique directement sur le dashboard admin.",
      theme: 'Choisissez le mode visuel par defaut pour ce navigateur.',
      automation: "Persiste via l'endpoint backend des parametres automation.",
      policy: 'Utilise comme defauts locaux jusqu au stockage policy backend.',
      session: 'Le token Bearer est disponible pour les requetes admin protegees.',
    },
    values: {
      active: 'Active',
      missing: 'Non disponible',
      tokenReady: 'Token Bearer pret',
      noToken: 'Aucun token local',
    },
    errors: {
      load: "Impossible de charger les parametres automation depuis l'API admin.",
      save: "Impossible d'enregistrer les parametres automation.",
      network: "API admin inaccessible. Verifiez l'URL backend, le proxy et le reseau.",
    },
  },
};

@Component({
  selector: 'app-settings-page',
  imports: [
    LucideBell,
    LucideCheck,
    LucideCircleAlert,
    LucideClock,
    LucideKeyRound,
    LucideLanguages,
    LucideMail,
    LucideMonitor,
    LucideMoon,
    LucidePalette,
    LucideRefreshCw,
    LucideRotateCcw,
    LucideSave,
    LucideSettings,
    LucideShieldCheck,
    LucideSlidersHorizontal,
    LucideSun,
    LucideUser,
  ],
  templateUrl: './settings-page.component.html',
  styleUrl: './settings-page.component.scss',
})
export class SettingsPageComponent implements OnInit {
  private readonly apiService = inject(ApiService);
  private readonly authService = inject(AuthService);
  private readonly preferences = inject(PreferencesService);

  protected readonly copy = computed(() => COPY[this.preferences.language()]);
  protected readonly language = this.preferences.language;
  protected readonly theme = this.preferences.theme;
  protected readonly currentAdmin = this.authService.currentAdmin;
  protected readonly isAuthenticated = this.authService.isAuthenticated;
  protected readonly automation = signal<AutomationSettings>(this.defaultAutomationSettings());
  protected readonly policy = signal<LocalPolicySettings>(this.readLocalPolicy());
  protected readonly loadingAutomation = signal(false);
  protected readonly savingAutomation = signal(false);
  protected readonly automationError = signal('');
  protected readonly savedMessage = signal('');
  protected readonly timezoneOptions = ['Africa/Tunis', 'Africa/Lagos', 'Europe/Paris', 'UTC'];

  protected readonly accountRows = computed(() => {
    const admin = this.currentAdmin();

    return [
      {
        icon: 'user',
        label: this.copy().fields.name,
        value: admin?.full_name ?? admin?.name ?? this.copy().values.missing,
      },
      {
        icon: 'mail',
        label: this.copy().fields.email,
        value: admin?.email ?? this.copy().values.missing,
      },
      {
        icon: 'shield',
        label: this.copy().fields.role,
        value: admin?.role ?? this.copy().values.missing,
      },
      {
        icon: 'key',
        label: this.copy().fields.session,
        value: this.isAuthenticated() ? this.copy().values.tokenReady : this.copy().values.noToken,
      },
    ];
  });

  ngOnInit(): void {
    this.loadAutomationSettings();
  }

  protected setLanguage(language: Language): void {
    this.preferences.setLanguage(language);
    this.flashSavedMessage(this.copy().browserOnly);
  }

  protected setTheme(theme: Theme): void {
    this.preferences.setTheme(theme);
    this.flashSavedMessage(this.copy().browserOnly);
  }

  protected loadAutomationSettings(): void {
    this.loadingAutomation.set(true);
    this.automationError.set('');

    this.apiService
      .getAutomationSettings()
      .pipe(finalize(() => this.loadingAutomation.set(false)))
      .subscribe({
        next: (settings) => {
          this.automation.set({
            ...this.defaultAutomationSettings(),
            ...settings,
          });
        },
        error: (error: unknown) => {
          this.automationError.set(this.errorMessage(error, this.copy().errors.load));
        },
      });
  }

  protected saveAutomationSettings(): void {
    this.savingAutomation.set(true);
    this.automationError.set('');

    this.apiService
      .updateAutomationSettings(this.automation())
      .pipe(finalize(() => this.savingAutomation.set(false)))
      .subscribe({
        next: (settings) => {
          this.automation.set({
            ...this.defaultAutomationSettings(),
            ...settings,
          });
          this.flashSavedMessage(this.copy().saved);
        },
        error: (error: unknown) => {
          this.automationError.set(this.errorMessage(error, this.copy().errors.save));
        },
      });
  }

  protected updateAutomationEnabled(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.automation.update((settings) => ({ ...settings, enabled: input.checked }));
  }

  protected updateAutomationSchedule(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.automation.update((settings) => ({ ...settings, schedule: input.value }));
  }

  protected updateAutomationTimezone(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.automation.update((settings) => ({ ...settings, timezone: select.value }));
  }

  protected updateReviewThreshold(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.policy.update((settings) => ({
      ...settings,
      reviewThreshold: this.clampNumber(input.valueAsNumber, 1, 200, settings.reviewThreshold),
    }));
  }

  protected updateRetentionDays(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.policy.update((settings) => ({
      ...settings,
      retentionDays: this.clampNumber(input.valueAsNumber, 7, 3650, settings.retentionDays),
    }));
  }

  protected updateSupportEmail(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.policy.update((settings) => ({ ...settings, supportEmail: input.value }));
  }

  protected savePolicySettings(): void {
    const policy = this.policy();

    localStorage.setItem(REVIEW_THRESHOLD_KEY, String(policy.reviewThreshold));
    localStorage.setItem(RETENTION_DAYS_KEY, String(policy.retentionDays));
    localStorage.setItem(SUPPORT_EMAIL_KEY, policy.supportEmail);
    this.flashSavedMessage(this.copy().browserOnly);
  }

  protected resetPolicySettings(): void {
    const defaults = this.defaultPolicySettings();

    this.policy.set(defaults);
    localStorage.setItem(REVIEW_THRESHOLD_KEY, String(defaults.reviewThreshold));
    localStorage.setItem(RETENTION_DAYS_KEY, String(defaults.retentionDays));
    localStorage.setItem(SUPPORT_EMAIL_KEY, defaults.supportEmail);
    this.flashSavedMessage(this.copy().browserOnly);
  }

  private defaultAutomationSettings(): AutomationSettings {
    return {
      enabled: false,
      schedule: '08:00',
      timezone: 'Africa/Tunis',
    };
  }

  private defaultPolicySettings(): LocalPolicySettings {
    return {
      reviewThreshold: 40,
      retentionDays: 180,
      supportEmail: 'dashboard.admin@tunisietelecom.tn',
    };
  }

  private readLocalPolicy(): LocalPolicySettings {
    const defaults = this.defaultPolicySettings();

    return {
      reviewThreshold: this.readNumber(REVIEW_THRESHOLD_KEY, defaults.reviewThreshold),
      retentionDays: this.readNumber(RETENTION_DAYS_KEY, defaults.retentionDays),
      supportEmail: localStorage.getItem(SUPPORT_EMAIL_KEY) ?? defaults.supportEmail,
    };
  }

  private readNumber(key: string, fallback: number): number {
    const value = Number(localStorage.getItem(key));

    return Number.isFinite(value) && value > 0 ? value : fallback;
  }

  private clampNumber(value: number, min: number, max: number, fallback: number): number {
    if (!Number.isFinite(value)) {
      return fallback;
    }

    return Math.min(max, Math.max(min, Math.round(value)));
  }

  private flashSavedMessage(message: string): void {
    this.savedMessage.set(message);
    window.setTimeout(() => this.savedMessage.set(''), 2200);
  }

  private errorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse && error.status === 0) {
      return this.copy().errors.network;
    }

    return fallback;
  }
}
